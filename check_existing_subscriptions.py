#!/usr/bin/env python3
"""
Script pour vérifier les abonnements existants et identifier le problème.
"""

import os
import sys
import django

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, TechnicianSubscription, CinetPayPayment
from django.utils import timezone

TECHNICIAN_EMAIL = "ballo@gmail.com"

def check_existing_data():
    print(f"\n🔍 Vérification des données existantes pour : {TECHNICIAN_EMAIL}")
    
    # Vérifier l'utilisateur
    try:
        user = User.objects.get(email=TECHNICIAN_EMAIL)
        print(f"✅ Utilisateur trouvé: {user.username} (ID: {user.id})")
    except User.DoesNotExist:
        print(f"❌ Utilisateur non trouvé: {TECHNICIAN_EMAIL}")
        return

    # Vérifier le Technician
    try:
        technician = Technician.objects.get(user=user)
        print(f"✅ Technician trouvé: {technician} (ID: {technician.id})")
    except Technician.DoesNotExist:
        print(f"❌ Technician non trouvé pour {user.username}")
        return

    # Vérifier les abonnements existants
    subscriptions = TechnicianSubscription.objects.filter(technician=technician)
    print(f"📊 Abonnements existants: {subscriptions.count()}")
    
    for sub in subscriptions:
        print(f"   - ID: {sub.id}, Plan: {sub.plan_name}, Actif: {sub.is_active}")
        print(f"     Début: {sub.start_date}, Fin: {sub.end_date}")
        if sub.payment:
            print(f"     Paiement: {sub.payment.transaction_id}")

    # Vérifier les paiements existants
    payments = CinetPayPayment.objects.filter(user=user)
    print(f"💰 Paiements existants: {payments.count()}")
    
    for payment in payments:
        print(f"   - ID: {payment.id}, Transaction: {payment.transaction_id}")
        print(f"     Montant: {payment.amount}, Statut: {payment.status}")

    # Vérifier s'il y a des abonnements actifs
    now = timezone.now()
    active_subscriptions = subscriptions.filter(end_date__gt=now)
    print(f"🎯 Abonnements actifs: {active_subscriptions.count()}")
    
    if active_subscriptions.exists():
        print("⚠️  Il y a déjà des abonnements actifs !")
        for sub in active_subscriptions:
            print(f"   - {sub.plan_name} jusqu'au {sub.end_date}")

if __name__ == "__main__":
    check_existing_data() 