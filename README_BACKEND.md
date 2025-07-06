# 🚀 Guide de démarrage du Backend

## ⚠️ IMPORTANT : Serveur ASGI requis

Ce projet utilise des **WebSockets** pour les notifications en temps réel.  
**Vous DEVEZ utiliser un serveur ASGI** (pas `python manage.py runserver`).

## 🎯 Démarrage rapide

### Option 1 : Script universel (RECOMMANDÉ)
```bash
# Depuis la racine du projet
./start_backend.sh asgi      # Serveur ASGI avec Daphne
./start_backend.sh uvicorn   # Serveur ASGI avec Uvicorn
./start_backend.sh           # Menu interactif
```

### Option 2 : Scripts directs
```bash
# Depuis le dossier Backend/
./start_asgi.sh      # Daphne (ASGI)
./start_uvicorn.sh   # Uvicorn (ASGI)
```

## ❌ À NE PAS FAIRE

```bash
# ❌ NE FONCTIONNE PAS pour les WebSockets
python manage.py runserver
```

**Résultat :** Erreurs 404 sur `/ws/notifications/`, notifications temps réel KO.

## ✅ Serveurs recommandés

| Serveur | Type | WebSockets | Performance | Recommandation |
|---------|------|------------|-------------|----------------|
| `./start_asgi.sh` | ASGI | ✅ | Bonne | ⭐⭐⭐⭐⭐ |
| `./start_uvicorn.sh` | ASGI | ✅ | Excellente | ⭐⭐⭐⭐⭐ |
| `python manage.py runserver` | WSGI | ❌ | Moyenne | ❌ |

## 🔧 Configuration requise

1. **Environnement virtuel activé**
   ```bash
   source Backend/venv/bin/activate
   ```

2. **Variables d'environnement**
   - Fichier `.env` à la racine du projet
   - `DJANGO_SECRET_KEY` définie

3. **Dépendances installées**
   ```bash
   pip install -r Backend/requirements.txt
   ```

## 🧪 Test de fonctionnement

### Test WebSocket
```bash
# Depuis le dossier Backend/
python test_websocket.py VOTRE_TOKEN_JWT
```

### Test API
```bash
curl http://127.0.0.1:8000/depannage/api/test/health_check/
```

## 🐛 Dépannage

### Erreur "Token is invalid"
- Vérifiez que le serveur ASGI est démarré
- Régénérez un token d'accès depuis le frontend
- Vérifiez la clé `DJANGO_SECRET_KEY` dans `.env`

### Erreur 404 sur `/ws/notifications/`
- **Cause :** Serveur WSGI utilisé au lieu d'ASGI
- **Solution :** Utilisez `./start_asgi.sh` ou `./start_uvicorn.sh`

### Serveur ne démarre pas
- Vérifiez que vous êtes dans le bon dossier
- Vérifiez que l'environnement virtuel est activé
- Vérifiez les permissions des scripts (`chmod +x *.sh`)

## 📝 Logs utiles

### Serveur ASGI fonctionnel
```
2025-07-06 01:09:39,744 INFO     WebSocket JWT OK: user=patron (Administrateur)
127.0.0.1:56377 - - [06/Jul/2025:01:09:39] "WSCONNECT /ws/notifications/" - -
```

### Serveur WSGI (WebSockets KO)
```
WARNING Not Found: /ws/notifications/
WARNING "GET /ws/notifications/?token=..." HTTP/1.1" 404 2932
```

## 🤝 Pour l'équipe

- **Toujours utiliser les scripts ASGI** pour le développement
- **Documenter les problèmes** dans les issues GitHub
- **Tester les WebSockets** après chaque modification
- **Partager les tokens de test** pour la validation

---

**💡 Conseil :** Ajoutez `./start_backend.sh asgi` à vos raccourcis ou alias pour un démarrage rapide ! 