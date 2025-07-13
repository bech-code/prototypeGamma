#!/usr/bin/env python3
"""
Script de test simple pour le système de paiement technicien.
Utilise curl pour tester les endpoints API.
"""

import subprocess
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"

def run_curl_command(command, description):
    """Exécute une commande curl et affiche le résultat."""
    print(f"\n🔧 {description}")
    print(f"Commande: {command}")
    
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        
        if result.returncode == 0:
            print("✅ Succès")
            if result.stdout.strip():
                try:
                    # Essayer de formater le JSON
                    data = json.loads(result.stdout)
                    print(f"Réponse: {json.dumps(data, indent=2, ensure_ascii=False)}")
                except:
                    print(f"Réponse: {result.stdout}")
        else:
            print(f"❌ Erreur: {result.stderr}")
            
        return result.returncode == 0, result.stdout
        
    except subprocess.TimeoutExpired:
        print("❌ Timeout")
        return False, ""
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return False, ""

def test_login():
    """Test de connexion du technicien."""
    command = f'''curl -X POST {BASE_URL}/users/login/ \\
  -H "Content-Type: application/json" \\
  -d '{{"email": "{TECHNICIAN_EMAIL}", "password": "{TECHNICIAN_PASSWORD}"}}' \\
  -s'''
    
    success, response = run_curl_command(command, "1️⃣ Connexion du technicien")
    
    if success:
        try:
            data = json.loads(response)
            token = data.get("access")
            if token:
                print(f"✅ Token obtenu: {token[:20]}...")
                return token
        except:
            pass
    
    return None

def test_subscription_status(token):
    """Test de vérification du statut d'abonnement."""
    command = f'''curl -X GET {BASE_URL}/depannage/api/technicians/subscription_status/ \\
  -H "Authorization: Bearer {token}" \\
  -H "Content-Type: application/json" \\
  -s'''
    
    success, response = run_curl_command(command, "2️⃣ Vérification du statut d'abonnement")
    return success

def test_initiate_payment(token):
    """Test d'initiation d'un paiement."""
    command = f'''curl -X POST {BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/ \\
  -H "Authorization: Bearer {token}" \\
  -H "Content-Type: application/json" \\
  -d '{{"duration_months": 1}}' \\
  -s'''
    
    success, response = run_curl_command(command, "3️⃣ Initiation d'un paiement d'abonnement")
    
    if success:
        try:
            data = json.loads(response)
            if data.get("success"):
                transaction_id = data.get("transaction_id")
                payment_url = data.get("payment_url")
                print(f"✅ Transaction ID: {transaction_id}")
                print(f"✅ URL de paiement: {payment_url}")
                return transaction_id
            else:
                error = data.get("error", "Erreur inconnue")
                print(f"❌ Erreur: {error}")
                if "abonnement actif" in error:
                    print("ℹ️ Le technicien a déjà un abonnement actif")
        except:
            pass
    
    return None

def test_notification(transaction_id):
    """Test de simulation de notification CinetPay."""
    if not transaction_id:
        print("❌ Pas de transaction ID pour tester la notification")
        return False
    
    notify_data = {
        "transaction_id": transaction_id,
        "status": "ACCEPTED",
        "payment_token": f"test_token_{transaction_id}",
        "amount": 5000,
        "currency": "XOF",
        "payment_date": datetime.now().isoformat(),
        "customer_name": "Test Technicien",
        "customer_surname": "",
        "customer_email": TECHNICIAN_EMAIL,
        "customer_phone_number": "+22300000000",
        "customer_address": "Test Address",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_state": "ML",
        "customer_zip_code": "00000",
        "metadata": json.dumps({
            "user_id": 1,
            "duration_months": 1,
            "subscription_type": "technician_premium"
        })
    }
    
    command = f'''curl -X POST {BASE_URL}/depannage/api/cinetpay/notify/ \\
  -H "Content-Type: application/json" \\
  -d '{json.dumps(notify_data)}' \\
  -s'''
    
    success, response = run_curl_command(command, "4️⃣ Simulation de notification CinetPay")
    return success

def test_final_status(token):
    """Test de vérification du statut final."""
    command = f'''curl -X GET {BASE_URL}/depannage/api/technicians/subscription_status/ \\
  -H "Authorization: Bearer {token}" \\
  -H "Content-Type: application/json" \\
  -s'''
    
    success, response = run_curl_command(command, "5️⃣ Vérification du statut final d'abonnement")
    return success

def main():
    """Fonction principale de test."""
    print("🚀 TEST DU SYSTÈME DE PAIEMENT TECHNICIEN")
    print("=" * 50)
    print(f"Technicien: {TECHNICIAN_EMAIL}")
    print(f"URL Backend: {BASE_URL}")
    print("=" * 50)
    
    # Test 1: Connexion
    token = test_login()
    if not token:
        print("❌ Impossible de se connecter. Arrêt des tests.")
        return
    
    # Test 2: Statut initial
    test_subscription_status(token)
    
    # Test 3: Initiation paiement
    transaction_id = test_initiate_payment(token)
    
    # Test 4: Notification (si transaction créée)
    if transaction_id:
        test_notification(transaction_id)
        
        # Test 5: Statut final
        test_final_status(token)
    else:
        print("ℹ️ Pas de nouvelle transaction créée (abonnement actif probablement)")
    
    print("\n" + "=" * 50)
    print("✅ Tests terminés !")
    print("=" * 50)

if __name__ == "__main__":
    main() 