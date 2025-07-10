# 🗺️ Système de Géolocalisation en Temps Réel

## 🎯 Vue d'ensemble

Ce système implémente un suivi de géolocalisation en temps réel pour les techniciens et clients de votre application de dépannage. Il utilise **WebSocket** avec **Django Channels** et **React-Leaflet** pour une expérience fluide et interactive.

## ✨ Fonctionnalités

### 🔧 Côté Technicien
- **Tracking automatique** : Envoi de position toutes les 5 secondes
- **Bouton manuel** : Mise à jour de position à la demande
- **Carte interactive** : Visualisation de sa position en temps réel
- **Suivi des clients** : Voir la position des clients assignés

### 👤 Côté Client
- **Partage de position** : Envoi automatique de sa position
- **Suivi des techniciens** : Voir la position du technicien assigné
- **Carte en temps réel** : Visualisation interactive
- **Lien Google Maps** : Redirection vers Google Maps

### 🔄 Communication en Temps Réel
- **WebSocket** : Connexion bidirectionnelle instantanée
- **Redis** : Stockage temporaire des positions
- **Authentification JWT** : Sécurisation des connexions
- **Reconnexion automatique** : Gestion des déconnexions

## 🏗️ Architecture

```
┌─────────────────┐    WebSocket    ┌─────────────────┐
│   Frontend      │ ◄─────────────► │    Backend      │
│   React         │                 │   Django        │
│   React-Leaflet │                 │   Channels      │
└─────────────────┘                 └─────────────────┘
                                              │
                                              ▼
                                    ┌─────────────────┐
                                    │     Redis       │
                                    │   (Cache)       │
                                    └─────────────────┘
```

## 📁 Structure des fichiers

### Backend (Django)
```
Backend/
├── depannage/
│   ├── consumers.py          # WebSocket consumers
│   ├── routing.py            # Routes WebSocket
│   └── models.py             # Modèles TechnicianLocation, ClientLocation
├── auth/
│   └── asgi.py              # Configuration ASGI
└── requirements.txt          # Dépendances Python
```

### Frontend (React)
```
Frontend/src/components/
├── LocationTracker.tsx       # Envoi de position GPS
├── LiveLocationMap.tsx       # Affichage carte temps réel
└── LocationTrackingControl.tsx # Interface de contrôle

Frontend/src/pages/
├── TechnicianDashboard.tsx   # Intégration technicien
└── CustomerDashboard.tsx     # Intégration client
```

## 🚀 Installation et démarrage

### 1. Prérequis
```bash
# Python 3.8+
# Node.js 16+
# Redis
```

### 2. Démarrage rapide
```bash
# Rendre le script exécutable
chmod +x start_geolocation_demo.sh

# Lancer la démonstration complète
./start_geolocation_demo.sh
```

### 3. Démarrage manuel

#### Backend
```bash
cd Backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
daphne -b 0.0.0.0 -p 8000 auth.asgi:application
```

#### Frontend
```bash
cd Frontend
npm install
npm run dev
```

#### Redis
```bash
redis-server
```

## 🧪 Tests

### Test automatique
```bash
python test_geolocation_system.py
```

### Test manuel
1. Ouvrir http://localhost:5173
2. Se connecter en tant que technicien ou client
3. Aller dans l'onglet "📍 Géolocalisation"
4. Activer le tracking
5. Observer la carte en temps réel

## 📱 Utilisation

### Pour les techniciens
1. **Accès** : Dashboard technicien → Onglet "📍 Géolocalisation"
2. **Activation** : Cliquer sur "📍 Démarrer le suivi"
3. **Visualisation** : Voir sa position sur la carte
4. **Suivi clients** : Voir la position des clients assignés

### Pour les clients
1. **Accès** : Dashboard client → Onglet "📍 Géolocalisation"
2. **Partage** : Activer le partage de position
3. **Suivi technicien** : Voir la position du technicien assigné
4. **Navigation** : Lien vers Google Maps

## 🔧 Configuration

### Variables d'environnement
```bash
# Backend
REDIS_URL=redis://localhost:6379
DJANGO_SETTINGS_MODULE=auth.settings

# Frontend
VITE_API_URL=http://localhost:8000
```

### Configuration WebSocket
```python
# settings.py
CHANNEL_LAYERS = {
    "default": {
        "BACKEND": "channels_redis.core.RedisChannelLayer",
        "CONFIG": {
            "hosts": [("127.0.0.1", 6379)],
        },
    },
}
```

## 🔒 Sécurité

### Authentification
- **JWT Token** : Requis pour toutes les connexions WebSocket
- **Validation utilisateur** : Vérification des permissions
- **Sanitisation** : Validation des coordonnées GPS

### Protection des données
- **Chiffrement** : HTTPS/WSS en production
- **Rate limiting** : Limitation de la fréquence d'envoi
- **Validation** : Vérification des données reçues

## 📊 Performance

### Optimisations
- **Intervalle configurable** : 5 secondes par défaut
- **Mise à jour conditionnelle** : Seulement si position change
- **Nettoyage automatique** : Gestion des ressources
- **Cache Redis** : Stockage temporaire efficace

### Monitoring
```javascript
// Logs frontend
console.log('📍 WebSocket connecté');
console.log('📍 Position envoyée:', lat, lng);
console.log('🗺️ Position reçue:', lat, lng);

// Logs backend
print(f"WebSocket connecté: {user_id}")
print(f"Position reçue: {latitude}, {longitude}")
```

## 🐛 Dépannage

### Problèmes courants

#### WebSocket ne se connecte pas
```bash
# Vérifier Redis
redis-cli ping

# Vérifier le serveur backend
curl http://localhost:8000/health/

# Vérifier les logs
tail -f Backend/django.log
```

#### Position ne s'affiche pas
```javascript
// Vérifier les permissions GPS
navigator.permissions.query({name:'geolocation'})

// Vérifier la connexion WebSocket
console.log('WebSocket state:', ws.readyState)

// Vérifier les erreurs console
console.error('Erreur:', error)
```

#### Performance lente
```bash
# Réduire la fréquence d'envoi
intervalMs={10000}  # 10 secondes au lieu de 5

# Vérifier la charge Redis
redis-cli info memory

# Optimiser les requêtes
python manage.py debug_toolbar
```

## 🔮 Extensions futures

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

## 📚 Documentation

- **Guide complet** : `GEOLOCATION_IMPLEMENTATION.md`
- **Tests** : `test_geolocation_system.py`
- **Démo** : `start_geolocation_demo.sh`

## 🤝 Contribution

### Ajout de fonctionnalités
1. Créer une branche feature
2. Implémenter la fonctionnalité
3. Ajouter les tests
4. Documenter les changements
5. Créer une pull request

### Tests
```bash
# Tests backend
python manage.py test depannage.tests

# Tests frontend
npm run test

# Tests géolocalisation
python test_geolocation_system.py
```

## 📞 Support

Pour toute question ou problème :
- **Issues GitHub** : Créer une issue
- **Documentation** : Consulter `GEOLOCATION_IMPLEMENTATION.md`
- **Tests** : Exécuter `test_geolocation_system.py`

---

**🎉 Système de géolocalisation en temps réel prêt à l'emploi !** 