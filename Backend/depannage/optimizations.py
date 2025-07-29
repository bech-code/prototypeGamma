#!/usr/bin/env python3
"""
Module d'optimisation des performances pour DepanneTeliman
Implémente les meilleures pratiques modernes pour Django/DRF
"""

import time
import functools
import logging
from typing import Any, Dict, List, Optional, Callable
from django.core.cache import cache
from django.conf import settings
from django.db import connection
from django.db.models import QuerySet, Q, Prefetch
from rest_framework.response import Response
from rest_framework import status
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.views.decorators.vary import vary_on_headers
from datetime import timedelta
from django.utils import timezone
import json
import hashlib

logger = logging.getLogger(__name__)

# =============================================================================
# DECORATEURS DE CACHE ET PERFORMANCE
# =============================================================================

def cache_response(timeout: int = 300, key_prefix: str = "", vary_on: List[str] = None):
    """
    Décorateur pour mettre en cache les réponses d'API avec gestion intelligente des clés
    
    Args:
        timeout: Durée de cache en secondes (défaut: 5min)
        key_prefix: Préfixe pour la clé de cache
        vary_on: Liste des headers/params qui font varier le cache
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            # Générer une clé de cache unique basée sur l'utilisateur et les paramètres
            cache_key_parts = [
                key_prefix or f"{self.__class__.__name__}_{view_func.__name__}",
                str(request.user.id) if hasattr(request, 'user') and request.user.is_authenticated else 'anonymous',
                request.method,
                request.get_full_path(),
            ]
            
            # Ajouter les headers spécifiés
            if vary_on:
                for header in vary_on:
                    value = request.META.get(f'HTTP_{header.upper().replace("-", "_")}', '')
                    cache_key_parts.append(f"{header}:{value}")
            
            # Créer une clé de cache hashée pour éviter les clés trop longues
            cache_key_raw = "|".join(cache_key_parts)
            cache_key = f"api_cache:{hashlib.md5(cache_key_raw.encode()).hexdigest()}"
            
            # Vérifier le cache
            cached_response = cache.get(cache_key)
            if cached_response is not None:
                logger.debug(f"Cache HIT pour {cache_key}")
                return Response(cached_response['data'], 
                              status=cached_response['status'],
                              headers=cached_response.get('headers', {}))
            
            # Exécuter la vue et mettre en cache
            logger.debug(f"Cache MISS pour {cache_key}")
            response = view_func(self, request, *args, **kwargs)
            
            # Ne mettre en cache que les réponses réussies
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                cache_data = {
                    'data': response.data if hasattr(response, 'data') else response.content,
                    'status': response.status_code,
                    'headers': dict(response.items()) if hasattr(response, 'items') else {}
                }
                cache.set(cache_key, cache_data, timeout)
                logger.debug(f"Réponse mise en cache pour {timeout}s: {cache_key}")
            
            return response
        return wrapper
    return decorator


def monitor_performance(log_slow: float = 1.0):
    """
    Décorateur pour monitorer les performances des vues
    
    Args:
        log_slow: Seuil en secondes pour loguer les requêtes lentes
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            start_time = time.time()
            queries_before = len(connection.queries)
            
            # Exécuter la vue
            response = view_func(self, request, *args, **kwargs)
            
            # Calculer les métriques
            execution_time = time.time() - start_time
            queries_count = len(connection.queries) - queries_before
            
            # Logger les métriques
            endpoint = f"{self.__class__.__name__}.{view_func.__name__}"
            
            if execution_time > log_slow:
                logger.warning(
                    f"SLOW_QUERY: {endpoint} - {execution_time:.3f}s - {queries_count} queries"
                )
            else:
                logger.info(
                    f"PERF: {endpoint} - {execution_time:.3f}s - {queries_count} queries"
                )
            
            # Ajouter les métriques aux headers de réponse (en mode debug)
            if settings.DEBUG and hasattr(response, '__setitem__'):
                response['X-Execution-Time'] = f"{execution_time:.3f}s"
                response['X-Query-Count'] = str(queries_count)
            
            return response
        return wrapper
    return decorator


def invalidate_cache_on_change(cache_patterns: List[str]):
    """
    Décorateur pour invalider automatiquement le cache lors des modifications
    
    Args:
        cache_patterns: Liste des patterns de clés de cache à invalider
    """
    def decorator(view_func):
        @functools.wraps(view_func)
        def wrapper(self, request, *args, **kwargs):
            response = view_func(self, request, *args, **kwargs)
            
            # Invalider le cache uniquement si la modification a réussi
            if hasattr(response, 'status_code') and 200 <= response.status_code < 300:
                for pattern in cache_patterns:
                    # Invalider toutes les clés correspondant au pattern
                    cache_keys = cache.keys(f"api_cache:*{pattern}*")
                    if cache_keys:
                        cache.delete_many(cache_keys)
                        logger.debug(f"Cache invalidé: {len(cache_keys)} clés pour pattern {pattern}")
            
            return response
        return wrapper
    return decorator


