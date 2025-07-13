#!/usr/bin/env python3
"""
Test complet du flux d'abonnement technicien avec simulateur CinetPay
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SUBSCRIPTION_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"
NOTIFY_URL = f"{BASE_URL}/depannage/api/cinetpay/notify/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"

# Informations de test
TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"

def test_complete_subscription_flow():
    """Test complet du flux d'abonnement"""
    
    print("🔧 TEST COMPLET DU FLUX D'ABONNEMENT TECHNICIEN")
    print("=" * 60)
    
    # 1. Connexion technicien
    print("\n1️⃣ Connexion technicien...")
    login_data = {
        "email": TECHNICIAN_EMAIL,
        "password": TECHNICIAN_PASSWORD
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        if login_response.status_code != 200:
            print(f"❌ Échec de connexion: {login_response.status_code}")
            print(login_response.text)
            return False
            
        login_data = login_response.json()
        access_token = login_data.get('access')
        print("✅ Connexion réussie")
        
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # 2. Initier le paiement d'abonnement
    print("\n2️⃣ Initiation du paiement d'abonnement...")
    payment_data = {
        "duration_months": 1
    }
    
    try:
        payment_response = requests.post(SUBSCRIPTION_URL, json=payment_data, headers=headers)
        print(f"   Status: {payment_response.status_code}")
        
        if payment_response.status_code != 200:
            print(f"❌ Échec d'initiation: {payment_response.text}")
            return False
            
        payment_result = payment_response.json()
        print("✅ Paiement initié avec succès")
        print(f"   Transaction ID: {payment_result.get('transaction_id')}")
        print(f"   Montant: {payment_result.get('amount')} FCFA")
        print(f"   URL de paiement: {payment_result.get('payment_url')}")
        
        transaction_id = payment_result.get('transaction_id')
        amount = payment_result.get('amount')
        
    except Exception as e:
        print(f"❌ Erreur lors de l'initiation: {e}")
        return False
    
    # 3. Simuler la notification de paiement réussi
    print("\n3️⃣ Simulation de la notification de paiement réussi...")
    
    notification_data = {
        "transaction_id": transaction_id,
        "status": "ACCEPTED",
        "payment_token": f"test_token_{transaction_id}",
        "amount": amount,
        "currency": "XOF",
        "payment_date": datetime.now().isoformat(),
        "customer_name": "Ballo",
        "customer_surname": "Technicien",
        "customer_email": TECHNICIAN_EMAIL,
        "customer_phone_number": "+22300000000",
        "customer_address": "Bamako, Mali",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_state": "ML",
        "customer_zip_code": "00000",
        "metadata": f"user_87_subscription_1months"
    }
    
    try:
        # Pour la notification, ne pas envoyer d'en-tête d'authentification
        notify_response = requests.post(NOTIFY_URL, json=notification_data, headers={'Content-Type': 'application/json'})
        print(f"   Status: {notify_response.status_code}")
        
        if notify_response.status_code != 200:
            print(f"❌ Échec notification: {notify_response.text}")
            return False
            
        notify_result = notify_response.json()
        print("✅ Notification traitée avec succès")
        print(f"   Résultat: {notify_result}")
        
    except Exception as e:
        print(f"❌ Erreur lors de la notification: {e}")
        return False
    
    # 4. Vérifier l'activation de l'abonnement
    print("\n4️⃣ Vérification de l'activation de l'abonnement...")
    
    try:
        status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
        print(f"   Status: {status_response.status_code}")
        
        if status_response.status_code != 200:
            print(f"❌ Erreur vérification statut: {status_response.text}")
            return False
            
        status_data = status_response.json()
        print("✅ Statut d'abonnement récupéré")
        print(f"   Peut recevoir des demandes: {status_data.get('can_receive_requests')}")
        print(f"   Statut: {status_data.get('status')}")
        print(f"   Date de fin: {status_data.get('end_date')}")
        
        if status_data.get('can_receive_requests'):
            print("🎉 SUCCÈS: L'abonnement est actif !")
        else:
            print("⚠️ ATTENTION: L'abonnement n'est pas encore actif")
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification: {e}")
        return False
    
    print("\n" + "=" * 60)
    print("✅ Test complet terminé avec succès !")
    return True

if __name__ == "__main__":
    test_complete_subscription_flow() 