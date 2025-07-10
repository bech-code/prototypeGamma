#!/usr/bin/env python3
"""
Script pour corriger la logique de notification CinetPay et améliorer 
l'activation automatique des abonnements techniciens.
"""

import os
import sys
import django
import requests
import json
from datetime import timedelta

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, CinetPayPayment, TechnicianSubscription, Notification
from django.utils import timezone

def fix_cinetpay_notification_logic():
    """Corriger la logique de notification CinetPay"""
    
    print("🔧 CORRECTION - Logique de notification CinetPay")
    print("=" * 60)
    
    # 1. Identifier les paiements réussis sans abonnement
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
        
        # Créer l'abonnement
        now = timezone.now()
        
        # Vérifier s'il y a déjà un abonnement actif à prolonger
        active_sub = technician.subscriptions.filter(end_date__gt=now).order_by('-end_date').first()
        
        if active_sub:
            # Prolonger l'abonnement existant
            active_sub.end_date += timedelta(days=30 * duration_months)
            active_sub.payment = payment
            active_sub.save()
            sub = active_sub
            print(f"   ✅ Abonnement prolongé pour {technician.user.username}")
        else:
            # Créer un nouvel abonnement
            sub = TechnicianSubscription.objects.create(
                technician=technician,
                plan_name=f"Standard {duration_months} mois",
                start_date=now,
                end_date=now + timedelta(days=30 * duration_months),
                payment=payment,
                is_active=True
            )
            print(f"   ✅ Nouvel abonnement créé pour {technician.user.username}")
        
        print(f"      - Plan: {sub.plan_name}")
        print(f"      - Durée: {duration_months} mois")
        print(f"      - Expire le: {sub.end_date}")
        
        # Créer une notification pour l'utilisateur
        try:
            Notification.objects.create(
                recipient=payment.user,
                title="Abonnement activé avec succès !",
                message=f"Votre abonnement a été activé pour {duration_months} mois jusqu'au {sub.end_date.strftime('%d/%m/%Y')}. Vous pouvez maintenant recevoir de nouvelles demandes de réparation.",
                type="subscription_renewed",
            )
            print(f"      - Notification créée")
        except Exception as e:
            print(f"      - Erreur création notification: {e}")
        
        fixed_count += 1
    
    print(f"\n   Total abonnements corrigés: {fixed_count}")
    
    return fixed_count

def test_notification_endpoint():
    """Tester l'endpoint de notification CinetPay"""
    
    print("\n🧪 TEST - Endpoint de notification CinetPay")
    print("=" * 50)
    
    # Créer un paiement de test
    test_user = User.objects.filter(user_type='technician').first()
    if not test_user:
        print("   ❌ Aucun technicien trouvé pour le test")
        return
    
    # Créer un paiement de test
    payment = CinetPayPayment.objects.create(
        transaction_id=f"TEST_{timezone.now().strftime('%Y%m%d_%H%M%S')}",
        amount=5000,
        currency="XOF",
        description="Test d'abonnement technicien",
        customer_name=test_user.last_name or test_user.username,
        customer_surname=test_user.first_name or "",
        customer_email=test_user.email,
        customer_phone_number="+22300000000",
        customer_address="Test Address",
        customer_city="Bamako",
        customer_country="ML",
        customer_state="ML",
        customer_zip_code="00000",
        status="pending",
        metadata=f"user_{test_user.id}_subscription_1months",
        user=test_user
    )
    
    print(f"   ✅ Paiement de test créé: {payment.transaction_id}")
    
    # Simuler la notification CinetPay
    notification_data = {
        "transaction_id": payment.transaction_id,
        "status": "ACCEPTED",
        "payment_token": f"test_token_{payment.transaction_id}",
        "amount": payment.amount,
        "currency": payment.currency,
        "customer_name": payment.customer_name,
        "customer_surname": payment.customer_surname,
        "customer_email": payment.customer_email,
        "customer_phone_number": payment.customer_phone_number,
        "customer_address": payment.customer_address,
        "customer_city": payment.customer_city,
        "customer_country": payment.customer_country,
        "customer_state": payment.customer_state,
        "customer_zip_code": payment.customer_zip_code,
        "metadata": payment.metadata
    }
    
    try:
        response = requests.post(
            "http://127.0.0.1:8000/depannage/api/cinetpay/cinetpay/notify/",
            json=notification_data,
            headers={'Content-Type': 'application/json'}
        )
        
        print(f"   Status de la notification: {response.status_code}")
        if response.status_code == 200:
            print("   ✅ Notification traitée avec succès")
            
            # Vérifier que l'abonnement a été créé
            payment.refresh_from_db()
            if payment.status == 'success':
                print("   ✅ Paiement marqué comme réussi")
                
                # Vérifier l'abonnement
                sub = TechnicianSubscription.objects.filter(payment=payment).first()
                if sub:
                    print(f"   ✅ Abonnement créé: {sub.plan_name} jusqu'au {sub.end_date}")
                else:
                    print("   ❌ Aucun abonnement créé")
            else:
                print(f"   ❌ Paiement non marqué comme réussi: {payment.status}")
        else:
            print(f"   ❌ Erreur notification: {response.text}")
    except Exception as e:
        print(f"   ❌ Erreur lors du test: {e}")

