#!/usr/bin/env python3
"""
Script pour simuler un paiement réel CinetPay pour un technicien et vérifier l'activation de l'abonnement.
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
from depannage.models import Technician, TechnicianSubscription

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
CINETPAY_SUBSCRIPTION_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"
CINETPAY_NOTIFY_URL = f"{BASE_URL}/depannage/api/cinetpay/notify/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"

TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"


def simulate_payment():
    print(f"\n🔄 Simulation d'un paiement réel pour le technicien : {TECHNICIAN_EMAIL}")
    # 1. Connexion technicien
    login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
    login_response = requests.post(LOGIN_URL, json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Échec de connexion technicien: {login_response.status_code}")
        print(login_response.text)
        return
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Connexion réussie")

    # 2. Initier le paiement d'abonnement
    payment_data = {"duration_months": 1}
    payment_response = requests.post(CINETPAY_SUBSCRIPTION_URL, json=payment_data, headers=headers)
    if payment_response.status_code != 200:
        print(f"❌ Échec d'initiation du paiement: {payment_response.status_code}")
        print(payment_response.text)
        return
    payment_info = payment_response.json()
    transaction_id = payment_info.get("transaction_id")
    print(f"✅ Paiement initié, transaction_id: {transaction_id}")

    # 3. Simuler la notification CinetPay
    notify_data = {
        "transaction_id": transaction_id,
        "status": "ACCEPTED",
        "payment_token": f"test_token_{transaction_id}",
        "amount": payment_info.get("amount", 5000),
        "currency": "XOF",
        "payment_date": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "customer_name": "ballo",
        "customer_surname": "",
        "customer_email": TECHNICIAN_EMAIL,
        "customer_phone_number": "+22300000000",
        "customer_address": "Test Address",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_state": "ML",
        "customer_zip_code": "00000",
        "metadata": payment_info.get("metadata", f"user_{User.objects.get(email=TECHNICIAN_EMAIL).id}_subscription_1months")
    }
    notify_response = requests.post(CINETPAY_NOTIFY_URL, json=notify_data)
    if notify_response.status_code == 200:
        print("✅ Notification CinetPay simulée avec succès")
    else:
        print(f"❌ Erreur notification: {notify_response.status_code}")
        print(notify_response.text)
        return

    # 4. Vérifier le statut d'abonnement
    status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
    if status_response.status_code == 200:
        data = status_response.json()
        print(f"\n📊 Statut d'abonnement après paiement : {data.get('status')}")
        print(f"Peut recevoir des demandes : {data.get('can_receive_requests')}")
        print(f"Jours restants : {data.get('days_remaining')}")
        print(f"ID abonnement : {data.get('subscription')}")
        if data.get('can_receive_requests'):
            print("🎉 SUCCÈS : Le technicien peut maintenant accéder à son dashboard et recevoir des demandes !")
        else:
            print("❌ ÉCHEC : Le technicien ne peut toujours pas recevoir de demandes")
    else:
        print(f"❌ Erreur lors de la vérification du statut d'abonnement: {status_response.status_code}")
        print(status_response.text)

if __name__ == "__main__":
    simulate_payment() 