#!/usr/bin/env python3
"""
Script pour tester les endpoints techniciens.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"

TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"

def test_endpoints():
    print(f"\n🔄 Test des endpoints pour le technicien : {TECHNICIAN_EMAIL}")
    
    # 1. Connexion technicien
    login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
    login_response = requests.post(LOGIN_URL, json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Échec de connexion technicien: {login_response.status_code}")
        print(login_response.text)
        return False
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Connexion réussie")

    # 2. Tester les endpoints
    endpoints = [
        ("/depannage/api/technicians/subscription_status/", "Statut d'abonnement"),
        ("/depannage/api/technicians/dashboard/", "Dashboard"),
        ("/depannage/api/technicians/requests/", "Demandes"),
        ("/depannage/api/technicians/", "Liste techniciens"),
        ("/depannage/api/technicians/me/", "Profil technicien"),
    ]
    
    for endpoint, description in endpoints:
        print(f"\n📋 Test de {description}:")
        url = f"{BASE_URL}{endpoint}"
        response = requests.get(url, headers=headers)
        print(f"   URL: {url}")
        print(f"   Status: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Succès")
        else:
            print(f"   ❌ Erreur: {response.text[:100]}...")

if __name__ == "__main__":
    test_endpoints() 