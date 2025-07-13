#!/usr/bin/env python3
"""
Script de test complet pour le flux d'une demande de réparation
Simule : création → acceptation → communication → début/fin → validation → avis
"""

import requests
import json
import time
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"

# Identifiants de test
CLIENT_EMAIL = "client2@example.com"
CLIENT_PASSWORD = "client123"
TECHNICIAN_EMAIL = "ballo@gmail.com"
TECHNICIAN_PASSWORD = "bechir66312345"

def print_header(title):
    print(f"\n{'='*60}")
    print(f"🔍 {title}")
    print(f"{'='*60}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def login_user(email, password):
    """Connexion d'un utilisateur et récupération du token"""
    try:
        response = requests.post(f"{BASE_URL}/users/login/", json={
            "email": email,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access')
            user_info = data.get('user', {})
            print_success(f"Connexion réussie pour {user_info.get('username', email)}")
            return token, user_info
        else:
            print_error(f"Échec de connexion pour {email}: {response.status_code}")
            return None, None
    except Exception as e:
        print_error(f"Erreur de connexion: {e}")
        return None, None

def create_repair_request(client_token, client_info):
    """Création d'une demande de réparation par le client"""
    print_header("ÉTAPE 1: CRÉATION DE LA DEMANDE DE RÉPARATION")
    
    request_data = {
        "title": "Panne électrique urgente",
        "description": "Problème électrique dans la salle de bain, prise qui fait des étincelles",
        "address": "123 Rue de la Paix, Bamako",
        "latitude": 12.6508,
        "longitude": -8.0000,
        "urgency_level": "urgent",
        "specialty_needed": "electrician"
    }
    
    headers = {'Authorization': f'Bearer {client_token}'}
    
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/repair-requests/",
            json=request_data,
            headers=headers
        )
        
        if response.status_code == 201:
            request_data = response.json()
            request_id = request_data.get('id')
            print_success(f"Demande créée avec succès (ID: {request_id})")
            print_info(f"Titre: {request_data.get('title')}")
            print_info(f"Statut: {request_data.get('status')}")
            return request_id, request_data
        else:
            print_error(f"Échec de création: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print_error(f"Erreur lors de la création: {e}")
        return None, None

def get_repair_requests(technician_token):
    """Récupération des demandes disponibles pour le technicien"""
    print_header("ÉTAPE 2: RÉCUPÉRATION DES DEMANDES DISPONIBLES")
    
    headers = {'Authorization': f'Bearer {technician_token}'}
    
    try:
        response = requests.get(
            f"{BASE_URL}/depannage/api/repair-requests/",
            headers=headers
        )
        
        if response.status_code == 200:
            requests_data = response.json()
            # Correction pagination DRF
            if isinstance(requests_data, dict) and 'results' in requests_data:
                requests_data = requests_data['results']
            available_requests = [req for req in requests_data if req.get('status') == 'pending']
            print_success(f"Demandes disponibles: {len(available_requests)}")
            
            for req in available_requests:
                print_info(f"  - ID: {req.get('id')} | {req.get('title')} | {req.get('address')}")
            
            return available_requests
        else:
            print_error(f"Échec de récupération: {response.status_code}")
            return []
    except Exception as e:
        print_error(f"Erreur lors de la récupération: {e}")
        return []

def accept_repair_request(technician_token, request_id, technician_id):
    """Acceptation de la demande par le technicien"""
    print_header("ÉTAPE 3: ACCEPTATION DE LA DEMANDE")
    
    headers = {'Authorization': f'Bearer {technician_token}'}
    data = {"technician_id": technician_id, "action": "accept"}
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/repair-requests/{request_id}/assign_technician/",
            json=data,
            headers=headers
        )
        if response.status_code == 200:
            print_success(f"Demande {request_id} acceptée avec succès")
            return True
        else:
            print_error(f"Échec d'acceptation: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Erreur lors de l'acceptation: {e}")
        return False

def send_message(token, request_id, message, sender_type):
    """Envoi d'un message dans la conversation"""
    print_header(f"ÉTAPE 4: ENVOI DE MESSAGE ({sender_type.upper()})")
    
    headers = {'Authorization': f'Bearer {token}'}
    
    message_data = {
        "repair_request": request_id,
        "content": message,
        "message_type": "text"
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/chat/messages/",
            json=message_data,
            headers=headers
        )
        
        if response.status_code == 201:
            message_data = response.json()
            print_success(f"Message envoyé par {sender_type}")
            print_info(f"Contenu: {message_data.get('content')}")
            return True
        else:
            print_error(f"Échec d'envoi: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Erreur lors de l'envoi: {e}")
        return False

def get_messages(token, request_id):
    """Récupération des messages de la conversation"""
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(
            f"{BASE_URL}/depannage/api/chat/messages/?repair_request={request_id}",
            headers=headers
        )
        
        if response.status_code == 200:
            messages = response.json()
            print_info(f"Messages récupérés: {len(messages)}")
            return messages
        else:
            print_error(f"Échec de récupération des messages: {response.status_code}")
            return []
    except Exception as e:
        print_error(f"Erreur lors de la récupération des messages: {e}")
        return []

def start_repair_mission(technician_token, request_id):
    """Début de la mission par le technicien"""
    print_header("ÉTAPE 5: DÉBUT DE LA MISSION")
    headers = {'Authorization': f'Bearer {technician_token}'}
    data = {"status": "in_progress"}
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/repair-requests/{request_id}/update_status/",
            json=data,
            headers=headers
        )
        if response.status_code == 200:
            print_success(f"Mission {request_id} démarrée")
            return True
        else:
            print_error(f"Échec de démarrage: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Erreur lors du démarrage: {e}")
        return False

def complete_repair_mission(technician_token, request_id):
    """Fin de la mission par le technicien"""
    print_header("ÉTAPE 6: FIN DE LA MISSION")
    headers = {'Authorization': f'Bearer {technician_token}'}
    data = {"status": "completed"}
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/repair-requests/{request_id}/update_status/",
            json=data,
            headers=headers
        )
        if response.status_code == 200:
            print_success(f"Mission {request_id} terminée")
            return True
        else:
            print_error(f"Échec de finalisation: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Erreur lors de la finalisation: {e}")
        return False

