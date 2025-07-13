#!/usr/bin/env python3
"""
Script de test pour valider la connexion admin et la présence du champ 'location' dans les logs d'audit.
"""
import requests
import sys

API_BASE = "http://127.0.0.1:8000"
LOGIN_URL = f"{API_BASE}/users/login/"
AUDIT_LOG_URL = f"{API_BASE}/depannage/api/admin/audit-logs/"

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
        # Correction ici : récupérer le token dans 'access'
        token = resp.json().get("access")
        if not token:
            print(f"❌ Token non reçu: {resp.text}")
            sys.exit(1)
        print("✅ Connexion réussie, token reçu.")
        return token
    except Exception as e:
        print(f"❌ Exception lors de la connexion: {e}")
        sys.exit(1)

def test_audit_logs(token):
    print("\n📋 Récupération des logs d'audit...")
    headers = {"Authorization": f"Bearer {token}"}
    try:
        resp = requests.get(AUDIT_LOG_URL, headers=headers)
        if resp.status_code != 200:
            print(f"❌ Erreur lors de la récupération des logs ({resp.status_code}): {resp.text}")
            sys.exit(1)
        logs = resp.json()
        if not isinstance(logs, list):
            print(f"❌ Format inattendu pour les logs: {logs}")
            sys.exit(1)
        print(f"✅ {len(logs)} logs récupérés.")
        # Vérifier la présence du champ 'location'
        missing_location = [log for log in logs if 'location' not in log]
        if missing_location:
            print(f"❌ {len(missing_location)} logs sans champ 'location'. Exemple: {missing_location[0]}")
        else:
            print("✅ Tous les logs contiennent le champ 'location'.")
        # Afficher un exemple de log
        if logs:
            print("\nExemple de log :")
            for k, v in logs[0].items():
                print(f"  {k}: {v}")
    except Exception as e:
        print(f"❌ Exception lors de la récupération des logs: {e}")
        sys.exit(1)

def main():
    token = get_token()
    test_audit_logs(token)

if __name__ == "__main__":
    main() 