#!/usr/bin/env python3
"""
Test simple pour vérifier la logique de déduplication des paiements.
"""

import os
import sys
import django
import requests
import json
from datetime import datetime, timedelta

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, TechnicianSubscription, CinetPayPayment
from django.utils import timezone

BASE_URL = "http://127.0.0.1:8000"
NOTIFY_URL = f"{BASE_URL}/depannage/api/cinetpay/notify/"

TECHNICIAN_EMAIL = "ballo@gmail.com"


def test_simple_deduplication():
    print(f"\n🔄 Test simple de déduplication pour : {TECHNICIAN_EMAIL}")
    
    # 1. Vérifier l'état initial
    user = User.objects.get(email=TECHNICIAN_EMAIL)
    technician = Technician.objects.get(user=user)
    
    initial_subscriptions = TechnicianSubscription.objects.filter(
        technician=technician,
        end_date__gt=timezone.now()
    ).count()
    initial_payments = CinetPayPayment.objects.filter(user=user).count()
    
    print(f"📊 État initial: {initial_subscriptions} abonnements, {initial_payments} paiements")
    
    # 2. Simuler un paiement
    transaction_id = f"TEST_SIMPLE_{timezone.now().strftime('%Y%m%d_%H%M%S')}"
    
    payment_data = {
        "transaction_id": transaction_id,
        "status": "ACCEPTED",
        "payment_token": f"token_{transaction_id}",
        "amount": 5000,
        "currency": "XOF",
        "payment_date": datetime.now().isoformat(),
        "customer_name": "ballo",
        "customer_surname": "",
        "customer_email": TECHNICIAN_EMAIL,
        "customer_phone_number": "+22300000000",
        "customer_address": "Test Address",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_state": "ML",
        "customer_zip_code": "00000",
        "metadata": f"user_{user.id}_subscription_1months"
    }
    
    print(f"\n💰 Test: Paiement {transaction_id}")
    response = requests.post(NOTIFY_URL, json=payment_data)
    print(f"   Statut: {response.status_code}")
    print(f"   Réponse: {response.text[:200]}...")
    
    # 3. Vérifier si le paiement a été créé
    try:
        payment = CinetPayPayment.objects.get(transaction_id=transaction_id)
        print(f"   ✅ Paiement créé: {payment.status}")
    except CinetPayPayment.DoesNotExist:
        print("   ❌ Paiement non créé")
        return
    
    # 4. Vérifier si un abonnement a été créé
    try:
        subscription = TechnicianSubscription.objects.get(payment=payment)
        print(f"   ✅ Abonnement créé: {subscription.plan_name}")
    except TechnicianSubscription.DoesNotExist:
        print("   ❌ Abonnement non créé")
    
    # 5. Simuler le même paiement une deuxième fois
    print(f"\n🔄 Test: Même paiement {transaction_id} (déduplication)")
    response_2 = requests.post(NOTIFY_URL, json=payment_data)
    print(f"   Statut: {response_2.status_code}")
    print(f"   Réponse: {response_2.text[:200]}...")
    
    # 6. Vérifier l'état final
    final_subscriptions = TechnicianSubscription.objects.filter(
        technician=technician,
        end_date__gt=timezone.now()
    ).count()
    final_payments = CinetPayPayment.objects.filter(user=user).count()
    
    print(f"\n📊 État final: {final_subscriptions} abonnements, {final_payments} paiements")
    
    # 7. Vérifier qu'il n'y a qu'un seul abonnement pour ce paiement
    subscriptions_for_payment = TechnicianSubscription.objects.filter(payment=payment).count()
    print(f"   Abonnements pour ce paiement: {subscriptions_for_payment}")
    
    if subscriptions_for_payment == 1:
        print("   ✅ Déduplication fonctionne: un seul abonnement créé")
    else:
        print(f"   ❌ Problème de déduplication: {subscriptions_for_payment} abonnements créés")


if __name__ == "__main__":
    test_simple_deduplication() 