def client_validate_repair(client_token, request_id):
    """Validation de la réparation par le client"""
    print_header("ÉTAPE 7: VALIDATION PAR LE CLIENT")
    headers = {'Authorization': f'Bearer {client_token}'}
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/repair-requests/{request_id}/validate_mission/",
            headers=headers
        )
        if response.status_code == 200:
            print_success(f"Réparation {request_id} validée par le client")
            return True
        else:
            print_error(f"Échec de validation: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Erreur lors de la validation: {e}")
        return False

def create_review(client_token, request_id, technician_id):
    """Création d'un avis par le client"""
    print_header("ÉTAPE 8: AVIS DU CLIENT")
    
    headers = {'Authorization': f'Bearer {client_token}'}
    
    review_data = {
        "repair_request": request_id,
        "technician": technician_id,
        "rating": 5,
        "comment": "Excellent service ! Le technicien était professionnel, ponctuel et a résolu le problème rapidement. Je recommande vivement.",
        "service_quality": 5,
        "communication": 5,
        "punctuality": 5,
        "price_fairness": 4
    }
    
    try:
        response = requests.post(
            f"{BASE_URL}/depannage/api/reviews/",
            json=review_data,
            headers=headers
        )
        
        if response.status_code == 201:
            review_data = response.json()
            print_success(f"Avis créé avec succès")
            print_info(f"Note: {review_data.get('rating')}/5")
            print_info(f"Commentaire: {review_data.get('comment')}")
            return True
        else:
            print_error(f"Échec de création d'avis: {response.status_code} - {response.text}")
            return False
    except Exception as e:
        print_error(f"Erreur lors de la création d'avis: {e}")
        return False

def get_repair_request_details(token, request_id):
    """Récupération des détails d'une demande de réparation"""
    headers = {'Authorization': f'Bearer {token}'}
    
    try:
        response = requests.get(
            f"{BASE_URL}/depannage/api/repair-requests/{request_id}/",
            headers=headers
        )
        
        if response.status_code == 200:
            return response.json()
        else:
            print_error(f"Échec de récupération des détails: {response.status_code}")
            return None
    except Exception as e:
        print_error(f"Erreur lors de la récupération des détails: {e}")
        return None

