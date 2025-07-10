#!/usr/bin/env python3
"""
Script de test complet pour les endpoints API des techniciens
Vérifie : endpoints, validation des données, permissions, performance, sécurité
"""

import requests
import json
import time
from typing import Dict, List, Any
from dataclasses import dataclass
from datetime import datetime, timedelta

@dataclass
class TestResult:
    endpoint: str
    method: str
    status_code: int
    response_time: float
    success: bool
    error_message: str = ""
    data_validation: Dict[str, Any] = None

class TechnicianAPITester:
    def __init__(self, base_url: str = "http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.test_results: List[TestResult] = []
        
        # Tokens pour différents types d'utilisateurs
        self.admin_token = None
        self.technician_token = None
        self.client_token = None
        
    def login_user(self, username: str, password: str) -> str:
        """Connexion d'un utilisateur et récupération du token"""
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login/",
                json={"username": username, "password": password}
            )
            if response.status_code == 200:
                return response.json().get("access")
            else:
                print(f"❌ Échec de connexion pour {username}: {response.status_code}")
                return None
        except Exception as e:
            print(f"❌ Erreur de connexion pour {username}: {e}")
            return None
    
    def setup_tokens(self):
        """Configuration des tokens pour les tests"""
        print("🔐 Configuration des tokens de test...")
        
        # Connexion admin
        self.admin_token = self.login_user("admin", "admin123")
        if self.admin_token:
            print("✅ Token admin obtenu")
        else:
            print("❌ Impossible d'obtenir le token admin")
        
        # Connexion technicien
        self.technician_token = self.login_user("technicien1", "password123")
        if self.technician_token:
            print("✅ Token technicien obtenu")
        else:
            print("❌ Impossible d'obtenir le token technicien")
        
        # Connexion client
        self.client_token = self.login_user("client1", "password123")
        if self.client_token:
            print("✅ Token client obtenu")
        else:
            print("❌ Impossible d'obtenir le token client")
    
    def make_request(self, method: str, endpoint: str, token: str = None, 
                    data: Dict = None, expected_status: int = 200) -> TestResult:
        """Effectue une requête API et retourne le résultat"""
        url = f"{self.base_url}{endpoint}"
        headers = {"Content-Type": "application/json"}
        
        if token:
            headers["Authorization"] = f"Bearer {token}"
        
        start_time = time.time()
        
        try:
            if method.upper() == "GET":
                response = self.session.get(url, headers=headers)
            elif method.upper() == "POST":
                response = self.session.post(url, headers=headers, json=data)
            elif method.upper() == "PUT":
                response = self.session.put(url, headers=headers, json=data)
            elif method.upper() == "PATCH":
                response = self.session.patch(url, headers=headers, json=data)
            elif method.upper() == "DELETE":
                response = self.session.delete(url, headers=headers)
            else:
                return TestResult(endpoint, method, 0, 0, False, "Méthode HTTP invalide")
            
            response_time = time.time() - start_time
            success = response.status_code == expected_status
            
            return TestResult(
                endpoint=endpoint,
                method=method,
                status_code=response.status_code,
                response_time=response_time,
                success=success,
                error_message="" if success else f"Status {response.status_code}: {response.text[:200]}",
                data_validation=self.validate_response_data(response) if success else None
            )
            
        except Exception as e:
            return TestResult(
                endpoint=endpoint,
                method=method,
                status_code=0,
                response_time=time.time() - start_time,
                success=False,
                error_message=f"Exception: {str(e)}"
            )
    
    def validate_response_data(self, response: requests.Response) -> Dict[str, Any]:
        """Valide la structure des données de réponse"""
        try:
            data = response.json()
            validation = {
                "has_data": bool(data),
                "data_type": type(data).__name__,
                "expected_fields": [],
                "missing_fields": [],
                "extra_fields": []
            }
            
            # Validation spécifique selon l'endpoint
            if "dashboard" in response.url:
                expected_fields = ["assigned_requests", "completed_requests", "pending_requests", "specialty"]
                validation["expected_fields"] = expected_fields
                for field in expected_fields:
                    if field not in data:
                        validation["missing_fields"].append(field)
            
            elif "rewards" in response.url:
                expected_fields = ["current_level", "next_level", "progress_to_next", "bonuses", "achievements"]
                validation["expected_fields"] = expected_fields
                for field in expected_fields:
                    if field not in data:
                        validation["missing_fields"].append(field)
            
            elif "subscription" in response.url:
                expected_fields = ["subscription", "payments"]
                validation["expected_fields"] = expected_fields
                for field in expected_fields:
                    if field not in data:
                        validation["missing_fields"].append(field)
            
            return validation
            
        except json.JSONDecodeError:
            return {"error": "Réponse non-JSON"}
    
    def test_technician_dashboard_endpoints(self):
        """Test des endpoints du tableau de bord technicien"""
        print("\n📊 Test des endpoints du tableau de bord technicien...")
        
        if not self.technician_token:
            print("❌ Token technicien manquant, impossible de tester")
            return
        
        # Test statistiques dashboard
        result = self.make_request(
            "GET", 
            "/depannage/api/repair-requests/dashboard_stats/",
            self.technician_token
        )
        self.test_results.append(result)
        
        # Test demandes récentes
        result = self.make_request(
            "GET", 
            "/depannage/api/repair-requests/?status=assigned&limit=5",
            self.technician_token
        )
        self.test_results.append(result)
        
        # Test notifications
        result = self.make_request(
            "GET", 
            "/depannage/api/notifications/",
            self.technician_token
        )
        self.test_results.append(result)
    
    def test_technician_profile_endpoints(self):
        """Test des endpoints du profil technicien"""
        print("\n👤 Test des endpoints du profil technicien...")
        
        if not self.technician_token:
            print("❌ Token technicien manquant, impossible de tester")
            return
        
        # Test récupération profil
        result = self.make_request(
            "GET", 
            "/depannage/api/technicians/me/",
            self.technician_token
        )
        self.test_results.append(result)
        
        # Test mise à jour profil
        update_data = {
            "phone": "223 12345678",
            "specialty": "plomberie",
            "years_experience": 5,
            "hourly_rate": 5000,
            "bio": "Technicien expérimenté"
        }
        result = self.make_request(
            "PATCH", 
            "/depannage/api/technicians/1/",
            self.technician_token,
            update_data
        )
        self.test_results.append(result)
    
    def test_rewards_endpoints(self):
        """Test des endpoints de récompenses"""
        print("\n🏆 Test des endpoints de récompenses...")
        
        if not self.technician_token:
            print("❌ Token technicien manquant, impossible de tester")
            return
        
        # Test récompenses
        result = self.make_request(
            "GET", 
            "/depannage/api/reviews/rewards/",
            self.technician_token
        )
        self.test_results.append(result)
    
    def test_subscription_endpoints(self):
        """Test des endpoints d'abonnement"""
        print("\n💳 Test des endpoints d'abonnement...")
        
        if not self.technician_token:
            print("❌ Token technicien manquant, impossible de tester")
            return
        
        # Test statut abonnement
        result = self.make_request(
            "GET", 
            "/depannage/api/technicians/subscription_status/",
            self.technician_token
        )
        self.test_results.append(result)
        
        # Test renouvellement abonnement
        renewal_data = {
            "payment_method": "mobile_money",
            "phone_number": "223 12345678"
        }
        result = self.make_request(
            "POST", 
            "/depannage/api/technicians/renew_subscription/",
            self.technician_token,
            renewal_data
        )
        self.test_results.append(result)
    
    def test_permissions(self):
        """Test des permissions d'accès"""
        print("\n🔒 Test des permissions d'accès...")
        
        # Test accès technicien avec token client (doit échouer)
        if self.client_token:
            result = self.make_request(
                "GET", 
                "/depannage/api/technicians/me/",
                self.client_token,
                expected_status=403
            )
            self.test_results.append(result)
        
        # Test accès admin avec token technicien (doit échouer)
        if self.technician_token:
            result = self.make_request(
                "GET", 
                "/depannage/api/repair-requests/available_technicians/",
                self.technician_token,
                expected_status=403
            )
            self.test_results.append(result)
    
    def test_data_validation(self):
        """Test de validation des données"""
        print("\n✅ Test de validation des données...")
        
        if not self.technician_token:
            print("❌ Token technicien manquant, impossible de tester")
            return
        
        # Test données invalides pour mise à jour profil
        invalid_data = {
            "phone": "invalid_phone",  # Format invalide
            "years_experience": -5,    # Valeur négative
            "hourly_rate": "not_a_number"  # Type invalide
        }
        result = self.make_request(
            "PATCH", 
            "/depannage/api/technicians/1/",
            self.technician_token,
            invalid_data,
            expected_status=400
        )
        self.test_results.append(result)
        
        # Test données invalides pour renouvellement abonnement
        invalid_renewal = {
            "payment_method": "invalid_method",
            "phone_number": "invalid_phone"
        }
        result = self.make_request(
            "POST", 
            "/depannage/api/technicians/renew_subscription/",
            self.technician_token,
            invalid_renewal,
            expected_status=400
        )
        self.test_results.append(result)
    
    def test_performance(self):
        """Test de performance des endpoints"""
        print("\n⚡ Test de performance...")
        
        if not self.technician_token:
            print("❌ Token technicien manquant, impossible de tester")
            return
        
        # Test performance dashboard
        start_time = time.time()
        result = self.make_request(
            "GET", 
            "/depannage/api/repair-requests/dashboard_stats/",
            self.technician_token
        )
        performance_time = time.time() - start_time
        
        if performance_time > 2.0:  # Plus de 2 secondes
            result.error_message += f" (Performance lente: {performance_time:.2f}s)"
            result.success = False
        
        self.test_results.append(result)
    
    def test_security(self):
        """Test de sécurité"""
        print("\n🛡️ Test de sécurité...")
        
        # Test injection SQL (simulation)
        malicious_data = {
            "phone": "'; DROP TABLE users; --",
            "bio": "<script>alert('xss')</script>"
        }
        
        if self.technician_token:
            result = self.make_request(
                "PATCH", 
                "/depannage/api/technicians/1/",
                self.technician_token,
                malicious_data
            )
            self.test_results.append(result)
        
        # Test sans token (doit échouer)
        result = self.make_request(
            "GET", 
            "/depannage/api/technicians/me/",
            expected_status=401
        )
        self.test_results.append(result)
    
    def run_all_tests(self):
        """Exécute tous les tests"""
        print("🚀 Démarrage des tests API des techniciens...")
        
        # Configuration
        self.setup_tokens()
        
        # Tests
        self.test_technician_dashboard_endpoints()
        self.test_technician_profile_endpoints()
        self.test_rewards_endpoints()
        self.test_subscription_endpoints()
        self.test_permissions()
        self.test_data_validation()
        self.test_performance()
        self.test_security()
        
        # Résultats
        self.print_results()
    
    def print_results(self):
        """Affiche les résultats des tests"""
        print("\n" + "="*80)
        print("📋 RÉSULTATS DES TESTS API DES TECHNICIENS")
        print("="*80)
        
        total_tests = len(self.test_results)
        successful_tests = sum(1 for r in self.test_results if r.success)
        failed_tests = total_tests - successful_tests
        
        print(f"\n📊 Statistiques générales:")
        print(f"   Total des tests: {total_tests}")
        print(f"   Tests réussis: {successful_tests} ✅")
        print(f"   Tests échoués: {failed_tests} ❌")
        print(f"   Taux de succès: {(successful_tests/total_tests)*100:.1f}%")
        
        # Temps de réponse moyen
        avg_response_time = sum(r.response_time for r in self.test_results) / total_tests
        print(f"   Temps de réponse moyen: {avg_response_time:.3f}s")
        
        print(f"\n🔍 Détail des tests:")
        for i, result in enumerate(self.test_results, 1):
            status = "✅" if result.success else "❌"
            print(f"   {i:2d}. {status} {result.method} {result.endpoint}")
            print(f"       Status: {result.status_code}, Temps: {result.response_time:.3f}s")
            if not result.success and result.error_message:
                print(f"       Erreur: {result.error_message}")
            if result.data_validation:
                print(f"       Validation: {result.data_validation}")
            print()
        
        # Recommandations
        print(f"\n💡 Recommandations:")
        if failed_tests > 0:
            print(f"   ⚠️  {failed_tests} tests ont échoué. Vérifiez les endpoints et la validation.")
        
        slow_tests = [r for r in self.test_results if r.response_time > 1.0]
        if slow_tests:
            print(f"   ⚡ {len(slow_tests)} endpoints sont lents (>1s). Optimisez les requêtes.")
        
        # Validation des données
        validation_issues = [r for r in self.test_results if r.data_validation and r.data_validation.get("missing_fields")]
        if validation_issues:
            print(f"   📝 {len(validation_issues)} endpoints ont des problèmes de validation de données.")
        
        print(f"\n🎯 Tests terminés!")

if __name__ == "__main__":
    tester = TechnicianAPITester()
    tester.run_all_tests() 