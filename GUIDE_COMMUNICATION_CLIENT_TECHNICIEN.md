# Guide du Système de Communication Client-Technicien

## 📋 Vue d'ensemble

Le système de communication entre client et technicien offre une interface complète et intuitive pour faciliter les échanges lors des interventions. Il combine messagerie en temps réel, partage de localisation, appels directs et fonctionnalités avancées.

## 🚀 Fonctionnalités principales

### 1. **Messagerie en temps réel**
- ✅ Messages texte instantanés
- ✅ Indicateur de frappe
- ✅ Accusés de lecture
- ✅ Historique des conversations
- ✅ Messages système automatiques

### 2. **Partage de localisation**
- ✅ Partage de position GPS
- ✅ Carte interactive intégrée
- ✅ Mise à jour en temps réel
- ✅ Calcul de distance et ETA

### 3. **Communication multimédia**
- ✅ Messages vocaux
- ✅ Envoi de photos
- ✅ Partage de fichiers
- ✅ Appels directs (téléphone)

### 4. **Actions rapides**
- ✅ Boutons d'action contextuels
- ✅ Appel direct
- ✅ Partage de position
- ✅ Prise de photo
- ✅ Enregistrement vocal

## 🏗️ Architecture technique

### Backend (Django)
```
Backend/depannage/
├── models.py
│   ├── ChatConversation
│   ├── ChatMessage
│   └── ChatMessageAttachment
├── views.py
│   ├── ChatConversationViewSet
│   ├── ChatMessageViewSet
│   ├── ChatStatsView
│   ├── SendLocationView
│   ├── VoiceMessageView
│   └── CommunicationDashboardView
├── consumers.py
│   └── ChatConsumer (WebSocket)
└── urls.py
    └── Routes de communication
```

### Frontend (React)
```
Frontend/src/
├── components/
│   ├── EnhancedCommunication.tsx
│   └── RealTimeTracking.tsx
├── pages/
│   ├── CommunicationPage.tsx
│   └── RequestTracking.tsx
└── contexts/
    ├── AuthContext.tsx
    └── fetchWithAuth.ts
```

## 🔧 Installation et configuration

### 1. **Backend - Endpoints API**

Les nouveaux endpoints sont automatiquement ajoutés :

```python
# Backend/depannage/urls.py
path("api/chat/stats/", ChatStatsView.as_view(), name="chat-stats"),
path("api/chat/messages/send_location/", SendLocationView.as_view(), name="send-location"),
path("api/chat/messages/send_voice/", VoiceMessageView.as_view(), name="send-voice"),
path("api/chat/dashboard/", CommunicationDashboardView.as_view(), name="communication-dashboard"),
```

### 2. **Frontend - Routes**

```typescript
// Frontend/src/App.tsx
<Route path="communication/:requestId" element={<PrivateRoute><CommunicationPage /></PrivateRoute>} />
```

### 3. **WebSocket - Connexions**

```typescript
// Connexion WebSocket pour chat
const ws = new WebSocket(`ws://127.0.0.1:8000/ws/chat/${conversationId}/?token=${token}`);
```

## 📱 Utilisation

### Pour le Client

1. **Accéder à la communication**
   - Depuis le dashboard client
   - Cliquer sur "Communication" pour une demande active
   - Ou naviguer vers `/communication/{requestId}`

2. **Envoyer un message**
   - Taper dans le champ de saisie
   - Appuyer sur Entrée ou cliquer sur l'icône d'envoi
   - Le message apparaît instantanément

3. **Partager sa position**
   - Cliquer sur l'icône 📍
   - Autoriser l'accès à la géolocalisation
   - La position est partagée automatiquement

4. **Actions rapides**
   - Cliquer sur l'icône 😊 pour ouvrir les actions
   - Choisir : Appel, Photo, Vocal, Fichier, etc.

### Pour le Technicien

1. **Accéder à la communication**
   - Depuis le dashboard technicien
   - Cliquer sur "Communication" pour une demande assignée
   - Ou naviguer vers `/communication/{requestId}`

2. **Répondre aux messages**
   - Voir les messages en temps réel
   - Répondre avec texte, vocal ou photo
   - Utiliser les actions rapides

3. **Partager sa position**
   - Permet au client de suivre l'intervention
   - Mise à jour automatique
   - Calcul d'ETA intégré

## 🔄 Flux de communication

### 1. **Initialisation**
```
Client crée une demande → Technicien accepte → Conversation automatique créée
```

### 2. **Échange de messages**
```
Client envoie message → WebSocket → Technicien reçoit instantanément
Technicien répond → WebSocket → Client reçoit instantanément
```

### 3. **Partage de localisation**
```
Utilisateur partage position → API + WebSocket → Autre utilisateur voit sur carte
```

### 4. **Actions rapides**
```
Utilisateur clique action → API traitée → Notification envoyée
```

## 📊 Statistiques et monitoring

### Endpoints de statistiques

```bash
# Statistiques de communication
GET /depannage/api/chat/stats/?request_id={id}

