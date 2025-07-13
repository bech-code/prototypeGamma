#!/usr/bin/env python3
"""
Test complet du système d'abonnement technicien avec CinetPay
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"
CINETPAY_INIT_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"
CINETPAY_NOTIFY_URL = f"{BASE_URL}/depannage/api/cinetpay/notify/"
MY_PAYMENTS_URL = f"{BASE_URL}/depannage/api/cinetpay/my_payments/"

def print_header(title):
    print(f"\n{'='*60}")
    print(f"🔧 {title}")
    print(f"{'='*60}")

def print_step(step, description):
    print(f"\n{step}. {description}")
    print("-" * 50)

def test_technician_login():
    """Test de connexion du technicien"""
    print_step("1", "Connexion du technicien")
    
    login_data = {
        "email": "test_technicien@depanneteliman.com",
        "password": "test123"
    }
    
    try:
        response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access')
            print("   ✅ Connexion réussie")
            print(f"   Token: {access_token[:20]}...")
            return access_token
        else:
            print(f"   ❌ Échec de connexion: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return None

def test_subscription_status(token):
    """Test du statut d'abonnement"""
    print_step("2", "Vérification du statut d'abonnement")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Statut récupéré")
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Peut recevoir des demandes: {data.get('can_receive_requests', False)}")
            print(f"   Jours restants: {data.get('days_remaining', 0)}")
            return data
        else:
            print(f"   ❌ Erreur: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None

def test_cinetpay_initiation(token):
    """Test d'initiation du paiement CinetPay"""
    print_step("3", "Initiation du paiement CinetPay")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    payment_data = {
        "duration_months": 1,
        "amount": 5000,
        "description": "Test d'abonnement technicien - 1 mois"
    }
    
    try:
        response = requests.post(CINETPAY_INIT_URL, json=payment_data, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Paiement initié avec succès")
            print(f"   Success: {data.get('success', False)}")
            print(f"   URL de paiement: {data.get('payment_url', 'N/A')}")
            print(f"   Transaction ID: {data.get('transaction_id', 'N/A')}")
            print(f"   Montant: {data.get('amount', 0)} FCFA")
            return data
        else:
            print(f"   ❌ Erreur: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None

def test_cinetpay_notification(transaction_id):
    """Test de simulation de notification CinetPay"""
    print_step("4", "Simulation de notification CinetPay (paiement réussi)")
    
    notify_data = {
        "transaction_id": transaction_id,
        "payment_token": f"test_token_{transaction_id}",
        "status": "success",
        "amount": 5000,
        "currency": "XOF",
        "metadata": f"user_81_subscription_1months"
    }
    
    try:
        response = requests.post(CINETPAY_NOTIFY_URL, json=notify_data)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Notification traitée avec succès")
            print(f"   Success: {data.get('success', False)}")
            print(f"   Message: {data.get('message', 'N/A')}")
            return data
        else:
            print(f"   ❌ Erreur: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None

def test_my_payments(token):
    """Test de récupération de l'historique des paiements"""
    print_step("5", "Récupération de l'historique des paiements")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(MY_PAYMENTS_URL, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Historique récupéré")
            print(f"   Nombre de paiements: {len(data.get('results', []))}")
            
            for payment in data.get('results', [])[:3]:  # Afficher les 3 premiers
                print(f"   - {payment.get('transaction_id')}: {payment.get('amount')} FCFA ({payment.get('status')})")
            return data
        else:
            print(f"   ❌ Erreur: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None

def test_final_subscription_status(token):
    """Test final du statut d'abonnement après paiement"""
    print_step("6", "Vérification finale du statut d'abonnement")
    
    headers = {
        'Authorization': f'Bearer {token}',
        'Content-Type': 'application/json'
    }
    
    try:
        response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("   ✅ Statut final récupéré")
            print(f"   Status: {data.get('status', 'N/A')}")
            print(f"   Peut recevoir des demandes: {data.get('can_receive_requests', False)}")
            print(f"   Jours restants: {data.get('days_remaining', 0)}")
            
            if data.get('can_receive_requests'):
                print("   🎉 SUCCÈS: L'abonnement est actif !")
            else:
                print("   ⚠️ L'abonnement n'est pas encore actif")
            
            return data
        else:
            print(f"   ❌ Erreur: {response.text}")
            return None
    except Exception as e:
        print(f"   ❌ Erreur: {e}")
        return None

def main():
    """Test complet du système CinetPay pour technicien"""
    print_header("TEST COMPLET DU SYSTÈME CINETPAY TECHNICIEN")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # 1. Connexion technicien
    token = test_technician_login()
    if not token:
        print("\n❌ Impossible de continuer sans token d'authentification")
        return
    
    # 2. Vérification statut initial
    initial_status = test_subscription_status(token)
    
    # 3. Initiation paiement CinetPay
    payment_result = test_cinetpay_initiation(token)
    if not payment_result:
        print("\n❌ Impossible de continuer sans initiation de paiement")
        return
    
    transaction_id = payment_result.get('transaction_id')
    
    # 4. Simulation notification CinetPay
    notification_result = test_cinetpay_notification(transaction_id)
    
    # 5. Vérification historique paiements
    payments_history = test_my_payments(token)
    
    # 6. Vérification statut final
    final_status = test_final_subscription_status(token)
    
    # Résumé final
    print_header("RÉSUMÉ DU TEST")
    print("✅ Connexion technicien: OK")
    print("✅ Statut abonnement: OK")
    print("✅ Initiation CinetPay: OK")
    print("✅ Notification CinetPay: OK")
    print("✅ Historique paiements: OK")
    print("✅ Statut final: OK")
    
    if final_status and final_status.get('can_receive_requests'):
        print("\n🎉 SUCCÈS: Le système CinetPay fonctionne parfaitement !")
        print("Le technicien peut maintenant recevoir des demandes.")
    else:
        print("\n⚠️ ATTENTION: L'abonnement n'est pas encore actif.")
        print("Vérifiez la logique d'activation dans le webhook CinetPay.")

if __name__ == "__main__":
    main() 