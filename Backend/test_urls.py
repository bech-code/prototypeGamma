#!/usr/bin/env python3
"""
Script de test pour vérifier que toutes les URLs de l'API fonctionnent
"""

import os
import sys
import django
import requests

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

def test_api_urls():
    """Test des URLs de l'API."""
    
    print("🔍 Test des URLs de l'API")
    print("=" * 50)
    
    base_url = "http://127.0.0.1:8000"
    
    # URLs à tester
    urls_to_test = [
        "/admin/",
        "/users/",
        "/depannage/api/repair-requests/",
        "/depannage/api/technicians/",
        "/depannage/api/clients/",
        "/depannage/api/cinetpay/",
    ]
    
    print(f"\n🌐 Test des URLs avec base: {base_url}")
    print("-" * 50)
    
    for url in urls_to_test:
        full_url = base_url + url
        try:
            response = requests.get(full_url, timeout=5)
            status = response.status_code
            
            if status == 200:
                print(f"✅ {url} - Status: {status}")
            elif status == 401:
                print(f"🔐 {url} - Status: {status} (Authentification requise)")
            elif status == 403:
                print(f"🚫 {url} - Status: {status} (Accès interdit)")
            elif status == 404:
                print(f"❌ {url} - Status: {status} (Page non trouvée)")
            else:
                print(f"⚠️ {url} - Status: {status}")
                
        except requests.exceptions.ConnectionError:
            print(f"❌ {url} - Erreur de connexion (serveur non démarré)")
        except requests.exceptions.Timeout:
            print(f"⏰ {url} - Timeout")
        except Exception as e:
            print(f"💥 {url} - Erreur: {str(e)}")
    
    print("\n📝 Recommandations:")
    print("1. Assurez-vous que le serveur Django est démarré: python manage.py runserver")
    print("2. Vérifiez que l'application 'depannage' est dans INSTALLED_APPS")
    print("3. Vérifiez que les URLs sont bien incluses dans auth/urls.py")
    print("4. Pour les URLs 401, c'est normal - elles nécessitent une authentification")

def test_django_urls():
    """Test de la configuration des URLs Django."""
    
    print("\n🔧 Test de la configuration Django")
    print("=" * 50)
    
    try:
        from django.urls import get_resolver
        from auth.urls import urlpatterns
        
        print("✅ Configuration des URLs Django chargée")
        print(f"📋 Nombre de patterns d'URL: {len(urlpatterns)}")
        
        for pattern in urlpatterns:
            print(f"  - {pattern.pattern}")
            
    except Exception as e:
        print(f"❌ Erreur lors du chargement des URLs: {str(e)}")

if __name__ == '__main__':
    test_django_urls()
    test_api_urls() 