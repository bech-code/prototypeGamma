#!/usr/bin/env python3
"""
Module WebSocket optimisé pour DepanneTeliman
Gestion intelligente des connexions temps réel avec performance et sécurité
"""

import json
import asyncio
import logging
from typing import Dict, Set, Optional, Any, List
from datetime import datetime, timedelta
from django.utils import timezone
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth.models import AnonymousUser
from django.core.cache import cache
from django.conf import settings
import jwt
from .models import ChatConversation, ChatMessage, Notification
from .settings_optimization import WEBSOCKET_SETTINGS, MONITORING_SETTINGS
import hashlib

logger = logging.getLogger(__name__)

# =============================================================================
# GESTIONNAIRE DE CONNEXIONS OPTIMISÉ
# =============================================================================

class ConnectionManager:
    """Gestionnaire centralisé des connexions WebSocket avec optimisations"""
    
    def __init__(self):
        self.connections: Dict[str, Set[str]] = {}  # user_id -> set of channel_names
        self.user_data: Dict[str, Dict[str, Any]] = {}  # user_id -> user info
        self.connection_stats: Dict[str, Dict[str, Any]] = {}  # channel_name -> stats
        self.rate_limits: Dict[str, List[float]] = {}  # user_id -> timestamps
        
    def add_connection(self, user_id: str, channel_name: str, user_data: Dict[str, Any]):
        """Ajouter une connexion avec validation"""
        if user_id not in self.connections:
            self.connections[user_id] = set()
            
        # Vérifier la limite de connexions simultanées
        if len(self.connections[user_id]) >= WEBSOCKET_SETTINGS['MAX_CONNECTIONS_PER_USER']:
            # Supprimer la plus ancienne connexion
            oldest_channel = min(
                self.connections[user_id],
                key=lambda ch: self.connection_stats.get(ch, {}).get('connected_at', 0)
            )
            self.remove_connection(user_id, oldest_channel)
            
        self.connections[user_id].add(channel_name)
        self.user_data[user_id] = user_data
        self.connection_stats[channel_name] = {
            'connected_at': timezone.now().timestamp(),
            'last_activity': timezone.now().timestamp(),
            'messages_sent': 0,
            'messages_received': 0,
        }
        
        logger.info(f"Connexion ajoutée: user_id={user_id}, channel={channel_name}")
        
    def remove_connection(self, user_id: str, channel_name: str):
        """Supprimer une connexion"""
        if user_id in self.connections:
            self.connections[user_id].discard(channel_name)
            if not self.connections[user_id]:
                del self.connections[user_id]
                if user_id in self.user_data:
                    del self.user_data[user_id]
                    
        if channel_name in self.connection_stats:
            del self.connection_stats[channel_name]
            
        logger.info(f"Connexion supprimée: user_id={user_id}, channel={channel_name}")
        
    def get_user_channels(self, user_id: str) -> Set[str]:
        """Obtenir tous les channels d'un utilisateur"""
        return self.connections.get(user_id, set())
        
    def is_user_online(self, user_id: str) -> bool:
        """Vérifier si un utilisateur est en ligne"""
        return user_id in self.connections and len(self.connections[user_id]) > 0
        
    def get_online_users(self) -> List[str]:
        """Obtenir la liste des utilisateurs en ligne"""
        return list(self.connections.keys())
        
    def check_rate_limit(self, user_id: str) -> bool:
        """Vérifier la limite de taux pour un utilisateur"""
        now = timezone.now().timestamp()
        window = 60  # 1 minute
        max_messages = 30  # max 30 messages par minute
        
        if user_id not in self.rate_limits:
            self.rate_limits[user_id] = []
            
        # Nettoyer les anciens timestamps
        self.rate_limits[user_id] = [
            ts for ts in self.rate_limits[user_id] 
            if now - ts < window
        ]
        
        if len(self.rate_limits[user_id]) >= max_messages:
            return False
            
        self.rate_limits[user_id].append(now)
        return True
        
    def update_activity(self, channel_name: str, activity_type: str = 'message'):
        """Mettre à jour l'activité d'une connexion"""
        if channel_name in self.connection_stats:
            self.connection_stats[channel_name]['last_activity'] = timezone.now().timestamp()
            if activity_type == 'message_sent':
                self.connection_stats[channel_name]['messages_sent'] += 1
            elif activity_type == 'message_received':
                self.connection_stats[channel_name]['messages_received'] += 1
                
    def get_stats(self) -> Dict[str, Any]:
        """Obtenir les statistiques des connexions"""
        now = timezone.now().timestamp()
        total_connections = sum(len(channels) for channels in self.connections.values())
        active_connections = sum(
            1 for stats in self.connection_stats.values()
            if now - stats.get('last_activity', 0) < 300  # actif dans les 5 dernières minutes
        )
        
        return {
            'total_users': len(self.connections),
            'total_connections': total_connections,
            'active_connections': active_connections,
            'average_connections_per_user': total_connections / max(len(self.connections), 1),
        }

