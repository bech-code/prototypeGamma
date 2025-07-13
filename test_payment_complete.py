#!/usr/bin/env python3
"""
Script complet pour tester le système de paiement CinetPay en mode simulateur.
"""

import os
import sys
import subprocess
import requests
import json
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SUBSCRIPTION_PAYMENT_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"
NOTIFY_URL = f"{BASE_URL}/depannage/api/cinetpay/notify/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"

TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"


def start_backend():
    """Démarre le backend Django."""
    print("🚀 Démarrage du backend Django...")
    
    try:
        # Vérifier si le serveur est déjà en cours d'exécution
        response = requests.get(f"{BASE_URL}/depannage/api/health_check/", timeout=5)
        if response.status_code == 200:
            print("✅ Backend déjà en cours d'exécution")
            return True
    except:
        pass
    
    # Démarrer le backend
    try:
        process = subprocess.Popen(
            ["./start_backend.sh"],
            cwd="/Users/mohamedbechirdiarra/Downloads/Prototype5b",
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Attendre un peu que le serveur démarre
        import time
        time.sleep(3)
        
        # Vérifier si le serveur est démarré
        try:
            response = requests.get(f"{BASE_URL}/depannage/api/health_check/", timeout=5)
            if response.status_code == 200:
                print("✅ Backend démarré avec succès")
                return True
        except:
            pass
        
        print("⚠️ Backend non accessible, mais continuons le test...")
        return False
        
    except Exception as e:
        print(f"❌ Erreur lors du démarrage du backend: {e}")
        return False


def test_payment_simulation():
    """Test complet du système de paiement en mode simulateur."""
    print("\n🧪 TEST DU SYSTÈME DE PAIEMENT CINETPAY (MODE SIMULATEUR)")
    print("=" * 70)
    
    # 1. Connexion technicien
    print("\n1️⃣ Connexion du technicien...")
    login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data, timeout=10)
        
        if login_response.status_code != 200:
            print(f"❌ Échec de connexion: {login_response.status_code}")
            print(login_response.text)
            return False
        
        token = login_response.json().get("access")
        headers = {"Authorization": f"Bearer {token}"}
        print("✅ Connexion réussie")
        
    except requests.exceptions.RequestException as e:
        print(f"❌ Erreur de connexion: {e}")
        return False

    # 2. Vérifier le statut d'abonnement actuel
    print("\n2️⃣ Vérification du statut d'abonnement actuel...")
    try:
        status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers, timeout=10)
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"📊 Statut actuel: {status_data}")
        else:
            print(f"⚠️ Erreur lors de la vérification du statut: {status_response.status_code}")
    except Exception as e:
        print(f"⚠️ Erreur lors de la vérification: {e}")

    # 3. Initier un paiement d'abonnement
    print("\n3️⃣ Initiation d'un paiement d'abonnement...")
    payment_data = {
        "duration_months": 1,
        "amount": 5000,
        "description": "Test d'abonnement technicien"
    }
    
    try:
        payment_response = requests.post(SUBSCRIPTION_PAYMENT_URL, json=payment_data, headers=headers, timeout=10)
        
        if payment_response.status_code != 200:
            print(f"❌ Échec d'initiation du paiement: {payment_response.status_code}")
            print(payment_response.text)
            return False
        
        payment_info = payment_response.json()
        transaction_id = payment_info.get("transaction_id")
        payment_url = payment_info.get("payment_url")
        
        print(f"✅ Paiement initié avec succès")
        print(f"   Transaction ID: {transaction_id}")
        print(f"   URL de paiement: {payment_url}")
        
    except Exception as e:
        print(f"❌ Erreur lors de l'initiation: {e}")
        return False

    # 4. Simuler la notification CinetPay (webhook)
    print("\n4️⃣ Simulation de la notification CinetPay...")
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
            "user_id": 1,  # ID factice pour le test
            "duration_months": 1,
            "subscription_type": "technician_premium"
        })
    }
    
    try:
        notify_response = requests.post(NOTIFY_URL, json=notify_data, timeout=10)
        
        if notify_response.status_code == 200:
            print("✅ Notification simulée avec succès")
            print(f"   Réponse: {notify_response.json()}")
        else:
            print(f"❌ Erreur lors de la simulation: {notify_response.status_code}")
            print(notify_response.text)
    except Exception as e:
        print(f"❌ Erreur lors de la simulation: {e}")

    # 5. Vérifier le nouveau statut d'abonnement
    print("\n5️⃣ Vérification du nouveau statut d'abonnement...")
    try:
        status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers, timeout=10)
        
        if status_response.status_code == 200:
            status_data = status_response.json()
            print(f"📊 Nouveau statut: {status_data}")
            
            if status_data.get("can_receive_requests"):
                print("✅ Abonnement activé avec succès !")
                return True
            else:
                print("❌ Abonnement non activé")
                return False
        else:
            print(f"⚠️ Erreur lors de la vérification finale: {status_response.status_code}")
            return False
    except Exception as e:
        print(f"❌ Erreur lors de la vérification finale: {e}")
        return False


def test_double_payment_prevention():
    """Test de la prévention des doubles paiements."""
    print("\n🧪 TEST DE PRÉVENTION DES DOUBLES PAIEMENTS")
    print("=" * 50)
    
    # Connexion
    try:
        login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
        login_response = requests.post(LOGIN_URL, json=login_data, timeout=10)
        
        if login_response.status_code != 200:
            print("❌ Échec de connexion")
            return False
        
        token = login_response.json().get("access")
        headers = {"Authorization": f"Bearer {token}"}
        
        # Tentative de double paiement
        payment_data = {"duration_months": 1}
        payment_response = requests.post(SUBSCRIPTION_PAYMENT_URL, json=payment_data, headers=headers, timeout=10)
        
        if payment_response.status_code == 400:
            error_data = payment_response.json()
            print("✅ Prévention des doubles paiements active")
            print(f"   Message: {error_data.get('error', 'Erreur inconnue')}")
            return True
        else:
            print("❌ La prévention des doubles paiements ne fonctionne pas")
            print(f"   Status: {payment_response.status_code}")
            print(f"   Réponse: {payment_response.text}")
            return False
            
    except Exception as e:
        print(f"❌ Erreur lors du test de prévention: {e}")
        return False


def main():
    """Fonction principale de test."""
    print("🚀 Démarrage des tests de paiement CinetPay")
    print("=" * 50)
    
    # Démarrer le backend si nécessaire
    backend_ok = start_backend()
    
    if not backend_ok:
        print("⚠️ Backend non accessible, mais continuons les tests...")
    
    # Test principal
    payment_ok = test_payment_simulation()
    
    # Test de prévention des doubles paiements
    prevention_ok = test_double_payment_prevention()
    
    # Résumé
    print("\n" + "=" * 50)
    print("📊 RÉSUMÉ DES TESTS")
    print("=" * 50)
    print(f"Backend: {'✅' if backend_ok else '❌'}")
    print(f"Paiement: {'✅' if payment_ok else '❌'}")
    print(f"Prévention doubles: {'✅' if prevention_ok else '❌'}")
    
    if payment_ok and prevention_ok:
        print("\n🎉 Tous les tests sont passés avec succès !")
        print("Le système de paiement CinetPay fonctionne correctement en mode simulateur.")
    else:
        print("\n⚠️ Certains tests ont échoué. Vérifiez la configuration.")
    
    print("\n✅ Tests terminés !")


if __name__ == "__main__":
    main() 