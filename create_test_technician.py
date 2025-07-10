#!/usr/bin/env python3
"""
Script pour créer un compte technicien de test
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import User
from depannage.models import Technician

def create_test_technician():
    """Créer un compte technicien de test"""
    
    User = get_user_model()
    
    # Vérifier si le technicien existe déjà
    technician_email = "technicien@example.com"
    technician_username = "technicien_test"
    
    try:
        existing_technician = User.objects.filter(email=technician_email).first()
        if existing_technician:
            print(f"✅ Le technicien existe déjà:")
            print(f"   Email: {existing_technician.email}")
            print(f"   Username: {existing_technician.username}")
            print(f"   Type: {existing_technician.user_type}")
            print(f"   Actif: {existing_technician.is_active}")
            
            # Vérifier s'il a un profil technicien
            try:
                technician_profile = existing_technician.technician_depannage
                print(f"   Profil technicien: ✅")
                print(f"   Spécialité: {technician_profile.specialty}")
                print(f"   Vérifié: {technician_profile.is_verified}")
            except:
                print(f"   Profil technicien: ❌ (à créer)")
                # Créer le profil technicien
                technician_profile = Technician.objects.create(
                    user=existing_technician,
                    specialty="plumber",
                    phone="+223 70 12 34 56",
                    is_verified=True,
                    is_available=True
                )
                print(f"   ✅ Profil technicien créé")
            
            return existing_technician
        else:
            # Créer l'utilisateur technicien
            technician_user = User.objects.create_user(
                username=technician_username,
                email=technician_email,
                password="technicien123",
                first_name="Test",
                last_name="Technicien",
                user_type="technician",
                is_active=True
            )
            
            # Créer le profil technicien
            technician_profile = Technician.objects.create(
                user=technician_user,
                specialty="plumber",
                phone="+223 70 12 34 56",
                is_verified=True,
                is_available=True
            )
            
            print(f"✅ Technicien créé avec succès:")
            print(f"   Email: {technician_user.email}")
            print(f"   Username: {technician_user.username}")
            print(f"   Mot de passe: technicien123")
            print(f"   Type: {technician_user.user_type}")
            print(f"   Spécialité: {technician_profile.specialty}")
            print(f"   Vérifié: {technician_profile.is_verified}")
            
            return technician_user
            
    except Exception as e:
        print(f"❌ Erreur lors de la création du technicien: {e}")
        return None

if __name__ == "__main__":
    create_test_technician() 