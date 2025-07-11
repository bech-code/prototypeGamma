# Guide de Production - Système de Paiement CinetPay

## 📋 Table des matières
1. [Prérequis](#prérequis)
2. [Configuration de l'environnement](#configuration-de-lenvironnement)
3. [Déploiement](#déploiement)
4. [Tests de production](#tests-de-production)
5. [Monitoring et maintenance](#monitoring-et-maintenance)
6. [Sécurité](#sécurité)
7. [Dépannage](#dépannage)

## 🎯 Prérequis

### Serveur de production
- **OS**: Ubuntu 20.04 LTS ou plus récent
- **RAM**: Minimum 4GB (recommandé 8GB)
- **CPU**: 2 cœurs minimum
- **Stockage**: 50GB minimum
- **Réseau**: Connexion stable à Internet

### Services requis
- **PostgreSQL** 12+ pour la base de données
- **Redis** 6+ pour le cache et les sessions
- **Nginx** pour le serveur web
- **Gunicorn** pour l'application Django
- **SSL/TLS** certificat (Let's Encrypt recommandé)

### Variables d'environnement
```bash
# CinetPay Production
export CINETPAY_API_KEY="votre_clé_api_production"
export CINETPAY_SITE_ID="votre_site_id_production"
export CINETPAY_SECRET_KEY="votre_clé_secrète_production"

# Base de données
export DB_NAME="depannage_prod"
export DB_USER="depannage_user"
export DB_PASSWORD="mot_de_passe_sécurisé"
export DB_HOST="localhost"
export DB_PORT="5432"

# Redis
export REDIS_URL="redis://localhost:6379/0"

# Email
export EMAIL_HOST="smtp.gmail.com"
export EMAIL_PORT="587"
export EMAIL_HOST_USER="votre_email@gmail.com"
export EMAIL_HOST_PASSWORD="votre_mot_de_passe_app"

# Sécurité
export SECRET_KEY="clé_secrète_très_longue_et_aléatoire"
export DJANGO_SETTINGS_MODULE="auth.settings_production"

# Monitoring (optionnel)
export SENTRY_DSN="https://votre_dsn_sentry"
export FCM_SERVER_KEY="votre_clé_firebase"
```

## 🔧 Configuration de l'environnement

### 1. Installation des dépendances système
```bash
# Mise à jour du système
sudo apt update && sudo apt upgrade -y

# Installation des paquets requis
sudo apt install -y python3 python3-pip python3-venv postgresql postgresql-contrib redis-server nginx git curl

# Installation de Node.js pour le frontend (optionnel)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
```

### 2. Configuration PostgreSQL
```bash
# Création de l'utilisateur et de la base de données
sudo -u postgres psql << EOF
CREATE USER depannage_user WITH PASSWORD 'mot_de_passe_sécurisé';
CREATE DATABASE depannage_prod OWNER depannage_user;
GRANT ALL PRIVILEGES ON DATABASE depannage_prod TO depannage_user;
\q
EOF

# Configuration de la sécurité PostgreSQL
sudo nano /etc/postgresql/*/main/postgresql.conf
# Ajouter/modifier:
# listen_addresses = 'localhost'
# max_connections = 100

sudo nano /etc/postgresql/*/main/pg_hba.conf
# Ajouter:
# local   depannage_prod    depannage_user    md5
```

### 3. Configuration Redis
```bash
# Configuration Redis
sudo nano /etc/redis/redis.conf
# Modifier:
# maxmemory 256mb
# maxmemory-policy allkeys-lru
# bind 127.0.0.1
# requirepass votre_mot_de_passe_redis

sudo systemctl restart redis
```

### 4. Configuration Nginx
```bash
# Création du fichier de configuration
sudo nano /etc/nginx/sites-available/depannage

server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    # SSL Configuration
    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512:ECDHE-RSA-AES256-GCM-SHA384:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;
    add_header X-XSS-Protection "1; mode=block";
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;

    # Static files
    location /static/ {
        alias /var/www/static/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    location /media/ {
        alias /var/www/media/;
        expires 1y;
        add_header Cache-Control "public";
    }

    # Django application
    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health/ {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# Activation du site
sudo ln -s /etc/nginx/sites-available/depannage /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. Configuration Gunicorn
```bash
# Création du service systemd
sudo nano /etc/systemd/system/gunicorn.service

[Unit]
Description=Gunicorn daemon for Depannage
After=network.target

[Service]
User=www-data
Group=www-data
WorkingDirectory=/var/www/depannage
Environment="PATH=/var/www/depannage/venv/bin"
Environment="DJANGO_SETTINGS_MODULE=auth.settings_production"
ExecStart=/var/www/depannage/venv/bin/gunicorn --workers 3 --bind 127.0.0.1:8000 auth.wsgi:application
ExecReload=/bin/kill -s HUP $MAINPID
Restart=always

[Install]
WantedBy=multi-user.target

# Activation du service
sudo systemctl daemon-reload
sudo systemctl enable gunicorn
sudo systemctl start gunicorn
```

## 🚀 Déploiement

### 1. Préparation du serveur
```bash
# Création des répertoires
sudo mkdir -p /var/www/depannage
sudo mkdir -p /var/log/django
sudo mkdir -p /var/backups/depannage
sudo mkdir -p /var/www/static
sudo mkdir -p /var/www/media

# Attribution des permissions
sudo chown -R www-data:www-data /var/www/depannage
sudo chown -R www-data:www-data /var/log/django
sudo chown -R www-data:www-data /var/backups/depannage
sudo chown -R www-data:www-data /var/www/static
sudo chown -R www-data:www-data /var/www/media
```

### 2. Déploiement du code
```bash
# Clonage du repository
cd /var/www
sudo -u www-data git clone https://github.com/votre-repo/depannage.git

# Configuration de l'environnement virtuel
cd depannage
sudo -u www-data python3 -m venv venv
sudo -u www-data venv/bin/pip install -r requirements.txt

# Configuration des variables d'environnement
sudo -u www-data nano .env
# Ajouter toutes les variables d'environnement listées plus haut
```

### 3. Configuration de la base de données
```bash
# Migration de la base de données
sudo -u www-data venv/bin/python manage.py migrate

# Création d'un superutilisateur
sudo -u www-data venv/bin/python manage.py createsuperuser

# Collecte des fichiers statiques
sudo -u www-data venv/bin/python manage.py collectstatic --noinput
```

### 4. Démarrage des services
```bash
# Redémarrage de tous les services
sudo systemctl restart postgresql
sudo systemctl restart redis
sudo systemctl restart gunicorn
sudo systemctl restart nginx

# Vérification du statut
sudo systemctl status postgresql redis gunicorn nginx
```

## 🧪 Tests de production

### 1. Tests de base
```bash
# Test de connectivité
curl -f https://votre-domaine.com/health/

# Test de l'API
curl -f https://votre-domaine.com/depannage/api/test/health_check/

# Test de la base de données
sudo -u www-data venv/bin/python manage.py dbshell
```

### 2. Tests de paiement
```bash
# Exécution des tests automatisés
cd /var/www/depannage
sudo -u www-data venv/bin/python test_payment_final.py
sudo -u www-data venv/bin/python test_payment_edge_cases.py
sudo -u www-data venv/bin/python test_performance_payment.py
```

### 3. Tests de charge
```bash
# Installation d'Apache Bench
sudo apt install apache2-utils

# Test de charge simple
ab -n 1000 -c 10 https://votre-domaine.com/health/

# Test de charge sur l'API de paiement
ab -n 100 -c 5 -H "Authorization: Bearer YOUR_TOKEN" \
   -p payment_data.json -T application/json \
   https://votre-domaine.com/depannage/api/cinetpay/initiate_subscription_payment/
```

## 📊 Monitoring et maintenance

### 1. Logs
```bash
# Logs Django
sudo tail -f /var/log/django/depannage.log

# Logs Nginx
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Logs Gunicorn
sudo journalctl -u gunicorn -f

# Logs PostgreSQL
sudo tail -f /var/log/postgresql/postgresql-*.log
```

### 2. Métriques importantes
- **Taux de succès des paiements** : > 95%
- **Temps de réponse moyen** : < 2 secondes
- **Disponibilité** : > 99.9%
- **Utilisation CPU** : < 80%
- **Utilisation mémoire** : < 80%
- **Espace disque** : < 90%

### 3. Sauvegardes automatiques
```bash
# Création d'un script de sauvegarde
sudo nano /usr/local/bin/backup_depannage.sh

#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/var/backups/depannage"

# Sauvegarde de la base de données
pg_dump depannage_prod > ${BACKUP_DIR}/db_backup_${DATE}.sql

# Sauvegarde des fichiers
tar -czf ${BACKUP_DIR}/files_backup_${DATE}.tar.gz -C /var/www/depannage .

# Nettoyage des anciennes sauvegardes (garder 30 jours)
find ${BACKUP_DIR} -name "*.sql" -mtime +30 -delete
find ${BACKUP_DIR} -name "*.tar.gz" -mtime +30 -delete

# Notification
echo "Sauvegarde ${DATE} terminée" | logger

# Ajout au cron
sudo crontab -e
# Ajouter: 0 2 * * * /usr/local/bin/backup_depannage.sh
```

## 🔒 Sécurité

### 1. Firewall
```bash
# Configuration UFW
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### 2. Mise à jour automatique
```bash
# Configuration des mises à jour automatiques
sudo apt install unattended-upgrades
sudo dpkg-reconfigure -plow unattended-upgrades
```

### 3. Monitoring de sécurité
```bash
# Installation de fail2ban
sudo apt install fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban

# Configuration pour Django
sudo nano /etc/fail2ban/jail.local

[django]
enabled = true
port = http,https
filter = django
logpath = /var/log/django/depannage.log
maxretry = 5
bantime = 3600
```

### 4. Audit de sécurité
```bash
# Vérification des permissions
sudo find /var/www/depannage -type f -exec chmod 644 {} \;
sudo find /var/www/depannage -type d -exec chmod 755 {} \;
sudo chmod 600 /var/www/depannage/.env

# Vérification des certificats SSL
sudo certbot certificates
```

## 🛠️ Dépannage

### Problèmes courants

#### 1. L'application ne répond pas
```bash
# Vérification des services
sudo systemctl status gunicorn nginx postgresql redis

# Vérification des logs
sudo journalctl -u gunicorn --since "1 hour ago"
sudo tail -f /var/log/nginx/error.log

# Redémarrage des services
sudo systemctl restart gunicorn nginx
```

#### 2. Erreurs de base de données
```bash
# Vérification de la connexion
sudo -u www-data venv/bin/python manage.py dbshell

# Vérification des migrations
sudo -u www-data venv/bin/python manage.py showmigrations

# Application des migrations manquantes
sudo -u www-data venv/bin/python manage.py migrate
```

#### 3. Problèmes de paiement
```bash
# Vérification des logs CinetPay
sudo tail -f /var/log/django/depannage.log | grep CINETPAY

# Test de l'endpoint de notification
curl -X POST https://votre-domaine.com/depannage/api/cinetpay/notify/ \
     -H "Content-Type: application/json" \
     -d '{"transaction_id": "TEST", "status": "ACCEPTED", "amount": 5000, "currency": "XOF", "payment_date": "2025-07-11T10:00:00Z"}'

# Vérification des abonnements
sudo -u www-data venv/bin/python manage.py shell
>>> from depannage.models import TechnicianSubscription
>>> TechnicianSubscription.objects.filter(is_active=True).count()
```

#### 4. Problèmes de performance
```bash
# Vérification de l'utilisation des ressources
htop
df -h
free -h

# Optimisation de PostgreSQL
sudo -u postgres psql -c "SELECT * FROM pg_stat_activity;"
sudo -u postgres psql -c "SELECT * FROM pg_stat_database;"

# Optimisation de Redis
redis-cli info memory
redis-cli info stats
```

### Scripts de diagnostic
```bash
# Création d'un script de diagnostic
sudo nano /usr/local/bin/diagnose_depannage.sh

#!/bin/bash
echo "=== DIAGNOSTIC DEPANNAGE ==="
echo "Date: $(date)"
echo ""

echo "=== SERVICES ==="
systemctl is-active postgresql redis gunicorn nginx

echo ""
echo "=== RESSOURCES ==="
free -h
df -h /

echo ""
echo "=== LOGS RECENTS ==="
tail -n 20 /var/log/django/depannage.log

echo ""
echo "=== CONNECTIVITE ==="
curl -f https://votre-domaine.com/health/ && echo "✅ Application OK" || echo "❌ Application KO"

chmod +x /usr/local/bin/diagnose_depannage.sh
```

## 📞 Support

### Contacts d'urgence
- **Développeur principal** : [votre-email@domaine.com]
- **Administrateur système** : [admin@domaine.com]
- **CinetPay Support** : [support@cinetpay.com]

### Procédures d'urgence
1. **Application inaccessible** : Redémarrer les services
2. **Paiements en échec** : Vérifier les logs CinetPay
3. **Base de données corrompue** : Restaurer la dernière sauvegarde
4. **Attaque de sécurité** : Bloquer les IPs suspectes avec fail2ban

### Maintenance planifiée
- **Sauvegardes** : Tous les jours à 2h du matin
- **Mises à jour** : Tous les dimanches à 3h du matin
- **Nettoyage des logs** : Tous les mois
- **Audit de sécurité** : Tous les trimestres

---

**Note importante** : Ce guide doit être adapté à votre environnement spécifique et à vos besoins de sécurité. Testez toujours les procédures dans un environnement de staging avant de les appliquer en production. 