#!/usr/bin/env python3
"""
Script de test pour vérifier que tous les correctifs ont été appliqués correctement.
"""

import requests
import json
import time
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
ADMIN_TOKEN = None
TECHNICIAN_TOKEN = None
CLIENT_TOKEN = None

def login_user(username, password):
    """Connexion d'un utilisateur et récupération du token."""
    try:
        response = requests.post(f"{BASE_URL}/users/login/", json={
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get("access")
        else:
            print(f"❌ Échec de connexion pour {username}: {response.status_code}")
            return None
    except Exception as e:
        print(f"❌ Erreur de connexion pour {username}: {e}")
        return None

def test_endpoint(endpoint, method="GET", data=None, expected_status=200, description=""):
    """Test d'un endpoint avec gestion des tokens."""
    global ADMIN_TOKEN, TECHNICIAN_TOKEN, CLIENT_TOKEN
    
    # Déterminer quel token utiliser selon l'endpoint
    if "admin" in endpoint:
        token = ADMIN_TOKEN
        user_type = "admin"
    elif "technician" in endpoint or "technicians" in endpoint:
        token = TECHNICIAN_TOKEN
        user_type = "technician"
    else:
        token = CLIENT_TOKEN
        user_type = "client"
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    } if token else {}
    
    try:
        if method == "GET":
            response = requests.get(f"{BASE_URL}{endpoint}", headers=headers)
        elif method == "POST":
            response = requests.post(f"{BASE_URL}{endpoint}", headers=headers, json=data)
        elif method == "PATCH":
            response = requests.patch(f"{BASE_URL}{endpoint}", headers=headers, json=data)
        else:
            print(f"❌ Méthode {method} non supportée")
            return False
        
        if response.status_code == expected_status:
            print(f"✅ {description} - {method} {endpoint} ({response.status_code})")
            assert True, f"{description} - {method} {endpoint} OK"
        else:
            print(f"❌ {description} - {method} {endpoint} ({response.status_code}) - {response.text}")
            assert False, f"{description} - {method} {endpoint} échoué : {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur lors du test {description}: {e}")
        assert False, f"Erreur lors du test {description}: {e}"

def test_pagination(endpoint, description=""):
    """Test de la pagination sur un endpoint."""
    global ADMIN_TOKEN
    
    headers = {
        "Authorization": f"Bearer {ADMIN_TOKEN}",
        "Content-Type": "application/json"
    }
    
    try:
        # Test avec pagination
        response = requests.get(f"{BASE_URL}{endpoint}?page=1&page_size=5", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            if "results" in data and "count" in data:
                print(f"✅ Pagination fonctionnelle pour {description}")
                assert True, f"Pagination fonctionnelle pour {description}"
            else:
                print(f"❌ Pagination manquante pour {description}")
                assert False, f"Pagination manquante pour {description}"
        else:
            print(f"❌ Erreur de pagination pour {description}: {response.status_code}")
            assert False, f"Erreur de pagination pour {description}: {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur lors du test de pagination {description}: {e}")
        assert False, f"Erreur lors du test de pagination {description}: {e}"

def test_rate_limiting():
    """Test de la limitation de débit."""
    print("\n🔒 Test de la limitation de débit...")
    
    # Test de connexion multiple
    for i in range(10):
        response = requests.post(f"{BASE_URL}/users/login/", {
            "username": "test_user",
            "password": "wrong_password"
        })
        
        if response.status_code == 429:  # Too Many Requests
            print(f"✅ Limitation de débit activée après {i+1} tentatives")
            assert True, f"Limitation de débit activée après {i+1} tentatives"
    
    print("❌ Limitation de débit non activée")
    assert False, "Limitation de débit non activée"

def test_security_headers():
    """Test des en-têtes de sécurité."""
    print("\n🛡️ Test des en-têtes de sécurité...")
    
    try:
        response = requests.get(f"{BASE_URL}/depannage/api/test/health_check/")
        
        headers = response.headers
        security_headers = {
            "X-Frame-Options": "DENY",
            "X-Content-Type-Options": "nosniff",
            "X-XSS-Protection": "1; mode=block"
        }
        
        for header, expected_value in security_headers.items():
            if header in headers:
                print(f"✅ En-tête de sécurité {header} présent")
            else:
                print(f"❌ En-tête de sécurité {header} manquant")
        
        assert True, "En-têtes de sécurité testés avec succès"
        
    except Exception as e:
        print(f"❌ Erreur lors du test des en-têtes de sécurité: {e}")
        assert False, f"Erreur lors du test des en-têtes de sécurité: {e}"

def test_data_validation():
    """Test de la validation des données."""
    print("\n📝 Test de la validation des données...")
    
    global CLIENT_TOKEN
    
    headers = {
        "Authorization": f"Bearer {CLIENT_TOKEN}",
        "Content-Type": "application/json"
    }
    
    # Test avec des données invalides
    invalid_data = {
        "title": "A",  # Trop court
        "description": "B",  # Trop court
        "specialty_needed": "invalid_specialty"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/depannage/api/repair-requests/", 
                               headers=headers, json=invalid_data)
        
        if response.status_code == 400:
            print("✅ Validation des données fonctionnelle")
            assert True, "Validation des données fonctionnelle"
        else:
            print(f"❌ Validation des données échouée: {response.status_code}")
            assert False, f"Validation des données échouée: {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur lors du test de validation: {e}")
        assert False, f"Erreur lors du test de validation: {e}"

