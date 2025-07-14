#!/usr/bin/env python3
"""
Script de test pour vérifier que le mode production CinetPay fonctionne
"""

import os
import sys
import django
import requests
import json
import time

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.auth.settings')
django.setup()

from django.conf import settings

def test_production_mode():
    """Test du mode production CinetPay"""
    
    print("🔍 TEST DU MODE PRODUCTION CINETPAY")
    print("=" * 50)
    
    # 1. Vérifier la configuration
    CINETPAY_CONFIG = getattr(settings, 'CINETPAY_CONFIG', {})
    
    print("\n📋 Configuration actuelle:")
    print(f"API Key: {'✅ Configurée' if CINETPAY_CONFIG.get('API_KEY') else '❌ Non configurée'}")
    print(f"Site ID: {'✅ Configuré' if CINETPAY_CONFIG.get('SITE_ID') else '❌ Non configuré'}")
    print(f"Mode: {CINETPAY_CONFIG.get('MODE', 'Non défini')}")
    print(f"Simulateur: {'❌ Désactivé' if not CINETPAY_CONFIG.get('USE_SIMULATOR') else '⚠️ Activé'}")
    print(f"Environnement: {CINETPAY_CONFIG.get('ENVIRONMENT', 'Non défini')}")
    
    # 2. Vérifier les URLs
    print(f"\n🌐 URLs de configuration:")
    print(f"Base URL: {getattr(settings, 'BASE_URL', 'Non définie')}")
    print(f"Frontend URL: {getattr(settings, 'FRONTEND_URL', 'Non définie')}")
    print(f"API URL: {CINETPAY_CONFIG.get('API_URL', 'Non définie')}")
    
    # 3. Test de connexion à l'API CinetPay
    if CINETPAY_CONFIG.get('API_KEY') and CINETPAY_CONFIG.get('SITE_ID'):
        print("\n🧪 Test de connexion à l'API CinetPay...")
        
        # Préparer les données de test
        test_payload = {
            'apikey': CINETPAY_CONFIG.get('API_KEY'),
            'site_id': CINETPAY_CONFIG.get('SITE_ID'),
            'transaction_id': f"TEST_PROD_{os.getpid()}_{int(time.time())}",
            'amount': 100,  # Montant de test (multiple de 5)
            'currency': CINETPAY_CONFIG.get('CURRENCY', 'XOF'),
            'description': 'Test mode production CinetPay',
            'notify_url': f"{getattr(settings, 'BASE_URL', 'http://127.0.0.1:8000')}/depannage/api/cinetpay/notify/",
            'return_url': f"{getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:5173')}/payment/success",
            'channels': 'ALL',
            'lang': CINETPAY_CONFIG.get('LANG', 'fr'),
            'metadata': 'test_production_mode',
            'invoice_data': {
                'Test': 'Production Mode',
                'Date': time.strftime('%Y-%m-%d'),
                'Status': 'Test'
            },
            # Informations client obligatoires
            'customer_id': 'test_user_prod',
            'customer_name': 'Test',
            'customer_surname': 'Production',
            'customer_email': 'test@example.com',
            'customer_phone_number': '+225000000000',
            'customer_address': 'Adresse de test',
            'customer_city': 'Ville de test',
            'customer_country': 'CI',
            'customer_state': 'CI',
            'customer_zip_code': '00000'
        }
        
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
                    print("🎉 Mode production fonctionne correctement !")
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
    
    # 4. Recommandations
    print("\n📝 Recommandations:")
    if CINETPAY_CONFIG.get('USE_SIMULATOR'):
        print("⚠️ Le simulateur est encore activé - Désactivez-le pour la production")
    if CINETPAY_CONFIG.get('MODE') == 'TEST':
        print("⚠️ Le mode est encore en TEST - Passez en PRODUCTION")
    print("✅ Utilisez de petits montants pour tester en production")
    print("✅ Surveillez les logs pour les erreurs")
    print("✅ Vérifiez les notifications webhook")

if __name__ == "__main__":
    test_production_mode() 