#!/usr/bin/env python3
"""
Script pour déboguer les requêtes frontend
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def test_exact_frontend_request():
    """Test exact de ce que le frontend envoie"""
    
    print("=== Test exact des requêtes frontend ===\n")
    
    # Simuler exactement ce que axios envoie
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'axios/1.6.0',
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/login'
    }
    
    # Test avec les identifiants corrects
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    print("1. Test avec identifiants corrects...")
    print(f"Headers: {headers}")
    print(f"Data: {login_data}")
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/login/", 
            json=login_data,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login réussi!")
            print(f"Access token: {data.get('access', 'Non présent')[:50]}...")
            print(f"Refresh token: {data.get('refresh', 'Non présent')[:50]}...")
        else:
            print(f"❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # Test avec des identifiants incorrects (comme le frontend pourrait faire)
    print("\n2. Test avec identifiants incorrects...")
    
    wrong_data = {
        "email": "wrong@email.com",
        "password": "wrongpassword"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/login/", 
            json=wrong_data,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
    except Exception as e:
        print(f"❌ Erreur: {e}")

def test_with_different_content_types():
    """Test avec différents Content-Type"""
    
    print("\n=== Test avec différents Content-Type ===\n")
    
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    content_types = [
        'application/json',
        'application/json; charset=utf-8',
        'text/plain',
        'application/x-www-form-urlencoded'
    ]
    
    for content_type in content_types:
        print(f"\nTest avec Content-Type: {content_type}")
        
        headers = {
            'Content-Type': content_type,
            'Accept': 'application/json'
        }
        
        try:
            if content_type == 'application/x-www-form-urlencoded':
                response = requests.post(
                    f"{BASE_URL}/users/login/", 
                    data=login_data,
                    headers=headers
                )
            else:
                response = requests.post(
                    f"{BASE_URL}/users/login/", 
                    json=login_data,
                    headers=headers
                )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                print("✅ Succès")
            else:
                print(f"❌ Échec: {response.text}")
                
        except Exception as e:
            print(f"❌ Erreur: {e}")

def test_with_empty_data():
    """Test avec des données vides ou malformées"""
    
    print("\n=== Test avec données malformées ===\n")
    
    test_cases = [
        {"name": "Données vides", "data": {}},
        {"name": "Email vide", "data": {"email": "", "password": "admin123"}},
        {"name": "Password vide", "data": {"email": "admin@depanneteliman.com", "password": ""}},
        {"name": "Email manquant", "data": {"password": "admin123"}},
        {"name": "Password manquant", "data": {"email": "admin@depanneteliman.com"}},
        {"name": "Données null", "data": {"email": None, "password": None}},
    ]
    
    for test_case in test_cases:
        print(f"\nTest: {test_case['name']}")
        print(f"Data: {test_case['data']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/users/login/", 
                json=test_case['data'],
                headers={'Content-Type': 'application/json'}
            )
            
            print(f"Status: {response.status_code}")
            print(f"Response: {response.text}")
            
        except Exception as e:
            print(f"❌ Erreur: {e}")

def test_cors_headers():
    """Test des headers CORS"""
    
    print("\n=== Test des headers CORS ===\n")
    
    # Test preflight OPTIONS
    print("1. Test preflight OPTIONS...")
    
    preflight_headers = {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
    
    try:
        response = requests.options(
            f"{BASE_URL}/users/login/",
            headers=preflight_headers
        )
        
        print(f"Preflight Status: {response.status_code}")
        print(f"CORS Headers: {dict(response.headers)}")
        
    except Exception as e:
        print(f"❌ Erreur preflight: {e}")
    
    # Test avec Origin header
    print("\n2. Test avec Origin header...")
    
    origin_headers = {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173'
    }
    
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/login/", 
            json=login_data,
            headers=origin_headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ Login réussi avec Origin header")
        else:
            print(f"❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_exact_frontend_request()
    test_with_different_content_types()
    test_with_empty_data()
    test_cors_headers() 