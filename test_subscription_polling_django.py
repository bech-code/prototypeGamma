#!/usr/bin/env python3
"""
Script de test Django pour vérifier le polling d'activation d'abonnement technicien.
Teste la synchronisation frontend/backend pour l'activation d'abonnement.
"""

import os
import sys
import django
import logging
from datetime import datetime, timedelta

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.auth.settings')
sys.path.append(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'Backend'))
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from depannage.models import Technician, TechnicianSubscription, CinetPayPayment, Payment
from depannage.views import get_technician_profile

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

User = get_user_model()

class SubscriptionPollingTester:
    def __init__(self):
        self.technician = None
        self.user = None
        
    def setup_test_technician(self):
        """Créer ou récupérer un technicien de test."""
        try:
            # Essayer de récupérer un technicien existant
            self.user = User.objects.filter(user_type='technician').first()
            
            if not self.user:
                # Créer un technicien de test
                self.user = User.objects.create_user(
                    username='test_technician_polling',
                    email='test@example.com',
                    password='testpass123',
                    user_type='technician',
                    first_name='Test',
                    last_name='Technicien'
                )
                logger.info("✅ Utilisateur technicien de test créé")
            else:
                logger.info("✅ Utilisateur technicien existant trouvé")
            
            # Récupérer ou créer le profil technicien
            self.technician = get_technician_profile(self.user)
            
            if not self.technician:
                # Créer le profil technicien
                self.technician = Technician.objects.create(
                    user=self.user,
                    specialty='electrician',
                    phone='+22300000000',
                    is_available=True,
                    is_verified=True
                )
                logger.info("✅ Profil technicien créé")
            else:
                logger.info("✅ Profil technicien existant trouvé")
                
            return True
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la création du technicien de test: {e}")
            return False
    
    def check_subscription_status(self):
        """Vérifier le statut d'abonnement actuel."""
        try:
            from depannage.views import TechnicianViewSet
            from rest_framework.test import APIRequestFactory
            from django.contrib.auth.models import AnonymousUser
            
            # Créer une requête simulée
            factory = APIRequestFactory()
            request = factory.get('/depannage/api/technicians/subscription_status/')
            request.user = self.user
            
            # Créer une instance du ViewSet
            viewset = TechnicianViewSet()
            viewset.request = request
            
            # Appeler la méthode subscription_status
            response = viewset.subscription_status(request)
            
            if response.status_code == 200:
                data = response.data
                logger.info(f"📊 Statut abonnement: {data.get('status')}")
                logger.info(f"📊 Peut recevoir des demandes: {data.get('can_receive_requests')}")
                logger.info(f"📊 Jours restants: {data.get('days_remaining')}")
                return data
            else:
                logger.error(f"❌ Erreur vérification statut: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erreur lors de la vérification: {e}")
            return None
    
    def simulate_payment_activation(self):
        """Simuler l'activation d'un abonnement via paiement."""
        try:
            # Créer un paiement CinetPay simulé
            payment = CinetPayPayment.objects.create(
                transaction_id=f"test_polling_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                amount=5000,
                currency="XOF",
                description="Test abonnement technicien - Polling",
                customer_name="Test",
                customer_surname="Technicien",
                customer_email="test@example.com",
                customer_phone_number="+22300000000",
                customer_address="Test Address",
                customer_city="Bamako",
                customer_country="ML",
                customer_state="ML",
                customer_zip_code="00000",
                status="success",
                metadata='{"user_id": ' + str(self.user.id) + ', "technician_id": ' + str(self.technician.id) + ', "duration_months": 1, "subscription_type": "technician_premium"}',
                user=self.user
            )
            
            logger.info(f"✅ Paiement CinetPay simulé créé: {payment.transaction_id}")
            
            # Créer l'abonnement
            now = timezone.now()
            subscription = TechnicianSubscription.objects.create(
                technician=self.technician,
                plan_name="Test Polling 1 mois",
                start_date=now,
                end_date=now + timedelta(days=30),
                payment=payment,
                is_active=True
            )
            
            logger.info(f"✅ Abonnement créé: {subscription.id}")
            return subscription
            
        except Exception as e:
            logger.error(f"❌ Erreur lors de la simulation d'activation: {e}")
            return None
    
    def test_polling_simulation(self):
        """Test complet du polling d'activation."""
        logger.info("🚀 Début du test de polling d'activation d'abonnement")
        
        # 1. Vérifier le statut initial
        logger.info("📋 Étape 1: Vérification du statut initial")
        initial_status = self.check_subscription_status()
        if not initial_status:
            logger.error("❌ Impossible de récupérer le statut initial")
            return False
        
        # 2. Simuler l'activation d'un abonnement
        logger.info("📋 Étape 2: Simulation de l'activation d'un abonnement")
        subscription = self.simulate_payment_activation()
        if not subscription:
            logger.error("❌ Impossible de simuler l'activation")
            return False
        
        # 3. Polling pour vérifier l'activation
        logger.info("📋 Étape 3: Polling pour vérifier l'activation")
        max_attempts = 10
        attempt = 0
        
        while attempt < max_attempts:
            attempt += 1
            logger.info(f"🔄 Tentative {attempt}/{max_attempts}")
            
            status = self.check_subscription_status()
            if status and status.get('can_receive_requests'):
                logger.info("✅ Abonnement activé avec succès !")
                logger.info(f"📊 Statut final: {status}")
                return True
            
            # Attendre 1 seconde entre chaque vérification
            import time
            time.sleep(1)
        
        logger.error("❌ Timeout: L'abonnement n'a pas été activé dans le délai imparti")
        return False
    
    def test_frontend_polling_logic(self):
        """Test de la logique de polling côté frontend."""
        logger.info("🚀 Test de la logique de polling frontend")
        
        # Simuler les appels API que ferait le frontend
        polling_attempts = []
        max_attempts = 5
        
        for attempt in range(1, max_attempts + 1):
            logger.info(f"🔄 Tentative frontend {attempt}/{max_attempts}")
            
            status = self.check_subscription_status()
            polling_attempts.append({
                'attempt': attempt,
                'timestamp': datetime.now().isoformat(),
                'status': status
            })
            
            if status and status.get('can_receive_requests'):
                logger.info("✅ Activation détectée par le polling frontend")
                logger.info(f"📊 Nombre de tentatives: {attempt}")
                return True
            
            import time
            time.sleep(1)
        
        logger.warning("⚠️ Polling frontend terminé sans activation")
        return False
    
    def cleanup_test_data(self):
        """Nettoyer les données de test."""
        try:
            # Supprimer les abonnements de test
            TechnicianSubscription.objects.filter(
                technician=self.technician,
                plan_name__contains="Test Polling"
            ).delete()
            
            # Supprimer les paiements de test
            CinetPayPayment.objects.filter(
                transaction_id__contains="test_polling"
            ).delete()
            
            logger.info("✅ Données de test nettoyées")
            
        except Exception as e:
            logger.error(f"❌ Erreur lors du nettoyage: {e}")

