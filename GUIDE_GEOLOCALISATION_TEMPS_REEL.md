# Guide de Géolocalisation en Temps Réel

## 🎯 Vue d'ensemble

Ce système permet aux clients et techniciens de se voir mutuellement sur une carte en temps réel, avec des fonctionnalités de suivi, d'appel direct et de notifications.

## 🚀 Fonctionnalités principales

### 1. Suivi en temps réel
- **Position GPS en direct** : Client et technicien se voient mutuellement sur une carte
- **Mise à jour automatique** : Positions mises à jour toutes les 10 secondes
- **Calcul de distance** : Distance en temps réel entre client et technicien
- **Estimation d'arrivée** : Temps estimé d'arrivée du technicien

### 2. Partage de position
- **Bouton "Partager ma position"** : Active le partage de position GPS
- **Contrôle utilisateur** : Possibilité d'arrêter le partage à tout moment
- **Sécurité** : Partage uniquement pour les demandes actives

### 3. Appels directs
- **Boutons d'appel** : Appel direct vers le client ou le technicien
- **Intégration téléphone** : Utilise le protocole `tel:` pour les appels
- **Confirmation** : Demande de confirmation avant l'appel

### 4. Notifications
- **Notifications push** : Alertes en temps réel
- **Statuts de demande** : Mises à jour automatiques des statuts
- **Arrivée du technicien** : Notification quand le technicien arrive

## 📱 Utilisation

### Pour les Clients

#### 1. Accéder au suivi
- Connectez-vous à votre compte client
- Allez dans votre tableau de bord
- Cliquez sur "Suivre la demande" pour une demande active
- Ou utilisez le bouton "Suivre en temps réel" dans la liste des demandes

#### 2. Partager votre position
- Dans la page de suivi, cliquez sur "Partager ma position"
- Autorisez l'accès à votre géolocalisation
- Votre position sera partagée en temps réel

#### 3. Suivre le technicien
- Voir la position du technicien sur la carte
- Distance et temps d'arrivée estimé
- Ligne de route entre vous et le technicien

#### 4. Appeler le technicien
- Cliquez sur "Appeler le technicien"
- Confirmez l'appel
- L'appel sera lancé via votre téléphone

### Pour les Techniciens

#### 1. Accéder au suivi
- Connectez-vous à votre compte technicien
- Allez dans votre tableau de bord
- Cliquez sur "Suivre en temps réel" pour une demande active

#### 2. Partager votre position
- Dans la page de suivi, cliquez sur "Partager ma position"
- Votre position sera partagée avec le client
- Le client pourra vous suivre en temps réel

#### 3. Suivre le client
- Voir la position du client sur la carte
- Distance et route vers le client
- Informations de contact du client

#### 4. Appeler le client
- Cliquez sur "Appeler le client"
- Confirmez l'appel
- L'appel sera lancé via votre téléphone

## 🔧 Architecture technique

### Backend (Django + Channels)

#### WebSockets
```python
# Routes WebSocket
ws/request-tracking/{request_id}/     # Suivi de demande spécifique
ws/technician-tracking/{technician_id}/ # Suivi technicien
ws/client-tracking/{client_id}/       # Suivi client
ws/notifications/                     # Notifications générales
```

#### Consumers
- `RequestTrackingConsumer` : Gère le suivi d'une demande spécifique
- `TechnicianLocationConsumer` : Gère la localisation des techniciens
- `ClientLocationConsumer` : Gère la localisation des clients
- `NotificationsConsumer` : Gère les notifications

#### Modèles de données
```python
class TechnicianLocation(BaseTimeStampModel):
    technician = models.OneToOneField(Technician, ...)
    latitude = models.FloatField()
    longitude = models.FloatField()

class ClientLocation(BaseTimeStampModel):
    client = models.OneToOneField(Client, ...)
    latitude = models.FloatField()
    longitude = models.FloatField()
```

### Frontend (React + TypeScript)

#### Composants principaux
- `RealTimeTracking` : Composant principal de suivi
- `LiveLocationMap` : Carte interactive avec Leaflet
- `LocationTracker` : Gestion du tracking GPS
- `LocationTrackingControl` : Contrôles de partage

