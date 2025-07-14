#!/usr/bin/env python3
"""
Script de test pour la nouvelle logique de chat
"""

import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000/depannage/api"

def test_health_check():
    """Test de santé de l'API"""
    try:
        response = requests.get(f"{BASE_URL}/test/health_check/")
        print(f"✅ Health check: {response.status_code}")
        if response.status_code == 200:
            print(f"   Réponse: {response.json()}")
        assert response.status_code == 200, "New chat system health check failed"
        return response.status_code == 200
    except Exception as e:
        print(f"❌ Erreur health check: {e}")
        return False

def test_chat_endpoints():
    """Test des endpoints de chat"""
    print("\n🧪 Test des endpoints de chat...")
    
    # Test 1: Vérifier que les endpoints existent
    endpoints_to_test = [
        "/chat/conversations/",
        "/chat/messages/",
        "/chat/attachments/",
    ]
    
    for endpoint in endpoints_to_test:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            print(f"✅ {endpoint}: {response.status_code}")
        except Exception as e:
            print(f"❌ {endpoint}: {e}")

def test_websocket_connection():
    """Test de connexion WebSocket"""
    print("\n🔌 Test de connexion WebSocket...")
    try:
        import websocket
        ws = websocket.create_connection("ws://127.0.0.1:8000/ws/chat/1/")
        print("✅ Connexion WebSocket réussie")
        ws.close()
    except ImportError:
        print("⚠️  websocket-client non installé, test WebSocket ignoré")
    except Exception as e:
        print(f"❌ Erreur WebSocket: {e}")

def main():
    print("🚀 Test de la nouvelle logique de chat")
    print("=" * 50)
    
    # Attendre que le serveur démarre
    print("⏳ Attente du démarrage du serveur...")
    time.sleep(5)
    
    # Test 1: Health check
    if not test_health_check():
        print("❌ Le serveur n'est pas accessible")
        return
    
    # Test 2: Endpoints de chat
    test_chat_endpoints()
    
    # Test 3: WebSocket
    test_websocket_connection()
    
    print("\n✅ Tests terminés !")
    print("\n📋 Prochaines étapes:")
    print("1. Créer un utilisateur de test")
    print("2. Créer une conversation")
    print("3. Envoyer des messages")
    print("4. Tester l'interface React")

if __name__ == "__main__":
    main() 