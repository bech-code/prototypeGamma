#!/usr/bin/env python3
"""
Script de test automatique pour l'API DepanneTeliman
Teste tous les endpoints publics et protégés
"""

import requests
import json
import time
from datetime import datetime

class APITester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        self.refresh_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, response=None, error=None):
        """Enregistre le résultat d'un test"""
        result = {
            'test': test_name,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'status_code': response.status_code if response else None,
            'error': str(error) if error else None
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if error:
            print(f"   Erreur: {error}")
        if response and response.status_code != 200:
            print(f"   Status: {response.status_code}")
            try:
                print(f"   Response: {response.json()}")
            except:
                print(f"   Response: {response.text}")
        print()

    def test_public_endpoints(self):
        """Teste les endpoints publics"""
        print("🔍 Test des endpoints publics...")
        print("=" * 50)
        
        # Test 1: Health Check
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/test/health_check/")
            success = response.status_code == 200
            self.log_test("Health Check", success, response)
        except Exception as e:
            self.log_test("Health Check", False, error=e)
        
        # Test 2: API Info
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/test/api_info/")
            success = response.status_code == 200
            self.log_test("API Info", success, response)
        except Exception as e:
            self.log_test("API Info", False, error=e)
        
        # Test 3: Admin Interface
        try:
            response = self.session.get(f"{self.base_url}/admin/")
            success = response.status_code == 200
            self.log_test("Admin Interface", success, response)
        except Exception as e:
            self.log_test("Admin Interface", False, error=e)

    def test_authentication(self):
        """Teste l'authentification"""
        print("🔐 Test de l'authentification...")
        print("=" * 50)
        
        # Test 1: Login (avec des credentials de test)
        login_data = {
            "email": "mohamedbechirdiarra4@gmail.com",
            "password": "votre_mot_de_passe"  # Remplacez par le vrai mot de passe
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/users/login/",
                json=login_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                self.refresh_token = data.get('refresh')
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                self.log_test("Login", True, response)
            else:
                self.log_test("Login", False, response)
                
        except Exception as e:
            self.log_test("Login", False, error=e)
        
        # Test 2: Profil utilisateur (protégé)
        if self.token:
            try:
                response = self.session.get(f"{self.base_url}/users/me/")
                success = response.status_code == 200
                self.log_test("User Profile (Protected)", success, response)
            except Exception as e:
                self.log_test("User Profile (Protected)", False, error=e)
        else:
            self.log_test("User Profile (Protected)", False, error="No token available")

    def test_protected_endpoints(self):
        """Teste les endpoints protégés"""
        if not self.token:
            print("⚠️  Impossible de tester les endpoints protégés sans token")
            return
            
        print("🔒 Test des endpoints protégés...")
        print("=" * 50)
        
        # Test 1: Liste des demandes de réparation
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/repair-requests/")
            success = response.status_code == 200
            self.log_test("Repair Requests List", success, response)
        except Exception as e:
            self.log_test("Repair Requests List", False, error=e)
        
        # Test 2: Liste des techniciens
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/technicians/")
            success = response.status_code == 200
            self.log_test("Technicians List", success, response)
        except Exception as e:
            self.log_test("Technicians List", False, error=e)
        
        # Test 3: Liste des clients
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/clients/")
            success = response.status_code == 200
            self.log_test("Clients List", success, response)
        except Exception as e:
            self.log_test("Clients List", False, error=e)

    def test_error_handling(self):
        """Teste la gestion d'erreurs"""
        print("🚨 Test de la gestion d'erreurs...")
        print("=" * 50)
        
        # Test 1: Accès protégé sans token
        try:
            response = requests.get(f"{self.base_url}/users/me/")
            success = response.status_code == 401
            self.log_test("Unauthorized Access", success, response)
        except Exception as e:
            self.log_test("Unauthorized Access", False, error=e)
        
        # Test 2: Route inexistante
        try:
            response = self.session.get(f"{self.base_url}/api/nonexistent/")
            success = response.status_code == 404
            self.log_test("Non-existent Route", success, response)
        except Exception as e:
            self.log_test("Non-existent Route", False, error=e)
        
        # Test 3: Token invalide
        if self.token:
            invalid_headers = {'Authorization': 'Bearer invalid_token'}
            try:
                response = requests.get(
                    f"{self.base_url}/users/me/",
                    headers=invalid_headers
                )
                success = response.status_code == 401
                self.log_test("Invalid Token", success, response)
            except Exception as e:
                self.log_test("Invalid Token", False, error=e)

    def test_performance(self):
        """Teste les performances"""
        print("⚡ Test des performances...")
        print("=" * 50)
        
        # Test de temps de réponse pour health check
        start_time = time.time()
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/test/health_check/")
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # en millisecondes
            
            success = response_time < 1000  # moins de 1 seconde
            self.log_test(f"Response Time ({response_time:.2f}ms)", success, response)
        except Exception as e:
            self.log_test("Response Time", False, error=e)

    def run_all_tests(self):
        """Exécute tous les tests"""
        print("🚀 Démarrage des tests de l'API DepanneTeliman")
        print("=" * 60)
        print()
        
        self.test_public_endpoints()
        self.test_authentication()
        self.test_protected_endpoints()
        self.test_error_handling()
        self.test_performance()
        
        self.print_summary()

    def print_summary(self):
        """Affiche un résumé des tests"""
        print("📊 Résumé des tests")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total des tests: {total_tests}")
        print(f"Tests réussis: {passed_tests} ✅")
        print(f"Tests échoués: {failed_tests} ❌")
        print(f"Taux de réussite: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Tests échoués:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['error']}")
        
        # Sauvegarder les résultats
        with open('test_results.json', 'w') as f:
            json.dump(self.test_results, f, indent=2)
        print(f"\n📄 Résultats sauvegardés dans test_results.json")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests() 