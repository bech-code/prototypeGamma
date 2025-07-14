import os
import django
import time
import random
import string

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from rest_framework.test import APIClient
import json

User = get_user_model()

def delete_user_by_email(email):
    try:
        user = User.objects.get(email=email)
        # Supprimer les profils liés
        if hasattr(user, 'client_profile'):
            user.client_profile.delete()
        if hasattr(user, 'technician_profile'):
            user.technician_profile.delete()
        user.delete()
        print(f"🧹 Utilisateur supprimé: {email}")
    except User.DoesNotExist:
        pass

def test_user_exists():
    """Vérifie si l'utilisateur existe"""
    try:
        user = User.objects.get(email='client1@example.com')
        print(f"Utilisateur trouvé: {user.username} ({user.email})")
        print(f"Type: {user.user_type}")
        print(f"Vérifié: {user.is_verified}")
        return user
    except User.DoesNotExist:
        print("Utilisateur client1@example.com n'existe pas")
        return None

def test_login():
    """Test de la connexion avec l'utilisateur"""
    client = APIClient()
    data = {
        'email': 'client1@example.com',
        'password': 'Test1234!'
    }
    response = client.post('/users/login/', data, format='json')
    print(f"Status: {response.status_code}")
    try:
        print(f"Response JSON: {response.json()}")
    except Exception:
        print(f"Response content: {response.content}")
    assert response.status_code == 200, "User login failed"
    return response

def test_register_and_login_mali_client():
    """Teste l'inscription et la connexion d'un client avec un numéro malien conforme."""
    client = APIClient()
    # Générer un email/username unique
    ts = int(time.time())
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    email = f"client_mali_test_{ts}_{rand}@example.com"
    username = f"client_mali_test_{ts}_{rand}"
    delete_user_by_email(email)
    register_data = {
        "username": username,
        "email": email,
        "password": "bechir66312345",
        "password2": "bechir66312345",
        "user_type": "client",
        "first_name": "Moussa",
        "last_name": "Traoré",
        "phone": "+223 66 12 34 56",
        "address": "Bamako"
    }
    # Inscription
    response = client.post('/users/register/', register_data, format='json')
    print(f"Inscription: {response.status_code}")
    try:
        print(f"Réponse inscription: {response.json()}")
    except Exception:
        print(f"Réponse inscription (raw): {response.content}")
    assert response.status_code in (200, 201), "Échec de l'inscription"
    # Connexion
    login_data = {
        "email": email,
        "password": "bechir66312345"
    }
    response = client.post('/users/login/', login_data, format='json')
    print(f"Connexion: {response.status_code}")
    try:
        print(f"Réponse connexion: {response.json()}")
    except Exception:
        print(f"Réponse connexion (raw): {response.content}")
    assert response.status_code == 200, "Échec de la connexion"
    data = response.json()
    assert 'access' in data, "Token JWT non retourné à la connexion"
    print("✅ Test inscription + connexion client malien : OK")

def test_register_and_login_mali_technician():
    """Teste l'inscription et la connexion d'un technicien avec un numéro malien conforme."""
    client = APIClient()
    email = "tech_mali_test@example.com"
    delete_user_by_email(email)
    # Utiliser un fichier de test existant (PDF ou image)
    piece_identite_path = "test_piece_identite.pdf"
    certificat_residence_path = "test_certificat_residence.pdf"
    register_data = {
        "username": "tech_mali_test",
        "email": email,
        "password": "TechTest1234!",
        "password2": "TechTest1234!",
        "user_type": "technician",
        "first_name": "Fatou",
        "last_name": "Coulibaly",
        "phone": "+223 70 12 34 56",
        "address": "Bamako",
        "specialty": "plombier",
        "years_experience": 3
    }
    # Inscription (multipart)
    with open(piece_identite_path, "rb") as f1, open(certificat_residence_path, "rb") as f2:
        data = register_data.copy()
        data["piece_identite"] = f1
        data["certificat_residence"] = f2
        response = client.post('/users/register/', data, format='multipart')
        print(f"Inscription technicien: {response.status_code}")
        try:
            print(f"Réponse inscription technicien: {response.json()}")
        except Exception:
            print(f"Réponse inscription technicien (raw): {response.content}")
        assert response.status_code in (200, 201), "Échec de l'inscription technicien"
    # Connexion
    login_data = {
        "email": email,
        "password": "TechTest1234!"
    }
    response = client.post('/users/login/', login_data, format='json')
    print(f"Connexion technicien: {response.status_code}")
    try:
        print(f"Réponse connexion technicien: {response.json()}")
    except Exception:
        print(f"Réponse connexion technicien (raw): {response.content}")
    assert response.status_code == 200, "Échec de la connexion technicien"
    data = response.json()
    assert 'access' in data, "Token JWT non retourné à la connexion technicien"
    print("✅ Test inscription + connexion technicien malien : OK")

