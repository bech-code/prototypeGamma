import uuid
import requests
import logging
from django.conf import settings
from django.utils import timezone
from .utils import generate_transaction_id, format_amount_for_cinetpay, is_simulator_mode, log_payment_attempt
from .mali_pricing import CURRENCY, COUNTRY_CODE, PHONE_PREFIX, TEST_AMOUNTS, format_price

logger = logging.getLogger(__name__)

# Configuration CinetPay
CINETPAY_CONFIG = getattr(settings, 'CINETPAY_CONFIG', {})
CINETPAY_API_URL = CINETPAY_CONFIG.get('API_URL', 'https://api-checkout.cinetpay.com/v2/payment')
API_KEY = CINETPAY_CONFIG.get('API_KEY', '')
SITE_ID = CINETPAY_CONFIG.get('SITE_ID', '')
SECRET_KEY = CINETPAY_CONFIG.get('SECRET_KEY', '')
NOTIFY_URL = f"{settings.BASE_URL}/depannage/api/cinetpay/notify/"
RETURN_URL = f"{settings.FRONTEND_URL}/payment/success"


def init_cinetpay_payment(amount, phone, name, description, metadata=None, email=None, user=None):
    """Initie un paiement CinetPay (réel ou simulé)"""
    
    # Vérifier le mode simulateur
    if is_simulator_mode():
        logger.info("🔧 [SIMULATEUR] Paiement fictif initié")
        return init_cinetpay_payment_simulated(amount, phone, name, description, metadata, email, user)
    
    # Mode production - vraie API CinetPay
    logger.info("🌐 [PRODUCTION] Appel API CinetPay réel")
    return init_cinetpay_payment_real(amount, phone, name, description, metadata, email, user)


def init_cinetpay_payment_simulated(amount, phone, name, description, metadata=None, email=None, user=None):
    """Simule un paiement CinetPay en mode test"""
    
    # Générer un ID de transaction unique
    transaction_id = generate_transaction_id()
    
    # Formater le montant pour CinetPay
    formatted_amount = format_amount_for_cinetpay(amount)
    
    # Créer un paiement simulé dans la base de données
    from .models import CinetPayPayment
    
    payment = CinetPayPayment.objects.create(
        transaction_id=transaction_id,
        amount=formatted_amount,
        currency="XOF",
        description=description,
        customer_name=name or "Test User",
        customer_surname="",
        customer_email=email or "test@example.com",
        customer_phone_number=phone or "+22300000000",
        customer_address="Test Address",
        customer_city="Bamako",
        customer_country="ML",
        customer_state="ML",
        customer_zip_code="00000",
        status="pending",
        metadata=str(metadata) if metadata else "",
        user=user
    )
    
    # URL de redirection simulée
    simulated_url = f"{settings.FRONTEND_URL}/payment/success?transaction_id={transaction_id}&amount={formatted_amount}&status=success"
    
    logger.info(f"🔧 [SIMULATEUR] Paiement créé: {transaction_id} - {formatted_amount} FCFA")
    
    return {
        "success": True,
        "code": "201",
        "data": {
            "payment_url": simulated_url,
            "payment_token": f"sim_token_{transaction_id}",
            "transaction_id": transaction_id
        },
        "message": "Paiement simulé initié avec succès"
    }, transaction_id


def init_cinetpay_payment_real(amount, phone, name, description, metadata=None, email=None, user=None):
    """Initie un vrai paiement CinetPay"""
    
    headers = {
        "Content-Type": "application/json",
        "User-Agent": "Django-CinetPay-Integration/1.0"
    }
    
    # Générer un ID de transaction unique
    transaction_id = generate_transaction_id()
    
    # Formater le montant pour CinetPay
    formatted_amount = format_amount_for_cinetpay(amount)
    
    data = {
        "apikey": API_KEY,
        "site_id": SITE_ID,
        "transaction_id": transaction_id,
        "amount": formatted_amount,
        "currency": "XOF",
        "description": description,
        "customer_name": name or "Test User",
        "customer_surname": name.split()[-1] if name and ' ' in name else "",
        "customer_email": email or "test@example.com",
        "customer_phone_number": phone or "+22300000000",
        "customer_address": "Bamako, Mali",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "customer_state": "ML",
        "customer_zip_code": "1000",
        "notify_url": NOTIFY_URL,
        "return_url": RETURN_URL,
        "channels": "ALL",
        "lang": "fr",
        "metadata": str(metadata) if metadata else "",
        "invoice_data": "",
        "cp_currency": "XOF",
        "cp_phone_prefix": "223"
    }
    
    logger.info(f"🌐 [PRODUCTION] Requête CinetPay: {data}")
    
    try:
        response = requests.post(CINETPAY_API_URL, json=data, headers=headers, timeout=30)
        
        logger.info(f"🌐 [PRODUCTION] Réponse CinetPay - Status: {response.status_code}")
        logger.info(f"🌐 [PRODUCTION] Réponse CinetPay - Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            
            if data.get("code") == "201":
                # Succès - Créer l'enregistrement en base
                from .models import CinetPayPayment
                
                CinetPayPayment.objects.create(
                    transaction_id=transaction_id,
                    amount=formatted_amount,
                    currency="XOF",
                    description=description,
                    customer_name=name or "Test User",
                    customer_surname="",
                    customer_email=email or "test@example.com",
                    customer_phone_number=phone or "+22300000000",
                    customer_address="Bamako, Mali",
                    customer_city="Bamako",
                    customer_country="ML",
                    customer_state="ML",
                    customer_zip_code="1000",
                    status="pending",
                    metadata=str(metadata) if metadata else "",
                    user=user,
                    payment_token=data["data"]["payment_token"],
                    payment_url=data["data"]["payment_url"]
                )
                
                return {
                    "success": True,
                    "code": "201",
                    "data": {
                        "payment_url": data["data"]["payment_url"],
                        "payment_token": data["data"]["payment_token"],
                        "transaction_id": transaction_id
                    },
                    "message": "Paiement CinetPay initié avec succès"
                }, transaction_id
            else:
                return {
                    "success": False,
                    "error": f"CinetPay Error {data.get('code')}: {data.get('message', 'Erreur inconnue')}"
                }, transaction_id
        else:
            return {
                "success": False,
                "error": f"Erreur HTTP {response.status_code}: {response.text}"
            }, transaction_id
            
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Erreur de connexion à CinetPay: {str(e)}")
        return {
            "success": False,
            "error": "Erreur de connexion au service de paiement"
        }, transaction_id
    except Exception as e:
        logger.error(f"❌ Erreur lors de l'initialisation CinetPay: {str(e)}")
        return {
            "success": False,
            "error": "Erreur interne du serveur"
        }, transaction_id 