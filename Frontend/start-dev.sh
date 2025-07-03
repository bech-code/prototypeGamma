#!/bin/bash

# Script de démarrage pour le frontend DepanneTeliman
# Ce script vérifie les prérequis et démarre l'application en mode développement

echo "🚀 Démarrage du frontend DepanneTeliman..."
echo "=========================================="

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Vérifier si Node.js est installé
if ! command -v node &> /dev/null; then
    print_error "Node.js n'est pas installé. Veuillez l'installer depuis https://nodejs.org/"
    exit 1
fi

# Vérifier la version de Node.js
NODE_VERSION=$(node -v | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 16 ]; then
    print_warning "Node.js version $NODE_VERSION détectée. Version 16+ recommandée."
else
    print_status "Node.js version $(node -v) détectée"
fi

# Vérifier si npm est installé
if ! command -v npm &> /dev/null; then
    print_error "npm n'est pas installé. Veuillez l'installer."
    exit 1
fi

print_status "npm version $(npm -v) détecté"

# Vérifier si le backend est en cours d'exécution
print_info "Vérification de la connectivité backend..."
if curl -s http://127.0.0.1:8000/depannage/api/test/health-check/ > /dev/null; then
    print_status "Backend Django accessible"
else
    print_warning "Backend Django non accessible sur http://127.0.0.1:8000"
    print_info "Assurez-vous que le backend est démarré avec: cd Backend && python manage.py runserver"
fi

# Vérifier si les dépendances sont installées
if [ ! -d "node_modules" ]; then
    print_info "Installation des dépendances..."
    npm install
    if [ $? -eq 0 ]; then
        print_status "Dépendances installées avec succès"
    else
        print_error "Erreur lors de l'installation des dépendances"
        exit 1
    fi
else
    print_status "Dépendances déjà installées"
fi

# Vérifier si le fichier package.json existe
if [ ! -f "package.json" ]; then
    print_error "package.json non trouvé. Assurez-vous d'être dans le bon répertoire."
    exit 1
fi

# Afficher les informations importantes
echo ""
print_info "INFORMATIONS IMPORTANTES:"
echo "  • Accédez à l'application via: http://localhost:5173"
echo "  • N'utilisez PAS file:// pour ouvrir index.html"
echo "  • Le panneau de diagnostic est disponible en bas à droite (mode dev)"
echo "  • En cas de problème, utilisez le script clean-cache.sh"
echo ""

# Démarrer l'application
print_info "Démarrage de l'application en mode développement..."
echo "  URL: http://localhost:5173"
echo "  Pour arrêter: Ctrl+C"
echo ""

# Démarrer Vite
npm run dev 