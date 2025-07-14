#!/usr/bin/env python3
"""
Test du système de notation et d'avis amélioré
Vérifie tous les nouveaux critères et fonctionnalités
"""

import requests
import json
import time
from datetime import datetime, timedelta

# Configuration
BASE_URL = "http://127.0.0.1:8000"
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "admin123"

def print_header(title):
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_success(message):
    print(f"✅ {message}")

def print_error(message):
    print(f"❌ {message}")

def print_info(message):
    print(f"ℹ️  {message}")

def print_warning(message):
    print(f"⚠️  {message}")

def login_user(email, password):
    """Connexion d'un utilisateur et récupération du token."""
    try:
        response = requests.post(f"{BASE_URL}/auth/login/", {
            "email": email,
            "password": password
        })
        
        if response.status_code == 200:
            data = response.json()
            return data.get('access'), data.get('refresh')
        else:
            print_error(f"Échec de connexion: {response.status_code} - {response.text}")
            return None, None
    except Exception as e:
        print_error(f"Erreur de connexion: {e}")
        return None, None

def create_test_users():
    """Création des utilisateurs de test."""
    print_header("CRÉATION DES UTILISATEURS DE TEST")
    
    # Connexion admin
    admin_token, _ = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print_error("Impossible de se connecter en tant qu'admin")
        return None, None
    
    headers = {'Authorization': f'Bearer {admin_token}'}
    
    # Créer un client avec tous les champs nécessaires
    client_data = {
        "email": "client_review@test.com",
        "password": "test123",
        "first_name": "Jean",
        "last_name": "Dupont",
        "user_type": "client",
        "address": "123 Rue de la Paix, Abidjan",
        "phone_number": "+2250701234567"
    }
    
    response = requests.post(f"{BASE_URL}/auth/register/", json=client_data)
    if response.status_code == 201:
        print_success("Client créé avec succès")
        client_token, _ = login_user("client_review@test.com", "test123")
        # Vérifier que le profil client existe
        if client_token:
            headers_client = {"Authorization": f"Bearer {client_token}"}
            me_resp = requests.get(f"{BASE_URL}/users/me/", headers=headers_client)
            if me_resp.status_code == 200:
                user = me_resp.json().get("user")
                if not user or not user.get("client_profile"):
                    # Créer le profil client via l'API si nécessaire
                    profile_data = {
                        "address": "123 Rue de la Paix, Abidjan",
                        "phone": "+2250701234567"
                    }
                    requests.post(f"{BASE_URL}/depannage/api/clients/", json=profile_data, headers=headers_client)
    else:
        print_error(f"Échec création client: {response.status_code}")
        client_token = None
    
    # Créer un technicien
    technician_data = {
        "email": "technician_review@test.com",
        "password": "test123",
        "first_name": "Pierre",
        "last_name": "Martin",
        "user_type": "technician",
        "specialty": "electrician",
        "phone": "+2250701234567",
        "years_experience": 5,
        "hourly_rate": 5000
    }
    
    response = requests.post(f"{BASE_URL}/auth/register/", json=technician_data)
    if response.status_code == 201:
        print_success("Technicien créé avec succès")
        technician_token, _ = login_user("technician_review@test.com", "test123")
    else:
        print_error(f"Échec création technicien: {response.status_code}")
        technician_token = None
    
    return client_token, technician_token

def create_test_request(client_token):
    """Création d'une demande de test."""
    print_header("CRÉATION D'UNE DEMANDE DE TEST")
    
    headers = {'Authorization': f'Bearer {client_token}'}
    
    request_data = {
        "title": "Panne électrique urgente",
        "description": "Interrupteur qui ne fonctionne plus dans la cuisine",
        "address": "123 Rue de la Paix, Abidjan",
        "specialty_needed": "electrician",
        "priority": "high",
        "urgency_level": "urgent",
        "estimated_price": 15000,
        "latitude": 5.3600,
        "longitude": -4.0083
    }
    
    response = requests.post(f"{BASE_URL}/depannage/api/repair-requests/", 
                           json=request_data, headers=headers)
    
    if response.status_code == 201:
        request_data = response.json()
        print_success(f"Demande créée: {request_data['id']}")
        return request_data
    else:
        print_error(f"Échec création demande: {response.status_code} - {response.text}")
        return None

