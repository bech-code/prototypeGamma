#!/usr/bin/env python3
"""
Script de test pour diagnostiquer les notifications admin.
"""
import requests
import sys

API_BASE = "http://127.0.0.1:8000"
LOGIN_URL = f"{API_BASE}/users/login/"
ADMIN_NOTIFICATIONS_URL = f"{API_BASE}/depannage/api/admin-notifications/"
ADMIN_NOTIFICATIONS_ALT_URL = f"{API_BASE}/depannage/api/admin/notifications/"

ADMIN_EMAIL = "mohamedbechirdiarra4@gmail.com"
ADMIN_USERNAME = "depan_use"
ADMIN_PASSWORD = "bechir66312345"


def get_token():
    print("🔐 Connexion admin...")
    data = {"username": ADMIN_USERNAME, "email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    try:
        resp = requests.post(LOGIN_URL, json=data)
        if resp.status_code != 200:
            print(f"❌ Erreur de connexion ({resp.status_code}): {resp.text}")
            sys.exit(1)
        token = resp.json().get("access")
        if not token:
            print(f"❌ Token non reçu: {resp.text}")
            sys.exit(1)
        print("✅ Connexion réussie, token reçu.")
        return token
    except Exception as e:
        print(f"❌ Exception lors de la connexion: {e}")
        sys.exit(1)


def test_admin_notifications(token):
    print("\n📋 Test des notifications admin...")
    headers = {"Authorization": f"Bearer {token}"}
    
    # Test 1: Endpoint ViewSet
    print("\n1. Test endpoint ViewSet (/depannage/api/admin-notifications/):")
    try:
        resp = requests.get(ADMIN_NOTIFICATIONS_URL, headers=headers)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Données reçues: {len(data)} notifications")
            if data:
                print(f"   Exemple: {data[0]}")
            else:
                print("   Aucune notification trouvée")
        else:
            print(f"   Erreur: {resp.text}")
    except Exception as e:
        print(f"   Exception: {e}")
    
    # Test 2: Endpoint fonction
    print("\n2. Test endpoint fonction (/depannage/api/admin/notifications/):")
    try:
        resp = requests.get(ADMIN_NOTIFICATIONS_ALT_URL, headers=headers)
        print(f"   Status: {resp.status_code}")
        if resp.status_code == 200:
            data = resp.json()
            print(f"   Données reçues: {len(data)} notifications")
            if data:
                print(f"   Exemple: {data[0]}")
            else:
                print("   Aucune notification trouvée")
        else:
            print(f"   Erreur: {resp.text}")
    except Exception as e:
        print(f"   Exception: {e}")


def create_test_notification():
    """Créer une notification de test pour vérifier le fonctionnement"""
    print("\n🔧 Création d'une notification de test...")
    
    # Connexion admin
    token = get_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    # Créer une notification de test
    notification_data = {
        "title": "Test Notification Admin",
        "message": "Ceci est une notification de test pour vérifier le fonctionnement",
        "severity": "info"
    }
    
    try:
        resp = requests.post(ADMIN_NOTIFICATIONS_URL, json=notification_data, headers=headers)
        print(f"   Status création: {resp.status_code}")
        if resp.status_code == 201:
            print("   ✅ Notification de test créée avec succès")
            # Retester l'endpoint
            test_admin_notifications(token)
        else:
            print(f"   ❌ Erreur création: {resp.text}")
    except Exception as e:
        print(f"   ❌ Exception création: {e}")


def main():
    token = get_token()
    test_admin_notifications(token)
    
    # Demander si on veut créer une notification de test
    print("\n" + "="*50)
    print("DIAGNOSTIC TERMINÉ")
    print("="*50)
    
    if input("\nVoulez-vous créer une notification de test ? (y/n): ").lower() == 'y':
        create_test_notification()


if __name__ == "__main__":
    main() 