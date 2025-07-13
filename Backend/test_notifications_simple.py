#!/usr/bin/env python3
"""
Script simple pour tester les notifications admin.
"""
import os
import sys
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from depannage.models import AdminNotification
from users.models import User

def test_admin_notifications():
    print("🔍 Test des notifications admin...")
    
    # Vérifier si l'utilisateur admin existe
    try:
        admin_user = User.objects.get(username='depan_use')
        print(f"✅ Utilisateur admin trouvé: {admin_user.username}")
    except User.DoesNotExist:
        print("❌ Utilisateur admin 'depan_use' non trouvé")
        return
    
    # Compter les notifications admin
    notifications_count = AdminNotification.objects.count()
    print(f"📊 Nombre total de notifications admin: {notifications_count}")
    
    if notifications_count > 0:
        print("\n📋 Dernières notifications:")
        for notif in AdminNotification.objects.order_by('-created_at')[:5]:
            print(f"  - {notif.title} ({notif.severity}) - {notif.created_at}")
    else:
        print("❌ Aucune notification admin trouvée")
        
        # Créer une notification de test
        print("\n🔧 Création d'une notification de test...")
        test_notif = AdminNotification.objects.create(
            title="Test Notification Admin",
            message="Ceci est une notification de test pour vérifier le fonctionnement",
            severity="info"
        )
        print(f"✅ Notification de test créée: {test_notif.id}")
        
        # Recompter
        new_count = AdminNotification.objects.count()
        print(f"📊 Nouveau nombre de notifications: {new_count}")

if __name__ == "__main__":
    test_admin_notifications() 