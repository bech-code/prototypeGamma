#!/usr/bin/env python3
"""
Script pour réinitialiser le mot de passe de tous les utilisateurs à 'bechir66312345'.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model

User = get_user_model()

new_password = 'bechir66312345'

for user in User.objects.all():
    user.set_password(new_password)
    user.save()
    print(f"✅ Mot de passe réinitialisé pour: {user.email} ({user.username})")

print("\n🎉 Tous les mots de passe ont été réinitialisés à 'bechir66312345'.") 