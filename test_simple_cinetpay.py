#!/usr/bin/env python3
"""
Test simple du système CinetPay
"""

import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"

def test_login():
    """Test de connexion avec différents utilisateurs"""
    print("🔧 Test de connexion avec différents utilisateurs")
    print("=" * 50)
    
    # Liste d'utilisateurs à tester
    users = [
        {"email": "admin@depanneteliman.com", "password": "admin123"},
        {"email": "technicien@depanneteliman.com", "password": "technicien123"},
        {"email": "client@depanneteliman.com", "password": "client123"},
        {"email": "test@example.com", "password": "test123"},
    ]
    
    for i, user in enumerate(users, 1):
        print(f"\n{i}. Test avec {user['email']}")
        print("-" * 30)
        
        try:
            response = requests.post(f"{BASE_URL}/users/login/", json=user)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                access_token = data.get('access')
                print("   ✅ Connexion réussie")
                print(f"   Token: {access_token[:20]}...")
                
                # Test du statut d'abonnement
                headers = {'Authorization': f'Bearer {access_token}'}
                status_response = requests.get(f"{BASE_URL}/depannage/api/technicians/subscription_status/", headers=headers)
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"   Status abonnement: {status_data.get('status', 'N/A')}")
                    print(f"   Peut recevoir des demandes: {status_data.get('can_receive_requests', False)}")
                else:
                    print(f"   ❌ Erreur statut: {status_response.status_code}")
                
                return access_token
            else:
                print(f"   ❌ Échec: {response.text}")
        except Exception as e:
            print(f"   ❌ Erreur: {e}")
    
    return None

def test_cinetpay_endpoints(token):
    """Test des endpoints CinetPay"""
    if not token:
        print("\n❌ Impossible de tester sans token")
        return
    
    print("\n🔧 Test des endpoints CinetPay")
    print("=" * 50)
    
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test 1: Statut d'abonnement
    print("\n1. Test statut d'abonnement")
    try:
        response = requests.get(f"{BASE_URL}/depannage/api/technicians/subscription_status/", headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ {data}")
        else:
            print(f"   ❌ {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    # Test 2: Initiation paiement
    print("\n2. Test initiation paiement")
    payment_data = {
        "duration_months": 1,
        "amount": 5000,
        "description": "Test abonnement"
    }
    try:
        response = requests.post(f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/", 
                               json=payment_data, headers=headers)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ {data}")
            return data.get('transaction_id')
        else:
            print(f"   ❌ {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
    
    return None

def test_notification(transaction_id):
    """Test de notification CinetPay"""
    if not transaction_id:
        print("\n❌ Impossible de tester sans transaction_id")
        return
    
    print(f"\n3. Test notification CinetPay pour {transaction_id}")
    print("-" * 50)
    
    notify_data = {
        "transaction_id": transaction_id,
        "payment_token": f"test_token_{transaction_id}",
        "status": "success",
        "amount": 5000,
        "currency": "XOF",
        "metadata": "user_test_subscription_1months"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/depannage/api/cinetpay/notify/", json=notify_data)
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            print(f"   ✅ {data}")
        else:
            print(f"   ❌ {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur: {e}")

def main():
    """Test principal"""
    print("🔧 TEST SIMPLE DU SYSTÈME CINETPAY")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Test de connexion
    token = test_login()
    
    if token:
        # Test des endpoints
        transaction_id = test_cinetpay_endpoints(token)
        
        # Test de notification
        test_notification(transaction_id)
        
        print("\n✅ Test terminé avec succès")
    else:
        print("\n❌ Aucun utilisateur valide trouvé")

if __name__ == "__main__":
    main() 