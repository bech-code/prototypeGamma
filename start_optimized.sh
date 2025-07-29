#!/bin/bash
# Script de démarrage optimisé pour DepanneTeliman

echo "🚀 Démarrage optimisé de DepanneTeliman"

# Vérifier Redis
if ! pgrep redis-server > /dev/null; then
    echo "⚠️ Redis non démarré - démarrage..."
    redis-server --daemonize yes
fi

# Backend
echo "📡 Démarrage Backend..."
cd Backend
python manage.py collectstatic --noinput
python manage.py migrate
python manage.py runserver 0.0.0.0:8000 &

# Frontend
echo "🎨 Démarrage Frontend..."
cd ../Frontend
npm run dev &

echo "✅ DepanneTeliman démarré avec optimisations"
echo "📡 Backend: http://localhost:8000"
echo "🎨 Frontend: http://localhost:5173"
