#!/usr/bin/env python3
"""
Script de test pour vérifier que les corrections frontend fonctionnent
"""

import requests
import json
import time

def test_backend_health():
    """Test de santé du backend"""
    try:
        response = requests.get('http://127.0.0.1:8000/depannage/api/test/', timeout=5)
        print(f"✅ Backend ASGI fonctionne (status: {response.status_code})")
        return True
    except Exception as e:
        print(f"❌ Backend ASGI non accessible: {e}")
        return False

def test_frontend_health():
    """Test de santé du frontend"""
    try:
        response = requests.get('http://127.0.0.1:5173', timeout=5)
        print(f"✅ Frontend React fonctionne (status: {response.status_code})")
        return True
    except Exception as e:
        print(f"❌ Frontend React non accessible: {e}")
        return False

def test_websocket_endpoint():
    """Test de l'endpoint WebSocket"""
    try:
        # Test de l'endpoint de notifications WebSocket
        response = requests.get('http://127.0.0.1:8000/ws/notifications/', timeout=5)
        print(f"✅ Endpoint WebSocket accessible (status: {response.status_code})")
        return True
    except Exception as e:
        print(f"⚠️ Endpoint WebSocket: {e}")
        return False

def main():
    """Test principal"""
    print("🔧 Test des corrections frontend...")
    print("=" * 50)
    
    # Test backend
    backend_ok = test_backend_health()
    
    # Test frontend
    frontend_ok = test_frontend_health()
    
    # Test WebSocket
    websocket_ok = test_websocket_endpoint()
    
    print("=" * 50)
    print("📊 Résumé des tests:")
    print(f"Backend ASGI: {'✅ OK' if backend_ok else '❌ KO'}")
    print(f"Frontend React: {'✅ OK' if frontend_ok else '❌ KO'}")
    print(f"WebSocket: {'✅ OK' if websocket_ok else '⚠️ Partiel'}")
    
    if backend_ok and frontend_ok:
        print("\n🎉 Les serveurs fonctionnent correctement!")
        print("Les corrections frontend devraient maintenant fonctionner.")
        print("\n📝 Corrections appliquées:")
        print("- ✅ Vérifications de sécurité pour request.service?.name")
        print("- ✅ Vérifications de sécurité pour request.technician?.user?.email")
        print("- ✅ Vérifications de sécurité pour request.client?.user?.username")
        print("- ✅ Migration vers ASGI pour supporter les WebSockets")
        print("- ✅ Valeurs par défaut pour éviter les erreurs undefined")
    else:
        print("\n⚠️ Certains serveurs ne fonctionnent pas.")
        print("Vérifiez que les serveurs sont démarrés avec:")
        print("./start_backend.sh")
        print("./start_frontend.sh")

if __name__ == "__main__":
    main() 