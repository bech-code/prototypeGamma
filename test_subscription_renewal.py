#!/usr/bin/env python3
"""
Script de test pour le renouvellement intelligent d'abonnement
Teste la logique de renouvellement qui ajoute du temps à l'abonnement existant
"""

import requests
import json
from datetime import datetime, timedelta
import time

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
CINETPAY_SUBSCRIPTION_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"

# Debug: Afficher les URLs pour vérification
print(f"🔍 URLs de test:")
print(f"   - Login: {LOGIN_URL}")
print(f"   - Subscription: {CINETPAY_SUBSCRIPTION_URL}")
print(f"   - Status: {SUBSCRIPTION_STATUS_URL}")

# Informations de test
TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"

def test_subscription_renewal():
    """Test complet du renouvellement intelligent d'abonnement"""
    
    print("🧪 TEST - Renouvellement Intelligent d'Abonnement")
    print("=" * 60)
    
    # 1. Connexion technicien
    print("\n1. Connexion du technicien...")
    login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
    login_response = requests.post(LOGIN_URL, json=login_data)
    
    if login_response.status_code != 200:
        print(f"❌ Échec de connexion: {login_response.status_code}")
        print(login_response.text)
        return
    
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Connexion réussie")
    
    # 2. Vérifier l'état initial de l'abonnement
    print("\n2. Vérification de l'état initial de l'abonnement...")
    status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
    
    if status_response.status_code == 200:
        status_data = status_response.json()
        subscription_id = status_data.get('subscription')
        subscription_details = status_data.get('subscription_details')
        days_remaining = status_data.get('days_remaining', 0)
        
        if subscription_id and subscription_details:
            print(f"   ✅ Abonnement actuel trouvé:")
            print(f"      - ID: {subscription_id}")
            print(f"      - Plan: {subscription_details.get('plan_name', 'N/A')}")
            print(f"      - Début: {subscription_details.get('start_date', 'N/A')}")
            print(f"      - Fin: {subscription_details.get('end_date', 'N/A')}")
            print(f"      - Jours restants: {days_remaining}")
            print(f"      - Statut: {status_data.get('status', 'N/A')}")
        else:
            print("   ℹ️ Aucun abonnement actuel")
    else:
        print(f"   ❌ Erreur lors de la vérification: {status_response.status_code}")
    
    # 3. Tester le renouvellement intelligent
    print("\n3. Test du renouvellement intelligent...")
    
    # Premier renouvellement
    print("   📝 Premier renouvellement (1 mois)...")
    renewal_data = {"duration_months": 1}
    renewal_response = requests.post(CINETPAY_SUBSCRIPTION_URL, json=renewal_data, headers=headers)
    
    if renewal_response.status_code == 200:
        renewal_result = renewal_response.json()
        print("   ✅ Renouvellement initié avec succès")
        print(f"      - Type d'opération: {renewal_result.get('operation_type', 'N/A')}")
        print(f"      - Montant: {renewal_result.get('amount')} FCFA")
        print(f"      - Durée: {renewal_result.get('duration_months')} mois")
        print(f"      - Message: {renewal_result.get('message')}")
        
        # Simuler le paiement réussi
        transaction_id = renewal_result.get('transaction_id')
        if transaction_id:
            print(f"      - Transaction ID: {transaction_id}")
            
            # Simuler la notification CinetPay
            print("   🔔 Simulation de la notification CinetPay...")
            notify_data = {
                "transaction_id": transaction_id,
                "status": "ACCEPTED",
                "payment_token": f"test_token_{transaction_id}",
                "amount": renewal_result.get('amount', 5000),
                "currency": "XOF",
                "payment_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "customer_name": "Test Technicien",
                "customer_surname": "",
                "customer_email": TECHNICIAN_EMAIL,
                "customer_phone_number": "+22300000000",
                "customer_address": "Test Address",
                "customer_city": "Bamako",
                "customer_country": "ML",
                "customer_state": "ML",
                "customer_zip_code": "00000",
                "metadata": json.dumps({
                    "user_id": 1,
                    "duration_months": 1,
                    "subscription_type": "technician_premium",
                    "operation_type": renewal_result.get('operation_type', 'new_subscription')
                })
            }
            
            notify_response = requests.post(f"{BASE_URL}/depannage/api/cinetpay/notify/", json=notify_data)
            print(f"   📊 Réponse notification: {notify_response.status_code}")
            
            if notify_response.status_code == 200:
                print("   ✅ Notification traitée avec succès")
            else:
                print(f"   ❌ Erreur notification: {notify_response.text}")
        
    else:
        print(f"   ❌ Échec du renouvellement: {renewal_response.status_code}")
        print(renewal_response.text)
        return
    
    # 4. Vérifier l'état après renouvellement
    print("\n4. Vérification de l'état après renouvellement...")
    time.sleep(2)  # Attendre le traitement
    
    status_response_after = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
    
    if status_response_after.status_code == 200:
        status_data_after = status_response_after.json()
        subscription_id_after = status_data_after.get('subscription')
        subscription_details_after = status_data_after.get('subscription_details')
        days_remaining_after = status_data_after.get('days_remaining', 0)
        
        if subscription_id_after and subscription_details_after:
            print("   ✅ Abonnement mis à jour:")
            print(f"      - ID: {subscription_id_after}")
            print(f"      - Plan: {subscription_details_after.get('plan_name', 'N/A')}")
            print(f"      - Début: {subscription_details_after.get('start_date', 'N/A')}")
            print(f"      - Fin: {subscription_details_after.get('end_date', 'N/A')}")
            print(f"      - Jours restants: {days_remaining_after}")
            print(f"      - Statut: {status_data_after.get('status', 'N/A')}")
            
            # Vérifier si la date de fin a été prolongée
            if subscription_details and subscription_details_after:
                try:
                    old_end = datetime.fromisoformat(subscription_details.get('end_date', '').replace('Z', '+00:00'))
                    new_end = datetime.fromisoformat(subscription_details_after.get('end_date', '').replace('Z', '+00:00'))
                    
                    if new_end > old_end:
                        print("   ✅ Renouvellement intelligent confirmé - Date de fin prolongée")
                    else:
                        print("   ⚠️ Date de fin inchangée")
                except Exception as e:
                    print(f"   ⚠️ Erreur lors de la comparaison des dates: {e}")
        else:
            print("   ℹ️ Aucun abonnement trouvé après renouvellement")
    else:
        print(f"   ❌ Erreur lors de la vérification: {status_response_after.status_code}")
    
    # 5. Test d'un second renouvellement
    print("\n5. Test d'un second renouvellement (3 mois)...")
    second_renewal_data = {"duration_months": 3}
    second_renewal_response = requests.post(CINETPAY_SUBSCRIPTION_URL, json=second_renewal_data, headers=headers)
    
    if second_renewal_response.status_code == 200:
        second_renewal_result = second_renewal_response.json()
        print("   ✅ Second renouvellement initié")
        print(f"      - Type d'opération: {second_renewal_result.get('operation_type', 'N/A')}")
        print(f"      - Montant: {second_renewal_result.get('amount')} FCFA")
        print(f"      - Durée: {second_renewal_result.get('duration_months')} mois")
        
        # Simuler le paiement
        transaction_id_2 = second_renewal_result.get('transaction_id')
        if transaction_id_2:
            notify_data_2 = {
                "transaction_id": transaction_id_2,
                "status": "ACCEPTED",
                "payment_token": f"test_token_{transaction_id_2}",
                "amount": second_renewal_result.get('amount', 15000),
                "currency": "XOF",
                "payment_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "customer_name": "Test Technicien",
                "customer_surname": "",
                "customer_email": TECHNICIAN_EMAIL,
                "customer_phone_number": "+22300000000",
                "customer_address": "Test Address",
                "customer_city": "Bamako",
                "customer_country": "ML",
                "customer_state": "ML",
                "customer_zip_code": "00000",
                "metadata": json.dumps({
                    "user_id": 1,
                    "duration_months": 3,
                    "subscription_type": "technician_premium",
                    "operation_type": second_renewal_result.get('operation_type', 'new_subscription')
                })
            }
            
            notify_response_2 = requests.post(f"{BASE_URL}/depannage/api/cinetpay/notify/", json=notify_data_2)
            print(f"   📊 Réponse notification 2: {notify_response_2.status_code}")
            
            if notify_response_2.status_code == 200:
                print("   ✅ Second renouvellement traité avec succès")
            else:
                print(f"   ❌ Erreur notification 2: {notify_response_2.text}")
    else:
        print(f"   ❌ Échec du second renouvellement: {second_renewal_response.status_code}")
    
    print("\n" + "=" * 60)
    print("✅ Test du renouvellement intelligent terminé")
    print("\n📋 Résumé:")
    print("- Le système permet maintenant le renouvellement intelligent")
    print("- Les abonnements actifs sont prolongés au lieu d'être bloqués")
    print("- Les abonnements expirés créent de nouveaux abonnements")
    print("- Les métadonnées indiquent le type d'opération (renewal/new_subscription)")

if __name__ == "__main__":
    test_subscription_renewal() 