#!/usr/bin/env python3
"""
Script de test pour la gestion des abonnements des techniciens
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from depannage.models import Technician, TechnicianSubscription, SubscriptionPaymentRequest, CinetPayPayment, User
from django.utils import timezone
from django.db.models import Sum, Avg, Count

def test_subscription_management():
    """Test de la logique de gestion des abonnements"""
    
    print("🔍 Test de la gestion des abonnements des techniciens")
    print("=" * 60)
    
    # 1. Statistiques générales
    print("\n📊 Statistiques générales:")
    total_technicians = Technician.objects.count()
    total_subscriptions = TechnicianSubscription.objects.count()
    active_subscriptions = TechnicianSubscription.objects.filter(
        end_date__gt=timezone.now(),
        is_active=True
    ).count()
    expired_subscriptions = TechnicianSubscription.objects.filter(
        end_date__lte=timezone.now()
    ).count()
    
    print(f"  • Total techniciens: {total_technicians}")
    print(f"  • Total abonnements: {total_subscriptions}")
    print(f"  • Abonnements actifs: {active_subscriptions}")
    print(f"  • Abonnements expirés: {expired_subscriptions}")
    
    # 2. Demandes de paiement
    print("\n💰 Demandes de paiement:")
    total_requests = SubscriptionPaymentRequest.objects.count()
    pending_requests = SubscriptionPaymentRequest.objects.filter(status='pending').count()
    approved_requests = SubscriptionPaymentRequest.objects.filter(status='approved').count()
    rejected_requests = SubscriptionPaymentRequest.objects.filter(status='rejected').count()
    
    print(f"  • Total demandes: {total_requests}")
    print(f"  • En attente: {pending_requests}")
    print(f"  • Approuvées: {approved_requests}")
    print(f"  • Rejetées: {rejected_requests}")
    
    # 3. Paiements CinetPay des techniciens
    print("\n💳 Paiements CinetPay des techniciens:")
    technician_payments = CinetPayPayment.objects.filter(
        user__technician_depannage__isnull=False
    )
    total_payments = technician_payments.count()
    successful_payments = technician_payments.filter(status='success').count()
    total_amount = technician_payments.filter(status='success').aggregate(
        total=Sum('amount')
    )['total'] or 0
    
    print(f"  • Total paiements: {total_payments}")
    print(f"  • Paiements réussis: {successful_payments}")
    print(f"  • Montant total: {total_amount:,} FCFA")
    
    # 4. Tendances récentes
    print("\n📈 Tendances récentes (7 derniers jours):")
    seven_days_ago = timezone.now() - timedelta(days=7)
    recent_subscriptions = TechnicianSubscription.objects.filter(
        created_at__gte=seven_days_ago
    ).count()
    recent_requests = SubscriptionPaymentRequest.objects.filter(
        created_at__gte=seven_days_ago
    ).count()
    recent_payments = technician_payments.filter(
        created_at__gte=seven_days_ago
    ).count()
    
    print(f"  • Nouveaux abonnements: {recent_subscriptions}")
    print(f"  • Nouvelles demandes: {recent_requests}")
    print(f"  • Nouveaux paiements: {recent_payments}")
    
    # 5. Techniciens avec abonnements actifs
    print("\n👥 Techniciens avec abonnements actifs:")
    active_technicians = Technician.objects.filter(
        subscriptions__end_date__gt=timezone.now(),
        subscriptions__is_active=True
    ).distinct()
    
    for tech in active_technicians[:5]:  # Afficher les 5 premiers
        subscription = tech.subscriptions.filter(
            end_date__gt=timezone.now(),
            is_active=True
        ).order_by('-end_date').first()
        
        days_remaining = (subscription.end_date - timezone.now()).days
        print(f"  • {tech.user.get_full_name() or tech.user.username} - {days_remaining} jours restants")
    
    if active_technicians.count() > 5:
        print(f"  • ... et {active_technicians.count() - 5} autres")
    
    # 6. Demandes en attente
    print("\n⏳ Demandes en attente:")
    pending_requests_list = SubscriptionPaymentRequest.objects.filter(
        status='pending'
    ).select_related('technician__user')
    
    for request in pending_requests_list[:5]:  # Afficher les 5 premiers
        print(f"  • {request.technician.user.get_full_name() or request.technician.user.username} - {request.amount:,} FCFA ({request.duration_months} mois)")
    
    if pending_requests_list.count() > 5:
        print(f"  • ... et {pending_requests_list.count() - 5} autres")
    
    # 7. Paiements récents réussis
    print("\n✅ Paiements récents réussis:")
    recent_successful_payments = technician_payments.filter(
        status='success',
        created_at__gte=seven_days_ago
    ).select_related('user')
    
    for payment in recent_successful_payments[:5]:  # Afficher les 5 premiers
        print(f"  • {payment.user.get_full_name() or payment.user.username} - {payment.amount:,} FCFA ({payment.transaction_id})")
    
    if recent_successful_payments.count() > 5:
        print(f"  • ... et {recent_successful_payments.count() - 5} autres")
    
    print("\n" + "=" * 60)
    print("✅ Test terminé avec succès!")

def test_subscription_validation_logic():
    """Test de la logique de validation des abonnements"""
    
    print("\n🔍 Test de la logique de validation des abonnements")
    print("=" * 60)
    
    # Trouver un technicien avec une demande en attente
    pending_request = SubscriptionPaymentRequest.objects.filter(status='pending').first()
    
    if pending_request:
        print(f"📋 Demande trouvée:")
        print(f"  • Technicien: {pending_request.technician.user.get_full_name()}")
        print(f"  • Montant: {pending_request.amount:,} FCFA")
        print(f"  • Durée: {pending_request.duration_months} mois")
        print(f"  • Statut: {pending_request.status}")
        
        # Vérifier si le technicien a déjà un abonnement actif
        active_subscription = pending_request.technician.subscriptions.filter(
            end_date__gt=timezone.now(),
            is_active=True
        ).first()
        
        if active_subscription:
            print(f"⚠️  Le technicien a déjà un abonnement actif jusqu'au {active_subscription.end_date}")
            print(f"   Si approuvé, l'abonnement sera prolongé de {pending_request.duration_months} mois")
        else:
            print(f"✅ Le technicien n'a pas d'abonnement actif")
            print(f"   Si approuvé, un nouvel abonnement sera créé")
    else:
        print("❌ Aucune demande en attente trouvée")
    
    print("\n" + "=" * 60)

if __name__ == "__main__":
    try:
        test_subscription_management()
        test_subscription_validation_logic()
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc() 