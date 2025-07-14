import pytest
import requests
import random
import string

@pytest.fixture
def token():
    # Créer un utilisateur de test unique
    base_url = "http://127.0.0.1:8000"
    username = "testuser_" + ''.join(random.choices(string.ascii_lowercase + string.digits, k=6))
    email = username + "@example.com"
    password = "TestUser1234!"
    register_data = {
        "username": username,
        "email": email,
        "password": password,
        "password2": password,
        "user_type": "client",
        "first_name": "Test",
        "last_name": "User",
        "address": "Test Address",
        "phone_number": "+22500000000"
    }
    # Inscription
    requests.post(f"{base_url}/users/register/", json=register_data)
    # Connexion
    login_data = {"email": email, "password": password}
    resp = requests.post(f"{base_url}/users/login/", json=login_data)
    assert resp.status_code == 200, f"Échec de la connexion test: {resp.text}"
    return resp.json()["access"]

@pytest.fixture
def admin_token():
    base_url = "http://127.0.0.1:8000"
    email = "mohamedbechirdiarra4@gmail.com"
    password = "bechir66312345"
    # Vérifier si l'admin existe, sinon le créer
    login_data = {"email": email, "password": password}
    resp = requests.post(f"{base_url}/users/login/", json=login_data)
    if resp.status_code == 404:
        # Créer l'admin via l'API d'inscription
        register_data = {
            "username": "depan_use",
            "email": email,
            "password": password,
            "password2": password,
            "user_type": "admin",
            "first_name": "Admin",
            "last_name": "Test",
            "address": "Test Address",
            "phone_number": "+22500000000"
        }
        reg_resp = requests.post(f"{base_url}/users/register/", json=register_data)
        assert reg_resp.status_code in (200, 201), f"Échec création admin: {reg_resp.text}"
        # Re-tenter la connexion
        resp = requests.post(f"{base_url}/users/login/", json=login_data)
    assert resp.status_code == 200, f"Échec de la connexion admin: {resp.text}"
    return resp.json()["access"]

@pytest.fixture
def technician_token():
    base_url = "http://127.0.0.1:8000"
    email = "ballo@gmail.com"
    password = "bechir66312345"
    login_data = {"email": email, "password": password}
    resp = requests.post(f"{base_url}/users/login/", json=login_data)
    assert resp.status_code == 200, f"Échec de la connexion technicien: {resp.text}"
    return resp.json()["access"]

@pytest.fixture
def client_token():
    base_url = "http://127.0.0.1:8000"
    email = "client2@example.com"
    password = "bechir66312345"
    login_data = {"email": email, "password": password}
    resp = requests.post(f"{base_url}/users/login/", json=login_data)
    assert resp.status_code == 200, f"Échec de la connexion client: {resp.text}"
    return resp.json()["access"]

@pytest.fixture
def user_type():
    return "client"

@pytest.fixture
def endpoint():
    return "/users/me/"

@pytest.fixture
def client_id():
    base_url = "http://127.0.0.1:8000"
    email = "client2@example.com"
    password = "bechir66312345"
    login_data = {"email": email, "password": password}
    resp = requests.post(f"{base_url}/users/login/", json=login_data)
    if resp.status_code != 200:
        # Créer le client si besoin
        register_data = {
            "username": "client2",
            "email": email,
            "password": password,
            "password2": password,
            "user_type": "client",
            "first_name": "Client",
            "last_name": "Deux",
            "address": "Test Address",
            "phone_number": "+22500000001"
        }
        reg_resp = requests.post(f"{base_url}/users/register/", json=register_data)
        assert reg_resp.status_code in (200, 201), f"Échec création client2: {reg_resp.text}"
        resp = requests.post(f"{base_url}/users/login/", json=login_data)
    token = resp.json()["access"]
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = requests.get(f"{base_url}/users/me/", headers=headers)
    assert me_resp.status_code == 200, f"Échec récupération profil client: {me_resp.text}"
    user = me_resp.json().get("user")
    assert user and "id" in user, "Utilisateur client2 absent ou incomplet"
    return user["id"]

@pytest.fixture
def technician_id():
    base_url = "http://127.0.0.1:8000"
    email = "ballo@gmail.com"
    password = "bechir66312345"
    login_data = {"email": email, "password": password}
    resp = requests.post(f"{base_url}/users/login/", json=login_data)
    if resp.status_code != 200:
        # Créer le technicien si besoin
        register_data = {
            "username": "ballo_plombier",
            "email": email,
            "password": password,
            "password2": password,
            "user_type": "technician",
            "first_name": "Ballo",
            "last_name": "Plombier",
            "address": "Test Address",
            "phone_number": "+22500000002"
        }
        reg_resp = requests.post(f"{base_url}/users/register/", json=register_data)
        assert reg_resp.status_code in (200, 201), f"Échec création technicien: {reg_resp.text}"
        resp = requests.post(f"{base_url}/users/login/", json=login_data)
    token = resp.json()["access"]
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = requests.get(f"{base_url}/users/me/", headers=headers)
    assert me_resp.status_code == 200, f"Échec récupération profil technicien: {me_resp.text}"
    user = me_resp.json().get("user")
    assert user and "id" in user, "Utilisateur technicien absent ou incomplet"
    return user["id"]

