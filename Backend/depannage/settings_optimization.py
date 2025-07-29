#!/usr/bin/env python3
"""
Configuration centralisée des optimisations pour DepanneTeliman
Contient tous les paramètres d'optimisation, cache, et performance
"""

import os
from django.conf import settings

# =============================================================================
# CONFIGURATION DU CACHE
# =============================================================================

CACHE_SETTINGS = {
    # Timeouts par type de données (en secondes)
    'TIMEOUTS': {
        'static_data': 3600,          # 1 heure - données rarement modifiées
        'user_data': 900,             # 15 minutes - profils utilisateurs
        'search_results': 300,        # 5 minutes - résultats de recherche
        'stats': 600,                 # 10 minutes - statistiques
        'real_time': 60,              # 1 minute - données temps réel
        'notifications': 30,          # 30 secondes - notifications
        'dashboard': 120,             # 2 minutes - données dashboard
    },
    
    # Préfixes pour les clés de cache
    'PREFIXES': {
        'api': 'api_cache',
        'user': 'user_cache',
        'search': 'search_cache',
        'geo': 'geo_cache',
        'stats': 'stats_cache',
    },
    
    # Configuration Redis (si utilisé)
    'REDIS_CONFIG': {
        'HOST': os.getenv('REDIS_HOST', 'localhost'),
        'PORT': int(os.getenv('REDIS_PORT', 6379)),
        'DB': int(os.getenv('REDIS_DB', 0)),
        'PASSWORD': os.getenv('REDIS_PASSWORD'),
        'MAX_CONNECTIONS': 50,
        'SOCKET_CONNECT_TIMEOUT': 5,
        'SOCKET_TIMEOUT': 5,
    },
}

# =============================================================================
# CONFIGURATION DE LA PAGINATION
# =============================================================================

PAGINATION_SETTINGS = {
    # Tailles de page par défaut
    'DEFAULT_PAGE_SIZE': 20,
    'MAX_PAGE_SIZE': 100,
    
    # Tailles spécifiques par endpoint
    'ENDPOINT_SIZES': {
        'technicians': 25,
        'repair_requests': 20,
        'reviews': 15,
        'notifications': 30,
        'messages': 50,
        'search_results': 10,
    },
    
    # Configuration pour les grandes listes
    'LARGE_DATASET_THRESHOLD': 1000,
    'LARGE_DATASET_PAGE_SIZE': 50,
}

# =============================================================================
# CONFIGURATION DU MONITORING
# =============================================================================

MONITORING_SETTINGS = {
    # Seuils de performance
    'SLOW_QUERY_THRESHOLD': 1.0,      # secondes
    'HIGH_QUERY_COUNT_THRESHOLD': 10,  # nombre de requêtes
    'MEMORY_WARNING_THRESHOLD': 500,   # MB
    
    # Logging
    'LOG_LEVELS': {
        'performance': 'INFO',
        'slow_queries': 'WARNING',
        'errors': 'ERROR',
        'cache': 'DEBUG',
    },
    
    # Métriques à collecter
    'METRICS': {
        'response_time': True,
        'query_count': True,
        'cache_hit_ratio': True,
        'memory_usage': True,
        'concurrent_users': True,
    },
}

# =============================================================================
# CONFIGURATION DE LA GÉOLOCALISATION
# =============================================================================

GEOLOCATION_SETTINGS = {
    # Rayons de recherche par défaut (en km)
    'DEFAULT_SEARCH_RADIUS': 25,
    'MAX_SEARCH_RADIUS': 100,
    'EMERGENCY_RADIUS': 50,
    
    # Précision des coordonnées
    'COORDINATE_PRECISION': 6,  # décimales
    
    # Cache géographique
    'GEO_CACHE_TIMEOUT': 300,  # 5 minutes
    'LOCATION_UPDATE_THRESHOLD': 0.001,  # seuil de déplacement pour mise à jour
    
    # Limites de performance
    'MAX_TECHNICIANS_IN_SEARCH': 50,
    'MAX_REQUESTS_IN_SEARCH': 20,
}

# =============================================================================
# CONFIGURATION DE SÉCURITÉ
# =============================================================================

SECURITY_SETTINGS = {
    # Rate limiting
    'RATE_LIMITS': {
        'api_default': '1000/hour',
        'search': '100/minute',
        'auth': '10/minute',
        'password_reset': '5/hour',
        'file_upload': '20/hour',
    },
    
    # Validation des données
    'VALIDATION': {
        'max_file_size': 10 * 1024 * 1024,  # 10MB
        'allowed_image_types': ['.jpg', '.jpeg', '.png', '.gif'],
        'allowed_document_types': ['.pdf', '.doc', '.docx', '.txt'],
        'max_description_length': 2000,
        'min_password_length': 8,
    },
    
    # Sessions et tokens
    'SESSION': {
        'timeout': 1200,  # 20 minutes
        'refresh_threshold': 300,  # 5 minutes avant expiration
        'max_concurrent_sessions': 3,
    },
}

