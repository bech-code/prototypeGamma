#!/usr/bin/env python3
"""
Script de test complet pour DepanneTeliman
Évalue l'état actuel du système et identifie les problèmes à corriger
"""

import requests
import json
import time
import sys
import os
from datetime import datetime
from typing import Dict, List, Any

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/depannage/api"
AUTH_BASE = f"{BASE_URL}/users"

class DepanneTelimanTester:
    def __init__(self):
        self.session = requests.Session()
        self.results = {
            "backend": {},
            "frontend": {},
            "security": {},
            "performance": {},
            "integration": {}
        }
        self.start_time = time.time()
        
    def log(self, message: str, level: str = "INFO"):
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"[{timestamp}] {level}: {message}")
        
    def test_backend_health(self) -> bool:
        """Test de santé du backend"""
        try:
            response = self.session.get(f"{BASE_URL}/depannage/api/public/health-check/")
            if response.status_code == 200:
                self.log("✅ Backend en ligne", "SUCCESS")
                return True
            else:
                self.log(f"❌ Backend erreur: {response.status_code}", "ERROR")
                return False
        except Exception as e:
            self.log(f"❌ Backend inaccessible: {e}", "ERROR")
            return False
    
    def test_authentication(self) -> Dict[str, Any]:
        """Test du système d'authentification"""
        results = {"login": False, "register": False, "jwt": False}
        
        # Test d'inscription
        try:
            register_data = {
                "username": f"testuser_{int(time.time())}",
                "email": f"test{int(time.time())}@example.com",
                "password": "TestPassword123!",
                "user_type": "client"
            }
            response = self.session.post(f"{AUTH_BASE}/register/", json=register_data)
            if response.status_code in [201, 200]:
                self.log("✅ Inscription fonctionnelle", "SUCCESS")
                results["register"] = True
            else:
                self.log(f"❌ Erreur inscription: {response.status_code}", "ERROR")
        except Exception as e:
            self.log(f"❌ Erreur inscription: {e}", "ERROR")
        
        # Test de connexion
        try:
            login_data = {
                "username": "admin",  # Utilisateur de test
                "password": "admin123"
            }
            response = self.session.post(f"{AUTH_BASE}/login/", json=login_data)
            if response.status_code == 200:
                data = response.json()
                if "access" in data:
                    self.session.headers.update({"Authorization": f"Bearer {data['access']}"})
                    self.log("✅ Connexion et JWT fonctionnels", "SUCCESS")
                    results["login"] = True
                    results["jwt"] = True
                else:
                    self.log("❌ Token JWT manquant", "ERROR")
            else:
                self.log(f"❌ Erreur connexion: {response.status_code}", "ERROR")
        except Exception as e:
            self.log(f"❌ Erreur connexion: {e}", "ERROR")
        
        return results
    
    def test_api_endpoints(self) -> Dict[str, Any]:
        """Test des endpoints API principaux"""
        endpoints = {
            "clients": f"{API_BASE}/clients/",
            "technicians": f"{API_BASE}/technicians/",
            "repair_requests": f"{API_BASE}/repair-requests/",
            "reviews": f"{API_BASE}/reviews/",
            "payments": f"{API_BASE}/payments/",
            "notifications": f"{API_BASE}/notifications/",
            "admin_stats": f"{API_BASE}/admin/dashboard/stats/",
        }
        
        results = {}
        for name, url in endpoints.items():
            try:
                response = self.session.get(url)
                if response.status_code in [200, 401, 403]:  # 401/403 sont normaux sans auth
                    self.log(f"✅ Endpoint {name}: {response.status_code}", "SUCCESS")
                    results[name] = {"status": response.status_code, "working": True}
                else:
                    self.log(f"❌ Endpoint {name}: {response.status_code}", "ERROR")
                    results[name] = {"status": response.status_code, "working": False}
            except Exception as e:
                self.log(f"❌ Endpoint {name} inaccessible: {e}", "ERROR")
                results[name] = {"error": str(e), "working": False}
        
        return results
    
    def test_security(self) -> Dict[str, Any]:
        """Tests de sécurité basiques"""
        results = {
            "csrf": False,
            "headers": False,
            "rate_limiting": False
        }
        
        # Test des en-têtes de sécurité
        try:
            response = self.session.get(f"{BASE_URL}/")
            headers = response.headers
            
            security_headers = {
                "X-Frame-Options": "DENY",
                "X-Content-Type-Options": "nosniff",
                "X-XSS-Protection": "1; mode=block"
            }
            
            missing_headers = []
            for header, expected_value in security_headers.items():
                if header not in headers:
                    missing_headers.append(header)
            
            if not missing_headers:
                self.log("✅ En-têtes de sécurité présents", "SUCCESS")
                results["headers"] = True
            else:
                self.log(f"❌ En-têtes manquants: {missing_headers}", "WARNING")
                
        except Exception as e:
            self.log(f"❌ Erreur test en-têtes: {e}", "ERROR")
        
        # Test de rate limiting (basique)
        try:
            responses = []
            for _ in range(10):
                response = self.session.get(f"{API_BASE}/clients/")
                responses.append(response.status_code)
                time.sleep(0.1)
            
            # Si on a des 429, le rate limiting fonctionne
            if 429 in responses:
                self.log("✅ Rate limiting actif", "SUCCESS")
                results["rate_limiting"] = True
            else:
                self.log("⚠️ Rate limiting non détecté", "WARNING")
                
        except Exception as e:
            self.log(f"❌ Erreur test rate limiting: {e}", "ERROR")
        
        return results
    
    def test_performance(self) -> Dict[str, Any]:
        """Tests de performance basiques"""
        results = {
            "response_time": 0,
            "concurrent_requests": False,
            "memory_usage": "N/A"
        }
        
        # Test du temps de réponse
        try:
            start_time = time.time()
            response = self.session.get(f"{API_BASE}/clients/")
            response_time = (time.time() - start_time) * 1000  # en ms
            
            results["response_time"] = response_time
            
            if response_time < 500:
                self.log(f"✅ Temps de réponse: {response_time:.0f}ms", "SUCCESS")
            elif response_time < 1000:
                self.log(f"⚠️ Temps de réponse: {response_time:.0f}ms", "WARNING")
            else:
                self.log(f"❌ Temps de réponse: {response_time:.0f}ms", "ERROR")
                
        except Exception as e:
            self.log(f"❌ Erreur test performance: {e}", "ERROR")
        
        return results
    
    def test_frontend_accessibility(self) -> Dict[str, Any]:
        """Test d'accessibilité du frontend"""
        results = {
            "accessible": False,
            "responsive": False,
            "pwa": False
        }
        
        try:
            # Test d'accès au frontend
            response = self.session.get("http://localhost:5173")
            if response.status_code == 200:
                self.log("✅ Frontend accessible", "SUCCESS")
                results["accessible"] = True
                
                # Vérifier si c'est une PWA (manifest.json)
                try:
                    manifest_response = self.session.get("http://localhost:5173/manifest.json")
                    if manifest_response.status_code == 200:
                        self.log("✅ PWA détectée", "SUCCESS")
                        results["pwa"] = True
                except:
                    self.log("⚠️ PWA non détectée", "WARNING")
                    
            else:
                self.log(f"❌ Frontend inaccessible: {response.status_code}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ Frontend non accessible: {e}", "ERROR")
        
        return results
    
    def test_database_integrity(self) -> Dict[str, Any]:
        """Test d'intégrité de la base de données"""
        results = {
            "models": False,
            "migrations": False,
            "data_consistency": False
        }
        
        try:
            # Test des modèles via l'API admin
            response = self.session.get(f"{BASE_URL}/admin/")
            if response.status_code in [200, 302]:  # 302 = redirection login
                self.log("✅ Interface admin accessible", "SUCCESS")
                results["models"] = True
            else:
                self.log(f"❌ Interface admin: {response.status_code}", "ERROR")
                
        except Exception as e:
            self.log(f"❌ Erreur test DB: {e}", "ERROR")
        
        return results
    
    def generate_report(self) -> str:
        """Génère un rapport complet"""
        total_time = time.time() - self.start_time
        
        report = f"""
# 📊 Rapport de Test Complet - DepanneTeliman

**Date:** {datetime.now().strftime("%Y-%m-%d %H:%M:%S")}
**Durée:** {total_time:.1f} secondes

## 🔧 Backend

### Authentification
- Inscription: {'✅' if self.results['backend'].get('auth', {}).get('register') else '❌'}
- Connexion: {'✅' if self.results['backend'].get('auth', {}).get('login') else '❌'}
- JWT: {'✅' if self.results['backend'].get('auth', {}).get('jwt') else '❌'}

### API Endpoints
"""
        
        if 'endpoints' in self.results['backend']:
            for endpoint, result in self.results['backend']['endpoints'].items():
                status = '✅' if result.get('working') else '❌'
                report += f"- {endpoint}: {status} ({result.get('status', 'N/A')})\n"
        
        report += f"""
## 🔒 Sécurité
- En-têtes de sécurité: {'✅' if self.results['security'].get('headers') else '❌'}
- Rate limiting: {'✅' if self.results['security'].get('rate_limiting') else '❌'}

## ⚡ Performance
- Temps de réponse: {self.results['performance'].get('response_time', 0):.0f}ms

## 🎨 Frontend
- Accessible: {'✅' if self.results['frontend'].get('accessible') else '❌'}
- PWA: {'✅' if self.results['frontend'].get('pwa') else '❌'}

## 📊 Recommandations

### Priorité Haute
"""
        
        # Analyser les résultats et donner des recommandations
        issues = []
        if not self.results['backend'].get('auth', {}).get('login'):
            issues.append("🔴 Système d'authentification défaillant")
        if not self.results['security'].get('headers'):
            issues.append("🔴 En-têtes de sécurité manquants")
        if self.results['performance'].get('response_time', 0) > 1000:
            issues.append("🔴 Performance dégradée")
        if not self.results['frontend'].get('accessible'):
            issues.append("🔴 Frontend inaccessible")
        
        if not issues:
            report += "- ✅ Aucun problème critique détecté\n"
        else:
            for issue in issues:
                report += f"- {issue}\n"
        
        report += """
### Priorité Moyenne
- Optimiser les temps de réponse
- Améliorer la sécurité
- Tester tous les flux utilisateur

### Priorité Basse
- Ajouter des tests automatisés
- Optimiser le cache
- Améliorer l'UX mobile
"""
        
        return report
    
    def run_all_tests(self):
        """Exécute tous les tests"""
        self.log("🚀 Démarrage des tests complets DepanneTeliman")
        
        # Test 1: Santé du backend
        if not self.test_backend_health():
            self.log("❌ Backend inaccessible - arrêt des tests", "ERROR")
            return
        
        # Test 2: Authentification
        self.results['backend']['auth'] = self.test_authentication()
        
        # Test 3: Endpoints API
        self.results['backend']['endpoints'] = self.test_api_endpoints()
        
        # Test 4: Sécurité
        self.results['security'] = self.test_security()
        
        # Test 5: Performance
        self.results['performance'] = self.test_performance()
        
        # Test 6: Frontend
        self.results['frontend'] = self.test_frontend_accessibility()
        
        # Test 7: Base de données
        self.results['backend']['database'] = self.test_database_integrity()
        
        # Générer le rapport
        report = self.generate_report()
        print(report)
        
        # Sauvegarder le rapport
        with open("test_report.txt", "w", encoding="utf-8") as f:
            f.write(report)
        
        self.log("✅ Tests terminés - rapport sauvegardé dans test_report.txt", "SUCCESS")

def main():
    """Point d'entrée principal"""
    tester = DepanneTelimanTester()
    tester.run_all_tests()

if __name__ == "__main__":
    main()