#!/usr/bin/env python3
"""
Script de test pour les endpoints de statistiques du backend DepanneTeliman
"""

import requests
import json
import sys
import os
from datetime import datetime

# Configuration
BASE_URL = "http://localhost:8000"
API_BASE = f"{BASE_URL}/depannage/api"

def print_header(title):
    """Affiche un en-tête formaté"""
    print("\n" + "="*60)
    print(f" {title}")
    print("="*60)

def print_section(title):
    """Affiche une section formatée"""
    print(f"\n--- {title} ---")

def test_health_check():
    """Test de santé de l'API"""
    print_section("Test de santé de l'API")
    try:
        response = requests.get(f"{BASE_URL}/depannage/api/test/health_check/")
        if response.status_code == 200:
            data = response.json()
            print(f"✅ API en ligne: {data.get('message', 'OK')}")
            print(f"   Version: {data.get('version', 'N/A')}")
            print(f"   Timestamp: {data.get('timestamp', 'N/A')}")
            assert True, "API health check passed"
        else:
            print(f"❌ Erreur API: {response.status_code}")
            assert False, f"API health check failed: {response.status_code}"
    except requests.exceptions.ConnectionError:
        print("❌ Impossible de se connecter à l'API")
        print("   Assurez-vous que le serveur Django est démarré sur localhost:8000")
        assert False, "Connection error to API"
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        assert False, f"Exception: {e}"

