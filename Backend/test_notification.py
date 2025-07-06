#!/usr/bin/env python3
"""
Script de test pour créer une notification et vérifier qu'elle arrive en temps réel.
"""

import os
import sys
import django
import requests
import json
from datetime import datetime

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from depannage.models import Notification, RepairRequest
from users.models import User

def create_test_notification(user_id=None):
    """Crée une notification de test pour un utilisateur."""
    
    # Si aucun user_id fourni, prendre le premier utilisateur
    if not user_id:
        user = User.objects.first()
        if not user:
            print("❌ Aucun utilisateur trouvé dans la base de données")
            return None
        user_id = user.id
    
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        print(f"❌ Utilisateur avec ID {user_id} non trouvé")
        return None
    
    # Créer une notification de test
    notification = Notification.objects.create(
        recipient=user,
        type=Notification.Type.SYSTEM,
        title="Test WebSocket - " + datetime.now().strftime("%H:%M:%S"),
        message="Ceci est un test de notification en temps réel via WebSocket.",
        is_read=False
    )
    
    print(f"✅ Notification créée pour {user.email} (ID: {notification.id})")
    print(f"   Titre: {notification.title}")
    print(f"   Message: {notification.message}")
    print(f"   Type: {notification.type}")
    print(f"   Créée à: {notification.created_at}")
    
    return notification

def test_websocket_notification():
    """Test complet de création de notification avec vérification WebSocket."""
    
    print("🔔 Test de notification WebSocket")
    print("=" * 50)
    
    # 1. Créer une notification
    notification = create_test_notification()
    if not notification:
        return
    
    # 2. Vérifier que la notification existe en base
    try:
        saved_notification = Notification.objects.get(id=notification.id)
        print(f"✅ Notification sauvegardée en base (ID: {saved_notification.id})")
    except Notification.DoesNotExist:
        print("❌ Notification non trouvée en base")
        return
    
    # 3. Informations pour le test manuel
    print("\n📋 Instructions pour tester le WebSocket :")
    print("1. Ouvre ton frontend dans le navigateur")
    print("2. Connecte-toi avec l'utilisateur :", notification.recipient.email)
    print("3. Vérifie que la notification apparaît en temps réel")
    print("4. Regarde la console du navigateur pour les logs WebSocket")
    
    return notification

def list_users():
    """Liste tous les utilisateurs disponibles."""
    print("👥 Utilisateurs disponibles :")
    print("-" * 30)
    for user in User.objects.all()[:10]:  # Limiter à 10
        print(f"ID: {user.id} | Email: {user.email} | Nom: {user.get_full_name()}")
    print("-" * 30)

if __name__ == "__main__":
    if len(sys.argv) > 1:
        if sys.argv[1] == "list":
            list_users()
        elif sys.argv[1].isdigit():
            create_test_notification(int(sys.argv[1]))
        else:
            print("Usage: python test_notification.py [list|user_id]")
    else:
        test_websocket_notification() 