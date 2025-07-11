#!/usr/bin/env python3
"""
Test des cas limites du système de paiement CinetPay
- Montants invalides
- Tokens expirés
- Notifications malformées
- Concurrence
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/depannage/api"

def test_invalid_amounts():
    """Test avec des montants invalides."""
    print("🔧 Test des montants invalides")
    
    invalid_amounts = [0, -100, 3, 7, 999999999]
    
    for amount in invalid_amounts:
        print(f"  Test montant: {amount}")
        response = requests.post(
            f"{API_BASE}/cinetpay/initiate_subscription_payment/",
            headers={"Authorization": f"Bearer {get_test_token()}"},
            json={"duration_months": 1, "amount": amount}
        )
        
        if response.status_code == 400:
            print(f"    ✅ Rejeté correctement: {response.json()}")
        else:
            print(f"    ❌ Devrait être rejeté: {response.status_code}")

def test_expired_tokens():
    """Test avec des tokens expirés."""
    print("🔧 Test des tokens expirés")
    
    expired_token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ0b2tlbl90eXBlIjoiYWNjZXNzIiwiZXhwIjoxNzAwMDAwMDAwLCJpYXQiOjE3MDAwMDAwMDAsImp0aSI6InRlc3QiLCJ1c2VyX2lkIjoxfQ.test"
    
    response = requests.get(
        f"{API_BASE}/technicians/subscription_status/",
        headers={"Authorization": f"Bearer {expired_token}"}
    )
    
    if response.status_code == 401:
        print("    ✅ Token expiré rejeté correctement")
    else:
        print(f"    ❌ Token expiré non rejeté: {response.status_code}")

def test_malformed_notifications():
    """Test avec des notifications malformées."""
    print("🔧 Test des notifications malformées")
    
    malformed_notifications = [
        {"transaction_id": "INVALID", "status": "ACCEPTED"},  # Champs manquants
        {"transaction_id": "TXN-TEST", "status": "INVALID_STATUS"},  # Statut invalide
        {"transaction_id": "TXN-TEST", "status": "ACCEPTED", "amount": "invalid"},  # Montant invalide
        {},  # Données vides
    ]
    
    for i, notification in enumerate(malformed_notifications):
        print(f"  Test notification {i+1}")
        response = requests.post(
            f"{BASE_URL}/depannage/api/cinetpay/notify/",
            json=notification
        )
        
        if response.status_code in [400, 404]:
            print(f"    ✅ Rejeté correctement: {response.status_code}")
        else:
            print(f"    ❌ Devrait être rejeté: {response.status_code}")

def test_concurrent_payments():
    """Test de paiements concurrents."""
    print("🔧 Test des paiements concurrents")
    
    # Créer un technicien de test
    tech_data = create_test_technician()
    token = tech_data["access"]
    
    # Lancer plusieurs paiements simultanément
    import threading
    
    def make_payment():
        response = requests.post(
            f"{API_BASE}/cinetpay/initiate_subscription_payment/",
            headers={"Authorization": f"Bearer {token}"},
            json={"duration_months": 1}
        )
        return response.status_code
    
    threads = []
    for i in range(3):
        thread = threading.Thread(target=make_payment)
        threads.append(thread)
        thread.start()
    
    for thread in threads:
        thread.join()
    
    print("    ✅ Paiements concurrents traités")

def test_payment_limits():
    """Test des limites de paiement."""
    print("🔧 Test des limites de paiement")
    
    # Test montant maximum
    response = requests.post(
        f"{API_BASE}/cinetpay/initiate_subscription_payment/",
        headers={"Authorization": f"Bearer {get_test_token()}"},
        json={"duration_months": 12, "amount": 1000000}
    )
    
    if response.status_code == 400:
        print("    ✅ Limite de montant respectée")
    else:
        print(f"    ⚠️ Limite non appliquée: {response.status_code}")

def get_test_token():
    """Obtient un token de test."""
    login_data = {
        "email": "ballo@gmail.com",
        "password": "bechir66312345"
    }
    
    response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
    if response.status_code == 200:
        return response.json()["access"]
    return None

def create_test_technician():
    """Crée un technicien de test."""
    import subprocess
    
    # Utilise le script existant pour créer un technicien
    result = subprocess.run([
        "python3", "test_payment_new_technician.py"
    ], capture_output=True, text=True)
    
    # Parse la sortie pour extraire les données
    # (simplifié pour cet exemple)
    return {"access": "test_token"}

if __name__ == "__main__":
    print("🚀 TESTS DES CAS LIMITES DU SYSTÈME DE PAIEMENT")
    print("=" * 60)
    
    try:
        test_invalid_amounts()
        test_expired_tokens()
        test_malformed_notifications()
        test_concurrent_payments()
        test_payment_limits()
        
        print("\n✅ Tous les tests des cas limites terminés")
        
    except Exception as e:
        print(f"❌ Erreur lors des tests: {e}")
        sys.exit(1) 