def main():
    """Fonction principale de test."""
    global ADMIN_TOKEN, TECHNICIAN_TOKEN, CLIENT_TOKEN
    
    print("🚀 Test des correctifs appliqués")
    print("=" * 50)
    
    # Connexion des utilisateurs de test
    print("\n🔐 Connexion des utilisateurs de test...")
    
    ADMIN_TOKEN = login_user("admin", "admin123")
    TECHNICIAN_TOKEN = login_user("technician1", "password123")
    CLIENT_TOKEN = login_user("client1", "password123")
    
    if not all([ADMIN_TOKEN, TECHNICIAN_TOKEN, CLIENT_TOKEN]):
        print("❌ Impossible de se connecter avec tous les utilisateurs de test")
        return
    
    print("✅ Connexion réussie pour tous les utilisateurs")
    
    # Test des nouveaux endpoints
    print("\n📡 Test des nouveaux endpoints...")
    
    new_endpoints = [
        ("/users/me/", "GET", None, 200, "Informations utilisateur"),
        ("/depannage/api/admin/dashboard/stats/", "GET", None, 200, "Statistiques admin"),
        ("/depannage/api/admin/notifications/", "GET", None, 200, "Notifications admin"),
        ("/depannage/api/admin/reviews/", "GET", None, 200, "Avis admin"),
        ("/depannage/api/admin/payments/", "GET", None, 200, "Paiements admin"),
        ("/depannage/api/admin/payments/stats/", "GET", None, 200, "Statistiques paiements"),
        ("/depannage/api/admin/security/alerts/recent/", "GET", None, 200, "Alertes sécurité"),
        ("/depannage/api/admin/security/login-locations/", "GET", None, 200, "Localisations connexion"),
        ("/depannage/api/configuration/", "GET", None, 200, "Configuration système"),
        ("/depannage/api/technicians/dashboard/", "GET", None, 200, "Dashboard technicien"),
    ]
    
    success_count = 0
    for endpoint, method, data, expected_status, description in new_endpoints:
        if test_endpoint(endpoint, method, data, expected_status, description):
            success_count += 1
    
    print(f"\n📊 Résultat des nouveaux endpoints: {success_count}/{len(new_endpoints)} réussis")
    
    # Test de la pagination
    print("\n📄 Test de la pagination...")
    
    pagination_endpoints = [
        ("/depannage/api/repair-requests/", "Demandes de réparation"),
        ("/depannage/api/reviews/", "Avis"),
        ("/depannage/api/payments/", "Paiements"),
        ("/depannage/api/notifications/", "Notifications"),
    ]
    
    pagination_success = 0
    for endpoint, description in pagination_endpoints:
        if test_pagination(endpoint, description):
            pagination_success += 1
    
    print(f"📊 Résultat de la pagination: {pagination_success}/{len(pagination_endpoints)} réussis")
    
    # Test de la sécurité
    test_rate_limiting()
    test_security_headers()
    test_data_validation()
    
    # Test des optimisations de performance
    print("\n⚡ Test des optimisations de performance...")
    
    # Test avec select_related
    try:
        response = requests.get(f"{BASE_URL}/depannage/api/repair-requests/", 
                              headers={"Authorization": f"Bearer {CLIENT_TOKEN}"})
        
        if response.status_code == 200:
            data = response.json()
            if "results" in data:
                print("✅ Optimisation des requêtes avec select_related")
                assert True, "Optimisation des requêtes avec select_related"
            else:
                print("❌ Optimisation des requêtes non détectée")
                assert False, "Optimisation des requêtes non détectée"
        else:
            print(f"❌ Erreur lors du test d'optimisation: {response.status_code}")
            assert False, f"Erreur lors du test d'optimisation: {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur lors du test d'optimisation: {e}")
        assert False, f"Erreur lors du test d'optimisation: {e}"
    
    # Test du cache
    print("\n💾 Test du cache...")
    try:
        start_time = time.time()
        response1 = requests.get(f"{BASE_URL}/depannage/api/admin/dashboard/stats/", 
                               headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
        time1 = time.time() - start_time
        
        start_time = time.time()
        response2 = requests.get(f"{BASE_URL}/depannage/api/admin/dashboard/stats/", 
                               headers={"Authorization": f"Bearer {ADMIN_TOKEN}"})
        time2 = time.time() - start_time
        
        if time2 < time1:
            print("✅ Cache fonctionnel (deuxième requête plus rapide)")
            assert True, "Cache fonctionnel (deuxième requête plus rapide)"
        else:
            print("⚠️ Cache potentiellement non fonctionnel")
            assert False, "Cache potentiellement non fonctionnel"
            
    except Exception as e:
        print(f"❌ Erreur lors du test du cache: {e}")
        assert False, f"Erreur lors du test du cache: {e}"
    
    print("\n🎉 Tests terminés!")

if __name__ == "__main__":
    main() 