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
# Charger les variables d'environnement depuis un fichier .env à la racine du Backend
load_dotenv(dotenv_path=str(BASE_DIR / ".env"), override=True)

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
ALLOWED_HOSTS = os.getenv('ALLOWED_HOSTS', '127.0.0.1,localhost').split(',')

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
    'API_KEY': os.getenv('CINETPAY_API_KEY', ''),
    'SITE_ID': os.getenv('CINETPAY_SITE_ID', ''),
    'API_URL': 'https://api-checkout.cinetpay.com/v2/payment',
    'CURRENCY': 'XOF',
    'LANG': 'fr',
    'MODE': os.getenv('CINETPAY_MODE', 'TEST'),
}

# --- CSRF (pour les cookies sécurisés, si besoin) ---
CSRF_TRUSTED_ORIGINS = [
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# Configuration des logs
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
        'console': {
            'level': 'DEBUG',
            'class': 'logging.StreamHandler',
            'formatter': 'simple',
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
            'level': 'DEBUG',
            'propagate': True,
        },
        'users': {
            'handlers': ['file', 'console'],
            'level': 'DEBUG',
            'propagate': True,
        },
    },
}

# Channels layer config (dev only)
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels.layers.InMemoryChannelLayer"
    }
}
