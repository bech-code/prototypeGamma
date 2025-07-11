#!/usr/bin/env python3
"""
Script de diagnostic pour l'erreur 404 des statistiques admin
"""

import requests
import json
import sys

BASE_URL = "http://127.0.0.1:8000"

def test_backend_health():
    """Test de la santé du backend"""
    print("=== Test de santé du backend ===")
    try:
        response = requests.get(f"{BASE_URL}/depannage/api/test/health_check/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.json()}")
        return response.status_code == 200
    except Exception as e:
        print(f"Erreur: {e}")
        return False

def test_admin_login():
    """Test de connexion admin"""
    print("\n=== Test de connexion admin ===")
    try:
        # Données de test pour un admin
        login_data = {
            "email": "admin@depanneteliman.com",
            "password": "admin123"
        }
        
        response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("Connexion réussie!")
            print(f"Access token: {data.get('access', 'N/A')[:50]}...")
            print(f"Refresh token: {data.get('refresh', 'N/A')[:50]}...")
            return data.get('access')
        else:
            print(f"Erreur de connexion: {response.text}")
            return None
    except Exception as e:
        print(f"Erreur: {e}")
        return None

def test_stats_endpoint(token):
    """Test de l'endpoint des statistiques"""
    print("\n=== Test de l'endpoint des statistiques ===")
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        # Test de l'endpoint /depannage/api/dashboard/stats/
        response = requests.get(f"{BASE_URL}/depannage/api/dashboard/stats/", headers=headers)
        print(f"Endpoint /depannage/api/dashboard/stats/")
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text[:500]}...")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Endpoint fonctionne!")
            print(f"Statistiques: {json.dumps(data, indent=2)}")
        else:
            print("❌ Endpoint ne fonctionne pas")
            
        return response.status_code == 200
    except Exception as e:
        print(f"Erreur: {e}")
        return False

def test_user_info(token):
    """Test de récupération des informations utilisateur"""
    print("\n=== Test des informations utilisateur ===")
    try:
        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json"
        }
        
        response = requests.get(f"{BASE_URL}/users/me/", headers=headers)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            user = data.get('user', {})
            print(f"✅ Utilisateur connecté: {user.get('username', 'N/A')}")
            print(f"Type d'utilisateur: {user.get('user_type', 'N/A')}")
            print(f"Email: {user.get('email', 'N/A')}")
            print(f"Is staff: {user.get('is_staff', False)}")
            print(f"Is superuser: {user.get('is_superuser', False)}")
            return user.get('user_type') == 'admin'
        else:
            print(f"❌ Erreur: {response.text}")
            return False
    except Exception as e:
        print(f"Erreur: {e}")
        return False

def main():
    print("🔍 Diagnostic de l'erreur 404 des statistiques admin")
    print("=" * 60)
    
    # Test 1: Santé du backend
    if not test_backend_health():
        print("❌ Backend non accessible")
        return
    
    # Test 2: Connexion admin
    token = test_admin_login()
    if not token:
        print("❌ Impossible de se connecter en tant qu'admin")
        return
    
    # Test 3: Informations utilisateur
    is_admin = test_user_info(token)
    if not is_admin:
        print("❌ L'utilisateur n'est pas un admin")
        return
    
    # Test 4: Endpoint des statistiques
    success = test_stats_endpoint(token)
    
    print("\n" + "=" * 60)
    if success:
        print("✅ Tous les tests sont passés!")
        print("Le problème pourrait être côté frontend (token expiré, etc.)")
    else:
        print("❌ Problème détecté avec l'endpoint des statistiques")
        print("Vérifiez les permissions et la configuration du backend")

if __name__ == "__main__":
    main() 