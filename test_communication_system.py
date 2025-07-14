#!/usr/bin/env python3
"""
Script de test pour le système de communication entre client et technicien
"""

import requests
import json
import time
import websocket
import threading
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
WS_BASE_URL = "ws://127.0.0.1:8000"

# Tokens de test (à remplacer par des vrais tokens)
CLIENT_TOKEN = "your_client_token_here"
TECHNICIAN_TOKEN = "your_technician_token_here"

class CommunicationTester:
    def __init__(self):
        self.client_ws = None
        self.technician_ws = None
        self.conversation_id = None
        self.request_id = None
        
    def get_auth_headers(self, token):
        return {
            'Authorization': f'Bearer {token}',
            'Content-Type': 'application/json'
        }
    
    def test_api_endpoints(self):
        """Test des endpoints API de communication"""
        print("🔍 Test des endpoints API...")
        
        # Test 1: Récupérer les conversations
        try:
            response = requests.get(
                f"{BASE_URL}/depannage/api/chat/conversations/",
                headers=self.get_auth_headers(CLIENT_TOKEN)
            )
            print(f"✅ Conversations: {response.status_code}")
            if response.status_code == 200:
                conversations = response.json()
                print(f"   📊 {len(conversations)} conversations trouvées")
        except Exception as e:
            print(f"❌ Erreur conversations: {e}")
        
        # Test 2: Créer une conversation
        try:
            response = requests.post(
                f"{BASE_URL}/depannage/api/chat/conversations/get_or_create/",
                headers=self.get_auth_headers(CLIENT_TOKEN),
                json={
                    'other_user_id': 2,  # ID du technicien
                    'request_id': 1
                }
            )
            print(f"✅ Création conversation: {response.status_code}")
            if response.status_code == 200:
                data = response.json()
                self.conversation_id = data['id']
                print(f"   💬 Conversation créée: {self.conversation_id}")
        except Exception as e:
            print(f"❌ Erreur création conversation: {e}")
        
        # Test 3: Envoyer un message
        if self.conversation_id:
            try:
                response = requests.post(
                    f"{BASE_URL}/depannage/api/chat/messages/",
                    headers=self.get_auth_headers(CLIENT_TOKEN),
                    json={
                        'conversation': self.conversation_id,
                        'content': 'Test message from client',
                        'message_type': 'text'
                    }
                )
                print(f"✅ Envoi message: {response.status_code}")
            except Exception as e:
                print(f"❌ Erreur envoi message: {e}")
        
        # Test 4: Statistiques de communication
        try:
            response = requests.get(
                f"{BASE_URL}/depannage/api/chat/stats/?request_id=1",
                headers=self.get_auth_headers(CLIENT_TOKEN)
            )
            print(f"✅ Statistiques: {response.status_code}")
            if response.status_code == 200:
                stats = response.json()
                print(f"   📈 Messages totaux: {stats.get('total_messages', 0)}")
                print(f"   📈 Messages non lus: {stats.get('unread_messages', 0)}")
        except Exception as e:
            print(f"❌ Erreur statistiques: {e}")
    
    def test_websocket_connection(self):
        """Test des connexions WebSocket"""
        print("\n🔌 Test des connexions WebSocket...")
        
        if not self.conversation_id:
            print("❌ Pas de conversation ID disponible")
            return
        
        # Test connexion client
        try:
            self.client_ws = websocket.WebSocketApp(
                f"{WS_BASE_URL}/ws/chat/{self.conversation_id}/?token={CLIENT_TOKEN}",
                on_open=lambda ws: print("✅ WebSocket client connecté"),
                on_message=lambda ws, msg: print(f"📨 Message client reçu: {msg}"),
                on_error=lambda ws, error: print(f"❌ Erreur WebSocket client: {error}"),
                on_close=lambda ws, close_status_code, close_msg: print("🔌 WebSocket client fermé")
            )
            
            # Démarrer dans un thread séparé
            client_thread = threading.Thread(target=self.client_ws.run_forever)
            client_thread.daemon = True
            client_thread.start()
            
            time.sleep(2)  # Attendre la connexion
            
        except Exception as e:
            print(f"❌ Erreur connexion WebSocket client: {e}")
        
        # Test connexion technicien
        try:
            self.technician_ws = websocket.WebSocketApp(
                f"{WS_BASE_URL}/ws/chat/{self.conversation_id}/?token={TECHNICIAN_TOKEN}",
                on_open=lambda ws: print("✅ WebSocket technicien connecté"),
                on_message=lambda ws, msg: print(f"📨 Message technicien reçu: {msg}"),
                on_error=lambda ws, error: print(f"❌ Erreur WebSocket technicien: {error}"),
                on_close=lambda ws, close_status_code, close_msg: print("🔌 WebSocket technicien fermé")
            )
            
            # Démarrer dans un thread séparé
            technician_thread = threading.Thread(target=self.technician_ws.run_forever)
            technician_thread.daemon = True
            technician_thread.start()
            
            time.sleep(2)  # Attendre la connexion
            
        except Exception as e:
            print(f"❌ Erreur connexion WebSocket technicien: {e}")
    
    def test_message_exchange(self):
        """Test de l'échange de messages"""
        print("\n💬 Test de l'échange de messages...")
        
        if not self.client_ws or not self.technician_ws:
            print("❌ WebSockets non connectés")
            return
        
        # Message du client
        try:
            client_message = {
                'type': 'message',
                'content': 'Bonjour technicien, j\'ai un problème urgent !',
                'message_type': 'text'
            }
            self.client_ws.send(json.dumps(client_message))
            print("✅ Message client envoyé")
            time.sleep(1)
        except Exception as e:
            print(f"❌ Erreur envoi message client: {e}")
        
        # Message du technicien
        try:
            technician_message = {
                'type': 'message',
                'content': 'Bonjour client, je suis en route !',
                'message_type': 'text'
            }
            self.technician_ws.send(json.dumps(technician_message))
            print("✅ Message technicien envoyé")
            time.sleep(1)
        except Exception as e:
            print(f"❌ Erreur envoi message technicien: {e}")
        
        # Test indicateur de frappe
        try:
            typing_message = {
                'type': 'typing',
                'is_typing': True
            }
            self.client_ws.send(json.dumps(typing_message))
            print("✅ Indicateur de frappe envoyé")
            time.sleep(2)
        except Exception as e:
            print(f"❌ Erreur indicateur de frappe: {e}")
    
    def test_location_sharing(self):
        """Test du partage de localisation"""
        print("\n📍 Test du partage de localisation...")
        
        if not self.client_ws:
            print("❌ WebSocket client non connecté")
            return
        
        try:
            location_message = {
                'type': 'location',
                'latitude': 12.6508,
                'longitude': -8.0000
            }
            self.client_ws.send(json.dumps(location_message))
            print("✅ Message de localisation envoyé")
        except Exception as e:
            print(f"❌ Erreur partage localisation: {e}")
    
    def test_voice_message(self):
        """Test des messages vocaux"""
        print("\n🎤 Test des messages vocaux...")
        
        # Simuler un fichier audio
        try:
            with open('test_audio.wav', 'wb') as f:
                f.write(b'fake_audio_data')
            
            files = {'file': open('test_audio.wav', 'rb')}
            data = {
                'conversation': self.conversation_id,
                'content': 'Message vocal test',
                'message_type': 'voice'
            }
            
            response = requests.post(
                f"{BASE_URL}/depannage/api/chat/messages/send_voice/",
                headers={'Authorization': f'Bearer {CLIENT_TOKEN}'},
                data=data,
                files=files
            )
            print(f"✅ Message vocal: {response.status_code}")
            
        except Exception as e:
            print(f"❌ Erreur message vocal: {e}")
    
    def test_communication_dashboard(self):
        """Test du tableau de bord de communication"""
        print("\n📊 Test du tableau de bord de communication...")
        
        try:
            response = requests.get(
                f"{BASE_URL}/depannage/api/chat/dashboard/",
                headers=self.get_auth_headers(CLIENT_TOKEN)
            )
            print(f"✅ Tableau de bord: {response.status_code}")
            if response.status_code == 200:
                dashboard = response.json()
                print(f"   📈 Conversations totales: {dashboard.get('total_conversations', 0)}")
                print(f"   📈 Conversations non lues: {dashboard.get('unread_conversations', 0)}")
        except Exception as e:
            print(f"❌ Erreur tableau de bord: {e}")
    
    def cleanup(self):
        """Nettoyage des connexions"""
        print("\n🧹 Nettoyage...")
        
        if self.client_ws:
            self.client_ws.close()
        if self.technician_ws:
            self.technician_ws.close()
        
        # Supprimer le fichier de test
        try:
            import os
            if os.path.exists('test_audio.wav'):
                os.remove('test_audio.wav')
        except:
            pass
    
    def run_all_tests(self):
        """Exécuter tous les tests"""
        print("🚀 Démarrage des tests de communication")
        print("=" * 50)
        
        try:
            self.test_api_endpoints()
            self.test_websocket_connection()
            self.test_message_exchange()
            self.test_location_sharing()
            self.test_voice_message()
            self.test_communication_dashboard()
            
            print("\n✅ Tous les tests terminés")
            
        except Exception as e:
            print(f"❌ Erreur générale: {e}")
        
        finally:
            self.cleanup()

def main():
    """Fonction principale"""
    print("🔧 Test du système de communication client-technicien")
    print("=" * 60)
    
    # Vérifier les tokens
    if CLIENT_TOKEN == "your_client_token_here" or TECHNICIAN_TOKEN == "your_technician_token_here":
        print("⚠️  Veuillez configurer les tokens dans le script")
        print("   CLIENT_TOKEN et TECHNICIAN_TOKEN")
        return
    
    tester = CommunicationTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main() 