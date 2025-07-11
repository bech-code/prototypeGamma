#!/usr/bin/env python3
"""
Test direct de l'API CinetPay pour diagnostiquer l'erreur MINIMUM_REQUIRED_FIELDS
"""

import requests
import json
import uuid

# Configuration de test
API_KEY = "test_api_key_123456789"
SITE_ID = "test_site_id_123456789"
API_URL = "https://api-checkout.cinetpay.com/v2/payment"

def test_cinetpay_minimal():
    """Test avec le minimum de champs requis"""
    
    transaction_id = f"TEST-{uuid.uuid4().hex[:10]}"
    
    # Payload minimal selon la documentation CinetPay
    data = {
        "apikey": API_KEY,
        "site_id": SITE_ID,
        "transaction_id": transaction_id,
        "amount": 100,
        "currency": "XOF",
        "description": "Test paiement technicien",
        "customer_name": "Test User",
        "customer_surname": "User",
        "customer_email": "test@example.com",
        "customer_phone_number": "22312345678",
        "customer_address": "Bamako, Mali",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_zip_code": "1000",
        "notify_url": "http://localhost:8000/depannage/api/cinetpay/notify/",
        "return_url": "http://localhost:5173/payment/success",
        "channels": "ALL",
        "lang": "fr"
    }
    
    headers = {
        "Content-Type": "application/json"
    }
    
    print("🔧 TEST DIRECT CINETPAY")
    print("=" * 50)
    print(f"URL: {API_URL}")
    print(f"Transaction ID: {transaction_id}")
    print("\n📤 PAYLOAD ENVOYÉ:")
    print(json.dumps(data, indent=2))
    
    try:
        response = requests.post(API_URL, json=data, headers=headers, timeout=30)
        
        print(f"\n📥 RÉPONSE CINETPAY:")
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Body: {response.text}")
        
        if response.status_code == 200:
            response_data = response.json()
            print(f"\n✅ RÉPONSE JSON: {json.dumps(response_data, indent=2)}")
        else:
            print(f"\n❌ ERREUR HTTP: {response.status_code}")
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de requête: {e}")

def test_cinetpay_with_real_keys():
    """Test avec des clés réelles (si disponibles)"""
    
    # Essayer de charger depuis .env
    import os
    from dotenv import load_dotenv
    
    load_dotenv()
    
    real_api_key = os.getenv('CINETPAY_REAL_API_KEY')
    real_site_id = os.getenv('CINETPAY_REAL_SITE_ID')
    
    if real_api_key and real_site_id:
        print("\n🔧 TEST AVEC CLÉS RÉELLES")
        print("=" * 50)
        
        transaction_id = f"REAL-{uuid.uuid4().hex[:10]}"
        
        data = {
            "apikey": real_api_key,
            "site_id": real_site_id,
            "transaction_id": transaction_id,
            "amount": 100,
            "currency": "XOF",
            "description": "Test paiement technicien",
            "customer_name": "Test User",
            "customer_surname": "User",
            "customer_email": "test@example.com",
            "customer_phone_number": "22312345678",
            "customer_address": "Bamako, Mali",
            "customer_city": "Bamako",
            "customer_country": "ML",
            "customer_zip_code": "1000",
            "notify_url": "http://localhost:8000/depannage/api/cinetpay/notify/",
            "return_url": "http://localhost:5173/payment/success",
            "channels": "ALL",
            "lang": "fr"
        }
        
        headers = {
            "Content-Type": "application/json"
        }
        
        try:
            response = requests.post(API_URL, json=data, headers=headers, timeout=30)
            print(f"Status: {response.status_code}")
            print(f"Body: {response.text}")
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur: {e}")
    else:
        print("\n⚠️  Aucune clé réelle trouvée dans .env")
        print("   Ajoutez CINETPAY_REAL_API_KEY et CINETPAY_REAL_SITE_ID pour tester avec de vraies clés")

if __name__ == "__main__":
    test_cinetpay_minimal()
    test_cinetpay_with_real_keys() 