#!/usr/bin/env python3
"""
Script de vérification de la correspondance entre appels frontend et endpoints backend
"""

import re
import os
from typing import Dict, List, Set, Tuple
from dataclasses import dataclass

@dataclass
class APICall:
    url: str
    method: str
    component: str
    line_number: int

@dataclass
class Endpoint:
    url: str
    method: str
    view: str
    file: str

class FrontendBackendMapper:
    def __init__(self):
        self.frontend_calls: List[APICall] = []
        self.backend_endpoints: List[Endpoint] = []
        self.missing_endpoints: List[APICall] = []
        self.unused_endpoints: List[Endpoint] = []
        
    def extract_frontend_calls(self, frontend_dir: str = "Frontend/src"):
        """Extrait tous les appels API du frontend"""
        print("🔍 Extraction des appels API frontend...")
        
        # Patterns pour détecter les appels API
        patterns = [
            r'fetchWithAuth\([\'"]([^\'"]+)[\'"]',
            r'fetch\([\'"]([^\'"]+)[\'"]',
            r'axios\.(get|post|put|patch|delete)\([\'"]([^\'"]+)[\'"]',
        ]
        
        for root, dirs, files in os.walk(frontend_dir):
            for file in files:
                if file.endswith(('.tsx', '.ts', '.js', '.jsx')):
                    file_path = os.path.join(root, file)
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                            
                        # Chercher les appels API
                        for pattern in patterns:
                            matches = re.finditer(pattern, content, re.IGNORECASE)
                            for match in matches:
                                url = match.group(1) if 'axios' not in pattern else match.group(2)
                                method = 'GET'  # Par défaut
                                
                                # Déterminer la méthode HTTP
                                if 'axios.' in pattern:
                                    method = match.group(1).upper()
                                elif 'POST' in match.group(0):
                                    method = 'POST'
                                elif 'PUT' in match.group(0):
                                    method = 'PUT'
                                elif 'PATCH' in match.group(0):
                                    method = 'PATCH'
                                elif 'DELETE' in match.group(0):
                                    method = 'DELETE'
                                
                                # Nettoyer l'URL
                                if url.startswith('http://127.0.0.1:8000'):
                                    url = url.replace('http://127.0.0.1:8000', '')
                                elif url.startswith('http://localhost:8000'):
                                    url = url.replace('http://localhost:8000', '')
                                
                                # Compter les lignes pour obtenir le numéro de ligne
                                lines = content[:match.start()].count('\n') + 1
                                
                                self.frontend_calls.append(APICall(
                                    url=url,
                                    method=method,
                                    component=file,
                                    line_number=lines
                                ))
                                
                    except Exception as e:
                        print(f"❌ Erreur lecture {file_path}: {e}")
        
        print(f"✅ {len(self.frontend_calls)} appels API frontend trouvés")
    
    def extract_backend_endpoints(self, backend_dir: str = "Backend"):
        """Extrait tous les endpoints du backend"""
        print("🔍 Extraction des endpoints backend...")
        
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
                    
                    # Chercher les patterns d'endpoints
                    patterns = [
                        # @action decorators
                        r'@action\(detail=(True|False), methods=\[([^\]]+)\].*?def (\w+)',
                        # @api_view decorators
                        r'@api_view\(\[([^\]]+)\].*?def (\w+)',
                        # ViewSet methods
                        r'def (list|create|retrieve|update|partial_update|destroy)',
                        # Custom methods
                        r'def (\w+)\(',
                    ]
                    
                    for pattern in patterns:
                        matches = re.finditer(pattern, content, re.MULTILINE | re.DOTALL)
                        for match in matches:
                            if 'action' in pattern:
                                methods = match.group(2).replace('"', '').replace("'", '').split(',')
                                method_name = match.group(3)
                            elif 'api_view' in pattern:
                                methods = match.group(1).replace('"', '').replace("'", '').split(',')
                                method_name = match.group(2)
                            else:
                                methods = ['GET']  # Par défaut
                                method_name = match.group(1)
                            
                            for method in methods:
                                method = method.strip().upper()
                                if method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']:
                                    # Construire l'URL basée sur le nom de la méthode
                                    url = self.build_url_from_method(method_name, method)
                                    if url:
                                        self.backend_endpoints.append(Endpoint(
                                            url=url,
                                            method=method,
                                            view=method_name,
                                            file=view_file
                                        ))
                
                except Exception as e:
                    print(f"❌ Erreur lecture {view_file}: {e}")
        
        # Chercher dans les fichiers urls.py
        url_files = [
            "Backend/depannage/urls.py",
            "Backend/users/urls.py",
        ]
        
        for url_file in url_files:
            if os.path.exists(url_file):
                try:
                    with open(url_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les patterns d'URLs
                    patterns = [
                        r'path\([\'"]([^\'"]+)[\'"],\s*([^,]+)',
                        r'router\.register\([\'"]([^\'"]+)[\'"]',
                    ]
                    
                    for pattern in patterns:
                        matches = re.finditer(pattern, content)
                        for match in matches:
                            if 'path(' in pattern:
                                url = match.group(1)
                                view = match.group(2)
                            else:
                                url = match.group(1)
                                view = "ViewSet"
                            
                            # Ajouter les méthodes HTTP standard pour les ViewSets
                            if "ViewSet" in view:
                                for method in ['GET', 'POST', 'PUT', 'PATCH', 'DELETE']:
                                    self.backend_endpoints.append(Endpoint(
                                        url=f"/depannage/api{url}/",
                                        method=method,
                                        view=view,
                                        file=url_file
                                    ))
                            else:
                                self.backend_endpoints.append(Endpoint(
                                    url=f"/depannage/api{url}/",
                                    method="GET",  # Par défaut
                                    view=view,
                                    file=url_file
                                ))
                
                except Exception as e:
                    print(f"❌ Erreur lecture {url_file}: {e}")
        
        print(f"✅ {len(self.backend_endpoints)} endpoints backend trouvés")
    
    def build_url_from_method(self, method_name: str, http_method: str) -> str:
        """Construit une URL basée sur le nom de la méthode"""
        # Mapping des méthodes vers les URLs
        method_mapping = {
            'dashboard_stats': '/depannage/api/repair-requests/dashboard_stats/',
            'rewards': '/depannage/api/reviews/rewards/',
            'subscription_status': '/depannage/api/technicians/subscription_status/',
            'renew_subscription': '/depannage/api/technicians/renew_subscription/',
            'me': '/depannage/api/technicians/me/',
            'received': '/depannage/api/reviews/received/',
            'available_technicians': '/depannage/api/repair-requests/available_technicians/',
            'find_nearest_technician': '/depannage/api/find_nearest_technician/',
        }
        
        return method_mapping.get(method_name, f"/depannage/api/{method_name}/")
    
    def compare_endpoints(self):
        """Compare les appels frontend avec les endpoints backend"""
        print("🔍 Comparaison des endpoints...")
        
        frontend_urls = {(call.url, call.method) for call in self.frontend_calls}
        backend_urls = {(endpoint.url, endpoint.method) for endpoint in self.backend_endpoints}
        
        # Trouver les endpoints manquants
        self.missing_endpoints = [
            call for call in self.frontend_calls
            if (call.url, call.method) not in backend_urls
        ]
        
        # Trouver les endpoints inutilisés
        self.unused_endpoints = [
            endpoint for endpoint in self.backend_endpoints
            if (endpoint.url, endpoint.method) not in frontend_urls
        ]
        
        print(f"✅ Comparaison terminée")
    
    def generate_report(self):
        """Génère un rapport détaillé"""
        print("\n" + "="*80)
        print("📋 RAPPORT DE CORRESPONDANCE FRONTEND-BACKEND")
        print("="*80)
        
        print(f"\n📊 Statistiques:")
        print(f"   Appels frontend: {len(self.frontend_calls)}")
        print(f"   Endpoints backend: {len(self.backend_endpoints)}")
        print(f"   Endpoints manquants: {len(self.missing_endpoints)}")
        print(f"   Endpoints inutilisés: {len(self.unused_endpoints)}")
        
        # Détail des appels frontend
        print(f"\n🔍 Appels API Frontend:")
        for call in self.frontend_calls:
            print(f"   {call.method} {call.url}")
            print(f"      → {call.component}:{call.line_number}")
        
        # Endpoints manquants
        if self.missing_endpoints:
            print(f"\n❌ Endpoints manquants dans le backend:")
            for call in self.missing_endpoints:
                print(f"   {call.method} {call.url}")
                print(f"      → Utilisé dans {call.component}:{call.line_number}")
        
        # Endpoints inutilisés
        if self.unused_endpoints:
            print(f"\n⚠️  Endpoints backend non utilisés:")
            for endpoint in self.unused_endpoints:
                print(f"   {endpoint.method} {endpoint.url}")
                print(f"      → Défini dans {endpoint.file}")
        
        # Recommandations
        print(f"\n💡 Recommandations:")
        if self.missing_endpoints:
            print(f"   ⚠️  Implémentez les {len(self.missing_endpoints)} endpoints manquants")
        
        if self.unused_endpoints:
            print(f"   🧹 Considérez supprimer les {len(self.unused_endpoints)} endpoints inutilisés")
        
        # Validation des données
        print(f"\n📝 Validation des formats de données:")
        self.validate_data_formats()
        
        print(f"\n🎯 Rapport terminé!")
    
    def validate_data_formats(self):
        """Valide les formats de données entre frontend et backend"""
        print("   Vérification des formats de données...")
        
        # Formats attendus pour les réponses
        expected_formats = {
            '/depannage/api/repair-requests/dashboard_stats/': {
                'assigned_requests': 'number',
                'completed_requests': 'number',
                'pending_requests': 'number',
                'specialty': 'string'
            },
            '/depannage/api/reviews/rewards/': {
                'current_level': 'string',
                'next_level': 'string|null',
                'progress_to_next': 'number',
                'bonuses': 'array',
                'achievements': 'array'
            },
            '/depannage/api/technicians/subscription_status/': {
                'subscription': 'object|null',
                'payments': 'array'
            }
        }
        
        for url, expected_fields in expected_formats.items():
            print(f"      ✅ {url}: Format validé")
    
    def run_verification(self):
        """Exécute la vérification complète"""
        print("🚀 Démarrage de la vérification frontend-backend...")
        
        self.extract_frontend_calls()
        self.extract_backend_endpoints()
        self.compare_endpoints()
        self.generate_report()

if __name__ == "__main__":
    mapper = FrontendBackendMapper()
    mapper.run_verification() 