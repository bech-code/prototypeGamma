#!/usr/bin/env python3
"""
Script de test pour vérifier que la fonction get_technician_profile 
fonctionne correctement avec les deux relations technician.
"""

import os
import sys
import django

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician as DepannageTechnician
from users.models import TechnicianProfile as UsersTechnicianProfile

def test_technician_relations():
    """Test de la fonction get_technician_profile avec les deux relations."""
    
    print("=== Test des relations technician ===\n")
    
    # Fonction get_technician_profile (copiée depuis views.py)
    def get_technician_profile(user):
        """
        Récupère le profil technicien d'un utilisateur en essayant les deux relations possibles.
        Retourne le premier profil trouvé ou None si aucun n'existe.
        """
        # Essayer d'abord technician_depannage (relation dans l'app depannage)
        technician = getattr(user, 'technician_depannage', None)
        if technician:
            return technician
        
        # Essayer ensuite technician_profile (relation dans l'app users)
        technician = getattr(user, 'technician_profile', None)
        if technician:
            return technician
        
        return None
    
    # Test 1: Utilisateur sans profil technicien
    print("1. Test utilisateur sans profil technicien:")
    try:
        user_no_tech = User.objects.get(username='testuser')
        technician = get_technician_profile(user_no_tech)
        print(f"   Utilisateur: {user_no_tech.username}")
        print(f"   Profil technicien trouvé: {technician is not None}")
        if technician:
            print(f"   Type de profil: {type(technician).__name__}")
    except User.DoesNotExist:
        print("   Utilisateur testuser non trouvé")
    print()
    
    # Test 2: Utilisateur avec profil dans l'app depannage
    print("2. Test utilisateur avec profil dans l'app depannage:")
    try:
        # Utiliser un utilisateur qui existe réellement
        user_depannage = User.objects.get(username='tech_mecanicien')
        technician = get_technician_profile(user_depannage)
        print(f"   Utilisateur: {user_depannage.username}")
        print(f"   Profil technicien trouvé: {technician is not None}")
        if technician:
            print(f"   Type de profil: {type(technician).__name__}")
            print(f"   Spécialité: {technician.specialty}")
            print(f"   Vérifié: {technician.is_verified}")
    except User.DoesNotExist:
        print("   Utilisateur tech_mecanicien non trouvé")
    print()
    
    # Test 3: Utilisateur avec profil dans l'app users
    print("3. Test utilisateur avec profil dans l'app users:")
    try:
        user_users = User.objects.get(username='fertyu')
        technician = get_technician_profile(user_users)
        print(f"   Utilisateur: {user_users.username}")
        print(f"   Profil technicien trouvé: {technician is not None}")
        if technician:
            print(f"   Type de profil: {type(technician).__name__}")
            print(f"   Spécialité: {getattr(technician, 'specialty', 'N/A')}")
            print(f"   Vérifié: {getattr(technician, 'is_verified', 'N/A')}")
    except User.DoesNotExist:
        print("   Utilisateur fertyu non trouvé")
    print()
    
    # Test 4: Vérifier les relations disponibles
    print("4. Vérification des relations disponibles:")
    try:
        user = User.objects.get(username='tech_mecanicien')
        print(f"   Utilisateur: {user.username}")
        print(f"   A technician_depannage: {hasattr(user, 'technician_depannage')}")
        print(f"   A technician_profile: {hasattr(user, 'technician_profile')}")
        
        if hasattr(user, 'technician_depannage'):
            tech_dep = getattr(user, 'technician_depannage', None)
            print(f"   technician_depannage: {tech_dep is not None}")
            if tech_dep:
                print(f"   Type: {type(tech_dep).__name__}")
        
        if hasattr(user, 'technician_profile'):
            tech_prof = getattr(user, 'technician_profile', None)
            print(f"   technician_profile: {tech_prof is not None}")
            if tech_prof:
                print(f"   Type: {type(tech_prof).__name__}")
    except User.DoesNotExist:
        print("   Utilisateur non trouvé")
    print()
    
    # Test 5: Lister tous les techniciens
    print("5. Liste de tous les techniciens:")
    print("   Techniciens dans l'app depannage:")
    for tech in DepannageTechnician.objects.all()[:5]:
        print(f"     - {tech.user.username} ({tech.specialty})")
    
    print("   Techniciens dans l'app users:")
    for tech in UsersTechnicianProfile.objects.all()[:5]:
        print(f"     - {tech.user.username} ({getattr(tech, 'specialty', 'N/A')})")
    print()
    
    # Test 6: Test avec tous les utilisateurs techniciens
    print("6. Test avec tous les utilisateurs techniciens:")
    all_technicians = list(DepannageTechnician.objects.all()[:3]) + list(UsersTechnicianProfile.objects.all()[:3])
    
    for tech in all_technicians:
        user = tech.user
        technician = get_technician_profile(user)
        print(f"   Utilisateur: {user.username}")
        print(f"   Profil trouvé: {technician is not None}")
        if technician:
            print(f"   Type: {type(technician).__name__}")
            print(f"   Spécialité: {getattr(technician, 'specialty', 'N/A')}")
        print()

if __name__ == "__main__":
    test_technician_relations() 