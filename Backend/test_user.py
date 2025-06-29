import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from users.views import UserViewSet
from rest_framework.test import APIRequestFactory
from rest_framework import status
import json

User = get_user_model()

def test_user_exists():
    """Vérifie si l'utilisateur existe"""
    try:
        user = User.objects.get(email='client1@example.com')
        print(f"Utilisateur trouvé: {user.username} ({user.email})")
        print(f"Type: {user.user_type}")
        print(f"Vérifié: {user.is_verified}")
        return user
    except User.DoesNotExist:
        print("Utilisateur client1@example.com n'existe pas")
        return None

def test_login():
    """Test de la connexion avec l'utilisateur"""
    factory = APIRequestFactory()
    viewset = UserViewSet()
    
    # Données de connexion
    data = {
        'email': 'client1@example.com',
        'password': 'client123'
    }
    
    # Créer la requête
    request = factory.post('/users/login/', data, format='json')
    
    try:
        # Appeler la méthode login
        response = viewset.login(request)
        print(f"Status: {response.status_code}")
        print(f"Response: {response.data}")
        return response
    except Exception as e:
        print(f"Erreur lors de la connexion: {e}")
        import traceback
        traceback.print_exc()
        return None

if __name__ == "__main__":
    print("=== Test de l'utilisateur ===")
    user = test_user_exists()
    
    if user:
        print("\n=== Test de connexion ===")
        test_login()
    else:
        print("\nCréation d'un utilisateur de test...")
        # Créer un utilisateur de test
        user = User.objects.create_user(
            username='client1',
            email='client1@example.com',
            password='client123',
            first_name='Client',
            last_name='Test',
            user_type='client'
        )
        print(f"Utilisateur créé: {user.username}")
        
        print("\n=== Test de connexion ===")
        test_login() 