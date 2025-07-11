# Guide de Gestion des Abonnements des Techniciens

## Vue d'ensemble

Ce guide décrit la logique complète implémentée pour gérer les demandes de paiement d'abonnement des techniciens, afficher les demandes récentes et les techniciens dans la table de paiement CinetPay.

## Architecture du Système

### 1. Modèles de Données

#### TechnicianSubscription
- **Objectif** : Gérer les abonnements actifs des techniciens
- **Champs clés** :
  - `technician` : Référence au technicien
  - `plan_name` : Nom du plan d'abonnement
  - `start_date` : Date de début
  - `end_date` : Date de fin
  - `is_active` : Statut d'activation
  - `payment` : Lien vers le paiement CinetPay (optionnel)

#### SubscriptionPaymentRequest
- **Objectif** : Gérer les demandes de paiement en attente de validation
- **Champs clés** :
  - `technician` : Référence au technicien
  - `amount` : Montant demandé
  - `duration_months` : Durée en mois
  - `status` : Statut (pending, approved, rejected, cancelled)
  - `validated_by` : Admin qui a validé
  - `validated_at` : Date de validation
  - `subscription` : Abonnement créé après validation

### 2. Interface d'Administration Django

#### TechnicianSubscriptionAdmin
- **Fonctionnalités** :
  - Liste des abonnements avec statut visuel
  - Filtres par statut, plan, dates
  - Actions en lot (activer, désactiver, prolonger)
  - Affichage des jours restants avec code couleur
  - Informations de paiement liées

#### SubscriptionPaymentRequestAdmin
- **Fonctionnalités** :
  - Liste des demandes avec statut visuel
  - Actions en lot (approuver, rejeter, annuler)
  - Validation automatique avec création d'abonnement
  - Historique des validations

### 3. API Backend (SubscriptionRequestViewSet)

#### Endpoints Principaux

##### GET `/depannage/api/subscription-requests/`
- **Fonction** : Liste des demandes avec filtres
- **Permissions** : Admin (toutes), Technicien (ses demandes)
- **Filtres** : status, technician, date

##### POST `/depannage/api/subscription-requests/`
- **Fonction** : Créer une nouvelle demande
- **Validation** :
  - Vérification absence de demande en attente
  - Vérification absence d'abonnement actif
  - Validation des données

##### GET `/depannage/api/subscription-requests/recent_requests/`
- **Fonction** : Demandes récentes avec statistiques
- **Paramètres** : days, status
- **Retour** : Liste + statistiques (total, pending, approved, rejected, montants)

##### GET `/depannage/api/subscription-requests/technician_payments/`
- **Fonction** : Paiements CinetPay des techniciens
- **Paramètres** : days, status, technician_id
- **Retour** : Liste + statistiques des paiements

##### GET `/depannage/api/subscription-requests/dashboard_stats/`
- **Fonction** : Statistiques complètes du dashboard
- **Retour** : Statistiques abonnements, demandes, paiements

##### POST `/depannage/api/subscription-requests/{id}/validate_payment/`
- **Fonction** : Valider une demande (approve/reject)
- **Logique** :
  - Vérification statut pending
  - Si approve : création/prolongation abonnement
  - Notification au technicien
  - Mise à jour demande

### 4. Interface Frontend (AdminSubscriptionRequests)

#### Fonctionnalités Principales

##### Dashboard avec Statistiques
- **Abonnements actifs** : Nombre d'abonnements en cours
- **Demandes en attente** : Demandes à traiter
- **Paiements réussis** : Paiements CinetPay validés
- **Montant total** : Somme des paiements réussis

##### Onglets de Navigation
1. **Demandes** : Liste des demandes de paiement
2. **Paiements** : Liste des paiements CinetPay
3. **Statistiques** : Vue détaillée des statistiques

##### Filtres Avancés
- **Période** : 7, 30, 90 jours
- **Statut** : pending, approved, rejected, cancelled
- **Statut paiement** : pending, success, failed, cancelled
- **Recherche** : Par nom de technicien

##### Actions sur les Demandes
- **Voir détails** : Modal avec informations complètes
- **Approuver** : Création/prolongation abonnement
- **Rejeter** : Refus avec notes
- **Notes** : Commentaires de validation

##### Export de Données
- **CSV** : Export des demandes ou paiements
- **Format** : Données structurées pour analyse

## Logique de Validation des Abonnements

### 1. Vérifications Préalables

```python
# Vérification demande en attente
existing_pending = SubscriptionPaymentRequest.objects.filter(
    technician=technician,
    status='pending'
).exists()

# Vérification abonnement actif
active_subscription = technician.subscriptions.filter(
    end_date__gt=timezone.now(),
    is_active=True
).exists()
```

### 2. Logique d'Approbation

