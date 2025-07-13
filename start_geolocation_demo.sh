#!/bin/bash

# Script de démonstration du système de géolocalisation en temps réel
# Démarre le backend, le frontend et lance des tests

echo "🚀 Démarrage de la démonstration de géolocalisation en temps réel"
echo "================================================================"

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Vérification des prérequis
check_prerequisites() {
    print_status "Vérification des prérequis..."
    
    # Vérifier Redis
    if ! command -v redis-server &> /dev/null; then
        print_warning "Redis n'est pas installé. Installation..."
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install redis
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            sudo apt-get update && sudo apt-get install -y redis-server
        else
            print_error "Système d'exploitation non supporté pour l'installation automatique de Redis"
            exit 1
        fi
    fi
    
    # Vérifier Python
    if ! command -v python3 &> /dev/null; then
        print_error "Python 3 n'est pas installé"
        exit 1
    fi
    
    # Vérifier Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js n'est pas installé"
        exit 1
    fi
    
    print_success "Prérequis vérifiés"
}

# Démarrage de Redis
start_redis() {
    print_status "Démarrage de Redis..."
    
    if ! pgrep -x "redis-server" > /dev/null; then
        redis-server --daemonize yes
        sleep 2
        print_success "Redis démarré"
    else
        print_success "Redis déjà en cours d'exécution"
    fi
}

# Démarrage du backend Django
start_backend() {
    print_status "Démarrage du backend Django..."
    
    cd Backend
    
    # Vérifier si l'environnement virtuel existe
    if [ ! -d "venv" ]; then
        print_status "Création de l'environnement virtuel..."
        python3 -m venv venv
    fi
    
    # Activer l'environnement virtuel
    source venv/bin/activate
    
    # Installer les dépendances
    print_status "Installation des dépendances Python..."
    pip install -r requirements.txt
    
    # Appliquer les migrations
    print_status "Application des migrations..."
    python manage.py migrate
    
    # Démarrer le serveur ASGI
    print_status "Démarrage du serveur ASGI..."
    daphne -b 0.0.0.0 -p 8000 auth.asgi:application &
    BACKEND_PID=$!
    
    # Attendre que le serveur soit prêt
    sleep 5
    
    print_success "Backend démarré sur http://localhost:8000"
    cd ..
}

# Démarrage du frontend React
start_frontend() {
    print_status "Démarrage du frontend React..."
    
    cd Frontend
    
    # Installer les dépendances
    print_status "Installation des dépendances Node.js..."
    npm install
    
    # Démarrer le serveur de développement
    print_status "Démarrage du serveur de développement..."
    npm run dev &
    FRONTEND_PID=$!
    
    # Attendre que le serveur soit prêt
    sleep 10
    
    print_success "Frontend démarré sur http://localhost:5173"
    cd ..
}

# Test du système
test_system() {
    print_status "Test du système de géolocalisation..."
    
    # Attendre un peu que tout soit prêt
    sleep 5
    
    # Lancer les tests
    cd Backend
    source venv/bin/activate
    python ../test_geolocation_system.py
    cd ..
}

# Fonction de nettoyage
cleanup() {
    print_status "Nettoyage en cours..."
    
    # Arrêter les processus
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
    fi
    
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
    fi
    
    # Arrêter Redis
    redis-cli shutdown 2>/dev/null
    
    print_success "Nettoyage terminé"
}

# Gestion des signaux pour le nettoyage
trap cleanup EXIT INT TERM

# Menu principal
show_menu() {
    echo ""
    echo "🎯 Menu de démonstration de géolocalisation"
    echo "=========================================="
    echo "1. Démarrage complet (Backend + Frontend + Tests)"
    echo "2. Démarrage backend uniquement"
    echo "3. Démarrage frontend uniquement"
    echo "4. Tests uniquement"
    echo "5. Arrêter tous les services"
    echo "6. Quitter"
    echo ""
    read -p "Choisissez une option (1-6): " choice
}

# Exécution selon le choix
case "${1:-}" in
    "1"|"")
        print_status "Démarrage complet du système..."
        check_prerequisites
        start_redis
        start_backend
        start_frontend
        test_system
        
        echo ""
        print_success "🎉 Démonstration prête!"
        echo ""
        echo "📱 Accès aux interfaces:"
        echo "   - Frontend: http://localhost:5173"
        echo "   - Backend API: http://localhost:8000"
        echo "   - Admin Django: http://localhost:8000/admin"
        echo ""
        echo "📍 Fonctionnalités de géolocalisation:"
        echo "   - Dashboard Technicien: Onglet '📍 Géolocalisation'"
        echo "   - Dashboard Client: Onglet '📍 Géolocalisation'"
        echo ""
        echo "🔧 Pour tester:"
        echo "   1. Ouvrez http://localhost:5173"
        echo "   2. Connectez-vous en tant que technicien ou client"
        echo "   3. Allez dans l'onglet '📍 Géolocalisation'"
        echo "   4. Activez le tracking et observez la carte"
        echo ""
        echo "⏹️  Pour arrêter: Ctrl+C"
        
        # Attendre l'interruption
        wait
        ;;
    "2")
        check_prerequisites
        start_redis
        start_backend
        echo "Backend démarré. Appuyez sur Ctrl+C pour arrêter."
        wait $BACKEND_PID
        ;;
    "3")
        start_frontend
        echo "Frontend démarré. Appuyez sur Ctrl+C pour arrêter."
        wait $FRONTEND_PID
        ;;
    "4")
        test_system
        ;;
    "5")
        cleanup
        ;;
    "6")
        exit 0
        ;;
    *)
        show_menu
        ;;
esac 