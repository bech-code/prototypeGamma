#!/usr/bin/env python3
"""
Script pour générer en masse des notifications pour un utilisateur donné.
Usage : python test_mass_notifications.py <user_id> <nombre> <token>
"""
import sys
import requests
import random
import time
from datetime import datetime

API_URL = 'http://127.0.0.1:8000/depannage/api/notifications/'

TITRES = [
    "Test notification", "Alerte système", "Nouvelle demande", "Info", "Message important"
]
MESSAGES = [
    "Ceci est un test.", "Veuillez vérifier votre compte.", "Nouvelle action requise.", "Notification automatique.", "Test de charge."
]
TYPES = [
    "system", "request_created", "request_assigned", "work_started", "work_completed"
]

def main():
    if len(sys.argv) < 4:
        print("Usage : python test_mass_notifications.py <user_id> <nombre> <token>")
        sys.exit(1)
    user_id = int(sys.argv[1])
    nombre = int(sys.argv[2])
    token = sys.argv[3]
    headers = {"Authorization": f"Bearer {token}"}
    for i in range(nombre):
        data = {
            "recipient": user_id,
            "title": random.choice(TITRES) + f" #{i+1}",
            "message": random.choice(MESSAGES) + f" ({datetime.now().isoformat()})",
            "type": random.choice(TYPES),
        }
        r = requests.post(API_URL, json=data, headers=headers)
        if r.status_code == 201:
            print(f"✅ Notification {i+1} créée")
        else:
            print(f"❌ Erreur création notification {i+1}: {r.status_code} {r.text}")
        time.sleep(0.05)  # Pour éviter de surcharger le backend

if __name__ == "__main__":
    main() 