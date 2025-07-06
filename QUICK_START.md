# ⚡ Démarrage rapide - Prototype5b

## 🎯 En 30 secondes

```bash
# 1. Activer l'environnement virtuel
source Backend/venv/bin/activate

# 2. Démarrer le backend (ASGI)
./start_backend.sh asgi

# 3. Tester que ça fonctionne
curl http://127.0.0.1:8000/depannage/api/test/health_check/
```

## 🚀 Commandes principales

| Commande | Description |
|----------|-------------|
| `./start_backend.sh asgi` | Démarre avec Daphne (ASGI) |
| `./start_backend.sh uvicorn` | Démarre avec Uvicorn (ASGI) |
| `./start_backend.sh` | Menu interactif |
| `source setup_aliases.sh` | Configure les alias |
| `start-backend` | Alias pour démarrer (après setup) |

## ❌ À éviter

```bash
# ❌ NE FONCTIONNE PAS pour les WebSockets
python manage.py runserver
```

## ✅ Résultat attendu

- **API :** `{"status":"healthy","message":"API DepanneTeliman fonctionne correctement"}`
- **WebSockets :** Connexions acceptées dans les logs
- **Frontend :** Notifications temps réel fonctionnelles

## 🔧 Configuration permanente

```bash
# Ajouter à votre ~/.zshrc ou ~/.bashrc
echo "source $(pwd)/setup_aliases.sh" >> ~/.zshrc
source ~/.zshrc
```

## 📚 Documentation complète

- **Guide détaillé :** `README_BACKEND.md`
- **Installation équipe :** `INSTALLATION_TEAM.md`
- **Alias disponibles :** `backend-help` (après setup)

---

**💡 Conseil :** Utilisez toujours `./start_backend.sh asgi` au lieu de `python manage.py runserver` ! 