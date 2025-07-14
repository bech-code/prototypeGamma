from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.db import database_sync_to_async
from .models import Conversation, Message, TechnicianLocation, ClientLocation, RepairRequest
from django.contrib.auth import get_user_model
from django.utils import timezone
import asyncio
import logging
logger = logging.getLogger("websocket_consumers")

User = get_user_model()

class NotificationsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        user = self.scope["user"]
        logger.info(f"[WS] Tentative connexion NotificationsConsumer: id={getattr(user, 'id', None)}, username={getattr(user, 'username', None)}, is_authenticated={getattr(user, 'is_authenticated', None)}")
        if user.is_authenticated:
            self.group_name = f"user_{user.id}"
            await self.channel_layer.group_add(self.group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            title = data.get('title')
            message = data.get('message')
            notif_type = data.get('type')
            created_at = data.get('created_at')
            if not (title and message and notif_type):
                await self.send(text_data=json.dumps({
                    'status': 'error',
                    'error': 'Champs manquants (title, message, type)'
                }))
                return
            # Création de la notification en base
            from .models import Notification
            notif = await database_sync_to_async(Notification.objects.create)(
                recipient=self.scope['user'],
                title=title,
                message=message,
                type=notif_type,
            )
            await self.send(text_data=json.dumps({
                'status': 'ok',
                'id': notif.id,
                'title': notif.title,
                'message': notif.message,
                'type': notif.type,
                'created_at': notif.created_at.isoformat() if notif.created_at else None
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                'status': 'error',
                'error': str(e)
            }))

    async def send_notification(self, event):
        await self.send(text_data=json.dumps(event["content"]))

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.conversation_id = self.scope['url_route']['kwargs']['conversation_id']
        self.room_group_name = f'chat_{self.conversation_id}'
        user = self.scope["user"]
        logger.info(f"[WS] Tentative connexion ChatConsumer: id={getattr(user, 'id', None)}, username={getattr(user, 'username', None)}, is_authenticated={getattr(user, 'is_authenticated', None)}")
        if user.is_authenticated:
            # Vérification supplémentaire : l'utilisateur doit être participant à la conversation
            from .models import ChatConversation
            try:
                conversation = await database_sync_to_async(ChatConversation.objects.get)(id=self.conversation_id)
                is_participant = await database_sync_to_async(
                    lambda: user in [conversation.client, conversation.technician]
                )()
                if not is_participant:
                    await self.close()
                    return
            except Exception:
                await self.close()
                return
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        # Vérification supplémentaire à chaque message
        from .models import ChatConversation
        conversation = await database_sync_to_async(ChatConversation.objects.get)(id=self.conversation_id)
        is_participant = await database_sync_to_async(
            lambda: self.scope["user"] in [conversation.client, conversation.technician]
        )()
        if not is_participant:
            await self.send(text_data=json.dumps({"error": "Vous n'êtes pas participant à cette conversation."}))
            await self.close()
            return
        
        data = json.loads(text_data)
        message_type = data.get('type', 'message')
        
        if message_type == 'message':
            await self.handle_chat_message(data)
        elif message_type == 'typing':
            await self.handle_typing_indicator(data)
        elif message_type == 'read':
            await self.handle_read_receipt(data)
        elif message_type == 'location':
            await self.handle_location_message(data)

    async def handle_chat_message(self, data):
        """Gère l'envoi d'un message de chat."""
        content = data.get('content')
        message_type = data.get('message_type', 'text')
        user_id = self.scope['user'].id

        # Sauvegarder le message en base
        msg = await self.save_chat_message(user_id, self.conversation_id, content, message_type)

        # Diffuser à tous les clients connectés à la conversation
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': {
                    'id': msg.id,
                    'sender': msg.sender.id,
                    'sender_name': msg.sender.get_full_name() or msg.sender.username,
                    'content': msg.content,
                    'message_type': msg.message_type,
                    'created_at': msg.created_at.isoformat(),
                    'latitude': msg.latitude,
                    'longitude': msg.longitude,
                }
            }
        )

    async def handle_typing_indicator(self, data):
        """Gère l'indicateur de frappe."""
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'typing_indicator',
                'sender_id': self.scope['user'].id,
                'sender_name': self.scope['user'].get_full_name() or self.scope['user'].username,
                'is_typing': data.get('is_typing', True)
            }
        )

    async def handle_read_receipt(self, data):
        """Gère les accusés de lecture."""
        message_id = data.get('message_id')
        if message_id:
            await self.mark_message_as_read(message_id)
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'read_receipt',
                    'message_id': message_id,
                    'read_by': self.scope['user'].id,
                    'read_at': timezone.now().isoformat()
                }
            )

    async def handle_location_message(self, data):
        """Gère l'envoi d'un message de localisation."""
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        user_id = self.scope['user'].id

        # Sauvegarder le message de localisation
        msg = await self.save_location_message(user_id, self.conversation_id, latitude, longitude)

        # Diffuser la localisation
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'location_message',
                'message': {
                    'id': msg.id,
                    'sender': msg.sender.id,
                    'sender_name': msg.sender.get_full_name() or msg.sender.username,
                    'content': msg.content,
                    'message_type': 'location',
                    'latitude': msg.latitude,
                    'longitude': msg.longitude,
                    'created_at': msg.created_at.isoformat(),
                }
            }
        )

    async def chat_message(self, event):
        """Envoie un message de chat."""
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message']
        }))

    async def typing_indicator(self, event):
        """Envoie un indicateur de frappe."""
        await self.send(text_data=json.dumps({
            'type': 'typing',
            'sender_id': event['sender_id'],
            'sender_name': event['sender_name'],
            'is_typing': event['is_typing']
        }))

    async def read_receipt(self, event):
        """Envoie un accusé de lecture."""
        await self.send(text_data=json.dumps({
            'type': 'read',
            'message_id': event['message_id'],
            'read_by': event['read_by'],
            'read_at': event['read_at']
        }))

    async def location_message(self, event):
        """Envoie un message de localisation."""
        await self.send(text_data=json.dumps({
            'type': 'location',
            'message': event['message']
        }))

    @database_sync_to_async
    def save_chat_message(self, user_id, conversation_id, content, message_type='text'):
        """Sauvegarde un message de chat en base de données."""
        from .models import ChatConversation, ChatMessage
        user = User.objects.get(id=user_id)
        conversation = ChatConversation.objects.get(id=conversation_id)
        return ChatMessage.objects.create(
            conversation=conversation,
            sender=user,
            content=content,
            message_type=message_type
        )

    @database_sync_to_async
    def save_location_message(self, user_id, conversation_id, latitude, longitude):
        """Sauvegarde un message de localisation."""
        from .models import ChatConversation, ChatMessage
        user = User.objects.get(id=user_id)
        conversation = ChatConversation.objects.get(id=conversation_id)
        return ChatMessage.objects.create(
            conversation=conversation,
            sender=user,
            content="📍 Ma position actuelle",
            message_type='location',
            latitude=latitude,
            longitude=longitude
        )

    @database_sync_to_async
    def mark_message_as_read(self, message_id):
        """Marque un message comme lu."""
        from .models import ChatMessage
        try:
            message = ChatMessage.objects.get(id=message_id)
            message.mark_as_read()
        except ChatMessage.DoesNotExist:
            pass