#### Technologies utilisées
- **React Leaflet** : Cartes interactives
- **WebSocket** : Communication temps réel
- **Geolocation API** : Accès GPS du navigateur
- **Lucide React** : Icônes

## 🛠️ Installation et configuration

### 1. Backend

#### Dépendances
```bash
pip install channels
pip install channels-redis  # Pour la production
```

#### Configuration ASGI
```python
# auth/asgi.py
application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        URLRouter(get_websocket_urlpatterns())
    ),
})
```

#### Variables d'environnement
```bash
# .env
CHANNEL_LAYERS_BACKEND=channels.layers.InMemoryChannelLayer  # Dev
# CHANNEL_LAYERS_BACKEND=channels_redis.core.RedisChannelLayer  # Prod
```

### 2. Frontend

#### Dépendances
```bash
npm install react-leaflet leaflet
npm install lucide-react
```

#### Configuration Leaflet
```typescript
// Fix pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});
```

## 🧪 Tests

### Test des WebSockets
```bash
python test_real_time_tracking.py
```

### Test manuel
1. Créez une demande de réparation
2. Assignez un technicien
3. Accédez au suivi en temps réel
4. Testez le partage de position
5. Vérifiez les appels directs

## 🔒 Sécurité

### Authentification
- **JWT Token** : Authentification WebSocket
- **Permissions** : Vérification des droits d'accès
- **Isolation** : Chaque demande a son propre canal WebSocket

### Géolocalisation
- **Permission utilisateur** : Demande d'autorisation GPS
- **Contrôle utilisateur** : Possibilité d'arrêter le partage
- **Chiffrement** : Communications WebSocket sécurisées

### Données personnelles
- **Minimisation** : Seules les positions nécessaires sont partagées
- **Temporalité** : Positions non stockées indéfiniment
- **Consentement** : Partage explicite par l'utilisateur

## 📊 Monitoring

### Métriques à surveiller
- **Connexions WebSocket** : Nombre de connexions actives
- **Positions partagées** : Fréquence des mises à jour
- **Erreurs de géolocalisation** : Problèmes GPS
- **Performance** : Latence des mises à jour

### Logs
```python
# Exemple de logging
logger.info(f"Position mise à jour: {latitude}, {longitude}")
logger.warning(f"Erreur de géolocalisation: {error}")
logger.error(f"WebSocket déconnecté: {close_code}")
```

## 🚨 Dépannage

### Problèmes courants

#### 1. Géolocalisation non disponible
**Symptômes** : Erreur "La géolocalisation n'est pas supportée"
**Solutions** :
- Vérifiez que le site est en HTTPS
- Autorisez l'accès GPS dans le navigateur
- Testez sur un appareil mobile

#### 2. WebSocket non connecté
**Symptômes** : "Erreur de connexion WebSocket"
**Solutions** :
- Vérifiez que le serveur backend est démarré
- Vérifiez l'authentification JWT
- Vérifiez les routes WebSocket

#### 3. Carte ne s'affiche pas
**Symptômes** : Carte vide ou erreur Leaflet
**Solutions** :
- Vérifiez la connexion internet
- Vérifiez les tiles OpenStreetMap
- Vérifiez les icônes Leaflet

#### 4. Positions non mises à jour
**Symptômes** : Positions statiques
**Solutions** :
- Vérifiez le partage de position
- Vérifiez les permissions GPS
- Vérifiez la connexion WebSocket

## 🔄 Mises à jour futures

### Fonctionnalités prévues
- **Notifications push** : Alertes sur mobile
- **Historique des trajets** : Sauvegarde des routes
- **Optimisation de route** : Calcul d'itinéraire optimal
- **Mode hors ligne** : Fonctionnement sans internet
- **Géofencing** : Alertes de proximité

### Améliorations techniques
- **WebRTC** : Communication peer-to-peer
- **Service Workers** : Notifications push
- **IndexedDB** : Cache local
- **WebAssembly** : Calculs optimisés

## 📞 Support

Pour toute question ou problème :
- **Email** : support@votre-plateforme.com
- **Documentation** : Consultez ce guide
- **Tests** : Utilisez le script de test fourni
- **Logs** : Vérifiez les logs du serveur

---

*Dernière mise à jour : $(date)* 