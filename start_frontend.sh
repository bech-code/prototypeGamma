#!/bin/bash

echo "🚀 Démarrage du Frontend React..."

# Aller dans le dossier Frontend
cd Frontend

# Vérifier si node_modules existe, sinon installer
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
fi

# Lancer le serveur de développement
echo "✅ Frontend démarré sur http://127.0.0.1:5173"
npm run dev 