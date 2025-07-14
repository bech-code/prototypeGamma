# Guide d'Adaptation de la Base de Données

## Vue d'ensemble

Ce guide détaille l'adaptation de la base de données backend pour accueillir les nouvelles fonctionnalités de communication client-technicien, incluant la messagerie avancée, le partage de localisation, les messages vocaux, et les statistiques de communication.

## 🎯 Objectifs

### Fonctionnalités Principales
- **Messagerie avancée** : Messages texte, vocaux, images, fichiers
- **Partage de localisation** : Envoi de coordonnées GPS
- **Statistiques de communication** : Métriques de performance
- **Sessions de communication** : Suivi des sessions utilisateur
- **Notifications spécialisées** : Notifications spécifiques à la communication
- **Paramètres personnalisés** : Configuration par utilisateur

### Améliorations Techniques
- **Index de performance** : Optimisation des requêtes
- **Contraintes d'intégrité** : Validation des données
- **Métadonnées enrichies** : Informations détaillées sur les messages
- **Gestion des médias** : Support des fichiers audio/vidéo

## 📊 Structure de la Base de Données

### Modèles Principaux

#### 1. ChatConversation (Conversation de Chat)
```sql
-- Table: depannage_chatconversation
- id (Primary Key)
- client_id (Foreign Key -> User)
- technician_id (Foreign Key -> User)
- request_id (Foreign Key -> RepairRequest, nullable)
- is_active (Boolean)
- last_message_at (DateTime, nullable)
- is_pinned (Boolean) -- NOUVEAU
- muted_until (DateTime, nullable) -- NOUVEAU
- last_activity_type (CharField) -- NOUVEAU
- created_at, updated_at (Timestamps)
```

#### 2. ChatMessage (Message de Chat)
```sql
-- Table: depannage_chatmessage
- id (Primary Key)
- conversation_id (Foreign Key -> ChatConversation)
- sender_id (Foreign Key -> User)
- content (TextField)
- message_type (CharField: text, image, file, system, location, voice, video)
- is_read (Boolean)
- read_at (DateTime, nullable)
- latitude, longitude (FloatField, nullable) -- Pour messages de localisation
- voice_duration (Integer, nullable) -- NOUVEAU: Durée messages vocaux
- is_edited (Boolean) -- NOUVEAU: Indique si modifié
- edited_at (DateTime, nullable) -- NOUVEAU: Date de modification
- reply_to_id (Foreign Key -> ChatMessage, nullable) -- NOUVEAU: Réponse à un message
- created_at, updated_at (Timestamps)
```

#### 3. ChatMessageAttachment (Pièce Jointe)
```sql
-- Table: depannage_chatmessageattachment
- id (Primary Key)
- message_id (Foreign Key -> ChatMessage)
- file (FileField)
- file_name (CharField)
- file_size (Integer)
- content_type (CharField)
- duration (Integer, nullable) -- NOUVEAU: Durée audio/vidéo
- thumbnail (ImageField, nullable) -- NOUVEAU: Miniature
- is_processed (Boolean) -- NOUVEAU: Statut de traitement
- created_at, updated_at (Timestamps)
```

### Nouveaux Modèles

#### 4. CommunicationStats (Statistiques)
```sql
-- Table: depannage_communicationstats
- id (Primary Key)
- conversation_id (Foreign Key -> ChatConversation)
- total_messages (Integer)
- text_messages (Integer)
- voice_messages (Integer)
- location_shares (Integer)
- file_shares (Integer)
- avg_response_time_minutes (Float)
- last_message_at, first_message_at (DateTime, nullable)
- client_online_time, technician_online_time (Integer)
- created_at, updated_at (Timestamps)
```

#### 5. CommunicationSession (Session)
```sql
-- Table: depannage_communicationsession
- id (Primary Key)
- conversation_id (Foreign Key -> ChatConversation)
- user_id (Foreign Key -> User)
- started_at (DateTime)
- ended_at (DateTime, nullable)
- messages_sent, messages_received (Integer)
- is_active (Boolean)
- device_info (JSONField)
- ip_address (GenericIPAddressField, nullable)
- created_at, updated_at (Timestamps)
```

