#!/bin/bash

echo "🧹 Nettoyage du cache et des données expirées..."

# Nettoyer le cache npm
echo "📦 Nettoyage du cache npm..."
npm cache clean --force

# Supprimer node_modules et réinstaller
echo "🗑️  Suppression de node_modules..."
rm -rf node_modules
rm -f package-lock.json

# Réinstaller les dépendances
echo "📦 Réinstallation des dépendances..."
npm install

# Nettoyer le cache du navigateur (instructions)
echo ""
echo "🌐 Pour nettoyer le cache du navigateur :"
echo "   Chrome/Edge: Ctrl+Shift+Delete ou Cmd+Shift+Delete"
echo "   Firefox: Ctrl+Shift+Delete ou Cmd+Shift+Delete"
echo ""
echo "   Ou ouvrez les DevTools (F12) et :"
echo "   1. Allez dans l'onglet Application/Storage"
echo "   2. Local Storage"
echo "   3. Supprimez les entrées 'token' et 'refreshToken'"
echo ""

# Vérifier si le backend est en cours d'exécution
echo "🔍 Vérification du backend..."
if curl -s http://127.0.0.1:8000/admin/ > /dev/null 2>&1; then
    echo "✅ Backend Django détecté"
else
    echo "⚠️  Backend Django non détecté"
    echo "   Démarrez-le avec: cd ../Backend && python manage.py runserver"
fi

echo ""
echo "✨ Nettoyage terminé !"
echo "🚀 Vous pouvez maintenant redémarrer l'application avec: npm run dev" 