class TechnicianLocationConsumer(AsyncWebsocketConsumer):
    """Consumer pour le suivi en temps réel de la position des techniciens."""
    
    async def connect(self):
        self.technician_id = self.scope['url_route']['kwargs']['technician_id']
        self.room_group_name = f'tracking_technician_{self.technician_id}'

        if self.scope["user"].is_authenticated:
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Reçoit la position GPS du technicien et la diffuse."""
        data = json.loads(text_data)
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude is not None and longitude is not None:
            # Sauvegarder en base de données
            await self.save_technician_location(self.technician_id, latitude, longitude)
            
            # Diffuser à tous les abonnés
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_location',
                    'latitude': latitude,
                    'longitude': longitude,
                    'timestamp': timezone.now().isoformat()
                }
            )

    async def send_location(self, event):
        """Envoie la position à tous les clients connectés."""
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'timestamp': event['timestamp']
        }))

    @database_sync_to_async
    def save_technician_location(self, technician_id, latitude, longitude):
        """Sauvegarde la position du technicien en base de données."""
        from .models import Technician
        try:
            technician = Technician.objects.get(id=technician_id)
            location, created = TechnicianLocation.objects.get_or_create(
                technician=technician,
                defaults={'latitude': latitude, 'longitude': longitude}
            )
            if not created:
                location.latitude = latitude
                location.longitude = longitude
                location.save()
            
            # Mettre à jour aussi les champs du technicien
            technician.current_latitude = latitude
            technician.current_longitude = longitude
            technician.last_position_update = timezone.now()
            technician.save()
            
        except Technician.DoesNotExist:
            pass

class ClientLocationConsumer(AsyncWebsocketConsumer):
    """Consumer pour le suivi en temps réel de la position des clients."""
    
    async def connect(self):
        self.client_id = self.scope['url_route']['kwargs']['client_id']
        self.room_group_name = f'tracking_client_{self.client_id}'

        if self.scope["user"].is_authenticated:
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Reçoit la position GPS du client et la diffuse."""
        data = json.loads(text_data)
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        
        if latitude is not None and longitude is not None:
            # Sauvegarder en base de données
            await self.save_client_location(self.client_id, latitude, longitude)
            
            # Diffuser à tous les abonnés
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_location',
                    'latitude': latitude,
                    'longitude': longitude,
                    'timestamp': timezone.now().isoformat()
                }
            )

    async def send_location(self, event):
        """Envoie la position à tous les clients connectés."""
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'timestamp': event['timestamp']
        }))

    @database_sync_to_async
    def save_client_location(self, client_id, latitude, longitude):
        """Sauvegarde la position du client en base de données."""
        from .models import Client
        try:
            client = Client.objects.get(id=client_id)
            location, created = ClientLocation.objects.get_or_create(
                client=client,
                defaults={'latitude': latitude, 'longitude': longitude}
            )
            if not created:
                location.latitude = latitude
                location.longitude = longitude
                location.save()
                
        except Client.DoesNotExist:
            pass

