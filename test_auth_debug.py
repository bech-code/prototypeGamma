#!/usr/bin/env python3
"""
Script de test pour déboguer l'authentification et le refresh token
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_login_and_refresh():
    """Test complet du login et refresh token"""
    
    print("=== Test d'authentification et refresh token ===\n")
    
    # 1. Test de login
    print("1. Tentative de login...")
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    try:
        login_response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
        print(f"Status: {login_response.status_code}")
        print(f"Response: {json.dumps(login_response.json(), indent=2)}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            
            # Vérifier la présence des tokens
            access_token = login_data.get('access')
            refresh_token = login_data.get('refresh')
            
            print(f"\nAccess token présent: {access_token is not None}")
            print(f"Refresh token présent: {refresh_token is not None}")
            
            if access_token and refresh_token:
                print("✅ Login réussi avec tokens")
                
                # 2. Test du refresh token
                print("\n2. Test du refresh token...")
                refresh_data = {
                    "refresh": refresh_token
                }
                
                refresh_response = requests.post(f"{BASE_URL}/users/token/refresh/", json=refresh_data)
                print(f"Status: {refresh_response.status_code}")
                print(f"Response: {json.dumps(refresh_response.json(), indent=2)}")
                
                if refresh_response.status_code == 200:
                    print("✅ Refresh token fonctionne")
                    
                    # 3. Test avec le nouveau token
                    new_access = refresh_response.json().get('access')
                    if new_access:
                        print("\n3. Test avec le nouveau token...")
                        headers = {"Authorization": f"Bearer {new_access}"}
                        me_response = requests.get(f"{BASE_URL}/users/me/", headers=headers)
                        print(f"Status: {me_response.status_code}")
                        if me_response.status_code == 200:
                            print("✅ Nouveau token valide")
                        else:
                            print("❌ Nouveau token invalide")
                else:
                    print("❌ Refresh token échoué")
            else:
                print("❌ Tokens manquants dans la réponse")
        else:
            print("❌ Login échoué")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

def test_frontend_simulation():
    """Simule le comportement du frontend"""
    
    print("\n=== Simulation du comportement frontend ===\n")
    
    # 1. Login
    print("1. Login...")
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    try:
        login_response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
        
        if login_response.status_code == 200:
            data = login_response.json()
            access_token = data.get('access')
            refresh_token = data.get('refresh')
            
            print(f"Access token: {access_token[:20]}..." if access_token else "None")
            print(f"Refresh token: {refresh_token[:20]}..." if refresh_token else "None")
            
            # 2. Simuler l'utilisation du token
            if access_token:
                headers = {"Authorization": f"Bearer {access_token}"}
                me_response = requests.get(f"{BASE_URL}/users/me/", headers=headers)
                print(f"Me endpoint status: {me_response.status_code}")
                
                # 3. Simuler l'expiration et le refresh
                print("\n3. Simulation d'expiration et refresh...")
                time.sleep(1)  # Attendre un peu
                
                refresh_data = {"refresh": refresh_token}
                refresh_response = requests.post(f"{BASE_URL}/users/token/refresh/", json=refresh_data)
                print(f"Refresh status: {refresh_response.status_code}")
                
                if refresh_response.status_code == 200:
                    new_access = refresh_response.json().get('access')
                    print(f"Nouveau access token: {new_access[:20]}..." if new_access else "None")
                else:
                    print(f"Refresh échoué: {refresh_response.text}")
                    
        else:
            print(f"Login échoué: {login_response.text}")
            
    except Exception as e:
        print(f"Erreur: {e}")

if __name__ == "__main__":
    test_login_and_refresh()
    test_frontend_simulation() 