def main():
    """Fonction principale de test."""
    tester = SubscriptionPollingTester()
    
    # Configuration du test
    if not tester.setup_test_technician():
        logger.error("❌ Impossible de configurer le technicien de test. Arrêt du test.")
        return
    
    logger.info("=" * 60)
    logger.info("🧪 TEST 1: Polling d'activation complet")
    logger.info("=" * 60)
    
    success1 = tester.test_polling_simulation()
    
    logger.info("=" * 60)
    logger.info("🧪 TEST 2: Logique de polling frontend")
    logger.info("=" * 60)
    
    success2 = tester.test_frontend_polling_logic()
    
    # Nettoyage
    tester.cleanup_test_data()
    
    # Résumé
    logger.info("=" * 60)
    logger.info("📋 RÉSUMÉ DES TESTS")
    logger.info("=" * 60)
    logger.info(f"Test 1 (Polling complet): {'✅ SUCCÈS' if success1 else '❌ ÉCHEC'}")
    logger.info(f"Test 2 (Logique frontend): {'✅ SUCCÈS' if success2 else '❌ ÉCHEC'}")
    
    if success1 and success2:
        logger.info("🎉 Tous les tests sont passés avec succès !")
        logger.info("✅ La synchronisation frontend/backend fonctionne correctement.")
        logger.info("✅ Le polling d'activation d'abonnement est opérationnel.")
    else:
        logger.error("❌ Certains tests ont échoué. Vérifiez la configuration.")

if __name__ == "__main__":
    main() 