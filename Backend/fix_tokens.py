#!/usr/bin/env python3
# Script de correction automatique généré
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.sessions.models import Session
from django.utils import timezone

print("🧹 Nettoyage automatique...")

# Nettoyer les sessions expirées
expired_sessions = Session.objects.filter(expire_date__lt=timezone.now())
count = expired_sessions.count()
expired_sessions.delete()
print(f"✅ {count} sessions expirées supprimées")

# Nettoyer les tokens JWT expirés
try:
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
    expired_tokens = OutstandingToken.objects.filter(expires_at__lt=timezone.now())
    count = expired_tokens.count()
    expired_tokens.delete()
    print(f"✅ {count} tokens JWT expirés supprimés")
except:
    print("ℹ️ Blacklist JWT non activée")

print("🎉 Nettoyage terminé!")
