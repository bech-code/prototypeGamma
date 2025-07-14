#!/usr/bin/env python3
"""
Création d'un technicien de test pour tester CinetPay (profil complet)
"""

import os
import sys
import django
from datetime import datetime, timedelta

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'Backend.auth.settings')
os.environ.setdefault('DJANGO_SECRET_KEY', 'django-insecure-your-secret-key-for-development-only-change-in-production')
sys.path.append(os.path.join(os.path.dirname(__file__), 'Backend'))

django.setup()

from django.contrib.auth import get_user_model
from depannage.models import Technician, TechnicianSubscription
from django.utils import timezone

def create_test_technician():
    """Créer un technicien de test avec profil complet pour CinetPay"""
    print("🔧 Création d'un technicien de test (profil complet)")
    print("=" * 50)
    
    email = "test_technicien@depanneteliman.com"
    password = "test123"
    User = get_user_model()
    try:
        user = User.objects.get(email=email)
        user.set_password(password)
        user.user_type = "technician"
        user.is_active = True
        user.last_name = "Technicien"
        user.first_name = "Test"
        user.username = email
        user.save()
        print(f"✅ Utilisateur {email} existe déjà (ID: {user.id}) — profil complété")
    except User.DoesNotExist:
        user = User.objects.create_user(
            username=email,
            email=email,
            password=password,
            first_name="Test",
            last_name="Technicien",
            is_active=True,
            user_type="technician"
        )
        print(f"✅ Utilisateur créé: {user.email} (ID: {user.id})")
    
    # Création du profil technicien
    try:
        technician = Technician.objects.get(user=user)
        technician.phone = "+22507000000"
        technician.is_verified = True
        technician.save()
        print(f"✅ Technicien existe déjà (ID: {technician.id}) — profil complété")
    except Technician.DoesNotExist:
        technician = Technician.objects.create(
            user=user,
            specialty="plumber",
            phone="+22507000000",
            is_verified=True
        )
        print(f"✅ Technicien créé: {technician.user.email}")
    
    # Création d'un abonnement actif (30 jours)
    end_date = timezone.now() + timedelta(days=30)
    try:
        sub = TechnicianSubscription.objects.create(
            technician=technician,
            plan_name="Standard",
            start_date=timezone.now(),
            end_date=end_date,
            is_active=True
        )
        print(f"✅ Abonnement actif créé jusqu'au {end_date.strftime('%Y-%m-%d')}")
    except Exception as e:
        print(f"⚠️ Erreur création abonnement: {e}")
    
    print(f"\n📋 Informations de connexion:")
    print(f"   Email: {email}")
    print(f"   Mot de passe: {password}")
    print(f"   ID Utilisateur: {user.id}")
    print(f"   ID Technicien: {technician.id}")
    print(f"   Abonnement actif jusqu'au: {end_date}")
    
    return user, technician

def test_technician_login():
    """Test de connexion du technicien créé"""
    print("\n🔧 Test de connexion du technicien")
    print("=" * 50)
    
    import requests
    
    login_data = {
        "email": "test_technicien@depanneteliman.com",
        "password": "test123"
    }
    
    try:
        response = requests.post("http://127.0.0.1:8000/users/login/", json=login_data)
        print(f"Status: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            access_token = data.get('access')
            print("✅ Connexion réussie")
            print(f"Token: {access_token[:20]}...")
            
            # Test du statut d'abonnement
            headers = {'Authorization': f'Bearer {access_token}'}
            status_response = requests.get("http://127.0.0.1:8000/depannage/api/technicians/subscription_status/", headers=headers)
            
            if status_response.status_code == 200:
                status_data = status_response.json()
                print(f"Status abonnement: {status_data.get('status', 'N/A')}")
                print(f"Peut recevoir des demandes: {status_data.get('can_receive_requests', False)}")
                print(f"Jours restants: {status_data.get('days_remaining', 0)}")
            else:
                print(f"❌ Erreur statut: {status_response.status_code}")
            
            return access_token
        else:
            print(f"❌ Échec: {response.text}")
            return None
    except Exception as e:
        print(f"❌ Erreur: {e}")
        return None

def main():
    """Fonction principale"""
    print("🔧 CRÉATION ET TEST D'UN TECHNICIEN (profil complet)")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("=" * 60)
    
    # Créer le technicien
    user, technician = create_test_technician()
    
    # Tester la connexion
    token = test_technician_login()
    
    if token:
        print("\n🎉 SUCCÈS: Le technicien de test est prêt !")
        print("Vous pouvez maintenant tester le système CinetPay avec:")
        print("   Email: test_technicien@depanneteliman.com")
        print("   Mot de passe: test123")
    else:
        print("\n❌ Problème avec la connexion du technicien")

if __name__ == "__main__":
    main() 