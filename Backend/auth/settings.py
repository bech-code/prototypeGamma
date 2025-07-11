"""
Paramètres Django pour le projet auth.

Généré par 'django-admin startproject' avec Django 5.2.2.

Pour plus d'informations sur ce fichier, voir
https://docs.djangoproject.com/en/5.2/topics/settings/

Pour la liste complète des paramètres et leurs valeurs, voir
https://docs.djangoproject.com/en/5.2/ref/settings/
"""

from pathlib import Path
from datetime import timedelta
import os
from dotenv import load_dotenv
from django.utils import timezone

# Définir le chemin de base du projet
BASE_DIR = Path(__file__).resolve().parent.parent
# Charger les variables d'environnement depuis un fichier .env à la racine du projet
load_dotenv(dotenv_path=str(BASE_DIR.parent / ".env"), override=True)

# Configuration GDAL pour GeoDjango
GDAL_LIBRARY_PATH = r'C:\OSGeo4W\bin\gdal311.dll'
GEOS_LIBRARY_PATH = r'C:\OSGeo4W\bin\geos_c.dll'

# Paramètres de démarrage rapide - ne pas utiliser en production
# Voir https://docs.djangoproject.com/en/5.2/howto/deployment/checklist/

# ATTENTION : gardez la clé secrète secrète en production !
SECRET_KEY = os.getenv('DJANGO_SECRET_KEY')
if not SECRET_KEY:
    raise ValueError("DJANGO_SECRET_KEY doit être défini dans les variables d'environnement")

# ATTENTION : ne pas activer le debug en production !
DEBUG = os.getenv('DEBUG', 'False').lower() == 'true'

# Hôtes autorisés à accéder à l'application
ALLOWED_HOSTS = [
    '127.0.0.1',
    'localhost',
    'testserver',
]

# Configuration sécurisée de CORS (Cross-Origin Resource Sharing)
CORS_ALLOW_ALL_ORIGINS = True  # Pour le debug uniquement, à retirer en production !
CORS_ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]
CORS_ALLOW_CREDENTIALS = True
CORS_ALLOWED_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
CORS_ALLOWED_HEADERS = ['Content-Type', 'Authorization', 'X-Requested-With']

# Définition des applications installées
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    'rest_framework',
    'corsheaders',
    'users',
    'depannage',
    'rest_framework_simplejwt',
    'rest_framework_simplejwt.token_blacklist',
    'channels',
]

# Définition des middlewares utilisés par le projet
MIDDLEWARE = [
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Middlewares personnalisés pour la sécurité
    'auth.middleware.JWTSecurityMiddleware',
    'auth.middleware.TokenValidationMiddleware',
    # 'auth.middleware.RateLimitMiddleware',  # Décommenter en production pour limiter le nombre de requêtes
]

# Fichier de configuration des URLs principales
ROOT_URLCONF = 'auth.urls'

# Configuration des templates Django
TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

# Point d'entrée WSGI pour le projet
WSGI_APPLICATION = 'auth.wsgi.application'
ASGI_APPLICATION = 'auth.asgi.application'


# Configuration de la base de données (par défaut SQLite)
# Voir https://docs.djangoproject.com/en/5.2/ref/settings/#databases

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}


# Validation des mots de passe
# Voir https://docs.djangoproject.com/en/5.2/ref/settings/#auth-password-validators

AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
        'OPTIONS': {
            'max_similarity': 0.7,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
        'OPTIONS': {
            'min_length': 12,
        }
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]


# Internationalisation
# Voir https://docs.djangoproject.com/en/5.2/topics/i18n/

LANGUAGE_CODE = 'en-us'  # Langue par défaut

TIME_ZONE = 'UTC'  # Fuseau horaire par défaut

USE_I18N = True  # Activer l'internationalisation

USE_TZ = True  # Utiliser les fuseaux horaires


# Fichiers statiques (CSS, JavaScript, Images)
# Voir https://docs.djangoproject.com/en/5.2/howto/static-files/

STATIC_URL = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'

# Type de clé primaire par défaut pour les modèles
# Voir https://docs.djangoproject.com/en/5.2/ref/settings/#default-auto-field

DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Paramètres de sécurité supplémentaires
SECURE_SSL_REDIRECT = False  # Redirection HTTPS désactivée en développement
SECURE_BROWSER_XSS_FILTER = True  # Protection contre les attaques XSS
SECURE_CONTENT_TYPE_NOSNIFF = True  # Empêche le navigateur de deviner le type de contenu
X_FRAME_OPTIONS = 'DENY'  # Interdit l'affichage du site dans une iframe

