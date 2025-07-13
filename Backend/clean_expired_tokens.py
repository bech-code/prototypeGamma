#!/usr/bin/env python3
"""
Script pour nettoyer les tokens JWT expirés et les sessions Django.
Ce script doit être exécuté depuis le répertoire Backend.
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.sessions.models import Session
from django.utils import timezone
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

def clean_expired_sessions():
    """Nettoie les sessions Django expirées."""
    try:
        # Supprimer les sessions expirées
        expired_sessions = Session.objects.filter(expire_date__lt=timezone.now())
        count = expired_sessions.count()
        expired_sessions.delete()
        print(f"✅ {count} sessions expirées supprimées")
        return count
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage des sessions: {e}")
        return 0

def clean_expired_jwt_tokens():
    """Nettoie les tokens JWT expirés (si blacklist activée)."""
    try:
        # Vérifier si la blacklist est activée
        from rest_framework_simplejwt.settings import api_settings
        if not api_settings.BLACKLIST_AFTER_ROTATION:
            print("ℹ️  Blacklist JWT non activée, pas de nettoyage nécessaire")
            return 0
        
        # Importer le modèle de blacklist
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
        
        # Supprimer les tokens expirés
        now = timezone.now()
        expired_tokens = OutstandingToken.objects.filter(expires_at__lt=now)
        count = expired_tokens.count()
        expired_tokens.delete()
        
        print(f"✅ {count} tokens JWT expirés supprimés")
        return count
    except ImportError:
        print("ℹ️  Module blacklist JWT non disponible")
        return 0
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage des tokens JWT: {e}")
        return 0

def clean_old_notifications():
    """Nettoie les anciennes notifications (optionnel)."""
    try:
        from depannage.models import Notification
        
        # Supprimer les notifications de plus de 30 jours
        thirty_days_ago = timezone.now() - timedelta(days=30)
        old_notifications = Notification.objects.filter(
            created_at__lt=thirty_days_ago,
            is_read=True
        )
        count = old_notifications.count()
        old_notifications.delete()
        
        print(f"✅ {count} anciennes notifications supprimées")
        return count
    except Exception as e:
        print(f"❌ Erreur lors du nettoyage des notifications: {e}")
        return 0

def main():
    """Fonction principale de nettoyage."""
    print("🧹 Début du nettoyage des données expirées...")
    print(f"⏰ Heure actuelle: {timezone.now()}")
    print("-" * 50)
    
    total_cleaned = 0
    
    # Nettoyer les sessions
    sessions_cleaned = clean_expired_sessions()
    total_cleaned += sessions_cleaned
    
    # Nettoyer les tokens JWT
    tokens_cleaned = clean_expired_jwt_tokens()
    total_cleaned += tokens_cleaned
    
    # Nettoyer les anciennes notifications (optionnel)
    notifications_cleaned = clean_old_notifications()
    total_cleaned += notifications_cleaned
    
    print("-" * 50)
    print(f"🎉 Nettoyage terminé! {total_cleaned} éléments supprimés au total")
    
    if total_cleaned > 0:
        print("💡 Conseil: Exécutez ce script régulièrement pour maintenir les performances")
    else:
        print("✨ Aucun élément à nettoyer - base de données propre!")

if __name__ == "__main__":
    main() 