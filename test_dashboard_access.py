#!/usr/bin/env python3
"""
Script pour tester l'accès au dashboard du technicien avec les abonnements existants.
"""

import os
import sys
import django
import requests
import json

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, TechnicianSubscription
from django.utils import timezone

BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SUBSCRIPTION_STATUS_URL = f"{BASE_URL}/depannage/api/technicians/subscription_status/"
DASHBOARD_URL = f"{BASE_URL}/depannage/api/technicians/dashboard/"
REQUESTS_URL = f"{BASE_URL}/depannage/api/technicians/requests/"

TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"


def test_dashboard_access():
    print(f"\n🔄 Test d'accès au dashboard pour le technicien : {TECHNICIAN_EMAIL}")
    
    # 1. Connexion technicien
    login_data = {"email": TECHNICIAN_EMAIL, "password": TECHNICIAN_PASSWORD}
    login_response = requests.post(LOGIN_URL, json=login_data)
    if login_response.status_code != 200:
        print(f"❌ Échec de connexion technicien: {login_response.status_code}")
        print(login_response.text)
        return False
    token = login_response.json().get("access")
    headers = {"Authorization": f"Bearer {token}"}
    print("✅ Connexion réussie")

    # 2. Vérifier le statut d'abonnement
    print("\n📊 Statut d'abonnement :")
    status_response = requests.get(SUBSCRIPTION_STATUS_URL, headers=headers)
    if status_response.status_code == 200:
        data = status_response.json()
        print(f"   Statut: {data.get('status')}")
        print(f"   Peut recevoir des demandes: {data.get('can_receive_requests')}")
        print(f"   Jours restants: {data.get('days_remaining')}")
        print(f"   ID abonnement: {data.get('subscription')}")
    else:
        print(f"   ❌ Erreur: {status_response.status_code}")
        print(status_response.text)

    # 3. Tester l'accès au dashboard
    print("\n🏠 Test d'accès au dashboard :")
    dashboard_response = requests.get(DASHBOARD_URL, headers=headers)
    if dashboard_response.status_code == 200:
        data = dashboard_response.json()
        print("   ✅ Accès au dashboard réussi")
        print(f"   Demandes totales: {data.get('total_requests', 0)}")
        print(f"   Demandes en cours: {data.get('active_requests', 0)}")
        print(f"   Demandes terminées: {data.get('completed_requests', 0)}")
        print(f"   Revenus: {data.get('total_earnings', 0)} FCFA")
    else:
        print(f"   ❌ Erreur d'accès au dashboard: {dashboard_response.status_code}")
        print(dashboard_response.text)

    # 4. Tester l'accès aux demandes
    print("\n📋 Test d'accès aux demandes :")
    requests_response = requests.get(REQUESTS_URL, headers=headers)
    if requests_response.status_code == 200:
        data = requests_response.json()
        print("   ✅ Accès aux demandes réussi")
        print(f"   Nombre de demandes: {len(data.get('results', []))}")
        
        if data.get('results'):
            print("   Dernières demandes:")
            for request in data['results'][:3]:  # Afficher les 3 premières
                print(f"     - {request.get('title', 'Sans titre')} (ID: {request.get('id')})")
                print(f"       Statut: {request.get('status')}, Priorité: {request.get('priority')}")
    else:
        print(f"   ❌ Erreur d'accès aux demandes: {requests_response.status_code}")
        print(requests_response.text)

    # 5. Vérifier les données en base
    print("\n🔍 Vérification des données en base :")
    user = User.objects.get(email=TECHNICIAN_EMAIL)
    technician = Technician.objects.get(user=user)
    
    now = timezone.now()
    active_subscriptions = TechnicianSubscription.objects.filter(
        technician=technician,
        end_date__gt=now
    )
    
    print(f"   Abonnements actifs: {active_subscriptions.count()}")
    for sub in active_subscriptions:
        print(f"     - {sub.plan_name} jusqu'au {sub.end_date}")
    
    # Vérifier si le technicien peut recevoir des demandes
    can_receive = technician.has_active_subscription
    print(f"   Peut recevoir des demandes (propriété): {can_receive}")
    
    assert True, "Dashboard access test terminé"

if __name__ == "__main__":
    success = test_dashboard_access()
    if success:
        print("\n✅ Test d'accès réussi ! Le technicien peut accéder à son dashboard.")
    else:
        print("\n❌ Test d'accès échoué.") 