# Système de Géolocalisation en Temps Réel

## Vue d'ensemble

Ce système permet le suivi en temps réel de la position des techniciens et clients via WebSocket avec Django Channels et React-Leaflet.

## Architecture

### Backend (Django + Channels + Redis)

#### 1. Consumers WebSocket
- **TechnicianLocationConsumer** : Gère le suivi des techniciens
- **ClientLocationConsumer** : Gère le suivi des clients

#### 2. Modèles de données
- **TechnicianLocation** : Stocke la position des techniciens
- **ClientLocation** : Stocke la position des clients

#### 3. Configuration WebSocket
- **URLs** : 
  - `ws/technician-tracking/{technician_id}/`
  - `ws/client-tracking/{client_id}/`
- **Authentification** : JWT token requis
- **Format des données** : JSON avec latitude/longitude

### Frontend (React + TypeScript + React-Leaflet)

#### 1. Composants principaux
- **LocationTracker** : Envoie la position GPS
- **LiveLocationMap** : Affiche la position sur une carte
- **LocationTrackingControl** : Interface de contrôle avec bouton

#### 2. Fonctionnalités
- **Tracking automatique** : Toutes les 5 secondes
- **Tracking manuel** : Bouton pour forcer la mise à jour
- **Carte interactive** : React-Leaflet avec OpenStreetMap
- **Lien Google Maps** : Redirection vers Google Maps

## Utilisation

### Côté Technicien

```tsx
// Dans TechnicianDashboard.tsx
<LocationTrackingControl
  userType="technician"
  userId={user?.technician?.id || 0}
  title="Contrôle de ma position"
  description="Activez le suivi pour partager votre position"
  onTrackingStart={() => console.log('Tracking démarré')}
  onTrackingStop={() => console.log('Tracking arrêté')}
  onLocationUpdate={(lat, lng) => console.log('Position:', lat, lng)}
  onError={(error) => console.error('Erreur:', error)}
/>

<LiveLocationMap
  userType="technician"
  userId={user?.technician?.id || 0}
  title="Ma position en temps réel"
  height="400px"
  showGoogleMapsLink={true}
/>
```

### Côté Client

```tsx
// Dans CustomerDashboard.tsx
<LocationTrackingControl
  userType="client"
  userId={user?.client?.id || 0}
  title="Contrôle de ma position"
  description="Partagez votre position avec les techniciens"
/>

<LiveLocationMap
  userType="client"
  userId={user?.client?.id || 0}
  title="Ma position en temps réel"
/>
```

### Suivi d'un autre utilisateur

```tsx
// Suivre la position d'un technicien (côté client)
<LiveLocationMap
  userType="technician"
  userId={technicianId}
  title="Position du technicien"
  height="300px"
/>

// Suivre la position d'un client (côté technicien)
<LiveLocationMap
  userType="client"
  userId={clientId}
  title="Position du client"
  height="300px"
/>
```

## Configuration

### Backend

1. **Installation des dépendances**
```bash
pip install channels channels_redis
```

2. **Configuration settings.py**
```python
INSTALLED_APPS += ["channels"]
ASGI_APPLICATION = "backend.asgi.application"
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

3. **Configuration asgi.py**
```python
import os
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.core.asgi import get_asgi_application
from depannage.routing import get_websocket_urlpatterns

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": AuthMiddlewareStack(
        URLRouter(get_websocket_urlpatterns())
    ),
})
```

### Frontend

1. **Installation des dépendances**
```bash
npm install react-leaflet leaflet
```

2. **Configuration TypeScript**
```typescript
// types/leaflet.d.ts
declare module 'leaflet' {
  export * from 'leaflet';
}
```

## Sécurité

### Authentification WebSocket
- Vérification du token JWT dans le scope
- Rejet des connexions non authentifiées
- Validation des permissions utilisateur

### Validation des données
- Vérification des coordonnées GPS
- Limitation de la fréquence d'envoi
- Sanitisation des données reçues

## Performance

### Optimisations
- **Intervalle de mise à jour** : 5 secondes par défaut
- **Reconnexion automatique** : En cas de déconnexion
- **Nettoyage des ressources** : ClearInterval et close WebSocket
- **Mise à jour conditionnelle** : Seulement si la position change

### Monitoring
- Logs de connexion/déconnexion
- Métriques de performance
- Gestion des erreurs

## Déploiement

### Production
1. **Redis** : Configuration pour la production
2. **HTTPS/WSS** : Sécurisation des connexions
3. **Load Balancing** : Pour les WebSockets
4. **Monitoring** : Surveillance des performances

### Variables d'environnement
```bash
REDIS_URL=redis://localhost:6379
CHANNEL_LAYERS_BACKEND=channels_redis.core.RedisChannelLayer
```

## Dépannage

### Problèmes courants

1. **WebSocket ne se connecte pas**
   - Vérifier Redis
   - Vérifier l'authentification
   - Vérifier les URLs

2. **Position ne s'affiche pas**
   - Vérifier les permissions GPS
   - Vérifier la connexion WebSocket
   - Vérifier les logs console

3. **Performance lente**
   - Réduire la fréquence d'envoi
   - Optimiser les requêtes base de données
   - Vérifier la charge Redis

### Logs utiles
```javascript
// Frontend
console.log('📍 WebSocket connecté');
console.log('📍 Position envoyée:', lat, lng);
console.log('🗺️ Position reçue:', lat, lng);

// Backend
print(f"WebSocket connecté: {user_id}")
print(f"Position reçue: {latitude}, {longitude}")
```

## Extensions futures

### Fonctionnalités avancées
- **Historique des trajets** : Stockage des positions
- **Optimisation d'itinéraire** : Calcul de routes
- **Notifications de proximité** : Alertes géolocalisées
- **Mode hors ligne** : Cache local des positions

### Intégrations
- **Google Maps API** : Pour les directions
- **Services de trafic** : Temps de trajet en temps réel
- **Analytics** : Statistiques de déplacement
- **Machine Learning** : Prédiction d'arrivée 