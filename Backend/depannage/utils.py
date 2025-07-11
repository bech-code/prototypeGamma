import uuid
import hashlib
import hmac
from django.conf import settings
from datetime import datetime
from math import radians, sin, cos, sqrt, atan2


def calculate_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Calculate the distance between two points using the Haversine formula.

    Args:
        lat1: Latitude of the first point
        lon1: Longitude of the first point
        lat2: Latitude of the second point
        lon2: Longitude of the second point

    Returns:
        Distance in kilometers
    """
    R = 6371  # Rayon de la Terre en kilomètres

    lat1, lon1, lat2, lon2 = map(radians, [lat1, lon1, lat2, lon2])

    dlat = lat2 - lat1
    dlon = lon2 - lon1

    a = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    distance = R * c

    return distance

def generate_transaction_id():
    """Génère un identifiant de transaction unique."""
    return f"TXN-{uuid.uuid4().hex[:12].upper()}"

def generate_cinetpay_signature(data, secret_key):
    """Génère la signature CinetPay pour la validation."""
    # Trier les clés par ordre alphabétique
    sorted_data = dict(sorted(data.items()))
    
    # Créer la chaîne à signer
    string_to_sign = ""
    for key, value in sorted_data.items():
        if key != "signature" and value is not None:
            string_to_sign += f"{key}={value}&"
    
    # Supprimer le dernier "&"
    string_to_sign = string_to_sign.rstrip("&")
    
    # Créer la signature HMAC-SHA256
    signature = hmac.new(
        secret_key.encode('utf-8'),
        string_to_sign.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return signature

def verify_cinetpay_signature(data, secret_key):
    """Vérifie la signature CinetPay reçue."""
    if "signature" not in data:
        return False
    
    expected_signature = data["signature"]
    calculated_signature = generate_cinetpay_signature(data, secret_key)
    
    return hmac.compare_digest(expected_signature, calculated_signature)

def format_amount_for_cinetpay(amount):
    """Formate le montant pour CinetPay (doit être un multiple de 5)."""
    amount_int = int(amount)
    if amount_int % 5 != 0:
        amount_int = ((amount_int // 5) + 1) * 5
    return amount_int

def get_cinetpay_config():
    """Récupère la configuration CinetPay depuis les settings."""
    return getattr(settings, 'CINETPAY_CONFIG', {})

def is_simulator_mode():
    """Vérifie si le simulateur CinetPay est activé."""
    config = get_cinetpay_config()
    return config.get('USE_SIMULATOR', True)

def log_payment_attempt(transaction_id, amount, user_id, status="pending"):
    """Enregistre une tentative de paiement pour audit."""
    from .models import CinetPayPayment
    from django.utils import timezone
    
    try:
        CinetPayPayment.objects.create(
            transaction_id=transaction_id,
            amount=amount,
            status=status,
            created_at=timezone.now(),
            metadata=f"user_{user_id}_simulator_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
    except Exception as e:
        print(f"Erreur lors de l'enregistrement du paiement: {e}")

def validate_payment_data(data):
    """Valide les données de paiement reçues."""
    required_fields = ['transaction_id', 'amount', 'status']
    
    for field in required_fields:
        if field not in data:
            return False, f"Champ requis manquant: {field}"
    
    # Valider le montant
    try:
        amount = float(data['amount'])
        if amount <= 0:
            return False, "Le montant doit être positif"
    except (ValueError, TypeError):
        return False, "Montant invalide"
    
    # Valider le statut
    valid_statuses = ['ACCEPTED', 'REFUSED', 'CANCELLED', 'PENDING']
    if data['status'] not in valid_statuses:
        return False, f"Statut invalide: {data['status']}"
    
    return True, "Données valides"
