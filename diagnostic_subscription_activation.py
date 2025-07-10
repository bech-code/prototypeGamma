#!/usr/bin/env python3
"""
Script de diagnostic pour identifier le problème d'activation d'abonnement
après paiement CinetPay.
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
from depannage.models import Technician, CinetPayPayment, TechnicianSubscription
from django.utils import timezone

def diagnostic_subscription_activation():
    """Diagnostic complet du problème d'activation d'abonnement"""
    
    print("🔍 DIAGNOSTIC - Problème d'activation d'abonnement après paiement")
    print("=" * 80)
    
    # 1. Vérifier les techniciens existants
    print("\n1️⃣ Vérification des techniciens existants:")
    technicians = Technician.objects.all()
    print(f"   Total techniciens: {technicians.count()}")
    
    for tech in technicians[:5]:  # Afficher les 5 premiers
        user = tech.user
        print(f"   - {user.username} ({user.email}) - Spécialité: {tech.specialty}")
        print(f"     Vérifié: {tech.is_verified} | Disponible: {tech.is_available}")
        
        # Vérifier les abonnements
        subscriptions = tech.subscriptions.all()
        print(f"     Abonnements: {subscriptions.count()}")
        for sub in subscriptions:
            print(f"       - {sub.plan_name} (du {sub.start_date} au {sub.end_date})")
            print(f"         Actif: {sub.is_active} | Expiré: {sub.end_date < timezone.now()}")
    
    # 2. Vérifier les paiements CinetPay
    print("\n2️⃣ Vérification des paiements CinetPay:")
    payments = CinetPayPayment.objects.all()
    print(f"   Total paiements: {payments.count()}")
    
    for payment in payments[:5]:  # Afficher les 5 premiers
        print(f"   - Transaction: {payment.transaction_id}")
        print(f"     Montant: {payment.amount} {payment.currency}")
        print(f"     Statut: {payment.status}")
        print(f"     Utilisateur: {payment.user.username if payment.user else 'None'}")
        print(f"     Métadonnées: {payment.metadata}")
        print(f"     Payé le: {payment.paid_at}")
    
    # 3. Vérifier les abonnements
    print("\n3️⃣ Vérification des abonnements:")
    subscriptions = TechnicianSubscription.objects.all()
    print(f"   Total abonnements: {subscriptions.count()}")
    
    for sub in subscriptions[:5]:  # Afficher les 5 premiers
        print(f"   - Technicien: {sub.technician.user.username}")
        print(f"     Plan: {sub.plan_name}")
        print(f"     Du: {sub.start_date} au {sub.end_date}")
        print(f"     Actif: {sub.is_active}")
        print(f"     Expiré: {sub.end_date < timezone.now()}")
        print(f"     Paiement lié: {sub.payment.transaction_id if sub.payment else 'Aucun'}")
    
    # 4. Test de la fonction get_technician_profile
    print("\n4️⃣ Test de la fonction get_technician_profile:")
    
    def get_technician_profile(user):
        """Fonction copiée depuis views.py"""
        technician = getattr(user, 'technician_depannage', None)
        if technician:
            return technician
        technician = getattr(user, 'technician_profile', None)
        if technician:
            return technician
        return None
    
    # Tester avec quelques utilisateurs
    test_users = User.objects.filter(user_type='technician')[:3]
    for user in test_users:
        technician = get_technician_profile(user)
        print(f"   - {user.username}: {technician is not None}")
        if technician:
            print(f"     Type: {type(technician).__name__}")
            print(f"     Spécialité: {technician.specialty}")
    
    # 5. Test de l'endpoint subscription_status
    print("\n5️⃣ Test de l'endpoint subscription_status:")
    
    # Connexion avec un technicien
    login_data = {
        "email": "technicien@depanneteliman.com",
        "password": "technicien123"
    }
    
    try:
        login_response = requests.post("http://127.0.0.1:8000/users/login/", json=login_data)
        if login_response.status_code == 200:
            token = login_response.json().get('access')
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test de l'endpoint
            status_response = requests.get(
                "http://127.0.0.1:8000/depannage/api/technicians/subscription_status/",
                headers=headers
            )
            
            print(f"   Status de l'endpoint: {status_response.status_code}")
            if status_response.status_code == 200:
                data = status_response.json()
                print(f"   Réponse: {json.dumps(data, indent=2)}")
            else:
                print(f"   Erreur: {status_response.text}")
        else:
            print(f"   Erreur de connexion: {login_response.status_code}")
    except Exception as e:
        print(f"   Erreur lors du test: {e}")
    
    # 6. Vérifier les problèmes potentiels
    print("\n6️⃣ Vérification des problèmes potentiels:")
    
    # Problème 1: Techniciens sans abonnement actif
    technicians_without_active_sub = []
    for tech in technicians:
        active_sub = tech.subscriptions.filter(end_date__gt=timezone.now()).first()
        if not active_sub:
            technicians_without_active_sub.append(tech)
    
    print(f"   Techniciens sans abonnement actif: {len(technicians_without_active_sub)}")
    for tech in technicians_without_active_sub[:3]:
        print(f"     - {tech.user.username}")
    
    # Problème 2: Paiements sans abonnement créé
    payments_without_sub = []
    for payment in payments:
        if payment.status == 'success' and 'subscription' in payment.metadata:
            # Vérifier si un abonnement a été créé pour ce paiement
            sub = TechnicianSubscription.objects.filter(payment=payment).first()
            if not sub:
                payments_without_sub.append(payment)
    
    print(f"   Paiements sans abonnement créé: {len(payments_without_sub)}")
    for payment in payments_without_sub[:3]:
        print(f"     - {payment.transaction_id} ({payment.metadata})")
    
    # Problème 3: Abonnements expirés
    expired_subs = TechnicianSubscription.objects.filter(end_date__lt=timezone.now())
    print(f"   Abonnements expirés: {expired_subs.count()}")
    
    # 7. Recommandations
    print("\n7️⃣ Recommandations:")
    
    if len(technicians_without_active_sub) > 0:
        print("   ❌ Problème: Techniciens sans abonnement actif")
        print("   Solution: Créer des abonnements pour ces techniciens")
    
    if len(payments_without_sub) > 0:
        print("   ❌ Problème: Paiements sans abonnement créé")
        print("   Solution: Vérifier la logique d'activation dans la notification CinetPay")
    
    if expired_subs.count() > 0:
        print("   ⚠️  Attention: Abonnements expirés")
        print("   Solution: Renouveler les abonnements ou notifier les techniciens")
    
    print("\n" + "=" * 80)
    print("✅ Diagnostic terminé")

def fix_subscription_issues():
    """Corriger les problèmes d'abonnement identifiés"""
    
    print("\n🔧 CORRECTION - Résolution des problèmes d'abonnement")
    print("=" * 60)
    
    # 1. Créer des abonnements pour les techniciens sans abonnement actif
    technicians = Technician.objects.all()
    created_count = 0
    
    for tech in technicians:
        active_sub = tech.subscriptions.filter(end_date__gt=timezone.now()).first()
        if not active_sub:
            # Créer un abonnement de test (1 mois)
            sub = TechnicianSubscription.objects.create(
                technician=tech,
                plan_name="Standard Test",
                start_date=timezone.now(),
                end_date=timezone.now() + timedelta(days=30),
                is_active=True
            )
            print(f"   ✅ Abonnement créé pour {tech.user.username}")
            created_count += 1
    
    print(f"\n   Total abonnements créés: {created_count}")
    
    # 2. Vérifier que les techniciens peuvent maintenant accéder
    print("\n   Vérification de l'accès...")
    for tech in technicians:
        active_sub = tech.subscriptions.filter(end_date__gt=timezone.now()).first()
        if active_sub:
            print(f"   ✅ {tech.user.username} a un abonnement actif jusqu'au {active_sub.end_date}")
        else:
            print(f"   ❌ {tech.user.username} n'a toujours pas d'abonnement actif")

if __name__ == "__main__":
    diagnostic_subscription_activation()
    
    # Demander si l'utilisateur veut corriger les problèmes
    response = input("\nVoulez-vous corriger les problèmes identifiés ? (y/n): ")
    if response.lower() == 'y':
        fix_subscription_issues()
    else:
        print("Correction annulée.") 