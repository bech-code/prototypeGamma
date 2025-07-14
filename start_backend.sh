#!/bin/bash

# Charger les variables d'environnement depuis .env si le fichier existe
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ Variables d'environnement chargées depuis .env"
fi

# Activer l'environnement virtuel automatiquement
if [ -f Backend/venv/bin/activate ]; then
  source Backend/venv/bin/activate
else
  echo "❌ Erreur : L'environnement virtuel Backend/venv n'existe pas. Veuillez le créer avec 'python -m venv Backend/venv' puis installer les dépendances."
  exit 1
fi

cd Backend
export DJANGO_SETTINGS_MODULE=auth.settings
export DJANGO_SECRET_KEY="django-insecure-your-secret-key-for-development-only-change-in-production"
export PYTHONPATH=$(pwd)

echo "🚀 Démarrage du Backend Django (ASGI avec WebSockets)..."
exec daphne -b 0.0.0.0 -p 8000 auth.asgi:application 