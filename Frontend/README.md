# Application Frontend - Service de Dépannage

## 🚀 Démarrage Rapide

### Prérequis
- Node.js (version 16 ou supérieure)
- npm ou yarn
- Backend Django en cours d'exécution sur http://127.0.0.1:8000

### Démarrage Automatique
```bash
# Rendre le script exécutable (une seule fois)
chmod +x start-dev.sh

# Démarrer l'application
./start-dev.sh
```

### Démarrage Manuel
```bash
# Installer les dépendances
npm install

# Démarrer le serveur de développement
npm run dev
```

## 🔧 Résolution des Problèmes

### Erreur "The operation is insecure"
Cette erreur se produit généralement quand :
1. **L'application est accédée via un fichier local** (`file://`) au lieu de `http://localhost:5173`
2. **Le navigateur bloque l'API History** pour des raisons de sécurité

**Solutions :**
- ✅ Accédez à l'application via `http://localhost:5173`
- ✅ Utilisez Chrome ou Edge (Firefox peut avoir des restrictions)
- ✅ Désactivez les extensions de navigateur qui bloquent l'API History
- ✅ Vérifiez que le serveur Vite est bien démarré

### Erreur "Trop d'appels aux API Location ou History"
Cette erreur indique une boucle de redirection infinie.

**Solutions :**
- ✅ Vérifiez que le backend Django est en cours d'exécution
- ✅ Videz le cache du navigateur (Ctrl+F5 ou Cmd+Shift+R)
- ✅ Supprimez les tokens expirés du localStorage
- ✅ Redémarrez l'application

### Erreur de Connexion au Backend
Si l'application ne peut pas se connecter au backend :

**Solutions :**
- ✅ Vérifiez que Django est en cours d'exécution sur http://127.0.0.1:8000
- ✅ Vérifiez les logs Django pour les erreurs
- ✅ Assurez-vous que CORS est configuré correctement

## 📁 Structure du Projet

```
Frontend/
├── src/
│   ├── components/          # Composants réutilisables
│   ├── contexts/           # Contextes React (Auth, etc.)
│   ├── pages/              # Pages de l'application
│   ├── layouts/            # Layouts principaux
│   ├── types/              # Types TypeScript
│   └── assets/             # Images, vidéos, etc.
├── public/                 # Fichiers statiques
├── vite.config.ts          # Configuration Vite
├── package.json            # Dépendances
└── start-dev.sh           # Script de démarrage
```

## 🔐 Authentification

L'application utilise JWT pour l'authentification :
- **Access Token** : Valide 5 minutes
- **Refresh Token** : Valide 24 heures
- **Déconnexion automatique** : Après 20 minutes d'inactivité

## 🛠️ Développement

### Scripts Disponibles
```bash
npm run dev          # Démarrage en mode développement
npm run build        # Build de production
npm run preview      # Prévisualisation du build
npm run lint         # Vérification du code
```

### Variables d'Environnement
Créez un fichier `.env.local` pour les variables d'environnement :
```env
VITE_API_URL=http://127.0.0.1:8000
VITE_APP_NAME=Service de Dépannage
```

## 🐛 Debugging

### Logs de Développement
- Ouvrez les DevTools (F12)
- Allez dans l'onglet Console
- Les erreurs et avertissements seront affichés

### Error Boundary
L'application inclut un ErrorBoundary qui capture les erreurs React et affiche une interface utilisateur de récupération.

### Vérification de l'Environnement
L'application vérifie automatiquement :
- Le protocole d'accès (file:// vs http://)
- La présence du backend Django
- Les erreurs de sécurité

## 📞 Support

En cas de problème :
1. Vérifiez les logs dans la console du navigateur
2. Vérifiez les logs du serveur Vite
3. Vérifiez les logs du backend Django
4. Consultez cette documentation

## 🔄 Mise à Jour

Pour mettre à jour l'application :
```bash
# Mettre à jour les dépendances
npm update

# Reconstruire l'application
npm run build
```

# Frontend React (Vite + TypeScript)

## Installation

1. Installez Node.js (version recommandée : >=18)
2. Installez les dépendances :
   ```sh
   npm install
   ```
3. Démarrez le serveur de développement :
   ```sh
   npm run dev
   ```

## Dépendances principales

- **React & DOM** :
  - react
  - react-dom
- **Routing** :
  - react-router-dom
- **Charts/Graphiques** :
  - apexcharts
  - react-apexcharts
  - chart.js
  - react-chartjs-2
  - recharts
  - @amcharts/amcharts5
  - @amcharts/amcharts5-geodata
- **Cartographie** :
  - leaflet
  - react-leaflet
- **Notifications** :
  - react-hot-toast
- **HTTP** :
  - axios
- **Export/Manipulation de fichiers** :
  - xlsx
  - jspdf
- **UI/Icons** :
  - lucide-react
- **Date utils** :
  - date-fns
- **Supabase** (optionnel) :
  - @supabase/supabase-js

## Dépendances de développement

- **Vite** :
  - vite
  - @vitejs/plugin-react
- **TypeScript** :
  - typescript
  - @types/react
  - @types/react-dom
  - @types/leaflet
  - @types/xlsx
- **ESLint** :
  - eslint
  - @eslint/js
  - eslint-plugin-react-hooks
  - eslint-plugin-react-refresh
  - typescript-eslint
- **Cypress** (tests end-to-end) :
  - cypress
- **Tailwind CSS** :
  - tailwindcss
  - postcss
  - autoprefixer
- **Globals** :
  - globals

## Commandes utiles

- `npm run dev` : démarre le serveur de développement
- `npm run build` : build de production
- `npm run preview` : prévisualisation du build
- `npm run lint` : vérification du code avec ESLint

---

**Pour toute nouvelle dépendance, utilisez** :
```sh
npm install <nom_du_paquet>
``` 