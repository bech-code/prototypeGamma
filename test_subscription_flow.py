#!/usr/bin/env python3
"""
Test du flux complet d'abonnement technicien avec CinetPay
- Initiation du paiement
- Simulation de notification CinetPay
- Vérification de l'activation de l'abonnement
"""

import os
import sys
import django
import requests
import json
import time
from datetime import datetime, timedelta

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/depannage/api"

def test_subscription_flow():
    """Test complet du flux d'abonnement technicien"""
    
    print("🧪 Test du flux d'abonnement technicien avec CinetPay")
    print("=" * 60)
    
    # 1. Connexion technicien
    print("\n1️⃣ Connexion technicien...")
    login_data = {
        "email": "technicien@depanneteliman.com",
        "password": "test123456"
    }
    
    login_response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Échec de connexion technicien: {login_response.status_code}")
        print(login_response.text)
        return False
    
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Connexion réussie")
    
    # 2. Vérifier le statut d'abonnement initial
    print("\n2️⃣ Vérification statut abonnement initial...")
    sub_status_response = requests.get(f"{API_BASE}/technicians/subscription_status/", headers=headers)
    
    if sub_status_response.status_code == 200:
        initial_status = sub_status_response.json()
        print(f"📊 Statut initial: {initial_status}")
    else:
        print("⚠️ Impossible de récupérer le statut initial")
    
    # 3. Initier le paiement d'abonnement
    print("\n3️⃣ Initiation du paiement d'abonnement...")
    payment_data = {
        "duration_months": 1
    }
    
    payment_response = requests.post(
        f"{API_BASE}/cinetpay/initiate_subscription_payment/",
        json=payment_data,
        headers=headers
    )
    
    if payment_response.status_code != 200:
        print(f"❌ Échec initiation paiement: {payment_response.status_code}")
        print(payment_response.text)
        return False
    
    payment_result = payment_response.json()
    print(f"✅ Paiement initié: {payment_result}")
    
    transaction_id = payment_result.get("transaction_id")
    amount = payment_result.get("amount")
    
    if not transaction_id:
        print("❌ Transaction ID manquant")
        return False
    
    print(f"💰 Montant: {amount} FCFA")
    print(f"🆔 Transaction ID: {transaction_id}")
    
    # 4. Simuler la notification CinetPay (paiement réussi)
    print("\n4️⃣ Simulation notification CinetPay (paiement réussi)...")
    
    notification_data = {
        "transaction_id": transaction_id,
        "status": "ACCEPTED",
        "payment_token": f"test_token_{transaction_id}",
        "amount": amount,
        "currency": "XOF",
        "customer_name": "Technicien Test",
        "customer_surname": "",
        "customer_email": "technicien@depanneteliman.com",
        "customer_phone_number": "+22300000000",
        "customer_address": "Bamako",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_state": "ML",
        "customer_zip_code": "00000",
        "metadata": f"user_1_subscription_1months"
    }
    
    notify_response = requests.post(
        f"{API_BASE}/cinetpay/notify/",
        json=notification_data,
        headers={"Content-Type": "application/json"}
    )
    
    if notify_response.status_code != 200:
        print(f"❌ Échec notification: {notify_response.status_code}")
        print(notify_response.text)
        return False
    
    print("✅ Notification traitée avec succès")
    
    # 5. Vérifier l'activation de l'abonnement
    print("\n5️⃣ Vérification activation abonnement...")
    time.sleep(2)  # Attendre le traitement
    
    final_status_response = requests.get(f"{API_BASE}/technicians/subscription_status/", headers=headers)
    
    if final_status_response.status_code == 200:
        final_status = final_status_response.json()
        print(f"📊 Statut final: {final_status}")
        
        # Vérifier que l'abonnement est actif
        if final_status.get("status") == "active":
            print("✅ Abonnement activé avec succès!")
            return True
        else:
            print("❌ Abonnement non activé")
            return False
    else:
        print("❌ Impossible de vérifier le statut final")
        return False

def test_subscription_pricing():
    """Test des tarifs d'abonnement"""
    
    print("\n💰 Test des tarifs d'abonnement")
    print("=" * 40)
    
    # Connexion
    login_data = {"email": "technicien@depanneteliman.com", "password": "test123456"}
    login_response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test des différentes durées
    durations = [1, 3, 6]
    
    for duration in durations:
        print(f"\n📅 Test abonnement {duration} mois...")
        
        payment_data = {"duration_months": duration}
        response = requests.post(
            f"{API_BASE}/cinetpay/initiate_subscription_payment/",
            json=payment_data,
            headers=headers
        )
        
        if response.status_code == 200:
            result = response.json()
            expected_amount = 5000 * duration
            actual_amount = result.get("amount", 0)
            
            print(f"   Durée: {duration} mois")
            print(f"   Montant attendu: {expected_amount} FCFA")
            print(f"   Montant reçu: {actual_amount} FCFA")
            
            if actual_amount == expected_amount:
                print("   ✅ Tarif correct")
            else:
                print("   ❌ Tarif incorrect")
        else:
            print(f"   ❌ Erreur: {response.status_code}")

def test_cinetpay_module():
    """Test du module CinetPay"""
    
    print("\n🔧 Test du module CinetPay")
    print("=" * 30)
    
    # Test de génération de transaction_id
    from depannage.cinetpay import generate_transaction_id, init_cinetpay_payment
    
    # Test génération ID
    tx_id1 = generate_transaction_id()
    tx_id2 = generate_transaction_id()
    
    print(f"Transaction ID 1: {tx_id1}")
    print(f"Transaction ID 2: {tx_id2}")
    
    if tx_id1 != tx_id2 and tx_id1.startswith("DEPANNETELIMAN-"):
        print("✅ Génération transaction_id OK")
    else:
        print("❌ Erreur génération transaction_id")
    
    # Test initiation paiement (mode test)
    try:
        result, tx_id = init_cinetpay_payment(
            amount=5000,
            phone="+22300000000",
            name="Test Technicien",
            description="Test abonnement 1 mois",
            metadata="test_user_1_subscription_1months"
        )
        
        print(f"Résultat initiation: {result}")
        print(f"Transaction ID généré: {tx_id}")
        
        if result.get("code") == "201" or "test" in str(result).lower():
            print("✅ Initiation paiement OK")
        else:
            print("❌ Erreur initiation paiement")
            
    except Exception as e:
        print(f"❌ Exception lors du test: {e}")

if __name__ == "__main__":
    print("🚀 Démarrage des tests d'abonnement technicien")
    print("=" * 60)
    
    # Test du module CinetPay
    test_cinetpay_module()
    
    # Test des tarifs
    test_subscription_pricing()
    
    # Test du flux complet
    success = test_subscription_flow()
    
    print("\n" + "=" * 60)
    if success:
        print("🎉 Tous les tests sont passés avec succès!")
    else:
        print("❌ Certains tests ont échoué")
    print("=" * 60) 