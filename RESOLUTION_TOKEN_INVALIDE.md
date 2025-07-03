# 🔧 Résolution du Problème "Token Invalide"

## 🚨 Problème Identifié
L'erreur "Token invalide" ou "Le token d'authentification est invalide ou expiré" indique que le token JWT a expiré ou est corrompu.

## ✅ Correctifs Appliqués

### 1. **Augmentation de la Durée de Vie des Tokens**
- **Access Token** : 20 minutes → **2 heures**
- **Refresh Token** : 1 jour → **7 jours**

### 2. **Enrichissement de l'Endpoint `/users/me/`**
- L'objet `technician` est maintenant inclus dans la réponse
- Plus besoin de requête supplémentaire pour récupérer l'ID du technicien

### 3. **Scripts de Diagnostic et Nettoyage**
- `debug_tokens.py` : Diagnostic complet des tokens
- `clean_expired_tokens.py` : Nettoyage automatique
- `restart_server.sh` : Redémarrage propre du serveur

## 🔄 Étapes de Résolution

### Étape 1 : Redémarrer le Backend
```bash
cd Backend
./restart_server.sh
```

### Étape 2 : Nettoyer le Frontend
1. **Ouvrir les DevTools** (F12)
2. **Aller dans l'onglet Application** (ou Storage)
3. **Local Storage** → `http://localhost:5173`
4. **Supprimer** les entrées :
   - `token`
   - `refreshToken`
   - `user`

### Étape 3 : Reconnecter
1. **Recharger la page** (F5)
2. **Se reconnecter** avec vos identifiants
3. **Vérifier** que la connexion fonctionne

### Étape 4 : Tester l'Assignation
1. **Aller sur le dashboard technicien**
2. **Cliquer sur "Accepter"** sur une demande
3. **Vérifier** que l'erreur a disparu

## 🛠️ Scripts Disponibles

### Diagnostic
```bash
python debug_tokens.py
```
- Vérifie la configuration JWT
- Compte les sessions et tokens
- Teste la création de tokens
- Génère un rapport détaillé

### Nettoyage
```bash
python clean_expired_tokens.py
```
- Supprime les sessions expirées
- Supprime les tokens JWT expirés
- Nettoie les anciennes notifications

### Redémarrage Complet
```bash
./restart_server.sh
```
- Arrête le serveur
- Nettoie les tokens
- Redémarre avec la nouvelle configuration

## 🔍 Vérification

### Dans la Console du Navigateur
```javascript
// Vérifier que le token existe
console.log('Token:', localStorage.getItem('token'));

// Vérifier que l'utilisateur a un objet technician
console.log('User:', JSON.parse(localStorage.getItem('user')));
```

### Dans les Logs Django
```bash
# Voir les logs en temps réel
tail -f django.log
```

## 🚀 Résultat Attendu

Après application des correctifs :
- ✅ Tokens valides pendant 2 heures
- ✅ Refresh automatique des tokens
- ✅ Objet `technician` disponible dans `user`
- ✅ Assignation de technicien fonctionnelle
- ✅ Plus d'erreurs "Token invalide"

## 📞 En Cas de Problème Persistant

1. **Vérifier les logs** : `tail -f django.log`
2. **Exécuter le diagnostic** : `python debug_tokens.py`
3. **Nettoyer complètement** : `python clean_expired_tokens.py`
4. **Redémarrer** : `./restart_server.sh`
5. **Vider le cache navigateur** complètement

## 🔒 Sécurité

Les nouvelles durées de vie des tokens sont :
- **Suffisamment longues** pour une bonne UX
- **Suffisamment courtes** pour la sécurité
- **Avec refresh automatique** pour la continuité

---

**✅ Le problème "Token invalide" devrait être résolu après ces étapes.** 