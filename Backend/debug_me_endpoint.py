#!/usr/bin/env python3
"""
Script simple pour tester l'endpoint /users/me/ et diagnostiquer le problème technician.
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
    """Teste l'endpoint /users/me/ avec un technicien existant."""
    print("🔍 TEST DE L'ENDPOINT /users/me/")
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

if __name__ == "__main__":
    test_me_endpoint() 