import requests
from requests.exceptions import JSONDecodeError, ConnectionError

try:
    response = requests.post(
        'http://localhost:8000/users/login/',
        json={
            'email': 'client1@example.com',
            'password': 'client123'
        }
    )
    
    # Afficher le statut de la réponse
    print(f"Status Code: {response.status_code}")
    
    # Afficher le contenu brut de la réponse
    print(f"Response Content: {response.text}")
    
    # Tenter de décoder le JSON
    try:
        data = response.json()
        print("JSON Response:", data)
    except JSONDecodeError:
        print("Erreur: La réponse n'est pas au format JSON valide")
        
except ConnectionError:
    print("Erreur: Impossible de se connecter au serveur. Vérifiez que le serveur Django est en cours d'exécution.")
except Exception as e:
    print(f"Erreur inattendue: {str(e)}")
print(response.json())