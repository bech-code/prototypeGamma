#!/usr/bin/env python3
"""
Script pour créer les profils Technician et Client pour les utilisateurs de test DepanneTeliman
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, Client

def create_technician_profile(user_email):
    try:
        user = User.objects.get(email=user_email)
        if Technician.objects.filter(user=user).exists():
            print(f"⚠️  Profil Technician déjà existant pour {user_email}")
            return
        tech = Technician.objects.create(
            user=user,
            specialty='plomberie',  # spécialité par défaut
            phone='+22300000000',
            years_experience=1,
            is_verified=True,
            is_available=True,
        )
        print(f"✅ Profil Technician créé pour {user_email}")
    except User.DoesNotExist:
        print(f"❌ Utilisateur introuvable: {user_email}")

def create_client_profile(user_email):
    try:
        user = User.objects.get(email=user_email)
        if Client.objects.filter(user=user).exists():
            print(f"⚠️  Profil Client déjà existant pour {user_email}")
            return
        client = Client.objects.create(
            user=user,
            phone='+22300000001',
            address='Bamako',
        )
        print(f"✅ Profil Client créé pour {user_email}")
    except User.DoesNotExist:
        print(f"❌ Utilisateur introuvable: {user_email}")

def main():
    print("=== Création des profils Technician et Client pour les utilisateurs de test ===")
    create_technician_profile('technicien@depanneteliman.com')
    create_client_profile('client@depanneteliman.com')
    print("\nTerminé.")

if __name__ == "__main__":
    main() 