#!/usr/bin/env python3
"""
Script d'optimisation des performances pour les endpoints des techniciens
Analyse et recommande des améliorations pour la pagination et les requêtes
"""

import re
import os
from typing import Dict, List, Set
from dataclasses import dataclass

@dataclass
class PerformanceIssue:
    endpoint: str
    issue_type: str
    severity: str
    description: str
    recommendation: str
    impact: str

@dataclass
class QueryAnalysis:
    endpoint: str
    query_count: int
    has_pagination: bool
    has_select_related: bool
    has_prefetch_related: bool
    n_plus_one_risk: bool

class PerformanceOptimizer:
    def __init__(self):
        self.performance_issues: List[PerformanceIssue] = []
        self.query_analyses: List[QueryAnalysis] = []
        self.endpoints_without_pagination: List[str] = []
        self.endpoints_with_n_plus_one: List[str] = []
        
    def analyze_pagination_usage(self):
        """Analyse l'utilisation de la pagination"""
        print("📄 Analyse de l'utilisation de la pagination...")
        
        view_files = [
            "Backend/depannage/views.py",
            "Backend/users/views.py",
        ]
        
        for view_file in view_files:
            if os.path.exists(view_file):
                try:
                    with open(view_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les patterns de pagination
                    pagination_patterns = [
                        r'pagination_class',
                        r'PageNumberPagination',
                        r'LimitOffsetPagination',
                        r'CursorPagination',
                        r'\.paginate',
                    ]
                    
                    # Chercher les endpoints qui retournent des listes
                    list_endpoints = [
                        'list',
                        'available_technicians',
                        'received',
                        'pending_reviews',
                        'my_payments',
                        'notifications',
                    ]
                    
                    for endpoint_name in list_endpoints:
                        # Chercher la méthode dans le fichier
                        method_pattern = rf'def {endpoint_name}\('
                        if re.search(method_pattern, content):
                            # Vérifier si la pagination est utilisée
                            has_pagination = any(re.search(pattern, content) for pattern in pagination_patterns)
                            
                            if not has_pagination:
                                endpoint_url = self.get_endpoint_url(endpoint_name)
                                self.endpoints_without_pagination.append(endpoint_url)
                                self.performance_issues.append(PerformanceIssue(
                                    endpoint=endpoint_url,
                                    issue_type="Pagination",
                                    severity="MEDIUM",
                                    description=f"Endpoint {endpoint_name} sans pagination",
                                    recommendation="Implémenter la pagination pour améliorer les performances",
                                    impact="Peut causer des temps de réponse lents avec de grandes listes"
                                ))
                
                except Exception as e:
                    print(f"❌ Erreur lecture {view_file}: {e}")
        
        print(f"✅ {len(self.endpoints_without_pagination)} endpoints sans pagination trouvés")
    
    def analyze_query_optimization(self):
        """Analyse l'optimisation des requêtes"""
        print("🔍 Analyse de l'optimisation des requêtes...")
        
        view_files = [
            "Backend/depannage/views.py",
            "Backend/users/views.py",
        ]
        
        for view_file in view_files:
            if os.path.exists(view_file):
                try:
                    with open(view_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les patterns d'optimisation
                    select_related_patterns = [
                        r'\.select_related\(',
                        r'\.prefetch_related\(',
                        r'\.only\(',
                        r'\.defer\(',
                    ]
                    
                    # Chercher les patterns de requêtes multiples
                    n_plus_one_patterns = [
                        r'for.*in.*\.objects\.all\(\)',
                        r'for.*in.*\.objects\.filter\(',
                        r'\.objects\.get\(.*\)\.',
                    ]
                    
                    # Analyser chaque endpoint
                    endpoints_to_analyze = [
                        'dashboard_stats',
                        'rewards',
                        'subscription_status',
                        'received',
                        'available_technicians',
                    ]
                    
                    for endpoint_name in endpoints_to_analyze:
                        method_pattern = rf'def {endpoint_name}\('
                        if re.search(method_pattern, content):
                            # Extraire le contexte de la méthode
                            method_start = content.find(f'def {endpoint_name}(')
                            if method_start != -1:
                                # Chercher la fin de la méthode (prochaine fonction ou fin de classe)
                                method_end = content.find('\n\n', method_start)
                                if method_end == -1:
                                    method_end = len(content)
                                
                                method_content = content[method_start:method_end]
                                
                                # Analyser les optimisations
                                has_select_related = any(re.search(pattern, method_content) for pattern in select_related_patterns)
                                has_n_plus_one = any(re.search(pattern, method_content) for pattern in n_plus_one_patterns)
                                
                                endpoint_url = self.get_endpoint_url(endpoint_name)
                                
                                self.query_analyses.append(QueryAnalysis(
                                    endpoint=endpoint_url,
                                    query_count=self.count_queries(method_content),
                                    has_pagination=False,  # À améliorer
                                    has_select_related=has_select_related,
                                    has_prefetch_related=has_select_related,
                                    n_plus_one_risk=has_n_plus_one
                                ))
                                
                                if has_n_plus_one:
                                    self.endpoints_with_n_plus_one.append(endpoint_url)
                                    self.performance_issues.append(PerformanceIssue(
                                        endpoint=endpoint_url,
                                        issue_type="N+1 Query",
                                        severity="HIGH",
                                        description=f"Risque de requêtes N+1 dans {endpoint_name}",
                                        recommendation="Utiliser select_related() ou prefetch_related()",
                                        impact="Peut causer des centaines de requêtes pour de grandes listes"
                                    ))
                
                except Exception as e:
                    print(f"❌ Erreur lecture {view_file}: {e}")
        
        print(f"✅ {len(self.endpoints_with_n_plus_one)} endpoints avec risque N+1 trouvés")
    
    def analyze_database_indexes(self):
        """Analyse l'utilisation des index de base de données"""
        print("🗄️ Analyse des index de base de données...")
        
        model_files = [
            "Backend/depannage/models.py",
            "Backend/users/models.py",
        ]
        
        for model_file in model_files:
            if os.path.exists(model_file):
                try:
                    with open(model_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les modèles fréquemment utilisés
                    frequent_models = [
                        'Technician',
                        'RepairRequest',
                        'Review',
                        'Payment',
                        'Notification',
                    ]
                    
                    for model_name in frequent_models:
                        # Chercher le modèle
                        model_pattern = rf'class {model_name}\('
                        if re.search(model_pattern, content):
                            # Vérifier les index
                            index_patterns = [
                                r'db_index=True',
                                r'indexes\s*=\s*\[',
                                r'unique_together',
                                r'index_together',
                            ]
                            
                            has_indexes = any(re.search(pattern, content) for pattern in index_patterns)
                            
                            if not has_indexes:
                                self.performance_issues.append(PerformanceIssue(
                                    endpoint=f"Model: {model_name}",
                                    issue_type="Database Index",
                                    severity="MEDIUM",
                                    description=f"Modèle {model_name} sans index optimisés",
                                    recommendation="Ajouter des index sur les champs fréquemment filtrés",
                                    impact="Requêtes de filtrage lentes"
                                ))
                
                except Exception as e:
                    print(f"❌ Erreur lecture {model_file}: {e}")
        
        print("✅ Analyse des index terminée")
    
    def analyze_caching_strategy(self):
        """Analyse la stratégie de mise en cache"""
        print("💾 Analyse de la stratégie de mise en cache...")
        
        view_files = [
            "Backend/depannage/views.py",
            "Backend/users/views.py",
        ]
        
        for view_file in view_files:
            if os.path.exists(view_file):
                try:
                    with open(view_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    # Chercher les patterns de cache
                    cache_patterns = [
                        r'@cache_page',
                        r'cache\.get\(',
                        r'cache\.set\(',
                        r'from django\.core\.cache',
                    ]
                    
                    has_caching = any(re.search(pattern, content) for pattern in cache_patterns)
                    
                    if not has_caching:
                        # Chercher les endpoints qui pourraient bénéficier du cache
                        cacheable_endpoints = [
                            'dashboard_stats',
                            'rewards',
                            'project_statistics',
                            'available_technicians',
                        ]
                        
                        for endpoint_name in cacheable_endpoints:
                            if re.search(rf'def {endpoint_name}\(', content):
                                endpoint_url = self.get_endpoint_url(endpoint_name)
                                self.performance_issues.append(PerformanceIssue(
                                    endpoint=endpoint_url,
                                    issue_type="Caching",
                                    severity="LOW",
                                    description=f"Endpoint {endpoint_name} sans mise en cache",
                                    recommendation="Implémenter la mise en cache pour les données statiques",
                                    impact="Requêtes répétées inutiles"
                                ))
                
                except Exception as e:
                    print(f"❌ Erreur lecture {view_file}: {e}")
        
        print("✅ Analyse de la mise en cache terminée")
    
    def count_queries(self, method_content: str) -> int:
        """Compte le nombre de requêtes dans une méthode"""
        query_patterns = [
            r'\.objects\.',
            r'\.filter\(',
            r'\.get\(',
            r'\.all\(',
            r'\.aggregate\(',
        ]
        
        count = 0
        for pattern in query_patterns:
            count += len(re.findall(pattern, method_content))
        
        return count
    
    def get_endpoint_url(self, method_name: str) -> str:
        """Retourne l'URL de l'endpoint basé sur le nom de la méthode"""
        endpoint_mapping = {
            'dashboard_stats': '/depannage/api/repair-requests/dashboard_stats/',
            'rewards': '/depannage/api/reviews/rewards/',
            'subscription_status': '/depannage/api/technicians/subscription_status/',
            'received': '/depannage/api/reviews/received/',
            'available_technicians': '/depannage/api/repair-requests/available_technicians/',
            'project_statistics': '/depannage/api/repair-requests/project_statistics/',
            'my_payments': '/depannage/api/payments/my_payments/',
            'notifications': '/depannage/api/notifications/',
        }
        
        return endpoint_mapping.get(method_name, f"/depannage/api/{method_name}/")
    
    def generate_optimization_report(self):
        """Génère un rapport d'optimisation détaillé"""
        print("\n" + "="*80)
        print("⚡ RAPPORT D'OPTIMISATION DES PERFORMANCES")
        print("="*80)
        
        # Statistiques
        total_issues = len(self.performance_issues)
        high_issues = len([i for i in self.performance_issues if i.severity == "HIGH"])
        medium_issues = len([i for i in self.performance_issues if i.severity == "MEDIUM"])
        low_issues = len([i for i in self.performance_issues if i.severity == "LOW"])
        
        print(f"\n📊 Statistiques de performance:")
        print(f"   Total des problèmes: {total_issues}")
        print(f"   Élevé: {high_issues}")
        print(f"   Moyen: {medium_issues}")
        print(f"   Faible: {low_issues}")
        
        # Analyse des requêtes
        print(f"\n🔍 Analyse des requêtes:")
        for analysis in self.query_analyses:
            print(f"   {analysis.endpoint}:")
            print(f"      Requêtes: {analysis.query_count}")
            print(f"      N+1 risque: {'Oui' if analysis.n_plus_one_risk else 'Non'}")
            print(f"      Optimisations: {'Oui' if analysis.has_select_related else 'Non'}")
        
        # Problèmes par type
        print(f"\n🔍 Problèmes par type:")
        issue_types = {}
        for issue in self.performance_issues:
            issue_types[issue.issue_type] = issue_types.get(issue.issue_type, 0) + 1
        
        for issue_type, count in issue_types.items():
            print(f"   {issue_type}: {count}")
        
        # Problèmes élevés
        if high_issues > 0:
            print(f"\n🚨 Problèmes ÉLEVÉS:")
            for issue in self.performance_issues:
                if issue.severity == "HIGH":
                    print(f"   ❌ {issue.endpoint}")
                    print(f"      {issue.description}")
                    print(f"      Recommandation: {issue.recommendation}")
                    print(f"      Impact: {issue.impact}")
                    print()
        
        # Problèmes moyens
        if medium_issues > 0:
            print(f"\n⚠️  Problèmes MOYENS:")
            for issue in self.performance_issues:
                if issue.severity == "MEDIUM":
                    print(f"   ⚠️  {issue.endpoint}")
                    print(f"      {issue.description}")
                    print(f"      Recommandation: {issue.recommendation}")
                    print(f"      Impact: {issue.impact}")
                    print()
        
        # Recommandations d'optimisation
        print(f"\n💡 Recommandations d'optimisation:")
        if high_issues > 0:
            print(f"   🚨 Corrigez immédiatement les {high_issues} problèmes élevés")
        
        if medium_issues > 0:
            print(f"   ⚠️  Traitez en priorité les {medium_issues} problèmes moyens")
        
        if low_issues > 0:
            print(f"   📝 Planifiez l'amélioration des {low_issues} problèmes faibles")
        
        # Bonnes pratiques
        print(f"\n✅ Bonnes pratiques de performance:")
        print(f"   • Utilisez la pagination pour toutes les listes")
        print(f"   • Implémentez select_related() et prefetch_related()")
        print(f"   • Ajoutez des index sur les champs fréquemment filtrés")
        print(f"   • Mettez en cache les données statiques")
        print(f"   • Utilisez .only() et .defer() pour limiter les champs")
        print(f"   • Implémentez la compression gzip")
        print(f"   • Utilisez des requêtes optimisées avec des annotations")
        
        # Exemples d'optimisation
        print(f"\n📝 Exemples d'optimisation:")
        print(f"   # Avant (N+1 queries)")
        print(f"   technicians = Technician.objects.all()")
        print(f"   for tech in technicians:")
        print(f"       print(tech.user.email)  # Requête supplémentaire")
        print(f"   ")
        print(f"   # Après (optimisé)")
        print(f"   technicians = Technician.objects.select_related('user').all()")
        print(f"   for tech in technicians:")
        print(f"       print(tech.user.email)  # Pas de requête supplémentaire)")
        
        print(f"\n🎯 Rapport d'optimisation terminé!")
    
    def run_optimization_analysis(self):
        """Exécute l'analyse d'optimisation complète"""
        print("🚀 Démarrage de l'analyse d'optimisation...")
        
        self.analyze_pagination_usage()
        self.analyze_query_optimization()
        self.analyze_database_indexes()
        self.analyze_caching_strategy()
        self.generate_optimization_report()

if __name__ == "__main__":
    optimizer = PerformanceOptimizer()
    optimizer.run_optimization_analysis() 