def improve_notification_logic():
    """Améliorer la logique de notification dans views.py"""
    
    print("\n🔧 AMÉLIORATION - Logique de notification dans views.py")
    print("=" * 60)
    
    # Code amélioré pour la fonction notify
    improved_code = '''
    @action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="cinetpay/notify")
    @permission_classes([AllowAny])
    def notify(self, request):
        """Endpoint pour recevoir les notifications de paiement de CinetPay (abonnement technicien)."""
        logger.info(f"Notification CinetPay reçue: {request.data}")
        
        try:
            serializer = CinetPayNotificationSerializer(data=request.data)
            if not serializer.is_valid():
                logger.error(f"Données de notification invalides: {serializer.errors}")
                return Response(serializer.errors, status=400)
            
            data = serializer.validated_data
            
            # Récupérer le paiement
            try:
                payment = CinetPayPayment.objects.get(transaction_id=data["transaction_id"])
            except CinetPayPayment.DoesNotExist:
                logger.error(f"Paiement non trouvé: {data['transaction_id']}")
                return Response({"error": "Paiement non trouvé"}, status=404)
            
            # Traiter le statut du paiement
            if data["status"] == "ACCEPTED":
                payment.status = "success"
                payment.paid_at = timezone.now()
                payment.cinetpay_transaction_id = data.get("payment_token", "")
                
                # Activation abonnement technicien
                if payment.metadata and "subscription" in payment.metadata:
                    from .models import TechnicianSubscription
                    
                    user = payment.user
                    if not user:
                        logger.error(f"Paiement {payment.transaction_id} sans utilisateur")
                        return Response({"error": "Utilisateur non trouvé"}, status=400)
                    
                    # Récupérer le profil technicien
                    technician = None
                    try:
                        technician = user.technician_depannage
                    except:
                        try:
                            technician = user.technician_profile
                        except:
                            pass
                    
                    if not technician:
                        logger.error(f"Utilisateur {user.username} sans profil technicien")
                        return Response({"error": "Profil technicien non trouvé"}, status=400)
                    
                    # Extraire la durée depuis le metadata
                    duration_months = 1
                    if "_subscription_" in payment.metadata:
                        try:
                            duration_part = payment.metadata.split("_subscription_")[1]
                            duration_months = int(duration_part.split("months")[0])
                        except Exception as e:
                            logger.warning(f"Erreur extraction durée: {e}, utilisation valeur par défaut")
                            duration_months = 1
                    
                    now = timezone.now()
                    
                    # Vérifier s'il y a déjà un abonnement actif à prolonger
                    active_sub = technician.subscriptions.filter(end_date__gt=now).order_by('-end_date').first()
                    
                    if active_sub:
                        # Prolonger l'abonnement existant
                        active_sub.end_date += timedelta(days=30 * duration_months)
                        active_sub.payment = payment
                        active_sub.save()
                        sub = active_sub
                        logger.info(f"Abonnement prolongé pour {technician.user.username}")
                    else:
                        # Créer un nouvel abonnement
                        sub = TechnicianSubscription.objects.create(
                            technician=technician,
                            plan_name=f"Standard {duration_months} mois",
                            start_date=now,
                            end_date=now + timedelta(days=30 * duration_months),
                            payment=payment,
                            is_active=True
                        )
                        logger.info(f"Nouvel abonnement créé pour {technician.user.username}")
                    
                    # Créer une notification pour l'utilisateur
                    try:
                        Notification.objects.create(
                            recipient=user,
                            title="Abonnement activé avec succès !",
                            message=f"Votre abonnement a été activé pour {duration_months} mois jusqu'au {sub.end_date.strftime('%d/%m/%Y')}. Vous pouvez maintenant recevoir de nouvelles demandes de réparation.",
                            type="subscription_renewed",
                        )
                    except Exception as e:
                        logger.error(f"Erreur création notification: {e}")
                
                payment.save()
                logger.info(f"Paiement {payment.transaction_id} traité avec succès")
                return Response({"success": True})
                
            elif data["status"] == "CANCELLED":
                payment.status = "failed"
                payment.save()
                
                try:
                    Notification.objects.create(
                        recipient=payment.user,
                        title="Paiement échoué",
                        message="Votre paiement a échoué. Veuillez réessayer.",
                        type="payment_failed",
                    )
                except Exception as e:
                    logger.error(f"Erreur création notification d'échec: {e}")
                
                return Response({"success": False, "error": "Paiement annulé"}, status=400)
            else:
                logger.warning(f"Statut de paiement inattendu: {data['status']}")
                return Response({"error": "Statut de paiement inconnu"}, status=400)
                
        except Exception as e:
            logger.error(f"Erreur lors du traitement de la notification: {e}")
            return Response({"error": "Erreur interne du serveur"}, status=500)
    '''
    
    print("   Code amélioré généré pour la fonction notify")
    print("   Principales améliorations:")
    print("   - Gestion d'erreurs plus robuste")
    print("   - Logging détaillé")
    print("   - Vérification de l'existence de l'utilisateur")
    print("   - Gestion des deux types de profils techniciens")
    print("   - Prolongation ou création d'abonnement")
    print("   - Notifications utilisateur")
    
    # Sauvegarder le code dans un fichier
    with open('improved_notify_code.py', 'w') as f:
        f.write(improved_code)
    
    print("   ✅ Code amélioré sauvegardé dans 'improved_notify_code.py'")

if __name__ == "__main__":
    # 1. Corriger les paiements existants
    fixed_count = fix_cinetpay_notification_logic()
    
    # 2. Tester l'endpoint de notification
    test_notification_endpoint()
    
    # 3. Améliorer la logique
    improve_notification_logic()
    
    print("\n" + "=" * 60)
    print("✅ Correction et amélioration terminées")
    print(f"\n📋 Résumé:")
    print(f"   - {fixed_count} abonnements corrigés")
    print("   - Test de notification effectué")
    print("   - Code amélioré généré")
    print("\n📝 Instructions:")
    print("1. Remplacer la fonction notify dans views.py par le code amélioré")
    print("2. Redémarrer le serveur Django")
    print("3. Tester avec un nouveau paiement") 