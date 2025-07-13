#!/usr/bin/env python3
"""
Script de test simple pour diagnostiquer le problème d'authentification du chat
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000/depannage/api"

def test_login():
    """Test de connexion simple"""
    print("🔐 Test de connexion...")
    login_data = {
        "email": "client2@example.com",
        "password": "client123"
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/users/login/", 
            json=login_data
        )
        print(f"Status: {response.status_code}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            token = response.json().get('access')
            print(f"✅ Token obtenu: {token[:20]}...")
            return token
        else:
            print("❌ Échec de connexion")
            return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def get_technician_id(token, technician_email):
    """Récupère l'ID du technicien à partir de son email (supporte pagination DRF)"""
    print(f"🔎 Recherche de l'ID du technicien pour {technician_email}...")
    headers = {"Authorization": f"Bearer {token}"}
    url = f"{BASE_URL}/technicians/"
    found = False
    page = 1
    while not found:
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                tech_list = data.get('results') if isinstance(data, dict) and 'results' in data else data
                print(f"📋 Techniciens page {page} : {[t.get('email') for t in tech_list]}")
                for tech in tech_list:
                    if tech.get('email') == technician_email:
                        print(f"✅ Technicien trouvé: id={tech['id']}")
                        return tech['id']
                # Pagination DRF
                next_url = data.get('next') if isinstance(data, dict) else None
                if next_url:
                    url = next_url
                    page += 1
                else:
                    break
            else:
                print(f"❌ Erreur récupération techniciens: {response.status_code}")
                print(f"   Réponse: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return None
    print("❌ Technicien non trouvé dans la liste complète")
    return None

def get_technician_id_as_admin(admin_token, technician_email):
    """Récupère l'ID du technicien à partir de son email en utilisant un token admin"""
    print(f"🔎 Recherche de l'ID du technicien pour {technician_email} (en tant qu'admin)...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    url = f"{BASE_URL}/technicians/"
    found = False
    page = 1
    while not found:
        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 200:
                data = response.json()
                tech_list = data.get('results') if isinstance(data, dict) and 'results' in data else data
                print(f"📋 Techniciens page {page} : {[t.get('user', {}).get('email') for t in tech_list]}")
                for tech in tech_list:
                    user_email = tech.get('user', {}).get('email')
                    if user_email == technician_email:
                        print(f"✅ Technicien trouvé: id={tech['id']}")
                        return tech['id']
                # Pagination DRF
                next_url = data.get('next') if isinstance(data, dict) else None
                if next_url:
                    url = next_url
                    page += 1
                else:
                    break
            else:
                print(f"❌ Erreur récupération techniciens: {response.status_code}")
                print(f"   Réponse: {response.text}")
                return None
        except Exception as e:
            print(f"❌ Erreur: {e}")
            return None
    print("❌ Technicien non trouvé dans la liste complète")
    return None

def login_admin():
    """Connexion d'un administrateur pour récupérer les IDs des techniciens"""
    print(f"🔐 Connexion administrateur...")
    login_data = {
        "email": "testadmin@example.com",
        "password": "admin123"
    }
    try:
        response = requests.post(
            "http://127.0.0.1:8000/users/login/", 
            json=login_data
        )
        if response.status_code == 200:
            token = response.json().get('access')
            print(f"✅ Connexion admin réussie, token obtenu")
            return token
        else:
            print(f"❌ Échec de connexion admin: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur de connexion admin: {e}")
        return None

def test_chat_endpoint(token, client_id, technician_id):
    """Test de l'endpoint de chat avec authentification"""
    print(f"\n💬 Test de l'endpoint de chat...")
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    data = {
        "client_id": client_id,
        "technician_id": technician_id
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/conversations/get_or_create_explicit/",
            json=data,
            headers=headers
        )
        
        print(f"Status: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            print("✅ Endpoint fonctionne !")
            return True
        else:
            print("❌ Endpoint échoue")
            return False
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False

def test_other_endpoints(token):
    """Test d'autres endpoints pour vérifier l'authentification"""
    print(f"\n🔍 Test d'autres endpoints...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test endpoint de profil utilisateur
    try:
        response = requests.get(
            f"{BASE_URL}/technicians/me/",
            headers=headers
        )
        print(f"Me endpoint - Status: {response.status_code}")
        print(f"Me endpoint - Response: {response.text[:100]}...")
    except Exception as e:
        print(f"❌ Erreur me endpoint: {e}")

def main():
    print("🚀 Test de diagnostic du système de chat")
    print("=" * 50)
    
    # Test 1: Connexion client
    token = test_login()
    if not token:
        print("❌ Impossible de se connecter, arrêt des tests")
        return
    
    # Récupérer l'ID du client connecté
    client_email = "client2@example.com"
    client_id = None
    try:
        response = requests.post(
            "http://127.0.0.1:8000/users/login/", 
            json={"email": client_email, "password": "client123"}
        )
        if response.status_code == 200:
            client_id = response.json().get('user', {}).get('id')
            print(f"✅ ID du client connecté: {client_id}")
    except Exception as e:
        print(f"❌ Erreur récupération ID client: {e}")
        return
    if not client_id:
        print("❌ Impossible de récupérer l'ID du client, arrêt des tests")
        return
    
    # Utiliser directement l'ID du technicien trouvé dans la base
    technician_id = 87  # ID de ballo@gmail.com
    print(f"✅ ID du technicien (ballo@gmail.com): {technician_id}")
    
    # Test 2: Autres endpoints
    test_other_endpoints(token)
    
    # Test 3: Endpoint de chat
    success = test_chat_endpoint(token, client_id, technician_id)
    
    print("\n" + "=" * 50)
    print("📊 RÉSUMÉ")
    print("=" * 50)
    print(f"✅ Connexion: {'Réussie' if token else 'Échec'}")
    print(f"✅ Chat endpoint: {'Réussi' if success else 'Échec'}")

if __name__ == "__main__":
    main() 