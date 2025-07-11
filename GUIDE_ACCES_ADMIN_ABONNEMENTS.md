# Guide d'Accès à la Page d'Administration des Abonnements

## 🚀 Accès Rapide

### 1. **Ouvrir le navigateur**
- Allez sur : `http://localhost:5173`

### 2. **Se connecter en tant qu'administrateur**
- Utilisez vos identifiants d'administrateur
- Ou créez un compte admin si nécessaire

### 3. **Accéder à la page des abonnements**
- **Option A** : Cliquez sur "Gestion des Abonnements" dans le menu admin
- **Option B** : Allez directement sur : `http://localhost:5173/admin/subscription-requests`

---

## 📊 Fonctionnalités Disponibles

### **Onglet "Demandes"**
- ✅ **Liste des demandes de paiement** d'abonnement des techniciens
- ✅ **Filtres** : Période, statut, technicien
- ✅ **Actions** : Approuver, Rejeter, Voir détails
- ✅ **Informations** : Nom technicien, montant, durée, statut, date

### **Onglet "Paiements"**
- ✅ **Liste des paiements CinetPay** des techniciens
- ✅ **Filtres** : Période, statut de paiement
- ✅ **Informations** : Transaction ID, montant, statut, client

### **Onglet "Statistiques"**
- ✅ **Abonnements actifs** : Nombre d'abonnements en cours
- ✅ **Demandes en attente** : Demandes non traitées
- ✅ **Paiements réussis** : Nombre de paiements validés
- ✅ **Montant total** : Revenus totaux des abonnements

---

## 🔧 Actions Disponibles

### **Sur les Demandes de Paiement :**

#### **Bouton "Approuver"** ✅
- **Action** : Valide la demande de paiement
- **Résultat** : 
  - Crée automatiquement un abonnement pour le technicien
  - Marque la demande comme "approuvée"
  - Envoie une notification au technicien
  - Met à jour les statistiques

#### **Bouton "Rejeter"** ❌
- **Action** : Rejette la demande de paiement
- **Résultat** :
  - Marque la demande comme "rejetée"
  - Envoie une notification au technicien
  - Met à jour les statistiques

#### **Bouton "Voir détails"** 👁️
- **Action** : Affiche les informations complètes
- **Informations** :
  - Détails du technicien
  - Historique des paiements
  - Notes de validation
  - Dates importantes

---

## 📈 Données Affichées

### **Demandes de Paiement :**
- **Technicien** : Nom, prénom, email
- **Montant** : Montant de l'abonnement en FCFA
- **Durée** : Nombre de mois d'abonnement
- **Statut** : En attente, Approuvé, Rejeté, Annulé
- **Date** : Date de création de la demande
- **Validateur** : Admin qui a validé/rejeté (si applicable)

### **Paiements CinetPay :**
- **Transaction ID** : Identifiant unique du paiement
- **Montant** : Montant payé
- **Statut** : En attente, Réussi, Échoué, Annulé
- **Client** : Nom et email du payeur
- **Date** : Date de création et de paiement

### **Statistiques :**
- **Abonnements actifs** : Nombre d'abonnements en cours
- **Demandes en attente** : Demandes non traitées
- **Paiements réussis** : Nombre de paiements validés
- **Montant total** : Revenus totaux des abonnements

---

## 🎯 Utilisation Pratique

### **1. Vérifier les nouvelles demandes**
- Allez sur l'onglet "Demandes"
- Filtrez par "En attente" pour voir les nouvelles demandes
- Vérifiez les informations du technicien et du paiement

### **2. Approuver une demande**
- Cliquez sur "Approuver" à côté de la demande
- Confirmez l'action
- L'abonnement sera créé automatiquement
- Le technicien recevra une notification

### **3. Rejeter une demande**
- Cliquez sur "Rejeter" à côté de la demande
- Ajoutez une note de rejet si nécessaire
- Confirmez l'action
- Le technicien recevra une notification

### **4. Consulter les statistiques**
- Allez sur l'onglet "Statistiques"
- Vérifiez les métriques importantes
- Utilisez les filtres pour analyser les tendances

### **5. Exporter les données**
- Utilisez le bouton "Export" pour télécharger les données en CSV
- Choisissez le type de données à exporter (demandes ou paiements)

---

## 🔍 Dépannage

### **Si la page ne se charge pas :**
1. Vérifiez que le backend est démarré : `./start_backend.sh`
2. Vérifiez que le frontend est démarré : `./start_frontend.sh`
3. Vérifiez votre connexion internet
4. Rafraîchissez la page

### **Si les données ne s'affichent pas :**
1. Vérifiez que vous êtes connecté en tant qu'administrateur
2. Vérifiez que les endpoints API fonctionnent
3. Consultez la console du navigateur pour les erreurs

### **Si les actions ne fonctionnent pas :**
1. Vérifiez que vous avez les permissions d'administrateur
2. Vérifiez que le backend est accessible
3. Consultez les logs du backend pour les erreurs

---

## ✅ Statut Actuel

- ✅ **Backend** : Fonctionnel (port 8000)
- ✅ **Frontend** : Fonctionnel (port 5173)
- ✅ **Endpoints API** : Tous opérationnels
- ✅ **Base de données** : 41 techniciens, 44 abonnements, 1 demande en attente
- ✅ **Logique métier** : Validation automatique, notifications, statistiques

**🎉 La page d'administration des abonnements est prête à être utilisée !** 