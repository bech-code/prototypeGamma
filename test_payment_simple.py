#!/usr/bin/env python3
"""
Script de test simplifié pour simuler un paiement et créer un abonnement directement.
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
LOGIN_URL = f"{BASE_URL}/users/login/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"

TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"


def test_payment_simple():
    print(f"\n🔄 Test de paiement simplifié pour le technicien : {TECHNICIAN_EMAIL}")
    
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

    # 2. Vérifier le statut d'abonnement avant
    print("\n📊 Statut d'abonnement AVANT paiement :")
    status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
    if status_response.status_code == 200:
        data = status_response.json()
        print(f"   Statut: {data.get('status')}")
        print(f"   Peut recevoir des demandes: {data.get('can_receive_requests')}")
        print(f"   Jours restants: {data.get('days_remaining')}")
    else:
        print(f"   ❌ Erreur: {status_response.status_code}")

    # 3. Créer un paiement et un abonnement directement
    print("\n🔧 Création directe d'un paiement et abonnement...")
    
    user = User.objects.get(email=TECHNICIAN_EMAIL)
    
    # Créer un paiement CinetPay
    payment = CinetPayPayment.objects.create(
        transaction_id=f"TEST_{timezone.now().strftime('%Y%m%d_%H%M%S')}",
        amount=5000,
        currency="XOF",
        description="Test d'abonnement technicien",
        customer_name=user.last_name or user.username,
        customer_surname=user.first_name or "",
        customer_email=user.email,
        customer_phone_number="+22300000000",
        customer_address="Test Address",
        customer_city="Bamako",
        customer_country="ML",
        customer_state="ML",
        customer_zip_code="00000",
        status="success",
        metadata=f"user_{user.id}_subscription_1months",
        user=user,
        paid_at=timezone.now()
    )
    print(f"   ✅ Paiement créé: {payment.transaction_id}")

    # Créer un Technician si nécessaire
    technician, created = Technician.objects.get_or_create(
        user=user,
        defaults={
            'specialty': 'other',
            'phone': '+22300000000',
            'is_available': True,
            'is_verified': True,
            'years_experience': 0,
            'experience_level': 'junior',
            'hourly_rate': 0,
            'badge_level': 'bronze',
            'service_radius_km': 10,
            'bio': 'Technicien créé automatiquement pour abonnement'
        }
    )
    if created:
        print(f"   ✅ Technician créé pour {user.username}")
    else:
        print(f"   ✅ Technician existant pour {user.username}")

    # Créer l'abonnement
    now = timezone.now()
    subscription = TechnicianSubscription.objects.create(
        technician=technician,
        plan_name="Standard 1 mois",
        start_date=now,
        end_date=now + timedelta(days=30),
        payment=payment,
        is_active=True
    )
    print(f"   ✅ Abonnement créé: {subscription.plan_name} jusqu'au {subscription.end_date}")

    # 4. Vérifier le statut d'abonnement après
    print("\n📊 Statut d'abonnement APRÈS paiement :")
    status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
    if status_response.status_code == 200:
        data = status_response.json()
        print(f"   Statut: {data.get('status')}")
        print(f"   Peut recevoir des demandes: {data.get('can_receive_requests')}")
        print(f"   Jours restants: {data.get('days_remaining')}")
        print(f"   ID abonnement: {data.get('subscription')}")
        
        if data.get('can_receive_requests'):
            print("\n🎉 SUCCÈS : Le technicien peut maintenant accéder à son dashboard et recevoir des demandes !")
        else:
            print("\n❌ ÉCHEC : Le technicien ne peut toujours pas recevoir de demandes")
    else:
        print(f"   ❌ Erreur: {status_response.status_code}")
        print(status_response.text)

if __name__ == "__main__":
    test_payment_simple() 