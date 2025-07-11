#!/usr/bin/env python3
"""
Test de validation du mot de passe et connexion API
"""

import requests
import json

def test_password_validation():
    """Test de validation du mot de passe avec différents formats"""
    print("🔧 Test de validation du mot de passe")
    print("=" * 50)
    
    # Test avec le mot de passe actuel
    login_data = {
        "email": "test_technicien@depanneteliman.com",
        "password": "test123"
    }
    
    print("1. Test avec mot de passe actuel (test123)")
    try:
        response = requests.post("http://127.0.0.1:8000/users/login/", json=login_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Connexion réussie")
            return True
        else:
            print(f"   ❌ Échec: {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test avec un mot de passe plus long (pour respecter la validation)
    print("\n2. Test avec mot de passe plus long")
    login_data_long = {
        "email": "test_technicien@depanneteliman.com",
        "password": "test123456789"
    }
    
    try:
        response = requests.post("http://127.0.0.1:8000/users/login/", json=login_data_long)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Connexion réussie avec mot de passe long")
            return True
        else:
            print(f"   ❌ Échec: {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test avec un mot de passe complexe
    print("\n3. Test avec mot de passe complexe")
    login_data_complex = {
        "email": "test_technicien@depanneteliman.com",
        "password": "Test123456789!"
    }
    
    try:
        response = requests.post("http://127.0.0.1:8000/users/login/", json=login_data_complex)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Connexion réussie avec mot de passe complexe")
            return True
        else:
            print(f"   ❌ Échec: {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    return False

def test_user_info():
    """Test pour récupérer les informations de l'utilisateur"""
    print("\n🔧 Test des informations utilisateur")
    print("=" * 50)
    
    # Test de connexion via script Django
    import os
    import sys
    import django
    
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.auth.settings')
    os.environ.setdefault('DJANGO_SECRET_KEY', 'django-insecure-your-secret-key-for-development-only-change-in-production')
    sys.path.append(os.path.join(os.path.dirname(__file__), 'Backend'))
    
    django.setup()
    
    from users.models import User
    
    try:
        user = User.objects.get(email="test_technicien@depanneteliman.com")
        print(f"✅ Utilisateur trouvé en base:")
        print(f"   ID: {user.id}")
        print(f"   Email: {user.email}")
        print(f"   Username: {user.username}")
        print(f"   User type: {user.user_type}")
        print(f"   Is active: {user.is_active}")
        print(f"   Date joined: {user.date_joined}")
        
        # Test du mot de passe en Python
        print(f"\n🔧 Test du mot de passe en Python:")
        print(f"   test123: {user.check_password('test123')}")
        print(f"   test123456789: {user.check_password('test123456789')}")
        print(f"   Test123456789!: {user.check_password('Test123456789!')}")
        
        return user
    except User.DoesNotExist:
        print("❌ Utilisateur non trouvé en base")
        return None

def main():
    """Test principal"""
    print("🔧 TEST DE VALIDATION DU MOT DE PASSE")
    print("=" * 60)
    
    # Test des informations utilisateur
    user = test_user_info()
    
    # Test de connexion API
    success = test_password_validation()
    
    if success:
        print("\n✅ SUCCÈS: La connexion API fonctionne !")
    else:
        print("\n❌ ÉCHEC: La connexion API ne fonctionne pas")
        print("Le problème pourrait venir de:")
        print("1. Validation du mot de passe trop stricte")
        print("2. Rate limiting")
        print("3. Middleware de sécurité")
        print("4. Cache ou session")

if __name__ == "__main__":
    main() 