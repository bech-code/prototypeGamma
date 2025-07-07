#!/bin/bash
# Script pour lancer Daphne (ASGI) sur le projet Django

cd "$(dirname "$0")"

# Activer l'environnement virtuel
if [ -d "venv" ]; then
    source venv/bin/activate
else
    echo "Erreur : le dossier venv n'existe pas. Veuillez créer l'environnement virtuel."
    exit 1
fi

# Lancer Daphne sur le port 8000 avec l'application ASGI
exec daphne -b 0.0.0.0 -p 8000 auth.asgi:application 