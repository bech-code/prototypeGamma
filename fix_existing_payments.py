#!/usr/bin/env python3
"""
Script simplifié pour corriger les paiements existants sans erreur de contrainte.
"""

import os
import sys
import django
from datetime import timedelta

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, CinetPayPayment, TechnicianSubscription
from django.utils import timezone

def fix_existing_payments():
    """Corriger les paiements existants sans erreur de contrainte"""
    
    print("🔧 CORRECTION - Paiements existants")
    print("=" * 50)
    
    # 1. Identifier les paiements réussis sans abonnement créé
    print("\n1️⃣ Identification des paiements sans abonnement...")
    
    successful_payments = CinetPayPayment.objects.filter(
        status='success',
        metadata__icontains='subscription'
    )
    
    print(f"   Paiements réussis avec métadonnées 'subscription': {successful_payments.count()}")
    
    fixed_count = 0
    
    for payment in successful_payments:
        # Vérifier si un abonnement existe déjà pour ce paiement
        existing_sub = TechnicianSubscription.objects.filter(payment=payment).first()
        
        if existing_sub:
            print(f"   ✅ Abonnement déjà existant pour {payment.transaction_id}")
            continue
        
        # Vérifier si l'utilisateur existe
        if not payment.user:
            print(f"   ❌ Paiement {payment.transaction_id} sans utilisateur")
            continue
        
        # Récupérer le profil technicien
        technician = None
        try:
            technician = payment.user.technician_depannage
        except:
            try:
                technician = payment.user.technician_profile
            except:
                pass
        
        if not technician:
            print(f"   ❌ Utilisateur {payment.user.username} sans profil technicien")
            continue
        
        # Extraire la durée depuis les métadonnées
        duration_months = 1  # Par défaut
        if "_subscription_" in payment.metadata:
            try:
                duration_part = payment.metadata.split("_subscription_")[1]
                duration_months = int(duration_part.split("months")[0])
            except:
                duration_months = 1
        
        # Créer l'abonnement (sans lier le paiement pour éviter l'erreur de contrainte)
        now = timezone.now()
        
        # Créer un nouvel abonnement sans lier le paiement
        sub = TechnicianSubscription.objects.create(
            technician=technician,
            plan_name=f"Standard {duration_months} mois",
            start_date=now,
            end_date=now + timedelta(days=30 * duration_months),
            is_active=True
        )
        
        print(f"   ✅ Abonnement créé pour {technician.user.username}")
        print(f"      - Plan: {sub.plan_name}")
        print(f"      - Durée: {duration_months} mois")
        print(f"      - Expire le: {sub.end_date}")
        
        fixed_count += 1
    
    print(f"\n   Total abonnements créés: {fixed_count}")
    
    # 2. Vérification finale
    print("\n2️⃣ Vérification finale...")
    
    total_technicians = Technician.objects.count()
    technicians_with_active_sub = 0
    
    for tech in Technician.objects.all():
        active_sub = tech.subscriptions.filter(end_date__gt=timezone.now()).first()
        if active_sub:
            technicians_with_active_sub += 1
            print(f"   ✅ {tech.user.username} - Abonnement actif jusqu'au {active_sub.end_date}")
        else:
            print(f"   ❌ {tech.user.username} - Aucun abonnement actif")
    
    print(f"\n   Résumé:")
    print(f"   - Total techniciens: {total_technicians}")
    print(f"   - Avec abonnement actif: {technicians_with_active_sub}")
    print(f"   - Sans abonnement actif: {total_technicians - technicians_with_active_sub}")
    
    if technicians_with_active_sub == total_technicians:
        print("\n   🎉 SUCCÈS: Tous les techniciens ont maintenant un abonnement actif!")
    else:
        print(f"\n   ⚠️  ATTENTION: {total_technicians - technicians_with_active_sub} techniciens n'ont toujours pas d'abonnement actif")

def test_technician_access():
    """Tester l'accès des techniciens au dashboard"""
    
    print("\n🧪 TEST - Accès des techniciens au dashboard")
    print("=" * 50)
    
    import requests
    
    # Tester avec quelques techniciens
    technicians = Technician.objects.all()[:3]
    
    for tech in technicians:
        user = tech.user
        print(f"\n   Test pour {user.username}:")
        
        # Vérifier l'abonnement
        active_sub = tech.subscriptions.filter(end_date__gt=timezone.now()).first()
        if active_sub:
            print(f"   ✅ Abonnement actif jusqu'au {active_sub.end_date}")
        else:
            print(f"   ❌ Aucun abonnement actif")
        
        # Tester la connexion
        login_data = {
            "email": user.email,
            "password": "test123456"  # Mot de passe par défaut
        }
        
        try:
            login_response = requests.post("http://127.0.0.1:8000/users/login/", json=login_data)
            if login_response.status_code == 200:
                token = login_response.json().get('access')
                headers = {'Authorization': f'Bearer {token}'}
                
                # Tester l'endpoint subscription_status
                status_response = requests.get(
                    "http://127.0.0.1:8000/depannage/api/technicians/subscription_status/",
                    headers=headers
                )
                
                if status_response.status_code == 200:
                    data = status_response.json()
                    can_receive = data.get('can_receive_requests', False)
                    print(f"   ✅ Endpoint accessible - Peut recevoir des demandes: {can_receive}")
                else:
                    print(f"   ❌ Erreur endpoint: {status_response.status_code}")
            else:
                print(f"   ❌ Erreur de connexion: {login_response.status_code}")
        except Exception as e:
            print(f"   ❌ Erreur lors du test: {e}")

if __name__ == "__main__":
    fix_existing_payments()
    test_technician_access()
    
    print("\n" + "=" * 50)
    print("✅ Correction terminée")
    print("\n📋 Instructions pour le technicien:")
    print("1. Se connecter avec ses identifiants")
    print("2. Accéder au dashboard technicien")
    print("3. Vérifier que les demandes sont visibles")
    print("4. Si problème persiste, contacter l'administrateur") 