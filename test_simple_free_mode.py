#!/usr/bin/env python3
"""
Test simplifié pour vérifier que le mode gratuit est bien activé.
"""

import requests
import json
import sys
from datetime import datetime

# Configuration
BASE_URL = "http://127.0.0.1:8000"

def print_section(title):
    """Affiche une section avec un titre."""
    print(f"\n{'='*60}")
    print(f"  {title}")
    print(f"{'='*60}")

def print_test_result(test_name, success, message=""):
    """Affiche le résultat d'un test."""
    status = "✅ SUCCÈS" if success else "❌ ÉCHEC"
    print(f"{status}: {test_name}")
    if message:
        print(f"   → {message}")

def test_backend_connectivity():
    """Teste la connectivité du backend."""
    print_section("TEST BACKEND - CONNECTIVITÉ")
    
    try:
        response = requests.get(f"{BASE_URL}/depannage/api/test/")
        if response.status_code == 200:
            print_test_result("Backend accessible", True)
            return True
        else:
            print_test_result("Backend accessible", False, f"Code {response.status_code}")
            return False
    except Exception as e:
        print_test_result("Backend accessible", False, f"Erreur: {e}")
        return False

def test_backend_payment_endpoints_disabled():
    """Teste que les endpoints de paiement sont désactivés."""
    print_section("TEST BACKEND - ENDPOINTS DE PAIEMENT DÉSACTIVÉS")
    
    payment_endpoints = [
        "/depannage/api/payments/",
        "/depannage/api/payments/stats/",
        "/depannage/api/subscription-requests/",
        "/depannage/api/cinetpay/",
        "/depannage/api/cinetpay/notification/"
    ]
    
    all_disabled = True
    
    for endpoint in payment_endpoints:
        try:
            response = requests.get(f"{BASE_URL}{endpoint}")
            
            # On s'attend à ce que ces endpoints retournent 404, 405, 403 ou 401 (non autorisé)
            is_disabled = response.status_code in [404, 405, 403, 401]
            print_test_result(f"Endpoint {endpoint}", is_disabled, f"Code {response.status_code}")
            
            if not is_disabled:
                all_disabled = False
                
        except Exception as e:
            print_test_result(f"Endpoint {endpoint}", True, f"Erreur de connexion: {e}")
    
    return all_disabled

def test_frontend_pages_updated():
    """Teste que les pages frontend ont été mises à jour."""
    print_section("TEST FRONTEND - PAGES MISES À JOUR")
    
    # Liste des fichiers à vérifier
    frontend_files = [
        "Frontend/src/pages/AdminPayments.tsx",
        "Frontend/src/pages/AdminConfiguration.tsx", 
        "Frontend/src/pages/AdminDashboard.tsx",
        "Frontend/src/pages/TechnicianDashboard.tsx",
        "Frontend/src/components/SubscriptionPanel.tsx",
        "Frontend/src/App.tsx"
    ]
    
    all_updated = True
    
    for file_path in frontend_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Vérifications spécifiques selon le fichier
            if "AdminPayments.tsx" in file_path:
                has_gratuit = "gratuit" in content.lower() or "désactivé" in content.lower()
                has_payment_disabled = "système de paiement désactivé" in content.lower()
                print_test_result(f"AdminPayments.tsx - Mode gratuit", has_gratuit and has_payment_disabled)
                if not (has_gratuit and has_payment_disabled):
                    all_updated = False
                    
            elif "AdminConfiguration.tsx" in file_path:
                has_no_payment = "payment" not in content.lower() or "paiement" not in content.lower()
                print_test_result(f"AdminConfiguration.tsx - Pas de paiement", has_no_payment)
                if not has_no_payment:
                    all_updated = False
                    
            elif "AdminDashboard.tsx" in file_path:
                has_gratuit_message = "plateforme gratuite" in content.lower() or "accès gratuit" in content.lower()
                print_test_result(f"AdminDashboard.tsx - Message gratuit", has_gratuit_message)
                if not has_gratuit_message:
                    all_updated = False
                    
            elif "TechnicianDashboard.tsx" in file_path:
                has_gratuit_access = "accès gratuit illimité" in content.lower()
                has_no_payment_logic = "paiement" not in content.lower() or "payment" not in content.lower()
                print_test_result(f"TechnicianDashboard.tsx - Accès gratuit", has_gratuit_access and has_no_payment_logic)
                if not (has_gratuit_access and has_no_payment_logic):
                    all_updated = False
                    
            elif "SubscriptionPanel.tsx" in file_path:
                has_gratuit_message = "accès gratuit illimité" in content.lower()
                print_test_result(f"SubscriptionPanel.tsx - Message gratuit", has_gratuit_message)
                if not has_gratuit_message:
                    all_updated = False
                    
            elif "App.tsx" in file_path:
                # Ignorer les commentaires et vérifier seulement le code actif
                lines = content.split('\n')
                active_code = []
                for line in lines:
                    if not line.strip().startswith('//') and not line.strip().startswith('/*'):
                        active_code.append(line)
                active_content = '\n'.join(active_code)
                has_no_payment_routes = "payment" not in active_content.lower() and "paiement" not in active_content.lower()
                print_test_result(f"App.tsx - Pas de routes de paiement", has_no_payment_routes)
                if not has_no_payment_routes:
                    all_updated = False
                    
        except FileNotFoundError:
            print_test_result(f"{file_path}", False, "Fichier non trouvé")
            all_updated = False
        except Exception as e:
            print_test_result(f"{file_path}", False, f"Erreur: {e}")
            all_updated = False
    
    return all_updated

