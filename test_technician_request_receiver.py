#!/usr/bin/env python3
"""
Script de test pour le système de réception des demandes par les techniciens
Teste la création de demandes, les notifications, et l'assignation des techniciens
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://127.0.0.1:8000"
API_BASE = f"{BASE_URL}/depannage/api"

def print_header(title):
    """Affiche un en-tête formaté."""
    print(f"\n{'='*60}")
    print(f"🔧 {title}")
    print(f"{'='*60}")

def print_success(message):
    """Affiche un message de succès."""
    print(f"✅ {message}")

def print_error(message):
    """Affiche un message d'erreur."""
    print(f"❌ {message}")

def print_info(message):
    """Affiche un message d'information."""
    print(f"ℹ️  {message}")

def print_warning(message):
    """Affiche un message d'avertissement."""
    print(f"⚠️  {message}")

def get_auth_token(username, password):
    """Récupère un token d'authentification."""
    try:
        response = requests.post(f"{BASE_URL}/auth/login/", {
            "username": username,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access')
        else:
            print_error(f"Échec de connexion pour {username}: {response.text}")
            return None
    except Exception as e:
        print_error(f"Erreur lors de la connexion: {e}")
        return None

def create_test_technicians():
    """Crée des techniciens de test pour les tests."""
    print_header("CRÉATION DES TECHNICIENS DE TEST")
    
    technicians_data = [
        {
            "username": "tech_plombier",
            "password": "test123",
            "email": "plombier@test.com",
            "first_name": "Jean",
            "last_name": "Plombier",
            "specialty": "plumber",
            "phone": "+22370123456",
            "current_latitude": 12.6508,
            "current_longitude": -8.0000,
            "service_radius_km": 30,
            "is_available": True
        },
        {
            "username": "tech_electricien",
            "password": "test123",
            "email": "electricien@test.com",
            "first_name": "Pierre",
            "last_name": "Électricien",
            "specialty": "electrician",
            "phone": "+22370234567",
            "current_latitude": 12.6508,
            "current_longitude": -8.0000,
            "service_radius_km": 25,
            "is_available": True
        },
        {
            "username": "tech_serrurier",
            "password": "test123",
            "email": "serrurier@test.com",
            "first_name": "Paul",
            "last_name": "Serrurier",
            "specialty": "locksmith",
            "phone": "+22370345678",
            "current_latitude": 12.6508,
            "current_longitude": -8.0000,
            "service_radius_km": 20,
            "is_available": True
        }
    ]
    
    created_technicians = []
    
    for tech_data in technicians_data:
        try:
            # Créer l'utilisateur
            user_response = requests.post(f"{BASE_URL}/auth/register/", {
                "username": tech_data["username"],
                "password": tech_data["password"],
                "email": tech_data["email"],
                "first_name": tech_data["first_name"],
                "last_name": tech_data["last_name"],
                "user_type": "technician"
            })
            
            if user_response.status_code == 201:
                user_data = user_response.json()
                print_success(f"Utilisateur créé: {tech_data['username']}")
                
                # Créer le profil technicien
                tech_response = requests.post(f"{API_BASE}/technicians/", {
                    "user": user_data["id"],
                    "specialty": tech_data["specialty"],
                    "phone": tech_data["phone"],
                    "current_latitude": tech_data["current_latitude"],
                    "current_longitude": tech_data["current_longitude"],
                    "service_radius_km": tech_data["service_radius_km"],
                    "is_available": tech_data["is_available"],
                    "is_verified": True
                })
                
                if tech_response.status_code == 201:
                    tech_data_response = tech_response.json()
                    created_technicians.append({
                        "user_data": user_data,
                        "tech_data": tech_data_response,
                        "auth_token": get_auth_token(tech_data["username"], tech_data["password"])
                    })
                    print_success(f"Profil technicien créé: {tech_data['username']}")
                else:
                    print_error(f"Échec création profil technicien: {tech_response.text}")
            else:
                print_error(f"Échec création utilisateur: {user_response.text}")
                
        except Exception as e:
            print_error(f"Erreur lors de la création du technicien {tech_data['username']}: {e}")
    
    return created_technicians

def create_test_client():
    """Crée un client de test."""
    print_header("CRÉATION DU CLIENT DE TEST")
    
    try:
        # Créer l'utilisateur client
        user_response = requests.post(f"{BASE_URL}/auth/register/", {
            "username": "client_test",
            "password": "test123",
            "email": "client@test.com",
            "first_name": "Marie",
            "last_name": "Client",
            "user_type": "client"
        })
        
        if user_response.status_code == 201:
            user_data = user_response.json()
            print_success("Client créé: client_test")
            
            # Créer le profil client
            client_response = requests.post(f"{API_BASE}/clients/", {
                "user": user_data["id"],
                "phone": "+22370456789",
                "address": "123 Rue de la Paix, Bamako"
            })
            
            if client_response.status_code == 201:
                client_data = client_response.json()
                auth_token = get_auth_token("client_test", "test123")
                print_success("Profil client créé")
                return {
                    "user_data": user_data,
                    "client_data": client_data,
                    "auth_token": auth_token
                }
            else:
                print_error(f"Échec création profil client: {client_response.text}")
        else:
            print_error(f"Échec création utilisateur client: {user_response.text}")
            
    except Exception as e:
        print_error(f"Erreur lors de la création du client: {e}")
    
    return None

def test_request_creation_and_notification(client_data):
    """Teste la création de demandes et les notifications."""
    print_header("TEST DE CRÉATION DE DEMANDES ET NOTIFICATIONS")
    
    if not client_data or not client_data.get("auth_token"):
        print_error("Token client manquant")
        return
    
    headers = {"Authorization": f"Bearer {client_data['auth_token']}"}
    
    # Créer différentes demandes de test
    test_requests = [
        {
            "title": "Fuite d'eau urgente",
            "description": "Fuite importante sous l'évier de la cuisine",
            "specialty_needed": "plumber",
            "urgency_level": "urgent",
            "priority": "high",
            "address": "456 Avenue Modibo Keita, Bamako",
            "latitude": 12.6508,
            "longitude": -8.0000,
            "estimated_price": 50000
        },
        {
            "title": "Panne électrique",
            "description": "Plusieurs prises ne fonctionnent plus",
            "specialty_needed": "electrician",
            "urgency_level": "same_day",
            "priority": "medium",
            "address": "789 Boulevard de l'Indépendance, Bamako",
            "latitude": 12.6508,
            "longitude": -8.0000,
            "estimated_price": 60000
        },
        {
            "title": "Clé cassée dans la serrure",
            "description": "Clé cassée, impossible d'ouvrir la porte",
            "specialty_needed": "locksmith",
            "urgency_level": "sos",
            "priority": "urgent",
            "address": "321 Rue du Commerce, Bamako",
            "latitude": 12.6508,
            "longitude": -8.0000,
            "estimated_price": 45000
        }
    ]
    
    created_requests = []
    
    for i, request_data in enumerate(test_requests, 1):
        try:
            print_info(f"Création de la demande {i}: {request_data['title']}")
            
            response = requests.post(f"{API_BASE}/repair-requests/", 
                                  json=request_data, headers=headers)
            
            if response.status_code == 201:
                request_info = response.json()
                created_requests.append(request_info)
                print_success(f"Demande {i} créée (ID: {request_info['id']})")
                
                # Attendre un peu pour les notifications
                time.sleep(2)
                
                # Vérifier les notifications créées
                notifications_response = requests.get(f"{API_BASE}/notifications/", headers=headers)
                if notifications_response.status_code == 200:
                    notifications = notifications_response.json()
                    print_info(f"Notifications trouvées: {len(notifications.get('results', notifications))}")
                else:
                    print_warning("Impossible de récupérer les notifications")
                    
            else:
                print_error(f"Échec création demande {i}: {response.text}")
                
        except Exception as e:
            print_error(f"Erreur lors de la création de la demande {i}: {e}")
    
    return created_requests

def test_technician_notifications(technicians):
    """Teste la réception des notifications par les techniciens."""
    print_header("TEST DES NOTIFICATIONS TECHNICIENS")
    
    for tech in technicians:
        if not tech.get("auth_token"):
            continue
            
        headers = {"Authorization": f"Bearer {tech['auth_token']}"}
        username = tech["user_data"]["username"]
        
        try:
            print_info(f"Vérification des notifications pour {username}")
            
            # Récupérer les notifications
            notifications_response = requests.get(f"{API_BASE}/notifications/", headers=headers)
            
            if notifications_response.status_code == 200:
                notifications = notifications_response.json()
                notifications_list = notifications.get('results', notifications)
                
                print_success(f"{username}: {len(notifications_list)} notifications trouvées")
                
                # Afficher les détails des notifications
                for notif in notifications_list[:3]:  # Top 3 seulement
                    print_info(f"  - {notif.get('title', 'Sans titre')}")
                    print_info(f"    Type: {notif.get('type', 'N/A')}")
                    print_info(f"    Lu: {notif.get('is_read', False)}")
                    
            else:
                print_error(f"Impossible de récupérer les notifications pour {username}")
                
        except Exception as e:
            print_error(f"Erreur pour {username}: {e}")

def test_request_assignment(technicians, created_requests):
    """Teste l'assignation des demandes par les techniciens."""
    print_header("TEST D'ASSIGNATION DES DEMANDES")
    
    for tech in technicians:
        if not tech.get("auth_token"):
            continue
            
        headers = {"Authorization": f"Bearer {tech['auth_token']}"}
        username = tech["user_data"]["username"]
        specialty = tech["tech_data"]["specialty"]
        
        print_info(f"Test d'assignation pour {username} (spécialité: {specialty})")
        
        # Trouver une demande compatible
        compatible_request = None
        for request in created_requests:
            if request.get("specialty_needed") == specialty and request.get("status") == "pending":
                compatible_request = request
                break
        
        if compatible_request:
            try:
                print_info(f"  Tentative d'assignation de la demande {compatible_request['id']}")
                
                response = requests.post(
                    f"{API_BASE}/repair-requests/{compatible_request['id']}/assign_technician/",
                    headers=headers
                )
                
                if response.status_code == 200:
                    assignment_data = response.json()
                    print_success(f"  ✅ Demande assignée avec succès à {username}")
                    print_info(f"     Nouveau statut: {assignment_data.get('status')}")
                    
                    # Vérifier les notifications de confirmation
                    time.sleep(1)
                    notifications_response = requests.get(f"{API_BASE}/notifications/", headers=headers)
                    if notifications_response.status_code == 200:
                        notifications = notifications_response.json()
                        recent_notifications = [n for n in notifications.get('results', notifications) 
                                             if n.get('type') == 'request_assigned']
                        print_info(f"     Notifications d'assignation: {len(recent_notifications)}")
                        
                else:
                    print_error(f"  ❌ Échec de l'assignation: {response.text}")
                    
            except Exception as e:
                print_error(f"  ❌ Erreur lors de l'assignation: {e}")
        else:
            print_warning(f"  Aucune demande compatible trouvée pour {username}")

def test_dashboard_integration(technicians):
    """Teste l'intégration avec le dashboard technicien."""
    print_header("TEST D'INTÉGRATION DASHBOARD")
    
    for tech in technicians:
        if not tech.get("auth_token"):
            continue
            
        headers = {"Authorization": f"Bearer {tech['auth_token']}"}
        username = tech["user_data"]["username"]
        
        try:
            print_info(f"Test du dashboard pour {username}")
            
            # Test des statistiques
            stats_response = requests.get(f"{API_BASE}/repair-requests/dashboard_stats/", headers=headers)
            if stats_response.status_code == 200:
                stats = stats_response.json()
                print_success(f"  ✅ Statistiques récupérées")
                print_info(f"     Demandes assignées: {stats.get('assigned_requests', 0)}")
                print_info(f"     Demandes en cours: {stats.get('pending_requests', 0)}")
                print_info(f"     Demandes terminées: {stats.get('completed_requests', 0)}")
            else:
                print_error(f"  ❌ Échec récupération statistiques: {stats_response.text}")
            
            # Test des demandes récentes
            requests_response = requests.get(f"{API_BASE}/repair-requests/?status=assigned&limit=5", headers=headers)
            if requests_response.status_code == 200:
                requests_data = requests_response.json()
                requests_list = requests_data.get('results', requests_data)
                print_success(f"  ✅ Demandes récentes récupérées: {len(requests_list)}")
            else:
                print_error(f"  ❌ Échec récupération demandes: {requests_response.text}")
                
        except Exception as e:
            print_error(f"  ❌ Erreur dashboard pour {username}: {e}")

def cleanup_test_data(technicians, client_data):
    """Nettoie les données de test (optionnel)."""
    print_header("NETTOYAGE DES DONNÉES DE TEST")
    
    print_info("Note: Les données de test sont conservées pour inspection.")
    print_info("Pour nettoyer manuellement, utilisez l'interface d'administration Django.")

def main():
    """Fonction principale du test."""
    print_header("TEST COMPLET DU SYSTÈME DE RÉCEPTION DES DEMANDES")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    try:
        # 1. Créer les techniciens de test
        technicians = create_test_technicians()
        if not technicians:
            print_error("Impossible de créer les techniciens de test")
            return
        
        # 2. Créer le client de test
        client_data = create_test_client()
        if not client_data:
            print_error("Impossible de créer le client de test")
            return
        
        # 3. Tester la création de demandes et notifications
        created_requests = test_request_creation_and_notification(client_data)
        
        # 4. Tester les notifications techniciens
        test_technician_notifications(technicians)
        
        # 5. Tester l'assignation des demandes
        test_request_assignment(technicians, created_requests)
        
        # 6. Tester l'intégration dashboard
        test_dashboard_integration(technicians)
        
        # 7. Nettoyage (optionnel)
        cleanup_test_data(technicians, client_data)
        
        print_header("TEST TERMINÉ")
        print_success("Tous les tests ont été exécutés avec succès !")
        print_info("Vérifiez l'interface technicien pour voir les demandes en temps réel.")
        
    except Exception as e:
        print_error(f"Erreur générale lors du test: {e}")

if __name__ == "__main__":
    main() 