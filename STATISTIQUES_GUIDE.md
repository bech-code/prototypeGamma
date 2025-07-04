# 📊 Guide des Statistiques du Projet DepanneTeliman

## 🎯 Vue d'ensemble

La page de statistiques offre une vue complète et détaillée des performances de la plateforme DepanneTeliman, accessible uniquement aux administrateurs.

## 🚀 Comment accéder aux statistiques

### Depuis la page d'accueil admin :
1. Connectez-vous en tant qu'administrateur
2. Accédez à la page d'accueil admin (`/admin`)
3. Cliquez sur la carte **"Statistiques"** dans la section héro
4. Ou cliquez sur **"Voir les Statistiques"** dans la section "Actions Rapides"

### URL directe :
```
/admin/statistics
```

## 📈 Sections disponibles

### 1. Vue d'ensemble
- **Utilisateurs totaux** : Nombre total d'utilisateurs inscrits
- **Demandes totales** : Nombre total de demandes de dépannage
- **Revenus totaux** : Chiffre d'affaires de la plateforme
- **Note moyenne** : Satisfaction client globale

### 2. Graphiques interactifs
- **Évolution des demandes** : Graphique linéaire sur 7 jours
- **Répartition par spécialité** : Graphique circulaire des spécialités

### 3. Statistiques détaillées
- **Demandes** : Répartition par statut (en attente, en cours, terminées, annulées)
- **Techniciens** : Nombre total, vérifiés, disponibles, taux de disponibilité
- **Sécurité** : Connexions réussies/échouées, alertes, taux de succès

### 4. Top performers
- **Top techniciens** : Tableau des meilleurs techniciens avec leurs performances
- **Top villes** : Graphique en barres des villes les plus actives
- **Méthodes de paiement** : Répartition des paiements par méthode

## 🔧 Endpoint API

### URL de l'endpoint :
```
GET /depannage/api/repair-requests/project_statistics/
```

### Authentification :
- Token JWT requis
- Accès réservé aux administrateurs

### Réponse JSON :
```json
{
  "overview": {
    "total_users": 41,
    "total_clients": 5,
    "total_technicians": 33,
    "total_admins": 2,
    "active_users_30d": 15,
    "total_requests": 172,
    "completed_requests": 14,
    "total_revenue": 0.0,
    "platform_fees": 0.0,
    "avg_rating": 0.0,
    "satisfaction_rate": 0.0
  },
  "requests": {
    "total": 172,
    "pending": 45,
    "in_progress": 12,
    "completed": 14,
    "cancelled": 101,
    "recent_24h": 2,
    "recent_7d": 8,
    "recent_30d": 25,
    "daily_evolution": [...]
  },
  "financial": {...},
  "specialties": {...},
  "technicians": {...},
  "satisfaction": {...},
  "security": {...},
  "geography": {...}
}
```

## 📊 Métriques calculées

### Utilisateurs
- Total par type (clients, techniciens, admins)
- Utilisateurs actifs sur 30 jours
- Taux d'engagement

### Demandes
- Répartition par statut
- Évolution temporelle (24h, 7j, 30j)
- Taux de completion

### Financier
- Revenus totaux
- Paiements aux techniciens
- Frais de plateforme
- Répartition par méthode de paiement

### Performance
- Top techniciens par nombre de travaux
- Notes moyennes et satisfaction
- Taux de disponibilité

### Sécurité
- Connexions réussies/échouées
- Alertes de sécurité
- Taux de succès d'authentification

### Géographie
- Top villes par activité
- Répartition géographique des demandes

## 🎨 Interface utilisateur

### Design responsive
- Adaptation automatique aux différentes tailles d'écran
- Graphiques interactifs avec tooltips
- Navigation intuitive

### Couleurs et icônes
- **Bleu** : Utilisateurs et informations générales
- **Vert** : Demandes et succès
- **Jaune** : Revenus et finances
- **Violet** : Notes et satisfaction
- **Orange** : Alertes et sécurité

### Graphiques utilisés
- **LineChart** : Évolution temporelle
- **PieChart** : Répartition par catégorie
- **BarChart** : Comparaisons
- **ResponsiveContainer** : Adaptation automatique

## 🔒 Sécurité

### Contrôles d'accès
- Authentification JWT obligatoire
- Vérification du type d'utilisateur (admin uniquement)
- Protection contre les accès non autorisés

### Données sensibles
- Aucune information personnelle exposée
- Agrégation des données pour la confidentialité
- Filtrage des données selon les permissions

## 🚀 Utilisation recommandée

### Pour les administrateurs
1. **Surveillance quotidienne** : Vérifier les métriques clés
2. **Analyse hebdomadaire** : Examiner les tendances
3. **Rapports mensuels** : Évaluer les performances globales

### Actions basées sur les données
- **Taux de completion faible** → Améliorer l'assignation des techniciens
- **Satisfaction en baisse** → Former les techniciens
- **Alertes de sécurité** → Renforcer la sécurité
- **Revenus stagnants** → Optimiser les tarifs

## 🔧 Maintenance

### Mise à jour des données
- Données en temps réel
- Calculs automatiques
- Pas d'intervention manuelle requise

### Performance
- Requêtes optimisées avec agrégation
- Cache automatique de Django
- Pagination pour les grandes listes

## 📝 Notes techniques

### Technologies utilisées
- **Backend** : Django REST Framework
- **Frontend** : React + TypeScript + Recharts
- **Base de données** : PostgreSQL (via Django ORM)
- **Authentification** : JWT

### Optimisations
- Requêtes avec `select_related` et `prefetch_related`
- Agrégation au niveau base de données
- Pagination pour les grandes listes
- Cache des calculs coûteux

---

*Ce guide est mis à jour automatiquement avec les nouvelles fonctionnalités.* 