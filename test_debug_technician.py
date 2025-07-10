#!/usr/bin/env python3
"""
Script de debug pour tester la détection du technicien
"""

import requests
import json

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
CINETPAY_SUBSCRIPTION_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"

def test_debug_technician():
    print("🔍 Debug de la détection du technicien")
    print("=" * 50)
    # 1. Connexion technicien
    print("\n1. Connexion technicien...")
    login_data = {
        "email": "technicien@depanneteliman.com",
        "password": "technicien123"
    }
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status: {login_response.status_code}")
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access')
            print("   ✅ Connexion réussie")
            print(f"   Token: {access_token[:50]}...")
        else:
            print(f"   ❌ Échec de connexion: {login_response.text}")
            return
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    # 2. Test direct de l'endpoint avec debug
    print("\n2. Test direct de l'endpoint...")
    payment_data = {
        "duration_months": 1,
        "amount": 5000,
        "description": "Test debug"
    }
    try:
        print(f"   URL: {CINETPAY_SUBSCRIPTION_URL}")
        print(f"   Headers: {headers}")
        print(f"   Data: {payment_data}")
        payment_response = requests.post(
            CINETPAY_SUBSCRIPTION_URL,
            json=payment_data,
            headers=headers
        )
        print(f"   Status: {payment_response.status_code}")
        print(f"   Response: {payment_response.text}")
    except Exception as e:
        print(f"   ❌ Erreur lors de la requête: {e}")

if __name__ == "__main__":
    test_debug_technician() 