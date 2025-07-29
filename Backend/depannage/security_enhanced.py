#!/usr/bin/env python3
"""
Module de sécurité renforcée pour DepanneTeliman
Protection contre les attaques, validation et sanitisation des données
"""

import re
import html
import hashlib
import secrets
import logging
from typing import Any, Dict, List, Optional, Union
from datetime import datetime, timedelta
from django.core.exceptions import ValidationError
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from django.core.cache import cache
from django.conf import settings
from django.utils import timezone
from django.http import HttpRequest
from rest_framework.throttling import UserRateThrottle, AnonRateThrottle
from rest_framework.exceptions import Throttled
import bleach
from .settings_optimization import SECURITY_SETTINGS
import json
import ipaddress

logger = logging.getLogger(__name__)

# =============================================================================
# VALIDATION ET SANITISATION DES DONNÉES
# =============================================================================

class DataValidator:
    """Validateur et sanitiseur de données avec protection contre les injections"""
    
    # Patterns de validation
    EMAIL_PATTERN = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
    PHONE_PATTERN = re.compile(r'^[\+]?[1-9][\d]{0,15}$')
    PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$')
    
    # Caractères dangereux à filtrer
    DANGEROUS_CHARS = ['<', '>', '"', "'", '&', ';', '(', ')', '|', '`']
    
    # Tags HTML autorisés pour les descriptions
    ALLOWED_HTML_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
    ALLOWED_HTML_ATTRIBUTES = {}
    
    @classmethod
    def validate_email(cls, email: str) -> bool:
        """Valider une adresse email"""
        if not email or len(email) > 254:
            return False
        return bool(cls.EMAIL_PATTERN.match(email.lower().strip()))
    
    @classmethod
    def validate_phone(cls, phone: str) -> bool:
        """Valider un numéro de téléphone"""
        if not phone:
            return False
        cleaned_phone = re.sub(r'[\s\-\(\)]', '', phone)
        return bool(cls.PHONE_PATTERN.match(cleaned_phone))
    
    @classmethod
    def validate_password(cls, password: str) -> tuple[bool, str]:
        """Valider un mot de passe et retourner le résultat avec un message"""
        if not password:
            return False, "Le mot de passe est requis"
        
        if len(password) < SECURITY_SETTINGS['VALIDATION']['min_password_length']:
            return False, f"Le mot de passe doit contenir au moins {SECURITY_SETTINGS['VALIDATION']['min_password_length']} caractères"
        
        if not cls.PASSWORD_PATTERN.match(password):
            return False, "Le mot de passe doit contenir au moins une majuscule, une minuscule, un chiffre et un caractère spécial"
        
        # Vérifier contre les mots de passe courants
        if cls.is_common_password(password):
            return False, "Ce mot de passe est trop commun"
        
        return True, "Mot de passe valide"
    
    @classmethod
    def is_common_password(cls, password: str) -> bool:
        """Vérifier si le mot de passe est dans la liste des mots de passe courants"""
        common_passwords = [
            'password', '123456', '123456789', 'qwerty', 'abc123',
            'password123', 'admin', 'letmein', 'welcome', 'monkey'
        ]
        return password.lower() in common_passwords
    
    @classmethod
    def sanitize_input(cls, input_data: Any, field_type: str = 'text') -> Any:
        """Sanitiser les données d'entrée selon le type"""
        if input_data is None:
            return None
            
        if isinstance(input_data, str):
            # Supprimer les caractères de contrôle
            input_data = ''.join(char for char in input_data if ord(char) >= 32 or char in '\n\r\t')
            
            if field_type == 'email':
                return input_data.lower().strip()
            elif field_type == 'phone':
                return re.sub(r'[\s\-\(\)]', '', input_data)
            elif field_type == 'html':
                return bleach.clean(
                    input_data,
                    tags=cls.ALLOWED_HTML_TAGS,
                    attributes=cls.ALLOWED_HTML_ATTRIBUTES,
                    strip=True
                )
            elif field_type == 'text':
                # Échapper les caractères HTML
                return html.escape(input_data.strip())
            elif field_type == 'search':
                # Nettoyer pour les requêtes de recherche
                return re.sub(r'[<>"\';()&|`]', '', input_data.strip())
                
        return input_data
    
    @classmethod
    def validate_file_upload(cls, file) -> tuple[bool, str]:
        """Valider un fichier uploadé"""
        if not file:
            return False, "Aucun fichier fourni"
        
        # Vérifier la taille
        if file.size > SECURITY_SETTINGS['VALIDATION']['max_file_size']:
            max_size_mb = SECURITY_SETTINGS['VALIDATION']['max_file_size'] / (1024 * 1024)
            return False, f"Le fichier est trop volumineux (max: {max_size_mb}MB)"
        
        # Vérifier l'extension
        file_extension = file.name.split('.')[-1].lower()
        
        # Déterminer les extensions autorisées selon le type de fichier
        if file.content_type.startswith('image/'):
            allowed_extensions = [ext.lstrip('.') for ext in SECURITY_SETTINGS['VALIDATION']['allowed_image_types']]
        else:
            allowed_extensions = [ext.lstrip('.') for ext in SECURITY_SETTINGS['VALIDATION']['allowed_document_types']]
        
        if file_extension not in allowed_extensions:
            return False, f"Type de fichier non autorisé: {file_extension}"
        
        # Vérifier le contenu (détection de type MIME)
        try:
            import magic
            file_type = magic.from_buffer(file.read(1024), mime=True)
            file.seek(0)  # Remettre le curseur au début
            
            if not cls.is_safe_file_type(file_type, file_extension):
                return False, "Le contenu du fichier ne correspond pas à son extension"
                
        except ImportError:
            # Si python-magic n'est pas installé, on fait une vérification basique
            logger.warning("python-magic non installé, vérification de fichier limitée")
        
        return True, "Fichier valide"
    
    @classmethod
    def is_safe_file_type(cls, mime_type: str, extension: str) -> bool:
        """Vérifier que le type MIME correspond à l'extension"""
        safe_combinations = {
            'jpg': ['image/jpeg'],
            'jpeg': ['image/jpeg'],
            'png': ['image/png'],
            'gif': ['image/gif'],
            'pdf': ['application/pdf'],
            'doc': ['application/msword'],
            'docx': ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
            'txt': ['text/plain'],
        }
        
        allowed_types = safe_combinations.get(extension.lower(), [])
        return mime_type in allowed_types

