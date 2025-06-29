import requests

def test_cors_preflight():
    """Test de la requête preflight OPTIONS"""
    url = "http://127.0.0.1:8000/users/login/"
    headers = {
        'Origin': 'http://localhost:5174',
        'Access-Control-Request-Method': 'POST',
        'Access-Control-Request-Headers': 'Content-Type'
    }
    
    try:
        response = requests.options(url, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Headers: {dict(response.headers)}")
        print(f"Access-Control-Allow-Origin: {response.headers.get('Access-Control-Allow-Origin', 'Not found')}")
        print(f"Access-Control-Allow-Methods: {response.headers.get('Access-Control-Allow-Methods', 'Not found')}")
        print(f"Access-Control-Allow-Headers: {response.headers.get('Access-Control-Allow-Headers', 'Not found')}")
        return response
    except Exception as e:
        print(f"Error: {e}")
        return None

def test_cors_post():
    """Test de la requête POST avec CORS"""
    url = "http://127.0.0.1:8000/users/login/"
    headers = {
        'Origin': 'http://localhost:5174',
        'Content-Type': 'application/json'
    }
    data = {
        "email": "test@test.com",
        "password": "testpassword"
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        print(f"\nPOST Status Code: {response.status_code}")
        print(f"POST Headers: {dict(response.headers)}")
        print(f"POST Response: {response.text}")
        return response
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing CORS configuration...")
    test_cors_preflight()
    test_cors_post() 