#!/usr/bin/env python3
"""
Test script pour vérifier l'activation automatique de l'abonnement technicien
après paiement CinetPay de 5000 FCFA
"""

import requests
import json
import sys
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
CINETPAY_SUBSCRIPTION_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"
CINETPAY_NOTIFY_URL = f"{BASE_URL}/depannage/api/cinetpay/notify/"

def test_subscription_activation():
    """Test de l'activation automatique de l'abonnement après paiement"""
    
    print("🔒 Test de l'activation automatique de l'abonnement technicien")
    print("=" * 70)
    
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
    
    # 2. Vérifier le statut de l'abonnement avant paiement
    print("\n2. Vérification du statut de l'abonnement avant paiement...")
    try:
        status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
        print(f"   Status: {status_response.status_code}")
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"   ✅ Statut récupéré: {status_data.get('status')}")
            print(f"   Peut recevoir des demandes: {status_data.get('can_receive_requests')}")
            if status_data.get('subscription'):
                sub = status_data['subscription']
                print(f"   Abonnement actuel: {sub.get('plan_name')} jusqu'au {sub.get('end_date')}")
        else:
            print(f"   ❌ Erreur lors de la vérification du statut: {status_response.text}")
    except Exception as e:
        print(f"   ❌ Erreur lors de la vérification du statut: {e}")
    
    # 3. Initier le paiement CinetPay pour l'abonnement
    print("\n3. Initiation du paiement CinetPay pour l'abonnement...")
    payment_data = {
        "duration_months": 1,
        "amount": 5000,
        "description": "Test d'abonnement technicien - 1 mois"
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
            
            transaction_id = payment_result.get('transaction_id')
            
            # 4. Simuler la notification CinetPay de paiement réussi
            print("\n4. Simulation de la notification CinetPay de paiement réussi...")
            
            # Récupérer les informations du paiement depuis la base de données
            # (Dans un vrai test, on utiliserait l'API pour récupérer ces infos)
            notification_data = {
                "transaction_id": transaction_id,
                "payment_token": f"test_token_{transaction_id}",
                "amount": 5000,
                "currency": "XOF",
                "status": "ACCEPTED",
                "payment_date": datetime.now().isoformat(),
                "payment_method": "MOBILE_MONEY",
                "operator": "ORANGE_MONEY"
            }
            
            notify_response = requests.post(
                CINETPAY_NOTIFY_URL,
                json=notification_data,
                headers={'Content-Type': 'application/json'}
            )
            print(f"   Status notification: {notify_response.status_code}")
            
            if notify_response.status_code == 200:
                print("   ✅ Notification de paiement traitée avec succès")
                
                # 5. Vérifier le statut de l'abonnement après paiement
                print("\n5. Vérification du statut de l'abonnement après paiement...")
                
                # Attendre un peu pour que le traitement soit terminé
                import time
                time.sleep(2)
                
                status_response_after = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
                print(f"   Status: {status_response_after.status_code}")
                
                if status_response_after.status_code == 200:
                    status_data_after = status_response_after.json()
                    print(f"   ✅ Statut après paiement: {status_data_after.get('status')}")
                    print(f"   Peut recevoir des demandes: {status_data_after.get('can_receive_requests')}")
                    
                    if status_data_after.get('subscription'):
                        sub_after = status_data_after['subscription']
                        print(f"   Nouvel abonnement: {sub_after.get('plan_name')} jusqu'au {sub_after.get('end_date')}")
                        
                        # Vérifier que l'abonnement est actif
                        if status_data_after.get('can_receive_requests'):
                            print("   🎉 SUCCÈS: Le technicien peut maintenant recevoir des demandes!")
                        else:
                            print("   ❌ ÉCHEC: Le technicien ne peut toujours pas recevoir de demandes")
                    else:
                        print("   ❌ ÉCHEC: Aucun abonnement trouvé après paiement")
                else:
                    print(f"   ❌ Erreur lors de la vérification du statut après paiement: {status_response_after.text}")
            else:
                print(f"   ❌ Erreur lors du traitement de la notification: {notify_response.text}")
        else:
            print(f"   ❌ Échec de l'initiation du paiement: {payment_response.text}")
            return
    except Exception as e:
        print(f"   ❌ Erreur lors de l'initiation du paiement: {e}")
        return
    
    print("\n" + "=" * 70)
    print("✅ Test de l'activation automatique de l'abonnement terminé")
    print("\n📋 Résumé:")
    print("   - Le technicien paie 5000 FCFA via CinetPay")
    print("   - La notification de paiement est traitée automatiquement")
    print("   - L'abonnement est activé/prolongé automatiquement")
    print("   - Le technicien peut maintenant recevoir des demandes de clients")

if __name__ == "__main__":
    test_subscription_activation() 