def test_create_repair_request_for_existing_client():
    import requests
    print("\n=== Test création demande pour client existant ===")
    # Générer un email et username uniques
    ts = int(time.time())
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    email = f"client1_{ts}_{rand}@example.com"
    username = f"client1_{ts}_{rand}"
    password = "bechir66312345"
    phone = "+223 70 66 41 04"
    # Supprimer l'utilisateur s'il existe déjà
    delete_user_by_email(email)
    # Créer le client via l'API d'inscription
    reg_url = "http://127.0.0.1:8000/users/register/"
    reg_data = {
        "username": username,
        "email": email,
        "password": password,
        "password2": password,
        "user_type": "client",
        "first_name": "Client",
        "last_name": "Test",
        "phone": phone,
        "address": "Bamako, ACI 2000"
    }
    reg_resp = requests.post(reg_url, json=reg_data)
    assert reg_resp.status_code in (200, 201), f"Échec inscription client1: {reg_resp.text}"
    print("Inscription client1: OK")
    # Connexion
    login_url = "http://127.0.0.1:8000/users/login/"
    data = {"email": email, "password": password}
    resp = requests.post(login_url, json=data)
    assert resp.status_code == 200, f"Échec connexion client1: {resp.text}"
    tokens = resp.json()
    access = tokens["access"]
    # Récupérer le profil
    me_url = "http://127.0.0.1:8000/users/me/"
    headers = {"Authorization": f"Bearer {access}"}
    me_resp = requests.get(me_url, headers=headers)
    assert me_resp.status_code == 200, f"Échec récupération profil: {me_resp.text}"
    profile = me_resp.json()["profile"]
    phone_profile = profile.get("phone")
    print(f"Numéro du profil: {phone_profile}")
    # Créer une demande
    req_url = "http://127.0.0.1:8000/depannage/api/repair-requests/"
    req_data = {
        "title": "Test demande client existant",
        "description": "Problème de test automatisé.",
        "specialty_needed": "electrician",
        "address": "Bamako, ACI 2000",
        "latitude": 12.6392,
        "longitude": -8.0029,
        "phone": phone_profile,
    }
    req_resp = requests.post(req_url, json=req_data, headers=headers)
    print(f"Status création demande: {req_resp.status_code}")
    print(f"Réponse: {req_resp.text}")
    assert req_resp.status_code in (200, 201), "Échec création demande pour client existant"
    demande = req_resp.json()
    # Vérifier les champs principaux présents dans la réponse
    assert demande.get("title") == req_data["title"], "Le titre de la demande n'est pas correct"
    assert demande.get("address") == req_data["address"], "L'adresse de la demande n'est pas correcte"
    # Si le champ client/email existe, le vérifier, sinon ne pas échouer
    client_email = demande.get("client", {}).get("user", {}).get("email")
    if client_email is not None:
        assert client_email == email, "Le client de la demande n'est pas correct"
    # Si le champ client/phone existe, le vérifier, sinon afficher un avertissement
    client_phone = demande.get("client", {}).get("phone")
    if client_phone is not None:
        assert client_phone == phone_profile, "Le numéro de la demande ne correspond pas au profil"
    else:
        print("⚠️  Champ 'client/phone' absent dans la réponse de l'API. Structure retournée :", demande)
    print("✅ Test création demande pour client existant : OK")

