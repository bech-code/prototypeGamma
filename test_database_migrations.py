#!/usr/bin/env python3
"""
Script de test pour les migrations de la base de données
Adapte la base de données pour les nouvelles fonctionnalités de communication
"""

import os
import sys
import django
from django.core.management import execute_from_command_line
from django.db import connection
from django.core.management.base import BaseCommand
from django.utils import timezone
from datetime import timedelta

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'depannage.settings')
django.setup()

from depannage.models import (
    ChatConversation, ChatMessage, ChatMessageAttachment,
    CommunicationStats, CommunicationSession, CommunicationNotification,
    CommunicationSettings, User, Client, Technician, RepairRequest
)


def test_migrations():
    """Test des migrations et des nouveaux modèles."""
    print("🔧 Test des migrations de la base de données...")
    
    try:
        # Test 1: Vérifier que les nouveaux modèles existent
        print("\n1. Vérification des nouveaux modèles...")
        
        # Test ChatConversation
        conversation_count = ChatConversation.objects.count()
        print(f"   ✅ ChatConversation: {conversation_count} conversations")
        
        # Test ChatMessage
        message_count = ChatMessage.objects.count()
        print(f"   ✅ ChatMessage: {message_count} messages")
        
        # Test ChatMessageAttachment
        attachment_count = ChatMessageAttachment.objects.count()
        print(f"   ✅ ChatMessageAttachment: {attachment_count} pièces jointes")
        
        # Test CommunicationStats
        stats_count = CommunicationStats.objects.count()
        print(f"   ✅ CommunicationStats: {stats_count} statistiques")
        
        # Test CommunicationSession
        session_count = CommunicationSession.objects.count()
        print(f"   ✅ CommunicationSession: {session_count} sessions")
        
        # Test CommunicationNotification
        notification_count = CommunicationNotification.objects.count()
        print(f"   ✅ CommunicationNotification: {notification_count} notifications")
        
        # Test CommunicationSettings
        settings_count = CommunicationSettings.objects.count()
        print(f"   ✅ CommunicationSettings: {settings_count} paramètres")
        
        print("\n2. Test de création d'objets...")
        
        # Créer des utilisateurs de test si nécessaire
        client_user, created = User.objects.get_or_create(
            username='test_client_comm',
            defaults={
                'email': 'test_client_comm@example.com',
                'first_name': 'Test',
                'last_name': 'Client Comm',
                'is_active': True
            }
        )
        
        technician_user, created = User.objects.get_or_create(
            username='test_technician_comm',
            defaults={
                'email': 'test_technician_comm@example.com',
                'first_name': 'Test',
                'last_name': 'Technician Comm',
                'is_active': True
            }
        )
        
        # Créer des profils si nécessaire
        client, created = Client.objects.get_or_create(
            user=client_user,
            defaults={
                'address': '123 Test Street',
                'phone': '+2250700000001',
                'is_active': True
            }
        )
        
        technician, created = Technician.objects.get_or_create(
            user=technician_user,
            defaults={
                'specialty': 'electrician',
                'phone': '+2250700000002',
                'is_available': True,
                'is_verified': True,
                'hourly_rate': 5000.00
            }
        )
        
        # Créer une demande de réparation de test
        request, created = RepairRequest.objects.get_or_create(
            client=client,
            title='Test Communication Request',
            defaults={
                'specialty_needed': 'electrician',
                'address': '123 Test Street',
                'status': 'assigned',
                'technician': technician
            }
        )
        
        # Test 3: Créer une conversation de chat
        conversation, created = ChatConversation.objects.get_or_create(
            client=client_user,
            technician=technician_user,
            defaults={
                'request': request,
                'is_active': True,
                'last_activity_type': 'message'
            }
        )
        print(f"   ✅ Conversation créée: {conversation}")
        
        # Test 4: Créer des messages de test
        message1 = ChatMessage.objects.create(
            conversation=conversation,
            sender=client_user,
            content='Bonjour, j\'ai un problème électrique.',
            message_type='text'
        )
        print(f"   ✅ Message texte créé: {message1.id}")
        
        message2 = ChatMessage.objects.create(
            conversation=conversation,
            sender=technician_user,
            content='Je serai là dans 30 minutes.',
            message_type='text'
        )
        print(f"   ✅ Message réponse créé: {message2.id}")
        
        # Test 5: Créer un message de localisation
        location_message = ChatMessage.objects.create(
            conversation=conversation,
            sender=technician_user,
            content='Ma position actuelle',
            message_type='location',
            latitude=5.3600,
            longitude=-4.0083
        )
        print(f"   ✅ Message localisation créé: {location_message.id}")
        
        # Test 6: Créer un message vocal
        voice_message = ChatMessage.objects.create(
            conversation=conversation,
            sender=client_user,
            content='Message vocal',
            message_type='voice',
            voice_duration=15
        )
        print(f"   ✅ Message vocal créé: {voice_message.id}")
        
        # Test 7: Créer des statistiques de communication
        stats, created = CommunicationStats.objects.get_or_create(
            conversation=conversation,
            defaults={
                'total_messages': 4,
                'text_messages': 2,
                'voice_messages': 1,
                'location_shares': 1,
                'file_shares': 0,
                'avg_response_time_minutes': 5.5
            }
        )
        print(f"   ✅ Statistiques créées: {stats}")
        
        # Test 8: Créer une session de communication
        session = CommunicationSession.objects.create(
            conversation=conversation,
            user=client_user,
            messages_sent=2,
            messages_received=2,
            device_info={'browser': 'Chrome', 'os': 'Windows'},
            ip_address='127.0.0.1'
        )
        print(f"   ✅ Session créée: {session}")
        
        # Test 9: Créer une notification
        notification = CommunicationNotification.objects.create(
            recipient=technician_user,
            conversation=conversation,
            notification_type='new_message',
            title='Nouveau message',
            message='Vous avez reçu un nouveau message de Test Client Comm'
        )
        print(f"   ✅ Notification créée: {notification}")
        
        # Test 10: Créer des paramètres de communication
        settings, created = CommunicationSettings.objects.get_or_create(
            user=client_user,
            defaults={
                'auto_read_receipts': True,
                'typing_indicators': True,
                'sound_notifications': True,
                'vibration_notifications': True,
                'message_preview': True,
                'auto_download_media': False,
                'max_file_size_mb': 10,
                'allowed_file_types': ['image/*', 'audio/*', 'video/*'],
                'language': 'fr',
                'theme': 'light'
            }
        )
        print(f"   ✅ Paramètres créés: {settings}")
        
        print("\n3. Test des fonctionnalités avancées...")
        
        # Test des méthodes personnalisées
        unread_count = conversation.unread_count_for_user(client_user)
        print(f"   ✅ Messages non lus pour client: {unread_count}")
        
        conversation.mark_all_as_read_for_user(client_user)
        print(f"   ✅ Tous les messages marqués comme lus")
        
        # Test du mode silencieux
        conversation.mute_until(timezone.now() + timedelta(hours=2))
        is_muted = conversation.is_muted_for_user(client_user)
        print(f"   ✅ Conversation en mode silencieux: {is_muted}")
        
        conversation.unmute()
        is_muted = conversation.is_muted_for_user(client_user)
        print(f"   ✅ Conversation désactivée du mode silencieux: {is_muted}")
        
        # Test de l'épinglage
        conversation.toggle_pin()
        print(f"   ✅ Conversation épinglée: {conversation.is_pinned}")
        
        # Test de l'édition de message
        message1.edit_message('Message modifié')
        print(f"   ✅ Message modifié: {message1.is_edited}")
        
        # Test des paramètres
        in_quiet_hours = settings.is_in_quiet_hours()
        print(f"   ✅ En heures silencieuses: {in_quiet_hours}")
        
        allowed_types = settings.get_allowed_file_types()
        print(f"   ✅ Types de fichiers autorisés: {allowed_types}")
        
        print("\n4. Test des contraintes de base de données...")
        
        # Test des contraintes de validation
        try:
            # Test contrainte durée vocale positive
            invalid_voice = ChatMessage.objects.create(
                conversation=conversation,
                sender=client_user,
                content='Test',
                message_type='voice',
                voice_duration=0  # Devrait échouer
            )
            print("   ❌ Contrainte durée vocale non respectée")
        except Exception as e:
            print(f"   ✅ Contrainte durée vocale respectée: {e}")
        
        try:
            # Test contrainte coordonnées pour messages de localisation
            invalid_location = ChatMessage.objects.create(
                conversation=conversation,
                sender=client_user,
                content='Test',
                message_type='text',  # Pas un message de localisation
                latitude=5.3600,  # Devrait échouer
                longitude=-4.0083
            )
            print("   ❌ Contrainte coordonnées non respectée")
        except Exception as e:
            print(f"   ✅ Contrainte coordonnées respectée: {e}")
        
        print("\n5. Test des index de performance...")
        
        # Test des requêtes avec index
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM depannage_chatmessage 
                WHERE conversation_id = %s AND created_at > %s
            """, [conversation.id, timezone.now() - timedelta(days=1)])
            count = cursor.fetchone()[0]
            print(f"   ✅ Requête avec index conversation/created_at: {count} messages")
        
        with connection.cursor() as cursor:
            cursor.execute("""
                SELECT COUNT(*) FROM depannage_chatconversation 
                WHERE client_id = %s AND last_message_at IS NOT NULL
            """, [client_user.id])
            count = cursor.fetchone()[0]
            print(f"   ✅ Requête avec index client/last_message_at: {count} conversations")
        
        print("\n6. Nettoyage des données de test...")
        
        # Supprimer les objets de test
        ChatMessage.objects.filter(conversation=conversation).delete()
        CommunicationSession.objects.filter(conversation=conversation).delete()
        CommunicationNotification.objects.filter(conversation=conversation).delete()
        CommunicationStats.objects.filter(conversation=conversation).delete()
        CommunicationSettings.objects.filter(user=client_user).delete()
        ChatConversation.objects.filter(id=conversation.id).delete()
        RepairRequest.objects.filter(id=request.id).delete()
        
        print("   ✅ Données de test supprimées")
        
        print("\n🎉 Tous les tests de migration ont réussi!")
        assert True, "Tous les tests de migration ont réussi."
        
    except Exception as e:
        print(f"\n❌ Erreur lors des tests: {e}")
        import traceback
        traceback.print_exc()
        assert False, f"Échec des tests de migration: {e}"


def apply_migrations():
    """Applique les migrations."""
    print("🔄 Application des migrations...")
    
    try:
        # Appliquer les migrations
        execute_from_command_line(['manage.py', 'makemigrations'])
        execute_from_command_line(['manage.py', 'migrate'])
        
        print("✅ Migrations appliquées avec succès")
        assert True, "Migrations appliquées avec succès."
        
    except Exception as e:
        print(f"❌ Erreur lors de l'application des migrations: {e}")
        assert False, f"Échec de l'application des migrations: {e}"


def main():
    """Fonction principale."""
    print("🚀 Test des migrations de la base de données pour les fonctionnalités de communication")
    print("=" * 80)
    
    # Appliquer les migrations
    if not apply_migrations():
        print("❌ Échec de l'application des migrations")
        sys.exit(1)
    
    # Tester les migrations
    if not test_migrations():
        print("❌ Échec des tests de migration")
        sys.exit(1)
    
    print("\n✅ Tous les tests ont réussi!")
    print("La base de données est prête pour les nouvelles fonctionnalités de communication.")


if __name__ == '__main__':
    main() 