# =============================================================================
# PROTECTION CONTRE LES ATTAQUES
# =============================================================================

class SecurityGuard:
    """Garde de sécurité pour détecter et prévenir les attaques"""
    
    def __init__(self):
        self.suspicious_patterns = [
            # Injection SQL
            r'(\bUNION\b|\bSELECT\b|\bINSERT\b|\bDELETE\b|\bDROP\b|\bUPDATE\b)',
            # XSS
            r'(<script|javascript:|on\w+\s*=)',
            # Path traversal
            r'(\.\./|\.\.\\|%2e%2e%2f)',
            # Command injection
            r'(;|\||&|\$\(|\`)',
        ]
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.suspicious_patterns]
    
    def detect_suspicious_input(self, input_data: str) -> tuple[bool, List[str]]:
        """Détecter les entrées suspectes"""
        threats = []
        
        if not isinstance(input_data, str):
            return False, threats
        
        for i, pattern in enumerate(self.compiled_patterns):
            if pattern.search(input_data):
                threat_types = ['SQL Injection', 'XSS', 'Path Traversal', 'Command Injection']
                threats.append(threat_types[i])
        
        return len(threats) > 0, threats
    
    def is_safe_url(self, url: str) -> bool:
        """Vérifier si une URL est sûre"""
        if not url:
            return False
        
        # URLs relatives autorisées
        if url.startswith('/') and not url.startswith('//'):
            return True
        
        # URLs absolues avec domaines autorisés
        allowed_domains = getattr(settings, 'ALLOWED_REDIRECT_DOMAINS', ['localhost', '127.0.0.1'])
        
        try:
            from urllib.parse import urlparse
            parsed = urlparse(url)
            
            if parsed.netloc in allowed_domains:
                return True
        except Exception:
            pass
        
        return False
    
    def validate_request_origin(self, request: HttpRequest) -> bool:
        """Valider l'origine de la requête"""
        # Vérifier le referer pour les requêtes POST
        if request.method == 'POST':
            referer = request.META.get('HTTP_REFERER', '')
            if referer:
                try:
                    from urllib.parse import urlparse
                    referer_domain = urlparse(referer).netloc
                    allowed_domains = getattr(settings, 'ALLOWED_HOSTS', [])
                    
                    if referer_domain not in allowed_domains:
                        return False
                except Exception:
                    return False
        
        return True

# =============================================================================
# GESTION DES SESSIONS ET AUTHENTIFICATION
# =============================================================================

