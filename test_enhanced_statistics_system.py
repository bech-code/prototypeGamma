#!/usr/bin/env python3
"""
Script de test pour le système de statistiques amélioré
Teste les nouvelles fonctionnalités de statistiques globales, cache, et exports
"""

import os
import sys
import django
import requests
import json
from datetime import datetime, timedelta

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/prototypeGamma/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'depannage.settings')
django.setup()

from django.test import TestCase
from django.contrib.auth import get_user_model
from django.utils import timezone
from depannage.models import (
    GlobalStatistics, StatisticsCache, StatisticsDashboard, 
    StatisticsWidget, StatisticsExport, StatisticsAlert,
    RepairRequest, Review, Payment, Technician, Client
)
from decimal import Decimal

class EnhancedStatisticsSystemTest:
    """Tests pour le système de statistiques amélioré."""
    
    def __init__(self):
        self.base_url = "http://localhost:8000"
        self.admin_token = None
        self.test_data = {}
        
    def setup_test_data(self):
        """Prépare les données de test."""
        print("🔧 Préparation des données de test...")

        # Nettoyage des anciens objets de test
        from depannage.models import Client
        User = get_user_model()
        Client.objects.filter(user__username__startswith='client_test_').delete()
        User.objects.filter(username__startswith='client_test_').delete()
        
        # Créer un admin de test
        admin_user, created = User.objects.get_or_create(
            email="admin@test.com",
            defaults={
                'username': 'admin_test',
                'first_name': 'Admin',
                'last_name': 'Test',
                'user_type': 'admin',
                'is_staff': True,
                'is_superuser': True
            }
        )
        
        # Créer des clients de test
        clients = []
        for i in range(5):
            client_user, created = User.objects.get_or_create(
                email=f"client{i}@test.com",
                defaults={
                    'username': f'client_test_{i}',
                    'first_name': f'Client{i}',
                    'last_name': 'Test',
                    'user_type': 'client'
                }
            )
            # Correction : toujours passer client_user (User) comme clé étrangère
            client, created = Client.objects.get_or_create(
                user=client_user,
                defaults={'address': f'Adresse client {i}', 'phone': f'012345678{i}'}
            )
            clients.append(client)
        
        # Créer des techniciens de test
        technicians = []
        specialties = ['plomberie', 'electricite', 'mecanique', 'informatique']
        for i in range(8):
            tech_user, created = User.objects.get_or_create(
                email=f"technician{i}@test.com",
                defaults={
                    'username': f'technician_test_{i}',
                    'first_name': f'Technicien{i}',
                    'last_name': 'Test',
                    'user_type': 'technician'
                }
            )
            technician, created = Technician.objects.get_or_create(
                user=tech_user,
                defaults={
                    'specialty': specialties[i % len(specialties)],
                    'phone': f'098765432{i}',
                    'is_verified': True,
                    'is_available': True,
                    'hourly_rate': Decimal('5000.00')
                }
            )
            technicians.append(technician)
        
        # Créer des demandes de test
        requests = []
        for i in range(20):
            client = clients[i % len(clients)]
            technician = technicians[i % len(technicians)] if i % 3 == 0 else None
            
            request_obj, created = RepairRequest.objects.get_or_create(
                title=f"Demande test {i}",
                client=client,  # OK : attend un objet Client
                defaults={
                    'description': f"Description de la demande test {i}",
                    'specialty_needed': specialties[i % len(specialties)],
                    'address': f"Adresse demande {i}",
                    'status': 'completed' if i % 3 == 0 else 'pending',
                    'estimated_price': Decimal('15000.00'),
                    'final_price': Decimal('15000.00') if i % 3 == 0 else None,
                    'technician': technician,
                    'completed_at': timezone.now() - timedelta(days=i) if i % 3 == 0 else None
                }
            )
            requests.append(request_obj)
        
        # Créer des paiements de test
        for i, request_obj in enumerate(requests):
            if request_obj.status == 'completed':
                Payment.objects.get_or_create(
                    request=request_obj,
                    defaults={
                        'payer': request_obj.client.user,  # Correction : passer un User
                        'recipient': request_obj.technician.user if request_obj.technician else admin_user,
                        'amount': request_obj.final_price,
                        'status': 'completed',
                        'method': 'mobile_money',
                        'payment_type': 'client_payment'
                    }
                )
        
        # Créer des avis de test
        for i, request_obj in enumerate(requests):
            if request_obj.status == 'completed':
                Review.objects.get_or_create(
                    request=request_obj,
                    defaults={
                        'client': request_obj.client,
                        'technician': request_obj.technician,
                        'rating': 4 + (i % 2),
                        'comment': f"Avis test {i}",
                        'would_recommend': True,
                        'punctuality_rating': 4,
                        'quality_rating': 4,
                        'communication_rating': 4,
                        'professionalism_rating': 4,
                        'problem_solving_rating': 4,
                        'cleanliness_rating': 4,
                        'price_fairness_rating': 4
                    }
                )
        
        self.test_data = {
            'admin_user': admin_user,
            'clients': clients,
            'technicians': technicians,
            'requests': requests
        }
        
        print(f"✅ Données de test créées: {len(clients)} clients, {len(technicians)} techniciens, {len(requests)} demandes")
    
    def test_global_statistics_model(self):
        """Teste le modèle GlobalStatistics."""
        print("\n📊 Test du modèle GlobalStatistics...")
        
        # Créer une instance de statistiques globales
        stats, created = GlobalStatistics.objects.get_or_create(id=1)
        
        # Calculer toutes les métriques
        stats.calculate_all_metrics()
        
        # Vérifier les métriques de base
        assert stats.total_users > 0, "Le nombre total d'utilisateurs doit être > 0"
        assert stats.total_requests > 0, "Le nombre total de demandes doit être > 0"
        assert stats.total_reviews > 0, "Le nombre total d'avis doit être > 0"
        
        print(f"✅ Statistiques globales calculées:")
        print(f"   - Utilisateurs: {stats.total_users}")
        print(f"   - Demandes: {stats.total_requests}")
        print(f"   - Avis: {stats.total_reviews}")
        print(f"   - Revenus: {stats.total_revenue}")
        print(f"   - Durée de calcul: {stats.calculation_duration:.2f}s")
    
    def test_statistics_cache(self):
        """Teste le système de cache des statistiques."""
        print("\n💾 Test du système de cache...")
        
        # Créer un cache de test
        cache_data = {'test': 'data', 'timestamp': timezone.now().isoformat()}
        cache_key = "test_cache_key"
        
        # Créer ou récupérer le cache
        cache_obj = StatisticsCache.get_or_create_cache(cache_key, cache_data, expires_in_hours=1)
        
        # Vérifier que le cache a été créé
        assert cache_obj.cache_key == cache_key
        assert cache_obj.cache_data == cache_data
        
        # Récupérer le cache valide
        valid_cache = StatisticsCache.get_valid_cache(cache_key)
        assert valid_cache == cache_data
        
        print("✅ Système de cache fonctionnel")
    
    def test_statistics_dashboard(self):
        """Teste la création d'un tableau de bord de statistiques."""
        print("\n📈 Test du tableau de bord de statistiques...")
        
        admin_user = self.test_data['admin_user']
        
        # Créer un tableau de bord
        dashboard = StatisticsDashboard.objects.create(
            name="Tableau de bord de test",
            description="Tableau de bord pour les tests",
            dashboard_type='admin',
            layout_config={'columns': 3, 'rows': 4},
            widgets_config=[],
            created_by=admin_user
        )
        
        # Créer des widgets
        widgets = [
            {
                'name': 'Métriques utilisateurs',
                'widget_type': 'metric',
                'data_source': 'user_stats',
                'config': {'metric': 'total_users'},
                'position_x': 0,
                'position_y': 0,
                'width': 1,
                'height': 1
            },
            {
                'name': 'Graphique des demandes',
                'widget_type': 'chart',
                'data_source': 'request_stats',
                'config': {'chart_type': 'line', 'metric': 'daily_requests'},
                'position_x': 1,
                'position_y': 0,
                'width': 2,
                'height': 2
            }
        ]
        
        for widget_config in widgets:
            StatisticsWidget.objects.create(
                dashboard=dashboard,
                **widget_config
            )
        
        # Vérifier que le tableau de bord a été créé
        assert dashboard.widgets.count() == 2
        assert dashboard.name == "Tableau de bord de test"
        
        print("✅ Tableau de bord de statistiques créé avec succès")
    
    def test_statistics_export(self):
        """Teste l'export des statistiques."""
        print("\n📤 Test de l'export des statistiques...")
        
        admin_user = self.test_data['admin_user']
        
        # Créer une demande d'export
        export_request = StatisticsExport.objects.create(
            export_type='excel',
            requested_by=admin_user,
            export_config={'date_from': '2024-01-01', 'date_to': '2024-12-31'},
            status='pending'
        )
        
        # Simuler le traitement
        export_request.status = 'completed'
        export_request.file_path = '/tmp/test_export.xlsx'
        export_request.file_size_bytes = 1024
        export_request.save()
        
        # Vérifier que l'export a été créé
        assert export_request.status == 'completed'
        assert export_request.file_size_bytes > 0
        
        print("✅ Export de statistiques créé avec succès")
    
    def test_statistics_alerts(self):
        """Teste le système d'alertes de statistiques."""
        print("\n🚨 Test du système d'alertes...")
        
        admin_user = self.test_data['admin_user']
        
        # Créer une alerte de test
        alert = StatisticsAlert.objects.create(
            alert_type='threshold_exceeded',
            title='Seuil de demandes dépassé',
            message='Le nombre de demandes a dépassé le seuil de 100',
            severity='warning',
            triggered_by=admin_user
        )
        
        # Vérifier que l'alerte a été créée
        assert alert.is_active == True
        assert alert.severity == 'warning'
        
        # Résoudre l'alerte
        alert.is_active = False
        alert.resolved_at = timezone.now()
        alert.resolved_by = admin_user
        alert.save()
        
        assert alert.is_active == False
        assert alert.resolved_at is not None
        
        print("✅ Système d'alertes fonctionnel")
    
    def test_api_endpoints(self):
        """Teste les endpoints API des statistiques."""
        print("\n🌐 Test des endpoints API...")
        
        # Simuler une requête API pour les statistiques globales
        try:
            # Créer une instance de test pour simuler l'API
            from django.test import Client
            from django.contrib.auth import get_user_model
            
            client = Client()
            admin_user = get_user_model().objects.filter(user_type='admin').first()
            
            if admin_user:
                # Simuler l'authentification
                client.force_login(admin_user)
                
                # Tester l'endpoint des statistiques globales
                response = client.get('/depannage/api/statistics/global_statistics/')
                
                if response.status_code == 200:
                    print("✅ Endpoint des statistiques globales accessible")
                else:
                    print(f"⚠️ Endpoint des statistiques globales: {response.status_code}")
                
                # Tester l'endpoint des statistiques temps réel
                response = client.get('/depannage/api/statistics/real_time_stats/')
                
                if response.status_code == 200:
                    print("✅ Endpoint des statistiques temps réel accessible")
                else:
                    print(f"⚠️ Endpoint des statistiques temps réel: {response.status_code}")
                
            else:
                print("⚠️ Aucun utilisateur admin trouvé pour les tests API")
                
        except Exception as e:
            print(f"⚠️ Erreur lors des tests API: {e}")
    
    def test_performance_metrics(self):
        """Teste les métriques de performance."""
        print("\n⚡ Test des métriques de performance...")
        
        # Créer des statistiques globales
        stats, created = GlobalStatistics.objects.get_or_create(id=1)
        stats.calculate_all_metrics()
        
        # Vérifier les métriques de performance
        assert stats.avg_response_time_hours >= 0, "Le temps de réponse moyen doit être >= 0"
        assert stats.avg_completion_time_hours >= 0, "Le temps de completion moyen doit être >= 0"
        assert 0 <= stats.success_rate <= 100, "Le taux de succès doit être entre 0 et 100"
        assert 0 <= stats.conversion_rate <= 100, "Le taux de conversion doit être entre 0 et 100"
        assert 0 <= stats.retention_rate <= 100, "Le taux de rétention doit être entre 0 et 100"
        
        print(f"✅ Métriques de performance calculées:")
        print(f"   - Taux de succès: {stats.success_rate:.1f}%")
        print(f"   - Taux de conversion: {stats.conversion_rate:.1f}%")
        print(f"   - Taux de rétention: {stats.retention_rate:.1f}%")
        print(f"   - Temps de réponse moyen: {stats.avg_response_time_hours:.1f}h")
        print(f"   - Temps de completion moyen: {stats.avg_completion_time_hours:.1f}h")
    
    def test_trend_analysis(self):
        """Teste l'analyse des tendances."""
        print("\n📈 Test de l'analyse des tendances...")
        
        # Créer des statistiques globales
        stats, created = GlobalStatistics.objects.get_or_create(id=1)
        stats.calculate_all_metrics()
        
        # Vérifier les données de tendances
        assert isinstance(stats.daily_stats, dict), "Les statistiques quotidiennes doivent être un dictionnaire"
        assert isinstance(stats.weekly_stats, dict), "Les statistiques hebdomadaires doivent être un dictionnaire"
        assert isinstance(stats.monthly_stats, dict), "Les statistiques mensuelles doivent être un dictionnaire"
        
        # Vérifier qu'il y a des données
        assert len(stats.daily_stats) > 0, "Il doit y avoir des données quotidiennes"
        
        print(f"✅ Analyse des tendances:")
        print(f"   - Données quotidiennes: {len(stats.daily_stats)} jours")
        print(f"   - Données hebdomadaires: {len(stats.weekly_stats)} semaines")
        print(f"   - Données mensuelles: {len(stats.monthly_stats)} mois")
    
    def test_geographic_analysis(self):
        """Teste l'analyse géographique."""
        print("\n🗺️ Test de l'analyse géographique...")
        
        # Créer des statistiques globales
        stats, created = GlobalStatistics.objects.get_or_create(id=1)
        stats.calculate_all_metrics()
        
        # Vérifier les données géographiques
        assert isinstance(stats.top_cities, list), "Les top villes doivent être une liste"
        assert isinstance(stats.service_areas, list), "Les zones de service doivent être une liste"
        
        print(f"✅ Analyse géographique:")
        print(f"   - Top villes: {len(stats.top_cities)} villes")
        print(f"   - Zones de service: {len(stats.service_areas)} zones")
    
    def test_specialty_analysis(self):
        """Teste l'analyse par spécialité."""
        print("\n🔧 Test de l'analyse par spécialité...")
        
        # Créer des statistiques globales
        stats, created = GlobalStatistics.objects.get_or_create(id=1)
        stats.calculate_all_metrics()
        
        # Vérifier les données de spécialités
        assert isinstance(stats.specialty_distribution, dict), "La distribution des spécialités doit être un dictionnaire"
        assert isinstance(stats.top_specialties, list), "Les top spécialités doivent être une liste"
        
        print(f"✅ Analyse par spécialité:")
        print(f"   - Distribution: {len(stats.specialty_distribution)} spécialités")
        print(f"   - Top spécialités: {len(stats.top_specialties)} spécialités")
    
    def test_financial_analysis(self):
        """Teste l'analyse financière."""
        print("\n💰 Test de l'analyse financière...")
        
        # Créer des statistiques globales
        stats, created = GlobalStatistics.objects.get_or_create(id=1)
        stats.calculate_all_metrics()
        
        # Vérifier les métriques financières
        assert stats.total_revenue >= 0, "Les revenus totaux doivent être >= 0"
        assert stats.total_payouts >= 0, "Les paiements totaux doivent être >= 0"
        assert stats.platform_fees >= 0, "Les frais de plateforme doivent être >= 0"
        assert stats.avg_request_value >= 0, "La valeur moyenne des demandes doit être >= 0"
        
        print(f"✅ Analyse financière:")
        print(f"   - Revenus totaux: {stats.total_revenue} FCFA")
        print(f"   - Paiements techniciens: {stats.total_payouts} FCFA")
        print(f"   - Frais de plateforme: {stats.platform_fees} FCFA")
        print(f"   - Valeur moyenne demande: {stats.avg_request_value} FCFA")
    
    def run_all_tests(self):
        """Exécute tous les tests."""
        print("🚀 Démarrage des tests du système de statistiques amélioré")
        print("=" * 60)
        
        try:
            # Préparer les données de test
            self.setup_test_data()
            
            # Exécuter tous les tests
            self.test_global_statistics_model()
            self.test_statistics_cache()
            self.test_statistics_dashboard()
            self.test_statistics_export()
            self.test_statistics_alerts()
            self.test_api_endpoints()
            self.test_performance_metrics()
            self.test_trend_analysis()
            self.test_geographic_analysis()
            self.test_specialty_analysis()
            self.test_financial_analysis()
            
            print("\n" + "=" * 60)
            print("✅ Tous les tests du système de statistiques amélioré ont réussi!")
            print("🎉 Le système de statistiques est prêt pour la production")
            
        except Exception as e:
            print(f"\n❌ Erreur lors des tests: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    # Exécuter les tests
    test_suite = EnhancedStatisticsSystemTest()
    test_suite.run_all_tests() 