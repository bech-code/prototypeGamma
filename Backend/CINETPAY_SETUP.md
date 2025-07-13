# 🚀 Guide de Configuration CinetPay

Ce guide vous aide à configurer CinetPay selon la documentation officielle pour votre application de services à domicile.

## 📋 Prérequis

1. **Compte CinetPay actif** avec API Key et Site ID
2. **Devise autorisée** pour votre compte (XOF, XAF, CDF, GNF, USD)
3. **URLs valides** pour les notifications et retours

## ⚙️ Configuration

### 1. Mise à jour de `settings.py`

Remplacez les valeurs dans `Backend/auth/settings.py` :

```python
# Configuration CinetPay
CINETPAY_CONFIG = {
    'API_KEY': 'VOTRE_VRAIE_API_KEY',  # Remplacez par votre vraie API key
    'SITE_ID': 'VOTRE_VRAI_SITE_ID',   # Remplacez par votre vrai Site ID
    'API_URL': 'https://api-checkout.cinetpay.com/v2/payment',
    'CURRENCY': 'XOF',  # Devise autorisée pour votre compte
    'LANG': 'fr',       # Langue par défaut
    'MODE': 'TEST',     # TEST ou PRODUCTION
}

# URLs pour CinetPay (IMPORTANT: Utilisez 127.0.0.1 au lieu de localhost)
BASE_URL = 'http://127.0.0.1:8000'      # URL de votre backend Django
FRONTEND_URL = 'http://127.0.0.1:5173'  # URL de votre frontend React
```

### 2. Paramètres obligatoires selon la documentation

✅ **Paramètres requis :**
- `apikey` : Votre clé API CinetPay
- `site_id` : Votre ID de site CinetPay
- `transaction_id` : Identifiant unique de la transaction
- `amount` : Montant (doit être un multiple de 5)
- `currency` : Devise (XOF, XAF, CDF, GNF, USD)
- `description` : Description du paiement
- `notify_url` : URL de notification webhook
- `return_url` : URL de retour après paiement
- `channels` : Méthodes de paiement (ALL, MOBILE_MONEY, CREDIT_CARD, WALLET)

✅ **Paramètres client (pour carte bancaire) :**
- `customer_name` : Nom du client
- `customer_surname` : Prénom du client
- `customer_email` : Email du client
- `customer_phone_number` : Téléphone du client
- `customer_address` : Adresse du client
- `customer_city` : Ville du client
- `customer_country` : Code pays ISO (CI, TG, SN, etc.)
- `customer_state` : État/province
- `customer_zip_code` : Code postal

## 🧪 Test de la configuration

### 1. Exécuter le script de test

```bash
cd Backend
python test_cinetpay.py
```

### 2. Vérifier les points suivants

- ✅ API Key et Site ID configurés
- ✅ URLs utilisent 127.0.0.1 (pas localhost)
- ✅ Devise correspond à votre compte CinetPay
- ✅ Tous les paramètres obligatoires présents

## 🔧 Résolution des erreurs courantes

### Erreur 403 - Accès interdit
**Cause :** Service non identifié ou URLs localhost
**Solution :** Utilisez `127.0.0.1` au lieu de `localhost`

### Erreur 608 - Paramètres manquants
**Cause :** Paramètre obligatoire manquant ou incorrect
**Solution :** Vérifiez tous les paramètres requis

### Erreur 609 - AUTH_NOT_FOUND
**Cause :** API Key incorrecte
**Solution :** Récupérez la bonne API Key dans votre back-office CinetPay

### Erreur 613 - SITE_ID_NOTVALID
**Cause :** Site ID incorrect
**Solution :** Récupérez le bon Site ID dans votre back-office CinetPay

### Erreur 624 - Erreur de traitement
**Cause :** API Key incorrecte ou paramètres invalides
**Solution :** Vérifiez votre configuration

### Erreur 429 - TOO_MANY_REQUEST
**Cause :** Trop de requêtes
**Solution :** Attendez quelques minutes avant de réessayer

## 🌐 URLs de test recommandées

Pour les tests, utilisez ces URLs :

```python
# Backend (Django)
BASE_URL = 'http://127.0.0.1:8000'

# Frontend (React)
FRONTEND_URL = 'http://127.0.0.1:5173'

# URLs CinetPay
notify_url = f"{BASE_URL}/depannage/api/cinetpay/notify/"
return_url = f"{FRONTEND_URL}/payment"
```

## 📱 Méthodes de paiement supportées

- 💳 **Carte bancaire** (Visa, Mastercard)
- 📱 **Mobile Money** (Moov, MTN, Orange)
- 💼 **Portefeuille CinetPay**

## 🔒 Sécurité

- ✅ Paiements sécurisés par SSL
- ✅ Conformité PCI DSS
- ✅ Cryptage des données sensibles
- ✅ Validation côté serveur

## 📞 Support

En cas de problème :

1. **Vérifiez la configuration** avec le script de test
2. **Consultez les logs** Django pour les erreurs détaillées
3. **Contactez CinetPay** pour les problèmes d'API
4. **Vérifiez votre compte** CinetPay est actif

## 🚀 Passage en production

1. Changez `MODE` de `TEST` à `PRODUCTION`
2. Utilisez vos vraies URLs de production
3. Testez avec de petits montants
4. Surveillez les logs et notifications

---

**Note :** Ce guide suit la documentation officielle CinetPay. Pour plus d'informations, consultez [docs.cinetpay.com](https://docs.cinetpay.com/) 