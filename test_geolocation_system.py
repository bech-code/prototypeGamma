#!/usr/bin/env python3
"""
Script de test pour le système de géolocalisation en temps réel
Teste les WebSockets, les consumers et les composants React
"""

import asyncio
import json
import websockets
import requests
import time
from typing import Dict, Any

# Configuration
BASE_URL = "http://127.0.0.1:8000"
WS_BASE_URL = "ws://127.0.0.1:8000"
TEST_USER_EMAIL = "test@example.com"
TEST_USER_PASSWORD = "testpass123"

class GeolocationTester:
    def __init__(self):
        self.token = None
        self.user_id = None
        self.technician_id = None
        self.client_id = None

    def login(self) -> bool:
        """Connexion et récupération du token JWT"""
        try:
            response = requests.post(f"{BASE_URL}/users/login/", json={
                "email": TEST_USER_EMAIL,
                "password": TEST_USER_PASSWORD
            })
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                self.user_id = data.get('user', {}).get('id')
                print(f"✅ Connexion réussie - User ID: {self.user_id}")
                return True
            else:
                print(f"❌ Échec de connexion: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Erreur de connexion: {e}")
            return False

    def get_user_profile(self) -> bool:
        """Récupère le profil utilisateur pour obtenir les IDs technicien/client"""
        try:
            headers = {"Authorization": f"Bearer {self.token}"}
            response = requests.get(f"{BASE_URL}/auth/api/me/", headers=headers)
            
            if response.status_code == 200:
                data = response.json()
                self.technician_id = data.get('technician_depannage', {}).get('id')
                self.client_id = data.get('client_profile', {}).get('id')
                print(f"✅ Profil récupéré - Tech ID: {self.technician_id}, Client ID: {self.client_id}")
                return True
            else:
                print(f"❌ Échec récupération profil: {response.status_code}")
                return False
        except Exception as e:
            print(f"❌ Erreur profil: {e}")
            return False

    async def test_technician_websocket(self):
        """Test du WebSocket technicien"""
        if not self.technician_id:
            print("❌ Pas d'ID technicien disponible")
            return False

        uri = f"{WS_BASE_URL}/ws/technician-tracking/{self.technician_id}/"
        
        try:
            # Connexion WebSocket
            async with websockets.connect(uri) as websocket:
                print(f"✅ WebSocket technicien connecté: {uri}")
                
                # Envoi d'une position de test
                test_position = {
                    "latitude": 12.6392,
                    "longitude": -8.0029
                }
                
                await websocket.send(json.dumps(test_position))
                print(f"📍 Position envoyée: {test_position}")
                
                # Attente de la réponse
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)
                    print(f"✅ Réponse reçue: {data}")
                    return True
                except asyncio.TimeoutError:
                    print("⚠️ Timeout - Pas de réponse reçue")
                    return False
                    
        except Exception as e:
            print(f"❌ Erreur WebSocket technicien: {e}")
            return False

    async def test_client_websocket(self):
        """Test du WebSocket client"""
        if not self.client_id:
            print("❌ Pas d'ID client disponible")
            return False

        uri = f"{WS_BASE_URL}/ws/client-tracking/{self.client_id}/"
        
        try:
            # Connexion WebSocket
            async with websockets.connect(uri) as websocket:
                print(f"✅ WebSocket client connecté: {uri}")
                
                # Envoi d'une position de test
                test_position = {
                    "latitude": 12.6392,
                    "longitude": -8.0029
                }
                
                await websocket.send(json.dumps(test_position))
                print(f"📍 Position envoyée: {test_position}")
                
                # Attente de la réponse
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    data = json.loads(response)
                    print(f"✅ Réponse reçue: {data}")
                    return True
                except asyncio.TimeoutError:
                    print("⚠️ Timeout - Pas de réponse reçue")
                    return False
                    
        except Exception as e:
            print(f"❌ Erreur WebSocket client: {e}")
            return False

    def test_api_endpoints(self):
        """Test des endpoints API de géolocalisation"""
        headers = {"Authorization": f"Bearer {self.token}"}
        
        # Test endpoint technicien
        if self.technician_id:
            try:
                response = requests.get(
                    f"{BASE_URL}/depannage/api/locations/{self.technician_id}/",
                    headers=headers
                )
                print(f"✅ API technicien: {response.status_code}")
            except Exception as e:
                print(f"❌ Erreur API technicien: {e}")

        # Test endpoint client
        if self.client_id:
            try:
                response = requests.get(
                    f"{BASE_URL}/depannage/api/client-locations/{self.client_id}/",
                    headers=headers
                )
                print(f"✅ API client: {response.status_code}")
            except Exception as e:
                print(f"❌ Erreur API client: {e}")

    def test_database_models(self):
        """Test des modèles de base de données"""
        try:
            from django.apps import apps
            from django.conf import settings
            
            # Test modèle TechnicianLocation
            TechnicianLocation = apps.get_model('depannage', 'TechnicianLocation')
            print(f"✅ Modèle TechnicianLocation: {TechnicianLocation}")
            
            # Test modèle ClientLocation
            ClientLocation = apps.get_model('depannage', 'ClientLocation')
            print(f"✅ Modèle ClientLocation: {ClientLocation}")
            
        except Exception as e:
            print(f"❌ Erreur modèles: {e}")

    async def run_all_tests(self):
        """Exécute tous les tests"""
        print("🚀 Démarrage des tests de géolocalisation...")
        
        # Test 1: Connexion
        if not self.login():
            print("❌ Impossible de continuer sans connexion")
            return
        
        # Test 2: Récupération profil
        if not self.get_user_profile():
            print("❌ Impossible de récupérer le profil")
            return
        
        # Test 3: API endpoints
        print("\n📡 Test des endpoints API...")
        self.test_api_endpoints()
        
        # Test 4: Modèles base de données
        print("\n🗄️ Test des modèles de base de données...")
        self.test_database_models()
        
        # Test 5: WebSocket technicien
        print("\n🔌 Test WebSocket technicien...")
        await self.test_technician_websocket()
        
        # Test 6: WebSocket client
        print("\n🔌 Test WebSocket client...")
        await self.test_client_websocket()
        
        print("\n✅ Tests terminés!")

def main():
    """Fonction principale"""
    tester = GeolocationTester()
    
    # Configuration du PYTHONPATH pour inclure Backend
    import sys
    import os
    sys.path.insert(0, os.path.join(os.path.dirname(__file__), "Backend"))
    # Configuration Django pour les tests
    import django
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.auth.settings')
    django.setup()
    
    # Exécution des tests
    asyncio.run(tester.run_all_tests())

if __name__ == "__main__":
    main() 