#!/usr/bin/env python3
"""
Test pour vérifier si le backend utilise le simulateur CinetPay
"""

import requests
import json

def test_backend_cinetpay():
    """Test direct de l'endpoint CinetPay du backend"""
    
    # D'abord, se connecter
    login_data = {
        "email": "test_technicien@depanneteliman.com",
        "password": "test123"
    }
    
    print("🔧 TEST DU BACKEND CINETPAY")
    print("=" * 50)
    
    # Connexion
    print("\n1. Connexion")
    response = requests.post("http://127.0.0.1:8000/users/login/", json=login_data)
    
    if response.status_code != 200:
        print(f"❌ Échec de connexion: {response.text}")
        return
    
    token = response.json().get('access')
    print("✅ Connexion réussie")
    
    # Test d'initiation de paiement
    print("\n2. Test d'initiation de paiement")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payment_data = {
        "duration_months": 1,
        "amount": 5000,
        "description": "Test simulateur - 1 mois"
    }
    
    response = requests.post(
        "http://127.0.0.1:8000/depannage/api/cinetpay/initiate_subscription_payment/",
        json=payment_data,
        headers=headers
    )
    
    print(f"Status: {response.status_code}")
    print(f"Response: {response.text}")
    
    if response.status_code == 200:
        data = response.json()
        print("✅ Paiement initié avec succès")
        print(f"Success: {data.get('success')}")
        print(f"Payment URL: {data.get('payment_url')}")
        print(f"Transaction ID: {data.get('transaction_id')}")
        
        # Vérifier si c'est une URL simulée
        if data.get('payment_url', '').startswith('https://simulator.cinetpay.com'):
            print("🎉 SIMULATEUR DÉTECTÉ !")
        else:
            print("⚠️  URL réelle détectée")
    else:
        print(f"❌ Erreur: {response.text}")

if __name__ == "__main__":
    test_backend_cinetpay() 