#!/usr/bin/env python3
"""
Script pour garantir la présence des profils de test essentiels (admin, client2, ballo_plombier) et leurs objets liés.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from depannage.models import Technician
from users.models import TechnicianProfile
from django.db import transaction

User = get_user_model()

TEST_USERS = [
    {
        "email": "mohamedbechirdiarra4@gmail.com",
        "username": "depan_use",
        "password": "bechir66312345",
        "user_type": "admin",
        "first_name": "Admin",
        "last_name": "Test"
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
        "email": "ballo@gmail.com",
        "username": "ballo_plombier",
        "password": "bechir66312345",
        "user_type": "technician",
        "first_name": "Ballo",
        "last_name": "Plombier"
    },
]

for u in TEST_USERS:
    user, created = User.objects.get_or_create(email=u["email"], defaults={
        "username": u["username"],
        "user_type": u["user_type"],
        "first_name": u["first_name"],
        "last_name": u["last_name"]
    })
    user.set_password(u["password"])
    user.user_type = u["user_type"]
    user.username = u["username"]
    user.first_name = u["first_name"]
    user.last_name = u["last_name"]
    user.save()
    print(f"{'Créé' if created else 'Mis à jour'} : {u['email']} ({u['user_type']})")
    # S'assurer que le profil lié existe
    if u["user_type"] == "technician":
        with transaction.atomic():
            tech, tech_created = Technician.objects.get_or_create(user=user)
            print(f"{'Créé' if tech_created else 'Déjà présent'} : Technician pour {u['email']}")
            # Créer un TechnicianProfile minimal si besoin
            try:
                prof, prof_created = TechnicianProfile.objects.get_or_create(user=user, defaults={
                    "specialty": "plumber",
                    "years_experience": 5,
                    "phone": "+22500000002",
                    "address": "Test Address",
                    "piece_identite": "technician_docs/test_piece_identite.pdf",
                    "certificat_residence": "technician_docs/test_certificat_residence.pdf"
                })
                print(f"{'Créé' if prof_created else 'Déjà présent'} : TechnicianProfile pour {u['email']}")
            except Exception as e:
                print(f"[WARN] Impossible de créer TechnicianProfile pour {u['email']}: {e}")

print("\n🎉 Profils de test essentiels garantis (admin, client2, ballo_plombier)") 