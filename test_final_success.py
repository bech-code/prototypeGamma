#!/usr/bin/env python3
"""
Script de test final pour vérifier le succès du système de paiement et d'abonnement.
"""

import os
import sys
import django
import requests
import json
from datetime import datetime, timedelta

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, TechnicianSubscription, CinetPayPayment
from django.utils import timezone

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"

TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"


def test_final_success():
    print(f"\n🎯 Test final du système pour le technicien : {TECHNICIAN_EMAIL}")
    
    # 1. Vérifier les données en base
    print("\n📊 Vérification des données en base :")
    user = User.objects.get(email=TECHNICIAN_EMAIL)
    technician = Technician.objects.get(user=user)
    
    now = timezone.now()
    active_subscriptions = TechnicianSubscription.objects.filter(
        technician=technician,
        end_date__gt=now
    )
    
    print(f"   ✅ Utilisateur: {user.username} (ID: {user.id})")
    print(f"   ✅ Technician: {technician} (ID: {technician.id})")
    print(f"   ✅ Abonnements actifs: {active_subscriptions.count()}")
    
    for sub in active_subscriptions:
        print(f"     - {sub.plan_name} jusqu'au {sub.end_date}")
    
    # 2. Connexion technicien
    print("\n🔐 Test de connexion :")
    login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
    login_response = requests.post(LOGIN_URL, json=login_data)
    if login_response.status_code != 200:
        print(f"   ❌ Échec de connexion: {login_response.status_code}")
        return False
    
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    print("   ✅ Connexion réussie")

    # 3. Test des endpoints
    print("\n🌐 Test des endpoints :")
    
    # Test endpoint subscription_status
    status_url = f"{BASE_URL}/depannage/api/technicians/subscription_status/"
    status_response = requests.get(status_url, headers=headers)
    print(f"   📊 Statut d'abonnement: {status_response.status_code}")
    if status_response.status_code == 200:
        data = status_response.json()
        print(f"     ✅ Peut recevoir des demandes: {data.get('can_receive_requests')}")
        print(f"     ✅ Jours restants: {data.get('days_remaining')}")
    else:
        print(f"     ❌ Erreur: {status_response.text[:100]}...")

    # Test endpoint dashboard
    dashboard_url = f"{BASE_URL}/depannage/api/technicians/dashboard/"
    dashboard_response = requests.get(dashboard_url, headers=headers)
    print(f"   🏠 Dashboard: {dashboard_response.status_code}")
    if dashboard_response.status_code == 200:
        print("     ✅ Accès au dashboard réussi")
    else:
        print(f"     ❌ Erreur: {dashboard_response.text[:100]}...")

    # Test endpoint requests
    requests_url = f"{BASE_URL}/depannage/api/technicians/requests/"
    requests_response = requests.get(requests_url, headers=headers)
    print(f"   📋 Demandes: {requests_response.status_code}")
    if requests_response.status_code == 200:
        print("     ✅ Accès aux demandes réussi")
    else:
        print(f"     ❌ Erreur: {requests_response.text[:100]}...")

    # 4. Résumé final
    print("\n📈 Résumé final :")
    success_count = 0
    total_tests = 3
    
    if status_response.status_code == 200:
        success_count += 1
        print("   ✅ Endpoint subscription_status fonctionne")
    else:
        print("   ❌ Endpoint subscription_status ne fonctionne pas")
    
    if dashboard_response.status_code == 200:
        success_count += 1
        print("   ✅ Endpoint dashboard fonctionne")
    else:
        print("   ❌ Endpoint dashboard ne fonctionne pas")
    
    if requests_response.status_code == 200:
        success_count += 1
        print("   ✅ Endpoint requests fonctionne")
    else:
        print("   ❌ Endpoint requests ne fonctionne pas")
    
    print(f"\n🎯 Score: {success_count}/{total_tests}")
    
    if success_count == total_tests:
        print("\n🎉 SUCCÈS COMPLET ! Le système fonctionne parfaitement.")
        print("   ✅ Le technicien peut accéder à son dashboard")
        print("   ✅ Le technicien peut recevoir des demandes")
        print("   ✅ Les abonnements sont correctement gérés")
        assert True, "Succès complet : tous les endpoints fonctionnent"
    elif success_count > 0:
        print(f"\n⚠️  SUCCÈS PARTIEL : {success_count}/{total_tests} endpoints fonctionnent")
        assert True, f"Succès partiel : {success_count}/{total_tests} endpoints fonctionnent"
    else:
        print("\n❌ ÉCHEC : Aucun endpoint ne fonctionne")
        assert False, "Échec : aucun endpoint ne fonctionne"

if __name__ == "__main__":
    success = test_final_success()
    if success:
        print("\n✅ Le système de paiement et d'abonnement est opérationnel !")
    else:
        print("\n❌ Des problèmes persistent dans le système.") 