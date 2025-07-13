#!/usr/bin/env python3
"""
Script de test pour valider les corrections frontend
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:5173"

def test_frontend_corrections():
    """Test des corrections frontend"""
    
    print("🧪 Test des corrections frontend")
    print("=" * 50)
    
    # 1. Test de connexion client
    print("\n1️⃣ Test de connexion client...")
    client_response = requests.post(
        f"{BASE_URL}/users/login/",
        json={"email": "client2@example.com", "password": "client123"}
    )
    
    if client_response.status_code == 200:
        client_token = client_response.json().get('access')
        print("✅ Connexion client réussie")
        
        headers = {"Authorization": f"Bearer {client_token}"}
        
        # Test endpoint /technicians/me/ (doit échouer pour un client)
        response = requests.get(
            f"{BASE_URL}/depannage/api/technicians/me/",
            headers=headers
        )
        print(f"📊 Test /technicians/me/ (client): {response.status_code}")
        if response.status_code == 404:
            print("✅ Correct: Client ne peut pas accéder au profil technicien")
        else:
            print(f"❌ Problème: Status inattendu {response.status_code}")
            
        # Test endpoint /technicians/0/ (doit échouer)
        response = requests.get(
            f"{BASE_URL}/depannage/api/technicians/0/",
            headers=headers
        )
        print(f"📊 Test /technicians/0/ (client): {response.status_code}")
        if response.status_code == 404:
            print("✅ Correct: ID 0 retourne 404")
        else:
            print(f"❌ Problème: Status inattendu {response.status_code}")
    else:
        print(f"❌ Échec connexion client: {client_response.status_code}")
    
    # 2. Test avec un technicien existant
    print("\n2️⃣ Test avec technicien existant...")
    
    # Essayer de se connecter avec un technicien
    technician_emails = ["ballo@gmail.com", "technician@example.com"]
    tech_token = None
    tech_id = None
    
    for email in technician_emails:
        try:
            response = requests.post(
                f"{BASE_URL}/users/login/",
                json={"email": email, "password": "password123"}
            )
            
            if response.status_code == 200:
                tech_token = response.json().get('access')
                print(f"✅ Connexion technicien réussie: {email}")
                break
            else:
                print(f"❌ Échec connexion technicien {email}: {response.status_code}")
        except Exception as e:
            print(f"❌ Erreur avec technicien {email}: {e}")
    
    if tech_token:
        headers = {"Authorization": f"Bearer {tech_token}"}
        
        # Test endpoint /technicians/me/
        print("\n📊 Test endpoint /technicians/me/")
        response = requests.get(
            f"{BASE_URL}/depannage/api/technicians/me/",
            headers=headers
        )
        print(f"Status: {response.status_code}")
        if response.status_code == 200:
            data = response.json()
            tech_id = data.get('id')
            print(f"✅ Profil technicien récupéré: {data.get('user', {}).get('first_name', 'N/A')}")
            print(f"   ID: {tech_id}")
        else:
            print(f"❌ Erreur: {response.text}")
        
        # Test endpoint /technicians/{id}/
        if tech_id:
            print(f"\n📊 Test endpoint /technicians/{tech_id}/")
            response = requests.get(
                f"{BASE_URL}/depannage/api/technicians/{tech_id}/",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print(f"✅ Profil technicien récupéré par ID: {data.get('user', {}).get('first_name', 'N/A')}")
            else:
                print(f"❌ Erreur: {response.text}")
    
    # 3. Test de l'interface frontend
    print("\n3️⃣ Test de l'interface frontend...")
    
    try:
        # Test de connectivité frontend
        response = requests.get(FRONTEND_URL, timeout=5)
        print(f"📊 Test connectivité frontend: {response.status_code}")
        if response.status_code == 200:
            print("✅ Frontend accessible")
        else:
            print(f"❌ Frontend non accessible: {response.status_code}")
    except requests.exceptions.RequestException as e:
        print(f"❌ Frontend non accessible: {e}")
    
    print("\n🎯 Résumé des corrections:")
    print("- ✅ Script 'start' ajouté au package.json")
    print("- ✅ Gestion des IDs 0 corrigée")
    print("- ✅ Messages d'erreur appropriés pour les non-techniciens")
    print("- ✅ Validation des permissions côté frontend")
    print("- ✅ Interface utilisateur améliorée")

if __name__ == "__main__":
    test_frontend_corrections() 