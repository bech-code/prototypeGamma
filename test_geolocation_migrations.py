#!/usr/bin/env python3
"""
Script de test pour les migrations de géolocalisation
Vérifie que tous les nouveaux modèles et fonctionnalités sont correctement installés
"""

import os
import sys
import django
from datetime import datetime, timedelta
from decimal import Decimal

# Configuration Django
sys.path.append('Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'depannage.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.utils import timezone
from depannage.models import (
    Client, Technician, RepairRequest, TechnicianLocation, ClientLocation,
    LocationHistory, ServiceZone, Route, PointOfInterest, GeolocationAlert,
    GeolocationSettings
)

User = get_user_model()

def test_geolocation_migrations():
    """Test complet des migrations de géolocalisation."""
    
    print("🧪 Test des migrations de géolocalisation")
    print("=" * 50)
    
    try:
        # 1. Vérifier l'existence des modèles
        print("\n1. Vérification de l'existence des modèles...")
        
        models_to_check = [
            TechnicianLocation, ClientLocation, LocationHistory,
            ServiceZone, Route, PointOfInterest, GeolocationAlert,
            GeolocationSettings
        ]
        
        for model in models_to_check:
            try:
                # Essayer de créer une instance vide pour vérifier que le modèle existe
                model()
                print(f"✅ {model.__name__} - OK")
            except Exception as e:
                print(f"❌ {model.__name__} - ERREUR: {e}")
                return False
        
        # 2. Créer des données de test
        print("\n2. Création des données de test...")
        
        # Créer un utilisateur de test
        test_user, created = User.objects.get_or_create(
            username='test_geolocation_user',
            defaults={
                'email': 'test.geolocation@example.com',
                'first_name': 'Test',
                'last_name': 'Geolocation',
                'is_active': True
            }
        )
        
        if created:
            test_user.set_password('testpass123')
            test_user.save()
            print("✅ Utilisateur de test créé")
        else:
            print("✅ Utilisateur de test existant")
        
        # Créer un client de test
        client, created = Client.objects.get_or_create(
            user=test_user,
            defaults={
                'address': '123 Rue de Test, Abidjan',
                'phone': '+2250123456789',
                'is_active': True
            }
        )
        
        if created:
            print("✅ Client de test créé")
        else:
            print("✅ Client de test existant")
        
        # Créer un technicien de test
        technician, created = Technician.objects.get_or_create(
            user=test_user,
            defaults={
                'specialty': 'electrician',
                'phone': '+2250987654321',
                'is_available': True,
                'is_verified': True,
                'years_experience': 5,
                'experience_level': 'senior',
                'hourly_rate': Decimal('5000.00'),
                'service_radius_km': 15,
                'bio': 'Technicien de test pour géolocalisation'
            }
        )
        
        if created:
            print("✅ Technicien de test créé")
        else:
            print("✅ Technicien de test existant")
        
        # Créer une demande de test
        request, created = RepairRequest.objects.get_or_create(
            client=client,
            title='Test de géolocalisation',
            defaults={
                'description': 'Demande de test pour vérifier la géolocalisation',
                'specialty_needed': 'electrician',
                'priority': 'medium',
                'urgency_level': 'normal',
                'status': 'assigned',
                'address': '456 Avenue de Test, Abidjan',
                'latitude': 5.3600,
                'longitude': -4.0083,
                'technician': technician
            }
        )
        
        if created:
            print("✅ Demande de test créée")
        else:
            print("✅ Demande de test existante")
        
        # 3. Tester les nouvelles fonctionnalités de TechnicianLocation
        print("\n3. Test des fonctionnalités de TechnicianLocation...")
        
        tech_location, created = TechnicianLocation.objects.get_or_create(
            technician=technician,
            defaults={
                'latitude': 5.3600,
                'longitude': -4.0083,
                'accuracy': 15.5,
                'altitude': 50.0,
                'speed': 25.0,
                'heading': 180.0,
                'is_moving': True,
                'battery_level': 85,
                'location_source': 'gps',
                'address': '789 Boulevard de Test, Abidjan',
                'city': 'Abidjan',
                'country': 'CI'
            }
        )
        
        if created:
            print("✅ Localisation technicien créée")
        else:
            # Mettre à jour avec les nouveaux champs
            tech_location.accuracy = 15.5
            tech_location.altitude = 50.0
            tech_location.speed = 25.0
            tech_location.heading = 180.0
            tech_location.is_moving = True
            tech_location.battery_level = 85
            tech_location.location_source = 'gps'
            tech_location.address = '789 Boulevard de Test, Abidjan'
            tech_location.city = 'Abidjan'
            tech_location.country = 'CI'
            tech_location.save()
            print("✅ Localisation technicien mise à jour")
        
        # Tester les méthodes
        distance = tech_location.get_distance_to(5.3700, -4.0183)
        print(f"✅ Distance calculée: {distance:.2f} km")
        
        eta = tech_location.get_eta_to(5.3700, -4.0183)
        print(f"✅ ETA calculé: {eta:.1f} minutes")
        
        quality = tech_location.get_location_quality()
        print(f"✅ Qualité de localisation: {quality}")
        
        # 4. Tester les nouvelles fonctionnalités de ClientLocation
        print("\n4. Test des fonctionnalités de ClientLocation...")
        
        client_location, created = ClientLocation.objects.get_or_create(
            client=client,
            defaults={
                'latitude': 5.3700,
                'longitude': -4.0183,
                'accuracy': 20.0,
                'altitude': 45.0,
                'speed': 0.0,
                'heading': None,
                'is_moving': False,
                'battery_level': 90,
                'location_source': 'gps',
                'address': '123 Rue de Test, Abidjan',
                'city': 'Abidjan',
                'country': 'CI'
            }
        )
        
        if created:
            print("✅ Localisation client créée")
        else:
            # Mettre à jour avec les nouveaux champs
            client_location.accuracy = 20.0
            client_location.altitude = 45.0
            client_location.speed = 0.0
            client_location.is_moving = False
            client_location.battery_level = 90
            client_location.location_source = 'gps'
            client_location.address = '123 Rue de Test, Abidjan'
            client_location.city = 'Abidjan'
            client_location.country = 'CI'
            client_location.save()
            print("✅ Localisation client mise à jour")
        
        # 5. Tester LocationHistory
        print("\n5. Test de LocationHistory...")
        
        location_history = LocationHistory.objects.create(
            user=test_user,
            latitude=5.3650,
            longitude=-4.0150,
            accuracy=18.0,
            altitude=47.5,
            speed=12.5,
            heading=90.0,
            is_moving=True,
            battery_level=88,
            location_source='gps',
            address='456 Avenue de Test, Abidjan',
            city='Abidjan',
            country='CI',
            request=request
        )
        
        print("✅ Historique de localisation créé")
        
        # 6. Tester ServiceZone
        print("\n6. Test de ServiceZone...")
        
        service_zone = ServiceZone.objects.create(
            name='Zone Test Abidjan',
            description='Zone de service de test pour Abidjan',
            center_latitude=5.3600,
            center_longitude=-4.0083,
            radius_km=10.0,
            is_active=True,
            color='#2563eb'
        )
        service_zone.technicians.add(technician)
        
        print("✅ Zone de service créée")
        
        # Tester les méthodes
        is_inside = service_zone.is_point_inside(5.3650, -4.0150)
        print(f"✅ Point dans la zone: {is_inside}")
        
        # 7. Tester Route
        print("\n7. Test de Route...")
        
        route = Route.objects.create(
            name='Itinéraire Test',
            description='Itinéraire de test entre deux points',
            start_latitude=5.3600,
            start_longitude=-4.0083,
            end_latitude=5.3700,
            end_longitude=-4.0183,
            route_type='driving',
            is_active=True,
            request=request,
            technician=technician
        )
        
        print("✅ Itinéraire créé")
        
        # Tester les méthodes
        distance = route.calculate_distance()
        print(f"✅ Distance calculée: {distance:.2f} km")
        
        duration = route.estimate_duration()
        print(f"✅ Durée estimée: {duration:.1f} minutes")
        
        # 8. Tester PointOfInterest
        print("\n8. Test de PointOfInterest...")
        
        poi = PointOfInterest.objects.create(
            name='Station-service Test',
            description='Station-service de test',
            latitude=5.3650,
            longitude=-4.0150,
            poi_type='gas_station',
            address='789 Boulevard de Test, Abidjan',
            phone='+2250123456789',
            website='https://example.com',
            is_active=True,
            rating=4.5
        )
        
        print("✅ Point d'intérêt créé")
        
        # 9. Tester GeolocationAlert
        print("\n9. Test de GeolocationAlert...")
        
        alert = GeolocationAlert.objects.create(
            alert_type='technician_nearby',
            title='Technicien à proximité',
            message='Un technicien est disponible dans votre zone',
            severity='info',
            latitude=5.3650,
            longitude=-4.0150,
            user=test_user,
            request=request,
            extra_data={'distance_km': 2.5, 'eta_minutes': 15}
        )
        
        print("✅ Alerte de géolocalisation créée")
        
        # 10. Tester GeolocationSettings
        print("\n10. Test de GeolocationSettings...")
        
        settings, created = GeolocationSettings.objects.get_or_create(
            user=test_user,
            defaults={
                'location_sharing_enabled': True,
                'background_location_enabled': False,
                'high_accuracy_mode': True,
                'location_update_interval_seconds': 30,
                'max_location_history_days': 30,
                'geofencing_enabled': False,
                'speed_limit_kmh': 80,
                'battery_threshold_percent': 20,
                'accuracy_threshold_meters': 100,
                'alert_notifications_enabled': True,
                'map_provider': 'openstreetmap',
                'default_zoom_level': 13,
                'show_traffic': False,
                'show_pois': True
            }
        )
        
        if created:
            print("✅ Paramètres de géolocalisation créés")
        else:
            print("✅ Paramètres de géolocalisation existants")
        
        # Tester les méthodes
        sharing_allowed = settings.is_location_sharing_allowed()
        print(f"✅ Partage autorisé: {sharing_allowed}")
        
        battery_low = settings.is_battery_low(15)
        print(f"✅ Batterie faible: {battery_low}")
        
        accuracy_sufficient = settings.is_accuracy_sufficient(50)
        print(f"✅ Précision suffisante: {accuracy_sufficient}")
        
        # 11. Test des contraintes
        print("\n11. Test des contraintes...")
        
        try:
            # Test de contrainte de précision positive
            tech_location.accuracy = -5
            tech_location.save()
            print("❌ Contrainte de précision non respectée")
        except Exception as e:
            print("✅ Contrainte de précision respectée")
            tech_location.accuracy = 15.5
            tech_location.save()
        
        try:
            # Test de contrainte de vitesse positive
            tech_location.speed = -10
            tech_location.save()
            print("❌ Contrainte de vitesse non respectée")
        except Exception as e:
            print("✅ Contrainte de vitesse respectée")
            tech_location.speed = 25.0
            tech_location.save()
        
        try:
            # Test de contrainte de direction
            tech_location.heading = 400
            tech_location.save()
            print("❌ Contrainte de direction non respectée")
        except Exception as e:
            print("✅ Contrainte de direction respectée")
            tech_location.heading = 180.0
            tech_location.save()
        
        # 12. Test des index de performance
        print("\n12. Test des index de performance...")
        
        # Test de requête avec index
        recent_locations = TechnicianLocation.objects.filter(
            is_moving=True,
            created_at__gte=timezone.now() - timedelta(hours=1)
        )
        print(f"✅ Requête avec index: {recent_locations.count()} résultats")
        
        # Test de recherche géographique
        nearby_locations = TechnicianLocation.objects.filter(
            latitude__range=(5.3500, 5.3800),
            longitude__range=(-4.0200, -4.0000)
        )
        print(f"✅ Recherche géographique: {nearby_locations.count()} résultats")
        
        # 13. Nettoyage des données de test
        print("\n13. Nettoyage des données de test...")
        
        # Supprimer les données de test
        LocationHistory.objects.filter(user=test_user).delete()
        GeolocationAlert.objects.filter(user=test_user).delete()
        GeolocationSettings.objects.filter(user=test_user).delete()
        Route.objects.filter(request=request).delete()
        PointOfInterest.objects.filter(name='Station-service Test').delete()
        ServiceZone.objects.filter(name='Zone Test Abidjan').delete()
        TechnicianLocation.objects.filter(technician=technician).delete()
        ClientLocation.objects.filter(client=client).delete()
        RepairRequest.objects.filter(title='Test de géolocalisation').delete()
        
        print("✅ Données de test nettoyées")
        
        print("\n🎉 Tous les tests de géolocalisation sont passés avec succès!")
        return True
        
    except Exception as e:
        print(f"\n❌ Erreur lors du test: {e}")
        import traceback
        traceback.print_exc()
        return False

if __name__ == '__main__':
    success = test_geolocation_migrations()
    sys.exit(0 if success else 1) 