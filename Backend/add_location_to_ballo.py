#!/usr/bin/env python3
"""
Script pour ajouter une localisation GPS à ballo@gmail.com
afin qu'il puisse être trouvé dans les recherches de techniciens.
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician, TechnicianLocation

def add_location_to_ballo():
    """Ajoute une localisation GPS à ballo@gmail.com."""
    
    print("📍 Ajout de localisation GPS à ballo@gmail.com")
    print("=" * 50)
    
    # Vérifier que ballo@gmail.com existe
    try:
        ballo_user = User.objects.get(email="ballo@gmail.com")
        ballo_technician = Technician.objects.get(user=ballo_user)
        print(f"✅ Technicien trouvé: {ballo_user.get_full_name()}")
        print(f"   Email: {ballo_user.email}")
        print(f"   Spécialité: {ballo_technician.specialty}")
        print(f"   Vérifié: {ballo_technician.is_verified}")
        print(f"   Disponible: {ballo_technician.is_available}")
    except User.DoesNotExist:
        print("❌ Utilisateur ballo@gmail.com non trouvé")
        return
    except Technician.DoesNotExist:
        print("❌ Profil technicien non trouvé pour ballo@gmail.com")
        return
    
    # Coordonnées GPS d'Abidjan (centre-ville)
    latitude = 5.3600
    longitude = -4.0083
    
    # Créer ou mettre à jour la localisation
    location, created = TechnicianLocation.objects.get_or_create(
        technician=ballo_technician,
        defaults={
            'latitude': latitude,
            'longitude': longitude,
        }
    )
    
    if created:
        print(f"✅ Localisation créée pour ballo@gmail.com")
    else:
        # Mettre à jour la localisation existante
        location.latitude = latitude
        location.longitude = longitude
        location.save()
        print(f"✅ Localisation mise à jour pour ballo@gmail.com")
    
    print(f"   Latitude: {latitude}")
    print(f"   Longitude: {longitude}")
    print(f"   Localisation: Abidjan, Côte d'Ivoire")
    
    # Mettre à jour aussi les coordonnées dans le modèle Technician
    ballo_technician.current_latitude = latitude
    ballo_technician.current_longitude = longitude
    ballo_technician.save()
    print(f"✅ Coordonnées mises à jour dans le modèle Technician")
    
    print("\n🎉 Localisation ajoutée avec succès!")
    print("Maintenant ballo@gmail.com devrait apparaître dans les recherches de techniciens.")

if __name__ == "__main__":
    add_location_to_ballo() 