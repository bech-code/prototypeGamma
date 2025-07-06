# 👥 Guide d'installation pour l'équipe

## 🚀 Installation rapide

### 1. Cloner le projet
```bash
git clone <URL_DU_REPO>
cd Prototype5b
```

### 2. Configuration de l'environnement
```bash
# Créer l'environnement virtuel
cd Backend
python -m venv venv

# Activer l'environnement virtuel
source venv/bin/activate  # Linux/Mac
# ou
venv\Scripts\activate     # Windows

# Installer les dépendances
pip install -r requirements.txt
```

### 3. Configuration des variables d'environnement
Créer un fichier `.env` à la racine du projet :
```bash
# Depuis la racine du projet
cp .env.example .env  # Si un fichier exemple existe
# Sinon, créer manuellement le fichier .env
```

Contenu minimal du `.env` :
```env
DJANGO_SECRET_KEY=django-insecure-(((#-=%ry#r!s9&i-d)(r_kt0$utuurm^_y^j71k#61y2d@!f9
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
```

### 4. Configuration des alias (optionnel mais recommandé)
```bash
# Ajouter à votre ~/.bashrc ou ~/.zshrc
echo "source $(pwd)/setup_aliases.sh" >> ~/.bashrc
# ou pour zsh
echo "source $(pwd)/setup_aliases.sh" >> ~/.zshrc

# Recharger le shell
source ~/.bashrc  # ou source ~/.zshrc
```

## 🎯 Utilisation quotidienne

### Démarrage du backend
```bash
# Option 1 : Script universel (RECOMMANDÉ)
./start_backend.sh asgi

# Option 2 : Avec alias (si configuré)
start-backend

# Option 3 : Menu interactif
./start_backend.sh
```

### Commandes utiles
```bash
# Navigation
cd-backend    # Va dans le dossier Backend
cd-frontend   # Va dans le dossier Frontend

# Tests
test-websocket  # Test WebSocket
test-api        # Test API

# Aide
backend-help    # Affiche toutes les commandes
```

## 🔧 Configuration avancée

### Pour VS Code
Créer un fichier `.vscode/settings.json` :
```json
{
    "python.defaultInterpreterPath": "./Backend/venv/bin/python",
    "python.terminal.activateEnvironment": true,
    "python.terminal.activateEnvInCurrentTerminal": true
}
```

### Pour PyCharm
1. Ouvrir le projet dans PyCharm
2. Aller dans `File > Settings > Project > Python Interpreter`
3. Sélectionner l'interpréteur : `Backend/venv/bin/python`

### Pour les raccourcis clavier
Créer un fichier `.vscode/tasks.json` :
```json
{
    "version": "2.0.0",
    "tasks": [
        {
            "label": "Start Backend ASGI",
            "type": "shell",
            "command": "./start_backend.sh",
            "args": ["asgi"],
            "group": "build",
            "presentation": {
                "echo": true,
                "reveal": "always",
                "focus": false,
                "panel": "new"
            }
        }
    ]
}
```

## 🧪 Tests de validation

### 1. Test du serveur ASGI
```bash
# Démarrer le serveur
./start_backend.sh asgi

# Dans un autre terminal, tester l'API
curl http://127.0.0.1:8000/depannage/api/test/health_check/
```

### 2. Test des WebSockets
```bash
# Récupérer un token depuis le frontend
# Puis tester
cd Backend
python test_websocket.py VOTRE_TOKEN_JWT
```

### 3. Test du frontend
```bash
cd Frontend
npm install
npm run dev
```

## 🐛 Problèmes courants

### Erreur "Permission denied"
```bash
chmod +x *.sh
chmod +x Backend/*.sh
```

### Erreur "Module not found"
```bash
# Vérifier que l'environnement virtuel est activé
source Backend/venv/bin/activate

# Réinstaller les dépendances
pip install -r Backend/requirements.txt
```

### Erreur "DJANGO_SECRET_KEY not found"
```bash
# Vérifier que le fichier .env existe à la racine
ls -la .env

# Vérifier le contenu
cat .env
```

### Erreur 404 sur WebSockets
- **Cause :** Serveur WSGI utilisé
- **Solution :** Utiliser `./start_backend.sh asgi`

## 📋 Checklist d'installation

- [ ] Projet cloné
- [ ] Environnement virtuel créé et activé
- [ ] Dépendances installées
- [ ] Fichier `.env` configuré
- [ ] Scripts exécutables (`chmod +x *.sh`)
- [ ] Serveur ASGI démarre sans erreur
- [ ] API répond (`curl http://127.0.0.1:8000/depannage/api/test/health_check/`)
- [ ] WebSockets fonctionnent (test avec token)
- [ ] Alias configurés (optionnel)

## 🤝 Support

- **Documentation :** `README_BACKEND.md`
- **Scripts :** `start_backend.sh`, `setup_aliases.sh`
- **Tests :** `Backend/test_websocket.py`

---

**💡 Conseil :** Gardez cette documentation à jour et partagez-la avec tous les nouveaux membres de l'équipe ! 