from channels.generic.websocket import AsyncWebsocketConsumer
import json
from channels.db import database_sync_to_async
from .models import Conversation, Message, TechnicianLocation, ClientLocation
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class NotificationsConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        if self.scope["user"].is_authenticated:
            self.group_name = f"user_{self.scope['user'].id}"
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

        if self.scope["user"].is_authenticated:
            await self.channel_layer.group_add(self.room_group_name, self.channel_name)
            await self.accept()
        else:
            await self.close()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.room_group_name, self.channel_name)

    async def receive(self, text_data):
        data = json.loads(text_data)
        message = data.get('message')
        user_id = self.scope['user'].id

        # Sauvegarder le message en base
        msg = await self.save_message(user_id, self.conversation_id, message)

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
                    'created_at': msg.created_at.isoformat(),
                }
            }
        )

    async def chat_message(self, event):
        await self.send(text_data=json.dumps(event['message']))

    @database_sync_to_async
    def save_message(self, user_id, conversation_id, content):
        user = User.objects.get(id=user_id)
        conversation = Conversation.objects.get(id=conversation_id)
        return Message.objects.create(
            conversation=conversation,
            sender=user,
            content=content,
            message_type='text'
        )

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