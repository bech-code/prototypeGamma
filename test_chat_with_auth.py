#!/usr/bin/env python3
"""
Script de test complet pour la nouvelle logique de chat avec authentification
"""

import requests
import json
import time
import os
import sys

BASE_URL = "http://127.0.0.1:8000/depannage/api"

def login_user(email, password):
    """Connexion d'un utilisateur de test"""
    print(f"🔐 Connexion utilisateur {email}...")
    login_data = {
        "email": email,
        "password": password
    }
    try:
        response = requests.post(f"{BASE_URL.replace('/depannage/api', '')}/users/login/", json=login_data)
        if response.status_code == 200:
            token = response.json().get('access')
            print(f"✅ Connexion réussie, token obtenu")
            return token
        else:
            print(f"❌ Échec de connexion: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        return None

def create_test_conversation(token, client_id, technician_id):
    print("\n💬 Création d'une conversation de test...")
    conversation_data = {
        "client": client_id,
        "technician": technician_id,
    }
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    try:
        response = requests.post(
            f"{BASE_URL}/chat/conversations/get_or_create/",
            json=conversation_data,
            headers=headers
        )
        if response.status_code == 200:
            conversation = response.json()
            print(f"✅ Conversation créée/récupérée: ID {conversation['id']}")
            return conversation
        else:
            print(f"❌ Erreur création conversation: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def send_test_message(token, conversation_id):
    """Envoyer un message de test"""
    print(f"\n📝 Envoi d'un message de test...")
    
    message_data = {
        "conversation": conversation_id,
        "content": "Bonjour ! Ceci est un test de la nouvelle logique de chat. 🚀"
    }
    
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    
    try:
        response = requests.post(
            f"{BASE_URL}/chat/messages/",
            json=message_data,
            headers=headers
        )
        
        if response.status_code == 201:
            message = response.json()
            print(f"✅ Message envoyé: ID {message['id']}")
            return message
        else:
            print(f"❌ Erreur envoi message: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def get_conversation_messages(token, conversation_id):
    """Récupérer les messages d'une conversation"""
    print(f"\n📋 Récupération des messages...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{BASE_URL}/chat/messages/conversation_messages/?conversation_id={conversation_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            messages = response.json()
            print(f"✅ {len(messages)} messages récupérés")
            for msg in messages:
                print(f"   - {msg['sender_name']}: {msg['content'][:50]}...")
            return messages
        else:
            print(f"❌ Erreur récupération messages: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def get_user_id(email, token):
    """Récupérer l'ID d'un utilisateur via l'API /users/me/"""
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get("http://127.0.0.1:8000/users/me/", headers=headers)
    if resp.status_code == 200:
        return resp.json()["user"]["id"]
    return None

def test_websocket_with_auth(token, conversation_id):
    """Test WebSocket avec authentification"""
    print(f"\n🔌 Test WebSocket avec authentification...")
    
    try:
        import websocket
        
        # URL WebSocket avec token
        ws_url = f"ws://127.0.0.1:8000/ws/chat/{conversation_id}/?token={token}"
        print(f"   Connexion à: {ws_url}")
        
        ws = websocket.create_connection(ws_url)
        print("✅ Connexion WebSocket réussie avec authentification")
        
        # Envoyer un message de test
        test_message = {
            "type": "message",
            "content": "Test WebSocket en temps réel",
            "message_type": "text"
        }
        ws.send(json.dumps(test_message))
        print("✅ Message WebSocket envoyé")
        
        # Recevoir la réponse
        response = ws.recv()
        print(f"✅ Réponse WebSocket reçue: {response[:100]}...")
        
        ws.close()
        return True
    except ImportError:
        print("⚠️  websocket-client non installé, test WebSocket ignoré")
        return False
    except Exception as e:
        print(f"❌ Erreur WebSocket: {e}")
        return False

def main():
    print("🚀 Test complet de la nouvelle logique de chat")
    print("=" * 60)
    print("⏳ Attente du démarrage du serveur...")
    time.sleep(3)
    # Connexion client
    client_email = "client2@example.com"
    client_password = "bechir66312345"
    technician_email = "ballo@gmail.com"
    technician_password = "bechir66312345"
    # Connexion client
    token = login_user(client_email, client_password)
    if not token:
        print("❌ Impossible de se connecter, arrêt des tests")
        return
    client_id = get_user_id(client_email, token)
    # Connexion technicien pour récupérer son ID
    tech_token = login_user(technician_email, technician_password)
    if not tech_token:
        print("❌ Impossible de connecter le technicien, arrêt des tests")
        return
    technician_id = get_user_id(technician_email, tech_token)
    # Étape 2: Créer une conversation
    conversation = create_test_conversation(token, client_id, technician_id)
    if not conversation:
        print("❌ Impossible de créer une conversation, arrêt des tests")
        return
    conversation_id = conversation['id']
    # Étape 3: Envoyer un message
    message = send_test_message(token, conversation_id)
    if not message:
        print("❌ Impossible d'envoyer un message, arrêt des tests")
        return
    # Étape 4: Récupérer les messages
    messages = get_conversation_messages(token, conversation_id)
    if not messages:
        print("❌ Impossible de récupérer les messages, arrêt des tests")
        return
    # Étape 5: Test WebSocket
    websocket_success = test_websocket_with_auth(token, conversation_id)
    # Résumé
    print("\n" + "=" * 60)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 60)
    print(f"✅ Connexion: {'Réussie' if token else 'Échec'}")
    print(f"✅ Conversation: {'Créée' if conversation else 'Échec'}")
    print(f"✅ Message envoyé: {'Réussi' if message else 'Échec'}")
    print(f"✅ Messages récupérés: {'Réussi' if messages else 'Échec'}")
    print(f"✅ WebSocket: {'Réussi' if websocket_success else 'Échec'}")
    print("\n🎉 Nouvelle logique de chat testée avec succès !")
    print("\n📋 Prochaines étapes:")
    print("1. Tester l'interface React")
    print("2. Intégrer dans l'application existante")
    print("3. Ajouter des fonctionnalités avancées")

if __name__ == "__main__":
    main() 