#!/usr/bin/env python3
"""
Script pour tester les données exactes du formulaire frontend
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_form_data():
    """Test avec les données exactes du formulaire"""
    
    print("=== Test des données du formulaire frontend ===\n")
    
    # Simuler les données exactes du formulaire React
    test_cases = [
        {
            "name": "Données correctes",
            "data": {
                "email": "admin@depanneteliman.com",
                "password": "admin123"
            }
        },
        {
            "name": "Données avec espaces",
            "data": {
                "email": " admin@depanneteliman.com ",
                "password": " admin123 "
            }
        },
        {
            "name": "Données vides",
            "data": {
                "email": "",
                "password": ""
            }
        },
        {
            "name": "Email vide",
            "data": {
                "email": "",
                "password": "admin123"
            }
        },
        {
            "name": "Password vide",
            "data": {
                "email": "admin@depanneteliman.com",
                "password": ""
            }
        },
        {
            "name": "Données null",
            "data": {
                "email": None,
                "password": None
            }
        },
        {
            "name": "Données undefined",
            "data": {
                "email": "undefined",
                "password": "undefined"
            }
        }
    ]
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'axios/1.6.0',
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/login'
    }
    
    for test_case in test_cases:
        print(f"\n--- Test: {test_case['name']} ---")
        print(f"Data: {test_case['data']}")
        
        try:
            response = requests.post(
                f"{BASE_URL}/users/login/", 
                json=test_case['data'],
                headers=headers
            )
            
            print(f"Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("✅ Succès")
                print(f"Access token: {data.get('access', 'Non présent')[:50]}...")
                print(f"Refresh token: {data.get('refresh', 'Non présent')[:50]}...")
            else:
                try:
                    error_data = response.json()
                    print(f"❌ Échec: {json.dumps(error_data, indent=2)}")
                except:
                    print(f"❌ Échec: {response.text}")
                    
        except Exception as e:
            print(f"❌ Erreur: {e}")

def test_with_axios_headers():
    """Test avec les headers exacts d'axios"""
    
    print("\n=== Test avec headers axios exacts ===\n")
    
    # Headers exacts d'axios
    axios_headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'axios/1.6.0',
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/login',
        'X-Requested-With': 'XMLHttpRequest'
    }
    
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    print("Headers axios:", axios_headers)
    print("Data:", login_data)
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/login/", 
            json=login_data,
            headers=axios_headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Response headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login réussi avec headers axios!")
            print(f"Access token: {data.get('access', 'Non présent')[:50]}...")
            print(f"Refresh token: {data.get('refresh', 'Non présent')[:50]}...")
        else:
            print(f"❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_form_data()
    test_with_axios_headers() 