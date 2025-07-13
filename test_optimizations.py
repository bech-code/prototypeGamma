#!/usr/bin/env python3
"""
Script de test complet pour vérifier les optimisations de performance et de sécurité
de l'application DepanneTeliman.
"""

import requests
import json
import time
import sys
from datetime import datetime
import statistics

# Configuration
BASE_URL = "http://localhost:8000"

# Identifiants de test
CLIENT_EMAIL = "client2@example.com"
CLIENT_PASSWORD = "client123"
TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"
ADMIN_EMAIL = "admin@depanneteliman.com"
ADMIN_PASSWORD = "admin123"

def print_header(title):
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def print_performance(operation, duration, threshold=1.0):
    """Affiche les résultats de performance."""
    if duration < threshold:
        print_success(f"{operation}: {duration:.3f}s (excellent)")
    elif duration < threshold * 2:
        print_warning(f"{operation}: {duration:.3f}s (acceptable)")
    else:
        print_error(f"{operation}: {duration:.3f}s (lent)")

class PerformanceTester:
    def __init__(self):
        self.client_token = None
        self.technician_token = None
        self.admin_token = None
        self.test_results = []
        
    def login_users(self):
        """Connexion des utilisateurs de test."""
        print_header("CONNEXION DES UTILISATEURS")
        
        # Connexion client
        try:
            response = requests.post(f"{BASE_URL}/users/login/", json={
                "email": CLIENT_EMAIL,
                "password": CLIENT_PASSWORD
            })
            if response.status_code == 200:
                self.client_token = response.json().get('access')
                print_success(f"Client connecté: {CLIENT_EMAIL}")
            else:
                print_error(f"Échec connexion client: {response.status_code}")
        except Exception as e:
            print_error(f"Erreur connexion client: {e}")
        
        # Connexion technicien
        try:
            response = requests.post(f"{BASE_URL}/users/login/", json={
                "email": TECHNICIAN_EMAIL,
                "password": TECHNICIAN_PASSWORD
            })
            if response.status_code == 200:
                self.technician_token = response.json().get('access')
                print_success(f"Technicien connecté: {TECHNICIAN_EMAIL}")
            else:
                print_error(f"Échec connexion technicien: {response.status_code}")
        except Exception as e:
            print_error(f"Erreur connexion technicien: {e}")
        
        # Connexion admin
        try:
            response = requests.post(f"{BASE_URL}/users/login/", json={
                "email": ADMIN_EMAIL,
                "password": ADMIN_PASSWORD
            })
            if response.status_code == 200:
                self.admin_token = response.json().get('access')
                print_success(f"Admin connecté: {ADMIN_EMAIL}")
            else:
                print_error(f"Échec connexion admin: {response.status_code}")
        except Exception as e:
            print_error(f"Erreur connexion admin: {e}")

    def test_endpoint_performance(self, endpoint, token, method="GET", data=None, name=None):
        """Teste la performance d'un endpoint."""
        if not token:
            return None
            
        headers = {'Authorization': f'Bearer {token}'}
        url = f"{BASE_URL}{endpoint}"
        
        start_time = time.time()
        try:
            if method == "GET":
                response = requests.get(url, headers=headers)
            elif method == "POST":
                response = requests.post(url, json=data, headers=headers)
            elif method == "PUT":
                response = requests.put(url, json=data, headers=headers)
            elif method == "DELETE":
                response = requests.delete(url, headers=headers)
            
            duration = time.time() - start_time
            
            if response.status_code in [200, 201, 204]:
                print_performance(f"{name or endpoint}", duration)
                return {
                    'endpoint': endpoint,
                    'duration': duration,
                    'status_code': response.status_code,
                    'success': True
                }
            else:
                print_error(f"{name or endpoint}: {response.status_code} - {duration:.3f}s")
                return {
                    'endpoint': endpoint,
                    'duration': duration,
                    'status_code': response.status_code,
                    'success': False
                }
                
        except Exception as e:
            duration = time.time() - start_time
            print_error(f"{name or endpoint}: Erreur - {duration:.3f}s - {e}")
            return {
                'endpoint': endpoint,
                'duration': duration,
                'error': str(e),
                'success': False
            }

    def test_pagination(self):
        """Teste la pagination des endpoints."""
        print_header("TEST DE PAGINATION")
        
        endpoints_to_test = [
            ("/depannage/api/repair-requests/", self.client_token, "Demandes de réparation"),
            ("/depannage/api/technicians/", self.admin_token, "Techniciens"),
            ("/depannage/api/reviews/", self.technician_token, "Avis"),
            ("/depannage/api/payments/", self.admin_token, "Paiements"),
            ("/depannage/api/notifications/", self.client_token, "Notifications"),
        ]
        
        for endpoint, token, name in endpoints_to_test:
            if token:
                result = self.test_endpoint_performance(endpoint, token, name=name)
                if result and result['success']:
                    # Vérifier la structure de pagination
                    try:
                        response = requests.get(f"{BASE_URL}{endpoint}", 
                                             headers={'Authorization': f'Bearer {token}'})
                        data = response.json()
                        if 'count' in data and 'results' in data:
                            print_success(f"Pagination correcte pour {name}")
                        else:
                            print_warning(f"Pagination manquante pour {name}")
                    except:
                        print_warning(f"Impossible de vérifier la pagination pour {name}")

    def test_optimized_queries(self):
        """Teste les requêtes optimisées."""
        print_header("TEST DES REQUÊTES OPTIMISÉES")
        
        # Test des endpoints avec select_related/prefetch_related
        optimized_endpoints = [
            ("/depannage/api/repair-requests/dashboard_stats/", self.client_token, "Statistiques dashboard"),
            ("/depannage/api/technicians/me/", self.technician_token, "Profil technicien"),
            ("/depannage/api/reviews/received/", self.technician_token, "Avis reçus"),
            ("/depannage/api/payments/my_payments/", self.client_token, "Mes paiements"),
        ]
        
        for endpoint, token, name in optimized_endpoints:
            if token:
                self.test_endpoint_performance(endpoint, token, name=name)

    def test_geolocation_performance(self):
        """Teste la performance de la géolocalisation."""
        print_header("TEST DE PERFORMANCE GÉOLOCALISATION")
        
        if self.client_token:
            # Test avec différentes distances
            distances = [5, 10, 20, 50]
            for distance in distances:
                endpoint = f"/depannage/api/repair-requests/available_technicians/?latitude=12.6508&longitude=-8.0000&max_distance={distance}"
                self.test_endpoint_performance(endpoint, self.client_token, 
                                            name=f"Techniciens proches ({distance}km)")

    def test_security_features(self):
        """Teste les fonctionnalités de sécurité."""
        print_header("TEST DE SÉCURITÉ")
        
        # Test sans token
        response = requests.get(f"{BASE_URL}/depannage/api/repair-requests/")
        if response.status_code == 401:
            print_success("Authentification requise")
        else:
            print_error("Authentification non requise")
        
        # Test avec token invalide
        response = requests.get(f"{BASE_URL}/depannage/api/repair-requests/", 
                              headers={'Authorization': 'Bearer invalid_token'})
        if response.status_code == 401:
            print_success("Validation des tokens")
        else:
            print_error("Validation des tokens défaillante")
        
        # Test CORS
        response = requests.options(f"{BASE_URL}/depannage/api/repair-requests/", 
                                  headers={'Origin': 'http://malicious-site.com'})
        if response.status_code == 200:
            cors_headers = response.headers.get('Access-Control-Allow-Origin', '')
            if 'malicious-site.com' not in cors_headers:
                print_success("CORS configuré correctement")
            else:
                print_error("CORS trop permissif")
        else:
            print_warning("CORS non testable")

    def test_error_handling(self):
        """Teste la gestion d'erreurs."""
        print_header("TEST DE GESTION D'ERREURS")
        
        if self.client_token:
            # Test avec données invalides
            invalid_data = {
                "title": "",  # Titre vide
                "latitude": "invalid",  # Latitude invalide
                "longitude": "invalid"  # Longitude invalide
            }
            
            response = requests.post(f"{BASE_URL}/depannage/api/repair-requests/",
                                   json=invalid_data,
                                   headers={'Authorization': f'Bearer {self.client_token}'})
            
            if response.status_code == 400:
                print_success("Validation des données")
            else:
                print_error("Validation des données défaillante")

    def test_concurrent_requests(self):
        """Teste les performances sous charge."""
        print_header("TEST DE PERFORMANCE SOUS CHARGE")
        
        if self.client_token:
            import threading
            
            def make_request():
                response = requests.get(f"{BASE_URL}/depannage/api/repair-requests/",
                                     headers={'Authorization': f'Bearer {self.client_token}'})
                return response.status_code == 200
            
            # Test avec 10 requêtes simultanées
            threads = []
            results = []
            
            start_time = time.time()
            for i in range(10):
                thread = threading.Thread(target=lambda: results.append(make_request()))
                threads.append(thread)
                thread.start()
            
            for thread in threads:
                thread.join()
            
            duration = time.time() - start_time
            success_count = sum(results)
            
            print_info(f"Requêtes simultanées: {success_count}/10 réussies en {duration:.3f}s")
            
            if success_count == 10:
                print_success("Performance sous charge: Excellent")
            elif success_count >= 8:
                print_warning("Performance sous charge: Acceptable")
            else:
                print_error("Performance sous charge: Problématique")

    def test_database_indexes(self):
        """Teste l'utilisation des index de base de données."""
        print_header("TEST DES INDEX DE BASE DE DONNÉES")
        
        # Test des requêtes qui devraient utiliser les index
        indexed_queries = [
            ("/depannage/api/technicians/?is_available=true", self.admin_token, "Index disponibilité"),
            ("/depannage/api/repair-requests/?status=pending", self.admin_token, "Index statut"),
            ("/depannage/api/reviews/?rating__gte=4", self.admin_token, "Index note"),
        ]
        
        for endpoint, token, name in indexed_queries:
            if token:
                self.test_endpoint_performance(endpoint, token, name=name)

    def generate_report(self):
        """Génère un rapport de performance."""
        print_header("RAPPORT DE PERFORMANCE")
        
        successful_tests = [r for r in self.test_results if r.get('success', False)]
        failed_tests = [r for r in self.test_results if not r.get('success', False)]
        
        if successful_tests:
            avg_duration = statistics.mean([r['duration'] for r in successful_tests])
            min_duration = min([r['duration'] for r in successful_tests])
            max_duration = max([r['duration'] for r in successful_tests])
            
            print_info(f"Tests réussis: {len(successful_tests)}")
            print_info(f"Tests échoués: {len(failed_tests)}")
            print_info(f"Temps de réponse moyen: {avg_duration:.3f}s")
            print_info(f"Temps de réponse min: {min_duration:.3f}s")
            print_info(f"Temps de réponse max: {max_duration:.3f}s")
            
            if avg_duration < 0.5:
                print_success("Performance globale: Excellente")
            elif avg_duration < 1.0:
                print_warning("Performance globale: Acceptable")
            else:
                print_error("Performance globale: À améliorer")
        else:
            print_error("Aucun test réussi")

    def run_all_tests(self):
        """Exécute tous les tests."""
        print_header("DÉMARRAGE DES TESTS D'OPTIMISATION")
        
        # Connexion des utilisateurs
        self.login_users()
        
        # Tests de performance
        self.test_pagination()
        self.test_optimized_queries()
        self.test_geolocation_performance()
        self.test_database_indexes()
        self.test_concurrent_requests()
        
        # Tests de sécurité
        self.test_security_features()
        self.test_error_handling()
        
        # Rapport final
        self.generate_report()

def main():
    """Fonction principale."""
    print_header("TEST D'OPTIMISATION DEPANNETELIMAN")
    print_info("Vérification des optimisations de performance et de sécurité")
    
    tester = PerformanceTester()
    tester.run_all_tests()
    
    print_header("FIN DES TESTS")
    print_info("Consultez les résultats ci-dessus pour évaluer les optimisations")

if __name__ == "__main__":
    main()