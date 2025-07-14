#!/usr/bin/env python3
"""
Test script for authentication flow
"""

import requests
import json
import sys
import os

# Add the backend directory to the path
sys.path.append(os.path.join(os.path.dirname(__file__), 'Backend'))

# Backend URL
BASE_URL = "http://127.0.0.1:8000"

def test_auth_flow():
    """Test the complete authentication flow"""
    
    print("🔐 Testing Authentication Flow")
    print("=" * 50)
    
    # Test 1: Check if server is running
    try:
        response = requests.get(f"{BASE_URL}/users/")
        print(f"✅ Server is running (Status: {response.status_code})")
    except requests.exceptions.ConnectionError:
        print("❌ Server is not running. Please start the Django server first.")
        assert False, "Server is not running"
    
    # Test 2: Test login with admin credentials
    print("\n🔑 Testing Login...")
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
        if response.status_code == 200:
            data = response.json()
            if 'access' in data and 'refresh' in data:
                print("✅ Login successful")
                print(f"   Access token: {data['access'][:20]}...")
                print(f"   Refresh token: {data['refresh'][:20]}...")
                
                # Test 3: Test token refresh
                print("\n🔄 Testing Token Refresh...")
                refresh_data = {"refresh": data['refresh']}
                refresh_response = requests.post(f"{BASE_URL}/users/token/refresh/", json=refresh_data)
                
                if refresh_response.status_code == 200:
                    refresh_result = refresh_response.json()
                    print("✅ Token refresh successful")
                    print(f"   New access token: {refresh_result['access'][:20]}...")
                else:
                    print(f"❌ Token refresh failed: {refresh_response.status_code}")
                    print(f"   Response: {refresh_response.text}")
                    assert False, "Token refresh failed"
                
                # Test 4: Test /users/me/ endpoint
                print("\n👤 Testing /users/me/ endpoint...")
                headers = {"Authorization": f"Bearer {data['access']}"}
                me_response = requests.get(f"{BASE_URL}/users/me/", headers=headers)
                
                if me_response.status_code == 200:
                    me_data = me_response.json()
                    print("✅ /users/me/ endpoint working")
                    print(f"   User: {me_data.get('user', {}).get('email', 'N/A')}")
                    print(f"   User type: {me_data.get('user', {}).get('user_type', 'N/A')}")
                else:
                    print(f"❌ /users/me/ failed: {me_response.status_code}")
                    print(f"   Response: {me_response.text}")
                    assert False, "Users/me endpoint failed"
                
                assert True, "Authentication flow test passed"
            else:
                print("❌ Login response missing tokens")
                print(f"   Response: {data}")
                assert False, "Login response missing tokens"
        else:
            print(f"❌ Login failed: {response.status_code}")
            print(f"   Response: {response.text}")
            assert False, f"Login failed with status code: {response.status_code}"
            
    except Exception as e:
        print(f"❌ Login error: {e}")
        assert False, f"Login error: {e}"

def test_statistics_endpoints():
    """Test statistics endpoints with authentication"""
    
    print("\n📊 Testing Statistics Endpoints")
    print("=" * 50)
    
    # First get a valid token
    login_data = {
        "email": "admin@depanneteliman.com",
        "password": "admin123"
    }
    
    try:
        response = requests.post(f"{BASE_URL}/users/login/", json=login_data)
        if response.status_code != 200:
            print("❌ Cannot get authentication token for statistics test")
            assert False, "Could not get authentication token for statistics test"
            
        data = response.json()
        headers = {"Authorization": f"Bearer {data['access']}"}
        
        # Test project statistics
        print("\n📈 Testing Project Statistics...")
        stats_response = requests.get(f"{BASE_URL}/depannage/statistics/project/", headers=headers)
        
        if stats_response.status_code == 200:
            stats_data = stats_response.json()
            print("✅ Project statistics endpoint working")
            print(f"   Total users: {stats_data.get('overview', {}).get('total_users', 'N/A')}")
            print(f"   Total requests: {stats_data.get('overview', {}).get('total_requests', 'N/A')}")
        else:
            print(f"❌ Project statistics failed: {stats_response.status_code}")
            print(f"   Response: {stats_response.text}")
            assert False, "Project statistics endpoint failed"
        
        # Test user statistics
        print("\n👥 Testing User Statistics...")
        user_stats_response = requests.get(f"{BASE_URL}/depannage/statistics/users/", headers=headers)
        
        if user_stats_response.status_code == 200:
            user_stats_data = user_stats_response.json()
            print("✅ User statistics endpoint working")
            print(f"   Response keys: {list(user_stats_data.keys())}")
        else:
            print(f"❌ User statistics failed: {user_stats_response.status_code}")
            print(f"   Response: {user_stats_response.text}")
            assert False, "User statistics endpoint failed"
        
        assert True, "Statistics endpoints test passed"
        
    except Exception as e:
        print(f"❌ Statistics test error: {e}")
        assert False, f"Statistics test error: {e}"

if __name__ == "__main__":
    print("🚀 Starting Authentication and Statistics Tests")
    print("=" * 60)
    
    # Test authentication flow
    auth_success = test_auth_flow()
    
    if auth_success:
        # Test statistics endpoints
        stats_success = test_statistics_endpoints()
        
        print("\n" + "=" * 60)
        print("📋 Test Summary:")
        print(f"   Authentication Flow: {'✅ PASS' if auth_success else '❌ FAIL'}")
        print(f"   Statistics Endpoints: {'✅ PASS' if stats_success else '❌ FAIL'}")
        
        if auth_success and stats_success:
            print("\n🎉 All tests passed! The backend is working correctly.")
        else:
            print("\n⚠️  Some tests failed. Please check the errors above.")
    else:
        print("\n❌ Authentication test failed. Cannot proceed with statistics tests.") 