class SecureAuthManager:
    """Gestionnaire d'authentification sécurisée"""
    
    @staticmethod
    def create_secure_session(request: HttpRequest, user: User) -> Dict[str, Any]:
        """Créer une session sécurisée"""
        session_data = {
            'user_id': user.id,
            'created_at': timezone.now().isoformat(),
            'ip_address': SecureAuthManager.get_client_ip(request),
            'user_agent': request.META.get('HTTP_USER_AGENT', '')[:200],
            'last_activity': timezone.now().isoformat(),
        }
        
        # Générer un ID de session unique
        session_id = secrets.token_urlsafe(32)
        
        # Stocker en cache avec expiration
        cache_key = f"secure_session:{session_id}"
        cache.set(cache_key, session_data, timeout=SECURITY_SETTINGS['SESSION']['timeout'])
        
        return {
            'session_id': session_id,
            'expires_at': timezone.now() + timedelta(seconds=SECURITY_SETTINGS['SESSION']['timeout'])
        }
    
    @staticmethod
    def validate_session(session_id: str, request: HttpRequest) -> Optional[Dict[str, Any]]:
        """Valider une session existante"""
        if not session_id:
            return None
        
        cache_key = f"secure_session:{session_id}"
        session_data = cache.get(cache_key)
        
        if not session_data:
            return None
        
        # Vérifier l'IP (optionnel - peut être problématique avec les proxies)
        current_ip = SecureAuthManager.get_client_ip(request)
        if getattr(settings, 'STRICT_IP_VALIDATION', False):
            if session_data.get('ip_address') != current_ip:
                cache.delete(cache_key)
                return None
        
        # Mettre à jour la dernière activité
        session_data['last_activity'] = timezone.now().isoformat()
        cache.set(cache_key, session_data, timeout=SECURITY_SETTINGS['SESSION']['timeout'])
        
        return session_data
    
    @staticmethod
    def get_client_ip(request: HttpRequest) -> str:
        """Obtenir l'adresse IP réelle du client"""
        # Headers possibles pour l'IP réelle
        ip_headers = [
            'HTTP_X_FORWARDED_FOR',
            'HTTP_X_REAL_IP',
            'HTTP_X_FORWARDED',
            'HTTP_X_CLUSTER_CLIENT_IP',
            'HTTP_FORWARDED_FOR',
            'HTTP_FORWARDED',
            'REMOTE_ADDR',
        ]
        
        for header in ip_headers:
            ip = request.META.get(header)
            if ip:
                # Prendre la première IP si plusieurs sont présentes
                ip = ip.split(',')[0].strip()
                try:
                    # Valider que c'est une IP valide
                    ipaddress.ip_address(ip)
                    return ip
                except ValueError:
                    continue
        
        return request.META.get('REMOTE_ADDR', '0.0.0.0')
    
    @staticmethod
    def detect_brute_force(username: str, ip_address: str) -> bool:
        """Détecter les tentatives de force brute"""
        # Clés de cache pour le suivi des tentatives
        user_key = f"login_attempts:user:{username}"
        ip_key = f"login_attempts:ip:{ip_address}"
        
        # Limites de tentatives
        max_attempts_per_user = 5
        max_attempts_per_ip = 10
        lockout_duration = 900  # 15 minutes
        
        # Vérifier les tentatives par utilisateur
        user_attempts = cache.get(user_key, 0)
        if user_attempts >= max_attempts_per_user:
            return True
        
        # Vérifier les tentatives par IP
        ip_attempts = cache.get(ip_key, 0)
        if ip_attempts >= max_attempts_per_ip:
            return True
        
        return False
    
    @staticmethod
    def record_failed_login(username: str, ip_address: str):
        """Enregistrer une tentative de connexion échouée"""
        user_key = f"login_attempts:user:{username}"
        ip_key = f"login_attempts:ip:{ip_address}"
        lockout_duration = 900  # 15 minutes
        
        # Incrémenter les compteurs
        user_attempts = cache.get(user_key, 0) + 1
        ip_attempts = cache.get(ip_key, 0) + 1
        
        cache.set(user_key, user_attempts, timeout=lockout_duration)
        cache.set(ip_key, ip_attempts, timeout=lockout_duration)
        
        # Logger la tentative suspecte
        logger.warning(f"Tentative de connexion échouée: user={username}, ip={ip_address}, attempts_user={user_attempts}, attempts_ip={ip_attempts}")
    
    @staticmethod
    def clear_login_attempts(username: str, ip_address: str):
        """Effacer les tentatives de connexion après un succès"""
        user_key = f"login_attempts:user:{username}"
        ip_key = f"login_attempts:ip:{ip_address}"
        
        cache.delete(user_key)
        cache.delete(ip_key)

