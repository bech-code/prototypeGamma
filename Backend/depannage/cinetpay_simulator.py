"""
Simulateur CinetPay pour le développement
Ce module simule les réponses de CinetPay pour permettre le développement sans vraies clés
"""

import uuid
import json
from datetime import datetime, timedelta
from django.conf import settings

class CinetPaySimulator:
    """Simulateur de l'API CinetPay pour le développement"""
    
    def __init__(self):
        self.payments = {}  # Stockage des paiements simulés
        
    def simulate_payment_initiation(self, data):
        """Simule l'initiation d'un paiement CinetPay"""
        
        # Vérifier les champs requis
        required_fields = ['apikey', 'site_id', 'transaction_id', 'amount', 'currency', 'description']
        missing_fields = [field for field in required_fields if not data.get(field)]
        
        if missing_fields:
            return {
                "success": False,
                "error": "MINIMUM_REQUIRED_FIELDS",
                "description": f"Champs manquants: {', '.join(missing_fields)}"
            }
        
        # Générer une URL de paiement simulée
        payment_url = f"https://simulator.cinetpay.com/pay/{data['transaction_id']}"
        
        # Stocker les informations du paiement
        self.payments[data['transaction_id']] = {
            'data': data,
            'status': 'PENDING',
            'created_at': datetime.now(),
            'payment_url': payment_url
        }
        
        return {
            "success": True,
            "code": "201",
            "message": "PAYMENT_INITIATED",
            "description": "Paiement initié avec succès",
            "data": {
                "payment_url": payment_url,
                "transaction_id": data['transaction_id'],
                "amount": data['amount'],
                "currency": data['currency']
            }
        }
    
    def simulate_payment_status(self, transaction_id):
        """Simule la vérification du statut d'un paiement"""
        
        if transaction_id not in self.payments:
            return {
                "success": False,
                "error": "TRANSACTION_NOT_FOUND",
                "description": "Transaction non trouvée"
            }
        
        payment = self.payments[transaction_id]
        
        # Simuler différents statuts selon le temps écoulé
        elapsed = datetime.now() - payment['created_at']
        
        if elapsed < timedelta(minutes=1):
            status = "PENDING"
        elif elapsed < timedelta(minutes=2):
            status = "SUCCESS"
            payment['status'] = status
        else:
            status = "FAILED"
            payment['status'] = status
        
        return {
            "success": True,
            "code": "200",
            "message": "PAYMENT_STATUS_RETRIEVED",
            "data": {
                "transaction_id": transaction_id,
                "status": status,
                "amount": payment['data']['amount'],
                "currency": payment['data']['currency'],
                "customer_name": payment['data'].get('customer_name', ''),
                "customer_email": payment['data'].get('customer_email', ''),
                "customer_phone_number": payment['data'].get('customer_phone_number', '')
            }
        }
    
    def simulate_notification(self, transaction_id, status="SUCCESS"):
        """Simule une notification de paiement"""
        
        if transaction_id not in self.payments:
            return {
                "success": False,
                "error": "TRANSACTION_NOT_FOUND"
            }
        
        payment = self.payments[transaction_id]
        payment['status'] = status
        
        return {
            "success": True,
            "code": "200",
            "message": "NOTIFICATION_PROCESSED",
            "data": {
                "transaction_id": transaction_id,
                "status": status,
                "amount": payment['data']['amount'],
                "currency": payment['data']['currency']
            }
        }

# Instance globale du simulateur
simulator = CinetPaySimulator()

def init_cinetpay_payment_simulated(amount, phone, name, description, metadata=None, email=None):
    """Version simulée de l'initiation de paiement CinetPay"""
    
    transaction_id = f"SIM-{uuid.uuid4().hex[:10]}"
    
    data = {
        "apikey": "simulated_api_key",
        "site_id": "simulated_site_id",
        "transaction_id": transaction_id,
        "amount": int(amount),
        "currency": "XOF",
        "description": description,
        "customer_name": name,
        "customer_surname": name.split()[-1] if name and ' ' in name else "",
        "customer_email": email or "test@example.com",
        "customer_phone_number": phone,
        "customer_address": "Bamako, Mali",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_zip_code": "1000",
        "notify_url": "http://localhost:8000/depannage/api/cinetpay/notify/",
        "return_url": "http://localhost:5173/payment/success",
        "channels": "ALL",
        "lang": "fr",
        "metadata": metadata or ""
    }
    
    print(f"🔧 SIMULATION CINETPAY:")
    print(f"   Transaction ID: {transaction_id}")
    print(f"   Amount: {amount}")
    print(f"   Customer: {name}")
    print(f"   Email: {email or 'test@example.com'}")
    
    result = simulator.simulate_payment_initiation(data)
    
    print(f"   Result: {result}")
    
    return result, transaction_id

def check_cinetpay_payment_status_simulated(transaction_id):
    """Version simulée de la vérification de statut CinetPay"""
    
    result = simulator.simulate_payment_status(transaction_id)
    
    print(f"🔧 VÉRIFICATION STATUT SIMULÉ:")
    print(f"   Transaction ID: {transaction_id}")
    print(f"   Status: {result.get('data', {}).get('status', 'UNKNOWN')}")
    
    return result 