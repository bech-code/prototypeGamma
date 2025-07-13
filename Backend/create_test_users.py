#!/usr/bin/env python3
"""
Script pour créer des utilisateurs de test pour DepanneTeliman
- admin@depanneteliman.com / admin123
- technicien@depanneteliman.com / tech123
- client@depanneteliman.com / client123
"""

import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User

TEST_USERS = [
    {"email": "admin@depanneteliman.com", "password": "admin123", "user_type": "admin"},
    {"email": "technicien@depanneteliman.com", "password": "tech123", "user_type": "technician"},
    {"email": "client@depanneteliman.com", "password": "client123", "user_type": "client"},
]

def create_user(email, password, user_type):
    base_username = email.split('@')[0]
    username = base_username + '_test'
    # S'assurer que le username est unique
    i = 1
    orig_username = username
    while User.objects.filter(username=username).exists():
        username = f"{orig_username}{i}"
        i += 1
    if User.objects.filter(email=email).exists():
        print(f"⚠️  Utilisateur déjà existant: {email}")
        return False
    user = User.objects.create_user(username=username, email=email, password=password, user_type=user_type)
    print(f"✅ Utilisateur créé: {email} ({user_type}) | username: {username}")
    return True

def main():
    print("=== Création des utilisateurs de test ===")
    for u in TEST_USERS:
        create_user(u["email"], u["password"], u["user_type"])
    print("\nTerminé.")

if __name__ == "__main__":
    main() 