#### 6. CommunicationNotification (Notifications)
```sql
-- Table: depannage_communicationnotification
- id (Primary Key)
- recipient_id (Foreign Key -> User)
- conversation_id (Foreign Key -> ChatConversation)
- notification_type (CharField)
- title (CharField)
- message (TextField)
- is_read (Boolean)
- read_at (DateTime, nullable)
- extra_data (JSONField)
- created_at, updated_at (Timestamps)
```

#### 7. CommunicationSettings (Paramètres)
```sql
-- Table: depannage_communicationsettings
- id (Primary Key)
- user_id (OneToOne -> User)
- auto_read_receipts (Boolean)
- typing_indicators (Boolean)
- sound_notifications (Boolean)
- vibration_notifications (Boolean)
- message_preview (Boolean)
- auto_download_media (Boolean)
- max_file_size_mb (Integer)
- allowed_file_types (JSONField)
- quiet_hours_start, quiet_hours_end (TimeField, nullable)
- language (CharField)
- theme (CharField)
- created_at, updated_at (Timestamps)
```

## 🔧 Migrations

### Migration 10004: Enhance Communication System

```python
# Fichier: Backend/depannage/migrations/10004_enhance_communication_system.py

# Améliorations ChatMessage
- voice_duration (Integer, nullable)
- is_edited (Boolean)
- edited_at (DateTime, nullable)
- reply_to (ForeignKey -> ChatMessage, nullable)

# Améliorations ChatConversation
- is_pinned (Boolean)
- muted_until (DateTime, nullable)
- last_activity_type (CharField)

# Améliorations ChatMessageAttachment
- duration (Integer, nullable)
- thumbnail (ImageField, nullable)
- is_processed (Boolean)

# Nouveaux modèles
- CommunicationStats
- CommunicationSession
- CommunicationNotification
- CommunicationSettings

# Index de performance
- chat_message_conv_created_idx
- chat_message_sender_created_idx
- chat_message_read_sender_idx
- chat_conv_client_last_msg_idx
- chat_conv_tech_last_msg_idx
- chat_conv_active_last_msg_idx
- comm_session_user_active_idx
- comm_notif_recipient_read_idx

# Contraintes d'intégrité
- voice_duration_positive
- location_coords_only_for_location_messages
- location_coords_only_for_location_messages_long
```

## 📈 Index de Performance

### Index Principaux

```sql
-- Messages par conversation et date
CREATE INDEX chat_message_conv_created_idx 
ON depannage_chatmessage (conversation_id, created_at);

-- Messages par expéditeur et date
CREATE INDEX chat_message_sender_created_idx 
ON depannage_chatmessage (sender_id, created_at);

-- Messages non lus par expéditeur
CREATE INDEX chat_message_read_sender_idx 
ON depannage_chatmessage (is_read, sender_id);

-- Conversations par client et dernier message
CREATE INDEX chat_conv_client_last_msg_idx 
ON depannage_chatconversation (client_id, last_message_at);

-- Conversations par technicien et dernier message
CREATE INDEX chat_conv_tech_last_msg_idx 
ON depannage_chatconversation (technician_id, last_message_at);

-- Conversations actives par dernier message
CREATE INDEX chat_conv_active_last_msg_idx 
ON depannage_chatconversation (is_active, last_message_at);

-- Sessions actives par utilisateur
CREATE INDEX comm_session_user_active_idx 
ON depannage_communicationsession (user_id, is_active);

-- Notifications non lues par destinataire
CREATE INDEX comm_notif_recipient_read_idx 
ON depannage_communicationnotification (recipient_id, is_read);
```

## 🔒 Contraintes d'Intégrité

### Contraintes de Validation

