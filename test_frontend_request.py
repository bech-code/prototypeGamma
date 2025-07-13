#!/usr/bin/env python3
"""
Script pour simuler exactement les requêtes du frontend
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_frontend_simulation():
    """Simule exactement ce que le frontend envoie"""
    
    print("=== Simulation des requêtes frontend ===\n")
    
    # 1. Test avec les mêmes headers que le frontend
    print("1. Test avec headers frontend...")
    
    headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/login/", 
            json=login_data,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Headers de réponse: {dict(response.headers)}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login réussi!")
            print(f"Access token: {data.get('access', 'Non présent')[:50]}...")
            print(f"Refresh token: {data.get('refresh', 'Non présent')[:50]}...")
        else:
            print(f"❌ Échec: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # 2. Test avec axios simulation
    print("\n2. Test avec simulation axios...")
    
    # Simuler les headers axios
    axios_headers = {
        'Content-Type': 'application/json',
        'Accept': 'application/json, text/plain, */*',
        'User-Agent': 'axios/1.6.0'
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/login/", 
            json=login_data,
            headers=axios_headers
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login réussi avec axios headers!")
        else:
            print(f"❌ Échec avec axios headers: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    # 3. Test avec fetch simulation
    print("\n3. Test avec simulation fetch...")
    
    # Simuler les headers fetch
    fetch_headers = {
        'Content-Type': 'application/json',
        'Accept': '*/*',
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/login/", 
            json=login_data,
            headers=fetch_headers
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login réussi avec fetch headers!")
        else:
            print(f"❌ Échec avec fetch headers: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

def test_cors_preflight():
    """Test des requêtes CORS preflight"""
    
    print("\n=== Test CORS Preflight ===\n")
    
    # Simuler une requête OPTIONS (preflight)
    headers = {
        'Origin': 'http://localhost:5173',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type, Authorization'
    }
    
    try:
        response = requests.options(
            f"{BASE_URL}/users/login/",
            headers=headers
        )
        
        print(f"Preflight Status: {response.status_code}")
        print(f"Preflight Headers: {dict(response.headers)}")
        
        if response.status_code == 200:
            print("✅ CORS preflight réussi")
        else:
            print("❌ CORS preflight échoué")
            
    except Exception as e:
        print(f"❌ Erreur CORS: {e}")

def test_with_origin_header():
    """Test avec header Origin"""
    
    print("\n=== Test avec header Origin ===\n")
    
    headers = {
        'Content-Type': 'application/json',
        'Origin': 'http://localhost:5173',
        'Referer': 'http://localhost:5173/login'
    }
    
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/users/login/", 
            json=login_data,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Login réussi avec Origin header!")
        else:
            print(f"❌ Échec avec Origin header: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur: {e}")

if __name__ == "__main__":
    test_frontend_simulation()
    test_cors_preflight()
    test_with_origin_header() 