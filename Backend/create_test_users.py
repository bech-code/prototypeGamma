#!/usr/bin/env python3
"""
Script pour créer ou mettre à jour les utilisateurs de test principaux (plombier, clients).
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from depannage.models import Technician, RepairRequest, TechnicianLocation, TechnicianSubscription, Route
from django.db import transaction
# Ajouts pour nettoyage complet
from depannage.models import Review, Notification
try:
    from depannage.models import TechnicianReviewAnalytics
except ImportError:
    TechnicianReviewAnalytics = None
# Importer les modèles additionnels si existants
try:
    from depannage.models import ChatConversation, CommunicationStats, ServiceZone, ReviewAnalytics, SubscriptionPaymentRequest
except ImportError:
    ChatConversation = None
    CommunicationStats = None
    ServiceZone = None
    ReviewAnalytics = None
    SubscriptionPaymentRequest = None

User = get_user_model()

USERS = [
    {
        "email": "ballo@gmail.com",
        "username": "ballo_plombier",
        "password": "bechir66312345",
        "user_type": "technician",
        "first_name": "Ballo",
        "last_name": "Plombier"
    },
    {
        "email": "client2@example.com",
        "username": "client2",
        "password": "bechir66312345",
        "user_type": "client",
        "first_name": "Client",
        "last_name": "Deux"
    },
    {
        "email": "client3@example.com",
        "username": "client3",
        "password": "bechir66312345",
        "user_type": "client",
        "first_name": "Client",
        "last_name": "Trois"
    },
]

for u in USERS:
    user, created = User.objects.get_or_create(email=u["email"], defaults={
        "username": u["username"],
        "user_type": u["user_type"],
        "first_name": u["first_name"],
        "last_name": u["last_name"]
    })
    # Si l'utilisateur n'existe pas (get_or_create n'a rien retourné), le créer manuellement
    if not user:
        user = User.objects.create_user(
            username=u["username"],
            email=u["email"],
            password=u["password"],
            user_type=u["user_type"],
            first_name=u["first_name"],
            last_name=u["last_name"]
        )
        created = True
    user.set_password(u["password"])
    user.user_type = u["user_type"]
    user.username = u["username"]
    user.first_name = u["first_name"]
    user.last_name = u["last_name"]
    user.save()
    print(f"{'Créé' if created else 'Mis à jour'} : {u['email']} ({u['user_type']})")
    # Création de l'objet Technician si nécessaire
    if u["user_type"] == "technician":
        # Nettoyage des dépendances
        try:
            old_tech = Technician.objects.get(user=user)
            # RepairRequest
            RepairRequest.objects.filter(technician=old_tech).update(technician=None)
            # TechnicianLocation
            TechnicianLocation.objects.filter(technician=old_tech).delete()
            # TechnicianSubscription
            TechnicianSubscription.objects.filter(technician=old_tech).delete()
            # Route
            Route.objects.filter(technician=old_tech).delete()
            # Review
            Review.objects.filter(technician=old_tech).delete()
            # Notification
            Notification.objects.filter(request__technician=old_tech).delete()
            # TechnicianReviewAnalytics
            if TechnicianReviewAnalytics:
                TechnicianReviewAnalytics.objects.filter(technician=old_tech).delete()
            # ChatConversation
            if ChatConversation:
                ChatConversation.objects.filter(technician=user).delete()
            # CommunicationStats
            if CommunicationStats:
                CommunicationStats.objects.filter(conversation__technician=user).delete()
            # ServiceZone (table d'association)
            if ServiceZone:
                ServiceZone.technicians.through.objects.filter(technician_id=old_tech.id).delete()
            # ReviewAnalytics
            if ReviewAnalytics:
                ReviewAnalytics.objects.filter(technician=old_tech).delete()
            # SubscriptionPaymentRequest
            if SubscriptionPaymentRequest:
                SubscriptionPaymentRequest.objects.filter(technician=old_tech).delete()
            old_tech.delete()
            print(f"Ancien Technician supprimé pour {u['email']}")
        except Technician.DoesNotExist:
            pass
        # Créer un nouvel objet Technician proprement
        with transaction.atomic():
            tech = Technician.objects.create(user=user)
            print(f"Technician (neuf) créé pour {u['email']}")

print("\n🎉 Utilisateurs de test prêts (plombier, client2, client3)") 