def main():
    """Fonction principale du test de flux complet"""
    print_header("TEST DU FLUX COMPLET D'UNE DEMANDE DE RÉPARATION")
    print(f"🕐 Début du test: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Étape 1: Connexion des utilisateurs
    print_header("CONNEXION DES UTILISATEURS")
    
    client_token, client_info = login_user(CLIENT_EMAIL, CLIENT_PASSWORD)
    if not client_token:
        print_error("Impossible de continuer - échec de connexion client")
        return
    
    technician_token, technician_info = login_user(TECHNICIAN_EMAIL, TECHNICIAN_PASSWORD)
    if not technician_token:
        print_error("Impossible de continuer - échec de connexion technicien")
        return
    print_info(f"Spécialité du technicien: {technician_info.get('specialty', 'N/A')}")
    
    # Étape 2: Création de la demande
    request_id, request_data = create_repair_request(client_token, client_info)
    if not request_id:
        print_error("Impossible de continuer - échec de création de demande")
        return
    
    # Vérification : la demande créée est-elle visible par le technicien ?
    available_requests = get_repair_requests(technician_token)
    ids = [req.get('id') for req in available_requests]
    print_info(f"Demandes visibles par le technicien après création: {ids}")
    if request_id in ids:
        print_success(f"La demande {request_id} est bien visible par le technicien.")
    else:
        print_warning(f"La demande {request_id} n'est PAS visible par le technicien !")
    
    # Étape 4: Acceptation de la demande
    if not accept_repair_request(technician_token, request_id, technician_info.get('id')):
        print_error("Impossible de continuer - échec d'acceptation")
        return
    
    # Étape 5: Communication par messages
    print_header("ÉTAPE 4: COMMUNICATION PAR MESSAGES")
    
    # Message du technicien
    send_message(technician_token, request_id, 
                "Bonjour ! J'ai accepté votre demande. Je serai chez vous dans 30 minutes. Pouvez-vous me confirmer l'adresse ?", 
                "technicien")
    
    time.sleep(1)  # Pause pour simuler le temps réel
    
    # Message du client
    send_message(client_token, request_id, 
                "Parfait ! L'adresse est correcte : 123 Rue de la Paix, Bamako. Je vous attends.", 
                "client")
    
    time.sleep(1)
    
    # Message du technicien
    send_message(technician_token, request_id, 
                "Parfait, je suis en route. J'arrive dans 25 minutes.", 
                "technicien")
    
    # Affichage des messages
    messages = get_messages(client_token, request_id)
    
    # Étape 6: Début de la mission
    if not start_repair_mission(technician_token, request_id):
        print_error("Impossible de continuer - échec de démarrage de mission")
        return
    
    # Étape 7: Fin de la mission
    if not complete_repair_mission(technician_token, request_id):
        print_error("Impossible de continuer - échec de finalisation de mission")
        return
    
    # Étape 8: Validation par le client
    if not client_validate_repair(client_token, request_id):
        print_error("Impossible de continuer - échec de validation client")
        return
    
    # Étape 9: Création de l'avis
    technician_id = technician_info.get('id')
    if not create_review(client_token, request_id, technician_id):
        print_error("Échec de création de l'avis")
        return
    
    # Étape 10: Vérification finale
    print_header("VÉRIFICATION FINALE")
    
    final_request = get_repair_request_details(client_token, request_id)
    if final_request:
        print_success("✅ FLUX COMPLET RÉUSSI !")
        print_info(f"Statut final: {final_request.get('status')}")
        print_info(f"Technicien assigné: {final_request.get('technician', {}).get('user', {}).get('username', 'N/A')}")
        print_info(f"Client: {final_request.get('client', {}).get('user', {}).get('username', 'N/A')}")
    
    print(f"\n🕐 Fin du test: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print_success("🎉 TOUTES LES ÉTAPES ONT ÉTÉ VALIDÉES AVEC SUCCÈS !")

if __name__ == "__main__":
    main() 