```sql
-- Durée vocale positive
ALTER TABLE depannage_chatmessage 
ADD CONSTRAINT voice_duration_positive 
CHECK (voice_duration IS NULL OR voice_duration >= 1);

-- Coordonnées uniquement pour messages de localisation
ALTER TABLE depannage_chatmessage 
ADD CONSTRAINT location_coords_only_for_location_messages 
CHECK (message_type = 'location' OR latitude IS NULL);

ALTER TABLE depannage_chatmessage 
ADD CONSTRAINT location_coords_only_for_location_messages_long 
CHECK (message_type = 'location' OR longitude IS NULL);
```

## 🚀 Installation et Configuration

### 1. Prérequis

```bash
# Vérifier que Django est installé
pip install django

# Vérifier les dépendances
pip install -r requirements.txt
```

### 2. Application des Migrations

```bash
# Aller dans le répertoire backend
cd Backend

# Créer les migrations
python manage.py makemigrations

# Appliquer les migrations
python manage.py migrate

# Vérifier le statut
python manage.py showmigrations
```

### 3. Test des Migrations

```bash
# Exécuter le script de test
python test_database_migrations.py
```

### 4. Création d'un Superuser (Optionnel)

```bash
python manage.py createsuperuser
```

## 📊 Tests et Validation

### Tests Automatisés

Le script `test_database_migrations.py` effectue les tests suivants :

1. **Vérification des modèles** : Confirme l'existence des nouveaux modèles
2. **Création d'objets** : Teste la création de conversations, messages, etc.
3. **Fonctionnalités avancées** : Teste les méthodes personnalisées
4. **Contraintes de base de données** : Vérifie les contraintes d'intégrité
5. **Index de performance** : Teste les requêtes optimisées
6. **Nettoyage** : Supprime les données de test

### Tests Manuels

```python
# Test de création d'une conversation
from depannage.models import ChatConversation, User

client = User.objects.get(username='client_username')
technician = User.objects.get(username='technician_username')

conversation = ChatConversation.objects.create(
    client=client,
    technician=technician,
    is_active=True
)

# Test de création d'un message
from depannage.models import ChatMessage

message = ChatMessage.objects.create(
    conversation=conversation,
    sender=client,
    content='Test message',
    message_type='text'
)

# Test des paramètres de communication
from depannage.models import CommunicationSettings

settings = CommunicationSettings.objects.create(
    user=client,
    auto_read_receipts=True,
    typing_indicators=True,
    sound_notifications=True
)
```

## 🔧 Administration Django

### Interface d'Administration

Tous les nouveaux modèles sont disponibles dans l'interface d'administration Django :

- **ChatConversation** : Gestion des conversations
- **ChatMessage** : Gestion des messages avec aperçu du contenu
- **ChatMessageAttachment** : Gestion des pièces jointes
- **CommunicationStats** : Statistiques de communication
- **CommunicationSession** : Sessions de communication
- **CommunicationNotification** : Notifications spécialisées
- **CommunicationSettings** : Paramètres utilisateur

### Filtres et Recherche

```python
# Exemple de filtrage dans l'admin
class ChatMessageAdmin(admin.ModelAdmin):
    list_filter = ['message_type', 'is_read', 'is_edited', 'created_at']
    search_fields = ['content', 'sender__first_name', 'sender__last_name']
    ordering = ['-created_at']
```

## 📈 Métriques et Monitoring

### Statistiques de Performance

```sql
-- Messages par type
SELECT message_type, COUNT(*) as count
FROM depannage_chatmessage
GROUP BY message_type;

-- Temps de réponse moyen
SELECT AVG(avg_response_time_minutes) as avg_response
FROM depannage_communicationstats;

-- Sessions actives
SELECT COUNT(*) as active_sessions
FROM depannage_communicationsession
WHERE is_active = true;

-- Notifications non lues
SELECT COUNT(*) as unread_notifications
FROM depannage_communicationnotification
WHERE is_read = false;
```

### Requêtes d'Optimisation

