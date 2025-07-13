#!/usr/bin/env python
"""
Script pour mettre à jour les utilisateurs existants avec des noms complets
"""
import os
import sys
import django
from django.contrib.auth import get_user_model

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

User = get_user_model()

def update_existing_users():
    print("Mise à jour des utilisateurs existants...")
    
    # Mettre à jour l'utilisateur admin
    try:
        admin_user = User.objects.get(username='admin')
        admin_user.first_name = 'Administrateur'
        admin_user.last_name = 'Système'
        admin_user.save()
        print(f"✓ Admin mis à jour: {admin_user.get_full_name()} ({admin_user.username})")
    except User.DoesNotExist:
        print("⚠️ Utilisateur admin non trouvé")
    
    # Mettre à jour l'utilisateur amadou
    try:
        amadou_user = User.objects.get(username='amadou')
        amadou_user.first_name = 'Amadou'
        amadou_user.last_name = 'Diallo'
        amadou_user.save()
        print(f"✓ Amadou mis à jour: {amadou_user.get_full_name()} ({amadou_user.username})")
    except User.DoesNotExist:
        print("⚠️ Utilisateur amadou non trouvé")
    
    # Mettre à jour les clients existants
    clients_data = {
        'client1': {'first_name': 'Jean', 'last_name': 'Dupont'},
        'client2': {'first_name': 'Marie', 'last_name': 'Martin'},
        'client3': {'first_name': 'Pierre', 'last_name': 'Durand'},
    }
    
    for username, names in clients_data.items():
        try:
            user = User.objects.get(username=username)
            user.first_name = names['first_name']
            user.last_name = names['last_name']
            user.save()
            print(f"✓ Client mis à jour: {user.get_full_name()} ({user.username})")
        except User.DoesNotExist:
            print(f"⚠️ Utilisateur {username} non trouvé")
    
    # Mettre à jour les techniciens existants
    technicians_data = {
        'tech_plombier': {'first_name': 'Ahmed', 'last_name': 'Diallo'},
        'tech_electricien': {'first_name': 'Kouassi', 'last_name': 'Yao'},
        'tech_serrurier': {'first_name': 'Moussa', 'last_name': 'Traoré'},
        'tech_informatique': {'first_name': 'Fatou', 'last_name': 'Coulibaly'},
        'tech_climatisation': {'first_name': 'Issouf', 'last_name': 'Ouattara'},
        'tech_electromenager': {'first_name': 'Aminata', 'last_name': 'Koné'},
        'tech_mecanicien': {'first_name': 'Bakary', 'last_name': 'Sangaré'},
    }
    
    for username, names in technicians_data.items():
        try:
            user = User.objects.get(username=username)
            user.first_name = names['first_name']
            user.last_name = names['last_name']
            user.save()
            print(f"✓ Technicien mis à jour: {user.get_full_name()} ({user.username})")
        except User.DoesNotExist:
            print(f"⚠️ Utilisateur {username} non trouvé")
    
    print("\n🎉 Mise à jour terminée!")
    print("\nRésumé des utilisateurs mis à jour:")
    
    # Afficher tous les utilisateurs avec leurs noms complets
    for user in User.objects.all().order_by('username'):
        full_name = user.get_full_name() or user.username
        user_type = getattr(user, 'user_type', 'Non défini')
        print(f"- {full_name} ({user.username}) - {user_type}")

if __name__ == '__main__':
    update_existing_users() 