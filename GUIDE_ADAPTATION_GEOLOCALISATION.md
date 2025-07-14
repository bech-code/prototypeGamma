# Guide d'Adaptation de la Base de Données pour la Géolocalisation

## 📋 Vue d'ensemble

Ce guide détaille l'adaptation de la base de données pour supporter un système de géolocalisation avancé avec des fonctionnalités en temps réel, des zones de service, des itinéraires, des points d'intérêt et des alertes géolocalisées.

## 🎯 Objectifs

### Fonctionnalités Principales
- **Localisation en temps réel** des techniciens et clients
- **Historique de localisation** avec métadonnées détaillées
- **Zones de service** pour organiser les interventions
- **Calcul d'itinéraires** avec estimation de durée
- **Points d'intérêt** pour améliorer l'expérience utilisateur
- **Alertes géolocalisées** pour les événements importants
- **Paramètres personnalisés** pour chaque utilisateur

### Avantages Techniques
- **Performance optimisée** avec index géographiques
- **Intégrité des données** avec contraintes de validation
- **Extensibilité** pour de futures fonctionnalités
- **Sécurité** avec validation des coordonnées
- **Monitoring** avec métriques de qualité

## 🗄️ Structure de la Base de Données

### Modèles Améliorés

#### 1. TechnicianLocation
```python
# Nouvelles fonctionnalités ajoutées
accuracy = models.FloatField("Précision (mètres)")
altitude = models.FloatField("Altitude (mètres)")
speed = models.FloatField("Vitesse (km/h)")
heading = models.FloatField("Direction (degrés)")
is_moving = models.BooleanField("En mouvement")
battery_level = models.PositiveSmallIntegerField("Niveau de batterie (%)")
location_source = models.CharField("Source de localisation")
address = models.TextField("Adresse géocodée")
city = models.CharField("Ville")
country = models.CharField("Pays")
```

#### 2. ClientLocation
```python
# Mêmes améliorations que TechnicianLocation
accuracy = models.FloatField("Précision (mètres)")
altitude = models.FloatField("Altitude (mètres)")
speed = models.FloatField("Vitesse (km/h)")
heading = models.FloatField("Direction (degrés)")
is_moving = models.BooleanField("En mouvement")
battery_level = models.PositiveSmallIntegerField("Niveau de batterie (%)")
location_source = models.CharField("Source de localisation")
address = models.TextField("Adresse géocodée")
city = models.CharField("Ville")
country = models.CharField("Pays")
```

### Nouveaux Modèles

#### 3. LocationHistory
```python
user = models.ForeignKey(User, on_delete=models.CASCADE)
latitude = models.FloatField("Latitude")
longitude = models.FloatField("Longitude")
accuracy = models.FloatField("Précision (mètres)")
altitude = models.FloatField("Altitude (mètres)")
speed = models.FloatField("Vitesse (km/h)")
heading = models.FloatField("Direction (degrés)")
is_moving = models.BooleanField("En mouvement")
battery_level = models.PositiveSmallIntegerField("Niveau de batterie (%)")
location_source = models.CharField("Source de localisation")
address = models.TextField("Adresse")
city = models.CharField("Ville")
country = models.CharField("Pays")
request = models.ForeignKey(RepairRequest, null=True, blank=True)
```

#### 4. ServiceZone
```python
name = models.CharField("Nom", max_length=200)
description = models.TextField("Description")
center_latitude = models.FloatField("Latitude du centre")
center_longitude = models.FloatField("Longitude du centre")
radius_km = models.FloatField("Rayon (km)")
is_active = models.BooleanField("Active", default=True)
color = models.CharField("Couleur", max_length=7, default='#2563eb')
technicians = models.ManyToManyField(Technician)
```

#### 5. Route
```python
name = models.CharField("Nom", max_length=200)
description = models.TextField("Description")
start_latitude = models.FloatField("Latitude de départ")
start_longitude = models.FloatField("Longitude de départ")
end_latitude = models.FloatField("Latitude d'arrivée")
end_longitude = models.FloatField("Longitude d'arrivée")
distance_km = models.FloatField("Distance (km)")
estimated_duration_minutes = models.PositiveIntegerField("Durée estimée (minutes)")
route_type = models.CharField("Type d'itinéraire")
is_active = models.BooleanField("Active", default=True)
request = models.ForeignKey(RepairRequest)
technician = models.ForeignKey(Technician)
```

