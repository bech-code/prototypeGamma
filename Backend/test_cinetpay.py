#!/usr/bin/env python3
"""
Script de test pour vérifier la configuration CinetPay
Selon la documentation officielle: https://docs.cinetpay.com/
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.conf import settings

def test_cinetpay_configuration():
    """Test de la configuration CinetPay selon la documentation officielle."""
    
    print("🔍 Test de la configuration CinetPay")
    print("=" * 50)
    
    # 1. Vérifier la configuration
    CINETPAY_CONFIG = getattr(settings, 'CINETPAY_CONFIG', {})
    
    print("\n📋 Configuration actuelle:")
    print(f"API Key: {'✅ Configurée' if CINETPAY_CONFIG.get('API_KEY') and CINETPAY_CONFIG.get('API_KEY') != 'YOUR_APIKEY' else '❌ Non configurée'}")
    print(f"Site ID: {'✅ Configuré' if CINETPAY_CONFIG.get('SITE_ID') and CINETPAY_CONFIG.get('SITE_ID') != 'YOUR_SITEID' else '❌ Non configuré'}")
    print(f"Devise: {CINETPAY_CONFIG.get('CURRENCY', 'Non définie')}")
    print(f"Langue: {CINETPAY_CONFIG.get('LANG', 'Non définie')}")
    print(f"Mode: {CINETPAY_CONFIG.get('MODE', 'Non défini')}")
    
    # 2. Vérifier les URLs
    print(f"\n🌐 URLs de configuration:")
    print(f"Base URL: {getattr(settings, 'BASE_URL', 'Non définie')}")
    print(f"Frontend URL: {getattr(settings, 'FRONTEND_URL', 'Non définie')}")
    
    # 3. Préparer les données de test selon la documentation
    test_payload = {
        'apikey': CINETPAY_CONFIG.get('API_KEY', ''),
        'site_id': CINETPAY_CONFIG.get('SITE_ID', ''),
        'transaction_id': f"TEST_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
        'amount': 100,  # Montant de test (multiple de 5)
        'currency': CINETPAY_CONFIG.get('CURRENCY', 'XOF'),
        'description': 'Test de configuration CinetPay',
        'notify_url': f"{getattr(settings, 'BASE_URL', 'http://127.0.0.1:8000')}/depannage/api/cinetpay/notify/",
        'return_url': f"{getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')}/payment",
        'channels': 'ALL',
        'lang': CINETPAY_CONFIG.get('LANG', 'fr'),
        'metadata': 'test_configuration',
        'invoice_data': {
            'Test': 'Configuration',
            'Date': datetime.now().strftime('%Y-%m-%d'),
            'Status': 'Test'
        },
        # Informations client obligatoires
        'customer_id': 'test_user',
        'customer_name': 'Test',
        'customer_surname': 'Configuration',
        'customer_email': 'test@example.com',
        'customer_phone_number': '+225000000000',
        'customer_address': 'Adresse de test',
        'customer_city': 'Ville de test',
        'customer_country': 'CI',
        'customer_state': 'CI',
        'customer_zip_code': '00000'
    }
    
    # 4. Test de connexion à l'API CinetPay
    if CINETPAY_CONFIG.get('API_KEY') and CINETPAY_CONFIG.get('API_KEY') != 'YOUR_APIKEY':
        print("\n🧪 Test de connexion à l'API CinetPay...")
        
        try:
            response = requests.post(
                CINETPAY_CONFIG.get('API_URL', 'https://api-checkout.cinetpay.com/v2/payment'),
                json=test_payload,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'Django-CinetPay-Test/1.0'
                },
                timeout=30
            )
            
            print(f"Status Code: {response.status_code}")
            print(f"Response: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                if data.get('code') == '201':
                    print("✅ Test de connexion réussi !")
                    print(f"Payment Token: {data['data']['payment_token'][:50]}...")
                    print(f"Payment URL: {data['data']['payment_url']}")
                else:
                    print(f"❌ Erreur CinetPay: {data.get('code')} - {data.get('message')}")
                    print(f"Description: {data.get('description')}")
            elif response.status_code == 403:
                print("❌ Erreur 403: Service non identifié ou URLs localhost non autorisées")
                print("💡 Solution: Utilisez l'adresse IP 127.0.0.1 au lieu de localhost")
            elif response.status_code == 429:
                print("❌ Erreur 429: Trop de requêtes")
                print("💡 Solution: Attendez quelques minutes avant de réessayer")
            else:
                print(f"❌ Erreur HTTP {response.status_code}: {response.text}")
                
        except requests.exceptions.RequestException as e:
            print(f"❌ Erreur de connexion: {str(e)}")
        except Exception as e:
            print(f"❌ Erreur inattendue: {str(e)}")
    else:
        print("\n⚠️ Impossible de tester l'API: Configuration incomplète")
    
    # 5. Recommandations
    print("\n📝 Recommandations:")
    print("1. Remplacez 'YOUR_APIKEY' et 'YOUR_SITEID' par vos vraies valeurs")
    print("2. Utilisez 127.0.0.1 au lieu de localhost pour les URLs")
    print("3. Vérifiez que votre devise correspond à votre compte CinetPay")
    print("4. Assurez-vous que votre compte CinetPay est actif")
    
    # 6. Vérification des paramètres selon la documentation
    print("\n🔧 Vérification des paramètres obligatoires:")
    required_params = [
        'apikey', 'site_id', 'transaction_id', 'amount', 'currency',
        'description', 'notify_url', 'return_url', 'channels'
    ]
    
    for param in required_params:
        if param in test_payload:
            print(f"✅ {param}: Présent")
        else:
            print(f"❌ {param}: Manquant")
    
    print("\n🎯 Vérification des paramètres client (pour carte bancaire):")
    customer_params = [
        'customer_name', 'customer_surname', 'customer_email',
        'customer_phone_number', 'customer_address', 'customer_city',
        'customer_country', 'customer_state', 'customer_zip_code'
    ]
    
    for param in customer_params:
        if param in test_payload:
            print(f"✅ {param}: Présent")
        else:
            print(f"❌ {param}: Manquant")

if __name__ == '__main__':
    test_cinetpay_configuration() 