#!/usr/bin/env python3
"""
Script de test pour vérifier que les endpoints de paiement d'abonnement 
fonctionnent correctement avec les deux relations technician.
"""

import os
import sys
import django
import requests
import json

# Configuration Django
sys.path.append('/Users/mohamedbechirdiarra/Downloads/Prototype5b/Backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Technician as DepannageTechnician
from users.models import TechnicianProfile as UsersTechnicianProfile

def test_subscription_endpoints():
    """Test des endpoints de paiement d'abonnement."""
    
    print("=== Test des endpoints de paiement d'abonnement ===\n")
    
    # Configuration
    BASE_URL = "http://127.0.0.1:8000"
    LOGIN_URL = f"{BASE_URL}/users/login/"
    SUBSCRIPTION_URL = f"{BASE_URL}/depannage/api/cinetpay/initiate_subscription_payment/"
    NOTIFY_URL = f"{BASE_URL}/depannage/api/cinetpay/cinetpay/notify/"
    
    # Test 1: Connexion avec un technicien de l'app depannage
    print("1. Test avec technicien de l'app depannage:")
    try:
        # Connexion
        login_data = {
            "email": "mecanicien@example.com",
            "password": "testpass123"
        }
        
        response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status de connexion: {response.status_code}")
        
        if response.status_code == 200:
            token = response.json().get('access')
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test initiation paiement
            payment_data = {
                "duration_months": 1
            }
            
            response = requests.post(SUBSCRIPTION_URL, json=payment_data, headers=headers)
            print(f"   Status initiation paiement: {response.status_code}")
            print(f"   Réponse: {response.json()}")
        else:
            print(f"   Erreur de connexion: {response.json()}")
    except Exception as e:
        print(f"   Erreur: {str(e)}")
    print()
    
    # Test 2: Connexion avec un technicien de l'app users
    print("2. Test avec technicien de l'app users:")
    try:
        # Connexion
        login_data = {
            "email": "ferty@gmail.com",
            "password": "testpass123"
        }
        
        response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status de connexion: {response.status_code}")
        
        if response.status_code == 200:
            token = response.json().get('access')
            headers = {'Authorization': f'Bearer {token}'}
            
            # Test initiation paiement
            payment_data = {
                "duration_months": 1
            }
            
            response = requests.post(SUBSCRIPTION_URL, json=payment_data, headers=headers)
            print(f"   Status initiation paiement: {response.status_code}")
            print(f"   Réponse: {response.json()}")
        else:
            print(f"   Erreur de connexion: {response.json()}")
    except Exception as e:
        print(f"   Erreur: {str(e)}")
    print()
    
    # Test 3: Test de la fonction get_technician_profile
    print("3. Test de la fonction get_technician_profile:")
    
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
    
    # Test avec différents utilisateurs
    test_users = [
        ("mecanicien@example.com", "Technicien app depannage"),
        ("ferty@gmail.com", "Technicien app users"),
        ("testuser@example.com", "Utilisateur sans profil technicien")
    ]
    
    for email, description in test_users:
        try:
            user = User.objects.get(email=email)
            technician = get_technician_profile(user)
            print(f"   {description}:")
            print(f"     Utilisateur: {user.username}")
            print(f"     Profil trouvé: {technician is not None}")
            if technician:
                print(f"     Type: {type(technician).__name__}")
                print(f"     Spécialité: {getattr(technician, 'specialty', 'N/A')}")
        except User.DoesNotExist:
            print(f"   {description}: Utilisateur non trouvé")
    print()
    
    # Test 4: Vérification des relations disponibles
    print("4. Vérification des relations disponibles:")
    try:
        user = User.objects.get(email="tech_mecanicien@example.com")
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

if __name__ == "__main__":
    test_subscription_endpoints() 