```sql
-- Conversations récentes avec dernier message
SELECT 
    cc.id,
    cc.client_id,
    cc.technician_id,
    cc.last_message_at,
    cm.content as last_message_content
FROM depannage_chatconversation cc
LEFT JOIN depannage_chatmessage cm ON cm.id = (
    SELECT id FROM depannage_chatmessage 
    WHERE conversation_id = cc.id 
    ORDER BY created_at DESC 
    LIMIT 1
)
WHERE cc.is_active = true
ORDER BY cc.last_message_at DESC;

-- Messages non lus par utilisateur
SELECT 
    sender_id,
    COUNT(*) as unread_count
FROM depannage_chatmessage
WHERE is_read = false
GROUP BY sender_id;
```

## 🔒 Sécurité et Permissions

### Permissions Utilisateur

```python
# Permissions pour les conversations
- view_chatconversation
- add_chatconversation
- change_chatconversation
- delete_chatconversation

# Permissions pour les messages
- view_chatmessage
- add_chatmessage
- change_chatmessage
- delete_chatmessage

# Permissions pour les paramètres
- view_communicationsettings
- add_communicationsettings
- change_communicationsettings
- delete_communicationsettings
```

### Validation des Données

```python
# Validation des coordonnées GPS
def validate_coordinates(latitude, longitude):
    if not (-90 <= latitude <= 90):
        raise ValidationError("Latitude invalide")
    if not (-180 <= longitude <= 180):
        raise ValidationError("Longitude invalide")

# Validation des fichiers
def validate_file_size(file, max_size_mb=10):
    if file.size > max_size_mb * 1024 * 1024:
        raise ValidationError(f"Fichier trop volumineux (max {max_size_mb}MB)")
```

## 🚨 Dépannage

### Problèmes Courants

#### 1. Erreur de Migration
```bash
# Solution : Réinitialiser les migrations
python manage.py migrate depannage zero
python manage.py migrate depannage
```

#### 2. Erreur de Contrainte
```sql
-- Vérifier les contraintes
SELECT * FROM information_schema.table_constraints 
WHERE table_name = 'depannage_chatmessage';
```

#### 3. Problème de Performance
```sql
-- Analyser les requêtes lentes
EXPLAIN ANALYZE SELECT * FROM depannage_chatmessage 
WHERE conversation_id = 1 ORDER BY created_at DESC;
```

### Logs et Debugging

```python
# Activer les logs SQL
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
        },
    },
    'loggers': {
        'django.db.backends': {
            'handlers': ['console'],
            'level': 'DEBUG',
        },
    },
}
```

## 📚 Ressources Additionnelles

### Documentation
- [Django Models Documentation](https://docs.djangoproject.com/en/stable/topics/db/models/)
- [Django Migrations](https://docs.djangoproject.com/en/stable/topics/migrations/)
- [PostgreSQL Indexes](https://www.postgresql.org/docs/current/indexes.html)

### Outils Utiles
- **Django Debug Toolbar** : Pour analyser les requêtes
- **Django Extensions** : Pour des commandes de gestion avancées
- **psycopg2** : Driver PostgreSQL pour Python

## ✅ Checklist de Validation

- [ ] Migrations appliquées avec succès
- [ ] Tous les nouveaux modèles créés
- [ ] Index de performance créés
- [ ] Contraintes d'intégrité appliquées
- [ ] Tests automatisés passés
- [ ] Interface d'administration configurée
- [ ] Permissions utilisateur définies
- [ ] Documentation mise à jour
- [ ] Sauvegarde de la base de données effectuée

## 🎯 Prochaines Étapes

1. **Tests d'intégration** : Tester avec l'application frontend
2. **Optimisation des performances** : Monitorer les requêtes lentes
3. **Sauvegarde automatique** : Mettre en place des sauvegardes régulières
4. **Monitoring** : Implémenter des alertes sur les erreurs
5. **Documentation utilisateur** : Créer des guides pour les utilisateurs finaux

---

**Note** : Cette adaptation de la base de données est conçue pour être évolutive et maintenable. Toutes les nouvelles fonctionnalités sont compatibles avec l'existant et peuvent être étendues selon les besoins futurs. 