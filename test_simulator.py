#!/usr/bin/env python3
"""
Test direct du simulateur CinetPay
"""

import sys
import os

# Ajouter le répertoire Backend au path
sys.path.append('Backend')

# Configurer Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')

import django
django.setup()

# Importer le simulateur
from depannage.cinetpay_simulator import init_cinetpay_payment_simulated, check_cinetpay_payment_status_simulated

print("🔧 TEST DU SIMULATEUR CINETPAY")
print("=" * 50)

# Test d'initiation de paiement
print("\n1. Test d'initiation de paiement")
print("-" * 30)

result, transaction_id = init_cinetpay_payment_simulated(
    amount=5000,
    phone="22312345678",
    name="Test Technicien",
    description="Abonnement technicien - 1 mois",
    email="technicien@test.com"
)

print(f"✅ Résultat: {result}")
print(f"✅ Transaction ID: {transaction_id}")

# Test de vérification de statut
print("\n2. Test de vérification de statut")
print("-" * 30)

status_result = check_cinetpay_payment_status_simulated(transaction_id)
print(f"✅ Statut: {status_result}")

# Test avec des paramètres différents
print("\n3. Test avec paramètres différents")
print("-" * 30)

result2, transaction_id2 = init_cinetpay_payment_simulated(
    amount=10000,
    phone="22387654321",
    name="Autre Technicien",
    description="Abonnement technicien - 3 mois",
    email="autre@test.com",
    metadata="user_id:123,subscription_type:premium"
)

print(f"✅ Résultat 2: {result2}")
print(f"✅ Transaction ID 2: {transaction_id2}") 