#!/usr/bin/env python3
"""
Script de vérification des permissions et de la sécurité pour les endpoints des techniciens
"""

import re
import os
from typing import Dict, List, Set
from dataclasses import dataclass

@dataclass
class SecurityIssue:
    endpoint: str
    issue_type: str
    severity: str
    description: str
    recommendation: str

@dataclass
class PermissionCheck:
    endpoint: str
    required_permission: str
    implemented: bool
    file: str
    line: int

class SecurityPermissionsChecker:
    def __init__(self):
        self.security_issues: List[SecurityIssue] = []
        self.permission_checks: List[PermissionCheck] = []
        self.endpoints_without_auth: List[str] = []
        self.endpoints_without_validation: List[str] = []
        
    def check_authentication_requirements(self):
        """Vérifie les exigences d'authentification"""
        print("🔐 Vérification des exigences d'authentification...")
        
        # Endpoints qui doivent être protégés
        protected_endpoints = [
            '/depannage/api/technicians/me/',
            '/depannage/api/technicians/subscription_status/',
            '/depannage/api/technicians/renew_subscription/',
            '/depannage/api/repair-requests/dashboard_stats/',
            '/depannage/api/reviews/rewards/',
            '/depannage/api/notifications/',
        ]
        
        # Chercher dans les fichiers de vues
        view_files = [
            "Backend/depannage/views.py",
            "Backend/users/views.py",
        ]
        
        for view_file in view_files:
            if os.path.exists(view_file):
                try:
                    with open(view_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les décorateurs de permission
                    permission_patterns = [
                        r'@permission_classes\(\[([^\]]+)\]\)',
                        r'permission_classes\s*=\s*\[([^\]]+)\]',
                    ]
                    
                    for pattern in permission_patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            permissions = match.group(1)
                            
                            # Vérifier si l'authentification est requise
                            if 'IsAuthenticated' not in permissions:
                                # Chercher l'endpoint associé
                                lines = content[:match.start()].split('\n')
                                for i, line in enumerate(lines[-10:], 1):  # 10 lignes avant
                                    if 'def ' in line and '(' in line:
                                        method_name = line.split('def ')[1].split('(')[0]
                                        endpoint = self.get_endpoint_from_method(method_name)
                                        if endpoint:
                                            self.endpoints_without_auth.append(endpoint)
                                            self.security_issues.append(SecurityIssue(
                                                endpoint=endpoint,
                                                issue_type="Authentication",
                                                severity="HIGH",
                                                description=f"Endpoint sans authentification: {permissions}",
                                                recommendation="Ajouter @permission_classes([IsAuthenticated])"
                                            ))
                                            break
                
                except Exception as e:
                    print(f"❌ Erreur lecture {view_file}: {e}")
        
        print(f"✅ {len(self.endpoints_without_auth)} endpoints sans authentification trouvés")
    
    def check_input_validation(self):
        """Vérifie la validation des entrées"""
        print("✅ Vérification de la validation des entrées...")
        
        view_files = [
            "Backend/depannage/views.py",
            "Backend/users/views.py",
        ]
        
        for view_file in view_files:
            if os.path.exists(view_file):
                try:
                    with open(view_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les patterns de validation
                    validation_patterns = [
                        r'request\.data\.get\([\'"]([^\'"]+)[\'"]',
                        r'request\.query_params\.get\([\'"]([^\'"]+)[\'"]',
                    ]
                    
                    for pattern in validation_patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            field_name = match.group(1)
                            
                            # Vérifier si la validation est présente
                            context = content[max(0, match.start()-200):match.end()+200]
                            
                            # Chercher la validation
                            validation_checks = [
                                f'if not {field_name}:',
                                f'if {field_name} is None:',
                                f'if {field_name} == "":',
                                f'try:\s*.*?=.*?{field_name}',
                            ]
                            
                            has_validation = any(re.search(check, context) for check in validation_checks)
                            
                            if not has_validation:
                                # Chercher l'endpoint
                                lines = content[:match.start()].split('\n')
                                for i, line in enumerate(lines[-10:], 1):
                                    if 'def ' in line and '(' in line:
                                        method_name = line.split('def ')[1].split('(')[0]
                                        endpoint = self.get_endpoint_from_method(method_name)
                                        if endpoint:
                                            self.endpoints_without_validation.append(endpoint)
                                            self.security_issues.append(SecurityIssue(
                                                endpoint=endpoint,
                                                issue_type="Input Validation",
                                                severity="MEDIUM",
                                                description=f"Champ '{field_name}' sans validation",
                                                recommendation=f"Ajouter la validation pour le champ '{field_name}'"
                                            ))
                                            break
                
                except Exception as e:
                    print(f"❌ Erreur lecture {view_file}: {e}")
        
        print(f"✅ {len(self.endpoints_without_validation)} champs sans validation trouvés")
    
    def check_sql_injection_prevention(self):
        """Vérifie la prévention des injections SQL"""
        print("🛡️ Vérification de la prévention des injections SQL...")
        
        view_files = [
            "Backend/depannage/views.py",
            "Backend/users/views.py",
        ]
        
        for view_file in view_files:
            if os.path.exists(view_file):
                try:
                    with open(view_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les patterns dangereux
                    dangerous_patterns = [
                        r'\.objects\.raw\([\'"]([^\'"]+)[\'"]',
                        r'\.objects\.extra\([\'"]([^\'"]+)[\'"]',
                        r'exec\(',
                        r'eval\(',
                    ]
                    
                    for pattern in dangerous_patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            dangerous_code = match.group(0)
                            
                            # Chercher l'endpoint
                            lines = content[:match.start()].split('\n')
                            for i, line in enumerate(lines[-10:], 1):
                                if 'def ' in line and '(' in line:
                                    method_name = line.split('def ')[1].split('(')[0]
                                    endpoint = self.get_endpoint_from_method(method_name)
                                    if endpoint:
                                        self.security_issues.append(SecurityIssue(
                                            endpoint=endpoint,
                                            issue_type="SQL Injection",
                                            severity="CRITICAL",
                                            description=f"Code dangereux détecté: {dangerous_code}",
                                            recommendation="Utiliser les ORM Django ou des requêtes paramétrées"
                                        ))
                                        break
                
                except Exception as e:
                    print(f"❌ Erreur lecture {view_file}: {e}")
        
        print("✅ Vérification des injections SQL terminée")
    
    def check_xss_prevention(self):
        """Vérifie la prévention des attaques XSS"""
        print("🛡️ Vérification de la prévention XSS...")
        
        view_files = [
            "Backend/depannage/views.py",
            "Backend/users/views.py",
        ]
        
        for view_file in view_files:
            if os.path.exists(view_file):
                try:
                    with open(view_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les patterns XSS
                    xss_patterns = [
                        r'Response\(.*?request\.data\[[\'"]([^\'"]+)[\'"]\]',
                        r'return.*?request\.data\[[\'"]([^\'"]+)[\'"]\]',
                    ]
                    
                    for pattern in xss_patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            field_name = match.group(1)
                            
                            # Chercher l'endpoint
                            lines = content[:match.start()].split('\n')
                            for i, line in enumerate(lines[-10:], 1):
                                if 'def ' in line and '(' in line:
                                    method_name = line.split('def ')[1].split('(')[0]
                                    endpoint = self.get_endpoint_from_method(method_name)
                                    if endpoint:
                                        self.security_issues.append(SecurityIssue(
                                            endpoint=endpoint,
                                            issue_type="XSS",
                                            severity="MEDIUM",
                                            description=f"Données utilisateur non échappées: {field_name}",
                                            recommendation="Utiliser les serializers Django pour la validation"
                                        ))
                                        break
                
                except Exception as e:
                    print(f"❌ Erreur lecture {view_file}: {e}")
        
        print("✅ Vérification XSS terminée")
    
    def check_csrf_protection(self):
        """Vérifie la protection CSRF"""
        print("🛡️ Vérification de la protection CSRF...")
        
        # Vérifier les fichiers de configuration
        settings_files = [
            "Backend/auth/settings.py",
            "Backend/depannage/settings.py",
        ]
        
        for settings_file in settings_files:
            if os.path.exists(settings_file):
                try:
                    with open(settings_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher la configuration CSRF
                    if 'django.middleware.csrf.CsrfViewMiddleware' not in content:
                        self.security_issues.append(SecurityIssue(
                            endpoint="Global",
                            issue_type="CSRF",
                            severity="HIGH",
                            description="Middleware CSRF non configuré",
                            recommendation="Ajouter 'django.middleware.csrf.CsrfViewMiddleware' dans MIDDLEWARE"
                        ))
                    
                    # Chercher les exemptions CSRF
                    csrf_exempt_patterns = [
                        r'@csrf_exempt',
                        r'csrf_exempt\(',
                    ]
                    
                    for pattern in csrf_exempt_patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            self.security_issues.append(SecurityIssue(
                                endpoint="Global",
                                issue_type="CSRF Exemption",
                                severity="MEDIUM",
                                description="Exemption CSRF détectée",
                                recommendation="Vérifier si l'exemption CSRF est nécessaire"
                            ))
                
                except Exception as e:
                    print(f"❌ Erreur lecture {settings_file}: {e}")
        
        print("✅ Vérification CSRF terminée")
    
    def check_rate_limiting(self):
        """Vérifie la limitation de débit"""
        print("⏱️ Vérification de la limitation de débit...")
        
        # Chercher la configuration de rate limiting
        settings_files = [
            "Backend/auth/settings.py",
            "Backend/depannage/settings.py",
        ]
        
        for settings_file in settings_files:
            if os.path.exists(settings_file):
                try:
                    with open(settings_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher la configuration de rate limiting
                    if 'REST_FRAMEWORK' in content and 'DEFAULT_THROTTLE_CLASSES' not in content:
                        self.security_issues.append(SecurityIssue(
                            endpoint="Global",
                            issue_type="Rate Limiting",
                            severity="MEDIUM",
                            description="Limitation de débit non configurée",
                            recommendation="Configurer DEFAULT_THROTTLE_CLASSES dans REST_FRAMEWORK"
                        ))
                
                except Exception as e:
                    print(f"❌ Erreur lecture {settings_file}: {e}")
        
        print("✅ Vérification de la limitation de débit terminée")
    
    def get_endpoint_from_method(self, method_name: str) -> str:
        """Retourne l'endpoint basé sur le nom de la méthode"""
        endpoint_mapping = {
            'me': '/depannage/api/technicians/me/',
            'subscription_status': '/depannage/api/technicians/subscription_status/',
            'renew_subscription': '/depannage/api/technicians/renew_subscription/',
            'dashboard_stats': '/depannage/api/repair-requests/dashboard_stats/',
            'rewards': '/depannage/api/reviews/rewards/',
            'received': '/depannage/api/reviews/received/',
            'available_technicians': '/depannage/api/repair-requests/available_technicians/',
        }
        
        return endpoint_mapping.get(method_name, f"/depannage/api/{method_name}/")
    
    def generate_security_report(self):
        """Génère un rapport de sécurité détaillé"""
        print("\n" + "="*80)
        print("🛡️ RAPPORT DE SÉCURITÉ ET PERMISSIONS")
        print("="*80)
        
        # Statistiques
        total_issues = len(self.security_issues)
        critical_issues = len([i for i in self.security_issues if i.severity == "CRITICAL"])
        high_issues = len([i for i in self.security_issues if i.severity == "HIGH"])
        medium_issues = len([i for i in self.security_issues if i.severity == "MEDIUM"])
        
        print(f"\n📊 Statistiques de sécurité:")
        print(f"   Total des problèmes: {total_issues}")
        print(f"   Critique: {critical_issues}")
        print(f"   Élevé: {high_issues}")
        print(f"   Moyen: {medium_issues}")
        
        # Problèmes par type
        print(f"\n🔍 Problèmes par type:")
        issue_types = {}
        for issue in self.security_issues:
            issue_types[issue.issue_type] = issue_types.get(issue.issue_type, 0) + 1
        
        for issue_type, count in issue_types.items():
            print(f"   {issue_type}: {count}")
        
        # Détail des problèmes critiques
        if critical_issues > 0:
            print(f"\n🚨 Problèmes CRITIQUES:")
            for issue in self.security_issues:
                if issue.severity == "CRITICAL":
                    print(f"   ❌ {issue.endpoint}")
                    print(f"      {issue.description}")
                    print(f"      Recommandation: {issue.recommendation}")
                    print()
        
        # Détail des problèmes élevés
        if high_issues > 0:
            print(f"\n⚠️  Problèmes ÉLEVÉS:")
            for issue in self.security_issues:
                if issue.severity == "HIGH":
                    print(f"   ⚠️  {issue.endpoint}")
                    print(f"      {issue.description}")
                    print(f"      Recommandation: {issue.recommendation}")
                    print()
        
        # Recommandations générales
        print(f"\n💡 Recommandations générales:")
        if critical_issues > 0:
            print(f"   🚨 Corrigez immédiatement les {critical_issues} problèmes critiques")
        
        if high_issues > 0:
            print(f"   ⚠️  Traitez en priorité les {high_issues} problèmes élevés")
        
        if medium_issues > 0:
            print(f"   📝 Planifiez la correction des {medium_issues} problèmes moyens")
        
        # Bonnes pratiques
        print(f"\n✅ Bonnes pratiques à suivre:")
        print(f"   • Utilisez toujours les serializers Django pour la validation")
        print(f"   • Implémentez l'authentification JWT pour tous les endpoints sensibles")
        print(f"   • Validez toutes les entrées utilisateur")
        print(f"   • Utilisez les ORM Django pour éviter les injections SQL")
        print(f"   • Configurez la limitation de débit pour prévenir les abus")
        print(f"   • Implémentez la journalisation des événements de sécurité")
        
        print(f"\n🎯 Rapport de sécurité terminé!")
    
    def run_security_check(self):
        """Exécute la vérification de sécurité complète"""
        print("🚀 Démarrage de la vérification de sécurité...")
        
        self.check_authentication_requirements()
        self.check_input_validation()
        self.check_sql_injection_prevention()
        self.check_xss_prevention()
        self.check_csrf_protection()
        self.check_rate_limiting()
        self.generate_security_report()

if __name__ == "__main__":
    checker = SecurityPermissionsChecker()
    checker.run_security_check() 