# =============================================================================
# RATE LIMITING AVANCÉ
# =============================================================================

class AdvancedRateThrottle(UserRateThrottle):
    """Rate limiting avancé avec détection d'abus"""
    
    def __init__(self):
        super().__init__()
        self.suspicious_threshold = 0.8  # 80% de la limite
    
    def allow_request(self, request, view):
        """Vérifier si la requête est autorisée"""
        allowed = super().allow_request(request, view)
        
        # Détecter les comportements suspects
        if not allowed:
            self.record_suspicious_activity(request)
        elif self.is_approaching_limit():
            self.log_potential_abuse(request)
        
        return allowed
    
    def is_approaching_limit(self) -> bool:
        """Vérifier si on approche de la limite"""
        if not hasattr(self, 'history'):
            return False
        
        current_rate = len(self.history) / self.duration
        max_rate = self.num_requests / self.duration
        
        return current_rate >= (max_rate * self.suspicious_threshold)
    
    def record_suspicious_activity(self, request):
        """Enregistrer une activité suspecte"""
        ip_address = SecureAuthManager.get_client_ip(request)
        user_agent = request.META.get('HTTP_USER_AGENT', '')[:200]
        
        logger.warning(f"Rate limit dépassé: ip={ip_address}, user_agent={user_agent}, path={request.path}")
        
        # Enregistrer dans le cache pour analyse ultérieure
        cache_key = f"suspicious_activity:{ip_address}"
        activities = cache.get(cache_key, [])
        activities.append({
            'timestamp': timezone.now().isoformat(),
            'path': request.path,
            'user_agent': user_agent,
        })
        
        # Garder seulement les 100 dernières activités
        activities = activities[-100:]
        cache.set(cache_key, activities, timeout=3600)  # 1 heure
    
    def log_potential_abuse(self, request):
        """Logger un abus potentiel"""
        ip_address = SecureAuthManager.get_client_ip(request)
        logger.info(f"Approche de la limite de taux: ip={ip_address}, path={request.path}")

# =============================================================================
# MIDDLEWARE DE SÉCURITÉ
# =============================================================================

class SecurityMiddleware:
    """Middleware de sécurité pour protection globale"""
    
    def __init__(self, get_response):
        self.get_response = get_response
        self.security_guard = SecurityGuard()
        self.validator = DataValidator()
    
    def __call__(self, request):
        # Vérifications avant le traitement de la requête
        if not self.pre_process_security_check(request):
            from django.http import HttpResponseForbidden
            return HttpResponseForbidden("Requête suspecte détectée")
        
        response = self.get_response(request)
        
        # Ajouter des headers de sécurité
        self.add_security_headers(response)
        
        return response
    
    def pre_process_security_check(self, request) -> bool:
        """Vérifications de sécurité avant traitement"""
        # Vérifier l'origine de la requête
        if not self.security_guard.validate_request_origin(request):
            logger.warning(f"Origine de requête invalide: {request.META.get('HTTP_REFERER', 'N/A')}")
            return False
        
        # Vérifier les données POST pour des patterns suspects
        if request.method == 'POST' and hasattr(request, 'POST'):
            for key, value in request.POST.items():
                if isinstance(value, str):
                    is_suspicious, threats = self.security_guard.detect_suspicious_input(value)
                    if is_suspicious:
                        logger.warning(f"Données suspectes détectées: {threats} dans le champ {key}")
                        return False
        
        return True
    
    def add_security_headers(self, response):
        """Ajouter des headers de sécurité à la réponse"""
        security_headers = {
            'X-Content-Type-Options': 'nosniff',
            'X-Frame-Options': 'DENY',
            'X-XSS-Protection': '1; mode=block',
            'Referrer-Policy': 'strict-origin-when-cross-origin',
            'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';",
        }
        
        for header, value in security_headers.items():
            response[header] = value

# =============================================================================
# AUDIT ET LOGGING DE SÉCURITÉ
# =============================================================================