# =============================================================================
# OPTIMISEURS DE REQUÊTES
# =============================================================================

class QueryOptimizer:
    """Classe utilitaire pour optimiser les requêtes Django ORM"""
    
    @staticmethod
    def optimize_technician_queries(queryset: QuerySet) -> QuerySet:
        """Optimise les requêtes pour les techniciens"""
        return queryset.select_related(
            'user',
            'user__client_profile',
        ).prefetch_related(
            'reviews_received',
            'repair_requests_assigned',
            Prefetch(
                'reviews_received',
                queryset=queryset.model.objects.none().select_related('client__user')
            )
        )
    
    @staticmethod
    def optimize_repair_request_queries(queryset: QuerySet) -> QuerySet:
        """Optimise les requêtes pour les demandes de réparation"""
        return queryset.select_related(
            'client',
            'client__user',
            'technician',
            'technician__user',
        ).prefetch_related(
            'documents',
            'payments',
            'review',
            Prefetch(
                'documents',
                queryset=queryset.model.objects.none().select_related('uploaded_by')
            )
        )
    
    @staticmethod
    def optimize_notification_queries(queryset: QuerySet) -> QuerySet:
        """Optimise les requêtes pour les notifications"""
        return queryset.select_related(
            'user',
            'related_request',
            'related_request__client',
            'related_request__technician',
        )


# =============================================================================
# GESTIONNAIRE DE CACHE INTELLIGENT
# =============================================================================

class SmartCacheManager:
    """Gestionnaire de cache intelligent avec TTL adaptatif"""
    
    CACHE_TIMEOUTS = {
        'static_data': 3600,      # 1 heure - données rarement modifiées
        'user_data': 900,         # 15 minutes - profils utilisateurs
        'search_results': 300,    # 5 minutes - résultats de recherche
        'stats': 600,             # 10 minutes - statistiques
        'real_time': 60,          # 1 minute - données temps réel
    }
    
    @classmethod
    def get_cache_timeout(cls, data_type: str) -> int:
        """Retourne le timeout approprié pour un type de données"""
        return cls.CACHE_TIMEOUTS.get(data_type, 300)
    
    @classmethod
    def cache_key(cls, prefix: str, *args, **kwargs) -> str:
        """Génère une clé de cache standardisée"""
        key_parts = [prefix]
        key_parts.extend(str(arg) for arg in args)
        key_parts.extend(f"{k}:{v}" for k, v in sorted(kwargs.items()))
        
        key_raw = "|".join(key_parts)
        return f"smart_cache:{hashlib.md5(key_raw.encode()).hexdigest()}"
    
    @classmethod
    def get_or_set(cls, key: str, callable_func: Callable, 
                   timeout: Optional[int] = None, data_type: str = 'default') -> Any:
        """
        Récupère du cache ou calcule et met en cache la valeur
        
        Args:
            key: Clé de cache
            callable_func: Fonction à appeler si pas en cache
            timeout: Timeout personnalisé
            data_type: Type de données pour timeout automatique
        """
        cached_value = cache.get(key)
        if cached_value is not None:
            return cached_value
        
        # Calculer la valeur
        value = callable_func()
        
        # Déterminer le timeout
        if timeout is None:
            timeout = cls.get_cache_timeout(data_type)
        
        # Mettre en cache
        cache.set(key, value, timeout)
        return value


# =============================================================================
# PAGINATION OPTIMISÉE
# =============================================================================

from rest_framework.pagination import PageNumberPagination

class OptimizedPagination(PageNumberPagination):
    """Pagination optimisée avec paramètres adaptatifs"""
    
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    
    def get_paginated_response(self, data):
        """Réponse paginée avec métadonnées d'optimisation"""
        response = super().get_paginated_response(data)
        
        # Ajouter des métadonnées d'optimisation
        response.data['meta'] = {
            'page_size': self.page_size,
            'current_page': self.page.number,
            'total_pages': self.page.paginator.num_pages,
            'has_cache': hasattr(self, '_from_cache'),
            'query_count': getattr(self, '_query_count', 0),
        }
        
        return response


# =============================================================================
# MIXINS D'OPTIMISATION POUR LES VIEWSETS
# =============================================================================

