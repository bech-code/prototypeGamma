#!/usr/bin/env python3
"""
Script pour générer des données de test/démo pour DepanneTeliman
- Demandes (RepairRequest)
- Paiements (Payment)
- Avis (Review)
"""
import os
import django
import random
from datetime import datetime, timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from depannage.models import RepairRequest, Technician, Client, Payment, Review
from django.utils import timezone

SPECIALTIES = [
    'plomberie', 'electricite', 'serrurerie', 'informatique', 'climatisation', 'electromenager', 'autre'
]
CITIES = [
    'Bamako', 'Sikasso', 'Kayes', 'Segou', 'Mopti', 'Koutiala', 'Gao', 'Tombouctou', 'Kidal', 'San'
]
STATUSES = ['pending', 'assigned', 'in_progress', 'completed', 'cancelled']
PAYMENT_METHODS = ['mobile_money', 'carte_bancaire', 'espece']

ADMIN_EMAIL = 'admin@depanneteliman.com'
TECH_EMAIL = 'technicien@depanneteliman.com'
CLIENT_EMAIL = 'client@depanneteliman.com'

random.seed(42)

User = get_user_model()

def get_user(email):
    try:
        return User.objects.get(email=email)
    except User.DoesNotExist:
        return None

def get_profile(model, user):
    try:
        return model.objects.get(user=user)
    except model.DoesNotExist:
        return None

def create_requests(client, technician, n=30):
    print(f"Création de {n} demandes...")
    requests = []
    now = timezone.now()
    for i in range(n):
        status = random.choices(STATUSES, weights=[2,2,2,3,1])[0]
        specialty = random.choice(SPECIALTIES)
        city = random.choice(CITIES)
        created_at = now - timedelta(days=random.randint(0, 30))
        final_price = random.randint(5000, 50000) if status in ['completed', 'in_progress'] else None
        req = RepairRequest.objects.create(
            client=client,
            technician=technician if status != 'pending' else None,
            specialty_needed=specialty,
            status=status,
            city=city,
            description=f"Problème de {specialty} à {city}",
            created_at=created_at,
            final_price=final_price,
            date=created_at.date(),
        )
        requests.append(req)
    print(f"✅ {n} demandes créées.")
    return requests

def create_payments(requests):
    print("Création des paiements...")
    for req in requests:
        if req.status == 'completed' and not Payment.objects.filter(request=req).exists():
            Payment.objects.create(
                request=req,
                payer=req.client.user,
                recipient=req.technician.user if req.technician else req.client.user,
                amount=req.final_price or random.randint(5000, 50000),
                status='completed',
                method=random.choice(PAYMENT_METHODS),
                payment_type='client_payment',
                notes=f"Paiement pour demande {req.id}",
            )
    print("✅ Paiements créés.")

def create_reviews(requests):
    print("Création des avis...")
    for req in requests:
        if req.status == 'completed' and not Review.objects.filter(request=req).exists():
            Review.objects.create(
                request=req,
                client=req.client,
                technician=req.technician,
                rating=random.randint(3, 5),
                comment=f"Service {req.specialty_needed} à {req.city} : très satisfait !",
            )
    print("✅ Avis créés.")

def main():
    print("=== Génération de données de test/démo ===")
    admin = get_user(ADMIN_EMAIL)
    tech = get_user(TECH_EMAIL)
    client = get_user(CLIENT_EMAIL)
    if not (admin and tech and client):
        print("❌ Utilisateurs de test manquants. Exécute d'abord create_test_users.py et create_test_profiles.py")
        return
    tech_profile = get_profile(Technician, tech)
    client_profile = get_profile(Client, client)
    if not (tech_profile and client_profile):
        print("❌ Profils Technician/Client manquants. Exécute d'abord create_test_profiles.py")
        return
    # Créer des demandes, paiements, avis
    requests = create_requests(client_profile, tech_profile, n=30)
    create_payments(requests)
    create_reviews(requests)
    print("\n🎉 Données de test générées !")

if __name__ == "__main__":
    main() 