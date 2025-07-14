#!/usr/bin/env python3
"""
Script de diagnostic complet pour identifier tous les problèmes du système.
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

from django.contrib.auth import get_user_model
from depannage.models import Technician, TechnicianSubscription, CinetPayPayment
from django.utils import timezone

User = get_user_model()

TECHNICIAN_EMAIL = "ballo@gmail.com"

def diagnostic_complet():
    print(f"\n🔍 Diagnostic complet pour : {TECHNICIAN_EMAIL}")
    
    # 1. Vérifier l'utilisateur
    print("\n👤 Vérification de l'utilisateur :")
    try:
        user = User.objects.get(email=TECHNICIAN_EMAIL)
        print(f"   ✅ Utilisateur trouvé: {user.username} (ID: {user.id})")
        print(f"   📧 Email: {user.email}")
        print(f"   👤 Nom complet: {user.get_full_name()}")
    except User.DoesNotExist:
        print(f"   ❌ Utilisateur non trouvé: {TECHNICIAN_EMAIL}")
        return

    # 2. Vérifier les profils techniciens
    print("\n🔧 Vérification des profils techniciens :")
    
    # Technician (app depannage)
    try:
        technician_depannage = user.technician_depannage
        print(f"   ✅ Technician (depannage): {technician_depannage}")
        print(f"      ID: {technician_depannage.id}")
        print(f"      Spécialité: {technician_depannage.specialty}")
        print(f"      Vérifié: {technician_depannage.is_verified}")
    except:
        print("   ❌ Pas de Technician (depannage)")
    
    # TechnicianProfile (app users)
    try:
        technician_profile = user.technician_profile
        print(f"   ✅ TechnicianProfile (users): {technician_profile}")
        print(f"      ID: {technician_profile.id}")
    except:
        print("   ❌ Pas de TechnicianProfile (users)")

    # 3. Vérifier les abonnements
    print("\n📊 Vérification des abonnements :")
    now = timezone.now()
    
    # Abonnements liés au Technician
    if 'technician_depannage' in locals():
        subscriptions = TechnicianSubscription.objects.filter(
            technician=technician_depannage,
            end_date__gt=now
        )
        print(f"   📈 Abonnements actifs (Technician): {subscriptions.count()}")
        for sub in subscriptions:
            print(f"      - {sub.plan_name} jusqu'au {sub.end_date}")
    
    # Abonnements liés à l'utilisateur
    user_subscriptions = TechnicianSubscription.objects.filter(
        technician__user=user,
        end_date__gt=now
    )
    print(f"   📈 Abonnements actifs (tous): {user_subscriptions.count()}")
    for sub in user_subscriptions:
        print(f"      - {sub.plan_name} jusqu'au {sub.end_date} (Technician ID: {sub.technician.id})")

    # 4. Vérifier les paiements
    print("\n💰 Vérification des paiements :")
    payments = CinetPayPayment.objects.filter(user=user)
    print(f"   💳 Paiements totaux: {payments.count()}")
    
    success_payments = payments.filter(status='success')
    print(f"   ✅ Paiements réussis: {success_payments.count()}")
    
    for payment in success_payments[:3]:  # Afficher les 3 premiers
        print(f"      - {payment.transaction_id}: {payment.amount} {payment.currency}")

    # 5. Test de connexion API
    print("\n🌐 Test de connexion API :")
    login_data = {"email": TECHNICIAN_EMAIL, "password": "bechir66312345"}
    try:
        login_response = requests.post("http://127.0.0.1:8000/users/login/", json=login_data)
        if login_response.status_code == 200:
            print("   ✅ Connexion API réussie")
            token = login_response.json().get("access")
            headers = {"Authorization": f"Bearer {token}"}
            
            # Test des endpoints
            endpoints = [
                ("/depannage/api/technicians/", "Liste techniciens"),
                ("/depannage/api/technicians/me/", "Profil technicien"),
                ("/depannage/api/technicians/subscription_status/", "Statut abonnement"),
                ("/depannage/api/technicians/dashboard/", "Dashboard"),
                ("/depannage/api/technicians/requests/", "Demandes"),
            ]
            
            for endpoint, description in endpoints:
                url = f"http://127.0.0.1:8000{endpoint}"
                try:
                    response = requests.get(url, headers=headers, timeout=5)
                    status = "✅" if response.status_code == 200 else "❌"
                    print(f"   {status} {description}: {response.status_code}")
                except Exception as e:
                    print(f"   ❌ {description}: Erreur de connexion")
        else:
            print(f"   ❌ Échec de connexion API: {login_response.status_code}")
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")

    # 6. Recommandations
    print("\n💡 Recommandations :")
    
    if user_subscriptions.count() > 0:
        print("   ✅ Les abonnements existent en base de données")
        print("   ✅ Le technicien devrait pouvoir accéder au dashboard")
        print("   ⚠️  Problème probable: Endpoints API non fonctionnels")
        print("   🔧 Solution: Vérifier la configuration des URLs et redémarrer le serveur")
    else:
        print("   ❌ Aucun abonnement actif trouvé")
        print("   🔧 Solution: Créer un abonnement pour le technicien")

if __name__ == "__main__":
    diagnostic_complet() 