"""
Configuration Django pour la production
"""

from .settings import *

# Mode production
DEBUG = False
ALLOWED_HOSTS = ['votre-domaine.com', 'www.votre-domaine.com']

# Configuration de sécurité
SECURE_SSL_REDIRECT = True
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'

# Configuration CinetPay pour la production
CINETPAY_CONFIG = {
    'API_KEY': os.environ.get('CINETPAY_API_KEY', ''),
    'SITE_ID': os.environ.get('CINETPAY_SITE_ID', ''),
    'SECRET_KEY': os.environ.get('CINETPAY_SECRET_KEY', ''),
    'API_URL': 'https://api-checkout.cinetpay.com/v2/payment',
    'CURRENCY': 'XOF',
    'LANG': 'fr',
    'MODE': 'PRODUCTION'
}

# URLs pour la production
BASE_URL = 'https://votre-domaine.com'
FRONTEND_URL = 'https://votre-domaine.com'

# Configuration de base de données pour la production
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'depannage_prod'),
        'USER': os.environ.get('DB_USER', ''),
        'PASSWORD': os.environ.get('DB_PASSWORD', ''),
        'HOST': os.environ.get('DB_HOST', 'localhost'),
        'PORT': os.environ.get('DB_PORT', '5432'),
    }
}

# Configuration Redis pour la production
REDIS_URL = os.environ.get('REDIS_URL', 'redis://localhost:6379/0')

# Configuration de cache
CACHES = {
    'default': {
        'BACKEND': 'django_redis.cache.RedisCache',
        'LOCATION': REDIS_URL,
        'OPTIONS': {
            'CLIENT_CLASS': 'django_redis.client.DefaultClient',
        }
    }
}

# Configuration de logging pour la production
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': '/var/log/django/depannage.log',
            'formatter': 'verbose',
        },
        'console': {
            'level': 'INFO',
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
        'depannage': {
            'handlers': ['file', 'console'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# Configuration de sécurité pour les sessions
SESSION_COOKIE_SECURE = True
CSRF_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
CSRF_COOKIE_HTTPONLY = True

# Configuration pour les fichiers statiques
STATIC_ROOT = '/var/www/static/'
MEDIA_ROOT = '/var/www/media/'

# Configuration pour les emails
EMAIL_BACKEND = 'django.core.mail.backends.smtp.EmailBackend'
EMAIL_HOST = os.environ.get('EMAIL_HOST', 'smtp.gmail.com')
EMAIL_PORT = int(os.environ.get('EMAIL_PORT', '587'))
EMAIL_USE_TLS = True
EMAIL_HOST_USER = os.environ.get('EMAIL_HOST_USER', '')
EMAIL_HOST_PASSWORD = os.environ.get('EMAIL_HOST_PASSWORD', '')

# Configuration pour les notifications push (optionnel)
FCM_DJANGO_SETTINGS = {
    "DEFAULT_FIREBASE_APP_NAME": "[DEFAULT]",
    "FCM_DJANGO_CONN_ENABLED": True,
    "FCM_SERVER_KEY": os.environ.get('FCM_SERVER_KEY', ''),
}

# Configuration pour le monitoring
SENTRY_DSN = os.environ.get('SENTRY_DSN', '')
if SENTRY_DSN:
    import sentry_sdk
    from sentry_sdk.integrations.django import DjangoIntegration
    
    sentry_sdk.init(
        dsn=SENTRY_DSN,
        integrations=[DjangoIntegration()],
        traces_sample_rate=0.1,
        send_default_pii=True,
    )

# Configuration pour les backups automatiques
BACKUP_CONFIG = {
    'ENABLED': True,
    'SCHEDULE': '0 2 * * *',  # Tous les jours à 2h du matin
    'RETENTION_DAYS': 30,
    'BACKUP_DIR': '/var/backups/depannage/',
}

# Configuration pour les métriques
METRICS_CONFIG = {
    'ENABLED': True,
    'COLLECT_INTERVAL': 60,  # secondes
    'ENDPOINTS': [
        'payment_success_rate',
        'average_response_time',
        'active_subscriptions',
        'revenue_daily',
    ]
} 