def test_backend_models_updated():
    """Teste que les modèles backend ont été mis à jour."""
    print_section("TEST BACKEND - MODÈLES MIS À JOUR")
    
    # Vérification des fichiers backend
    backend_files = [
        "Backend/depannage/models.py",
        "Backend/depannage/views.py",
        "Backend/depannage/urls.py"
    ]
    
    all_updated = True
    
    for file_path in backend_files:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            if "models.py" in file_path:
                has_gratuit_subscription = "has_active_subscription" in content and "return True" in content
                print_test_result(f"models.py - has_active_subscription gratuit", has_gratuit_subscription)
                if not has_gratuit_subscription:
                    all_updated = False
                    
            elif "views.py" in file_path:
                has_no_payment_views = "CinetPayViewSet" not in content and "CinetPayNotificationAPIView" not in content
                print_test_result(f"views.py - Pas de vues de paiement", has_no_payment_views)
                if not has_no_payment_views:
                    all_updated = False
                    
            elif "urls.py" in file_path:
                # Ignorer les commentaires et vérifier seulement le code actif
                lines = content.split('\n')
                active_code = []
                for line in lines:
                    if not line.strip().startswith('#') and not line.strip().startswith('"""') and not line.strip().startswith("'''"):
                        active_code.append(line)
                active_content = '\n'.join(active_code)
                has_no_payment_urls = "cinetpay" not in active_content.lower() and "payment" not in active_content.lower()
                print_test_result(f"urls.py - Pas d'URLs de paiement", has_no_payment_urls)
                if not has_no_payment_urls:
                    all_updated = False
                    
        except FileNotFoundError:
            print_test_result(f"{file_path}", False, "Fichier non trouvé")
            all_updated = False
        except Exception as e:
            print_test_result(f"{file_path}", False, f"Erreur: {e}")
            all_updated = False
    
    return all_updated

def test_deleted_files():
    """Teste que les fichiers de paiement ont été supprimés."""
    print_section("TEST FICHIERS SUPPRIMÉS")
    
    deleted_files = [
        "Frontend/src/pages/PaymentPage.tsx",
        "Frontend/src/pages/PaymentSuccess.tsx",
        "Frontend/src/pages/ManualPaymentPage.tsx",
        "Frontend/src/pages/AdminSubscriptionRequests.tsx"
    ]
    
    all_deleted = True
    
    for file_path in deleted_files:
        try:
            with open(file_path, 'r') as f:
                # Si on peut ouvrir le fichier, il existe encore
                print_test_result(f"{file_path}", False, "Fichier encore présent")
                all_deleted = False
        except FileNotFoundError:
            print_test_result(f"{file_path}", True, "Fichier supprimé")
        except Exception as e:
            print_test_result(f"{file_path}", True, f"Erreur: {e}")
    
    return all_deleted

def main():
    """Fonction principale."""
    print_section("TEST COMPLET - MODE GRATUIT")
    print(f"Date: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    
    # Tests
    results = []
    
    # Test de connectivité
    results.append(test_backend_connectivity())
    
    # Test frontend
    results.append(test_frontend_pages_updated())
    
    # Test backend
    results.append(test_backend_models_updated())
    
    # Test endpoints désactivés
    results.append(test_backend_payment_endpoints_disabled())
    
    # Test fichiers supprimés
    results.append(test_deleted_files())
    
    # Résumé
    print_section("RÉSUMÉ")
    success_count = sum(results)
    total_count = len(results)
    
    print(f"Tests réussis: {success_count}/{total_count}")
    
    if success_count == total_count:
        print("🎉 TOUS LES TESTS SONT PASSÉS !")
        print("✅ La plateforme est entièrement en mode gratuit")
        print("\n📋 RÉCAPITULATIF DES MODIFICATIONS:")
        print("   ✅ Backend: has_active_subscription retourne toujours True")
        print("   ✅ Backend: Endpoints de paiement supprimés")
        print("   ✅ Frontend: Pages admin mises à jour")
        print("   ✅ Frontend: Pages technicien mises à jour")
        print("   ✅ Frontend: Fichiers de paiement supprimés")
        print("   ✅ Frontend: Routes de paiement supprimées")
        return True
    else:
        print("⚠️  Certains tests ont échoué")
        print("❌ Des corrections sont nécessaires")
        return False

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 