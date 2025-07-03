#!/usr/bin/env python3
"""
Script de diagnostic et résolution des problèmes de tokens.
Ce script aide à identifier et résoudre les problèmes d'authentification.
"""

import os
import sys
import django
import json
from datetime import datetime, timedelta

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from django.contrib.sessions.models import Session
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken
from rest_framework_simplejwt.exceptions import TokenError

User = get_user_model()

class TokenDebugger:
    def __init__(self):
        self.issues_found = []
        
    def log_issue(self, issue_type, message, solution=""):
        """Enregistre un problème trouvé."""
        self.issues_found.append({
            'type': issue_type,
            'message': message,
            'solution': solution
        })
        print(f"🔍 {issue_type}: {message}")
        if solution:
            print(f"   💡 Solution: {solution}")
            
    def check_jwt_configuration(self):
        """Vérifie la configuration JWT."""
        print("🔧 Vérification de la configuration JWT...")
        
        try:
            from rest_framework_simplejwt.settings import api_settings
            
            access_lifetime = api_settings.ACCESS_TOKEN_LIFETIME
            refresh_lifetime = api_settings.REFRESH_TOKEN_LIFETIME
            
            print(f"   Access Token Lifetime: {access_lifetime}")
            print(f"   Refresh Token Lifetime: {refresh_lifetime}")
            
            if access_lifetime < timedelta(minutes=30):
                self.log_issue(
                    "Configuration", 
                    "Access token lifetime très court",
                    "Augmenter ACCESS_TOKEN_LIFETIME dans settings.py"
                )
                
        except Exception as e:
            self.log_issue("Configuration", f"Erreur de configuration JWT: {e}")
            
    def check_user_sessions(self):
        """Vérifie les sessions utilisateur."""
        print("\n👥 Vérification des sessions utilisateur...")
        
        total_sessions = Session.objects.count()
        expired_sessions = Session.objects.filter(expire_date__lt=timezone.now()).count()
        active_sessions = total_sessions - expired_sessions
        
        print(f"   Sessions totales: {total_sessions}")
        print(f"   Sessions expirées: {expired_sessions}")
        print(f"   Sessions actives: {active_sessions}")
        
        if expired_sessions > 0:
            self.log_issue(
                "Sessions", 
                f"{expired_sessions} sessions expirées",
                "Exécuter: python clean_expired_tokens.py"
            )
            
    def check_user_tokens(self):
        """Vérifie les tokens des utilisateurs."""
        print("\n🔑 Vérification des tokens utilisateur...")
        
        try:
            from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
            
            total_tokens = OutstandingToken.objects.count()
            expired_tokens = OutstandingToken.objects.filter(expires_at__lt=timezone.now()).count()
            valid_tokens = total_tokens - expired_tokens
            
            print(f"   Tokens totaux: {total_tokens}")
            print(f"   Tokens expirés: {expired_tokens}")
            print(f"   Tokens valides: {valid_tokens}")
            
            if expired_tokens > 0:
                self.log_issue(
                    "Tokens", 
                    f"{expired_tokens} tokens expirés",
                    "Exécuter: python clean_expired_tokens.py"
                )
                
        except ImportError:
            print("   Blacklist JWT non activée")
        except Exception as e:
            self.log_issue("Tokens", f"Erreur lors de la vérification des tokens: {e}")
            
    def test_token_creation(self):
        """Teste la création de tokens."""
        print("\n🧪 Test de création de tokens...")
        
        try:
            # Créer un utilisateur de test temporaire
            test_user, created = User.objects.get_or_create(
                username="token_test_user",
                defaults={
                    'email': 'token_test@test.com',
                    'password': 'testpass123',
                    'user_type': 'client'
                }
            )
            
            if created:
                test_user.set_password('testpass123')
                test_user.save()
                print("   Utilisateur de test créé")
            
            # Créer des tokens
            refresh = RefreshToken.for_user(test_user)
            access_token = str(refresh.access_token)
            refresh_token = str(refresh)
            
            print("   ✅ Tokens créés avec succès")
            
            # Vérifier la validité
            try:
                token = AccessToken(access_token)
                user_id = token['user_id']
                print(f"   ✅ Token valide pour l'utilisateur {user_id}")
            except TokenError as e:
                self.log_issue("Token Validation", f"Token invalide: {e}")
                
            # Nettoyer
            if created:
                test_user.delete()
                print("   Utilisateur de test supprimé")
                
        except Exception as e:
            self.log_issue("Token Creation", f"Erreur lors de la création de tokens: {e}")
            
    def check_technician_profiles(self):
        """Vérifie les profils technicien."""
        print("\n🔧 Vérification des profils technicien...")
        
        try:
            from depannage.models import Technician
            
            technicians = Technician.objects.all()
            print(f"   Techniciens totaux: {technicians.count()}")
            
            for tech in technicians[:5]:  # Afficher les 5 premiers
                print(f"   - {tech.user.username} (ID: {tech.id}, User ID: {tech.user.id})")
                
            # Vérifier les techniciens sans profil utilisateur
            orphaned_techs = Technician.objects.filter(user__isnull=True)
            if orphaned_techs.exists():
                self.log_issue(
                    "Profils", 
                    f"{orphaned_techs.count()} techniciens orphelins",
                    "Vérifier l'intégrité de la base de données"
                )
                
        except Exception as e:
            self.log_issue("Profils", f"Erreur lors de la vérification des profils: {e}")
            
    def generate_fix_script(self):
        """Génère un script de correction automatique."""
        print("\n🔧 Génération du script de correction...")
        
        script_content = """#!/usr/bin/env python3
# Script de correction automatique généré
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.sessions.models import Session
from django.utils import timezone

print("🧹 Nettoyage automatique...")

# Nettoyer les sessions expirées
expired_sessions = Session.objects.filter(expire_date__lt=timezone.now())
count = expired_sessions.count()
expired_sessions.delete()
print(f"✅ {count} sessions expirées supprimées")

# Nettoyer les tokens JWT expirés
try:
    from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
    expired_tokens = OutstandingToken.objects.filter(expires_at__lt=timezone.now())
    count = expired_tokens.count()
    expired_tokens.delete()
    print(f"✅ {count} tokens JWT expirés supprimés")
except:
    print("ℹ️ Blacklist JWT non activée")

print("🎉 Nettoyage terminé!")
"""
        
        with open('fix_tokens.py', 'w') as f:
            f.write(script_content)
            
        print("   ✅ Script fix_tokens.py généré")
        
    def run_diagnostic(self):
        """Exécute le diagnostic complet."""
        print("🔍 DIAGNOSTIC DES TOKENS - DepanneTeliman")
        print("=" * 50)
        print(f"⏰ Heure: {timezone.now()}")
        print()
        
        self.check_jwt_configuration()
        self.check_user_sessions()
        self.check_user_tokens()
        self.test_token_creation()
        self.check_technician_profiles()
        self.generate_fix_script()
        
        print("\n" + "=" * 50)
        print("📊 RÉSUMÉ DU DIAGNOSTIC")
        
        if not self.issues_found:
            print("✅ Aucun problème détecté")
            print("\n💡 Recommandations:")
            print("   1. Vérifiez que le frontend utilise le bon token")
            print("   2. Assurez-vous que l'utilisateur est bien connecté")
            print("   3. Videz le cache du navigateur")
        else:
            print(f"⚠️ {len(self.issues_found)} problème(s) détecté(s):")
            for issue in self.issues_found:
                print(f"   • {issue['type']}: {issue['message']}")
                
            print("\n🔧 Actions recommandées:")
            print("   1. Exécuter: python fix_tokens.py")
            print("   2. Redémarrer le serveur Django")
            print("   3. Se reconnecter dans le frontend")
            print("   4. Vider le localStorage du navigateur")

def main():
    """Fonction principale."""
    debugger = TokenDebugger()
    debugger.run_diagnostic()

if __name__ == "__main__":
    main() 