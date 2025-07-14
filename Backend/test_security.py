#!/usr/bin/env python3
"""
Script de test pour vérifier la sécurité de l'application.
"""

import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
import sys
import django
django.setup()

from django.conf import settings
from django.test import TestCase
from rest_framework.test import APITestCase
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import get_user_model

User = get_user_model()

def test_environment_variables():
    """Test que les variables d'environnement sont correctement configurées."""
    print("🔍 Test des variables d'environnement...")
    
    required_vars = ['DJANGO_SECRET_KEY', 'DEBUG', 'ALLOWED_HOSTS']
    
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"✅ {var}: Configuré")
        else:
            print(f"❌ {var}: Manquant")
            return False
    
    print("✅ Toutes les variables d'environnement sont configurées")
    return True

def test_jwt_configuration():
    """Test la configuration JWT."""
    print("\n🔍 Test de la configuration JWT...")
    
    jwt_settings = settings.SIMPLE_JWT
    
    # Vérifier les paramètres critiques
    assert jwt_settings.get('ACCESS_TOKEN_LIFETIME'), "ACCESS_TOKEN_LIFETIME manquant"
    print("✅ ACCESS_TOKEN_LIFETIME configuré")
    
    assert jwt_settings.get('REFRESH_TOKEN_LIFETIME'), "REFRESH_TOKEN_LIFETIME manquant"
    print("✅ REFRESH_TOKEN_LIFETIME configuré")
    
    assert jwt_settings.get('SIGNING_KEY'), "SIGNING_KEY manquant"
    print("✅ SIGNING_KEY configuré")
    
    assert jwt_settings.get('ROTATE_REFRESH_TOKENS'), "ROTATE_REFRESH_TOKENS désactivé"
    print("✅ ROTATE_REFRESH_TOKENS activé")
    
    print("✅ Configuration JWT correcte")
    return True

def test_cors_configuration():
    """Test la configuration CORS."""
    print("\n🔍 Test de la configuration CORS...")
    
    assert hasattr(settings, 'CORS_ALLOWED_ORIGINS'), "CORS_ALLOWED_ORIGINS non configuré"
    print("✅ CORS_ALLOWED_ORIGINS configuré")
    print(f"   Origines autorisées: {settings.CORS_ALLOWED_ORIGINS}")
    
    assert not getattr(settings, 'CORS_ALLOW_ALL_ORIGINS', False), "CORS_ALLOW_ALL_ORIGINS activé (non sécurisé)"
    print("✅ CORS_ALLOW_ALL_ORIGINS désactivé (sécurisé)")
    
    print("✅ Configuration CORS sécurisée")
    return True

def test_security_headers():
    """Test les headers de sécurité."""
    print("\n🔍 Test des headers de sécurité...")
    
    security_settings = [
        ('SECURE_BROWSER_XSS_FILTER', 'XSS Protection'),
        ('SECURE_CONTENT_TYPE_NOSNIFF', 'Content Type Sniffing Protection'),
        ('X_FRAME_OPTIONS', 'Clickjacking Protection'),
    ]
    
    for setting, description in security_settings:
        assert getattr(settings, setting, None), f"{description} désactivé"
        print(f"✅ {description} activé")
    
    print("✅ Headers de sécurité configurés")
    return True

def test_token_generation():
    """Test la génération de tokens JWT."""
    print("\n🔍 Test de génération de tokens JWT...")
    
    try:
        # Créer un utilisateur de test
        user, created = User.objects.get_or_create(
            username='testuser',
            email='test@example.com',
            defaults={
                'first_name': 'Test',
                'last_name': 'User',
                'user_type': 'client'
            }
        )
        
        # Générer des tokens
        refresh = RefreshToken.for_user(user)
        access_token = str(refresh.access_token)
        refresh_token = str(refresh)
        
        print(f"✅ Token d'accès généré: {access_token[:20]}...")
        print(f"✅ Token de rafraîchissement généré: {refresh_token[:20]}...")
        
        # Vérifier la validité
        refresh.access_token.verify()
        print("✅ Token d'accès valide")
        
        return True
        
    except Exception as e:
        print(f"❌ Erreur lors de la génération de tokens: {e}")
        return False

def main():
    """Fonction principale de test."""
    print("🚀 Test de sécurité de l'application DepanneTeliman")
    print("=" * 50)
    
    tests = [
        test_environment_variables,
        test_jwt_configuration,
        test_cors_configuration,
        test_security_headers,
        test_token_generation,
    ]
    
    passed = 0
    total = len(tests)
    
    for test in tests:
        try:
            if test():
                passed += 1
            else:
                print(f"❌ Test {test.__name__} a échoué")
        except Exception as e:
            print(f"❌ Test {test.__name__} a généré une erreur: {e}")
    
    print("\n" + "=" * 50)
    print(f"📊 Résultats: {passed}/{total} tests réussis")
    
    if passed == total:
        print("🎉 Tous les tests de sécurité sont passés!")
        return 0
    else:
        print("⚠️  Certains tests de sécurité ont échoué. Veuillez corriger les problèmes.")
        return 1

if __name__ == '__main__':
    sys.exit(main()) 