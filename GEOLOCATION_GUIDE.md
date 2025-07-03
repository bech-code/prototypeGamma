# 🧭 Guide de Géolocalisation - DepanneTeliman

Ce guide explique comment utiliser la fonctionnalité de géolocalisation pour trouver des techniciens proches.

## 🎯 **Fonctionnalités Implémentées**

### ✅ **Backend (Django REST Framework)**
- **API `/api/techniciens-proches/`** avec authentification JWT
- **Calcul de distance Haversine** pour une précision géographique
- **Filtres par service** et niveau d'urgence
- **Rayon de recherche** configurable (10 km par défaut)
- **Tri par distance** croissante
- **Validation des paramètres** (lat, lng, service, urgence)

### ✅ **Frontend (React + Leaflet)**
- **Carte interactive** avec OpenStreetMap
- **Géolocalisation automatique** du client
- **Marqueurs des techniciens** avec popups informatifs
- **Liste latérale** des techniciens avec filtres
- **Interface responsive** pour mobile/desktop
- **États de chargement** et gestion d'erreurs

## 🚀 **Comment Utiliser**

### **1. Accès à la Fonctionnalité**
1. Allez sur la page d'accueil (`/`)
2. Faites défiler jusqu'à la section "Trouvez un Technicien à Proximité"
3. Cliquez sur "Utiliser Ma Position"

### **2. Authentification Requise**
- Si vous n'êtes pas connecté, vous serez redirigé vers `/login`
- Une fois connecté, la géolocalisation sera activée

### **3. Autorisation de Géolocalisation**
- Votre navigateur demandera l'autorisation d'accéder à votre position
- Cliquez sur "Autoriser" pour continuer

### **4. Utilisation de la Carte**
- **Marqueur bleu** : Votre position
- **Marqueurs rouges** : Techniciens disponibles
- **Cliquez sur un marqueur** pour voir les détails du technicien
- **Bouton "Réserver"** pour contacter le technicien

### **5. Filtres Disponibles**
- **Type de service** : Plomberie, Électricité, Serrurerie, etc.
- **Niveau d'urgence** : Normal, Urgent, Urgence
- **Afficher/Masquer la liste** des techniciens

## 🔧 **Configuration Technique**

### **Backend - Variables d'Environnement**
```env
# Rayon de recherche (en km)
SEARCH_RADIUS=10

# Nombre maximum de résultats
MAX_TECHNICIANS=20

# Coordonnées par défaut (Abidjan)
DEFAULT_LAT=5.3600
DEFAULT_LNG=-4.0083
```

### **Frontend - Dépendances**
```json
{
  "leaflet": "^1.9.4",
  "react-leaflet": "^4.2.1",
  "@types/leaflet": "^1.9.8"
}
```

## 📡 **API Endpoints**

### **GET /depannage/api/techniciens-proches/**
```bash
# Paramètres requis
lat=5.3600          # Latitude du client
lng=-4.0083         # Longitude du client

# Paramètres optionnels
service=plumber     # Type de service
urgence=urgent      # Niveau d'urgence
```

### **Réponse de l'API**
```json
{
  "technicians": [
    {
      "id": 1,
      "user": {
        "id": 1,
        "first_name": "Ahmed",
        "last_name": "Diallo",
        "email": "ahmed@example.com",
        "username": "ahmed_plumber"
      },
      "specialty": "plumber",
      "years_experience": 5,
      "hourly_rate": 5000,
      "is_available": true,
      "is_verified": true,
      "distance": 2.5,
      "average_rating": 4.8,
      "city": "Abidjan"
    }
  ],
  "count": 1,
  "search_radius": 10.0,
  "user_location": {
    "lat": 5.3600,
    "lng": -4.0083
  }
}
```

## 🧪 **Tests**

### **Test de l'API**
```bash
cd Backend
python test_geolocation.py
```

### **Test Frontend**
1. Démarrez le serveur de développement
2. Allez sur la page d'accueil
3. Testez la géolocalisation
4. Vérifiez l'affichage de la carte

## 🛠️ **Dépannage**

### **Problèmes Courants**

#### **1. Géolocalisation non autorisée**
```
Erreur: Veuillez autoriser l'accès à votre position
```
**Solution :**
- Vérifiez les paramètres de votre navigateur
- Autorisez l'accès à la géolocalisation pour le site

#### **2. Aucun technicien trouvé**
```
Aucun technicien trouvé dans votre zone
```
**Solutions :**
- Élargissez le rayon de recherche
- Changez de type de service
- Vérifiez que des techniciens sont disponibles

#### **3. Erreur de connexion API**
```
Erreur lors de la recherche de techniciens
```
**Solutions :**
- Vérifiez que le backend est démarré
- Vérifiez votre connexion internet
- Vérifiez que vous êtes connecté

#### **4. Carte ne s'affiche pas**
```
Carte non visible
```
**Solutions :**
- Vérifiez que Leaflet est installé
- Vérifiez la console pour les erreurs JavaScript
- Vérifiez votre connexion internet (OpenStreetMap)

## 📱 **Optimisations Mobile**

### **Responsive Design**
- Carte adaptative selon la taille d'écran
- Boutons tactiles optimisés
- Interface simplifiée sur mobile

### **Performance**
- Chargement lazy des marqueurs
- Limitation du nombre de résultats
- Cache des données de géolocalisation

## 🔒 **Sécurité**

### **Authentification**
- Tous les appels API nécessitent un token JWT
- Validation des paramètres côté serveur
- Protection contre les injections

### **Géolocalisation**
- Autorisation explicite requise
- Pas de stockage permanent des coordonnées
- Chiffrement des données sensibles

## 🚀 **Déploiement**

### **Production**
1. Configurez HTTPS (requis pour la géolocalisation)
2. Mettez à jour les URLs de l'API
3. Configurez les variables d'environnement
4. Testez la fonctionnalité complète

### **Monitoring**
- Surveillez les erreurs de géolocalisation
- Suivez les performances de l'API
- Analysez l'utilisation de la fonctionnalité

## 📞 **Support**

En cas de problème :
1. Vérifiez les logs du backend
2. Consultez la console du navigateur
3. Testez avec le script de test
4. Contactez l'équipe technique

---

**Version :** 1.0.0  
**Dernière mise à jour :** 2024  
**Compatibilité :** Chrome 60+, Firefox 55+, Safari 12+, Edge 79+ 