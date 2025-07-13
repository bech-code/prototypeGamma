#!/usr/bin/env python3
"""
Script de test pour vérifier que ballo@gmail.com apparaît dans les recherches de techniciens plombiers.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def test_ballo_plumber_search():
    """Teste la recherche de techniciens plombiers pour vérifier que ballo@gmail.com apparaît."""
    
    print("🔍 Test de recherche de techniciens plombiers")
    print("=" * 50)
    
    # 1. Se connecter en tant que client
    print("\n1. Connexion client...")
    login_data = {
        "email": "client2@example.com",
        "password": "client123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
        if response.status_code == 200:
            token = response.json().get('access')
            print("✅ Connexion client réussie")
        else:
            print(f"❌ Erreur connexion: {response.status_code}")
            return
    except Exception as e:
        print(f"❌ Erreur connexion: {e}")
        return
    
    # 2. Rechercher les techniciens plombiers
    print("\n2. Recherche de techniciens plombiers...")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    # Coordonnées de test (Abidjan)
    params = {
        "lat": 5.3600,
        "lng": -4.0083,
        "service": "plumber",  # Spécialité plomberie
        "all": "true"  # Voir tous les techniciens
    }
    
    try:
        response = requests.get(
            f"{BASE_URL}/depannage/api/techniciens-proches/",
            headers=headers,
            params=params
        )
        
        print(f"📊 Statut de la réponse: {response.status_code}")
        
        if response.status_code == 200:
            data = response.json()
            technicians = data.get('technicians', [])
            print(f"✅ {len(technicians)} techniciens trouvés")
            
            # Chercher ballo@gmail.com
            ballo_found = False
            for tech in technicians:
                print(f"   - {tech.get('user', {}).get('first_name', 'N/A')} {tech.get('user', {}).get('last_name', 'N/A')}")
                print(f"     Email: {tech.get('user', {}).get('email', 'N/A')}")
                print(f"     Spécialité: {tech.get('specialty', 'N/A')}")
                print(f"     Distance: {tech.get('distance_km', 'N/A')} km")
                print(f"     Note: {tech.get('average_rating', 'N/A')}/5")
                print()
                
                if tech.get('user', {}).get('email') == 'ballo@gmail.com':
                    ballo_found = True
                    print("🎉 BALLO TROUVÉ DANS LES RÉSULTATS!")
            
            if not ballo_found:
                print("❌ ballo@gmail.com n'a pas été trouvé dans les résultats")
                
                # Vérifier directement le profil de ballo
                print("\n🔍 Vérification directe du profil ballo...")
                ballo_response = requests.get(
                    f"{BASE_URL}/depannage/api/technicians/",
                    headers=headers
                )
                
                if ballo_response.status_code == 200:
                    all_techs = ballo_response.json()
                    for tech in all_techs:
                        if tech.get('user', {}).get('email') == 'ballo@gmail.com':
                            print(f"✅ Ballo trouvé dans la liste générale:")
                            print(f"   Spécialité: {tech.get('specialty')}")
                            print(f"   Vérifié: {tech.get('is_verified')}")
                            print(f"   Disponible: {tech.get('is_available')}")
                            break
        else:
            print(f"❌ Erreur API: {response.status_code}")
            print(f"Réponse: {response.text}")
            
    except Exception as e:
        print(f"❌ Erreur lors de la recherche: {e}")

if __name__ == "__main__":
    test_ballo_plumber_search() 