# URLs de base pour l'API et le frontend (utilisé par exemple pour CinetPay)
BASE_URL = os.getenv('BASE_URL', 'http://127.0.0.1:8000')
FRONTEND_URL = os.getenv('FRONTEND_URL', 'http://127.0.0.1:5173')

# Configuration CinetPay
CINETPAY_API_KEY = os.getenv("CINETPAY_API_KEY", "1152009869685a9c56400b55.82198885")
CINETPAY_SITE_ID = os.getenv("CINETPAY_SITE_ID", "105899471")
CINETPAY_SECRET_KEY = os.getenv("CINETPAY_SECRET_KEY", "656493989685a9ce7af2bd8.69452364")
CINETPAY_ENVIRONMENT = os.getenv("CINETPAY_ENVIRONMENT", "TEST")
CINETPAY_USE_SIMULATOR = os.getenv("CINETPAY_USE_SIMULATOR", "True") == "True"

# Configuration CinetPay pour l'API
CINETPAY_CONFIG = {
    "API_KEY": CINETPAY_API_KEY,
    "SITE_ID": CINETPAY_SITE_ID,
    "SECRET_KEY": CINETPAY_SECRET_KEY,
    "ENVIRONMENT": CINETPAY_ENVIRONMENT,
    "USE_SIMULATOR": CINETPAY_USE_SIMULATOR,
    "API_URL": "https://api-checkout.cinetpay.com/v2/payment",
    "CURRENCY": "XOF",
    "LANG": "fr",
}

# Utilisation d'un modèle utilisateur personnalisé
AUTH_USER_MODEL = 'users.User'

# Configuration de Django REST Framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
    'DEFAULT_PERMISSION_CLASSES': (
        'rest_framework.permissions.IsAuthenticated',
    ),
    'DEFAULT_RENDERER_CLASSES': (
        'rest_framework.renderers.JSONRenderer',
    ),
    'DEFAULT_PARSER_CLASSES': (
        'rest_framework.parsers.JSONParser',
    ),
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 10,
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

# Paramètres du JWT (JSON Web Token) pour l'authentification
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=2),    # Durée de vie du token d'accès (augmentée)
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),    # Durée de vie du token de rafraîchissement (augmentée)
    'ROTATE_REFRESH_TOKENS': True,                  # Rotation automatique des tokens de rafraîchissement
    'BLACKLIST_AFTER_ROTATION': True,               # Blacklister les anciens tokens après rotation
    'ALGORITHM': 'HS256',                           # Algorithme de signature
    'SIGNING_KEY': SECRET_KEY,                      # Clé de signature
    'AUTH_HEADER_TYPES': ('Bearer',),               # Type d'en-tête d'authentification
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'JTI_CLAIM': 'jti',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'UPDATE_LAST_LOGIN': True,                      # Mettre à jour la date de dernière connexion
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
}

# Configuration pour l'intégration de CinetPay (paiement en ligne)
CINETPAY_CONFIG = {
    'API_KEY': os.getenv('CINETPAY_API_KEY', 'test_api_key_123456789'),
    'SITE_ID': os.getenv('CINETPAY_SITE_ID', 'test_site_id_123456'),
    'API_URL': 'https://api-checkout.cinetpay.com/v2/payment',
    'CURRENCY': 'XOF',
    'LANG': 'fr',
    'MODE': os.getenv('CINETPAY_MODE', 'TEST'),
}

# ============================================================================
# CONFIGURATION DE SÉCURITÉ - CORRECTIFS
# ============================================================================

# Protection CSRF
CSRF_COOKIE_SECURE = True
CSRF_COOKIE_HTTPONLY = True
CSRF_TRUSTED_ORIGINS = ['http://localhost:3000', 'http://127.0.0.1:3000']

# Limitation de débit (Rate Limiting)
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
    'DEFAULT_PAGINATION_CLASS': 'rest_framework.pagination.PageNumberPagination',
    'PAGE_SIZE': 20,
    'DEFAULT_THROTTLE_CLASSES': [
        'rest_framework.throttling.UserRateThrottle',
        'rest_framework.throttling.AnonRateThrottle',
        'rest_framework.throttling.ScopedRateThrottle',
    ],
    'DEFAULT_THROTTLE_RATES': {
        'anon': '10000/day',
        'user': '50000/day',
        'login': '1000/day',
        'register': '500/day',
        'password_reset': '500/day',
        'user_me': '1000/day',
    },
    'DEFAULT_RENDERER_CLASSES': [
        'rest_framework.renderers.JSONRenderer',
    ],
    'DEFAULT_PARSER_CLASSES': [
        'rest_framework.parsers.JSONParser',
        'rest_framework.parsers.MultiPartParser',
        'rest_framework.parsers.FormParser',
    ],
    'EXCEPTION_HANDLER': 'rest_framework.views.exception_handler',
}

