#!/usr/bin/env python3
"""
Script pour tester l'endpoint /users/me/ et vérifier l'inclusion de l'objet technician.
"""

import os
import sys
import django
import requests
import json

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from depannage.models import Technician
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def test_me_endpoint():
    """Teste l'endpoint /users/me/ avec différents types d'utilisateurs."""
    print("🧪 Test de l'endpoint /users/me/")
    print("=" * 50)
    
    # Trouver un technicien existant
    try:
        technician = Technician.objects.first()
        if not technician:
            print("❌ Aucun technicien trouvé dans la base de données")
            return
            
        user = technician.user
        print(f"👤 Test avec l'utilisateur: {user.username} (ID: {user.id})")
        print(f"🔧 Type: {user.user_type}")
        print(f"🔧 Technician ID: {technician.id}")
        
        # Créer des tokens pour cet utilisateur
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        print(f"🔑 Token créé: {access_token[:50]}...")
        
        # Tester l'endpoint /users/me/
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get('http://127.0.0.1:8000/users/me/', headers=headers)
        
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Réponse reçue:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            # Vérifier la présence de l'objet technician
            user_data = data.get('user', {})
            technician_data = user_data.get('technician')
            
            if technician_data:
                print("✅ Objet technician trouvé dans la réponse")
                print(f"   ID: {technician_data.get('id')}")
                print(f"   Spécialité: {technician_data.get('specialty')}")
                print(f"   Téléphone: {technician_data.get('phone')}")
            else:
                print("❌ Objet technician manquant dans la réponse")
                print("   Clés disponibles dans user:", list(user_data.keys()))
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")

def test_technician_creation():
    """Teste la création d'un technicien et vérifie l'endpoint."""
    print("\n🔧 Test de création d'un technicien")
    print("=" * 50)
    
    try:
        # Créer un utilisateur technicien de test
        test_user = User.objects.create_user(
            username="test_tech_me",
            email="test_tech_me@test.com",
            password="testpass123",
            user_type="technician"
        )
        
        # Créer le profil technicien
        technician = Technician.objects.create(
            user=test_user,
            specialty="plomberie",
            phone="123456789",
            is_available=True,
            is_verified=True
        )
        
        print(f"✅ Technicien créé: {test_user.username} (ID: {test_user.id})")
        print(f"✅ Profil technicien: {technician.id}")
        
        # Créer des tokens
        refresh = RefreshToken.for_user(test_user)
        access_token = str(refresh.access_token)
        
        # Tester l'endpoint
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        response = requests.get('http://127.0.0.1:8000/users/me/', headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            user_data = data.get('user', {})
            technician_data = user_data.get('technician')
            
            if technician_data and technician_data.get('id') == technician.id:
                print("✅ Test réussi: L'objet technician est correctement inclus")
            else:
                print("❌ Test échoué: L'objet technician n'est pas correctement inclus")
                print("   Réponse:", json.dumps(data, indent=2, ensure_ascii=False))
        else:
            print(f"❌ Erreur de l'endpoint: {response.status_code}")
        
        # Nettoyer
        test_user.delete()
        print("🧹 Utilisateur de test supprimé")
        
    except Exception as e:
        print(f"❌ Erreur lors du test de création: {e}")

def main():
    """Fonction principale."""
    print("🔍 TEST DE L'ENDPOINT /users/me/")
    print("=" * 60)
    
    # Vérifier que le serveur est en cours d'exécution
    try:
        response = requests.get('http://127.0.0.1:8000/depannage/api/test/health-check/')
        if response.status_code == 200:
            print("✅ Serveur Django accessible")
        else:
            print("❌ Serveur Django non accessible")
            return
    except Exception as e:
        print(f"❌ Impossible de contacter le serveur: {e}")
        return
    
    # Tests
    test_me_endpoint()
    test_technician_creation()
    
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("Si l'objet technician est présent dans la réponse,")
    print("le problème vient du frontend qui ne récupère pas")
    print("correctement les données après la connexion.")

if __name__ == "__main__":
    main() 