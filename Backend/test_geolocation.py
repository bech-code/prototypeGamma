#!/usr/bin/env python3
"""
Script de test pour l'API de géolocalisation des techniciens proches
"""

import requests
import json
from datetime import datetime

def test_geolocation_api():
    """Test de l'API de géolocalisation."""
    
    base_url = "http://127.0.0.1:8000"
    
    # Coordonnées de test (Abidjan)
    test_coords = {
        'lat': 5.3600,
        'lng': -4.0083
    }
    
    print("🧭 Test de l'API de Géolocalisation")
    print("=" * 50)
    
    # Test 1: API sans authentification (doit échouer)
    print("\n1. Test sans authentification...")
    try:
        response = requests.get(
            f"{base_url}/depannage/api/techniciens-proches/",
            params=test_coords
        )
        
        if response.status_code == 401:
            print("✅ Correct: L'API nécessite une authentification")
        else:
            print(f"❌ Erreur: L'API devrait nécessiter une authentification (status: {response.status_code})")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
    
    # Test 2: API avec paramètres manquants
    print("\n2. Test avec paramètres manquants...")
    try:
        response = requests.get(f"{base_url}/depannage/api/techniciens-proches/")
        
        if response.status_code == 400:
            print("✅ Correct: L'API valide les paramètres requis")
        else:
            print(f"❌ Erreur: L'API devrait valider les paramètres (status: {response.status_code})")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
    
    # Test 3: API avec paramètres invalides
    print("\n3. Test avec paramètres invalides...")
    try:
        response = requests.get(
            f"{base_url}/depannage/api/techniciens-proches/",
            params={'lat': 'invalid', 'lng': 'invalid'}
        )
        
        if response.status_code == 400:
            print("✅ Correct: L'API valide le format des coordonnées")
        else:
            print(f"❌ Erreur: L'API devrait valider le format (status: {response.status_code})")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
    
    # Test 4: Vérification de la structure de l'API
    print("\n4. Vérification de la structure de l'API...")
    try:
        # Test avec des coordonnées valides (sans token pour voir la structure)
        response = requests.get(
            f"{base_url}/depannage/api/techniciens-proches/",
            params=test_coords
        )
        
        if response.status_code == 401:
            print("✅ Correct: L'API est accessible et nécessite une authentification")
        else:
            print(f"⚠️  Statut inattendu: {response.status_code}")
            
    except Exception as e:
        print(f"❌ Erreur de connexion: {e}")
    
    print("\n" + "=" * 50)
    print("📋 Résumé des tests:")
    print("- L'API nécessite une authentification JWT")
    print("- Les paramètres lat et lng sont obligatoires")
    print("- Les coordonnées doivent être des nombres valides")
    print("- L'endpoint est accessible à /depannage/api/techniciens-proches/")
    
    print("\n🔧 Pour tester avec authentification:")
    print("1. Créez un utilisateur de test")
    print("2. Obtenez un token JWT via /users/login/")
    print("3. Utilisez le token dans l'en-tête Authorization: Bearer <token>")
    print("4. Appelez l'API avec les coordonnées valides")

if __name__ == "__main__":
    test_geolocation_api() 