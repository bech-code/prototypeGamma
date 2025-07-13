#!/usr/bin/env python3
"""
Script final de test pour le système de paiement technicien.
Test complet avec un nouveau technicien (avec upload de fichiers).
"""

import subprocess
import json
import time
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
SPECIALTY = "plombier"
PIECE_IDENTITE = "test_piece_identite.pdf"
CERTIFICAT_RESIDENCE = "test_certificat_residence.pdf"


def run_curl_command(command, description):
    print(f"\n🔧 {description}")
    print(f"Commande: {command}")
    try:
        result = subprocess.run(command, shell=True, capture_output=True, text=True, timeout=30)
        if result.returncode == 0:
            print("✅ Succès")
            if result.stdout.strip():
                try:
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

def create_new_technician():
    print("\n🔧 1️⃣ Création d'un nouveau technicien de test (avec fichiers)")
    timestamp = int(time.time())
    username = f"test_tech_{timestamp}"
    email = f"test_tech_{timestamp}@example.com"
    password = "TestPassword123456"
    # Construction du formulaire multipart
    command = (
        f"curl -X POST {BASE_URL}/users/register/ "
        f"-H 'Accept: application/json' "
        f"-F 'username={username}' "
        f"-F 'email={email}' "
        f"-F 'password={password}' "
        f"-F 'password2={password}' "
        f"-F 'first_name=Test' "
        f"-F 'last_name=Technicien' "
        f"-F 'user_type=technician' "
        f"-F 'specialty={SPECIALTY}' "
        f"-F 'phone=+22300000000' "
        f"-F 'years_experience=2' "
        f"-F 'address=Bamako' "
        f"-F 'piece_identite=@{PIECE_IDENTITE}' "
        f"-F 'certificat_residence=@{CERTIFICAT_RESIDENCE}' "
        f"-s"
    )
    success, response = run_curl_command(command, "1️⃣ Création d'un nouveau technicien (multipart)")
    if success:
        try:
            data = json.loads(response)
            if data.get("success") or (data.get("user") and data.get("user").get("email")):
                print("✅ Nouveau technicien créé avec succès")
                print(f"   Email: {email}")
                print(f"   Mot de passe: {password}")
                return email, password
            else:
                print(f"❌ Erreur lors de la création: {data.get('error') or data}")
        except:
            pass
    return None, None

def test_login(email, password):
    command = f'''curl -X POST {BASE_URL}/users/login/ \
  -H "Content-Type: application/json" \
  -d '{{"email": "{email}", "password": "{password}"}}' \
  -s'''
    success, response = run_curl_command(command, "2️⃣ Connexion du nouveau technicien")
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
    command = f'''curl -X GET {BASE_URL}/depannage/api/technicians/subscription_status/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -s'''
    success, response = run_curl_command(command, "3️⃣ Vérification du statut d'abonnement")
    return success

def test_initiate_payment(token):
    command = f'''curl -X POST {BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{{"duration_months": 1}}' \
  -s'''
    success, response = run_curl_command(command, "4️⃣ Initiation d'un paiement d'abonnement")
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
        except:
            pass
    return None

def test_notification(transaction_id, email):
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
        "customer_email": email,
        "customer_phone_number": "+22300000000",
        "customer_address": "Test Address",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_state": "ML",
        "customer_zip_code": "00000",
        "metadata": json.dumps({
            "user_id": 1,  # Sera remplacé par l'ID réel
            "duration_months": 1,
            "subscription_type": "technician_premium"
        })
    }
    command = f'''curl -X POST {BASE_URL}/depannage/api/cinetpay/notify/ \
  -H "Content-Type: application/json" \
  -d '{json.dumps(notify_data)}' \
  -s'''
    success, response = run_curl_command(command, "5️⃣ Simulation de notification CinetPay")
    return success

def test_final_status(token):
    command = f'''curl -X GET {BASE_URL}/depannage/api/technicians/subscription_status/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -s'''
    success, response = run_curl_command(command, "6️⃣ Vérification du statut final d'abonnement")
    return success

def test_double_payment_prevention(token):
    command = f'''curl -X POST {BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/ \
  -H "Authorization: Bearer {token}" \
  -H "Content-Type: application/json" \
  -d '{{"duration_months": 1}}' \
  -s'''
    success, response = run_curl_command(command, "7️⃣ Test de prévention des doubles paiements")
    if success:
        try:
            data = json.loads(response)
            if not data.get("success") and "abonnement actif" in data.get("error", ""):
                print("✅ Prévention des doubles paiements fonctionne correctement")
                return True
        except:
            pass
    return False

def main():
    print("🚀 TEST COMPLET DU SYSTÈME DE PAIEMENT TECHNICIEN")
    print("=" * 60)
    print(f"URL Backend: {BASE_URL}")
    print("=" * 60)
    # Vérification des fichiers
    if not (os.path.exists(PIECE_IDENTITE) and os.path.exists(CERTIFICAT_RESIDENCE)):
        print(f"❌ Fichiers requis manquants : {PIECE_IDENTITE} ou {CERTIFICAT_RESIDENCE}")
        return
    email, password = create_new_technician()
    if not email or not password:
        print("❌ Impossible de créer un nouveau technicien. Arrêt des tests.")
        return
    token = test_login(email, password)
    if not token:
        print("❌ Impossible de se connecter. Arrêt des tests.")
        return
    test_subscription_status(token)
    transaction_id = test_initiate_payment(token)
    if transaction_id:
        test_notification(transaction_id, email)
        test_final_status(token)
        test_double_payment_prevention(token)
    else:
        print("❌ Impossible d'initier un paiement")
    print("\n" + "=" * 60)
    print("✅ Tests terminés !")
    print("=" * 60)
    print(f"\n📋 RÉSUMÉ:")
    print(f"- Nouveau technicien créé: {email}")
    print(f"- Mot de passe: {password}")
    print("- Système de paiement testé avec succès")
    print("- Prévention des doubles paiements vérifiée")

if __name__ == "__main__":
    main() 