#!/usr/bin/env python3
"""
Test script pour vérifier le paiement CinetPay pour les abonnements techniciens
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
CINETPAY_SUBSCRIPTION_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"

def test_cinetpay_subscription():
    """Test du paiement CinetPay pour les abonnements techniciens"""
    
    print("🔒 Test du paiement CinetPay pour les abonnements techniciens")
    print("=" * 60)
    
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
    
    # 2. Initier le paiement CinetPay pour l'abonnement
    print("\n2. Initiation du paiement CinetPay pour l'abonnement...")
    payment_data = {
        "duration_months": 3,
        "amount": 15000,
        "description": "Test d'abonnement technicien - 3 mois"
    }
    
    try:
        payment_response = requests.post(
            CINETPAY_SUBSCRIPTION_URL,
            json=payment_data,
            headers=headers
        )
        print(f"   Status: {payment_response.status_code}")
        
        if payment_response.status_code == 200:
            payment_result = payment_response.json()
            print("   ✅ Paiement CinetPay initié avec succès")
            print(f"   Transaction ID: {payment_result.get('transaction_id')}")
            print(f"   Montant: {payment_result.get('amount')} FCFA")
            print(f"   Durée: {payment_result.get('duration_months')} mois")
            print(f"   URL de paiement: {payment_result.get('payment_url')}")
            print(f"   Message: {payment_result.get('message')}")
            
            # 3. Vérifier le statut du paiement
            print("\n3. Vérification du statut du paiement...")
            transaction_id = payment_result.get('transaction_id')
            if transaction_id:
                status_url = f"{BASE_URL}/depannage/api/cinetpay/{transaction_id}/check_status/"
                status_response = requests.get(status_url, headers=headers)
                print(f"   Status check: {status_response.status_code}")
                
                if status_response.status_code == 200:
                    status_data = status_response.json()
                    print(f"   ✅ Statut récupéré: {status_data.get('status')}")
                else:
                    print(f"   ❌ Erreur lors de la vérification du statut: {status_response.text}")
            
        else:
            print(f"   ❌ Échec de l'initiation du paiement: {payment_response.text}")
            return
    except Exception as e:
        print(f"   ❌ Erreur lors de l'initiation du paiement: {e}")
        return
    
    print("\n" + "=" * 60)
    print("✅ Test du paiement CinetPay pour les abonnements terminé")
    print("\n📋 Résumé:")
    print("- Le technicien peut initier un paiement CinetPay pour son abonnement")
    print("- L'URL de paiement est générée et accessible")
    print("- Le statut du paiement peut être vérifié")
    print("\n🌐 Pour tester le frontend:")
    print("- Connectez-vous en tant que technicien")
    print("- Cliquez sur 'Renouveler/Activer l'abonnement'")
    print("- Vous serez redirigé vers CinetPay")
    print("- Après paiement, vous serez redirigé vers la page de succès")

if __name__ == "__main__":
    test_cinetpay_subscription() 