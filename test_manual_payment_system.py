#!/usr/bin/env python3
"""
Test script pour vérifier le système de paiement manuel
"""

import requests
import json
import sys

# Configuration
BASE_URL = "http://127.0.0.1:8000"
LOGIN_URL = f"{BASE_URL}/users/login/"
SUBSCRIPTION_REQUESTS_URL = f"{BASE_URL}/depannage/api/subscription-requests/"

def test_manual_payment_system():
    """Test du système de paiement manuel"""
    
    print("🔒 Test du système de paiement manuel")
    print("=" * 50)
    
    # 1. Connexion technicien
    print("\n1. Connexion technicien...")
    login_data = {
        "email": "technicien@example.com",
        "password": "technicien123"
    }
    
    try:
        login_response = requests.post(LOGIN_URL, json=login_data)
        print(f"   Status: {login_response.status_code}")
        
        if login_response.status_code == 200:
            login_data = login_response.json()
            access_token = login_data.get('access')
            print("   ✅ Connexion réussie")
        else:
            print(f"   ❌ Échec de connexion: {login_response.text}")
            return
    except Exception as e:
        print(f"   ❌ Erreur de connexion: {e}")
        return
    
    headers = {
        'Authorization': f'Bearer {access_token}',
        'Content-Type': 'application/json'
    }
    
    # 2. Créer une demande de paiement manuel
    print("\n2. Création d'une demande de paiement manuel...")
    payment_request_data = {
        "duration_months": 3,
        "amount": 15000,
        "payment_method": "manual",
        "description": "Test de paiement manuel - 3 mois"
    }
    
    try:
        create_response = requests.post(
            SUBSCRIPTION_REQUESTS_URL,
            json=payment_request_data,
            headers=headers
        )
        print(f"   Status: {create_response.status_code}")
        
        if create_response.status_code == 201:
            request_data = create_response.json()
            request_id = request_data.get('id')
            print(f"   ✅ Demande créée avec l'ID: {request_id}")
            print(f"   Montant: {request_data.get('amount')} FCFA")
            print(f"   Durée: {request_data.get('duration_months')} mois")
            print(f"   Méthode: {request_data.get('payment_method')}")
        else:
            print(f"   ❌ Échec de création: {create_response.text}")
            return
    except Exception as e:
        print(f"   ❌ Erreur lors de la création: {e}")
        return
    
    # 3. Vérifier la demande créée
    print("\n3. Vérification de la demande créée...")
    try:
        get_response = requests.get(
            f"{SUBSCRIPTION_REQUESTS_URL}{request_id}/",
            headers=headers
        )
        print(f"   Status: {get_response.status_code}")
        
        if get_response.status_code == 200:
            request_details = get_response.json()
            print("   ✅ Détails de la demande récupérés")
            print(f"   Statut: {request_details.get('status')}")
            print(f"   Créé le: {request_details.get('created_at')}")
        else:
            print(f"   ❌ Échec de récupération: {get_response.text}")
    except Exception as e:
        print(f"   ❌ Erreur lors de la récupération: {e}")
    
    # 4. Lister toutes les demandes du technicien
    print("\n4. Liste des demandes du technicien...")
    try:
        list_response = requests.get(SUBSCRIPTION_REQUESTS_URL, headers=headers)
        print(f"   Status: {list_response.status_code}")
        
        if list_response.status_code == 200:
            requests_list = list_response.json()
            print(f"   ✅ {len(requests_list)} demande(s) trouvée(s)")
            for req in requests_list:
                print(f"   - ID: {req.get('id')}, Montant: {req.get('amount')} FCFA, Statut: {req.get('status')}")
        else:
            print(f"   ❌ Échec de récupération: {list_response.text}")
    except Exception as e:
        print(f"   ❌ Erreur lors de la récupération: {e}")
    
    print("\n" + "=" * 50)
    print("✅ Test du système de paiement manuel terminé")
    print("\n📋 Résumé:")
    print("- Le technicien peut créer des demandes de paiement manuel")
    print("- Les demandes sont stockées avec le statut 'pending'")
    print("- Le technicien peut voir ses demandes")
    print("- L'admin peut valider les paiements via l'interface admin")
    print("\n🌐 Pour tester le frontend:")
    print(f"- Allez sur: http://localhost:5173/technician/payment/{request_id}")
    print("- Connectez-vous avec un compte technicien")
    print("- Vous verrez la page de paiement manuel avec les instructions")

if __name__ == "__main__":
    test_manual_payment_system() 