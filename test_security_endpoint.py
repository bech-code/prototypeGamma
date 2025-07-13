#!/usr/bin/env python3
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SECURITY_URL = f"{BASE_URL}/depannage/api/admin/security/login-locations/"

def test_security_endpoint():
    print("=== Test de l'endpoint de sécurité ===")
    
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
        
        # 2. Test de l'endpoint de sécurité
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        print(f"\nTest de l'endpoint de sécurité...")
        security_response = requests.get(SECURITY_URL, headers=headers)
        
        print(f"Code de réponse sécurité: {security_response.status_code}")
        print(f"Headers de réponse: {dict(security_response.headers)}")
        print(f"Réponse complète: {security_response.text}")
        
        if security_response.status_code == 200:
            data = security_response.json()
            print(f"✅ Endpoint de sécurité fonctionnel")
            print(f"Nombre de localisations: {len(data.get('results', []))}")
            
            # Afficher les premières localisations
            locations = data.get('results', [])
            for i, loc in enumerate(locations[:3]):
                print(f"  {i+1}. {loc.get('user_name', 'N/A')} - {loc.get('location', 'N/A')} - {loc.get('timestamp', 'N/A')}")
        else:
            print("❌ Erreur sur l'endpoint de sécurité")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_security_endpoint() 