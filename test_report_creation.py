#!/usr/bin/env python3
import requests
import json

# Configuration
BASE_URL = "http://localhost:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
REPORT_URL = f"{BASE_URL}/depannage/api/reports/"

def test_report_creation():
    print("=== Test de création de signalement ===")
    
    # 1. Connexion avec un compte client
    login_data = {
        "username": "client1@example.com",  # <-- Correction ici
        "email": "client1@example.com",
        "password": "client123"
    }
    
    print(f"Tentative de connexion avec {login_data['username']}...")
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"Code de réponse login: {login_response.status_code}")
        print(f"Réponse login: {login_response.text}")
        
        if login_response.status_code != 200:
            print("❌ Échec de la connexion")
            return
            
        login_data = login_response.json()
        token = login_data.get('access')
        
        if not token:
            print("❌ Pas de token d'accès reçu")
            return
            
        print("✅ Connexion réussie")
        
        # 2. Récupérer une demande de réparation existante pour ce client
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        repair_requests_url = f"{BASE_URL}/depannage/api/repair-requests/"
        print(f"\nRecherche d'une demande de réparation existante pour le client...")
        repair_resp = requests.get(repair_requests_url, headers=headers)
        if repair_resp.status_code != 200:
            print(f"❌ Impossible de récupérer les demandes de réparation (code {repair_resp.status_code})")
            print(repair_resp.text)
            return
        repair_data = repair_resp.json()
        if not repair_data or not repair_data.get('results'):
            print("Aucune demande de réparation trouvée pour ce client. Création d'une demande test...")
            # Création d'une demande de réparation test
            create_request_data = {
                "title": "Test API - Panne d'électricité",
                "description": "Simulation d'une panne d'électricité pour test API.",
                "address": "Quartier Test, Ville Test",
                "specialty_needed": "electrician",
                "priority": "medium",
                "latitude": 5.3599517,
                "longitude": -4.0082563
            }
            create_resp = requests.post(repair_requests_url, json=create_request_data, headers=headers)
            print(f"Réponse création demande: {create_resp.status_code} - {create_resp.text}")
            if create_resp.status_code != 201:
                print("❌ Impossible de créer une demande de réparation test.")
                return
            new_request = create_resp.json()
            request_id = new_request['id']
            print(f"✅ Demande test créée, ID: {request_id}")
        else:
            first_request = repair_data['results'][0]
            request_id = first_request['id']
            print(f"✅ Demande trouvée, ID: {request_id}")
        
        # 3. Création du signalement
        report_data = {
            "subject": "Test signalement API",
            "message": "Ceci est un test de création de signalement via l'API.",
            "request": request_id
        }
        
        print(f"\nTentative de création de signalement...")
        print(f"URL: {REPORT_URL}")
        print(f"Headers: {headers}")
        print(f"Data: {json.dumps(report_data, indent=2)}")
        
        report_response = requests.post(REPORT_URL, json=report_data, headers=headers)
        
        print(f"\nCode de réponse création: {report_response.status_code}")
        print(f"Headers de réponse: {dict(report_response.headers)}")
        print(f"Réponse complète: {report_response.text}")
        
        if report_response.status_code == 201:
            print("✅ Signalement créé avec succès")
            response_data = report_response.json()
            print(f"ID du signalement créé: {response_data.get('id')}")
        else:
            print("❌ Échec de la création du signalement")
            
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")

if __name__ == "__main__":
    test_report_creation() 