class SecurityAuditor:
    """Auditeur de sécurité pour tracer les événements"""
    
    @staticmethod
    def log_security_event(event_type: str, user_id: Optional[int], ip_address: str, 
                          details: Dict[str, Any], severity: str = 'INFO'):
        """Logger un événement de sécurité"""
        log_entry = {
            'timestamp': timezone.now().isoformat(),
            'event_type': event_type,
            'user_id': user_id,
            'ip_address': ip_address,
            'details': details,
            'severity': severity,
        }
        
        # Logger selon la sévérité
        if severity == 'CRITICAL':
            logger.critical(f"SECURITY_EVENT: {json.dumps(log_entry)}")
        elif severity == 'WARNING':
            logger.warning(f"SECURITY_EVENT: {json.dumps(log_entry)}")
        else:
            logger.info(f"SECURITY_EVENT: {json.dumps(log_entry)}")
        
        # Stocker en cache pour analyse
        cache_key = f"security_events:{timezone.now().strftime('%Y-%m-%d')}"
        events = cache.get(cache_key, [])
        events.append(log_entry)
        
        # Garder seulement les 1000 derniers événements par jour
        events = events[-1000:]
        cache.set(cache_key, events, timeout=86400)  # 24 heures
    
    @staticmethod
    def get_security_events(date: str = None) -> List[Dict[str, Any]]:
        """Récupérer les événements de sécurité"""
        if not date:
            date = timezone.now().strftime('%Y-%m-%d')
        
        cache_key = f"security_events:{date}"
        return cache.get(cache_key, [])
    
    @staticmethod
    def analyze_threats() -> Dict[str, Any]:
        """Analyser les menaces récentes"""
        today = timezone.now().strftime('%Y-%m-%d')
        events = SecurityAuditor.get_security_events(today)
        
        threat_analysis = {
            'total_events': len(events),
            'by_severity': {},
            'by_type': {},
            'top_ips': {},
            'suspicious_patterns': [],
        }
        
        for event in events:
            # Comptage par sévérité
            severity = event.get('severity', 'INFO')
            threat_analysis['by_severity'][severity] = threat_analysis['by_severity'].get(severity, 0) + 1
            
            # Comptage par type
            event_type = event.get('event_type', 'unknown')
            threat_analysis['by_type'][event_type] = threat_analysis['by_type'].get(event_type, 0) + 1
            
            # Comptage par IP
            ip = event.get('ip_address', 'unknown')
            threat_analysis['top_ips'][ip] = threat_analysis['top_ips'].get(ip, 0) + 1
        
        # Identifier les IPs suspectes (plus de 10 événements)
        suspicious_ips = {ip: count for ip, count in threat_analysis['top_ips'].items() if count > 10}
        threat_analysis['suspicious_ips'] = suspicious_ips
        
        return threat_analysis

# =============================================================================
# UTILITAIRES DE SÉCURITÉ
# =============================================================================

def generate_secure_token(length: int = 32) -> str:
    """Générer un token sécurisé"""
    return secrets.token_urlsafe(length)

def hash_sensitive_data(data: str, salt: str = None) -> tuple[str, str]:
    """Hasher des données sensibles avec un salt"""
    if salt is None:
        salt = secrets.token_hex(16)
    
    combined = f"{salt}{data}".encode('utf-8')
    hashed = hashlib.sha256(combined).hexdigest()
    
    return hashed, salt

def verify_hashed_data(data: str, hashed: str, salt: str) -> bool:
    """Vérifier des données hashées"""
    test_hash, _ = hash_sensitive_data(data, salt)
    return test_hash == hashed

def sanitize_filename(filename: str) -> str:
    """Sanitiser un nom de fichier"""
    # Supprimer les caractères dangereux
    safe_chars = re.sub(r'[^a-zA-Z0-9._-]', '_', filename)
    
    # Limiter la longueur
    if len(safe_chars) > 100:
        name, ext = safe_chars.rsplit('.', 1) if '.' in safe_chars else (safe_chars, '')
        safe_chars = f"{name[:95]}.{ext}" if ext else safe_chars[:100]
    
    return safe_chars

def create_csrf_token(session_id: str) -> str:
    """Créer un token CSRF personnalisé"""
    timestamp = str(int(timezone.now().timestamp()))
    data = f"{session_id}:{timestamp}:{settings.SECRET_KEY}"
    return hashlib.sha256(data.encode()).hexdigest()[:16]

def verify_csrf_token(token: str, session_id: str, max_age: int = 3600) -> bool:
    """Vérifier un token CSRF"""
    try:
        # Le token doit avoir été créé dans la dernière heure par défaut
        current_time = int(timezone.now().timestamp())
        
        for i in range(max_age):
            test_timestamp = str(current_time - i)
            test_data = f"{session_id}:{test_timestamp}:{settings.SECRET_KEY}"
            test_token = hashlib.sha256(test_data.encode()).hexdigest()[:16]
            
            if test_token == token:
                return True
        
        return False
    except Exception:
        return False