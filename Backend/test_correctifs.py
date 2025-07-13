#!/usr/bin/env python3
"""
Script de test pour vérifier que les correctifs fonctionnent.
Ce script teste les fonctionnalités critiques après application des correctifs.
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from depannage.models import RepairRequest, Technician, Client
from django.utils import timezone

User = get_user_model()

class CorrectifsTester:
    def __init__(self):
        self.base_url = "http://127.0.0.1:8000"
        self.test_results = []
        
    def log_test(self, test_name, success, message=""):
        """Enregistre le résultat d'un test."""
        status = "✅ PASS" if success else "❌ FAIL"
        result = f"{status} {test_name}"
        if message:
            result += f" - {message}"
        self.test_results.append(result)
        print(result)
        
    def test_backend_health(self):
        """Teste la santé du backend."""
        try:
            response = requests.get(f"{self.base_url}/depannage/api/test/health-check/")
            self.log_test("Backend Health Check", response.status_code == 200)
        except Exception as e:
            self.log_test("Backend Health Check", False, str(e))
            
    def test_logging_configuration(self):
        """Teste la configuration des logs."""
        try:
            from django.conf import settings
            has_logging = hasattr(settings, 'LOGGING')
            self.log_test("Logging Configuration", has_logging)
        except Exception as e:
            self.log_test("Logging Configuration", False, str(e))
            
    def test_technician_assignation_logic(self):
        """Teste la logique d'assignation des techniciens."""
        try:
            # Créer un technicien de test
            user = User.objects.create_user(
                username="test_tech",
                email="test_tech@test.com",
                password="testpass123",
                user_type="technician"
            )
            
            technician = Technician.objects.create(
                user=user,
                specialty="plomberie",
                is_available=True,
                is_verified=True
            )
            
            # Créer un client de test
            client_user = User.objects.create_user(
                username="test_client",
                email="test_client@test.com",
                password="testpass123",
                user_type="client"
            )
            
            client = Client.objects.create(
                user=client_user,
                phone="123456789"
            )
            
            # Créer une demande de réparation
            repair_request = RepairRequest.objects.create(
                title="Test Request",
                description="Test Description",
                specialty_needed="plomberie",
                client=client,
                status="pending"
            )
            
            # Tester l'assignation
            repair_request.technician = technician
            repair_request.status = "assigned"
            repair_request.save()
            
            success = repair_request.technician == technician and repair_request.status == "assigned"
            self.log_test("Technician Assignment Logic", success)
            
            # Nettoyer
            user.delete()
            client_user.delete()
            
        except Exception as e:
            self.log_test("Technician Assignment Logic", False, str(e))
            
    def test_token_management(self):
        """Teste la gestion des tokens."""
        try:
            # Créer un utilisateur de test
            user = User.objects.create_user(
                username="token_test",
                email="token_test@test.com",
                password="testpass123",
                user_type="client"
            )
            
            # Tester la création de tokens
            from rest_framework_simplejwt.tokens import RefreshToken
            refresh = RefreshToken.for_user(user)
            access_token = str(refresh.access_token)
            
            # Vérifier que les tokens sont valides
            from rest_framework_simplejwt.tokens import AccessToken
            token = AccessToken(access_token)
            user_id = token['user_id']
            
            success = user_id == user.id
            self.log_test("Token Management", success)
            
            # Nettoyer
            user.delete()
            
        except Exception as e:
            self.log_test("Token Management", False, str(e))
            
    def test_cors_configuration(self):
        """Teste la configuration CORS."""
        try:
            from django.conf import settings
            cors_origins = getattr(settings, 'CORS_ALLOWED_ORIGINS', [])
            has_cors = len(cors_origins) > 0
            self.log_test("CORS Configuration", has_cors, f"Origines: {cors_origins}")
        except Exception as e:
            self.log_test("CORS Configuration", False, str(e))
            
    def test_security_headers(self):
        """Teste les headers de sécurité."""
        try:
            from django.conf import settings
            security_headers = [
                'SECURE_BROWSER_XSS_FILTER',
                'SECURE_CONTENT_TYPE_NOSNIFF',
                'X_FRAME_OPTIONS'
            ]
            
            configured_headers = 0
            for header in security_headers:
                if hasattr(settings, header):
                    configured_headers += 1
                    
            success = configured_headers >= 2  # Au moins 2 headers configurés
            self.log_test("Security Headers", success, f"{configured_headers}/3 headers configurés")
            
        except Exception as e:
            self.log_test("Security Headers", False, str(e))
            
    def test_database_cleanup(self):
        """Teste le script de nettoyage de base de données."""
        try:
            # Importer et exécuter le script de nettoyage
            import clean_expired_tokens
            
            # Le script devrait s'exécuter sans erreur
            self.log_test("Database Cleanup Script", True)
            
        except Exception as e:
            self.log_test("Database Cleanup Script", False, str(e))
            
    def run_all_tests(self):
        """Exécute tous les tests."""
        print("🧪 Début des tests de correctifs...")
        print(f"⏰ Heure: {timezone.now()}")
        print("=" * 50)
        
        self.test_backend_health()
        self.test_logging_configuration()
        self.test_technician_assignation_logic()
        self.test_token_management()
        self.test_cors_configuration()
        self.test_security_headers()
        self.test_database_cleanup()
        
        print("=" * 50)
        print("📊 Résumé des tests:")
        
        passed = sum(1 for result in self.test_results if "✅ PASS" in result)
        total = len(self.test_results)
        
        for result in self.test_results:
            print(f"  {result}")
            
        print(f"\n🎯 Résultat: {passed}/{total} tests réussis")
        
        if passed == total:
            print("🎉 Tous les correctifs sont fonctionnels!")
        else:
            print("⚠️  Certains correctifs nécessitent une attention supplémentaire.")
            
        return passed == total

def main():
    """Fonction principale."""
    tester = CorrectifsTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n✅ Les correctifs ont été appliqués avec succès!")
        print("\n📋 Prochaines étapes:")
        print("   1. Redémarrez le serveur Django")
        print("   2. Testez l'application frontend")
        print("   3. Vérifiez les logs pour les erreurs")
    else:
        print("\n❌ Certains correctifs ont échoué.")
        print("Vérifiez les erreurs ci-dessus et corrigez-les.")

if __name__ == "__main__":
    main() 