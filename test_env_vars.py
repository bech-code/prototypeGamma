#!/usr/bin/env python3
"""
Script de test pour vérifier les variables d'environnement CinetPay
"""

import os
from dotenv import load_dotenv

# Charger les variables d'environnement
load_dotenv()

print("🔧 TEST DES VARIABLES D'ENVIRONNEMENT")
print("=" * 50)

# Vérifier les variables CinetPay
cinetpay_vars = {
    'CINETPAY_API_KEY': os.getenv('CINETPAY_API_KEY'),
    'CINETPAY_SITE_ID': os.getenv('CINETPAY_SITE_ID'),
    'CINETPAY_ENVIRONMENT': os.getenv('CINETPAY_ENVIRONMENT'),
    'DJANGO_SECRET_KEY': os.getenv('DJANGO_SECRET_KEY'),
}

for var_name, var_value in cinetpay_vars.items():
    status = "✅" if var_value else "❌"
    print(f"{status} {var_name}: {var_value or 'NON DÉFINI'}")

print("\n🔧 TEST DE LA CONFIGURATION DJANGO")
print("=" * 50)

# Importer les settings Django
import sys
sys.path.append('Backend')

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')

import django
django.setup()

from django.conf import settings

print(f"✅ CINETPAY_CONFIG: {getattr(settings, 'CINETPAY_CONFIG', {})}")
print(f"✅ PAYMENT_SETTINGS: {getattr(settings, 'PAYMENT_SETTINGS', {})}")

# Vérifier les valeurs spécifiques
cinetpay_config = getattr(settings, 'CINETPAY_CONFIG', {})
payment_settings = getattr(settings, 'PAYMENT_SETTINGS', {})

print(f"\n🔧 DÉTAILS CINETPAY:")
print(f"   API_KEY: {cinetpay_config.get('API_KEY', 'NON DÉFINI')}")
print(f"   SITE_ID: {cinetpay_config.get('SITE_ID', 'NON DÉFINI')}")
print(f"   API_URL: {cinetpay_config.get('API_URL', 'NON DÉFINI')}")

print(f"\n🔧 DÉTAILS PAYMENT_SETTINGS:")
print(f"   CINETPAY_API_KEY: {payment_settings.get('CINETPAY_API_KEY', 'NON DÉFINI')}")
print(f"   CINETPAY_SITE_ID: {payment_settings.get('CINETPAY_SITE_ID', 'NON DÉFINI')}")
print(f"   CINETPAY_ENVIRONMENT: {payment_settings.get('CINETPAY_ENVIRONMENT', 'NON DÉFINI')}") 