# =============================================================================
# CONFIGURATION DES WEBSOCKETS
# =============================================================================

WEBSOCKET_SETTINGS = {
    # Connexions
    'MAX_CONNECTIONS_PER_USER': 3,
    'CONNECTION_TIMEOUT': 30,
    'HEARTBEAT_INTERVAL': 30,
    
    # Messages
    'MAX_MESSAGE_SIZE': 1024,  # bytes
    'MESSAGE_QUEUE_SIZE': 100,
    'BROADCAST_BATCH_SIZE': 50,
    
    # Channels
    'CHANNEL_CAPACITY': 100,
    'CHANNEL_EXPIRY': 3600,  # 1 heure
    
    # Notification en temps réel
    'NOTIFICATION_TYPES': [
        'request_assigned',
        'technician_arrived',
        'request_completed',
        'new_message',
        'payment_received',
    ],
}

# =============================================================================
# CONFIGURATION DES API
# =============================================================================

API_SETTINGS = {
    # Versioning
    'VERSION': 'v1',
    'DEFAULT_VERSION': 'v1',
    'DEPRECATED_VERSIONS': [],
    
    # Formats de réponse
    'DEFAULT_RENDERER': 'json',
    'ALLOWED_FORMATS': ['json', 'xml'],
    
    # Compression
    'ENABLE_COMPRESSION': True,
    'COMPRESSION_THRESHOLD': 1024,  # bytes
    
    # CORS
    'CORS_SETTINGS': {
        'ALLOW_CREDENTIALS': True,
        'ALLOWED_ORIGINS': [
            'http://localhost:3000',
            'http://localhost:5173',
            'http://127.0.0.1:3000',
            'http://127.0.0.1:5173',
        ],
        'ALLOWED_METHODS': ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        'ALLOWED_HEADERS': [
            'accept',
            'accept-encoding',
            'authorization',
            'content-type',
            'dnt',
            'origin',
            'user-agent',
            'x-csrftoken',
            'x-requested-with',
        ],
    },
}

# =============================================================================
# CONFIGURATION DE L'OPTIMISATION AUTOMATIQUE
# =============================================================================

AUTO_OPTIMIZATION_SETTINGS = {
    # Optimisations automatiques activées
    'ENABLE_QUERY_OPTIMIZATION': True,
    'ENABLE_CACHE_OPTIMIZATION': True,
    'ENABLE_RESPONSE_COMPRESSION': True,
    'ENABLE_STATIC_FILE_COMPRESSION': True,
    
    # Nettoyage automatique
    'AUTO_CLEANUP': {
        'old_notifications': 30,  # jours
        'old_chat_messages': 90,  # jours
        'expired_sessions': 7,    # jours
        'temp_files': 1,          # jours
    },
    
    # Mise à jour automatique des statistiques
    'AUTO_UPDATE_STATS': {
        'technician_ratings': 3600,    # secondes (1 heure)
        'dashboard_metrics': 300,      # 5 minutes
        'search_indexes': 86400,       # 24 heures
    },
}

# =============================================================================
# CONFIGURATION ENVIRONNEMENT-SPÉCIFIQUE
# =============================================================================

def get_environment_config():
    """Retourne la configuration basée sur l'environnement"""
    env = os.getenv('DJANGO_ENV', 'development')
    
    if env == 'production':
        return PRODUCTION_CONFIG
    elif env == 'staging':
        return STAGING_CONFIG
    else:
        return DEVELOPMENT_CONFIG

DEVELOPMENT_CONFIG = {
    'DEBUG_TOOLBAR': True,
    'CACHE_TIMEOUT_MULTIPLIER': 0.1,  # Cache plus court en dev
    'ENABLE_QUERY_LOGGING': True,
    'FAKE_SLOW_QUERIES': False,
    'MOCK_EXTERNAL_APIS': True,
}

STAGING_CONFIG = {
    'DEBUG_TOOLBAR': False,
    'CACHE_TIMEOUT_MULTIPLIER': 0.5,
    'ENABLE_QUERY_LOGGING': True,
    'FAKE_SLOW_QUERIES': False,
    'MOCK_EXTERNAL_APIS': False,
}

PRODUCTION_CONFIG = {
    'DEBUG_TOOLBAR': False,
    'CACHE_TIMEOUT_MULTIPLIER': 1.0,
    'ENABLE_QUERY_LOGGING': False,
    'FAKE_SLOW_QUERIES': False,
    'MOCK_EXTERNAL_APIS': False,
    'ENABLE_SENTRY': True,
    'ENABLE_METRICS_COLLECTION': True,
}

