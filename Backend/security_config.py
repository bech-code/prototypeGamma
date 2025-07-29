
# Configuration de sécurité renforcée pour DepanneTeliman

# En-têtes de sécurité
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# CSRF
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_COOKIE_SAMESITE = 'Strict'

# Session
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SAMESITE = 'Strict'
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# Rate Limiting
REST_FRAMEWORK = {
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '100/hour',
        'user': '1000/hour',
        'login': '5/minute',
        'register': '3/minute',
        'reset_password': '3/hour',
    }
}

# Validation des données
VALIDATION_RULES = {
    'password_min_length': 8,
    'password_require_special': True,
    'phone_format': r'^\+?[1-9]\d{1,14}$',
    'email_domains_allowed': ['gmail.com', 'yahoo.com', 'outlook.com'],
}

# Chiffrement des données sensibles
from cryptography.fernet import Fernet
ENCRYPTION_KEY = Fernet.generate_key()
cipher_suite = Fernet(ENCRYPTION_KEY)

def encrypt_sensitive_data(data):
    return cipher_suite.encrypt(data.encode()).decode()

def decrypt_sensitive_data(encrypted_data):
    return cipher_suite.decrypt(encrypted_data.encode()).decode()