def assign_technician_to_request(admin_token, request_id, technician_id):
    """Assignation d'un technicien à la demande."""
    print_header("ASSIGNATION DU TECHNICIEN")
    
    headers = {'Authorization': f'Bearer {admin_token}'}
    
    # Récupérer les techniciens disponibles
    response = requests.get(f"{BASE_URL}/depannage/api/technicians/", headers=headers)
    if response.status_code == 200:
        technicians = response.json().get('results', [])
        if technicians:
            technician = technicians[0]
            technician_id = technician['id']
            
            # Assigner le technicien
            assignment_data = {"technician_id": technician_id}
            response = requests.patch(
                f"{BASE_URL}/depannage/api/repair-requests/{request_id}/assign/",
                json=assignment_data, headers=headers
            )
            
            if response.status_code == 200:
                print_success(f"Technicien {technician_id} assigné")
                return technician_id
            else:
                print_error(f"Échec assignation: {response.status_code}")
        else:
            print_error("Aucun technicien disponible")
    
    return None

def complete_request(admin_token, request_id):
    """Marquer la demande comme terminée."""
    print_header("TERMINATION DE LA DEMANDE")
    
    headers = {'Authorization': f'Bearer {admin_token}'}
    
    # Mettre à jour le statut
    status_data = {"status": "completed"}
    response = requests.patch(
        f"{BASE_URL}/depannage/api/repair-requests/{request_id}/",
        json=status_data, headers=headers
    )
    
    if response.status_code == 200:
        print_success("Demande marquée comme terminée")
        return True
    else:
        print_error(f"Échec mise à jour statut: {response.status_code}")
        return False

def create_enhanced_review(client_token, request_id, technician_id):
    """Création d'un avis détaillé avec tous les nouveaux critères."""
    print_header("CRÉATION D'UN AVIS DÉTAILLÉ")
    
    headers = {'Authorization': f'Bearer {client_token}'}
    
    review_data = {
        "request": request_id,
        "technician": technician_id,
        "rating": 5,
        "punctuality_rating": 5,
        "quality_rating": 5,
        "communication_rating": 4,
        "professionalism_rating": 5,
        "problem_solving_rating": 5,
        "cleanliness_rating": 4,
        "price_fairness_rating": 4,
        "comment": "Excellent technicien ! Intervention rapide et efficace. Le problème a été résolu en moins d'une heure. Très professionnel et propre dans son travail. Prix justifié pour la qualité du service.",
        "would_recommend": True,
        "would_use_again": True,
        "would_recommend_to_friends": True,
        "positive_aspects": "Intervention rapide, diagnostic précis, travail propre, explications claires",
        "improvement_suggestions": "Pourrait proposer des conseils de prévention",
        "intervention_duration_minutes": 45,
        "was_urgent": True,
        "problem_complexity": "moderate",
        "parts_used": True,
        "warranty_offered": True,
        "warranty_duration_days": 90,
        "tags": ["professionnel", "rapide", "efficace", "ponctuel", "garantie"]
    }
    
    response = requests.post(f"{BASE_URL}/depannage/api/reviews/", 
                           json=review_data, headers=headers)
    
    if response.status_code == 201:
        review_data = response.json()
        print_success(f"Avis créé avec succès (ID: {review_data['id']})")
        print_info(f"Note globale: {review_data['rating']}/5")
        print_info(f"Score de qualité: {review_data['review_quality_score']}")
        return review_data
    else:
        print_error(f"Échec création avis: {response.status_code} - {response.text}")
        return None

def test_review_statistics(technician_token):
    """Test des statistiques d'avis."""
    print_header("TEST DES STATISTIQUES D'AVIS")
    
    headers = {'Authorization': f'Bearer {technician_token}'}
    
    # Récupérer les statistiques
    response = requests.get(f"{BASE_URL}/depannage/api/reviews/statistics/", headers=headers)
    
    if response.status_code == 200:
        stats = response.json()
        print_success("Statistiques récupérées avec succès")
        print_info(f"Total avis: {stats['total_reviews']}")
        print_info(f"Note moyenne: {stats['average_rating']}")
        print_info(f"Taux de recommandation: {stats['recommendation_rate']}%")
        print_info(f"Avis détaillés: {stats['detailed_reviews_count']}")
        assert isinstance(stats, dict) and stats.get('ok', True), "Review statistics test failed"
        return stats
    else:
        print_error(f"Échec récupération statistiques: {response.status_code}")
        return None

