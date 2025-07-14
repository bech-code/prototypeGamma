#!/usr/bin/env python3
import asyncio
import websockets
import json
import pytest

@pytest.mark.asyncio
async def test_websocket():
    uri = "ws://127.0.0.1:8000/ws/notifications/?token=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzUyNDk5MTM1LCJpYXQiOjE3NTI0OTU1MzUsImp0aSI6Ijk0NGZlMzYyY2QxMDQzMWI5MGQzZmI5NzU1ZmRhMmM2IiwidXNlcl9pZCI6Mn0.MBj4qKd5dmtJsXHAoVSQG7AUE6xj9lXWxDH2kdzdEMQ"
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
            pytest.fail("Erreur 404: Le serveur ne supporte pas les WebSockets")
        else:
            pytest.fail(f"Erreur HTTP {e.status_code}: {e}")
    except Exception as e:
        pytest.fail(f"Erreur de connexion WebSocket: {e}")
