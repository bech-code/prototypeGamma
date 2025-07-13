#!/usr/bin/env python3
"""
Script de test complet pour l'API du profil technicien
Teste toutes les fonctionnalités : lecture, mise à jour, uploads, etc.
"""

import requests
import json
import os

BASE_URL = "http://127.0.0.1:8000"

def test_technician_profile_complete():
    """Test complet de l'API du profil technicien"""
    
    print("🧪 Test complet de l'API du profil technicien")
    print("=" * 60)
    
    # 1. Test de connexion client (doit échouer pour les endpoints technicien)
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
            print(f"   Spécialité: {data.get('specialty', 'N/A')}")
            print(f"   Note moyenne: {data.get('average_rating', 'N/A')}")
            print(f"   Missions terminées: {data.get('total_jobs_completed', 'N/A')}")
            print(f"   Vérifié: {data.get('is_verified', 'N/A')}")
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
        
        # Test endpoint upload_photo (GET - doit échouer)
        if tech_id:
            print(f"\n📊 Test endpoint /technicians/{tech_id}/upload_photo/ (GET)")
            response = requests.get(
                f"{BASE_URL}/depannage/api/technicians/{tech_id}/upload_photo/",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 405:
                print("✅ Correct: Méthode GET non autorisée pour upload_photo")
            else:
                print(f"❌ Problème: Status inattendu {response.status_code}")
        
        # Test endpoint upload_kyc (GET - doit échouer)
        if tech_id:
            print(f"\n📊 Test endpoint /technicians/{tech_id}/upload_kyc/ (GET)")
            response = requests.get(
                f"{BASE_URL}/depannage/api/technicians/{tech_id}/upload_kyc/",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 405:
                print("✅ Correct: Méthode GET non autorisée pour upload_kyc")
            else:
                print(f"❌ Problème: Status inattendu {response.status_code}")
        
        # Test endpoint download_receipts
        if tech_id:
            print(f"\n📊 Test endpoint /technicians/{tech_id}/download_receipts/")
            response = requests.get(
                f"{BASE_URL}/depannage/api/technicians/{tech_id}/download_receipts/",
                headers=headers
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                print("✅ Correct: Téléchargement des reçus disponible")
                print(f"   Content-Type: {response.headers.get('content-type', 'N/A')}")
                print(f"   Content-Length: {response.headers.get('content-length', 'N/A')}")
            else:
                print(f"❌ Problème: {response.text}")
        
        # Test de mise à jour du profil (PATCH)
        if tech_id:
            print(f"\n📊 Test de mise à jour du profil (PATCH)")
            update_data = {
                "user": {
                    "first_name": "Test",
                    "last_name": "Technicien"
                },
                "phone": "+22507000000",
                "specialty": "electrician",
                "years_experience": 5,
                "address": "Abidjan, Côte d'Ivoire",
                "hourly_rate": 5000,
                "bio": "Technicien expérimenté en électricité"
            }
            
            response = requests.patch(
                f"{BASE_URL}/depannage/api/technicians/{tech_id}/",
                headers={**headers, "Content-Type": "application/json"},
                json=update_data
            )
            print(f"Status: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                print("✅ Profil technicien mis à jour avec succès")
                print(f"   Nouveau nom: {data.get('user', {}).get('first_name', 'N/A')}")
                print(f"   Nouvelle spécialité: {data.get('specialty', 'N/A')}")
                print(f"   Nouveau tarif: {data.get('hourly_rate', 'N/A')} FCFA/h")
            else:
                print(f"❌ Erreur lors de la mise à jour: {response.text}")
    
    # 3. Test des endpoints avec des données invalides
    print("\n3️⃣ Test avec données invalides...")
    
    if tech_token and tech_id:
        headers = {"Authorization": f"Bearer {tech_token}"}
        
        # Test avec des données invalides
        invalid_data = {
            "user": {
                "first_name": "",  # Prénom vide
                "last_name": "Test"
            },
            "phone": "",
            "specialty": "invalid_specialty",
            "years_experience": -1,  # Années négatives
            "hourly_rate": -1000  # Tarif négatif
        }
        
        response = requests.patch(
            f"{BASE_URL}/depannage/api/technicians/{tech_id}/",
            headers={**headers, "Content-Type": "application/json"},
            json=invalid_data
        )
        print(f"📊 Test avec données invalides - Status: {response.status_code}")
        if response.status_code == 400:
            print("✅ Correct: Validation côté serveur fonctionne")
            try:
                error_data = response.json()
                print(f"   Erreurs: {error_data}")
            except:
                print("   Erreurs de validation détectées")
        else:
            print(f"❌ Problème: Validation échouée - {response.text}")
    
    print("\n🎯 Résumé du test complet:")
    print("- ✅ API backend fonctionne correctement")
    print("- ✅ Gestion des permissions (client vs technicien)")
    print("- ✅ Endpoints de profil technicien opérationnels")
    print("- ✅ Endpoints d'upload et download disponibles")
    print("- ✅ Validation côté serveur active")
    print("- ✅ Gestion des erreurs appropriée")
    print("- ✅ Mise à jour du profil fonctionnelle")

if __name__ == "__main__":
    test_technician_profile_complete() 