#### 6. PointOfInterest
```python
name = models.CharField("Nom", max_length=200)
description = models.TextField("Description")
latitude = models.FloatField("Latitude")
longitude = models.FloatField("Longitude")
poi_type = models.CharField("Type de POI")
address = models.TextField("Adresse")
phone = models.CharField("Téléphone", max_length=20)
website = models.URLField("Site web")
is_active = models.BooleanField("Active", default=True)
rating = models.FloatField("Note")
```

#### 7. GeolocationAlert
```python
alert_type = models.CharField("Type d'alerte")
title = models.CharField("Titre", max_length=200)
message = models.TextField("Message")
severity = models.CharField("Sévérité")
is_read = models.BooleanField("Lue", default=False)
read_at = models.DateTimeField("Lue le", null=True, blank=True)
latitude = models.FloatField("Latitude", null=True, blank=True)
longitude = models.FloatField("Longitude", null=True, blank=True)
extra_data = models.JSONField("Données supplémentaires")
user = models.ForeignKey(User)
request = models.ForeignKey(RepairRequest, null=True, blank=True)
```

#### 8. GeolocationSettings
```python
user = models.OneToOneField(User)
location_sharing_enabled = models.BooleanField("Partage de localisation activé")
background_location_enabled = models.BooleanField("Localisation en arrière-plan")
high_accuracy_mode = models.BooleanField("Mode haute précision")
location_update_interval_seconds = models.PositiveIntegerField("Intervalle de mise à jour")
max_location_history_days = models.PositiveIntegerField("Historique max (jours)")
geofencing_enabled = models.BooleanField("Géofencing activé")
speed_limit_kmh = models.PositiveIntegerField("Limite de vitesse (km/h)")
battery_threshold_percent = models.PositiveSmallIntegerField("Seuil batterie (%)")
accuracy_threshold_meters = models.PositiveIntegerField("Seuil précision (mètres)")
alert_notifications_enabled = models.BooleanField("Notifications d'alerte")
map_provider = models.CharField("Fournisseur de carte")
default_zoom_level = models.PositiveSmallIntegerField("Niveau de zoom par défaut")
show_traffic = models.BooleanField("Afficher le trafic")
show_pois = models.BooleanField("Afficher les POI")
```

## 🔧 Installation et Configuration

### 1. Application des Migrations

```bash
# Naviguer vers le dossier Backend
cd Backend

# Appliquer les migrations
python manage.py migrate

# Vérifier le statut des migrations
python manage.py showmigrations depannage
```

### 2. Vérification de l'Installation

```bash
# Tester les migrations
python ../test_geolocation_migrations.py
```

### 3. Configuration des Paramètres

```python
# Dans settings.py
GEOLOCATION_SETTINGS = {
    'DEFAULT_UPDATE_INTERVAL': 30,  # secondes
    'MAX_HISTORY_DAYS': 30,
    'DEFAULT_ACCURACY_THRESHOLD': 100,  # mètres
    'DEFAULT_BATTERY_THRESHOLD': 20,  # pourcentage
    'DEFAULT_SPEED_LIMIT': 80,  # km/h
    'DEFAULT_MAP_PROVIDER': 'openstreetmap',
    'DEFAULT_ZOOM_LEVEL': 13,
}
```

## 📊 Index et Performance

### Index Géographiques
```sql
-- Index pour les coordonnées
CREATE INDEX tech_location_coords_idx ON depannage_technicianlocation (latitude, longitude);
CREATE INDEX client_location_coords_idx ON depannage_clientlocation (latitude, longitude);

-- Index pour les requêtes temporelles
CREATE INDEX tech_location_tech_created_idx ON depannage_technicianlocation (technician_id, created_at);
CREATE INDEX client_location_client_created_idx ON depannage_clientlocation (client_id, created_at);

-- Index pour les mouvements
CREATE INDEX tech_location_moving_idx ON depannage_technicianlocation (is_moving, created_at);
```

### Index pour les Nouveaux Modèles
```sql
-- LocationHistory
CREATE INDEX location_history_user_created_idx ON depannage_locationhistory (user_id, created_at);
CREATE INDEX location_history_request_created_idx ON depannage_locationhistory (request_id, created_at);

-- ServiceZone
CREATE INDEX service_zone_center_idx ON depannage_servicezone (center_latitude, center_longitude);
CREATE INDEX service_zone_active_idx ON depannage_servicezone (is_active);

-- Route
CREATE INDEX route_request_created_idx ON depannage_route (request_id, created_at);
CREATE INDEX route_technician_created_idx ON depannage_route (technician_id, created_at);

-- PointOfInterest
CREATE INDEX poi_coords_idx ON depannage_pointofinterest (latitude, longitude);
CREATE INDEX poi_type_active_idx ON depannage_pointofinterest (poi_type, is_active);

-- GeolocationAlert
CREATE INDEX geo_alert_user_read_idx ON depannage_geolocationalert (user_id, is_read);
CREATE INDEX geo_alert_type_created_idx ON depannage_geolocationalert (alert_type, created_at);
```

