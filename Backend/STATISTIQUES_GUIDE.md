# Guide des Statistiques - Backend DepanneTeliman

## 📊 Vue d'ensemble

Le backend DepanneTeliman dispose d'un système complet de statistiques avec plusieurs endpoints pour récupérer des données analytiques selon le type d'utilisateur.

## 🔗 Endpoints Disponibles

### 1. Statistiques du Tableau de Bord
**URL:** `GET /depannage/api/repair-requests/dashboard_stats/`
**Permissions:** Authentification requise
**Description:** Statistiques de base adaptées au type d'utilisateur

#### Réponse selon le type d'utilisateur:

**Admin:**
```json
{
  "total_requests": 150,
  "pending_requests": 25,
  "in_progress_requests": 30,
  "completed_requests": 95,
  "specialty_stats": [
    {"specialty_needed": "plomberie", "count": 45},
    {"specialty_needed": "electricite", "count": 35}
  ]
}
```

**Technicien:**
```json
{
  "assigned_requests": 12,
  "completed_requests": 8,
  "pending_requests": 4,
  "specialty": "plomberie"
}
```

**Client:**
```json
{
  "total_requests": 5,
  "active_requests": 2,
  "completed_requests": 3
}
```

### 2. Statistiques Complètes du Projet
**URL:** `GET /depannage/api/repair-requests/project_statistics/`
**Permissions:** Admin seulement
**Description:** Statistiques détaillées et complètes du projet

#### Réponse:
```json
{
  "overview": {
    "total_users": 250,
    "total_clients": 180,
    "total_technicians": 65,
    "total_admins": 5,
    "active_users_30d": 120,
    "total_requests": 150,
    "completed_requests": 95,
    "total_revenue": 1500000.0,
    "platform_fees": 150000.0,
    "avg_rating": 4.2,
    "satisfaction_rate": 85.5
  },
  "requests": {
    "total": 150,
    "pending": 25,
    "in_progress": 30,
    "completed": 95,
    "cancelled": 5,
    "recent_24h": 3,
    "recent_7d": 15,
    "recent_30d": 45,
    "daily_evolution": [
      {"date": "2024-01-01", "count": 5},
      {"date": "2024-01-02", "count": 3}
    ]
  },
  "financial": {
    "total_revenue": 1500000.0,
    "total_payouts": 1350000.0,
    "platform_fees": 150000.0,
    "payment_methods": [
      {"method": "mobile_money", "count": 80, "total": 1200000.0}
    ]
  },
  "specialties": {
    "stats": [
      {
        "specialty_needed": "plomberie",
        "count": 45,
        "completed": 30,
        "avg_price": 15000.0
      }
    ],
    "top_technicians": [
      {
        "id": 1,
        "name": "John Doe",
        "specialty": "Plomberie",
        "total_jobs": 25,
        "avg_rating": 4.8,
        "total_earnings": 375000.0
      }
    ]
  },
  "technicians": {
    "total": 65,
    "verified": 50,
    "available": 35,
    "availability_rate": 70.0
  },
  "satisfaction": {
    "total_reviews": 85,
    "avg_rating": 4.2,
    "satisfaction_rate": 85.5
  },
  "security": {
    "total_logins": 500,
    "failed_logins": 25,
    "security_alerts": 3,
    "success_rate": 95.2
  },
  "geography": {
    "top_cities": [
      {"city": "Bamako", "count": 45},
      {"city": "Sikasso", "count": 25}
    ]
  }
}
```

### 3. Techniciens Disponibles
**URL:** `GET /depannage/api/repair-requests/available_technicians/?specialty=plomberie`
**Permissions:** Admin seulement
**Description:** Liste des techniciens disponibles par spécialité

#### Réponse:
```json
[
  {
    "id": 1,
    "name": "John Doe",
    "email": "john@example.com",
    "phone": "+22312345678",
    "years_experience": 5,
    "average_rating": 4.8,
    "total_jobs": 25,
    "hourly_rate": 5000,
    "bio": "Plombier expérimenté..."
  }
]
```

