#!/usr/bin/env python3
"""
Script complet de nettoyage et redémarrage pour résoudre les problèmes de tokens.
Ce script nettoie tous les tokens expirés et redémarre le serveur proprement.
"""

import os
import sys
import django
import subprocess
import time
from datetime import datetime, timedelta

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.sessions.models import Session
from django.utils import timezone

def print_status(message):
    print(f"✅ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def print_error(message):
    print(f"❌ {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def clean_all_tokens():
    """Nettoie tous les tokens et sessions."""
    print_info("Nettoyage complet des tokens et sessions...")
    
    # Nettoyer les sessions expirées
    expired_sessions = Session.objects.filter(expire_date__lt=timezone.now())
    session_count = expired_sessions.count()
    expired_sessions.delete()
    print_status(f"{session_count} sessions expirées supprimées")
    
    # Nettoyer les tokens JWT expirés
    try:
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        expired_tokens = OutstandingToken.objects.filter(expires_at__lt=timezone.now())
        token_count = expired_tokens.count()
        expired_tokens.delete()
        print_status(f"{token_count} tokens JWT expirés supprimés")
    except ImportError:
        print_warning("Blacklist JWT non activée")
    except Exception as e:
        print_error(f"Erreur lors du nettoyage des tokens JWT: {e}")
    
    # Nettoyer les anciennes notifications
    try:
        from depannage.models import Notification
        thirty_days_ago = timezone.now() - timedelta(days=30)
        old_notifications = Notification.objects.filter(
            created_at__lt=thirty_days_ago,
            is_read=True
        )
        notif_count = old_notifications.count()
        old_notifications.delete()
        print_status(f"{notif_count} anciennes notifications supprimées")
    except Exception as e:
        print_error(f"Erreur lors du nettoyage des notifications: {e}")

def stop_server():
    """Arrête le serveur Django s'il tourne."""
    print_info("Arrêt du serveur Django...")
    
    try:
        # Chercher et tuer les processus Django
        result = subprocess.run(['pkill', '-f', 'python manage.py runserver'], 
                              capture_output=True, text=True)
        if result.returncode == 0:
            print_status("Serveur Django arrêté")
        else:
            print_warning("Aucun serveur Django en cours d'exécution")
    except Exception as e:
        print_error(f"Erreur lors de l'arrêt du serveur: {e}")
    
    # Attendre un peu pour s'assurer que le serveur est arrêté
    time.sleep(2)

def start_server():
    """Démarre le serveur Django."""
    print_info("Démarrage du serveur Django...")
    
    try:
        # Démarrer le serveur en arrière-plan
        process = subprocess.Popen(['python', 'manage.py', 'runserver'], 
                                 stdout=subprocess.PIPE, 
                                 stderr=subprocess.PIPE)
        
        # Attendre un peu pour que le serveur démarre
        time.sleep(3)
        
        # Vérifier si le processus est toujours en cours
        if process.poll() is None:
            print_status("Serveur Django démarré avec succès")
            print_info("URL: http://127.0.0.1:8000")
            return process
        else:
            stdout, stderr = process.communicate()
            print_error(f"Erreur lors du démarrage du serveur: {stderr.decode()}")
            return None
    except Exception as e:
        print_error(f"Erreur lors du démarrage du serveur: {e}")
        return None

def test_endpoints():
    """Teste les endpoints principaux."""
    print_info("Test des endpoints...")
    
    import requests
    
    endpoints = [
        ("Health Check", "http://127.0.0.1:8000/depannage/api/test/health-check/"),
        ("API Info", "http://127.0.0.1:8000/depannage/api/test/api_info/"),
    ]
    
    for name, url in endpoints:
        try:
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                print_status(f"{name}: OK")
            else:
                print_warning(f"{name}: {response.status_code}")
        except Exception as e:
            print_error(f"{name}: Erreur - {e}")

def main():
    """Fonction principale."""
    print("🔧 SCRIPT DE RÉSOLUTION COMPLÈTE - DepanneTeliman")
    print("=" * 60)
    print(f"⏰ Heure: {timezone.now()}")
    print()
    
    # Étape 1: Nettoyer tous les tokens
    clean_all_tokens()
    print()
    
    # Étape 2: Arrêter le serveur
    stop_server()
    print()
    
    # Étape 3: Démarrer le serveur
    server_process = start_server()
    print()
    
    if server_process:
        # Étape 4: Tester les endpoints
        test_endpoints()
        print()
        
        print("=" * 60)
        print("🎉 RÉSOLUTION TERMINÉE!")
        print()
        print("📋 Instructions pour le frontend:")
        print("   1. Ouvrir les DevTools (F12)")
        print("   2. Aller dans Application → Local Storage")
        print("   3. Supprimer: token, refreshToken, user")
        print("   4. Recharger la page (F5)")
        print("   5. Se reconnecter")
        print()
        print("🔗 URLs:")
        print("   Backend: http://127.0.0.1:8000")
        print("   Frontend: http://localhost:5173")
        print("   Admin: http://127.0.0.1:8000/admin/")
        print()
        print("🛑 Pour arrêter le serveur: Ctrl+C")
        print()
        
        try:
            # Attendre que l'utilisateur arrête le script
            server_process.wait()
        except KeyboardInterrupt:
            print("\n🛑 Arrêt demandé par l'utilisateur")
            server_process.terminate()
            print_status("Serveur arrêté proprement")
    else:
        print_error("Impossible de démarrer le serveur")
        print_info("Vérifiez les logs pour plus d'informations")

if __name__ == "__main__":
    main() 