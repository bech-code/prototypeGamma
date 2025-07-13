#!/bin/bash

# Script de démarrage optimisé pour DepanneTeliman
# Ce script démarre tous les services nécessaires avec les optimisations

set -e  # Arrêter en cas d'erreur

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log() {
    echo -e "${GREEN}[$(date +'%H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%H:%M:%S')] ERROR:${NC} $1"
}

info() {
    echo -e "${BLUE}[$(date +'%H:%M:%S')] INFO:${NC} $1"
}

# Vérifier que nous sommes dans le bon répertoire
if [ ! -d "Backend" ] || [ ! -d "Frontend" ]; then
    error "Ce script doit être exécuté depuis la racine du projet DepanneTeliman"
    exit 1
fi

log "🚀 Démarrage optimisé de DepanneTeliman"

# Fonction pour vérifier si un port est utilisé
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null ; then
        return 0  # Port utilisé
    else
        return 1  # Port libre
    fi
}

# Fonction pour tuer un processus sur un port
kill_port() {
    local port=$1
    local pid=$(lsof -ti:$port)
    if [ ! -z "$pid" ]; then
        warn "Port $port utilisé par PID $pid - arrêt..."
        kill -9 $pid 2>/dev/null || true
        sleep 2
    fi
}

# Nettoyer les ports si nécessaire
info "Nettoyage des ports..."
kill_port 8000  # Backend Django
kill_port 5173  # Frontend Vite
kill_port 6379  # Redis (optionnel)

# Vérifier et démarrer Redis (optionnel)
if command -v redis-server &> /dev/null; then
    if ! pgrep redis-server > /dev/null; then
        log "Démarrage de Redis..."
        redis-server --daemonize yes
        sleep 2
    else
        info "Redis déjà en cours d'exécution"
    fi
else
    warn "Redis non installé - le cache ne sera pas disponible"
fi

# Vérifier les dépendances Python
info "Vérification des dépendances Backend..."
cd Backend

# Vérifier si l'environnement virtuel existe
if [ ! -d "venv" ] && [ ! -d ".venv" ]; then
    warn "Environnement virtuel Python non trouvé"
    info "Création d'un environnement virtuel..."
    python3 -m venv venv
fi

# Activer l'environnement virtuel
if [ -d "venv" ]; then
    source venv/bin/activate
elif [ -d ".venv" ]; then
    source .venv/bin/activate
fi

# Installer/mettre à jour les dépendances
log "Installation des dépendances Backend..."
pip install -r requirements.txt --quiet

# Vérifier la base de données
log "Vérification de la base de données..."
python manage.py check --deploy

# Appliquer les migrations
log "Application des migrations..."
python manage.py migrate --quiet

# Collecter les fichiers statiques
log "Collecte des fichiers statiques..."
python manage.py collectstatic --noinput --quiet

# Démarrer le backend
log "Démarrage du Backend Django..."
python manage.py runserver 0.0.0.0:8000 &
BACKEND_PID=$!

# Attendre que le backend soit prêt
info "Attente du démarrage du Backend..."
for i in {1..30}; do
    if curl -s http://localhost:8000/depannage/api/public/health-check/ > /dev/null 2>&1; then
        log "✅ Backend prêt sur http://localhost:8000"
        break
    fi
    if [ $i -eq 30 ]; then
        error "Backend n'a pas démarré dans les 30 secondes"
        exit 1
    fi
    sleep 1
done

# Retourner au répertoire racine
cd ..

# Vérifier les dépendances Node.js
info "Vérification des dépendances Frontend..."
cd Frontend

# Vérifier si node_modules existe
if [ ! -d "node_modules" ]; then
    log "Installation des dépendances Frontend..."
    npm install --quiet
fi

# Démarrer le frontend
log "Démarrage du Frontend React..."
npm run dev &
FRONTEND_PID=$!

# Attendre que le frontend soit prêt
info "Attente du démarrage du Frontend..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        log "✅ Frontend prêt sur http://localhost:5173"
        break
    fi
    if [ $i -eq 30 ]; then
        error "Frontend n'a pas démarré dans les 30 secondes"
        exit 1
    fi
    sleep 1
done

# Retourner au répertoire racine
cd ..

# Créer un fichier PID pour gérer les processus
echo $BACKEND_PID > .backend.pid
echo $FRONTEND_PID > .frontend.pid

# Fonction de nettoyage
cleanup() {
    log "Arrêt des services..."
    if [ -f ".backend.pid" ]; then
        kill $(cat .backend.pid) 2>/dev/null || true
        rm .backend.pid
    fi
    if [ -f ".frontend.pid" ]; then
        kill $(cat .frontend.pid) 2>/dev/null || true
        rm .frontend.pid
    fi
    exit 0
}

# Capturer les signaux d'arrêt
trap cleanup SIGINT SIGTERM

# Afficher les informations de connexion
echo ""
log "🎉 DepanneTeliman démarré avec succès!"
echo ""
echo "📡 Backend API:  http://localhost:8000"
echo "🎨 Frontend:     http://localhost:5173"
echo "📊 Admin:        http://localhost:8000/admin"
echo ""
echo "📋 Endpoints API principaux:"
echo "   - Santé:      http://localhost:8000/depannage/api/public/health-check/"
echo "   - Clients:     http://localhost:8000/depannage/api/clients/"
echo "   - Techniciens: http://localhost:8000/depannage/api/technicians/"
echo "   - Demandes:    http://localhost:8000/depannage/api/repair-requests/"
echo ""
echo "🔧 Commandes utiles:"
echo "   - Monitoring:  ./monitor.sh"
echo "   - Tests:       python test_complete_system.py"
echo "   - Optimisations: python optimize_system.py"
echo ""
echo "⏹️  Pour arrêter: Ctrl+C"
echo ""

# Attendre indéfiniment
while true; do
    # Vérifier que les processus sont toujours en cours
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        error "Backend s'est arrêté inopinément"
        cleanup
    fi
    
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        error "Frontend s'est arrêté inopinément"
        cleanup
    fi
    
    sleep 10
done