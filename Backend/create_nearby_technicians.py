import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, TechnicianLocation

# Coordonnées GPS de référence (exemple : Abidjan)
latitude = 5.348
longitude = -4.027

for i in range(1, 6):  # Crée 5 techniciens
    email = f'techproche{i}@example.com'
    password = 'testpass'
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': f'techproche{i}',
            'first_name': f'Tech{i}',
            'last_name': 'Proche',
            'user_type': 'technician',
            'is_active': True,
        }
    )
    if created:
        user.set_password(password)
        user.save()
        print(f'Utilisateur créé : {email}')
    else:
        print(f'Utilisateur déjà existant : {email}')

    # Crée ou met à jour le profil Technician
    technician, tech_created = Technician.objects.get_or_create(
        user=user,
        defaults={
            'specialty': Technician.Specialty.PLUMBER,
            'phone': f'01020304{i}',
            'is_available': True,
            'is_verified': True,
            'years_experience': 3,
            'experience_level': Technician.ExperienceLevel.INTERMEDIATE,
            'hourly_rate': 10000,
        }
    )
    if tech_created:
        print(f'Profil Technician créé pour : {email}')
    else:
        print(f'Profil Technician déjà existant pour : {email}')

    # Crée ou met à jour la localisation du technicien
    TechnicianLocation.objects.update_or_create(
        technician=technician,
        defaults={
            'latitude': latitude + i * 0.0001,  # Légère variation pour chaque technicien
            'longitude': longitude + i * 0.0001,
        }
    )
    print(f'Localisation mise à jour pour : {email}') 