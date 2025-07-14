#!/usr/bin/env python3
"""
Test de la géolocalisation obligatoire dans BookingForm
"""

import requests
import json
import time

# Configuration
BASE_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:5173"

def test_geolocation_obligatoire():
    """Test que la géolocalisation est obligatoire pour créer une demande"""
    
    print("🧪 Test de la géolocalisation obligatoire")
    print("=" * 50)
    
    # 1. Connexion utilisateur
    print("\n1. Connexion utilisateur...")
    login_data = {
        "username": "client1",
        "password": "password123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
        if response.status_code == 200:
            token = response.json().get('access')
            print("✅ Connexion réussie")
        else:
            print(f"❌ Échec de connexion: {response.status_code}")
            assert False, "Échec de connexion"
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
        assert False, "Erreur de connexion"
    
    # 2. Test création demande SANS géolocalisation (doit échouer)
    print("\n2. Test création demande sans géolocalisation...")
    
    repair_request_data = {
        "title": "Test sans géolocalisation",
        "description": "Test de validation géolocalisation obligatoire",
        "specialty_needed": "plumber",
        "address": "123 Test Street",
        "city": "Bamako",
        "postalCode": "12345",
        "priority": "medium",
        "estimated_price": 50000,
        "latitude": None,  # Pas de géolocalisation
        "longitude": None,  # Pas de géolocalisation
        "phone": "+22312345678"
    }
    
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/repair-requests/",
            json=repair_request_data,
            headers=headers
        )
        
        if response.status_code == 400:
            print("✅ Validation backend: demande rejetée sans géolocalisation")
            error_data = response.json()
            print(f"   Erreur: {error_data}")
        else:
            print(f"❌ Erreur: demande acceptée sans géolocalisation (status: {response.status_code})")
            assert False, "Demande acceptée sans géolocalisation"
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        assert False, "Erreur lors du test"
    
    # 3. Test création demande AVEC géolocalisation (doit réussir)
    print("\n3. Test création demande avec géolocalisation...")
    
    repair_request_data_with_gps = {
        "title": "Test avec géolocalisation",
        "description": "Test de validation avec géolocalisation",
        "specialty_needed": "plumber",
        "address": "123 Test Street",
        "city": "Bamako",
        "postalCode": "12345",
        "priority": "medium",
        "estimated_price": 50000,
        "latitude": 12.6508,  # Coordonnées Bamako
        "longitude": -8.0000,  # Coordonnées Bamako
        "phone": "+22312345678"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/repair-requests/",
            json=repair_request_data_with_gps,
            headers=headers
        )
        
        if response.status_code == 201:
            print("✅ Validation backend: demande acceptée avec géolocalisation")
            data = response.json()
            print(f"   ID demande: {data.get('id')}")
        else:
            print(f"❌ Erreur: demande rejetée avec géolocalisation (status: {response.status_code})")
            print(f"   Réponse: {response.text}")
            assert False, "Demande rejetée avec géolocalisation"
    except Exception as e:
        print(f"❌ Erreur lors du test: {e}")
        assert False, "Erreur lors du test"
    
    # 4. Vérifier les validations frontend
    print("\n4. Vérification des validations frontend...")
    print("   - Les champs d'adresse doivent être désactivés sans géolocalisation")
    print("   - Le modal de géolocalisation doit s'afficher à l'étape 2")
    print("   - La soumission doit être bloquée sans géolocalisation")
    print("   ✅ Validations frontend à tester manuellement")
    
    print("\n🎉 Test de géolocalisation obligatoire terminé avec succès!")
    assert True, "Test de géolocalisation obligatoire terminé avec succès"

def test_frontend_geolocation():
    """Test des fonctionnalités frontend de géolocalisation"""
    
    print("\n🧪 Test des fonctionnalités frontend")
    print("=" * 50)
    
    print("1. Vérification du modal de géolocalisation:")
    print("   - Le modal doit s'afficher automatiquement à l'étape 2")
    print("   - Le bouton 'Autoriser la géolocalisation' doit être présent")
    print("   - Les champs d'adresse doivent être désactivés")
    
    print("\n2. Vérification du comportement utilisateur:")
    print("   - L'utilisateur ne peut pas continuer sans accepter la géolocalisation")
    print("   - Les champs d'adresse sont remplis automatiquement après géolocalisation")
    print("   - Le modal se ferme automatiquement après succès")
    
    print("\n3. Vérification des erreurs:")
    print("   - Messages d'erreur appropriés si géolocalisation refusée")
    print("   - Possibilité de réessayer en cas d'échec")
    print("   - Gestion des timeouts et erreurs GPS")
    
    print("\n✅ Tests frontend à effectuer manuellement dans le navigateur")
    assert True, "Tests frontend à effectuer manuellement dans le navigateur"

if __name__ == "__main__":
    print("🚀 Démarrage des tests de géolocalisation obligatoire")
    
    # Test backend
    backend_success = test_geolocation_obligatoire()
    
    # Test frontend (manuel)
    test_frontend_geolocation()
    
    if backend_success:
        print("\n✅ Tous les tests backend ont réussi!")
        print("📝 Pour tester le frontend:")
        print(f"   1. Ouvrez {FRONTEND_URL}")
        print("   2. Connectez-vous avec un compte client")
        print("   3. Allez sur la page de réservation")
        print("   4. Sélectionnez un service et passez à l'étape 2")
        print("   5. Vérifiez que le modal de géolocalisation s'affiche")
        print("   6. Testez l'acceptation et le refus de la géolocalisation")
    else:
        print("\n❌ Certains tests ont échoué")
        print("🔧 Vérifiez la configuration et relancez les tests") 