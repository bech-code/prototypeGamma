#!/bin/bash

# Script de démarrage rapide pour tester les statistiques
# DepanneTeliman Backend

echo "=========================================="
echo "  TEST DES STATISTIQUES - DEPANNETELIMAN"
echo "=========================================="
echo ""

# Vérifier si le serveur Django est en cours d'exécution
echo "🔍 Vérification du serveur Django..."
if curl -s http://localhost:8000/depannage/api/test/health_check/ > /dev/null 2>&1; then
    echo "✅ Serveur Django en cours d'exécution"
else
    echo "❌ Serveur Django non accessible"
    echo ""
    echo "Pour démarrer le serveur:"
    echo "  python manage.py runserver"
    echo ""
    echo "Voulez-vous démarrer le serveur maintenant? (y/n)"
    read -r response
    if [[ "$response" =~ ^[Yy]$ ]]; then
        echo "🚀 Démarrage du serveur Django..."
        python manage.py runserver &
        SERVER_PID=$!
        echo "Serveur démarré avec PID: $SERVER_PID"
        echo "Attente de 3 secondes pour que le serveur soit prêt..."
        sleep 3
    else
        echo "❌ Impossible de continuer sans serveur"
        exit 1
    fi
fi

echo ""
echo "📊 Options de test disponibles:"
echo "1. Test complet avec tous les utilisateurs"
echo "2. Test simple (interactif)"
echo "3. Vérification des URLs"
echo "4. Quitter"
echo ""

read -p "Choisissez une option (1-4): " choice

case $choice in
    1)
        echo ""
        echo "🧪 Lancement du test complet..."
        python test_statistics.py
        ;;
    2)
        echo ""
        echo "🧪 Lancement du test simple..."
        python test_stats_simple.py
        ;;
    3)
        echo ""
        echo "🔍 Vérification des URLs..."
        python check_stats_urls.py
        ;;
    4)
        echo "👋 Au revoir!"
        exit 0
        ;;
    *)
        echo "❌ Option invalide"
        exit 1
        ;;
esac

# Nettoyer le serveur si on l'a démarré
if [ ! -z "$SERVER_PID" ]; then
    echo ""
    echo "🛑 Arrêt du serveur Django..."
    kill $SERVER_PID
    echo "Serveur arrêté"
fi

echo ""
echo "✅ Test terminé!" 