#!/usr/bin/env python3
"""
Script de test pour vérifier le polling d'activation d'abonnement technicien.
Teste la synchronisation frontend/backend pour l'activation d'abonnement.
"""

import requests
import json
import time
import logging
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/depannage/api"

# Configuration du logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

class SubscriptionPollingTester:
    def __init__(self):
        self.session = requests.Session()
        self.token = None
        self.technician_id = None
        
    def login_technician(self, username="test_technician", password="testpass123"):
        """Connexion d'un technicien de test."""
        try:
            login_data = {
                "username": username,
                "password": password
            }
            
            response = self.session.post(f"{BASE_URL}/auth/login/", json=login_data)
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                logger.info(f"✅ Connexion réussie pour {username}")
                return True
            else:
                logger.error(f"❌ Échec de connexion: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur de connexion: {e}")
            return False
    
    def check_subscription_status(self):
        """Vérifier le statut d'abonnement actuel."""
        try:
            response = self.session.get(f"{API_BASE}/technicians/subscription_status/")
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"📊 Statut abonnement: {data.get('status')}")
                logger.info(f"📊 Peut recevoir des demandes: {data.get('can_receive_requests')}")
                logger.info(f"📊 Jours restants: {data.get('days_remaining')}")
                return data
            else:
                logger.error(f"❌ Erreur vérification statut: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erreur réseau: {e}")
            return None
    
    def simulate_payment_success(self):
        """Simuler un paiement réussi pour déclencher l'activation."""
        try:
            # Créer un paiement CinetPay simulé
            payment_data = {
                "amount": 5000,
                "phone": "+22300000000",
                "name": "Test Technicien",
                "description": "Test abonnement technicien",
                "metadata": json.dumps({
                    "user_id": 1,
                    "technician_id": 1,
                    "duration_months": 1,
                    "subscription_type": "technician_premium"
                })
            }
            
            response = self.session.post(f"{API_BASE}/cinetpay/initiate_subscription_payment/", json=payment_data)
            
            if response.status_code == 200:
                data = response.json()
                logger.info(f"✅ Paiement initié: {data.get('transaction_id')}")
                return data.get('transaction_id')
            else:
                logger.error(f"❌ Erreur initiation paiement: {response.status_code}")
                return None
                
        except Exception as e:
            logger.error(f"❌ Erreur simulation paiement: {e}")
            return None
    
    def simulate_cinetpay_notification(self, transaction_id):
        """Simuler la notification CinetPay pour activer l'abonnement."""
        try:
            notification_data = {
                "transaction_id": transaction_id,
                "status": "success",
                "amount": 5000,
                "payment_date": datetime.now().isoformat(),
                "metadata": json.dumps({
                    "user_id": 1,
                    "technician_id": 1,
                    "duration_months": 1,
                    "subscription_type": "technician_premium"
                })
            }
            
            response = self.session.post(f"{BASE_URL}/depannage/api/cinetpay/notification/", json=notification_data)
            
            if response.status_code == 200:
                logger.info(f"✅ Notification CinetPay simulée pour {transaction_id}")
                return True
            else:
                logger.error(f"❌ Erreur notification: {response.status_code}")
                return False
                
        except Exception as e:
            logger.error(f"❌ Erreur simulation notification: {e}")
            return False
    
    def test_polling_simulation(self):
        """Test complet du polling d'activation."""
        logger.info("🚀 Début du test de polling d'activation d'abonnement")
        
        # 1. Vérifier le statut initial
        logger.info("📋 Étape 1: Vérification du statut initial")
        initial_status = self.check_subscription_status()
        if not initial_status:
            logger.error("❌ Impossible de récupérer le statut initial")
            return False
        
        # 2. Simuler un paiement
        logger.info("📋 Étape 2: Simulation d'un paiement")
        transaction_id = self.simulate_payment_success()
        if not transaction_id:
            logger.error("❌ Impossible de simuler le paiement")
            return False
        
        # 3. Simuler la notification CinetPay
        logger.info("📋 Étape 3: Simulation de la notification CinetPay")
        if not self.simulate_cinetpay_notification(transaction_id):
            logger.error("❌ Impossible de simuler la notification")
            return False
        
        # 4. Polling pour vérifier l'activation
        logger.info("📋 Étape 4: Polling pour vérifier l'activation")
        max_attempts = 15  # 30 secondes max
        attempt = 0
        
        while attempt < max_attempts:
            attempt += 1
            logger.info(f"🔄 Tentative {attempt}/{max_attempts}")
            
            status = self.check_subscription_status()
            if status and status.get('can_receive_requests'):
                logger.info("✅ Abonnement activé avec succès !")
                logger.info(f"📊 Statut final: {status}")
                return True
            
            time.sleep(2)  # Attendre 2 secondes entre chaque vérification
        
        logger.error("❌ Timeout: L'abonnement n'a pas été activé dans le délai imparti")
        return False
    
    def test_frontend_polling_logic(self):
        """Test de la logique de polling côté frontend."""
        logger.info("🚀 Test de la logique de polling frontend")
        
        # Simuler les appels API que ferait le frontend
        polling_attempts = []
        max_attempts = 10
        
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
            
            time.sleep(2)
        
        logger.warning("⚠️ Polling frontend terminé sans activation")
        return False

def main():
    """Fonction principale de test."""
    tester = SubscriptionPollingTester()
    
    # Test de connexion
    if not tester.login_technician():
        logger.error("❌ Impossible de se connecter. Arrêt du test.")
        return
    
    logger.info("=" * 60)
    logger.info("🧪 TEST 1: Polling d'activation complet")
    logger.info("=" * 60)
    
    success1 = tester.test_polling_simulation()
    
    logger.info("=" * 60)
    logger.info("🧪 TEST 2: Logique de polling frontend")
    logger.info("=" * 60)
    
    success2 = tester.test_frontend_polling_logic()
    
    # Résumé
    logger.info("=" * 60)
    logger.info("📋 RÉSUMÉ DES TESTS")
    logger.info("=" * 60)
    logger.info(f"Test 1 (Polling complet): {'✅ SUCCÈS' if success1 else '❌ ÉCHEC'}")
    logger.info(f"Test 2 (Logique frontend): {'✅ SUCCÈS' if success2 else '❌ ÉCHEC'}")
    
    if success1 and success2:
        logger.info("🎉 Tous les tests sont passés avec succès !")
        logger.info("✅ La synchronisation frontend/backend fonctionne correctement.")
    else:
        logger.error("❌ Certains tests ont échoué. Vérifiez la configuration.")

if __name__ == "__main__":
    main() 