@pytest.fixture
def review_id(client_token, technician_id):
    # Crée un avis de test si besoin et retourne son ID
    base_url = "http://127.0.0.1:8000"
    headers = {"Authorization": f"Bearer {client_token}"}
    # Créer une demande de réparation pour lier l'avis
    req_data = {
        "title": "Test review request",
        "description": "Demande pour test review.",
        "specialty_needed": "plumber",
        "address": "Test Address",
        "latitude": 12.6392,
        "longitude": -8.0029,
        "phone": "+22500000001"
    }
    req_resp = requests.post(f"{base_url}/depannage/api/repair-requests/", json=req_data, headers=headers)
    assert req_resp.status_code in (200, 201), f"Échec création demande pour review: {req_resp.text}"
    request_id = req_resp.json().get("id")
    # Créer l'avis
    review_data = {
        "request": request_id,
        "technician": technician_id,
        "rating": 5,
        "comment": "Excellent travail !",
        "positive_aspects": "Rapide, efficace",
        "tags": ["pro", "rapide"]
    }
    review_resp = requests.post(f"{base_url}/depannage/api/reviews/", json=review_data, headers=headers)
    assert review_resp.status_code in (200, 201), f"Échec création review: {review_resp.text}"
    return review_resp.json().get("id")

@pytest.fixture
def conversation_id(client_token, client_id, technician_id):
    # Crée une conversation de test si besoin et retourne son ID
    base_url = "http://127.0.0.1:8000"
    headers = {"Authorization": f"Bearer {client_token}"}
    data = {"client": client_id, "technician": technician_id}
    resp = requests.post(f"{base_url}/depannage/api/chat/conversations/", json=data, headers=headers)
    if resp.status_code in (200, 201):
        return resp.json().get("id")
    elif resp.status_code == 400 and "must make a unique set" in resp.text:
        # Conversation déjà existante, la récupérer via GET
        params = {"client": client_id, "technician": technician_id}
        get_resp = requests.get(f"{base_url}/depannage/api/chat/conversations/", params=params, headers=headers)
        if get_resp.status_code == 200 and get_resp.json():
            return get_resp.json()[0]["id"]
        else:
            raise AssertionError(f"Impossible de récupérer la conversation existante: {get_resp.text}")
    else:
        raise AssertionError(f"Échec création conversation: {resp.text}")

@pytest.fixture
def client_data(client_id):
    # Retourne un dict minimal de données client de test
    return {"id": client_id, "email": "client2@example.com", "first_name": "Client", "last_name": "Deux"}

@pytest.fixture
def technicians(technician_id):
    # Retourne une liste de techniciens de test avec id, auth_token, email, et user_data
    base_url = "http://127.0.0.1:8000"
    email = "ballo@gmail.com"
    password = "bechir66312345"
    login_data = {"email": email, "password": password}
    resp = requests.post(f"{base_url}/users/login/", json=login_data)
    assert resp.status_code == 200, f"Échec de la connexion technicien: {resp.text}"
    token = resp.json()["access"]
    # Récupérer les infos user
    headers = {"Authorization": f"Bearer {token}"}
    me_resp = requests.get(f"{base_url}/users/me/", headers=headers)
    assert me_resp.status_code == 200, f"Échec récupération profil: {me_resp.text}"
    user_info = me_resp.json()["user"]
    return [{"id": technician_id, "auth_token": token, "email": email, "user_data": user_info}]

@pytest.fixture
def created_requests(client_token, client_id):
    # Crée une demande de test et retourne son ID dans une liste
    base_url = "http://127.0.0.1:8000"
    headers = {"Authorization": f"Bearer {client_token}"}
    req_data = {
        "title": "Test request",
        "description": "Demande pour test.",
        "specialty_needed": "plumber",
        "address": "Test Address",
        "latitude": 12.6392,
        "longitude": -8.0029,
        "phone": "+22500000001"
    }
    # Vérifier la présence du profil client
    me_resp = requests.get(f"{base_url}/users/me/", headers=headers)
    assert me_resp.status_code == 200, f"Échec récupération profil client: {me_resp.text}"
    user = me_resp.json().get("user")
    assert user and user.get("client_profile"), "Profil client manquant pour la création de demande."
    # Vérifier si une demande existe déjà
    get_resp = requests.get(f"{base_url}/depannage/api/repair-requests/", headers=headers)
    if get_resp.status_code == 200:
        existing = [r for r in get_resp.json() if r.get("title") == req_data["title"]]
        if existing:
            return [existing[0]["id"]]
    req_resp = requests.post(f"{base_url}/depannage/api/repair-requests/", json=req_data, headers=headers)
    assert req_resp.status_code in (200, 201), f"Échec création demande: {req_resp.text}"
    return [req_resp.json().get("id")] 