# Tableau de bord de communication
GET /depannage/api/chat/dashboard/

# Messages d'une conversation
GET /depannage/api/chat/messages/conversation_messages/?conversation_id={id}
```

### Métriques disponibles

- **Messages totaux** : Nombre de messages échangés
- **Messages non lus** : Messages non consultés
- **Temps de réponse moyen** : Réactivité des utilisateurs
- **Dernière activité** : Timestamp du dernier message
- **Conversations actives** : Nombre de conversations en cours

## 🛡️ Sécurité

### Authentification
- ✅ JWT Token requis pour toutes les API
- ✅ Vérification des permissions par conversation
- ✅ Validation des participants

### Validation des données
- ✅ Sanitisation des messages
- ✅ Validation des fichiers uploadés
- ✅ Limitation de taille des fichiers

### WebSocket Security
- ✅ Token JWT dans l'URL WebSocket
- ✅ Vérification des participants à la connexion
- ✅ Validation des messages reçus

## 🧪 Tests

### Script de test automatique

```bash
# Exécuter les tests de communication
python test_communication_system.py
```

### Tests inclus

- ✅ Endpoints API
- ✅ Connexions WebSocket
- ✅ Échange de messages
- ✅ Partage de localisation
- ✅ Messages vocaux
- ✅ Tableau de bord

## 🚨 Dépannage

### Problèmes courants

1. **WebSocket ne se connecte pas**
   ```
   Vérifier :
   - Token JWT valide
   - Serveur Django Channels actif
   - Conversation ID correct
   ```

2. **Messages non reçus**
   ```
   Vérifier :
   - Connexion WebSocket active
   - Permissions de conversation
   - Logs du serveur
   ```

3. **Localisation ne fonctionne pas**
   ```
   Vérifier :
   - Permissions navigateur
   - GPS activé
   - Connexion Internet
   ```

### Logs de débogage

```bash
# Backend - Logs Django
tail -f Backend/django.log

# Frontend - Console navigateur
F12 → Console → Voir les logs WebSocket
```

## 🔮 Améliorations futures

### Fonctionnalités prévues

1. **Appels vidéo**
   - Intégration WebRTC
   - Appels groupés
   - Enregistrement d'appels

2. **Notifications push**
   - Notifications navigateur
   - Notifications mobiles
   - Rappels automatiques

3. **IA et automatisation**
   - Réponses automatiques
   - Détection de langage
   - Suggestions de réponses

4. **Analytics avancés**
   - Temps de réponse détaillé
   - Satisfaction client
   - Performance technicien

## 📞 Support

### Contact technique
- **Email** : support@depannage-app.com
- **Téléphone** : +223 XX XX XX XX
- **Documentation** : `/docs/communication`

### Ressources
- **API Documentation** : `/api/docs`
- **Code source** : Repository GitHub
- **Tests** : `test_communication_system.py`

---

## ✅ Checklist de déploiement

- [ ] Backend : Endpoints API configurés
- [ ] Frontend : Routes ajoutées
- [ ] WebSocket : Consumers actifs
- [ ] Base de données : Migrations appliquées
- [ ] Tests : Scripts de test fonctionnels
- [ ] Documentation : Guide utilisateur disponible
- [ ] Monitoring : Logs et métriques configurés
- [ ] Sécurité : Authentification et validation
- [ ] Performance : Optimisations appliquées
- [ ] Backup : Stratégie de sauvegarde

---

*Dernière mise à jour : $(date)*
*Version : 1.0.0* 