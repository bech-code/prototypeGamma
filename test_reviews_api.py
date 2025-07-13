#!/usr/bin/env python3
"""
Script de test pour l'API des avis
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_login_and_reviews():
    """Test de connexion et récupération des avis"""
    
    # Test avec différents utilisateurs
    users = [
        {"email": "client2@example.com", "password": "client123", "type": "client"},
        {"email": "ballo@gmail.com", "password": "password123", "type": "technician"},
        {"email": "testadmin@example.com", "password": "admin123", "type": "admin"}
    ]
    
    for user in users:
        print(f"\n🔐 Test avec {user['type']}: {user['email']}")
        
        # Connexion
        try:
            response = requests.post(
                f"{BASE_URL}/users/login/",
                json={"email": user["email"], "password": user["password"]}
            )
            
            if response.status_code == 200:
                token = response.json().get('access')
                print(f"✅ Connexion réussie, token obtenu")
                
                # Test API avis reçus
                headers = {"Authorization": f"Bearer {token}"}
                
                # Test endpoint received
                response = requests.get(
                    f"{BASE_URL}/depannage/api/reviews/received/",
                    headers=headers
                )
                print(f"📊 API /reviews/received/ - Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"   Résultats: {len(data.get('results', []))} avis")
                    if data.get('results'):
                        print(f"   Premier avis: {data['results'][0]}")
                else:
                    print(f"   Erreur: {response.text}")
                
                # Test endpoint statistics
                response = requests.get(
                    f"{BASE_URL}/depannage/api/reviews/statistics/",
                    headers=headers
                )
                print(f"📈 API /reviews/statistics/ - Status: {response.status_code}")
                if response.status_code == 200:
                    data = response.json()
                    print(f"   Stats: {data}")
                else:
                    print(f"   Erreur: {response.text}")
                    
            else:
                print(f"❌ Échec de connexion: {response.status_code}")
                print(f"   Réponse: {response.text}")
                
        except Exception as e:
            print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_login_and_reviews() 