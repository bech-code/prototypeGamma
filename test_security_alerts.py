#!/usr/bin/env python3
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
ALERTS_URL = f"{BASE_URL}/depannage/api/admin/security/alerts/recent/"

def test_security_alerts():
    print("=== Test de l'endpoint des alertes de sécurité ===")
    
    # 1. Connexion admin
    login_data = {
        "email": "testadmin@example.com",
        "password": "testpass123"
    }
    
    print(f"Tentative de connexion admin...")
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"Code de réponse login: {login_response.status_code}")
        print(f"Réponse login: {login_response.text}")
        
        if login_response.status_code != 200:
            print("❌ Échec de la connexion admin")
            return
        
        login_data = login_response.json()
        token = login_data.get('access')
        
        if not token:
            print("❌ Token d'accès manquant")
            return
        
        print("✅ Connexion admin réussie")
        
        # 2. Test de l'endpoint des alertes
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        print(f"\nTest de l'endpoint des alertes de sécurité...")
        alerts_response = requests.get(ALERTS_URL, headers=headers)
        
        print(f"Code de réponse alertes: {alerts_response.status_code}")
        print(f"Headers de réponse: {dict(alerts_response.headers)}")
        print(f"Réponse complète: {alerts_response.text}")
        
        if alerts_response.status_code == 200:
            data = alerts_response.json()
            print(f"✅ Endpoint des alertes fonctionnel")
            print(f"Nombre d'alertes: {len(data.get('alerts', []))}")
            
            # Afficher les premières alertes
            alerts = data.get('alerts', [])
            for i, alert in enumerate(alerts[:3]):
                print(f"  {i+1}. {alert.get('event_type', 'N/A')} - {alert.get('description', 'N/A')} - {alert.get('risk_score', 'N/A')}")
        else:
            print("❌ Erreur sur l'endpoint des alertes")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_security_alerts() 