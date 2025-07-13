#!/usr/bin/env python3
"""
Test de performance du système de paiement CinetPay
- Temps de réponse
- Charge
- Mémoire
- Concurrence
"""

import requests
import json
import time
import sys
import threading
import statistics
from datetime import datetime
from concurrent.futures import ThreadPoolExecutor, as_completed

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/depannage/api"

def measure_response_time(endpoint, method="GET", data=None, headers=None):
    """Mesure le temps de réponse d'un endpoint."""
    start_time = time.time()
    
    if method == "GET":
        response = requests.get(f"{API_BASE}/{endpoint}", headers=headers)
    elif method == "POST":
        response = requests.post(f"{API_BASE}/{endpoint}", json=data, headers=headers)
    
    end_time = time.time()
    return end_time - start_time, response.status_code

def test_payment_initiation_performance():
    """Test de performance pour l'initiation de paiement."""
    print("🔧 Test de performance - Initiation de paiement")
    
    token = get_test_token()
    if not token:
        print("    ❌ Impossible d'obtenir un token")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    data = {"duration_months": 1}
    
    response_times = []
    
    # Test avec 10 requêtes
    for i in range(10):
        response_time, status_code = measure_response_time(
            "cinetpay/initiate_subscription_payment/",
            method="POST",
            data=data,
            headers=headers
        )
        response_times.append(response_time)
        
        if status_code == 200:
            print(f"    Requête {i+1}: {response_time:.3f}s")
        else:
            print(f"    Requête {i+1}: Erreur {status_code}")
    
    avg_time = statistics.mean(response_times)
    max_time = max(response_times)
    min_time = min(response_times)
    
    print(f"    📊 Temps moyen: {avg_time:.3f}s")
    print(f"    📊 Temps max: {max_time:.3f}s")
    print(f"    📊 Temps min: {min_time:.3f}s")
    
    # Seuil de performance (moins de 2 secondes)
    if avg_time < 2.0:
        print("    ✅ Performance acceptable")
    else:
        print("    ⚠️ Performance lente")

def test_concurrent_load():
    """Test de charge concurrente."""
    print("🔧 Test de charge concurrente")
    
    token = get_test_token()
    if not token:
        print("    ❌ Impossible d'obtenir un token")
        return
    
    headers = {"Authorization": f"Bearer {token}"}
    data = {"duration_months": 1}
    
    def make_request():
        return measure_response_time(
            "cinetpay/initiate_subscription_payment/",
            method="POST",
            data=data,
            headers=headers
        )
    
    # Test avec 20 requêtes concurrentes
    response_times = []
    successful_requests = 0
    
    with ThreadPoolExecutor(max_workers=5) as executor:
        futures = [executor.submit(make_request) for _ in range(20)]
        
        for future in as_completed(futures):
            response_time, status_code = future.result()
            response_times.append(response_time)
            
            if status_code == 200:
                successful_requests += 1
    
    avg_time = statistics.mean(response_times)
    success_rate = (successful_requests / 20) * 100
    
    print(f"    📊 Temps moyen: {avg_time:.3f}s")
    print(f"    📊 Taux de succès: {success_rate:.1f}%")
    
    if success_rate > 90 and avg_time < 3.0:
        print("    ✅ Charge bien gérée")
    else:
        print("    ⚠️ Problèmes de charge")

def test_notification_performance():
    """Test de performance des notifications."""
    print("🔧 Test de performance - Notifications")
    
    # Créer un paiement de test
    payment_data = create_test_payment()
    
    notification_data = {
        "transaction_id": payment_data["transaction_id"],
        "status": "ACCEPTED",
        "payment_token": "test_token",
        "amount": 5000,
        "currency": "XOF",
        "payment_date": datetime.now().isoformat()
    }
    
    response_times = []
    
    # Test avec 10 notifications
    for i in range(10):
        start_time = time.time()
        response = requests.post(
            f"{BASE_URL}/depannage/api/cinetpay/notify/",
            json=notification_data
        )
        end_time = time.time()
        
        response_times.append(end_time - start_time)
        
        if response.status_code in [200, 400]:  # 400 si déjà traité
            print(f"    Notification {i+1}: {end_time - start_time:.3f}s")
        else:
            print(f"    Notification {i+1}: Erreur {response.status_code}")
    
    avg_time = statistics.mean(response_times)
    print(f"    📊 Temps moyen: {avg_time:.3f}s")
    
    if avg_time < 1.0:
        print("    ✅ Performance des notifications acceptable")
    else:
        print("    ⚠️ Notifications lentes")

def test_memory_usage():
    """Test d'utilisation mémoire (approximatif)."""
    print("🔧 Test d'utilisation mémoire")
    
    import psutil
    import os
    
    process = psutil.Process(os.getpid())
    initial_memory = process.memory_info().rss / 1024 / 1024  # MB
    
    # Effectuer plusieurs opérations
    token = get_test_token()
    headers = {"Authorization": f"Bearer {token}"}
    
    for i in range(50):
        requests.get(f"{API_BASE}/technicians/subscription_status/", headers=headers)
    
    final_memory = process.memory_info().rss / 1024 / 1024  # MB
    memory_increase = final_memory - initial_memory
    
    print(f"    📊 Utilisation initiale: {initial_memory:.1f} MB")
    print(f"    📊 Utilisation finale: {final_memory:.1f} MB")
    print(f"    📊 Augmentation: {memory_increase:.1f} MB")
    
    if memory_increase < 50:  # Moins de 50MB d'augmentation
        print("    ✅ Utilisation mémoire acceptable")
    else:
        print("    ⚠️ Utilisation mémoire élevée")

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

def create_test_payment():
    """Crée un paiement de test."""
    token = get_test_token()
    if not token:
        return {"transaction_id": "TXN-TEST"}
    
    headers = {"Authorization": f"Bearer {token}"}
    data = {"duration_months": 1}
    
    response = requests.post(
        f"{API_BASE}/cinetpay/initiate_subscription_payment/",
        json=data,
        headers=headers
    )
    
    if response.status_code == 200:
        return response.json()
    else:
        return {"transaction_id": "TXN-TEST"}

if __name__ == "__main__":
    print("🚀 TESTS DE PERFORMANCE DU SYSTÈME DE PAIEMENT")
    print("=" * 60)
    
    try:
        test_payment_initiation_performance()
        test_concurrent_load()
        test_notification_performance()
        test_memory_usage()
        
        print("\n✅ Tous les tests de performance terminés")
        
    except Exception as e:
        print(f"❌ Erreur lors des tests: {e}")
        sys.exit(1) 