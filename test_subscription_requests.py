#!/usr/bin/env python3
"""
Test script pour vérifier l'endpoint des demandes d'abonnement
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SUBSCRIPTION_REQUESTS_URL = f"{BASE_URL}/depannage/api/subscription-requests/"

def test_subscription_requests():
    """Test de l'endpoint des demandes d'abonnement"""
    
    print("🔒 Test des demandes d'abonnement")
    print("=" * 50)
    
    # 1. Connexion admin
    print("\n1. Connexion administrateur...")
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123456"
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access')
            print(f"   ✅ Connexion réussie")
            print(f"   Token: {access_token[:50]}...")
        else:
            print(f"   ❌ Échec de connexion: {login_response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return False
    
    # 2. Test de l'endpoint des demandes d'abonnement
    print("\n2. Test de l'endpoint des demandes d'abonnement...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(SUBSCRIPTION_REQUESTS_URL, headers=headers)
        print(f"   Status: {response.status_code}")
        print(f"   URL: {SUBSCRIPTION_REQUESTS_URL}")
        
        if response.status_code == 200:
            data = response.json()
            requests_list = data.get('results', []) if 'results' in data else data
            print(f"   ✅ Succès - {len(requests_list)} demandes trouvées")
            
            if requests_list:
                print("\n   Demandes récentes:")
                for i, req in enumerate(requests_list[:3], 1):
                    technician = req.get('technician', {})
                    tech_name = technician.get('user', {}).get('username', 'N/A') if technician else 'N/A'
                    print(f"   {i}. Technicien: {tech_name} - Statut: {req.get('status', 'N/A')}")
            else:
                print("   ℹ️  Aucune demande d'abonnement")
                
        elif response.status_code == 403:
            print("   ❌ Accès interdit - L'utilisateur n'est pas admin")
        elif response.status_code == 401:
            print("   ❌ Non autorisé - Token invalide")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur de requête: {e}")
        return False
    
    return True

def test_subscription_validation():
    """Test de validation d'une demande d'abonnement"""
    
    print("\n🔍 Test de validation d'une demande d'abonnement")
    print("=" * 50)
    
    # 1. Connexion admin
    print("\n1. Connexion administrateur...")
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123456"
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access')
            print(f"   ✅ Connexion réussie")
        else:
            print(f"   ❌ Échec de connexion: {login_response.text}")
            return False
            
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return False
    
    # 2. Récupérer la liste des demandes
    print("\n2. Récupération des demandes...")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.get(SUBSCRIPTION_REQUESTS_URL, headers=headers)
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            requests_list = data.get('results', []) if 'results' in data else data
            
            if requests_list:
                # Prendre la première demande pour le test
                first_request = requests_list[0]
                request_id = first_request.get('id')
                
                print(f"   ✅ {len(requests_list)} demandes trouvées")
                print(f"   Test avec la demande ID: {request_id}")
                
                # 3. Test de validation
                print("\n3. Test de validation...")
                validation_url = f"{SUBSCRIPTION_REQUESTS_URL}{request_id}/validate_payment/"
                validation_data = {
                    "action": "approve",
                    "notes": "Test d'approbation automatique"
                }
                
                validation_response = requests.post(validation_url, headers=headers, json=validation_data)
                print(f"   Status: {validation_response.status_code}")
                
                if validation_response.status_code == 200:
                    print("   ✅ Validation réussie")
                else:
                    print(f"   ❌ Erreur de validation: {validation_response.text}")
                    
            else:
                print("   ℹ️  Aucune demande disponible pour le test")
                
        elif response.status_code == 403:
            print("   ❌ Accès interdit - L'utilisateur n'est pas admin")
        elif response.status_code == 401:
            print("   ❌ Non autorisé - Token invalide")
        else:
            print(f"   ❌ Erreur: {response.text}")
            
    except Exception as e:
        print(f"   ❌ Erreur de requête: {e}")
        return False
    
    return True

if __name__ == "__main__":
    print("🚀 Test des endpoints de demandes d'abonnement")
    print("=" * 60)
    
    # Test des demandes d'abonnement
    requests_success = test_subscription_requests()
    
    # Test de validation
    validation_success = test_subscription_validation()
    
    print("\n" + "=" * 60)
    print("📊 Résumé des tests:")
    print(f"   Demandes d'abonnement: {'✅' if requests_success else '❌'}")
    print(f"   Validation: {'✅' if validation_success else '❌'}")
    
    if requests_success:
        print("\n🎉 L'endpoint des demandes d'abonnement fonctionne!")
        sys.exit(0)
    else:
        print("\n⚠️  L'endpoint des demandes d'abonnement a des problèmes")
        sys.exit(1) 