# Instance globale du gestionnaire
connection_manager = ConnectionManager()

# =============================================================================
# CONSUMER WEBSOCKET OPTIMISÉ
# =============================================================================

class OptimizedChatConsumer(AsyncWebsocketConsumer):
    """Consumer WebSocket optimisé pour le chat"""
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.user_id = None
        self.conversation_groups = set()
        self.heartbeat_task = None
        self.last_heartbeat = None
        
    async def connect(self):
        """Connexion WebSocket avec authentification et validation"""
        try:
            # Authentification via token
            token = self.get_token_from_query()
            if not token:
                await self.close(code=4001)
                return
                
            user = await self.authenticate_token(token)
            if not user:
                await self.close(code=4001)
                return
                
            self.user_id = str(user.id)
            
            # Vérifier les limites de connexion
            if not connection_manager.check_rate_limit(self.user_id):
                await self.close(code=4029)  # Too Many Requests
                return
                
            await self.accept()
            
            # Ajouter à la gestion des connexions
            user_data = {
                'id': user.id,
                'username': user.username,
                'user_type': getattr(user, 'user_type', 'client'),
            }
            connection_manager.add_connection(self.user_id, self.channel_name, user_data)
            
            # Rejoindre les groupes de conversation
            await self.join_user_conversations()
            
            # Démarrer le heartbeat
            self.heartbeat_task = asyncio.create_task(self.heartbeat_loop())
            
            # Envoyer les messages non lus
            await self.send_unread_messages()
            
            logger.info(f"WebSocket connecté: user_id={self.user_id}")
            
        except Exception as e:
            logger.error(f"Erreur lors de la connexion WebSocket: {e}")
            await self.close(code=4000)
            
    async def disconnect(self, close_code):
        """Déconnexion WebSocket avec nettoyage"""
        try:
            # Arrêter le heartbeat
            if self.heartbeat_task:
                self.heartbeat_task.cancel()
                
            # Quitter les groupes de conversation
            for group_name in self.conversation_groups:
                await self.channel_layer.group_discard(group_name, self.channel_name)
                
            # Supprimer de la gestion des connexions
            if self.user_id:
                connection_manager.remove_connection(self.user_id, self.channel_name)
                
            logger.info(f"WebSocket déconnecté: user_id={self.user_id}, code={close_code}")
            
        except Exception as e:
            logger.error(f"Erreur lors de la déconnexion WebSocket: {e}")
            
    async def receive(self, text_data):
        """Réception et traitement des messages"""
        try:
            data = json.loads(text_data)
            message_type = data.get('type')
            
            # Vérifier la limite de taux
            if not connection_manager.check_rate_limit(self.user_id):
                await self.send_error('Rate limit exceeded')
                return
                
            # Mettre à jour l'activité
            connection_manager.update_activity(self.channel_name, 'message_received')
            
            # Traiter selon le type de message
            handlers = {
                'chat_message': self.handle_chat_message,
                'heartbeat': self.handle_heartbeat,
                'typing_start': self.handle_typing_start,
                'typing_stop': self.handle_typing_stop,
                'join_conversation': self.handle_join_conversation,
                'leave_conversation': self.handle_leave_conversation,
            }
            
            handler = handlers.get(message_type)
            if handler:
                await handler(data)
            else:
                await self.send_error(f'Type de message non supporté: {message_type}')
                
        except json.JSONDecodeError:
            await self.send_error('Format JSON invalide')
        except Exception as e:
            logger.error(f"Erreur lors du traitement du message: {e}")
            await self.send_error('Erreur interne du serveur')
            
    async def handle_chat_message(self, data):
        """Traiter un message de chat"""
        try:
            conversation_id = data.get('conversation_id')
            content = data.get('content', '').strip()
            
            if not conversation_id or not content:
                await self.send_error('conversation_id et content requis')
                return
                
            if len(content) > WEBSOCKET_SETTINGS['MAX_MESSAGE_SIZE']:
                await self.send_error('Message trop long')
                return
                
            # Vérifier l'accès à la conversation
            conversation = await self.get_conversation(conversation_id)
            if not conversation:
                await self.send_error('Conversation non trouvée')
                return
                
            if not await self.can_access_conversation(conversation):
                await self.send_error('Accès refusé à cette conversation')
                return
                
            # Créer le message
            message = await self.create_message(conversation, content)
            if not message:
                await self.send_error('Erreur lors de la création du message')
                return
                
            # Envoyer à tous les participants
            await self.broadcast_message(conversation, message)
            
            # Mettre à jour l'activité
            connection_manager.update_activity(self.channel_name, 'message_sent')
            
        except Exception as e:
            logger.error(f"Erreur lors du traitement du message de chat: {e}")
            await self.send_error('Erreur lors de l\'envoi du message')
            
    async def handle_heartbeat(self, data):
        """Traiter un heartbeat"""
        self.last_heartbeat = timezone.now()
        await self.send_json({
            'type': 'heartbeat_ack',
            'timestamp': timezone.now().isoformat(),
        })
        
    async def handle_typing_start(self, data):
        """Traiter le début de frappe"""
        conversation_id = data.get('conversation_id')
        if conversation_id:
            group_name = f'conversation_{conversation_id}'
            await self.channel_layer.group_send(group_name, {
                'type': 'typing_notification',
                'user_id': self.user_id,
                'is_typing': True,
                'conversation_id': conversation_id,
            })
            
    async def handle_typing_stop(self, data):
        """Traiter l'arrêt de frappe"""
        conversation_id = data.get('conversation_id')
        if conversation_id:
            group_name = f'conversation_{conversation_id}'
            await self.channel_layer.group_send(group_name, {
                'type': 'typing_notification',
                'user_id': self.user_id,
                'is_typing': False,
                'conversation_id': conversation_id,
            })
            
    async def handle_join_conversation(self, data):
        """Rejoindre une conversation"""
        conversation_id = data.get('conversation_id')
        if conversation_id:
            conversation = await self.get_conversation(conversation_id)
            if conversation and await self.can_access_conversation(conversation):
                group_name = f'conversation_{conversation_id}'
                await self.channel_layer.group_add(group_name, self.channel_name)
                self.conversation_groups.add(group_name)
                
                await self.send_json({
                    'type': 'conversation_joined',
                    'conversation_id': conversation_id,
                })
                
    async def handle_leave_conversation(self, data):
        """Quitter une conversation"""
        conversation_id = data.get('conversation_id')
        if conversation_id:
            group_name = f'conversation_{conversation_id}'
            await self.channel_layer.group_discard(group_name, self.channel_name)
            self.conversation_groups.discard(group_name)
            
            await self.send_json({
                'type': 'conversation_left',
                'conversation_id': conversation_id,
            })
            
    async def chat_message(self, event):
        """Envoyer un message de chat au client"""
        await self.send_json({
            'type': 'chat_message',
            'message': event['message'],
        })
        
    async def typing_notification(self, event):
        """Envoyer une notification de frappe"""
        # Ne pas renvoyer ses propres notifications de frappe
        if event['user_id'] != self.user_id:
            await self.send_json({
                'type': 'typing_notification',
                'user_id': event['user_id'],
                'is_typing': event['is_typing'],
                'conversation_id': event['conversation_id'],
            })
            
    async def notification(self, event):
        """Envoyer une notification générale"""
        await self.send_json({
            'type': 'notification',
            'notification': event['notification'],
        })
        
    async def heartbeat_loop(self):
        """Boucle de heartbeat pour maintenir la connexion"""
        try:
            while True:
                await asyncio.sleep(WEBSOCKET_SETTINGS['HEARTBEAT_INTERVAL'])
                
                # Vérifier si le client répond aux heartbeats
                if (self.last_heartbeat and 
                    timezone.now() - self.last_heartbeat > timedelta(seconds=WEBSOCKET_SETTINGS['CONNECTION_TIMEOUT'] * 2)):
                    logger.warning(f"Connexion WebSocket inactive: user_id={self.user_id}")
                    await self.close(code=4008)  # Timeout
                    break
                    
                await self.send_json({
                    'type': 'heartbeat',
                    'timestamp': timezone.now().isoformat(),
                })
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Erreur dans la boucle heartbeat: {e}")
            
    # =============================================================================
    # MÉTHODES UTILITAIRES
    # =============================================================================
    
    def get_token_from_query(self) -> Optional[str]:
        """Extraire le token JWT des paramètres de requête"""
        query_params = self.scope.get('query_string', b'').decode()
        for param in query_params.split('&'):
            if '=' in param:
                key, value = param.split('=', 1)
                if key == 'token':
                    return value
        return None
        
    @database_sync_to_async
    def authenticate_token(self, token: str):
        """Authentifier l'utilisateur via le token JWT"""
        try:
            from django.contrib.auth import get_user_model
            from rest_framework_simplejwt.tokens import UntypedToken
            from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
            
            User = get_user_model()
            
            # Valider le token
            UntypedToken(token)
            
            # Décoder le token pour obtenir l'user_id
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
            user_id = payload.get('user_id')
            
            if user_id:
                user = User.objects.get(id=user_id, is_active=True)
                return user
                
        except (InvalidToken, TokenError, User.DoesNotExist, jwt.InvalidTokenError):
            pass
            
        return None
        
    @database_sync_to_async
    def get_conversation(self, conversation_id: int):
        """Obtenir une conversation par son ID"""
        try:
            return ChatConversation.objects.get(id=conversation_id)
        except ChatConversation.DoesNotExist:
            return None
            
    @database_sync_to_async
    def can_access_conversation(self, conversation) -> bool:
        """Vérifier si l'utilisateur peut accéder à la conversation"""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=self.user_id)
            
            # Vérifier si l'utilisateur est participant
            return conversation.participants.filter(id=user.id).exists()
            
        except User.DoesNotExist:
            return False
            
    @database_sync_to_async
    def create_message(self, conversation, content: str):
        """Créer un nouveau message"""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=self.user_id)
            
            message = ChatMessage.objects.create(
                conversation=conversation,
                sender=user,
                content=content,
            )
            
            # Mettre à jour la dernière activité de la conversation
            conversation.updated_at = timezone.now()
            conversation.save(update_fields=['updated_at'])
            
            return message
            
        except Exception as e:
            logger.error(f"Erreur lors de la création du message: {e}")
            return None
            
    async def broadcast_message(self, conversation, message):
        """Diffuser un message à tous les participants"""
        group_name = f'conversation_{conversation.id}'
        
        # Sérialiser le message
        message_data = await self.serialize_message(message)
        
        await self.channel_layer.group_send(group_name, {
            'type': 'chat_message',
            'message': message_data,
        })
        
    @database_sync_to_async
    def serialize_message(self, message):
        """Sérialiser un message pour l'envoi"""
        return {
            'id': message.id,
            'conversation_id': message.conversation.id,
            'sender': {
                'id': message.sender.id,
                'username': message.sender.username,
                'first_name': message.sender.first_name,
                'last_name': message.sender.last_name,
            },
            'content': message.content,
            'created_at': message.created_at.isoformat(),
            'is_read': False,
        }
        
    async def join_user_conversations(self):
        """Rejoindre toutes les conversations de l'utilisateur"""
        conversations = await self.get_user_conversations()
        
        for conversation_id in conversations:
            group_name = f'conversation_{conversation_id}'
            await self.channel_layer.group_add(group_name, self.channel_name)
            self.conversation_groups.add(group_name)
            
    @database_sync_to_async
    def get_user_conversations(self):
        """Obtenir la liste des conversations de l'utilisateur"""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=self.user_id)
            
            return list(
                ChatConversation.objects.filter(participants=user)
                .values_list('id', flat=True)
            )
            
        except User.DoesNotExist:
            return []
            
    async def send_unread_messages(self):
        """Envoyer les messages non lus au client"""
        unread_messages = await self.get_unread_messages()
        
        for message_data in unread_messages:
            await self.send_json({
                'type': 'unread_message',
                'message': message_data,
            })
            
    @database_sync_to_async
    def get_unread_messages(self):
        """Obtenir les messages non lus de l'utilisateur"""
        try:
            from django.contrib.auth import get_user_model
            User = get_user_model()
            user = User.objects.get(id=self.user_id)
            
            # Récupérer les messages non lus des dernières 24h
            cutoff_time = timezone.now() - timedelta(hours=24)
            
            messages = ChatMessage.objects.filter(
                conversation__participants=user,
                created_at__gte=cutoff_time,
                is_read=False,
            ).exclude(sender=user).order_by('-created_at')[:50]
            
            return [self.serialize_message_sync(msg) for msg in messages]
            
        except User.DoesNotExist:
            return []
            
    def serialize_message_sync(self, message):
        """Version synchrone de serialize_message"""
        return {
            'id': message.id,
            'conversation_id': message.conversation.id,
            'sender': {
                'id': message.sender.id,
                'username': message.sender.username,
                'first_name': message.sender.first_name,
                'last_name': message.sender.last_name,
            },
            'content': message.content,
            'created_at': message.created_at.isoformat(),
            'is_read': message.is_read,
        }
        
    async def send_error(self, message: str):
        """Envoyer un message d'erreur au client"""
        await self.send_json({
            'type': 'error',
            'message': message,
            'timestamp': timezone.now().isoformat(),
        })
        
    async def send_json(self, content):
        """Envoyer du JSON au client avec gestion d'erreur"""
        try:
            await self.send(text_data=json.dumps(content))
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi JSON: {e}")