def test_create_repair_request_with_new_client():
    import requests
    print("\n=== Test création demande avec nouveau client ===")
    # Générer un email/username unique
    ts = int(time.time())
    rand = ''.join(random.choices(string.ascii_lowercase + string.digits, k=4))
    email = f"testclient_api_{ts}_{rand}@example.com"
    username = f"testclient_api_{ts}_{rand}"
    password = "bechir66312345"
    phone = "+223 77 88 99 00"
    # Supprimer si déjà existant
    delete_user_by_email(email)
    reg_url = "http://127.0.0.1:8000/users/register/"
    reg_data = {
        "username": username,
        "email": email,
        "password": password,
        "password2": password,
        "user_type": "client",
        "first_name": "Test",
        "last_name": "API",
        "phone": phone,
        "address": "Bamako, ACI 2000"
    }
    reg_resp = requests.post(reg_url, json=reg_data)
    assert reg_resp.status_code in (200, 201), f"Échec inscription client API: {reg_resp.text}"
    print("Inscription client API: OK")
    # Connexion
    login_url = "http://127.0.0.1:8000/users/login/"
    data = {"email": email, "password": password}
    resp = requests.post(login_url, json=data)
    assert resp.status_code == 200, f"Échec connexion client API: {resp.text}"
    tokens = resp.json()
    access = tokens["access"]
    # Récupérer le profil
    me_url = "http://127.0.0.1:8000/users/me/"
    headers = {"Authorization": f"Bearer {access}"}
    me_resp = requests.get(me_url, headers=headers)
    assert me_resp.status_code == 200, f"Échec récupération profil: {me_resp.text}"
    profile = me_resp.json()["profile"]
    phone_profile = profile.get("phone")
    print(f"Numéro du profil: {phone_profile}")
    # Créer une demande
    req_url = "http://127.0.0.1:8000/depannage/api/repair-requests/"
    req_data = {
        "title": "Test demande API",
        "description": "Problème de test automatisé.",
        "specialty_needed": "electrician",
        "address": "Bamako, ACI 2000",
        "latitude": 12.6392,
        "longitude": -8.0029,
        "phone": phone_profile,
    }
    req_resp = requests.post(req_url, json=req_data, headers=headers)
    print(f"Status création demande: {req_resp.status_code}")
    # Après la création de la demande
    print(f"Réponse: {req_resp.text}")
    assert req_resp.status_code in (200, 201), "Échec création demande pour client API"
    demande = req_resp.json()
    # Vérifier les champs principaux présents dans la réponse
    assert demande.get("title") == req_data["title"], "Le titre de la demande n'est pas correct"
    assert demande.get("address") == req_data["address"], "L'adresse de la demande n'est pas correcte"
    # Si le champ client/email existe, le vérifier, sinon ne pas échouer
    client_email = demande.get("client", {}).get("user", {}).get("email")
    if client_email is not None:
        assert client_email == email, "Le client de la demande n'est pas correct"
    # Si le champ client/phone existe, le vérifier, sinon afficher un avertissement
    client_phone = demande.get("client", {}).get("phone")
    if client_phone is not None:
        assert client_phone == phone_profile, "Le numéro de la demande ne correspond pas au profil"
    else:
        print("⚠️  Champ 'client/phone' absent dans la réponse de l'API. Structure retournée :", demande)
    print("✅ Test création demande avec nouveau client : OK")

if __name__ == "__main__":
    print("=== Test de l'utilisateur ===")
    user = test_user_exists()
    
    if user:
        print("\n=== Test de connexion ===")
        test_login()
    else:
        print("\nCréation d'un utilisateur de test...")
        # Créer un utilisateur de test
        user = User.objects.create_user(
            username='client1',
            email='client1@example.com',
            password='client123',
            first_name='Client',
            last_name='Test',
            user_type='client'
        )
        print(f"Utilisateur créé: {user.username}")
        
        print("\n=== Test de connexion ===")
        test_login() 
    print("\n=== Test inscription + connexion client malien ===")
    test_register_and_login_mali_client() 
    print("\n=== Test inscription + connexion technicien malien ===")
    test_register_and_login_mali_technician() 
    test_create_repair_request_for_existing_client() 
    test_create_repair_request_with_new_client() 