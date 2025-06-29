#!/usr/bin/env python
"""
Script pour créer des données de test pour l'application de dépannage
"""
import os
import sys
import django
from django.contrib.auth import get_user_model
from django.utils import timezone
from datetime import timedelta
import random

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from depannage.models import Client, Technician, RepairRequest, Conversation, Message, Notification
from users.models import User

User = get_user_model()

def create_test_data():
    print("Création des données de test...")
    
    # Créer un superutilisateur admin
    admin_user, created = User.objects.get_or_create(
        username='admin',
        defaults={
            'email': 'admin@example.com',
            'first_name': 'Administrateur',
            'last_name': 'Système',
            'is_staff': True,
            'is_superuser': True,
            'user_type': 'admin'
        }
    )
    if created:
        admin_user.set_password('admin123')
        admin_user.save()
        print(f"✓ Superutilisateur créé: {admin_user.get_full_name()} ({admin_user.username})")
    else:
        # Mettre à jour les noms si l'utilisateur existe déjà
        admin_user.first_name = 'Administrateur'
        admin_user.last_name = 'Système'
        admin_user.save()
        print(f"✓ Superutilisateur mis à jour: {admin_user.get_full_name()} ({admin_user.username})")
    
    # Créer des clients
    clients_data = [
        {'username': 'client1', 'email': 'client1@example.com', 'phone': '+2250701234567', 'first_name': 'Jean', 'last_name': 'Dupont'},
        {'username': 'client2', 'email': 'client2@example.com', 'phone': '+2250701234568', 'first_name': 'Marie', 'last_name': 'Martin'},
        {'username': 'client3', 'email': 'client3@example.com', 'phone': '+2250701234569', 'first_name': 'Pierre', 'last_name': 'Durand'},
    ]
    
    clients = []
    for client_data in clients_data:
        user, created = User.objects.get_or_create(
            username=client_data['username'],
            defaults={
                'email': client_data['email'],
                'first_name': client_data['first_name'],
                'last_name': client_data['last_name'],
                'user_type': 'client'
            }
        )
        if created:
            user.set_password('client123')
            user.save()
        
        client, created = Client.objects.get_or_create(
            user=user,
            defaults={
                'phone': client_data['phone'],
                'address': f"Adresse {client_data['first_name']} {client_data['last_name']}, Abidjan"
            }
        )
        clients.append(client)
        print(f"✓ Client créé: {user.get_full_name()} ({user.username})")
    
    # Créer des techniciens
    technicians_data = [
        {
            'username': 'tech_plombier', 
            'email': 'plombier@example.com', 
            'phone': '+2250701234570',
            'first_name': 'Ahmed',
            'last_name': 'Diallo',
            'specialty': 'plumber',
            'hourly_rate': 5000,
            'years_experience': 5
        },
        {
            'username': 'tech_electricien', 
            'email': 'electricien@example.com', 
            'phone': '+2250701234571',
            'first_name': 'Kouassi',
            'last_name': 'Yao',
            'specialty': 'electrician',
            'hourly_rate': 6000,
            'years_experience': 7
        },
        {
            'username': 'tech_serrurier', 
            'email': 'serrurier@example.com', 
            'phone': '+2250701234572',
            'first_name': 'Moussa',
            'last_name': 'Traoré',
            'specialty': 'locksmith',
            'hourly_rate': 4500,
            'years_experience': 3
        },
        {
            'username': 'tech_informatique', 
            'email': 'informatique@example.com', 
            'phone': '+2250701234573',
            'first_name': 'Fatou',
            'last_name': 'Coulibaly',
            'specialty': 'it',
            'hourly_rate': 7000,
            'years_experience': 8
        },
        {
            'username': 'tech_climatisation', 
            'email': 'climatisation@example.com', 
            'phone': '+2250701234574',
            'first_name': 'Issouf',
            'last_name': 'Ouattara',
            'specialty': 'air_conditioning',
            'hourly_rate': 5500,
            'years_experience': 6
        },
        {
            'username': 'tech_electromenager', 
            'email': 'electromenager@example.com', 
            'phone': '+2250701234575',
            'first_name': 'Aminata',
            'last_name': 'Koné',
            'specialty': 'appliance_repair',
            'hourly_rate': 4000,
            'years_experience': 4
        },
        {
            'username': 'tech_mecanicien', 
            'email': 'mecanicien@example.com', 
            'phone': '+2250701234576',
            'first_name': 'Bakary',
            'last_name': 'Sangaré',
            'specialty': 'mechanic',
            'hourly_rate': 6500,
            'years_experience': 9
        }
    ]
    
    technicians = []
    for tech_data in technicians_data:
        user, created = User.objects.get_or_create(
            username=tech_data['username'],
            defaults={
                'email': tech_data['email'],
                'first_name': tech_data['first_name'],
                'last_name': tech_data['last_name'],
                'user_type': 'technician'
            }
        )
        if created:
            user.set_password('tech123')
            user.save()
        
        technician, created = Technician.objects.get_or_create(
            user=user,
            defaults={
                'phone': tech_data['phone'],
                'specialty': tech_data['specialty'],
                'hourly_rate': tech_data['hourly_rate'],
                'years_experience': tech_data['years_experience'],
                'is_available': True,
                'is_verified': True,
                'bio': f"Technicien expérimenté en {tech_data['specialty']}",
                'service_radius_km': random.randint(5, 20)
            }
        )
        technicians.append(technician)
        print(f"✓ Technicien créé: {user.get_full_name()} ({tech_data['specialty']})")
    
    # Créer des demandes de réparation avec une meilleure répartition entre clients
    repair_requests_data = [
        # Demandes du client1
        {
            'title': 'Fuite d\'eau dans la salle de bain',
            'description': 'Il y a une fuite d\'eau sous le lavabo de la salle de bain principale. Le robinet fuit constamment.',
            'specialty_needed': 'plumber',
            'priority': 'high',
            'estimated_price': 15000,
            'status': 'pending',
            'client_index': 0  # client1
        },
        {
            'title': 'Panne électrique dans la cuisine',
            'description': 'Les prises électriques de la cuisine ne fonctionnent plus depuis ce matin. Impossible d\'utiliser les appareils.',
            'specialty_needed': 'electrician',
            'priority': 'urgent',
            'estimated_price': 25000,
            'status': 'assigned',
            'client_index': 0  # client1
        },
        {
            'title': 'Climatisation en panne',
            'description': 'La climatisation ne refroidit plus correctement. Il fait très chaud dans l\'appartement.',
            'specialty_needed': 'air_conditioning',
            'priority': 'medium',
            'estimated_price': 35000,
            'status': 'pending',
            'client_index': 0  # client1
        },
        
        # Demandes du client2
        {
            'title': 'Serrure de porte cassée',
            'description': 'La serrure de la porte d\'entrée ne fonctionne plus correctement. Difficile d\'ouvrir et fermer.',
            'specialty_needed': 'locksmith',
            'priority': 'medium',
            'estimated_price': 12000,
            'status': 'in_progress',
            'client_index': 1  # client2
        },
        {
            'title': 'Réfrigérateur qui ne refroidit plus',
            'description': 'Le réfrigérateur ne maintient plus la température. Les aliments se gâtent rapidement.',
            'specialty_needed': 'appliance_repair',
            'priority': 'urgent',
            'estimated_price': 28000,
            'status': 'assigned',
            'client_index': 1  # client2
        },
        
        # Demandes du client3
        {
            'title': 'Ordinateur qui ne démarre plus',
            'description': 'Mon ordinateur portable ne s\'allume plus depuis hier. J\'ai des fichiers importants dedans.',
            'specialty_needed': 'it',
            'priority': 'high',
            'estimated_price': 30000,
            'status': 'completed',
            'client_index': 2  # client3
        },
        {
            'title': 'Voiture qui ne démarre plus',
            'description': 'La voiture ne démarre plus, problème électrique probable. Batterie peut-être déchargée.',
            'specialty_needed': 'mechanic',
            'priority': 'high',
            'estimated_price': 45000,
            'status': 'completed',
            'client_index': 2  # client3
        }
    ]
    
    repair_requests = []
    for request_data in repair_requests_data:
        client = clients[request_data['client_index']]
        technician = None
        
        # Assigner un technicien selon le statut
        if request_data['status'] in ['assigned', 'in_progress', 'completed']:
            matching_techs = [t for t in technicians if t.specialty == request_data['specialty_needed']]
            if matching_techs:
                technician = random.choice(matching_techs)
        
        # Créer la demande
        repair_request = RepairRequest.objects.create(
            client=client,
            technician=technician,
            title=request_data['title'],
            description=request_data['description'],
            specialty_needed=request_data['specialty_needed'],
            priority=request_data['priority'],
            estimated_price=request_data['estimated_price'],
            status=request_data['status'],
            address=f"Adresse {client.user.username}, Abidjan",
            created_at=timezone.now() - timedelta(days=random.randint(1, 30))
        )
        
        # Ajouter des timestamps selon le statut
        if request_data['status'] in ['assigned', 'in_progress', 'completed']:
            repair_request.assigned_at = repair_request.created_at + timedelta(hours=2)
        if request_data['status'] in ['in_progress', 'completed']:
            repair_request.started_at = repair_request.assigned_at + timedelta(hours=1)
        if request_data['status'] == 'completed':
            repair_request.completed_at = repair_request.started_at + timedelta(hours=random.randint(2, 8))
        
        repair_request.save()
        
        # Créer une conversation pour cette demande
        conversation = Conversation.objects.create(
            request=repair_request,
            is_active=True
        )
        conversation.participants.add(client.user)
        if technician:
            conversation.participants.add(technician.user)
        
        # Créer des messages de test
        Message.objects.create(
            conversation=conversation,
            sender=client.user,
            content=f"Demande créée le {repair_request.created_at.strftime('%d/%m/%Y à %H:%M')}",
            message_type="system"
        )
        
        if technician:
            Message.objects.create(
                conversation=conversation,
                sender=technician.user,
                content=f"Bonjour, je suis {technician.user.username}, votre technicien. Je vais m'occuper de votre demande.",
                message_type="text"
            )
        
        repair_requests.append(repair_request)
        print(f"✓ Demande créée pour {client.user.username}: {request_data['title']} (Statut: {request_data['status']})")
    
    # Créer des notifications spécifiques aux clients
    notifications_data = [
        {
            'title': 'Nouvelle demande de réparation',
            'message': 'Une nouvelle demande de plomberie a été créée',
            'type': 'request_created',
            'recipient': admin_user
        },
        {
            'title': 'Technicien assigné',
            'message': 'Un technicien a été assigné à votre demande de panne électrique',
            'type': 'request_assigned',
            'recipient': clients[0].user  # client1
        },
        {
            'title': 'Travaux commencés',
            'message': 'Les travaux pour votre demande de serrurerie ont commencé',
            'type': 'request_started',
            'recipient': clients[1].user  # client2
        },
        {
            'title': 'Demande terminée',
            'message': 'Votre demande de réparation informatique a été terminée avec succès',
            'type': 'request_completed',
            'recipient': clients[2].user  # client3
        }
    ]
    
    for notif_data in notifications_data:
        Notification.objects.create(
            recipient=notif_data['recipient'],
            title=notif_data['title'],
            message=notif_data['message'],
            type=notif_data['type'],
            is_read=False
        )
        print(f"✓ Notification créée: {notif_data['title']}")
    
    print("\n🎉 Données de test créées avec succès!")
    print("\nComptes de test créés:")
    print("Admin: admin / admin123")
    print("Clients: client1, client2, client3 / client123")
    print("Techniciens: tech_plombier, tech_electricien, etc. / tech123")
    print(f"\nTotal créé:")
    print(f"- {len(clients)} clients")
    print(f"- {len(technicians)} techniciens")
    print(f"- {len(repair_requests)} demandes de réparation")
    print(f"- {len(notifications_data)} notifications")

if __name__ == '__main__':
    create_test_data() 