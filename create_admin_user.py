#!/usr/bin/env python3
"""
Script pour créer un compte administrateur
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.models import User

def create_admin_user():
    """Créer un compte administrateur"""
    
    User = get_user_model()
    
    # Vérifier si l'admin existe déjà
    admin_email = "admin@depanneteliman.com"
    admin_username = "admin_depanne"
    
    try:
        existing_admin = User.objects.filter(email=admin_email).first()
        if existing_admin:
            print(f"✅ L'administrateur existe déjà:")
            print(f"   Email: {existing_admin.email}")
            print(f"   Username: {existing_admin.username}")
            print(f"   Staff: {existing_admin.is_staff}")
            print(f"   Superuser: {existing_admin.is_superuser}")
            
            # S'assurer qu'il est admin
            if not existing_admin.is_staff:
                existing_admin.is_staff = True
                existing_admin.save()
                print("   ✅ Statut admin activé")
            
            return existing_admin
        else:
            # Créer un nouvel admin
            admin_user = User.objects.create_user(
                username=admin_username,
                email=admin_email,
                password="admin123456",
                first_name="Administrateur",
                last_name="DepanneTeliman",
                is_staff=True,
                is_superuser=True,
                user_type="admin"
            )
            
            print(f"✅ Nouvel administrateur créé:")
            print(f"   Email: {admin_user.email}")
            print(f"   Username: {admin_user.username}")
            print(f"   Password: admin123456")
            print(f"   Staff: {admin_user.is_staff}")
            print(f"   Superuser: {admin_user.is_superuser}")
            
            return admin_user
            
    except Exception as e:
        print(f"❌ Erreur lors de la création de l'admin: {e}")
        return None

if __name__ == "__main__":
    print("🔧 Création du compte administrateur")
    print("=" * 40)
    
    admin = create_admin_user()
    
    if admin:
        print("\n✅ Compte administrateur prêt!")
        print("Vous pouvez maintenant vous connecter avec:")
        print("   Email: admin@depanneteliman.com")
        print("   Password: admin123456")
    else:
        print("\n❌ Échec de la création du compte administrateur")
        sys.exit(1) 