## 🧪 Scripts de Test

### Script Complet
```bash
python test_statistics.py
```
Teste tous les endpoints avec différents types d'utilisateurs.

### Script Simple
```bash
python test_stats_simple.py
```
Script interactif pour tester avec un token existant ou créer un admin de test.

### Vérification des URLs
```bash
python check_stats_urls.py
```
Vérifie que tous les endpoints sont correctement configurés.

## 🔐 Authentification

Tous les endpoints de statistiques nécessitent une authentification JWT :

```bash
# Exemple avec curl
curl -H "Authorization: Bearer YOUR_JWT_TOKEN" \
     http://localhost:8000/depannage/api/repair-requests/dashboard_stats/
```

## 📈 Utilisation Frontend

### Exemple React/TypeScript
```typescript
import { fetchWithAuth } from '../contexts/fetchWithAuth';

// Statistiques du tableau de bord
const getDashboardStats = async () => {
  try {
    const response = await fetchWithAuth('/depannage/api/repair-requests/dashboard_stats/');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques:', error);
    throw error;
  }
};

// Statistiques complètes (admin seulement)
const getProjectStatistics = async () => {
  try {
    const response = await fetchWithAuth('/depannage/api/repair-requests/project_statistics/');
    return response.data;
  } catch (error) {
    console.error('Erreur lors de la récupération des statistiques complètes:', error);
    throw error;
  }
};
```

## 🛠️ Configuration

### Variables d'environnement
Les statistiques utilisent les configurations suivantes :
- `BASE_URL`: URL de base de l'API
- `FRONTEND_URL`: URL du frontend pour les redirections

### Permissions
- `dashboard_stats`: Tous les utilisateurs authentifiés
- `project_statistics`: Admins seulement
- `available_technicians`: Admins seulement

## 📊 Données Incluses

### Statistiques Utilisateurs
- Nombre total d'utilisateurs par type
- Utilisateurs actifs (30 derniers jours)
- Répartition clients/techniciens/admins

### Statistiques Demandes
- Total, en attente, en cours, terminées, annulées
- Évolution quotidienne (7 derniers jours)
- Demandes récentes (24h, 7j, 30j)

### Statistiques Financières
- Revenus totaux
- Paiements aux techniciens
- Frais de plateforme
- Méthodes de paiement

### Statistiques Techniciens
- Nombre total et vérifiés
- Taux de disponibilité
- Top techniciens par performance

### Statistiques de Satisfaction
- Note moyenne
- Taux de satisfaction
- Nombre total d'avis

### Statistiques de Sécurité
- Connexions réussies/échouées
- Alertes de sécurité
- Taux de succès

### Statistiques Géographiques
- Top villes par nombre de demandes

## 🔍 Dépannage

### Erreurs courantes

1. **401 Unauthorized**
   - Vérifiez que le token JWT est valide
   - Assurez-vous que l'utilisateur est connecté

2. **403 Forbidden**
   - Vérifiez que l'utilisateur a les permissions nécessaires
   - Pour `project_statistics`, l'utilisateur doit être admin

3. **500 Internal Server Error**
   - Vérifiez les logs Django
   - Assurez-vous que la base de données est accessible

### Logs de debug
Les statistiques incluent des logs de debug dans la console Django :
```python
print("=== project_statistics response ===")
import pprint; pprint.pprint(response_data)
```

## 📝 Notes de Développement

- Les statistiques sont calculées en temps réel
- Les requêtes sont optimisées avec des annotations Django
- Les permissions sont vérifiées au niveau de la vue
- Les données sont sérialisées avec DRF

## 🚀 Améliorations Futures

- Cache Redis pour les statistiques fréquemment demandées
- Statistiques en temps réel avec WebSockets
- Export PDF/Excel des statistiques
- Graphiques interactifs côté serveur
- Alertes automatiques basées sur les statistiques 