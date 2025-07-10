#!/usr/bin/env python3
"""
Script pour générer en masse des notifications via WebSocket (canal notifications).
Usage : python test_mass_notifications_ws.py <token> <nombre>
"""
import sys
import asyncio
import websockets
import json
import random
import time
from datetime import datetime

TITRES = [
    "Test WS", "Alerte WS", "Notification WS", "Info WS", "Message WS"
]
MESSAGES = [
    "Ceci est un test WS.", "Notification WebSocket.", "Test temps réel.", "Message automatique.", "Rafale WS."
]
TYPES = [
    "system", "request_created", "request_assigned", "work_started", "work_completed"
]

async def main():
    if len(sys.argv) < 3:
        print("Usage : python test_mass_notifications_ws.py <token> <nombre>")
        sys.exit(1)
    token = sys.argv[1]
    nombre = int(sys.argv[2])
    ws_url = f"ws://127.0.0.1:8000/ws/notifications/?token={token}"
    async with websockets.connect(ws_url) as websocket:
        print("✅ Connexion WebSocket établie!")
        for i in range(nombre):
            data = {
                "title": random.choice(TITRES) + f" #{i+1}",
                "message": random.choice(MESSAGES) + f" ({datetime.now().isoformat()})",
                "type": random.choice(TYPES),
                "created_at": datetime.now().isoformat(),
            }
            await websocket.send(json.dumps(data))
            print(f"➡️  Message {i+1} envoyé : {data['title']}")
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=2.0)
                print(f"⬅️  Réponse reçue : {response}")
            except asyncio.TimeoutError:
                print("(Pas de réponse reçue)")
            await asyncio.sleep(0.05)

if __name__ == "__main__":
    asyncio.run(main()) 