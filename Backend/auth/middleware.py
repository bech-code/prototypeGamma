import logging
from django.conf import settings
from django.http import JsonResponse
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.tokens import AccessToken
import jwt
from django.contrib.gis.geoip2 import GeoIP2

logger = logging.getLogger(__name__)

class JWTSecurityMiddleware:
    """
    Middleware pour améliorer la sécurité JWT.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Log des tentatives d'accès
        if hasattr(request, 'user') and request.user.is_authenticated:
            logger.info(f"User {request.user.id} accessing {request.path}")
        
        response = self.get_response(request)
        
        # Ajouter des headers de sécurité
        response['X-Content-Type-Options'] = 'nosniff'
        response['X-Frame-Options'] = 'DENY'
        response['X-XSS-Protection'] = '1; mode=block'
        
        return response

class TokenValidationMiddleware:
    """
    Middleware pour valider les tokens JWT.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Ne pas valider le token sur les endpoints login/refresh
        if request.path in [
            '/users/login/',
            '/users/token/refresh/',
            '/users/register/',
        ]:
            return self.get_response(request)
        # Vérifier le token dans l'en-tête Authorization
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header.split(' ')[1]
            try:
                # Valider le token
                AccessToken(token)
            except (InvalidToken, TokenError) as e:
                logger.warning(f"Invalid token attempt: {e}")
                return JsonResponse({
                    'error': 'Token invalide',
                    'detail': 'Le token d\'authentification est invalide ou expiré'
                }, status=401)
            except jwt.ExpiredSignatureError:
                logger.warning("Expired token attempt")
                return JsonResponse({
                    'error': 'Token expiré',
                    'detail': 'Le token d\'authentification a expiré'
                }, status=401)
            except Exception as e:
                logger.error(f"Token validation error: {e}")
                return JsonResponse({
                    'error': 'Erreur de validation du token',
                    'detail': 'Une erreur est survenue lors de la validation du token'
                }, status=500)
        return self.get_response(request)

class RateLimitMiddleware:
    """
    Middleware basique pour limiter les requêtes.
    """
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.request_counts = {}

    def __call__(self, request):
        # IP du client
        client_ip = self.get_client_ip(request)
        
        # Limiter les requêtes par IP (exemple: 100 requêtes par minute)
        if self.is_rate_limited(client_ip):
            return JsonResponse({
                'error': 'Trop de requêtes',
                'detail': 'Vous avez dépassé la limite de requêtes. Veuillez réessayer plus tard.'
            }, status=429)
        
        response = self.get_response(request)
        return response
    
    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            ip = x_forwarded_for.split(',')[0]
        else:
            ip = request.META.get('REMOTE_ADDR')
        return ip
    
    def is_rate_limited(self, client_ip):
        # Implémentation basique - à améliorer avec Redis en production
        import time
        current_time = time.time()
        
        if client_ip not in self.request_counts:
            self.request_counts[client_ip] = {'count': 1, 'reset_time': current_time + 60}
            return False
        
        if current_time > self.request_counts[client_ip]['reset_time']:
            self.request_counts[client_ip] = {'count': 1, 'reset_time': current_time + 60}
            return False
        
        self.request_counts[client_ip]['count'] += 1
        return self.request_counts[client_ip]['count'] > 100

class GeoIP2Middleware:
    def __init__(self, get_response):
        self.get_response = get_response
        self.geoip = GeoIP2()

    def __call__(self, request):
        ip = request.META.get('REMOTE_ADDR')
        try:
            geo = self.geoip.city(ip)
            request.geoip_country = geo.get('country_name', '')
            request.geoip_city = geo.get('city', '')
        except Exception:
            request.geoip_country = ''
            request.geoip_city = ''
        return self.get_response(request) 