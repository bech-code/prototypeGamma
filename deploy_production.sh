#!/bin/bash

# Script de déploiement pour la production
# Usage: ./deploy_production.sh [version]

set -e  # Arrêter en cas d'erreur

VERSION=${1:-$(date +%Y%m%d_%H%M%S)}
PROJECT_DIR="/var/www/depannage"
BACKUP_DIR="/var/backups/depannage"
LOG_FILE="/var/log/django/deploy_${VERSION}.log"

echo "🚀 Déploiement version ${VERSION}" | tee -a ${LOG_FILE}

# 1. Sauvegarde de la base de données
echo "📦 Sauvegarde de la base de données..." | tee -a ${LOG_FILE}
mkdir -p ${BACKUP_DIR}
pg_dump depannage_prod > ${BACKUP_DIR}/backup_${VERSION}.sql
echo "✅ Sauvegarde créée: ${BACKUP_DIR}/backup_${VERSION}.sql" | tee -a ${LOG_FILE}

# 2. Sauvegarde des fichiers
echo "📁 Sauvegarde des fichiers..." | tee -a ${LOG_FILE}
tar -czf ${BACKUP_DIR}/files_${VERSION}.tar.gz -C ${PROJECT_DIR} .
echo "✅ Fichiers sauvegardés: ${BACKUP_DIR}/files_${VERSION}.tar.gz" | tee -a ${LOG_FILE}

# 3. Mise à jour du code
echo "🔄 Mise à jour du code..." | tee -a ${LOG_FILE}
cd ${PROJECT_DIR}
git fetch origin
git reset --hard origin/main
echo "✅ Code mis à jour" | tee -a ${LOG_FILE}

# 4. Installation des dépendances
echo "📦 Installation des dépendances..." | tee -a ${LOG_FILE}
source venv/bin/activate
pip install -r requirements.txt
echo "✅ Dépendances installées" | tee -a ${LOG_FILE}

# 5. Migration de la base de données
echo "🗄️ Migration de la base de données..." | tee -a ${LOG_FILE}
export DJANGO_SETTINGS_MODULE=auth.settings_production
python manage.py migrate --noinput
echo "✅ Migrations appliquées" | tee -a ${LOG_FILE}

# 6. Collecte des fichiers statiques
echo "📁 Collecte des fichiers statiques..." | tee -a ${LOG_FILE}
python manage.py collectstatic --noinput
echo "✅ Fichiers statiques collectés" | tee -a ${LOG_FILE}

# 7. Vérification de la configuration
echo "🔧 Vérification de la configuration..." | tee -a ${LOG_FILE}
python manage.py check --deploy
echo "✅ Configuration vérifiée" | tee -a ${LOG_FILE}

# 8. Test de l'application
echo "🧪 Test de l'application..." | tee -a ${LOG_FILE}
python manage.py test depannage.tests --verbosity=2
echo "✅ Tests passés" | tee -a ${LOG_FILE}

# 9. Redémarrage des services
echo "🔄 Redémarrage des services..." | tee -a ${LOG_FILE}
sudo systemctl restart gunicorn
sudo systemctl restart nginx
sudo systemctl restart redis
echo "✅ Services redémarrés" | tee -a ${LOG_FILE}

# 10. Vérification de la santé
echo "🏥 Vérification de la santé..." | tee -a ${LOG_FILE}
sleep 5
curl -f http://localhost/health/ || {
    echo "❌ L'application ne répond pas" | tee -a ${LOG_FILE}
    exit 1
}
echo "✅ Application en ligne" | tee -a ${LOG_FILE}

# 11. Nettoyage des anciennes sauvegardes (garder 7 jours)
echo "🧹 Nettoyage des anciennes sauvegardes..." | tee -a ${LOG_FILE}
find ${BACKUP_DIR} -name "backup_*.sql" -mtime +7 -delete
find ${BACKUP_DIR} -name "files_*.tar.gz" -mtime +7 -delete
echo "✅ Nettoyage terminé" | tee -a ${LOG_FILE}

# 12. Notification de succès
echo "🎉 Déploiement version ${VERSION} terminé avec succès!" | tee -a ${LOG_FILE}

# Envoi d'une notification (optionnel)
if command -v curl &> /dev/null; then
    curl -X POST "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK" \
         -H "Content-Type: application/json" \
         -d "{\"text\":\"✅ Déploiement version ${VERSION} terminé avec succès!\"}" || true
fi

echo "📋 Résumé du déploiement:"
echo "   - Version: ${VERSION}"
echo "   - Sauvegarde DB: ${BACKUP_DIR}/backup_${VERSION}.sql"
echo "   - Sauvegarde fichiers: ${BACKUP_DIR}/files_${VERSION}.tar.gz"
echo "   - Log: ${LOG_FILE}"
echo "   - URL: https://votre-domaine.com" 