```python
if action == 'approve':
    # Vérifier abonnement existant
    active_subscription = technician.subscriptions.filter(
        end_date__gt=timezone.now(),
        is_active=True
    ).first()
    
    if active_subscription:
        # Prolonger l'abonnement existant
        active_subscription.end_date += timedelta(days=30 * duration_months)
        active_subscription.save()
    else:
        # Créer un nouvel abonnement
        end_date = timezone.now() + timedelta(days=30 * duration_months)
        subscription = TechnicianSubscription.objects.create(
            technician=technician,
            plan_name=f"Plan {duration_months} mois",
            start_date=timezone.now(),
            end_date=end_date,
            is_active=True
        )
    
    # Mettre à jour la demande
    payment_request.status = 'approved'
    payment_request.subscription = subscription
    payment_request.save()
    
    # Notification au technicien
    Notification.objects.create(
        recipient=technician.user,
        type='subscription_approved',
        title='Abonnement approuvé',
        message=f'Votre demande d\'abonnement de {amount} FCFA a été approuvée.'
    )
```

### 3. Gestion des Notifications

- **Approbation** : Notification de succès avec détails
- **Rejet** : Notification avec raison du rejet
- **Expiration** : Alertes automatiques avant expiration

## Intégration avec CinetPay

### 1. Traitement des Notifications CinetPay

```python
# Dans CinetPayNotificationAPIView
if status == "ACCEPTED":
    # Activation abonnement technicien
    technician = get_technician_profile(user)
    if technician:
        duration_months = metadata.get("duration_months", 1)
        
        # Vérifier abonnement existant
        active_sub = technician.subscriptions.filter(
            end_date__gt=timezone.now(),
            is_active=True
        ).first()
        
        if active_sub:
            # Prolonger l'abonnement
            active_sub.end_date += timedelta(days=30 * duration_months)
            active_sub.save()
        else:
            # Créer nouvel abonnement
            end_date = timezone.now() + timedelta(days=30 * duration_months)
            subscription = TechnicianSubscription.objects.create(
                technician=technician,
                plan_name=f"Plan {duration_months} mois",
                start_date=timezone.now(),
                end_date=end_date,
                is_active=True,
                payment=payment
            )
```

### 2. Synchronisation des Données

- **Paiements réussis** : Création automatique d'abonnement
- **Paiements échoués** : Pas d'action sur l'abonnement
- **Idempotence** : Éviter les doublons

## Sécurité et Permissions

### 1. Contrôle d'Accès

- **Admin** : Accès complet à toutes les fonctionnalités
- **Technicien** : Accès limité à ses propres données
- **Validation** : Seuls les admins peuvent approuver/rejeter

### 2. Validation des Données

- **Montants** : Validation des montants positifs
- **Durées** : Validation des durées raisonnables
- **Statuts** : Validation des transitions d'état

## Monitoring et Alertes

### 1. Statistiques en Temps Réel

- **Abonnements actifs** : Nombre et pourcentage
- **Demandes en attente** : Temps moyen de traitement
- **Taux de conversion** : Demandes approuvées vs total
- **Revenus** : Montants totaux et tendances

### 2. Alertes Automatiques

- **Expiration proche** : Alertes 7 jours avant expiration
- **Demandes en attente** : Notifications aux admins
- **Paiements échoués** : Alertes pour investigation

## Tests et Validation

### 1. Script de Test

Le fichier `test_subscription_management.py` permet de :
- Vérifier les statistiques générales
- Tester la logique de validation
- Simuler des scénarios d'approbation/rejet
- Valider l'intégration CinetPay

### 2. Cas d'Usage Testés

- ✅ Création de nouvelle demande
- ✅ Validation avec abonnement existant
- ✅ Validation avec nouvel abonnement
- ✅ Rejet de demande
- ✅ Prolongation d'abonnement
- ✅ Notifications automatiques

## Déploiement et Maintenance

### 1. Commandes de Déploiement

```bash
# Appliquer les migrations
python manage.py makemigrations
python manage.py migrate

# Créer un superuser pour l'admin
python manage.py createsuperuser

# Tester la logique
python test_subscription_management.py
```

### 2. Monitoring Continu

- **Logs** : Surveillance des erreurs de validation
- **Métriques** : Suivi des performances
- **Backup** : Sauvegarde régulière des données

## Conclusion

Cette implémentation fournit une solution complète et robuste pour :

1. **Gérer les demandes de paiement** avec validation admin
2. **Afficher les demandes récentes** avec filtres avancés
3. **Intégrer les paiements CinetPay** des techniciens
4. **Fournir des statistiques détaillées** pour le monitoring
5. **Assurer la sécurité** et les permissions appropriées

La logique est extensible et peut être adaptée aux besoins futurs de l'application. 