## 🔒 Contraintes et Validation

### Contraintes de Validation
```python
# Précision positive
models.CheckConstraint(
    check=models.Q(accuracy__isnull=True) | models.Q(accuracy__gte=0),
    name='tech_location_accuracy_positive'
)

# Vitesse positive
models.CheckConstraint(
    check=models.Q(speed__isnull=True) | models.Q(speed__gte=0),
    name='tech_location_speed_positive'
)

# Direction valide (0-360 degrés)
models.CheckConstraint(
    check=models.Q(heading__isnull=True) | (models.Q(heading__gte=0) & models.Q(heading__lte=360)),
    name='tech_location_heading_valid'
)

# Niveau de batterie valide (0-100%)
models.CheckConstraint(
    check=models.Q(battery_level__isnull=True) | (models.Q(battery_level__gte=0) & models.Q(battery_level__lte=100)),
    name='tech_location_battery_valid'
)
```

### Validation des Coordonnées
```python
def validate_latitude(self, value):
    """Validation de la latitude."""
    if value < -90 or value > 90:
        raise serializers.ValidationError("La latitude doit être entre -90 et 90.")
    return value

def validate_longitude(self, value):
    """Validation de la longitude."""
    if value < -180 or value > 180:
        raise serializers.ValidationError("La longitude doit être entre -180 et 180.")
    return value
```

## 🧪 Tests et Validation

### Tests Automatisés
```bash
# Exécuter les tests de géolocalisation
python test_geolocation_migrations.py

# Tests Django
python manage.py test depannage.tests.test_geolocation
```

### Tests Manuels
1. **Test de création de localisation**
2. **Test de calcul de distance**
3. **Test de qualité de localisation**
4. **Test des zones de service**
5. **Test des itinéraires**
6. **Test des alertes**

## 📈 Métriques et Monitoring

### Métriques de Performance
- **Temps de réponse** des requêtes géographiques
- **Précision moyenne** des localisations
- **Nombre d'alertes** générées par jour
- **Utilisation des zones** de service
- **Qualité des itinéraires** calculés

### Métriques de Qualité
- **Taux de précision** GPS
- **Stabilité des connexions** de localisation
- **Temps de mise à jour** des positions
- **Taux de succès** des géocodages

## 🔧 Administration

### Interface d'Administration
- **TechnicianLocationAdmin** : Gestion des localisations techniciens
- **ClientLocationAdmin** : Gestion des localisations clients
- **LocationHistoryAdmin** : Historique des localisations
- **ServiceZoneAdmin** : Gestion des zones de service
- **RouteAdmin** : Gestion des itinéraires
- **PointOfInterestAdmin** : Gestion des POI
- **GeolocationAlertAdmin** : Gestion des alertes
- **GeolocationSettingsAdmin** : Paramètres utilisateurs

### Actions d'Administration
```python
# Marquer les alertes comme lues
def mark_as_read(self, request, queryset):
    updated = queryset.update(is_read=True, read_at=timezone.now())
    self.message_user(request, f"{updated} alerte(s) marquée(s) comme lue(s).")

# Marquer les alertes comme non lues
def mark_as_unread(self, request, queryset):
    updated = queryset.update(is_read=False, read_at=None)
    self.message_user(request, f"{updated} alerte(s) marquée(s) comme non lue(s).")
```

## 🚀 Utilisation Avancée

### API Endpoints
```python
# Mise à jour de localisation
POST /api/geolocation/update/
{
    "latitude": 5.3600,
    "longitude": -4.0083,
    "accuracy": 15.5,
    "speed": 25.0,
    "heading": 180.0,
    "is_moving": true,
    "battery_level": 85
}

# Recherche de techniciens à proximité
GET /api/geolocation/nearby-technicians/?lat=5.3600&lng=-4.0083&radius=10

# Calcul d'itinéraire
POST /api/geolocation/calculate-route/
{
    "start_latitude": 5.3600,
    "start_longitude": -4.0083,
    "end_latitude": 5.3700,
    "end_longitude": -4.0183,
    "route_type": "driving"
}
```

