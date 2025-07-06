#!/usr/bin/env python3
import asyncio
import websockets
import json
import sys

async def test_websocket(token=None):
    if not token:
        print("🔑 Veuillez entrer votre token JWT d'accès :")
        print("   (Vous pouvez le trouver dans le stockage local de votre navigateur)")
        token = input("Token: ").strip()
        
        if not token:
            print("❌ Aucun token fourni. Arrêt du test.")
            return
    
    uri = f"ws://127.0.0.1:8000/ws/notifications/?token={token}"
    
    print(f"🔗 Tentative de connexion WebSocket à : {uri}")
    print("⏳ Connexion en cours...")
    
    try:
        async with websockets.connect(uri) as websocket:
            print("✅ Connexion WebSocket établie avec succès!")
            print("📡 Le serveur ASGI fonctionne correctement pour les WebSockets")
            
            # Envoyer un message de test
            test_message = {"type": "test", "message": "Test WebSocket"}
            await websocket.send(json.dumps(test_message))
            print("✅ Message de test envoyé avec succès")
            
            # Attendre une réponse (timeout de 5 secondes)
            try:
                response = await asyncio.wait_for(websocket.recv(), timeout=5.0)
                print(f"✅ Réponse reçue: {response}")
            except asyncio.TimeoutError:
                print("⚠️  Aucune réponse reçue dans les 5 secondes (normal pour un test)")
                
    except websockets.exceptions.InvalidStatusCode as e:
        if e.status_code == 403:
            print("❌ Erreur 403 (Forbidden): Token invalide ou expiré")
            print("💡 Vérifiez que votre token JWT est valide et non expiré")
        elif e.status_code == 404:
            print("❌ Erreur 404: Le serveur ne supporte pas les WebSockets")
            print("💡 Assurez-vous d'utiliser un serveur ASGI (Daphne/Uvicorn)")
        else:
            print(f"❌ Erreur HTTP {e.status_code}: {e}")
    except websockets.exceptions.ConnectionClosed as e:
        print(f"❌ Connexion fermée: {e}")
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        print("💡 Vérifiez que le serveur backend est démarré avec un serveur ASGI")

def main():
    print("🧪 Test de connexion WebSocket pour les notifications")
    print("=" * 50)
    
    # Vérifier si un token est fourni en argument
    token = None
    if len(sys.argv) > 1:
        token = sys.argv[1]
        print(f"🔑 Token fourni en argument de ligne de commande")
    
    asyncio.run(test_websocket(token))
    
    print("\n" + "=" * 50)
    print("📝 Instructions pour trouver votre token JWT :")
    print("1. Connectez-vous sur votre application web")
    print("2. Ouvrez les outils de développement (F12)")
    print("3. Allez dans l'onglet 'Application' > 'Stockage local'")
    print("4. Cherchez une clé nommée 'access_token', 'token', ou similaire")
    print("5. Copiez la valeur et utilisez-la comme argument :")
    print("   python test_websocket.py VOTRE_TOKEN_ICI")

if __name__ == "__main__":
    main() 