#!/bin/bash

# Script universel pour démarrer le backend
# Usage: ./start_backend.sh [asgi|uvicorn|django]

set -e

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "Backend/manage.py" ]; then
    print_error "Ce script doit être exécuté depuis la racine du projet (où se trouve le dossier Backend/)"
    exit 1
fi

# Aller dans le dossier Backend
cd Backend

# Vérifier que l'environnement virtuel est activé
if [ -z "$VIRTUAL_ENV" ]; then
    print_warning "Environnement virtuel non détecté. Activation automatique..."
    if [ -f "venv/bin/activate" ]; then
        source venv/bin/activate
        print_success "Environnement virtuel activé"
    else
        print_error "Aucun environnement virtuel trouvé. Créez-en un avec: python -m venv venv"
        exit 1
    fi
fi

# Fonction pour démarrer le serveur ASGI (Daphne)
start_asgi() {
    print_info "Démarrage du serveur ASGI avec Daphne..."
    if [ -f "start_asgi.sh" ]; then
        ./start_asgi.sh
    else
        print_error "Script start_asgi.sh non trouvé"
        exit 1
    fi
}

# Fonction pour démarrer le serveur ASGI (Uvicorn)
start_uvicorn() {
    print_info "Démarrage du serveur ASGI avec Uvicorn..."
    if [ -f "start_uvicorn.sh" ]; then
        ./start_uvicorn.sh
    else
        print_error "Script start_uvicorn.sh non trouvé"
        exit 1
    fi
}

# Fonction pour démarrer le serveur Django classique (WSGI)
start_django() {
    print_warning "Démarrage du serveur Django classique (WSGI)"
    print_warning "⚠️  ATTENTION: Les WebSockets ne fonctionneront PAS avec ce serveur!"
    print_warning "   Utilisez 'asgi' ou 'uvicorn' pour les notifications en temps réel."
    echo
    python manage.py runserver
}

# Fonction pour afficher l'aide
show_help() {
    echo "Usage: ./start_backend.sh [OPTION]"
    echo
    echo "Options:"
    echo "  asgi     - Démarrer avec Daphne (ASGI) - RECOMMANDÉ"
    echo "  uvicorn  - Démarrer avec Uvicorn (ASGI) - RECOMMANDÉ"
    echo "  django   - Démarrer avec Django runserver (WSGI) - WebSockets KO"
    echo "  help     - Afficher cette aide"
    echo
    echo "Exemples:"
    echo "  ./start_backend.sh asgi     # Serveur ASGI avec Daphne"
    echo "  ./start_backend.sh uvicorn  # Serveur ASGI avec Uvicorn"
    echo "  ./start_backend.sh          # Menu interactif"
    echo
    echo "Note: Les serveurs ASGI (asgi/uvicorn) supportent les WebSockets"
    echo "      Le serveur Django (django) ne supporte que HTTP"
}

# Fonction pour le menu interactif
show_menu() {
    echo
    print_info "Choisissez votre serveur backend:"
    echo
    echo "1) ASGI avec Daphne (recommandé)"
    echo "2) ASGI avec Uvicorn (recommandé)"
    echo "3) Django runserver (WSGI - WebSockets KO)"
    echo "4) Aide"
    echo "5) Quitter"
    echo
    read -p "Votre choix (1-5): " choice
    
    case $choice in
        1) start_asgi ;;
        2) start_uvicorn ;;
        3) start_django ;;
        4) show_help ;;
        5) print_info "Au revoir!"; exit 0 ;;
        *) print_error "Choix invalide"; show_menu ;;
    esac
}

# Traitement des arguments
case "${1:-}" in
    "asgi"|"daphne")
        start_asgi
        ;;
    "uvicorn")
        start_uvicorn
        ;;
    "django"|"runserver")
        start_django
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    "")
        show_menu
        ;;
    *)
        print_error "Option inconnue: $1"
        show_help
        exit 1
        ;;
esac 