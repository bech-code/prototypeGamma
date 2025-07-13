#!/usr/bin/env python3
"""
Script pour tester l'endpoint de paiement CinetPay.
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
from depannage.models import RepairRequest, Client
from rest_framework_simplejwt.tokens import RefreshToken

User = get_user_model()

def test_payment_endpoint():
    """Teste l'endpoint de paiement."""
    print("🔍 TEST DE L'ENDPOINT DE PAIEMENT")
    print("=" * 50)
    
    # Trouver un client et une demande existants
    try:
        client = Client.objects.first()
        if not client:
            print("❌ Aucun client trouvé dans la base de données")
            return
            
        repair_request = RepairRequest.objects.filter(client=client).first()
        if not repair_request:
            print("❌ Aucune demande de réparation trouvée pour ce client")
            return
            
        user = client.user
        print(f"👤 Test avec l'utilisateur: {user.username} (ID: {user.id})")
        print(f"🔧 Demande de réparation: {repair_request.id}")
        
        # Créer des tokens pour cet utilisateur
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        
        print(f"🔑 Token créé: {access_token[:50]}...")
        
        # Tester l'endpoint de paiement
        headers = {
            'Authorization': f'Bearer {access_token}',
            'Content-Type': 'application/json'
        }
        
        payment_data = {
            'request_id': repair_request.id,
            'amount': 5000,  # Montant de test
            'description': 'Test de paiement'
        }
        
        print(f"📡 Données de paiement: {payment_data}")
        
        response = requests.post(
            'http://127.0.0.1:8000/depannage/api/cinetpay/initiate_payment/',
            headers=headers,
            json=payment_data
        )
        
        print(f"📡 Status Code: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Réponse reçue:")
            print(json.dumps(data, indent=2, ensure_ascii=False))
            
            if data.get('success'):
                print("✅ Paiement initialisé avec succès")
                print(f"   URL de paiement: {data.get('payment_url')}")
                print(f"   Transaction ID: {data.get('transaction_id')}")
            else:
                print("❌ Échec de l'initialisation du paiement")
                print(f"   Erreur: {data.get('error')}")
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")

if __name__ == "__main__":
    test_payment_endpoint() 