class RequestTrackingConsumer(AsyncWebsocketConsumer):
    """Consumer pour le suivi en temps réel d'une demande spécifique."""
    
    async def connect(self):
        self.request_id = self.scope['url_route']['kwargs']['request_id']
        self.room_group_name = f'request_tracking_{self.request_id}'

        if self.scope["user"].is_authenticated:
            # Vérifier que l'utilisateur a accès à cette demande
            has_access = await self.check_request_access()
            if has_access:
                await self.channel_layer.group_add(self.room_group_name, self.channel_name)
                await self.accept()
                
                # Envoyer les positions actuelles
                await self.send_current_positions()
            else:
                await self.close()
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        """Reçoit les mises à jour de position et les diffuse."""
        data = json.loads(text_data)
        message_type = data.get('type')
        
        if message_type == 'location_update':
            await self.handle_location_update(data)
        elif message_type == 'status_update':
            await self.handle_status_update(data)

    async def handle_location_update(self, data):
        """Gère les mises à jour de position."""
        latitude = data.get('latitude')
        longitude = data.get('longitude')
        user_type = data.get('user_type')  # 'client' ou 'technician'
        
        if latitude is not None and longitude is not None:
            # Sauvegarder la position
            await self.save_location(user_type, latitude, longitude)
            
            # Diffuser à tous les participants
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_location_update',
                    'user_type': user_type,
                    'latitude': latitude,
                    'longitude': longitude,
                    'timestamp': timezone.now().isoformat()
                }
            )
            
            # Calculer et envoyer les informations de suivi
            await self.calculate_and_send_tracking_info()

    async def handle_status_update(self, data):
        """Gère les mises à jour de statut."""
        status = data.get('status')
        if status:
            # Mettre à jour le statut de la demande
            await self.update_request_status(status)
            
            # Diffuser le changement de statut
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_status_update',
                    'status': status,
                    'timestamp': timezone.now().isoformat()
                }
            )

    async def send_location_update(self, event):
        """Envoie une mise à jour de position."""
        await self.send(text_data=json.dumps({
            'type': 'location_update',
            'user_type': event['user_type'],
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'timestamp': event['timestamp']
        }))

    async def send_status_update(self, event):
        """Envoie une mise à jour de statut."""
        await self.send(text_data=json.dumps({
            'type': 'status_update',
            'status': event['status'],
            'timestamp': event['timestamp']
        }))

    async def send_tracking_info(self, event):
        """Envoie les informations de suivi."""
        await self.send(text_data=json.dumps({
            'type': 'tracking_info',
            'distance': event['distance'],
            'estimated_arrival': event['estimated_arrival'],
            'is_moving': event['is_moving']
        }))

    @database_sync_to_async
    def check_request_access(self):
        """Vérifie que l'utilisateur a accès à cette demande."""
        try:
            request = RepairRequest.objects.get(id=self.request_id)
            user = self.scope['user']
            
            # Le client ou le technicien assigné peut accéder
            if user.user_type == 'client':
                return request.client.user == user
            elif user.user_type == 'technician':
                return request.technician and request.technician.user == user
            elif user.is_staff:
                return True
            return False
        except RepairRequest.DoesNotExist:
            return False

    @database_sync_to_async
    def save_location(self, user_type, latitude, longitude):
        """Sauvegarde la position selon le type d'utilisateur."""
        user = self.scope['user']
        
        if user_type == 'client':
            from .models import Client, ClientLocation
            try:
                client = Client.objects.get(user=user)
                location, created = ClientLocation.objects.get_or_create(
                    client=client,
                    defaults={'latitude': latitude, 'longitude': longitude}
                )
                if not created:
                    location.latitude = latitude
                    location.longitude = longitude
                    location.save()
            except Client.DoesNotExist:
                pass
        elif user_type == 'technician':
            from .models import Technician, TechnicianLocation
            try:
                technician = Technician.objects.get(user=user)
                location, created = TechnicianLocation.objects.get_or_create(
                    technician=technician,
                    defaults={'latitude': latitude, 'longitude': longitude}
                )
                if not created:
                    location.latitude = latitude
                    location.longitude = longitude
                    location.save()
                
                # Mettre à jour aussi les champs du technicien
                technician.current_latitude = latitude
                technician.current_longitude = longitude
                technician.last_position_update = timezone.now()
                technician.save()
            except Technician.DoesNotExist:
                pass

    @database_sync_to_async
    def update_request_status(self, status):
        """Met à jour le statut de la demande."""
        try:
            request = RepairRequest.objects.get(id=self.request_id)
            request.status = status
            request.save()
        except RepairRequest.DoesNotExist:
            pass

    @database_sync_to_async
    def get_current_positions(self):
        """Récupère les positions actuelles du client et du technicien."""
        try:
            request = RepairRequest.objects.get(id=self.request_id)
            
            client_location = None
            technician_location = None
            
            if request.client and hasattr(request.client, 'location'):
                client_location = {
                    'latitude': request.client.location.latitude,
                    'longitude': request.client.location.longitude,
                    'timestamp': request.client.location.updated_at.isoformat()
                }
            
            if request.technician and hasattr(request.technician, 'location'):
                technician_location = {
                    'latitude': request.technician.location.latitude,
                    'longitude': request.technician.location.longitude,
                    'timestamp': request.technician.location.updated_at.isoformat()
                }
            
            return client_location, technician_location
        except RepairRequest.DoesNotExist:
            return None, None

    async def send_current_positions(self):
        """Envoie les positions actuelles au nouveau connecté."""
        client_location, technician_location = await self.get_current_positions()
        
        if client_location:
            await self.send(text_data=json.dumps({
                'type': 'location_update',
                'user_type': 'client',
                'latitude': client_location['latitude'],
                'longitude': client_location['longitude'],
                'timestamp': client_location['timestamp']
            }))
        
        if technician_location:
            await self.send(text_data=json.dumps({
                'type': 'location_update',
                'user_type': 'technician',
                'latitude': technician_location['latitude'],
                'longitude': technician_location['longitude'],
                'timestamp': technician_location['timestamp']
            }))

    async def calculate_and_send_tracking_info(self):
        """Calcule et envoie les informations de suivi."""
        client_location, technician_location = await self.get_current_positions()
        
        if client_location and technician_location:
            # Calculer la distance
            distance = self.calculate_distance(
                client_location['latitude'], client_location['longitude'],
                technician_location['latitude'], technician_location['longitude']
            )
            
            # Estimation du temps d'arrivée (5 minutes par km)
            estimated_minutes = max(5, int(distance * 5))
            estimated_arrival = timezone.now() + timezone.timedelta(minutes=estimated_minutes)
            
            # Détecter si le technicien bouge (simplifié)
            is_moving = distance > 0.1  # Plus de 100m de mouvement
            
            await self.channel_layer.group_send(
                self.room_group_name,
                {
                    'type': 'send_tracking_info',
                    'distance': distance,
                    'estimated_arrival': estimated_arrival.isoformat(),
                    'is_moving': is_moving
                }
            )

    def calculate_distance(self, lat1, lon1, lat2, lon2):
        """Calcule la distance entre deux points."""
        import math
        R = 6371  # Rayon de la Terre en km
        dLat = (lat2 - lat1) * math.pi / 180
        dLon = (lon2 - lon1) * math.pi / 180
        a = math.sin(dLat/2) * math.sin(dLat/2) + \
            math.cos(lat1 * math.pi / 180) * math.cos(lat2 * math.pi / 180) * \
            math.sin(dLon/2) * math.sin(dLon/2)
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        return R * c 