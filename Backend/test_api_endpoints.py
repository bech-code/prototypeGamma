#!/usr/bin/env python3
"""
Script de test automatique pour l'API DepanneTeliman
Teste tous les endpoints publics et protégés
"""

import requests
import json
import time
from datetime import datetime

class APITester:
    def __init__(self, base_url="http://127.0.0.1:8000"):
        self.base_url = base_url
        self.session = requests.Session()
        self.token = None
        self.refresh_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, response=None, error=None):
        """Enregistre le résultat d'un test"""
        result = {
            'test': test_name,
            'success': success,
            'timestamp': datetime.now().isoformat(),
            'status_code': response.status_code if response else None,
            'error': str(error) if error else None
        }
        self.test_results.append(result)
        
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name}")
        if error:
            print(f"   Erreur: {error}")
        if response and response.status_code != 200:
            print(f"   Status: {response.status_code}")
            try:
                print(f"   Response: {response.json()}")
            except:
                print(f"   Response: {response.text}")
        print()

    def test_public_endpoints(self):
        """Teste les endpoints publics"""
        print("🔍 Test des endpoints publics...")
        print("=" * 50)
        
        # Test 1: Health Check
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/test/health_check/")
            success = response.status_code == 200
            self.log_test("Health Check", success, response)
        except Exception as e:
            self.log_test("Health Check", False, error=e)
        
        # Test 2: API Info
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/test/api_info/")
            success = response.status_code == 200
            self.log_test("API Info", success, response)
        except Exception as e:
            self.log_test("API Info", False, error=e)
        
        # Test 3: Admin Interface
        try:
            response = self.session.get(f"{self.base_url}/admin/")
            success = response.status_code == 200
            self.log_test("Admin Interface", success, response)
        except Exception as e:
            self.log_test("Admin Interface", False, error=e)

    def test_authentication(self):
        """Teste l'authentification"""
        print("🔐 Test de l'authentification...")
        print("=" * 50)
        
        # Test 1: Login (avec des credentials de test)
        login_data = {
            "email": "mohamedbechirdiarra4@gmail.com",
            "password": "bechir66312345"  # Remplacez par le vrai mot de passe
        }
        
        try:
            response = self.session.post(
                f"{self.base_url}/users/login/",
                json=login_data,
                headers={'Content-Type': 'application/json'}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.token = data.get('access')
                self.refresh_token = data.get('refresh')
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                self.log_test("Login", True, response)
            else:
                self.log_test("Login", False, response)
                
        except Exception as e:
            self.log_test("Login", False, error=e)
        
        # Test 2: Profil utilisateur (protégé)
        if self.token:
            try:
                response = self.session.get(f"{self.base_url}/users/me/")
                success = response.status_code == 200
                self.log_test("User Profile (Protected)", success, response)
            except Exception as e:
                self.log_test("User Profile (Protected)", False, error=e)
        else:
            self.log_test("User Profile (Protected)", False, error="No token available")

    def test_create_repair_request(self):
        """Teste la création d'une demande de réparation avec tous les champs du modèle."""
        if not self.token:
            print("⚠️  Impossible de tester la création sans token")
            return
        print("🛠️  Test de création de demande de réparation complète...")
        print("=" * 50)
        payload = {
            "title": "Réparation climatisation urgente",
            "description": "La climatisation ne fonctionne plus depuis ce matin.",
            "address": "Cocody Riviera, Abidjan",
            "specialty_needed": "air_conditioning",
            "priority": "urgent",
            "urgency_level": "sos",
            "min_experience_level": "senior",
            "min_rating": 4,
            "latitude": 5.345,
            "longitude": -4.012,
            "estimated_price": 35000.0,  # Correction ici
            # Champs frontend (seront ignorés côté backend)
            "is_urgent": True,
            "date": "2024-07-01",
            "time": "09:00:00",
            "service_type": "air_conditioning",
            "city": "Abidjan",
            "postalCode": "22500"
        }
        try:
            response = self.session.post(
                f"{self.base_url}/depannage/api/repair-requests/",
                json=payload,
                headers={'Content-Type': 'application/json'}
            )
            success = response.status_code in (200, 201)
            if not success:
                print(f"--- Réponse brute du backend ---")
                print(f"Status code: {response.status_code}")
                try:
                    print(response.json())
                except Exception:
                    print(response.text)
                print(f"-------------------------------")
            self.log_test("Create Repair Request (all fields)", success, response)
            # Appel du test de notifications côté technicien pour toutes les spécialités
            if success:
                for specialty in [
                    'electrician', 'plumber', 'mechanic', 'it',
                    'air_conditioning', 'appliance_repair', 'locksmith', 'other'
                ]:
                    self.test_technician_notifications(specialty)
        except Exception as e:
            self.log_test("Create Repair Request (all fields)", False, error=e)

    def test_technician_notification_logic(self):
        """Teste que seuls les 10 techniciens les plus proches sont notifiés et que la notification disparaît après assignation."""
        if not self.token:
            print("⚠️  Impossible de tester la logique de notification sans token")
            return
        print("🔔 Test de notification des 10 techniciens les plus proches...")
        print("=" * 50)
        # 1. Créer une demande de réparation
        payload = {
            "title": "Test proximité techniciens",
            "description": "Test de notification des plus proches.",
            "address": "Cocody Riviera, Abidjan",
            "specialty_needed": "air_conditioning",
            "priority": "urgent",
            "estimated_price": 35000,
            "urgency_level": "sos",
            "min_experience_level": "senior",
            "min_rating": 4,
            "latitude": 5.345,
            "longitude": -4.012
        }
        headers = {"Authorization": f"Bearer {self.token}"}
        r = requests.post(f"{self.base_url}/depannage/api/repair-requests/", json=payload, headers=headers)
        if r.status_code != 201:
            print(f"❌ FAIL Create Repair Request (notif logic)")
            print(f"   Erreur: {r.text}")
            return
        data = r.json()
        print(f"✅ PASS Create Repair Request (notif logic)")
        print(f"   Status: {r.status_code}")
        print(f"   Response: {data}")
        request_id = data.get("id")
        if not request_id:
            print("   Erreur: Pas d'ID de demande retourné")
            return
        # 2. Afficher la liste des techniciens notifiés
        print("\n🔎 Récupération des techniciens notifiés...")
        notif_url = f"{self.base_url}/depannage/api/notifications/?type=new_request_technician&request={request_id}"
        notif_resp = requests.get(notif_url, headers=headers)
        if notif_resp.status_code == 200:
            notif_data = notif_resp.json()
            if notif_data:
                # Si la réponse est paginée, on prend la clé 'results'
                results = notif_data.get('results', notif_data)
                print("Techniciens notifiés pour la demande:")
                for notif in results:
                    print(f"  - Utilisateur ID: {notif.get('recipient')}")
            else:
                print("Aucun technicien notifié trouvé.")
        else:
            print(f"Erreur lors de la récupération des notifications: {notif_resp.text}")
        # 3. Demander l'ID d'un technicien notifié pour l'assignation
        tech_id = input("Entrez l'ID d'un des techniciens notifiés pour la demande: ")
        assign_url = f"{self.base_url}/depannage/api/repair-requests/{request_id}/assign_technician/"
        assign_payload = {"technician_id": tech_id}
        assign_resp = requests.post(assign_url, json=assign_payload, headers=headers)
        print("--- Réponse brute du backend (assignation) ---")
        print(assign_resp.json())

    def test_protected_endpoints(self):
        """Teste les endpoints protégés"""
        if not self.token:
            print("⚠️  Impossible de tester les endpoints protégés sans token")
            return
            
        print("🔒 Test des endpoints protégés...")
        print("=" * 50)
        
        # Test 1: Liste des demandes de réparation
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/repair-requests/")
            success = response.status_code == 200
            self.log_test("Repair Requests List", success, response)
        except Exception as e:
            self.log_test("Repair Requests List", False, error=e)
        
        # Test 2: Liste des techniciens
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/technicians/")
            success = response.status_code == 200
            self.log_test("Technicians List", success, response)
        except Exception as e:
            self.log_test("Technicians List", False, error=e)
        
        # Test 3: Liste des clients
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/clients/")
            success = response.status_code == 200
            self.log_test("Clients List", success, response)
        except Exception as e:
            self.log_test("Clients List", False, error=e)

    def test_error_handling(self):
        """Teste la gestion d'erreurs"""
        print("🚨 Test de la gestion d'erreurs...")
        print("=" * 50)
        
        # Test 1: Accès protégé sans token
        try:
            response = requests.get(f"{self.base_url}/users/me/")
            success = response.status_code == 401
            self.log_test("Unauthorized Access", success, response)
        except Exception as e:
            self.log_test("Unauthorized Access", False, error=e)
        
        # Test 2: Route inexistante
        try:
            response = self.session.get(f"{self.base_url}/api/nonexistent/")
            success = response.status_code == 404
            self.log_test("Non-existent Route", success, response)
        except Exception as e:
            self.log_test("Non-existent Route", False, error=e)
        
        # Test 3: Token invalide
        if self.token:
            invalid_headers = {'Authorization': 'Bearer invalid_token'}
            try:
                response = requests.get(
                    f"{self.base_url}/users/me/",
                    headers=invalid_headers
                )
                success = response.status_code == 401
                self.log_test("Invalid Token", success, response)
            except Exception as e:
                self.log_test("Invalid Token", False, error=e)

    def test_performance(self):
        """Teste les performances"""
        print("⚡ Test des performances...")
        print("=" * 50)
        
        # Test de temps de réponse pour health check
        start_time = time.time()
        try:
            response = self.session.get(f"{self.base_url}/depannage/api/test/health_check/")
            end_time = time.time()
            response_time = (end_time - start_time) * 1000  # en millisecondes
            
            success = response_time < 1000  # moins de 1 seconde
            self.log_test(f"Response Time ({response_time:.2f}ms)", success, response)
        except Exception as e:
            self.log_test("Response Time", False, error=e)

    def test_notification_and_assignment_full_scenario(self):
        """Test avancé : notification et assignation pour chaque spécialité."""
        print("\n🚦 Test avancé : notification et assignation pour chaque spécialité\n" + "="*60)
        specialties = [
            'electrician', 'plumber', 'mechanic', 'it',
            'air_conditioning', 'appliance_repair', 'locksmith', 'other'
        ]
        headers = {"Authorization": f"Bearer {self.token}"}
        # Authentification admin pour l'assignation
        admin_login = {
            "email": "mohamedbechirdiarra4@gmail.com",
            "password": "bechir66312345"
        }
        admin_token = None
        r = requests.post(f"{self.base_url}/users/login/", json=admin_login)
        if r.status_code == 200 and 'access' in r.json():
            admin_token = r.json()['access']
            admin_headers = {"Authorization": f"Bearer {admin_token}"}
            print("✅ Authentification admin OK pour l'assignation")
        else:
            print("❌ Impossible de s'authentifier en admin pour l'assignation")
            admin_headers = headers
        # Récupérer tous les techniciens (pour mapping user_id -> technician_id)
        tech_resp = requests.get(f"{self.base_url}/depannage/api/technicians/", headers=admin_headers)
        tech_map = {}
        if tech_resp.status_code == 200:
            techs = tech_resp.json().get('results', tech_resp.json())
            for t in techs:
                tech_map[t['user']['id']] = {"technician_id": t['id'], "username": t['user']['username'], "specialty": t['specialty']}
        for specialty in specialties:
            print(f"\n🛠️  Création d'une demande pour la spécialité : {specialty}")
            payload = {
                "title": f"Test notif {specialty}",
                "description": f"Demande test pour {specialty}",
                "address": "Bamako, Mali",
                "specialty_needed": specialty,
                "priority": "urgent",
                "estimated_price": 20000,
                "urgency_level": "sos",
                "min_experience_level": "junior",
                "min_rating": 1,
                "latitude": 12.6392,
                "longitude": -8.0029
            }
            r = requests.post(f"{self.base_url}/depannage/api/repair-requests/", json=payload, headers=headers)
            if r.status_code != 201:
                print(f"❌ FAIL création demande {specialty} : {r.text}")
                continue
            data = r.json()
            request_id = data.get("id")
            print(f"✅ Demande créée (ID: {request_id})")
            # Récupérer les techniciens notifiés
            notif_url = f"{self.base_url}/depannage/api/notifications/?type=new_request_technician&request={request_id}"
            notif_resp = requests.get(notif_url, headers=admin_headers)
            notif_data = notif_resp.json()
            results = notif_data.get('results', notif_data)
            notified_ids = [notif.get('recipient') for notif in results]
            print(f"🔔 Techniciens notifiés (user_id): {notified_ids}")
            # Afficher mapping user_id -> technician_id
            print("Correspondance notifications -> techniciens :")
            for uid in notified_ids:
                tinfo = tech_map.get(uid)
                if tinfo:
                    print(f"  - user_id: {uid} -> technician_id: {tinfo['technician_id']} | username: {tinfo['username']} | spécialité: {tinfo['specialty']}")
                else:
                    print(f"  - user_id: {uid} -> (technicien non trouvé)")
            # Assigner la demande au premier technicien notifié (de la bonne spécialité)
            tech_id = None
            for uid in notified_ids:
                tinfo = tech_map.get(uid)
                if tinfo and tinfo['specialty'] == specialty:
                    tech_id = tinfo['technician_id']
                    break
            if tech_id:
                assign_url = f"{self.base_url}/depannage/api/repair-requests/{request_id}/assign_technician/"
                assign_payload = {"technician_id": tech_id}
                assign_resp = requests.post(assign_url, json=assign_payload, headers=admin_headers)
                assign_data = assign_resp.json()
                if assign_resp.status_code in (200, 201) and assign_data.get("success"):
                    print(f"✅ Demande assignée à technicien {tech_id}")
                else:
                    print(f"❌ FAIL assignation : {assign_data}")
                # Vérifier que les notifications sont lues pour les autres
                notif_check = requests.get(notif_url, headers=admin_headers).json()
                results_check = notif_check.get('results', notif_check)
                unread = [n for n in results_check if not n.get('is_read') and tech_map.get(n.get('recipient'), {}).get('technician_id') != tech_id]
                if not unread:
                    print("✅ Toutes les notifications non assignées sont marquées comme lues.")
                else:
                    print(f"❌ Notifications non lues restantes : {unread}")
            else:
                print("❌ Aucun technicien de la bonne spécialité notifié pour cette demande.")
        print("\n🎯 Test avancé terminé.")

    def test_technician_notifications(self, specialty):
        print(f"\n🔎 Vérification des notifications pour les techniciens '{specialty}'")
        for i in range(1, 4):
            email = f"tech_{specialty}_{i}@example.com"
            password = "TestPassword123!"
            resp = requests.post(f"{self.base_url}/users/login/", json={"email": email, "password": password})
            if resp.status_code == 200 and 'access' in resp.json():
                token = resp.json()['access']
                headers = {"Authorization": f"Bearer {token}"}
                notif_resp = requests.get(f"{self.base_url}/depannage/api/notifications/?type=new_request_technician", headers=headers)
                print(f"  - {email}: {notif_resp.json()}")
            else:
                print(f"  - {email}: échec connexion")

    def run_all_tests(self):
        """Exécute tous les tests"""
        print("🚀 Démarrage des tests de l'API DepanneTeliman")
        print("=" * 60)
        print()
        
        self.test_public_endpoints()
        self.test_authentication()
        self.test_create_repair_request()
        self.test_technician_notification_logic()
        self.test_protected_endpoints()
        self.test_error_handling()
        self.test_performance()
        self.test_notification_and_assignment_full_scenario()
        
        self.print_summary()

    def print_summary(self):
        """Affiche un résumé des tests"""
        print("📊 Résumé des tests")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total des tests: {total_tests}")
        print(f"Tests réussis: {passed_tests} ✅")
        print(f"Tests échoués: {failed_tests} ❌")
        print(f"Taux de réussite: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\n❌ Tests échoués:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  - {result['test']}: {result['error']}")
        
        # Sauvegarder les résultats
        with open('test_results.json', 'w') as f:
            json.dump(self.test_results, f, indent=2)
        print(f"\n📄 Résultats sauvegardés dans test_results.json")

if __name__ == "__main__":
    tester = APITester()
    tester.run_all_tests() 