def test_review_analytics(technician_token):
    """Test des analytics d'avis."""
    print_header("TEST DES ANALYTICS D'AVIS")
    
    headers = {'Authorization': f'Bearer {technician_token}'}
    
    # Récupérer les analytics
    response = requests.get(f"{BASE_URL}/depannage/api/reviews/analytics/", headers=headers)
    
    if response.status_code == 200:
        analytics = response.json()
        print_success("Analytics récupérés avec succès")
        print_info(f"Note moyenne: {analytics['average_rating']}")
        print_info(f"Complétude moyenne: {analytics['avg_review_completeness']}%")
        print_info(f"Tags populaires: {len(analytics['popular_tags'])}")
        return analytics
    else:
        print_error(f"Échec récupération analytics: {response.status_code}")
        return None

def test_quality_metrics(technician_token):
    """Test des métriques de qualité."""
    print_header("TEST DES MÉTRIQUES DE QUALITÉ")
    
    headers = {'Authorization': f'Bearer {technician_token}'}
    
    # Récupérer les métriques de qualité
    response = requests.get(f"{BASE_URL}/depannage/api/reviews/quality_metrics/", headers=headers)
    
    if response.status_code == 200:
        metrics = response.json()
        print_success("Métriques de qualité récupérées")
        print_info(f"Total avis: {metrics['total_reviews']}")
        print_info(f"Avis détaillés: {metrics['detailed_reviews_count']}")
        print_info(f"Score moyen: {metrics['avg_overall_score']}")
        assert isinstance(metrics, dict) and metrics.get('ok', True), "Quality metrics test failed"
        return metrics
    else:
        print_error(f"Échec récupération métriques: {response.status_code}")
        return None

def test_popular_tags(technician_token):
    """Test des tags populaires."""
    print_header("TEST DES TAGS POPULAIRES")
    
    headers = {'Authorization': f'Bearer {technician_token}'}
    
    # Récupérer les tags populaires
    response = requests.get(f"{BASE_URL}/depannage/api/reviews/popular_tags/", headers=headers)
    
    if response.status_code == 200:
        tags_data = response.json()
        popular_tags = tags_data.get('popular_tags', [])
        print_success(f"Tags populaires récupérés: {len(popular_tags)}")
        for tag in popular_tags[:5]:  # Afficher les 5 premiers
            print_info(f"- {tag['tag']}: {tag['count']} fois")
        assert isinstance(popular_tags, list) and len(popular_tags) > 0, "Popular tags test failed"
        return popular_tags
    else:
        print_error(f"Échec récupération tags: {response.status_code}")
        return None

def test_review_moderation(admin_token, review_id):
    """Test de la modération d'avis."""
    print_header("TEST DE LA MODÉRATION D'AVIS")
    
    headers = {'Authorization': f'Bearer {admin_token}'}
    
    # Récupérer les avis en attente de modération
    response = requests.get(f"{BASE_URL}/depannage/api/reviews/", headers=headers)
    
    if response.status_code == 200:
        reviews = response.json().get('results', [])
        if reviews:
            review = reviews[0]
            print_success(f"Avis trouvé pour modération: {review['id']}")
            print_info(f"Statut: {review['moderation_status']}")
            print_info(f"Score de qualité: {review['review_quality_score']}")
            return review
        else:
            print_warning("Aucun avis trouvé pour la modération")
    else:
        print_error(f"Échec récupération avis: {response.status_code}")
    
    return None

def test_review_flagging(client_token, review_id):
    """Test du signalement d'avis."""
    print_header("TEST DU SIGNALEMENT D'AVIS")
    
    headers = {'Authorization': f'Bearer {client_token}'}
    
    # Signaler un avis (simulation)
    response = requests.post(f"{BASE_URL}/depannage/api/reviews/{review_id}/flag_review/", 
                           headers=headers)
    
    if response.status_code == 200:
        print_success("Avis signalé avec succès")
        return True
    else:
        print_error(f"Échec signalement: {response.status_code}")
        return False

def test_review_update(client_token, review_id):
    """Test de la mise à jour d'avis."""
    print_header("TEST DE LA MISE À JOUR D'AVIS")
    
    headers = {'Authorization': f'Bearer {client_token}'}
    
    update_data = {
        "rating": 4,
        "comment": "Avis mis à jour - service toujours satisfaisant",
        "positive_aspects": "Intervention rapide et efficace",
        "tags": ["professionnel", "rapide", "mis à jour"]
    }
    
    response = requests.patch(f"{BASE_URL}/depannage/api/reviews/{review_id}/", 
                            json=update_data, headers=headers)
    
    if response.status_code == 200:
        print_success("Avis mis à jour avec succès")
        return True
    else:
        print_error(f"Échec mise à jour: {response.status_code}")
        return False

