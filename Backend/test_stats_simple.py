#!/usr/bin/env python3
"""
Script simple pour tester les endpoints de statistiques
Utilise un token JWT existant ou crée un utilisateur de test
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/depannage/api"

def print_header(title):
    print("\n" + "="*50)
    print(f" {title}")
    print("="*50)

def test_with_token(token):
    """Test avec un token JWT existant"""
    print_header("TEST AVEC TOKEN EXISTANT")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Statistiques du tableau de bord
    print("\n1. Test des statistiques du tableau de bord...")
    try:
        response = requests.get(f"{API_BASE}/repair-requests/dashboard_stats/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print("✅ Succès!")
            print(f"   Données reçues: {len(data)} champs")
            for key, value in data.items():
                if isinstance(value, (int, float)):
                    print(f"   {key}: {value}")
                elif isinstance(value, list):
                    print(f"   {key}: {len(value)} éléments")
                else:
                    print(f"   {key}: {value}")
        else:
            print(f"❌ Erreur {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")
    
    # Test 2: Statistiques complètes du projet
    print("\n2. Test des statistiques complètes du projet...")
    try:
        response = requests.get(f"{API_BASE}/repair-requests/project_statistics/", headers=headers)
        if response.status_code == 200:
            data = response.json()
            print("✅ Succès!")
            print(f"   Données reçues: {len(data)} sections")
            
            # Afficher la vue d'ensemble
            overview = data.get('overview', {})
            if overview:
                print("\n   Vue d'ensemble:")
                for key, value in overview.items():
                    if isinstance(value, (int, float)):
                        print(f"     {key}: {value}")
            
            # Afficher les demandes
            requests_data = data.get('requests', {})
            if requests_data:
                print("\n   Demandes:")
                for key, value in requests_data.items():
                    if isinstance(value, (int, float)):
                        print(f"     {key}: {value}")
            
        elif response.status_code == 403:
            print("❌ Accès refusé - Utilisateur non admin")
        else:
            print(f"❌ Erreur {response.status_code}: {response.text}")
    except Exception as e:
        print(f"❌ Exception: {e}")

def create_test_admin():
    """Crée un utilisateur admin de test"""
    print_header("CRÉATION D'UN ADMIN DE TEST")
    
    admin_data = {
        "email": "testadmin@depanneteliman.com",
        "password": "testadmin123",
        "first_name": "Test",
        "last_name": "Admin",
        "user_type": "admin"
    }
    
    try:
        # Créer l'utilisateur
        response = requests.post(f"{BASE_URL}/users/register/", json=admin_data)
        if response.status_code == 201:
            print("✅ Utilisateur admin créé avec succès")
            
            # Se connecter pour obtenir le token
            login_response = requests.post(f"{BASE_URL}/users/login/", json={
                "email": admin_data["email"],
                "password": admin_data["password"]
            })
            
            if login_response.status_code == 200:
                token = login_response.json().get('access')
                print("✅ Connexion réussie")
                return token
            else:
                print(f"❌ Échec de connexion: {login_response.text}")
                return None
        else:
            print(f"❌ Échec de création: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Exception: {e}")
        return None

def test_health():
    """Test de santé de l'API"""
    print_header("TEST DE SANTÉ DE L'API")
    try:
        response = requests.get(f"{BASE_URL}/depannage/api/test/health_check/")
        if response.status_code == 200:
            data = response.json()
            print("✅ API en ligne")
            print(f"   Message: {data.get('message', 'N/A')}")
            print(f"   Version: {data.get('version', 'N/A')}")
            return True
        else:
            print(f"❌ API non disponible: {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

def main():
    print_header("TEST DES STATISTIQUES - VERSION SIMPLE")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test de santé
    if not test_health():
        print("\n❌ Impossible de continuer - API non disponible")
        print("   Assurez-vous que le serveur Django est démarré: python manage.py runserver")
        sys.exit(1)
    
    # Demander le token ou créer un admin de test
    print("\nOptions:")
    print("1. Utiliser un token JWT existant")
    print("2. Créer un admin de test automatiquement")
    
    choice = input("\nVotre choix (1 ou 2): ").strip()
    
    if choice == "1":
        token = input("Entrez votre token JWT: ").strip()
        if token:
            test_with_token(token)
        else:
            print("❌ Token vide")
    elif choice == "2":
        token = create_test_admin()
        if token:
            test_with_token(token)
        else:
            print("❌ Impossible de créer l'admin de test")
    else:
        print("❌ Choix invalide")
    
    print(f"\nTest terminé à {datetime.now().strftime('%H:%M:%S')}")

if __name__ == "__main__":
    main() 