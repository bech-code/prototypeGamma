#!/usr/bin/env python3
"""
Script pour tester l'API des notifications admin.
"""
import os
import sys
import django
import requests

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

def test_api_notifications():
    print("🔍 Test de l'API des notifications admin...")
    
    # Connexion admin
    login_data = {
        "username": "depan_use",
        "email": "mohamedbechirdiarra4@gmail.com", 
        "password": "bechir66312345"
    }
    
    try:
        # Connexion
        resp = requests.post("http://127.0.0.1:8000/users/login/", json=login_data)
        if resp.status_code != 200:
            print(f"❌ Erreur de connexion ({resp.status_code}): {resp.text}")
            return
        
        token = resp.json().get("access")
        if not token:
            print("❌ Token non reçu")
            return
        
        print("✅ Connexion réussie")
        
        # Test endpoint ViewSet
        headers = {"Authorization": f"Bearer {token}"}
        
        print("\n1. Test endpoint ViewSet (/depannage/api/admin-notifications/):")
        resp = requests.get("http://127.0.0.1:8000/depannage/api/admin-notifications/", headers=headers)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Type de données: {type(data)}")
            print(f"   Données reçues: {data}")
            if isinstance(data, list) and len(data) > 0:
                print(f"   Exemple: {data[0]}")
            elif isinstance(data, dict):
                print(f"   Structure: {list(data.keys())}")
            else:
                print("   Format inattendu")
        else:
            print(f"   Erreur: {resp.text}")
        
        # Test endpoint fonction
        print("\n2. Test endpoint fonction (/depannage/api/admin/notifications/):")
        resp = requests.get("http://127.0.0.1:8000/depannage/api/admin/notifications/", headers=headers)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Données reçues: {len(data)} notifications")
            if data and len(data) > 0:
                print(f"   Exemple: {data[0]}")
            else:
                print("   Aucune notification trouvée")
        else:
            print(f"   Erreur: {resp.text}")
            
    except Exception as e:
        print(f"❌ Exception: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    test_api_notifications() 