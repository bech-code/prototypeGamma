import uuid
import requests
from django.conf import settings

CINETPAY_API_URL = getattr(settings, 'CINETPAY_CONFIG', {}).get('API_URL', 'https://api-checkout.cinetpay.com/v2/payment')
API_KEY = getattr(settings, 'CINETPAY_CONFIG', {}).get('API_KEY', '')
SITE_ID = getattr(settings, 'CINETPAY_CONFIG', {}).get('SITE_ID', '')
NOTIFY_URL = getattr(settings, 'CINETPAY_CONFIG', {}).get('NOTIFY_URL', 'http://localhost:8000/depannage/api/cinetpay/notify/')
RETURN_URL = getattr(settings, 'CINETPAY_CONFIG', {}).get('RETURN_URL', 'http://localhost:5173/payment/success')


def generate_transaction_id():
    return f"DEPANNETELIMAN-{uuid.uuid4().hex[:10]}"


def init_cinetpay_payment(amount, phone, name, description, metadata=None):
    headers = {
        "Content-Type": "application/json"
    }
    data = {
        "apikey": API_KEY,
        "site_id": SITE_ID,
        "transaction_id": generate_transaction_id(),
        "amount": amount,
        "currency": "XOF",
        "description": description,
        "customer_name": name,
        "customer_surname": "",
        "customer_email": "test@example.com",
        "customer_phone_number": phone,
        "customer_address": "Bamako",
        "customer_city": "Bamako",
        "customer_country": "ML",
        "notify_url": NOTIFY_URL,
        "return_url": RETURN_URL,
        "channels": "ALL",
        "lang": "fr",
        "metadata": metadata or ""
    }
    response = requests.post(CINETPAY_API_URL, json=data, headers=headers)
    return response.json(), data["transaction_id"] 