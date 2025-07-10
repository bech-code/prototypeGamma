#!/usr/bin/env python3
"""
Script pour tester les identifiants de connexion
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_credentials():
    """Test des différents identifiants possibles"""
    
    print("=== Test des identifiants de connexion ===\n")
    
    # Liste des identifiants à tester
    credentials_to_test = [
        {
            "name": "Admin principal",
            "email": "admin@depanneteliman.com",
            "password": "admin123"
        },
        {
            "name": "Admin avec mot de passe différent",
            "email": "admin@depanneteliman.com", 
            "password": "admin"
        },
        {
            "name": "Admin avec mot de passe vide",
            "email": "admin@depanneteliman.com",
            "password": ""
        },
        {
            "name": "Email inexistant",
            "email": "test@test.com",
            "password": "test123"
        }
    ]
    
    for cred in credentials_to_test:
        print(f"\n--- Test: {cred['name']} ---")
        print(f"Email: {cred['email']}")
        print(f"Password: {'*' * len(cred['password']) if cred['password'] else '(vide)'}")
        
        try:
            response = requests.post(f"{BASE_URL}/users/login/", json={
                "email": cred["email"],
                "password": cred["password"]
            })
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Connexion réussie!")
                print(f"User ID: {data.get('user', {}).get('id', 'N/A')}")
                print(f"User Type: {data.get('user', {}).get('user_type', 'N/A')}")
                print(f"Access token présent: {'access' in data}")
                print(f"Refresh token présent: {'refresh' in data}")
                
                # Test du refresh token
                if 'refresh' in data:
                    print("\nTest du refresh token...")
                    refresh_response = requests.post(f"{BASE_URL}/users/token/refresh/", json={
                        "refresh": data['refresh']
                    })
                    print(f"Refresh status: {refresh_response.status_code}")
                    if refresh_response.status_code == 200:
                        print("✅ Refresh token fonctionne")
                    else:
                        print("❌ Refresh token échoué")
                
            elif response.status_code == 401:
                print("❌ Identifiants incorrects")
                try:
                    error_data = response.json()
                    print(f"Erreur: {error_data}")
                except:
                    print(f"Erreur: {response.text}")
                    
            elif response.status_code == 400:
                print("❌ Données invalides")
                try:
                    error_data = response.json()
                    print(f"Erreur: {error_data}")
                except:
                    print(f"Erreur: {response.text}")
                    
            else:
                print(f"❌ Erreur {response.status_code}")
                print(f"Response: {response.text}")
                
        except Exception as e:
            print(f"❌ Erreur de connexion: {e}")

def check_user_exists():
    """Vérifier si l'utilisateur admin existe dans la base de données"""
    
    print("\n=== Vérification de l'existence de l'utilisateur ===\n")
    
    try:
        # Test avec l'API Django admin (si accessible)
        response = requests.get(f"{BASE_URL}/admin/")
        print(f"Admin accessible: {response.status_code == 200}")
        
        # Test de l'endpoint de santé
        health_response = requests.get(f"{BASE_URL}/depannage/api/test/health_check/")
        print(f"Health check: {health_response.status_code}")
        
    except Exception as e:
        print(f"Erreur: {e}")

def create_test_user():
    """Créer un utilisateur de test si nécessaire"""
    
    print("\n=== Création d'un utilisateur de test ===\n")
    
    test_user_data = {
        "username": "testuser",
        "email": "test@depanneteliman.com",
        "password": "test123",
        "password2": "test123",
        "user_type": "admin",
        "phone_number": "123456789",
        "address": "Test Address",
        "first_name": "Test",
        "last_name": "User"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users/register/", json=test_user_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 201 or response.status_code == 200:
            print("✅ Utilisateur de test créé")
            print("Vous pouvez maintenant vous connecter avec:")
            print("Email: test@depanneteliman.com")
            print("Password: test123")
        else:
            print("❌ Échec de création")
            try:
                error_data = response.json()
                print(f"Erreur: {error_data}")
            except:
                print(f"Erreur: {response.text}")
                
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_credentials()
    check_user_exists()
    create_test_user() 