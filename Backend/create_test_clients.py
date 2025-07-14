#!/usr/bin/env python3
"""
Script pour créer 3 clients de test avec des emails, quartiers de Bamako et numéros maliens.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from depannage.models import Client

User = get_user_model()

clients_data = [
    {
        "email": "client1@example.com",
        "username": "client1",
        "password": "bechir66312345",
        "first_name": "Client",
        "last_name": "Un",
        "user_type": "client",
        "quartier": "Sotuba",
        "phone": "+223 70 01 23 45"
    },
    {
        "email": "client2@example.com",
        "username": "client2",
        "password": "bechir66312345",
        "first_name": "Client",
        "last_name": "Deux",
        "user_type": "client",
        "quartier": "Badalabougou",
        "phone": "+223 70 02 34 56"
    },
    {
        "email": "client3@example.com",
        "username": "client3",
        "password": "bechir66312345",
        "first_name": "Client",
        "last_name": "Trois",
        "user_type": "client",
        "quartier": "Hamdallaye",
        "phone": "+223 70 03 45 67"
    },
]

for data in clients_data:
    user, created = User.objects.get_or_create(email=data["email"], defaults={
        "username": data["username"],
        "user_type": data["user_type"],
        "first_name": data["first_name"],
        "last_name": data["last_name"]
    })
    user.set_password(data["password"])
    user.user_type = data["user_type"]
    user.username = data["username"]
    user.first_name = data["first_name"]
    user.last_name = data["last_name"]
    user.save()
    client, c_created = Client.objects.get_or_create(user=user, defaults={
        "phone": data["phone"],
        "address": f"{data['quartier']}, Bamako"
    })
    print(f"{'Créé' if created else 'Mis à jour'} : {data['email']} ({data['quartier']})")

print("\n🎉 3 clients de test créés avec succès !") 