#!/usr/bin/env python3
"""
Script de test pour le système de géolocalisation en temps réel
Teste les WebSockets et les fonctionnalités de suivi
"""

import asyncio
import websockets
import json
import time
import random
from datetime import datetime

class RealTimeTrackingTester:
    def __init__(self):
        self.base_url = "ws://127.0.0.1:8000"
        self.test_token = "test_token_123"  # Token de test
        
    async def test_request_tracking_websocket(self, request_id: int):
        """Teste le WebSocket de suivi de demande"""
        print(f"\n🔍 Test du suivi de demande #{request_id}")
        
        uri = f"{self.base_url}/ws/request-tracking/{request_id}/?token={self.test_token}"
        
        try:
            async with websockets.connect(uri) as websocket:
                print("✅ Connexion WebSocket établie")
                
                # Simuler une mise à jour de position client
                client_location = {
                    "type": "location_update",
                    "user_type": "client",
                    "latitude": 12.6392 + random.uniform(-0.01, 0.01),
                    "longitude": -8.0029 + random.uniform(-0.01, 0.01),
                    "timestamp": datetime.now().isoformat()
                }
                
                await websocket.send(json.dumps(client_location))
                print("📍 Position client envoyée")
                
                # Attendre une réponse
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    print(f"📨 Réponse reçue: {response}")
                except asyncio.TimeoutError:
                    print("⚠️  Aucune réponse reçue (normal pour un test)")
                
                # Simuler une mise à jour de position technicien
                technician_location = {
                    "type": "location_update",
                    "user_type": "technician",
                    "latitude": 12.6392 + random.uniform(-0.02, 0.02),
                    "longitude": -8.0029 + random.uniform(-0.02, 0.02),
                    "timestamp": datetime.now().isoformat()
                }
                
                await websocket.send(json.dumps(technician_location))
                print("📍 Position technicien envoyée")
                
                # Simuler une mise à jour de statut
                status_update = {
                    "type": "status_update",
                    "status": "in_progress",
                    "timestamp": datetime.now().isoformat()
                }
                
                await websocket.send(json.dumps(status_update))
                print("📊 Mise à jour de statut envoyée")
                
        except websockets.exceptions.InvalidStatusCode as e:
            print(f"❌ Erreur HTTP {e.status_code}: {e}")
        except Exception as e:
            print(f"❌ Erreur de connexion: {e}")
    
    async def test_technician_location_websocket(self, technician_id: int):
        """Teste le WebSocket de localisation technicien"""
        print(f"\n🔍 Test de localisation technicien #{technician_id}")
        
        uri = f"{self.base_url}/ws/technician-tracking/{technician_id}/?token={self.test_token}"
        
        try:
            async with websockets.connect(uri) as websocket:
                print("✅ Connexion WebSocket établie")
                
                # Simuler plusieurs mises à jour de position
                for i in range(3):
                    location_data = {
                        "latitude": 12.6392 + random.uniform(-0.01, 0.01),
                        "longitude": -8.0029 + random.uniform(-0.01, 0.01)
                    }
                    
                    await websocket.send(json.dumps(location_data))
                    print(f"📍 Position {i+1} envoyée: {location_data}")
                    
                    await asyncio.sleep(2)
                
        except Exception as e:
            print(f"❌ Erreur: {e}")
    
    async def test_client_location_websocket(self, client_id: int):
        """Teste le WebSocket de localisation client"""
        print(f"\n🔍 Test de localisation client #{client_id}")
        
        uri = f"{self.base_url}/ws/client-tracking/{client_id}/?token={self.test_token}"
        
        try:
            async with websockets.connect(uri) as websocket:
                print("✅ Connexion WebSocket établie")
                
                # Simuler une mise à jour de position
                location_data = {
                    "latitude": 12.6392 + random.uniform(-0.005, 0.005),
                    "longitude": -8.0029 + random.uniform(-0.005, 0.005)
                }
                
                await websocket.send(json.dumps(location_data))
                print(f"📍 Position client envoyée: {location_data}")
                
        except Exception as e:
            print(f"❌ Erreur: {e}")
    
    async def test_notifications_websocket(self):
        """Teste le WebSocket de notifications"""
        print(f"\n🔍 Test des notifications")
        
        uri = f"{self.base_url}/ws/notifications/?token={self.test_token}"
        
        try:
            async with websockets.connect(uri) as websocket:
                print("✅ Connexion WebSocket établie")
                
                # Envoyer une notification de test
                notification_data = {
                    "title": "Test de géolocalisation",
                    "message": "Le système de suivi en temps réel fonctionne correctement",
                    "type": "system",
                    "created_at": datetime.now().isoformat()
                }
                
                await websocket.send(json.dumps(notification_data))
                print("📢 Notification envoyée")
                
                # Attendre une réponse
                try:
                    response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                    print(f"📨 Réponse reçue: {response}")
                except asyncio.TimeoutError:
                    print("⚠️  Aucune réponse reçue (normal pour un test)")
                
        except Exception as e:
            print(f"❌ Erreur: {e}")
    
    async def run_all_tests(self):
        """Exécute tous les tests"""
        print("🚀 Démarrage des tests de géolocalisation en temps réel")
        print("=" * 60)
        
        # Test des notifications
        await self.test_notifications_websocket()
        
        # Test de localisation technicien
        await self.test_technician_location_websocket(1)
        
        # Test de localisation client
        await self.test_client_location_websocket(1)
        
        # Test de suivi de demande
        await self.test_request_tracking_websocket(1)
        
        print("\n" + "=" * 60)
        print("✅ Tests terminés")
        print("\n📋 Résumé des fonctionnalités testées:")
        print("   • WebSocket de notifications")
        print("   • WebSocket de localisation technicien")
        print("   • WebSocket de localisation client")
        print("   • WebSocket de suivi de demande")
        print("   • Envoi de positions GPS")
        print("   • Mise à jour de statuts")
        print("\n🎯 Prochaines étapes:")
        print("   1. Tester avec un vrai token JWT")
        print("   2. Vérifier la persistance en base de données")
        print("   3. Tester l'interface utilisateur")
        print("   4. Vérifier les calculs de distance et ETA")

async def main():
    tester = RealTimeTrackingTester()
    await tester.run_all_tests()

if __name__ == "__main__":
    asyncio.run(main()) 