import requests

def test_login():
    url = "http://127.0.0.1:8000/users/login/"
    data = {
        "email": "client1@example.com",
        "password": "client123"
    }
    headers = {
        "Content-Type": "application/json"
    }
    
    try:
        response = requests.post(url, json=data, headers=headers)
        print(f"Status Code: {response.status_code}")
        print(f"Response: {response.text}")
        return response
    except Exception as e:
        print(f"Error: {e}")
        return None

if __name__ == "__main__":
    print("Testing login...")
    test_login() 