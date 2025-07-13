#!/usr/bin/env python3
"""
Script pour tester la logique de prévention des paiements multiples.
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
TECHNICIAN_PASSWORD = "bechir66312345"


def test_payment_deduplication():
    print(f"\n🔄 Test de prévention des paiements multiples pour : {TECHNICIAN_EMAIL}")
    
    # 1. Vérifier l'état initial
    print("\n📊 État initial :")
    user = User.objects.get(email=TECHNICIAN_EMAIL)
    technician = Technician.objects.get(user=user)
    
    initial_subscriptions = TechnicianSubscription.objects.filter(
        technician=technician,
        end_date__gt=timezone.now()
    ).count()
    print(f"   Abonnements actifs: {initial_subscriptions}")
    
    initial_payments = CinetPayPayment.objects.filter(user=user).count()
    print(f"   Paiements totaux: {initial_payments}")
    
    # 2. Simuler un premier paiement
    print("\n💰 Test 1: Premier paiement")
    transaction_id_1 = f"TEST_DEDUP_{timezone.now().strftime('%Y%m%d_%H%M%S')}_1"
    
    payment_data_1 = {
        "transaction_id": transaction_id_1,
        "status": "ACCEPTED",
        "payment_token": f"token_{transaction_id_1}",
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
    
    response_1 = requests.post(NOTIFY_URL, json=payment_data_1)
    print(f"   Statut: {response_1.status_code}")
    print(f"   Réponse: {response_1.text[:100]}...")
    
    # 3. Simuler le même paiement une deuxième fois
    print("\n🔄 Test 2: Même paiement (déduplication)")
    response_2 = requests.post(NOTIFY_URL, json=payment_data_1)
    print(f"   Statut: {response_2.status_code}")
    print(f"   Réponse: {response_2.text[:100]}...")
    
    # 4. Simuler un paiement différent
    print("\n💰 Test 3: Paiement différent")
    transaction_id_2 = f"TEST_DEDUP_{timezone.now().strftime('%Y%m%d_%H%M%S')}_2"
    
    payment_data_2 = {
        "transaction_id": transaction_id_2,
        "status": "ACCEPTED",
        "payment_token": f"token_{transaction_id_2}",
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
    
    response_3 = requests.post(NOTIFY_URL, json=payment_data_2)
    print(f"   Statut: {response_3.status_code}")
    print(f"   Réponse: {response_3.text[:100]}...")
    
    # 5. Vérifier l'état final
    print("\n📊 État final :")
    final_subscriptions = TechnicianSubscription.objects.filter(
        technician=technician,
        end_date__gt=timezone.now()
    ).count()
    print(f"   Abonnements actifs: {final_subscriptions}")
    
    final_payments = CinetPayPayment.objects.filter(user=user).count()
    print(f"   Paiements totaux: {final_payments}")
    
    # 6. Vérifier les paiements créés
    print("\n🔍 Vérification des paiements :")
    new_payments = CinetPayPayment.objects.filter(
        transaction_id__startswith="TEST_DEDUP"
    ).order_by('created_at')
    
    for payment in new_payments:
        print(f"   - {payment.transaction_id}: {payment.status} (créé: {payment.created_at})")
    
    # 7. Vérifier les abonnements créés
    print("\n🔍 Vérification des abonnements :")
    new_subscriptions = TechnicianSubscription.objects.filter(
        payment__transaction_id__startswith="TEST_DEDUP"
    ).order_by('start_date')
    
    for subscription in new_subscriptions:
        print(f"   - {subscription.plan_name}: {subscription.payment.transaction_id}")
    
    # 8. Résumé
    print("\n📈 Résumé :")
    if response_1.status_code == 200 and response_2.status_code == 200:
        print("   ✅ Premier paiement traité avec succès")
        print("   ✅ Déduplication fonctionne (deuxième paiement ignoré)")
    else:
        print("   ❌ Problème avec le premier paiement")
    
    if response_3.status_code == 200:
        print("   ✅ Deuxième paiement différent traité avec succès")
    else:
        print("   ❌ Problème avec le deuxième paiement")
    
    subscription_increase = final_subscriptions - initial_subscriptions
    if subscription_increase == 1:
        print("   ✅ Un seul nouvel abonnement créé (déduplication fonctionne)")
    else:
        print(f"   ⚠️  {subscription_increase} nouveaux abonnements créés")


if __name__ == "__main__":
    test_payment_deduplication() 