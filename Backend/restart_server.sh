#!/bin/bash

# Script de redémarrage du serveur Django avec nettoyage
echo "🔄 Redémarrage du serveur Django..."

# Couleurs pour les messages
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Arrêter le serveur s'il tourne
echo "🛑 Arrêt du serveur en cours..."
pkill -f "python manage.py runserver" 2>/dev/null || true
sleep 2

# Nettoyer les tokens expirés
print_status "Nettoyage des tokens expirés..."
python clean_expired_tokens.py

# Vérifier la configuration
print_status "Vérification de la configuration..."
python debug_tokens.py

# Démarrer le serveur
print_status "Démarrage du serveur Django..."
echo "🌐 Serveur accessible sur: http://127.0.0.1:8000"
echo "📱 Frontend: http://localhost:5173"
echo ""
echo "💡 Instructions pour le frontend:"
echo "   1. Videz le localStorage du navigateur"
echo "   2. Reconnectez-vous à l'application"
echo "   3. Testez l'assignation de technicien"
echo ""
echo "🛑 Pour arrêter: Ctrl+C"
echo ""

python manage.py runserver 