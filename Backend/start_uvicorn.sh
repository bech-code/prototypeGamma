#!/bin/bash

# Activer l'environnement virtuel
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Erreur : le dossier venv n'existe pas. Veuillez créer l'environnement virtuel."
    exit 1
fi

# Lancer Uvicorn sur le port 8000 avec l'application ASGI
exec uvicorn auth.asgi:application --host 0.0.0.0 --port 8000 