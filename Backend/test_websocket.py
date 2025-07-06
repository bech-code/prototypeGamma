#!/usr/bin/env python3
import asyncio
import websockets
import json

async def test_websocket():
    uri = "ws://127.0.0.1:8000/ws/notifications/?token=test_token"
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connexion WebSocket établie avec succès!")
            
            # Envoyer un message de test
            test_message = {"type": "test", "message": "Test WebSocket"}
            await websocket.send(json.dumps(test_message))
            print("✅ Message envoyé avec succès")
            
            # Attendre une réponse (timeout de 5 secondes)
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"✅ Réponse reçue: {response}")
            except asyncio.TimeoutError:
                print("⚠️  Aucune réponse reçue dans les 5 secondes (normal pour un test)")
                
    except websockets.exceptions.InvalidStatusCode as e:
        if e.status_code == 404:
            print("❌ Erreur 404: Le serveur ne supporte pas les WebSockets")
        else:
            print(f"❌ Erreur HTTP {e.status_code}: {e}")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")

if __name__ == "__main__":
    asyncio.run(test_websocket())