# =============================================================================
# CONFIGURATION DES FEATURES FLAGS
# =============================================================================

FEATURE_FLAGS = {
    # Nouvelles fonctionnalités
    'ENABLE_ADVANCED_SEARCH': True,
    'ENABLE_REAL_TIME_TRACKING': True,
    'ENABLE_AI_RECOMMENDATIONS': False,
    'ENABLE_VOICE_MESSAGES': False,
    
    # Optimisations expérimentales
    'ENABLE_AGGRESSIVE_CACHING': False,
    'ENABLE_QUERY_BATCHING': True,
    'ENABLE_PREFETCH_OPTIMIZATION': True,
    
    # Fonctionnalités de debug
    'ENABLE_PERFORMANCE_PROFILING': False,
    'ENABLE_MEMORY_MONITORING': True,
    'ENABLE_API_METRICS': True,
}

# =============================================================================
# HELPER FUNCTIONS
# =============================================================================

def get_cache_timeout(data_type: str) -> int:
    """Retourne le timeout de cache pour un type de données"""
    base_timeout = CACHE_SETTINGS['TIMEOUTS'].get(data_type, 300)
    multiplier = get_environment_config().get('CACHE_TIMEOUT_MULTIPLIER', 1.0)
    return int(base_timeout * multiplier)

def get_pagination_size(endpoint: str) -> int:
    """Retourne la taille de pagination pour un endpoint"""
    return PAGINATION_SETTINGS['ENDPOINT_SIZES'].get(
        endpoint, 
        PAGINATION_SETTINGS['DEFAULT_PAGE_SIZE']
    )

def is_feature_enabled(feature: str) -> bool:
    """Vérifie si une fonctionnalité est activée"""
    return FEATURE_FLAGS.get(feature, False)

def get_rate_limit(endpoint: str) -> str:
    """Retourne la limite de taux pour un endpoint"""
    return SECURITY_SETTINGS['RATE_LIMITS'].get(
        endpoint, 
        SECURITY_SETTINGS['RATE_LIMITS']['api_default']
    )

# =============================================================================
# CONFIGURATION DJANGO SETTINGS INTEGRATION
# =============================================================================

def configure_django_settings():
    """Configure les settings Django avec nos optimisations"""
    
    # Cache configuration
    if not hasattr(settings, 'CACHES'):
        settings.CACHES = {
            'default': {
                'BACKEND': 'django.core.cache.backends.locmem.LocMemCache',
                'LOCATION': 'unique-snowflake',
                'TIMEOUT': CACHE_SETTINGS['TIMEOUTS']['static_data'],
                'OPTIONS': {
                    'MAX_ENTRIES': 1000,
                    'CULL_FREQUENCY': 3,
                }
            }
        }
    
    # REST Framework configuration
    if not hasattr(settings, 'REST_FRAMEWORK'):
        settings.REST_FRAMEWORK = {}
    
    settings.REST_FRAMEWORK.update({
        'DEFAULT_PAGINATION_CLASS': 'depannage.optimizations.OptimizedPagination',
        'PAGE_SIZE': PAGINATION_SETTINGS['DEFAULT_PAGE_SIZE'],
        'DEFAULT_THROTTLE_CLASSES': [
            'rest_framework.throttling.AnonRateThrottle',
            'rest_framework.throttling.UserRateThrottle'
        ],
        'DEFAULT_THROTTLE_RATES': {
            'anon': SECURITY_SETTINGS['RATE_LIMITS']['api_default'],
            'user': SECURITY_SETTINGS['RATE_LIMITS']['api_default'],
        }
    })
    
    # CORS configuration
    if 'corsheaders' in settings.INSTALLED_APPS:
        cors_config = API_SETTINGS['CORS_SETTINGS']
        for key, value in cors_config.items():
            setattr(settings, f'CORS_{key}', value)
    
    # Logging configuration
    if not hasattr(settings, 'LOGGING'):
        settings.LOGGING = {
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
                    'filename': 'depanneteliman.log',
                    'formatter': 'verbose',
                },
                'console': {
                    'level': 'DEBUG',
                    'class': 'logging.StreamHandler',
                    'formatter': 'simple',
                },
            },
            'loggers': {
                'depannage': {
                    'handlers': ['file', 'console'],
                    'level': 'INFO',
                    'propagate': True,
                },
                'performance': {
                    'handlers': ['file'],
                    'level': MONITORING_SETTINGS['LOG_LEVELS']['performance'],
                    'propagate': False,
                },
            },
        }

# Appliquer la configuration automatiquement
if hasattr(settings, 'INSTALLED_APPS'):
    configure_django_settings()