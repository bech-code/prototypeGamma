#!/usr/bin/env python3
"""
Script pour créer un utilisateur de test pour l'API
"""

import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model

def create_test_user():
    """Crée un utilisateur de test"""
    User = get_user_model()
    
    # Vérifier si l'utilisateur existe déjà
    email = "test@depanneteliman.com"
    username = "testuser"
    
    if User.objects.filter(email=email).exists():
        print(f"✅ L'utilisateur {email} existe déjà")
        user = User.objects.get(email=email)
        # Mettre à jour le mot de passe
        user.set_password("testpass123")
        user.save()
        print(f"✅ Mot de passe mis à jour pour {email}")
    else:
        # Créer un nouvel utilisateur
        user = User.objects.create_user(
            username=username,
            email=email,
            password="testpass123",
            first_name="Test",
            last_name="User",
            user_type="client"
        )
        print(f"✅ Utilisateur de test créé: {email}")
    
    print(f"📧 Email: {email}")
    print(f"🔑 Mot de passe: testpass123")
    print(f"👤 Type: {user.user_type}")
    print(f"👤 Nom complet: {user.first_name} {user.last_name}")
    
    return user

if __name__ == "__main__":
    try:
        user = create_test_user()
        print("\n🎯 Utilisateur prêt pour les tests !")
        print("Vous pouvez maintenant utiliser ces credentials dans Postman:")
        print('{"email": "test@depanneteliman.com", "password": "testpass123"}')
    except Exception as e:
        print(f"❌ Erreur lors de la création: {e}")
        sys.exit(1) 