# Configuration de sécurité supplémentaire
SECURE_BROWSER_XSS_FILTER = True
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = 'DENY'
SECURE_HSTS_SECONDS = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = True

# Configuration des sessions
SESSION_COOKIE_SECURE = True
SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_AGE = 3600  # 1 heure
SESSION_EXPIRE_AT_BROWSER_CLOSE = True

# Configuration JWT
SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(minutes=60),
    'REFRESH_TOKEN_LIFETIME': timedelta(days=7),
    'ROTATE_REFRESH_TOKENS': True,
    'BLACKLIST_AFTER_ROTATION': True,
    'UPDATE_LAST_LOGIN': True,
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
    'VERIFYING_KEY': None,
    'AUDIENCE': None,
    'ISSUER': None,
    'JWK_URL': None,
    'LEEWAY': 0,
    'AUTH_HEADER_TYPES': ('Bearer',),
    'AUTH_HEADER_NAME': 'HTTP_AUTHORIZATION',
    'USER_ID_FIELD': 'id',
    'USER_ID_CLAIM': 'user_id',
    'USER_AUTHENTICATION_RULE': 'rest_framework_simplejwt.authentication.default_user_authentication_rule',
    'AUTH_TOKEN_CLASSES': ('rest_framework_simplejwt.tokens.AccessToken',),
    'TOKEN_TYPE_CLAIM': 'token_type',
    'TOKEN_USER_CLASS': 'rest_framework_simplejwt.models.TokenUser',
    'JTI_CLAIM': 'jti',
    'SLIDING_TOKEN_REFRESH_EXP_CLAIM': 'refresh_exp',
    'SLIDING_TOKEN_LIFETIME': timedelta(minutes=5),
    'SLIDING_TOKEN_REFRESH_LIFETIME': timedelta(days=1),
}

# Configuration de logging pour la sécurité
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '{levelname} {asctime} {module} {process:d} {thread:d} {message}',
            'style': '{',
        },
        'simple': {
            'format': '{levelname} {message}',
            'style': '{',
        },
    },
    'handlers': {
        'file': {
            'level': 'INFO',
            'class': 'logging.FileHandler',
            'filename': 'django.log',
            'formatter': 'verbose',
        },
        'security_file': {
            'level': 'WARNING',
            'class': 'logging.FileHandler',
            'filename': 'security.log',
            'formatter': 'verbose',
        },
    },
    'loggers': {
        'django': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'django.security': {
            'handlers': ['security_file'],
            'level': 'WARNING',
            'propagate': False,
        },
        'users': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
        'depannage': {
            'handlers': ['file'],
            'level': 'INFO',
            'propagate': True,
        },
    },
}

# Configuration de cache pour les performances
CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
        'LOCATION': 'unique-snowflake',
        'TIMEOUT': 300,  # 5 minutes
        'OPTIONS': {
            'MAX_ENTRIES': 1000,
        },
    },
}

# Configuration pour les fichiers média
MEDIA_URL = '/media/'
MEDIA_ROOT = os.path.join(BASE_DIR, 'media')

# Configuration pour les fichiers statiques
STATIC_URL = '/static/'
STATIC_ROOT = os.path.join(BASE_DIR, 'staticfiles')

# Configuration pour les emails
EMAIL_BACKEND = 'django.core.mail.backends.console.EmailBackend'
EMAIL_HOST = 'localhost'
EMAIL_PORT = 1025
EMAIL_USE_TLS = False
EMAIL_HOST_USER = ''
EMAIL_HOST_PASSWORD = ''

# Configuration pour les notifications
NOTIFICATION_CHANNELS = {
    'email': True,
    'sms': False,
    'push': False,
}

# Configuration pour les paiements
PAYMENT_SETTINGS = {
    'CINETPAY_API_KEY': os.environ.get('CINETPAY_API_KEY', ''),
    'CINETPAY_SITE_ID': os.environ.get('CINETPAY_SITE_ID', ''),
    'CINETPAY_ENVIRONMENT': os.environ.get('CINETPAY_ENVIRONMENT', 'TEST'),
}

# Configuration pour la géolocalisation
GEOLOCATION_SETTINGS = {
    'DEFAULT_RADIUS_KM': 10,
    'MAX_RADIUS_KM': 50,
    'CACHE_TIMEOUT': 3600,  # 1 heure
}

# Channels layer config (dev only)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}
