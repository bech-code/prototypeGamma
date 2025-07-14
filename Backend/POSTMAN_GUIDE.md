# 🚀 Guide Postman - API DepanneTeliman

> **ℹ️ Tous les comptes de test utilisent le mot de passe universel : `bechir66312345`**
> 
> **Admin spécial recommandé pour les tests :**
> - Nom d'utilisateur : `depan_use`
> - Email : `mohamedbechirdiarra4@gmail.com`
> - Mot de passe : `bechir66312345`

Ce guide vous aide à configurer Postman pour tester l'API DepanneTeliman.

## 📥 **Import de la Collection Postman**

### 1. Créer une nouvelle Collection
- Ouvrez Postman
- Cliquez sur "New" → "Collection"
- Nommez-la "DepanneTeliman API"

### 2. Variables d'Environnement
Créez un environnement avec ces variables :
```
BASE_URL: http://127.0.0.1:8000
TOKEN: (vide au début)
REFRESH_TOKEN: (vide au début)
```

## 🔧 **Configuration des Tests**

### 1. Test de Santé de l'API
**URL :** `{{BASE_URL}}/depannage/api/test/health_check/`
**Méthode :** GET
**Headers :** Aucun

**Test Script :**
```javascript
pm.test("Status code is 200", function () {
    pm.response.to.have.status(200);
});

pm.test("API is healthy", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.status).to.eql("healthy");
});
```

### 2. Informations de l'API
**URL :** `{{BASE_URL}}/depannage/api/test/api_info/`
**Méthode :** GET
**Headers :** Aucun

## 🔐 **Authentification**

### 1. Connexion (Login)
**URL :** `{{BASE_URL}}/users/login/`
**Méthode :** POST
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
    "username": "depan_use",
    "email": "mohamedbechirdiarra4@gmail.com",
    "password": "bechir66312345"
}
```

**Test Script :**
```javascript
pm.test("Login successful", function () {
    pm.response.to.have.status(200);
});

if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("TOKEN", jsonData.access);
    pm.environment.set("REFRESH_TOKEN", jsonData.refresh);
    console.log("Token saved:", jsonData.access);
}
```

### 2. Inscription (Register)
**URL :** `{{BASE_URL}}/users/register/`
**Méthode :** POST
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
    "username": "testuser",
    "email": "test@example.com",
    "password": "motdepasse123",
    "password2": "motdepasse123",
    "user_type": "client",
    "first_name": "Test",
    "last_name": "User",
    "address": "123 Test Street",
    "phone_number": "+22500000000"
}
```

### 3. Rafraîchir le Token
**URL :** `{{BASE_URL}}/users/refresh_token/`
**Méthode :** POST
**Headers :**
```
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
    "refresh": "{{REFRESH_TOKEN}}"
}
```

**Test Script :**
```javascript
if (pm.response.code === 200) {
    var jsonData = pm.response.json();
    pm.environment.set("TOKEN", jsonData.access);
    console.log("Token refreshed:", jsonData.access);
}
```

## 👤 **Routes Protégées**

### 1. Profil Utilisateur
**URL :** `{{BASE_URL}}/users/me/`
**Méthode :** GET
**Headers :**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

### 2. Demandes de Réparation
**URL :** `{{BASE_URL}}/depannage/api/repair-requests/`
**Méthode :** GET
**Headers :**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

### 3. Créer une Demande
**URL :** `{{BASE_URL}}/depannage/api/repair-requests/`
**Méthode :** POST
**Headers :**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

**Body (raw JSON) :**
```json
{
    "title": "Réparation fuite d'eau",
    "description": "Fuite sous l'évier de la cuisine",
    "specialty_needed": "plumber",
    "address": "123 Rue de la Paix, Abidjan",
    "priority": "high",
    "estimated_price": 150.00
}
```

### 4. Techniciens Disponibles
**URL :** `{{BASE_URL}}/depannage/api/repair-requests/available_technicians/`
**Méthode :** GET
**Headers :**
```
Authorization: Bearer {{TOKEN}}
Content-Type: application/json
```

## 🔄 **Tests Automatisés**

### Script de Test Global
Ajoutez ce script dans la collection (Tests tab) :

```javascript
// Vérifier que le token est présent pour les routes protégées
if (pm.request.headers.has("Authorization")) {
    pm.test("Token is present", function () {
        var token = pm.environment.get("TOKEN");
        pm.expect(token).to.not.be.empty;
    });
}

// Vérifier le temps de réponse
pm.test("Response time is less than 2000ms", function () {
    pm.expect(pm.response.responseTime).to.be.below(2000);
});

// Vérifier le format JSON
pm.test("Response is JSON", function () {
    pm.response.to.be.json;
});
```

## 📊 **Tests de Performance**

### 1. Test de Charge Simple
**URL :** `{{BASE_URL}}/depannage/api/test/health_check/`
**Méthode :** GET
**Tests :**
```javascript
pm.test("Response time is acceptable", function () {
    pm.expect(pm.response.responseTime).to.be.below(1000);
});
```

## 🚨 **Gestion d'Erreurs**

### Test d'Erreur 401
**URL :** `{{BASE_URL}}/users/me/`
**Méthode :** GET
**Headers :** Aucun (pas de token)

**Test Script :**
```javascript
pm.test("Unauthorized access", function () {
    pm.response.to.have.status(401);
});

pm.test("Error message", function () {
    var jsonData = pm.response.json();
    pm.expect(jsonData.detail).to.include("Authentication credentials");
});
```

## 📝 **Checklist de Test**

### Routes Publiques
- [ ] `/depannage/api/test/health_check/` - Status 200
- [ ] `/depannage/api/test/api_info/` - Informations API
- [ ] `/admin/` - Interface d'administration

### Authentification
- [ ] Login avec email/mot de passe
- [ ] Register nouvel utilisateur
- [ ] Refresh token automatique
- [ ] Logout (suppression token)

### Routes Protégées
- [ ] Profil utilisateur (`/users/me/`)
- [ ] Liste des demandes (`/repair-requests/`)
- [ ] Créer une demande
- [ ] Techniciens disponibles
- [ ] Statistiques dashboard

### Gestion d'Erreurs
- [ ] Token invalide → 401
- [ ] Token expiré → 401
- [ ] Données invalides → 400
- [ ] Route inexistante → 404

## 🔧 **Dépannage**

### Problèmes Courants

1. **Erreur 401** : Vérifiez que le token est bien défini dans les variables d'environnement
2. **Erreur CORS** : Vérifiez que le serveur Django tourne sur `http://127.0.0.1:8000`
3. **Token expiré** : Utilisez l'endpoint de refresh token
4. **Erreur de connexion** : Vérifiez que le serveur Django est démarré

### Commandes Utiles
```bash
# Démarrer le serveur
python manage.py runserver

# Vérifier la configuration
python manage.py check

# Créer un superuser
python manage.py createsuperuser
```

---

**🎯 Objectif :** Tester toutes les fonctionnalités de l'API avant de les utiliser dans le frontend. 