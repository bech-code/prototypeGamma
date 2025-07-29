#!/bin/bash
# Script de monitoring pour DepanneTeliman

echo "📊 Monitoring DepanneTeliman"

# Vérifier les services
echo "🔍 Vérification des services..."

# Backend
if curl -s http://localhost:8000/depannage/api/public/health-check/ > /dev/null; then
    echo "✅ Backend: En ligne"
else
    echo "❌ Backend: Hors ligne"
fi

# Frontend
if curl -s http://localhost:5173 > /dev/null; then
    echo "✅ Frontend: En ligne"
else
    echo "❌ Frontend: Hors ligne"
fi

# Redis
if redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis: En ligne"
else
    echo "❌ Redis: Hors ligne"
fi

# Utilisation mémoire
echo "💾 Utilisation mémoire:"
free -h

# Utilisation CPU
echo "⚡ Utilisation CPU:"
top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d'%' -f1