# =============================================================================
# UTILITAIRES DE MONITORING
# =============================================================================

class WebSocketMonitor:
    """Monitoring des performances WebSocket"""
    
    @staticmethod
    def get_connection_stats():
        """Obtenir les statistiques des connexions"""
        return connection_manager.get_stats()
        
    @staticmethod
    def get_active_users():
        """Obtenir la liste des utilisateurs actifs"""
        return connection_manager.get_online_users()
        
    @staticmethod
    def cleanup_stale_connections():
        """Nettoyer les connexions obsolètes"""
        # Cette méthode pourrait être appelée périodiquement
        # pour nettoyer les connexions qui ne répondent plus
        pass

# =============================================================================
# FONCTIONS UTILITAIRES
# =============================================================================

async def send_notification_to_user(user_id: str, notification_data: Dict[str, Any]):
    """Envoyer une notification à un utilisateur spécifique"""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    channels = connection_manager.get_user_channels(str(user_id))
    
    for channel_name in channels:
        await channel_layer.send(channel_name, {
            'type': 'notification',
            'notification': notification_data,
        })

async def broadcast_to_conversation(conversation_id: int, message_data: Dict[str, Any]):
    """Diffuser un message à tous les participants d'une conversation"""
    from channels.layers import get_channel_layer
    
    channel_layer = get_channel_layer()
    group_name = f'conversation_{conversation_id}'
    
    await channel_layer.group_send(group_name, {
        'type': 'chat_message',
        'message': message_data,
    })

def is_user_online(user_id: str) -> bool:
    """Vérifier si un utilisateur est en ligne"""
    return connection_manager.is_user_online(str(user_id))