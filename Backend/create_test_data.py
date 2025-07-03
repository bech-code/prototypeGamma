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

# Coordonnées de Bamako (Mali)
BAMAKO_LAT = 12.6392
BAMAKO_LNG = -8.0029

SPECIALTIES = [
    'electrician', 'plumber', 'mechanic', 'it',
    'air_conditioning', 'appliance_repair', 'locksmith', 'other'
]

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
    
    # Nettoyage des techniciens et utilisateurs de test existants
    print("Suppression des techniciens et utilisateurs de test existants...")
    for i in range(1, 11):
        username = f"tech_test_{i}"
        try:
            user = User.objects.get(username=username)
            user.delete()
        except User.DoesNotExist:
            pass

    from depannage.models import Technician
    for i in range(1, 11):
        try:
            tech = Technician.objects.get(user__username=f"tech_test_{i}")
            tech.delete()
        except Technician.DoesNotExist:
            pass
    
    # Créer 3 techniciens par spécialité autour de Bamako
    print("\nCréation de techniciens multiples par spécialité...")
    tech_counter = 1
    for specialty in SPECIALTIES:
        for j in range(3):
            username = f"tech_{specialty}_{j+1}"
            email = f"tech_{specialty}_{j+1}@example.com"
            password = "TestPassword123!"
        user, created = User.objects.get_or_create(
                username=username,
            defaults={
                    'first_name': f"Tech{tech_counter}",
                    'last_name': specialty.capitalize(),
                    'email': email,
                    'user_type': 'technician',
                    'is_active': True,
            }
        )
        if created:
                user.set_password(password)
            user.save()
            lat = BAMAKO_LAT + random.uniform(-0.01, 0.01)
            lng = BAMAKO_LNG + random.uniform(-0.01, 0.01)
            tech, t_created = Technician.objects.get_or_create(
            user=user,
            defaults={
                    'specialty': specialty,
                    'years_experience': random.randint(1, 10),
                    'hourly_rate': random.randint(10000, 30000),
                'is_available': True,
                'is_verified': True,
                    'service_radius_km': 20,
                    'bio': f"Technicien test {tech_counter} ({specialty}) à Bamako.",
                    'current_latitude': lat,
                    'current_longitude': lng,
                    'created_at': timezone.now(),
                }
            )
            print(f"✅ Technicien créé: {user.username} | Spécialité: {specialty} | Lat: {lat:.5f} | Lng: {lng:.5f}")
            tech_counter += 1
    print("\n3 techniciens par spécialité créés autour de Bamako !")
    
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
            matching_techs = Technician.objects.filter(specialty=request_data['specialty_needed'])
            if matching_techs.exists():
                technician = random.choice(list(matching_techs))
        
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
    print(f"- {Technician.objects.count()} techniciens")
    print(f"- {len(repair_requests)} demandes de réparation")
    print(f"- {len(notifications_data)} notifications")

    # Diagnostic : afficher tous les techniciens
    print("\nDiagnostic : Liste des techniciens en base :")
    for tech in Technician.objects.all():
        print(f"Technicien ID: {tech.id} | User ID: {tech.user.id} | Username: {tech.user.username} | Spécialité: {tech.specialty}")

if __name__ == '__main__':
    create_test_data() 