#!/bin/bash

# Charger les variables d'environnement depuis .env si le fichier existe
if [ -f .env ]; then
  export $(grep -v '^#' .env | xargs)
  echo "✅ Variables d'environnement chargées depuis .env"
fi

# Exporter la variable d'environnement pour Django
export DJANGO_SETTINGS_MODULE=Backend.auth.settings

# Définir la clé secrète Django (pour le développement)
export DJANGO_SECRET_KEY="django-insecure-your-secret-key-for-development-only-change-in-production"

# Ajouter Backend au PYTHONPATH pour les imports internes
export PYTHONPATH="$PYTHONPATH:$(pwd)/Backend"

# Exporter les variables d'environnement CinetPay (exemple, à adapter si besoin)

# Activer l'environnement virtuel automatiquement
if [ -f Backend/venv/bin/activate ]; then
  source Backend/venv/bin/activate
else
  echo "❌ Erreur : L'environnement virtuel Backend/venv n'existe pas. Veuillez le créer avec 'python -m venv Backend/venv' puis installer les dépendances."
  exit 1
fi

# Démarrer le backend Django (ASGI avec Daphne)
echo "🚀 Démarrage du Backend Django (ASGI avec WebSockets)..."
daphne -b 0.0.0.0 -p 8000 Backend.auth.asgi:application 