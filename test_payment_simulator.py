#!/usr/bin/env python3
"""
Script pour tester le système de paiement CinetPay en mode simulateur.
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, TechnicianSubscription, CinetPayPayment
from django.utils import timezone

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SUBSCRIPTION_PAYMENT_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"
NOTIFY_URL = f"{BASE_URL}/depannage/api/cinetpay/notify/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"

TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"


def test_payment_simulation():
    """Test complet du système de paiement en mode simulateur."""
    print("\n🧪 TEST DU SYSTÈME DE PAIEMENT CINETPAY (MODE SIMULATEUR)")
    print("=" * 70)
    
    # 1. Connexion technicien
    print("\n1️⃣ Connexion du technicien...")
    login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
    login_response = requests.post(LOGIN_URL, json=login_data)
    
    if login_response.status_code != 200:
        print(f"❌ Échec de connexion: {login_response.status_code}")
        print(login_response.text)
        return
    
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Connexion réussie")

    # 2. Vérifier le statut d'abonnement actuel
    print("\n2️⃣ Vérification du statut d'abonnement actuel...")
    status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
    
    if status_response.status_code == 200:
        status_data = status_response.json()
        print(f"📊 Statut actuel: {status_data}")
    else:
        print(f"⚠️ Erreur lors de la vérification du statut: {status_response.status_code}")

    # 3. Initier un paiement d'abonnement
    print("\n3️⃣ Initiation d'un paiement d'abonnement...")
    payment_data = {
        "duration_months": 1,
        "amount": 5000,
        "description": "Test d'abonnement technicien"
    }
    
    payment_response = requests.post(SUBSCRIPTION_PAYMENT_URL, json=payment_data, headers=headers)
    
    if payment_response.status_code != 200:
        print(f"❌ Échec d'initiation du paiement: {payment_response.status_code}")
        print(payment_response.text)
        return
    
    payment_info = payment_response.json()
    transaction_id = payment_info.get("transaction_id")
    payment_url = payment_info.get("payment_url")
    
    print(f"✅ Paiement initié avec succès")
    print(f"   Transaction ID: {transaction_id}")
    print(f"   URL de paiement: {payment_url}")

    # 4. Simuler la notification CinetPay (webhook)
    print("\n4️⃣ Simulation de la notification CinetPay...")
    notify_data = {
        "transaction_id": transaction_id,
        "status": "ACCEPTED",
        "payment_token": f"test_token_{transaction_id}",
        "amount": 5000,
        "currency": "XOF",
        "payment_date": datetime.now().isoformat(),
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
            "user_id": User.objects.get(email=TECHNICIAN_EMAIL).id,
            "duration_months": 1,
            "subscription_type": "technician_premium"
        })
    }
    
    notify_response = requests.post(NOTIFY_URL, json=notify_data)
    
    if notify_response.status_code == 200:
        print("✅ Notification simulée avec succès")
        print(f"   Réponse: {notify_response.json()}")
    else:
        print(f"❌ Erreur lors de la simulation: {notify_response.status_code}")
        print(notify_response.text)

    # 5. Vérifier le nouveau statut d'abonnement
    print("\n5️⃣ Vérification du nouveau statut d'abonnement...")
    status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
    
    if status_response.status_code == 200:
        status_data = status_response.json()
        print(f"📊 Nouveau statut: {status_data}")
        
        if status_data.get("can_receive_requests"):
            print("✅ Abonnement activé avec succès !")
        else:
            print("❌ Abonnement non activé")
    else:
        print(f"⚠️ Erreur lors de la vérification finale: {status_response.status_code}")

    # 6. Vérifier en base de données
    print("\n6️⃣ Vérification en base de données...")
    try:
        user = User.objects.get(email=TECHNICIAN_EMAIL)
        technician = getattr(user, 'technician_depannage', None) or getattr(user, 'technician_profile', None)
        
        if technician:
            active_subscriptions = TechnicianSubscription.objects.filter(
                technician=technician,
                end_date__gt=timezone.now(),
                is_active=True
            )
            
            print(f"📊 Abonnements actifs en base: {active_subscriptions.count()}")
            for sub in active_subscriptions:
                print(f"   - Plan: {sub.plan_name}")
                print(f"   - Expire le: {sub.end_date}")
                print(f"   - Paiement: {sub.payment.transaction_id if sub.payment else 'Aucun'}")
        else:
            print("❌ Aucun profil technicien trouvé")
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification en base: {e}")


def test_double_payment_prevention():
    """Test de la prévention des doubles paiements."""
    print("\n🧪 TEST DE PRÉVENTION DES DOUBLES PAIEMENTS")
    print("=" * 50)
    
    # Connexion
    login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
    login_response = requests.post(LOGIN_URL, json=login_data)
    
    if login_response.status_code != 200:
        print("❌ Échec de connexion")
        return
    
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Tentative de double paiement
    payment_data = {"duration_months": 1}
    payment_response = requests.post(SUBSCRIPTION_PAYMENT_URL, json=payment_data, headers=headers)
    
    if payment_response.status_code == 400:
        error_data = payment_response.json()
        print("✅ Prévention des doubles paiements active")
        print(f"   Message: {error_data.get('error', 'Erreur inconnue')}")
    else:
        print("❌ La prévention des doubles paiements ne fonctionne pas")
        print(f"   Status: {payment_response.status_code}")
        print(f"   Réponse: {payment_response.text}")


def cleanup_test_data():
    """Nettoie les données de test."""
    print("\n🧹 NETTOYAGE DES DONNÉES DE TEST")
    print("=" * 40)
    
    try:
        # Supprimer les paiements de test
        test_payments = CinetPayPayment.objects.filter(
            transaction_id__startswith="TXN-"
        )
        deleted_payments = test_payments.count()
        test_payments.delete()
        print(f"✅ {deleted_payments} paiements de test supprimés")
        
        # Supprimer les abonnements de test
        test_subscriptions = TechnicianSubscription.objects.filter(
            plan_name__contains="Test"
        )
        deleted_subscriptions = test_subscriptions.count()
        test_subscriptions.delete()
        print(f"✅ {deleted_subscriptions} abonnements de test supprimés")
        
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage: {e}")


if __name__ == "__main__":
    print("🚀 Démarrage des tests de paiement CinetPay")
    
    # Test principal
    test_payment_simulation()
    
    # Test de prévention des doubles paiements
    test_double_payment_prevention()
    
    # Nettoyage (optionnel)
    # cleanup_test_data()
    
    print("\n✅ Tests terminés !") 