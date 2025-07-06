#!/bin/bash

# Script pour configurer des alias utiles pour le projet
# Usage: source setup_aliases.sh

echo "🔧 Configuration des alias pour le projet Prototype5b..."

# Obtenir le chemin absolu du projet
PROJECT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Alias pour démarrer le backend
alias start-backend="cd $PROJECT_DIR && ./start_backend.sh asgi"
alias start-backend-uvicorn="cd $PROJECT_DIR && ./start_backend.sh uvicorn"
alias start-backend-django="cd $PROJECT_DIR && ./start_backend.sh django"

# Alias pour aller dans les dossiers
alias cd-backend="cd $PROJECT_DIR/Backend"
alias cd-frontend="cd $PROJECT_DIR/Frontend"

# Alias pour les tests
alias test-websocket="cd $PROJECT_DIR/Backend && python test_websocket.py"
alias test-api="curl http://127.0.0.1:8000/depannage/api/test/health_check/"

# Alias pour les logs
alias logs-backend="tail -f $PROJECT_DIR/Backend/logs/*.log 2>/dev/null || echo 'Aucun fichier de log trouvé'"

# Fonction pour afficher l'aide
backend-help() {
    echo "🚀 Commandes disponibles pour Prototype5b:"
    echo
    echo "Démarrage du backend:"
    echo "  start-backend           # Démarre avec Daphne (ASGI)"
    echo "  start-backend-uvicorn   # Démarre avec Uvicorn (ASGI)"
    echo "  start-backend-django    # Démarre avec Django (WSGI - WebSockets KO)"
    echo
    echo "Navigation:"
    echo "  cd-backend              # Va dans le dossier Backend"
    echo "  cd-frontend             # Va dans le dossier Frontend"
    echo
    echo "Tests:"
    echo "  test-websocket          # Lance le test WebSocket"
    echo "  test-api                # Test l'API de santé"
    echo "  logs-backend            # Affiche les logs du backend"
    echo
    echo "Aide:"
    echo "  backend-help            # Affiche cette aide"
    echo
    echo "💡 Conseil: Ajoutez 'source $PROJECT_DIR/setup_aliases.sh' à votre ~/.bashrc ou ~/.zshrc"
}

echo "✅ Alias configurés! Tapez 'backend-help' pour voir toutes les commandes."
echo "💡 Pour rendre ces alias permanents, ajoutez 'source $PROJECT_DIR/setup_aliases.sh' à votre ~/.bashrc ou ~/.zshrc" 