class OptimizedViewMixin:
    """Mixin pour optimiser automatiquement les ViewSets"""
    
    def get_queryset(self):
        """Applique les optimisations automatiques au queryset"""
        queryset = super().get_queryset()
        
        # Appliquer l'optimiseur approprié selon le modèle
        model_name = queryset.model.__name__.lower()
        
        if model_name == 'technician':
            queryset = QueryOptimizer.optimize_technician_queries(queryset)
        elif model_name == 'repairrequest':
            queryset = QueryOptimizer.optimize_repair_request_queries(queryset)
        elif model_name == 'notification':
            queryset = QueryOptimizer.optimize_notification_queries(queryset)
        
        return queryset
    
    @monitor_performance(log_slow=2.0)
    def list(self, request, *args, **kwargs):
        """Version optimisée de la méthode list"""
        return super().list(request, *args, **kwargs)
    
    @monitor_performance(log_slow=1.0)
    def retrieve(self, request, *args, **kwargs):
        """Version optimisée de la méthode retrieve"""
        return super().retrieve(request, *args, **kwargs)


# =============================================================================
# GESTIONNAIRE D'ÉTAT EN TEMPS RÉEL
# =============================================================================

class RealTimeStateManager:
    """Gestionnaire d'état en temps réel pour les données critiques"""
    
    @staticmethod
    def update_technician_availability(technician_id: int, is_available: bool):
        """Met à jour la disponibilité d'un technicien en temps réel"""
        cache_key = f"technician_availability:{technician_id}"
        cache.set(cache_key, is_available, timeout=300)
        
        # Invalider les caches de recherche de techniciens
        cache.delete_many(cache.keys("api_cache:*technician*available*"))
    
    @staticmethod
    def update_request_status(request_id: int, status: str):
        """Met à jour le statut d'une demande en temps réel"""
        cache_key = f"request_status:{request_id}"
        cache.set(cache_key, status, timeout=300)
        
        # Invalider les caches de demandes
        cache.delete_many(cache.keys("api_cache:*repair*request*"))
    
    @staticmethod
    def get_cached_technician_availability(technician_id: int) -> Optional[bool]:
        """Récupère la disponibilité d'un technicien depuis le cache"""
        return cache.get(f"technician_availability:{technician_id}")


# =============================================================================
# UTILITAIRES DE MONITORING
# =============================================================================

class PerformanceMonitor:
    """Utilitaires pour monitorer les performances de l'application"""
    
    @staticmethod
    def log_slow_queries(threshold: float = 1.0):
        """Log toutes les requêtes lentes au-dessus du seuil"""
        if settings.DEBUG:
            slow_queries = [
                q for q in connection.queries 
                if float(q['time']) > threshold
            ]
            
            if slow_queries:
                logger.warning(f"SLOW_QUERIES: {len(slow_queries)} requêtes lentes détectées")
                for query in slow_queries:
                    logger.warning(f"  - {query['time']}s: {query['sql'][:100]}...")
    
    @staticmethod
    def get_cache_stats() -> Dict[str, Any]:
        """Retourne des statistiques sur l'utilisation du cache"""
        # Note: Nécessite django-redis ou un backend de cache avec stats
        try:
            from django_redis import get_redis_connection
            redis_conn = get_redis_connection("default")
            info = redis_conn.info()
            
            return {
                'hits': info.get('keyspace_hits', 0),
                'misses': info.get('keyspace_misses', 0),
                'memory_usage': info.get('used_memory_human', '0B'),
                'connected_clients': info.get('connected_clients', 0),
            }
        except ImportError:
            return {'error': 'Redis stats not available'}
    
    @staticmethod
    def clear_expired_cache():
        """Nettoie le cache des entrées expirées"""
        # Cette fonction dépend du backend de cache utilisé
        cache.clear()
        logger.info("Cache nettoyé")


# =============================================================================
# CONFIGURATION ET CONSTANTES
# =============================================================================

# Configuration par défaut pour les optimisations
OPTIMIZATION_CONFIG = {
    'ENABLE_QUERY_MONITORING': True,
    'ENABLE_SMART_CACHING': True,
    'CACHE_DEFAULT_TIMEOUT': 300,
    'SLOW_QUERY_THRESHOLD': 1.0,
    'MAX_CACHE_KEYS_PER_PATTERN': 1000,
}

# Patterns de cache à invalider pour chaque type d'opération
CACHE_INVALIDATION_PATTERNS = {
    'technician_update': ['technician', 'available', 'search'],
    'request_update': ['repair_request', 'dashboard', 'stats'],
    'review_create': ['review', 'rating', 'technician'],
    'payment_update': ['payment', 'stats', 'dashboard'],
}