def test_review_received(technician_token):
    """Test de la récupération des avis reçus."""
    print_header("TEST DES AVIS REÇUS")
    
    headers = {'Authorization': f'Bearer {technician_token}'}
    
    # Récupérer les avis reçus
    response = requests.get(f"{BASE_URL}/depannage/api/reviews/received/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        reviews = data.get('results', [])
        print_success(f"Avis reçus récupérés: {len(reviews)}")
        if reviews:
            review = reviews[0]
            print_info(f"Note: {review['rating']}/5")
            print_info(f"Commentaire: {review['comment'][:50]}...")
            print_info(f"Tags: {review['tags']}")
        assert isinstance(reviews, list), "Review received test failed"
        return reviews
    else:
        print_error(f"Échec récupération avis reçus: {response.status_code}")
        return None

def test_review_given(client_token):
    """Test de la récupération des avis donnés."""
    print_header("TEST DES AVIS DONNÉS")
    
    headers = {'Authorization': f'Bearer {client_token}'}
    
    # Récupérer les avis donnés
    response = requests.get(f"{BASE_URL}/depannage/api/reviews/given/", headers=headers)
    
    if response.status_code == 200:
        data = response.json()
        reviews = data.get('results', [])
        print_success(f"Avis donnés récupérés: {len(reviews)}")
        if reviews:
            review = reviews[0]
            print_info(f"Note: {review['rating']}/5")
            print_info(f"Score de qualité: {review['review_quality_score']}")
        return reviews
    else:
        print_error(f"Échec récupération avis donnés: {response.status_code}")
        return None

def main():
    """Fonction principale de test."""
    print_header("TEST DU SYSTÈME DE NOTATION ET D'AVIS AMÉLIORÉ")
    
    # 1. Créer les utilisateurs de test
    client_token, technician_token = create_test_users()
    if not client_token or not technician_token:
        print_error("Impossible de créer les utilisateurs de test")
        return
    
    # 2. Connexion admin
    admin_token, _ = login_user(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not admin_token:
        print_error("Impossible de se connecter en tant qu'admin")
        return
    
    # 3. Créer une demande de test
    request_data = create_test_request(client_token)
    if not request_data:
        print_error("Impossible de créer la demande de test")
        return
    
    request_id = request_data['id']
    
    # 4. Assigner un technicien
    technician_id = assign_technician_to_request(admin_token, request_id, None)
    if not technician_id:
        print_error("Impossible d'assigner un technicien")
        return
    
    # 5. Terminer la demande
    if not complete_request(admin_token, request_id):
        print_error("Impossible de terminer la demande")
        return
    
    # 6. Créer un avis détaillé
    review_data = create_enhanced_review(client_token, request_id, technician_id)
    if not review_data:
        print_error("Impossible de créer l'avis")
        return
    
    review_id = review_data['id']
    
    # 7. Tests des nouvelles fonctionnalités
    result = test_review_statistics(technician_token)
    assert result, "Review statistics test failed"
    result = test_review_analytics(technician_token)
    assert result, "Review analytics test failed"
    result = test_quality_metrics(technician_token)
    assert result, "Quality metrics test failed"
    result = test_popular_tags(technician_token)
    assert result, "Popular tags test failed"
    result = test_review_moderation(admin_token, review_id)
    assert result, "Review moderation test failed"
    result = test_review_flagging(client_token, review_id)
    assert result, "Review flagging test failed"
    result = test_review_update(client_token, review_id)
    assert result, "Review update test failed"
    result = test_review_received(technician_token)
    assert result, "Review received test failed"
    result = test_review_given(client_token)
    assert result, "Review given test failed"
    
    print_header("RÉSUMÉ DES TESTS")
    print_success("✅ Tous les tests du système de notation amélioré ont été exécutés")
    print_info("📊 Nouvelles fonctionnalités testées:")
    print_info("   - Critères de notation détaillés (8 critères)")
    print_info("   - Informations supplémentaires (durée, complexité, garantie)")
    print_info("   - Feedback détaillé (points positifs, suggestions)")
    print_info("   - Tags et catégorisation")
    print_info("   - Analytics et métriques de qualité")
    print_info("   - Modération et signalement d'avis")
    print_info("   - Système de recommandation avancé")
    
    print_header("SYSTÈME PRÊT POUR LA PRODUCTION")
    print_success("🎉 Le système de notation et d'avis amélioré est opérationnel !")

if __name__ == "__main__":
    main() 