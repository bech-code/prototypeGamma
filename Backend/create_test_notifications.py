#!/usr/bin/env python3
"""
Script pour créer des notifications de test pour l'admin.
"""
import os
import sys
import django
from datetime import timedelta

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from depannage.models import AdminNotification
from django.utils import timezone

def create_test_notifications():
    print("🔧 Création de notifications de test...")
    
    # Supprimer les anciennes notifications de test
    AdminNotification.objects.filter(title__startswith="Test").delete()
    print("🗑️ Anciennes notifications de test supprimées")
    
    # Créer des notifications variées
    notifications = [
        {
            "title": "Nouveau technicien inscrit",
            "message": "Le technicien Mamadou Diallo s'est inscrit sur la plateforme. Spécialité: Électricité",
            "severity": "info"
        },
        {
            "title": "Demande urgente en attente",
            "message": "Une demande de réparation urgente (ID: #1234) attend d'être assignée depuis plus de 2 heures",
            "severity": "warning"
        },
        {
            "title": "Tentative de connexion suspecte",
            "message": "Tentative de connexion depuis une IP non reconnue (192.168.1.100) pour l'utilisateur admin",
            "severity": "critical"
        },
        {
            "title": "Paiement reçu",
            "message": "Un paiement de 25,000 FCFA a été reçu pour la demande #5678",
            "severity": "info"
        },
        {
            "title": "Technicien non venu",
            "message": "Le client a signalé l'absence du technicien pour la demande #9101. Réassignation automatique en cours",
            "severity": "warning"
        },
        {
            "title": "Nouvel avis client",
            "message": "Un nouvel avis 5 étoiles a été laissé par le client pour le technicien Souleymane Keita",
            "severity": "info"
        },
        {
            "title": "Maintenance système",
            "message": "Une maintenance système est prévue ce soir de 23h à 02h. La plateforme sera temporairement indisponible",
            "severity": "warning"
        },
        {
            "title": "Suspicion de fraude",
            "message": "Activité suspecte détectée sur le compte utilisateur ID: 789. Investigation en cours",
            "severity": "critical"
        }
    ]
    
    # Créer les notifications avec des dates échelonnées
    for i, notif_data in enumerate(notifications):
        # Créer des dates échelonnées (plus récentes en premier)
        created_at = timezone.now() - timedelta(hours=i*2)
        
        AdminNotification.objects.create(
            title=notif_data["title"],
            message=notif_data["message"],
            severity=notif_data["severity"],
            created_at=created_at,
            is_read=i % 3 == 0  # Marquer certaines comme lues
        )
    
    print(f"✅ {len(notifications)} notifications de test créées")
    
    # Afficher le résumé
    total = AdminNotification.objects.count()
    unread = AdminNotification.objects.filter(is_read=False).count()
    print(f"📊 Total notifications: {total}")
    print(f"📊 Non lues: {unread}")
    print(f"📊 Lues: {total - unread}")

if __name__ == "__main__":
    create_test_notifications() 