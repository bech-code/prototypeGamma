#!/usr/bin/env python3
"""
Test script pour vérifier l'endpoint des alertes de sécurité
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SECURITY_ALERTS_URL = f"{BASE_URL}/depannage/api/admin/security/alerts/recent/"

def test_security_alerts():
    """Test de l'endpoint des alertes de sécurité"""
    
    print("🔒 Test des alertes de sécurité")
    print("=" * 50)
    
    # 1. Connexion admin
    print("\n1. Connexion administrateur...")
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access')
            print(f"   ✅ Connexion réussie")
            print(f"   Token: {access_token[:50]}...")
        else:
            print(f"   ❌ Échec de connexion: {login_response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return False
    
    # 2. Test de l'endpoint des alertes de sécurité
    print("\n2. Test de l'endpoint des alertes de sécurité...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(SECURITY_ALERTS_URL, headers=headers)
        print(f"   Status: {response.status_code}")
        print(f"   URL: {SECURITY_ALERTS_URL}")
        
        if response.status_code == 200:
            data = response.json()
            alerts = data.get('alerts', [])
            print(f"   ✅ Succès - {len(alerts)} alertes trouvées")
            
            if alerts:
                print("\n   Alertes récentes:")
                for i, alert in enumerate(alerts[:3], 1):
                    print(f"   {i}. {alert.get('event_type', 'N/A')} - Score: {alert.get('risk_score', 'N/A')}")
            else:
                print("   ℹ️  Aucune alerte récente")
                
        elif response.status_code == 403:
            print("   ❌ Accès interdit - L'utilisateur n'est pas admin")
        elif response.status_code == 401:
            print("   ❌ Non autorisé - Token invalide")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur de requête: {e}")
        return False
    
    return True

def test_login_locations():
    """Test de l'endpoint des localisations de connexion"""
    
    print("\n🔍 Test des localisations de connexion")
    print("=" * 50)
    
    # 1. Connexion admin
    print("\n1. Connexion administrateur...")
    login_data = {
        "email": "admin@example.com",
        "password": "admin123"
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access')
            print(f"   ✅ Connexion réussie")
        else:
            print(f"   ❌ Échec de connexion: {login_response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return False
    
    # 2. Test de l'endpoint des localisations
    print("\n2. Test de l'endpoint des localisations...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(f"{BASE_URL}/depannage/api/admin/security/login-locations/", headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            locations = data.get('locations', [])
            print(f"   ✅ Succès - {len(locations)} localisations trouvées")
            
            if locations:
                print("\n   Localisations récentes:")
                for i, location in enumerate(locations[:3], 1):
                    print(f"   {i}. {location.get('user', 'N/A')} - {location.get('ip_address', 'N/A')}")
            else:
                print("   ℹ️  Aucune localisation récente")
                
        elif response.status_code == 403:
            print("   ❌ Accès interdit - L'utilisateur n'est pas admin")
        elif response.status_code == 401:
            print("   ❌ Non autorisé - Token invalide")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur de requête: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Test des endpoints de sécurité")
    print("=" * 60)
    
    # Test des alertes de sécurité
    alerts_success = test_security_alerts()
    
    # Test des localisations de connexion
    locations_success = test_login_locations()
    
    print("\n" + "=" * 60)
    print("📊 Résumé des tests:")
    print(f"   Alertes de sécurité: {'✅' if alerts_success else '❌'}")
    print(f"   Localisations: {'✅' if locations_success else '❌'}")
    
    if alerts_success and locations_success:
        print("\n🎉 Tous les tests de sécurité sont passés!")
        sys.exit(0)
    else:
        print("\n⚠️  Certains tests ont échoué")
        sys.exit(1) 