### WebSocket Events
```javascript
// Écouter les mises à jour de localisation
socket.on('location_update', function(data) {
    console.log('Nouvelle localisation:', data);
    updateMapMarker(data);
});

// Écouter les alertes géolocalisées
socket.on('geolocation_alert', function(data) {
    console.log('Nouvelle alerte:', data);
    showAlert(data);
});
```

## 🔧 Dépannage

### Problèmes Courants

#### 1. Erreur de Migration
```bash
# Solution : Vérifier les dépendances
python manage.py makemigrations --dry-run
python manage.py migrate --plan
```

#### 2. Performance Lente
```bash
# Vérifier les index
python manage.py dbshell
\d depannage_technicianlocation
\d depannage_clientlocation
```

#### 3. Données Incohérentes
```python
# Nettoyer les données invalides
from depannage.models import TechnicianLocation, ClientLocation

# Supprimer les localisations avec coordonnées invalides
TechnicianLocation.objects.filter(
    latitude__lt=-90,
    latitude__gt=90
).delete()

ClientLocation.objects.filter(
    longitude__lt=-180,
    longitude__gt=180
).delete()
```

### Logs et Debugging
```python
# Activer les logs de géolocalisation
LOGGING = {
    'loggers': {
        'depannage.geolocation': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## 📚 Ressources et Documentation

### Documentation Technique
- [Django GeoDjango](https://docs.djangoproject.com/en/stable/ref/contrib/gis/)
- [PostGIS Documentation](https://postgis.net/documentation/)
- [Leaflet.js](https://leafletjs.com/reference.html)

### Outils de Développement
- **pgAdmin** : Interface graphique PostgreSQL
- **Django Debug Toolbar** : Profiling des requêtes
- **PostGIS** : Extension géospatiale PostgreSQL

### Bonnes Pratiques
1. **Toujours valider** les coordonnées avant sauvegarde
2. **Utiliser les index** pour les requêtes géographiques
3. **Nettoyer régulièrement** l'historique ancien
4. **Monitorer les performances** des requêtes
5. **Tester les contraintes** avant déploiement

## ✅ Checklist de Validation

### Installation
- [ ] Migrations appliquées avec succès
- [ ] Tous les modèles créés correctement
- [ ] Index de performance installés
- [ ] Contraintes de validation actives
- [ ] Interface d'administration configurée

### Tests
- [ ] Tests de migration passés
- [ ] Tests de création de données
- [ ] Tests de calcul de distance
- [ ] Tests de qualité de localisation
- [ ] Tests des zones de service
- [ ] Tests des itinéraires
- [ ] Tests des alertes

### Performance
- [ ] Index géographiques créés
- [ ] Requêtes optimisées
- [ ] Métriques de performance collectées
- [ ] Monitoring configuré

### Sécurité
- [ ] Validation des coordonnées
- [ ] Contraintes de données actives
- [ ] Permissions utilisateur configurées
- [ ] Logs de sécurité activés

## 🎯 Résultats Attendus

### Fonctionnalités Opérationnelles
- ✅ **Localisation en temps réel** des techniciens et clients
- ✅ **Historique complet** des mouvements
- ✅ **Zones de service** fonctionnelles
- ✅ **Calcul d'itinéraires** précis
- ✅ **Points d'intérêt** intégrés
- ✅ **Alertes géolocalisées** actives
- ✅ **Paramètres personnalisés** par utilisateur

### Performance
- ✅ **Temps de réponse** < 100ms pour les requêtes géographiques
- ✅ **Précision GPS** > 90% des localisations
- ✅ **Disponibilité** > 99.9% du système
- ✅ **Scalabilité** support de 1000+ utilisateurs simultanés

### Qualité
- ✅ **Intégrité des données** garantie par les contraintes
- ✅ **Validation robuste** des coordonnées
- ✅ **Monitoring complet** des métriques
- ✅ **Documentation exhaustive** des fonctionnalités

## 🚀 Prochaines Étapes

### Développements Futurs
1. **Intégration de cartes** avancées (Google Maps, Mapbox)
2. **Géofencing intelligent** avec zones dynamiques
3. **Prédiction de trafic** pour les itinéraires
4. **Analytics géospatiales** pour l'optimisation
5. **Intégration IoT** pour les capteurs de localisation

### Optimisations
1. **Cache Redis** pour les requêtes fréquentes
2. **CDN** pour les tuiles de cartes
3. **Compression** des données de localisation
4. **Archivage automatique** de l'historique ancien

---

**Note** : Ce guide est un document vivant qui sera mis à jour avec les nouvelles fonctionnalités et améliorations du système de géolocalisation. 