def login_user(email, password):
    """Connexion d'un utilisateur et récupération du token"""
    print_section(f"Connexion utilisateur: {email}")
    try:
        response = requests.post(f"{BASE_URL}/users/login/", json={
            "email": email,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            token = data.get('access')
            user_type = data.get('user_type')
            print(f"✅ Connexion réussie - Type: {user_type}")
            return token, user_type
        else:
            print(f"❌ Échec de connexion: {response.status_code}")
            print(f"   Réponse: {response.text}")
            return None, None
    except Exception as e:
        print(f"❌ Erreur de connexion: {str(e)}")
        return None, None

def test_dashboard_stats(token, user_type):
    """Test des statistiques du tableau de bord"""
    print_section(f"Statistiques tableau de bord ({user_type})")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{API_BASE}/repair-requests/dashboard_stats/", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Statistiques récupérées avec succès")
            
            if user_type == "admin":
                print(f"   Total demandes: {data.get('total_requests', 0)}")
                print(f"   Demandes en attente: {data.get('pending_requests', 0)}")
                print(f"   Demandes en cours: {data.get('in_progress_requests', 0)}")
                print(f"   Demandes terminées: {data.get('completed_requests', 0)}")
                print(f"   Statistiques par spécialité: {len(data.get('specialty_stats', []))} spécialités")
                
            elif user_type == "technician":
                print(f"   Demandes assignées: {data.get('assigned_requests', 0)}")
                print(f"   Demandes terminées: {data.get('completed_requests', 0)}")
                print(f"   Demandes en cours: {data.get('pending_requests', 0)}")
                print(f"   Spécialité: {data.get('specialty', 'N/A')}")
                
            else:  # client
                print(f"   Total demandes: {data.get('total_requests', 0)}")
                print(f"   Demandes actives: {data.get('active_requests', 0)}")
                print(f"   Demandes terminées: {data.get('completed_requests', 0)}")
            
            assert True, "Dashboard stats test passed"
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
            assert False, f"Dashboard stats test failed: {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        assert False, f"Exception: {e}"

def test_project_statistics(token):
    """Test des statistiques complètes du projet (admin seulement)"""
    print_section("Statistiques complètes du projet (Admin)")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(f"{API_BASE}/repair-requests/project_statistics/", headers=headers)
        
        if response.status_code == 200:
            data = response.json()
            print("✅ Statistiques complètes récupérées avec succès")
            
            # Vue d'ensemble
            overview = data.get('overview', {})
            print(f"   Utilisateurs totaux: {overview.get('total_users', 0)}")
            print(f"   Clients: {overview.get('total_clients', 0)}")
            print(f"   Techniciens: {overview.get('total_technicians', 0)}")
            print(f"   Admins: {overview.get('total_admins', 0)}")
            print(f"   Utilisateurs actifs (30j): {overview.get('active_users_30d', 0)}")
            print(f"   Demandes totales: {overview.get('total_requests', 0)}")
            print(f"   Demandes terminées: {overview.get('completed_requests', 0)}")
            print(f"   Revenus totaux: {overview.get('total_revenue', 0)} XOF")
            print(f"   Frais plateforme: {overview.get('platform_fees', 0)} XOF")
            print(f"   Note moyenne: {overview.get('avg_rating', 0)}/5")
            print(f"   Taux de satisfaction: {overview.get('satisfaction_rate', 0)}%")
            
            # Demandes récentes
            requests_data = data.get('requests', {})
            print(f"   Demandes 24h: {requests_data.get('recent_24h', 0)}")
            print(f"   Demandes 7j: {requests_data.get('recent_7d', 0)}")
            print(f"   Demandes 30j: {requests_data.get('recent_30d', 0)}")
            
            # Techniciens
            tech_data = data.get('technicians', {})
            print(f"   Techniciens vérifiés: {tech_data.get('verified', 0)}")
            print(f"   Techniciens disponibles: {tech_data.get('available', 0)}")
            print(f"   Taux de disponibilité: {tech_data.get('availability_rate', 0)}%")
            
            # Sécurité
            security_data = data.get('security', {})
            print(f"   Connexions réussies: {security_data.get('total_logins', 0)}")
            print(f"   Connexions échouées: {security_data.get('failed_logins', 0)}")
            print(f"   Alertes sécurité: {security_data.get('security_alerts', 0)}")
            print(f"   Taux de succès: {security_data.get('success_rate', 0)}%")
            
            assert True, "Project statistics test passed"
        elif response.status_code == 403:
            print("❌ Accès refusé - Utilisateur non admin")
            assert False, "Access denied for non-admin user"
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
            assert False, f"Project statistics test failed: {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        assert False, f"Exception: {e}"

def test_available_technicians(token, specialty="plomberie"):
    """Test de récupération des techniciens disponibles"""
    print_section(f"Techniciens disponibles pour: {specialty}")
    
    headers = {"Authorization": f"Bearer {token}"}
    
    try:
        response = requests.get(
            f"{API_BASE}/repair-requests/available_technicians/?specialty={specialty}", 
            headers=headers
        )
        
        if response.status_code == 200:
            data = response.json()
            print(f"✅ {len(data)} techniciens disponibles trouvés")
            
            for i, tech in enumerate(data[:3], 1):  # Afficher les 3 premiers
                print(f"   {i}. {tech.get('name', 'N/A')}")
                print(f"      Email: {tech.get('email', 'N/A')}")
                print(f"      Note: {tech.get('average_rating', 0)}/5")
                print(f"      Jobs: {tech.get('total_jobs', 0)}")
                print(f"      Tarif: {tech.get('hourly_rate', 0)} XOF/h")
            
            if len(data) > 3:
                print(f"   ... et {len(data) - 3} autres techniciens")
            
            assert True, "Available technicians test passed"
        elif response.status_code == 403:
            print("❌ Accès refusé - Utilisateur non admin")
            assert False, "Access denied for non-admin user"
        else:
            print(f"❌ Erreur: {response.status_code}")
            print(f"   Réponse: {response.text}")
            assert False, f"Available technicians test failed: {response.status_code}"
            
    except Exception as e:
        print(f"❌ Erreur: {str(e)}")
        assert False, f"Exception: {e}"

def main():
    """Fonction principale"""
    print_header("TEST DES STATISTIQUES - DEPANNETELIMAN")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Test de santé de l'API
    if not test_health_check():
        print("\n❌ Impossible de continuer - API non disponible")
        sys.exit(1)
    
    # Test avec différents types d'utilisateurs
    test_users = [
        ("mohamedbechirdiarra4@gmail.com", "bechir66312345", "admin"),
        ("technicien@depanneteliman.com", "bechir66312345", "technician"),
        ("client@depanneteliman.com", "bechir66312345", "client"),
    ]
    
    results = {}
    
    for email, password, user_type in test_users:
        print_header(f"TEST UTILISATEUR: {user_type.upper()}")
        
        # Connexion
        token, actual_user_type = login_user(email, password)
        if not token:
            print(f"❌ Impossible de tester {user_type} - échec de connexion")
            results[user_type] = False
            continue
        
        # Test des statistiques du tableau de bord
        dashboard_success = test_dashboard_stats(token, actual_user_type)
        
        # Test des statistiques complètes (admin seulement)
        project_success = False
        if actual_user_type == "admin":
            project_success = test_project_statistics(token)
            test_available_technicians(token)
        else:
            print_section("Statistiques complètes du projet")
            print("⏭️  Ignoré - Réservé aux admins")
        
        results[user_type] = dashboard_success and (actual_user_type != "admin" or project_success)
    
    # Résumé final
    print_header("RÉSUMÉ DES TESTS")
    for user_type, success in results.items():
        status = "✅ RÉUSSI" if success else "❌ ÉCHOUÉ"
        print(f"   {user_type.upper()}: {status}")
    
    all_success = all(results.values())
    if all_success:
        print("\n🎉 TOUS LES TESTS SONT PASSÉS AVEC SUCCÈS !")
    else:
        print("\n⚠️  CERTAINS TESTS ONT ÉCHOUÉ")
    
    print(f"\nTests terminés à {datetime.now().strftime('%H:%M:%S')}")

if __name__ == "__main__":
    main() 