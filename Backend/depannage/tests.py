from django.test import TestCase
from .models import SystemConfiguration, Technician, TechnicianSubscription, CinetPayPayment
from django.utils import timezone
from rest_framework.test import APIClient
import json
from django.contrib.auth import get_user_model

# Create your tests here.

class SystemConfigurationTestCase(TestCase):
    def setUp(self):
        SystemConfiguration.objects.create(
            key='test_config',
            value='valeur de test',
            description='Configuration système de test',
            is_active=True
        )

    def test_system_configuration_exists(self):
        """Vérifie qu'au moins une configuration système existe dans la base."""
        count = SystemConfiguration.objects.count()
        self.assertGreater(count, 0, "Aucune configuration système trouvée dans la base. Veuillez en créer une via l'admin Django.")


class SubscriptionPaymentMappingTest(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="testuser", email="test@example.com", password="testpass")
        self.technician = Technician.objects.create(user=self.user)
        self.payment = CinetPayPayment.objects.create(
            transaction_id="TXN-TEST-123",
            amount=5000,
            currency="XOF",
            description="Test paiement",
            customer_name="Test",
            customer_surname="User",
            customer_email="test@example.com",
            customer_phone_number="+22300000000",
            customer_address="Bamako, Mali",
            customer_city="Bamako",
            customer_country="ML",
            customer_state="ML",
            customer_zip_code="1000",
            status="pending",
            metadata=json.dumps({"duration_months": 1}),
            user=self.user
        )
        self.client = APIClient()

    def test_payment_to_subscription_mapping_idempotence(self):
        # Simuler la notification CinetPay ACCEPTED
        data = {
            "transaction_id": self.payment.transaction_id,
            "status": "ACCEPTED",
            "payment_date": timezone.now().isoformat(),
            "payment_token": "testtoken123",
            "amount": str(self.payment.amount)
        }
        url = "/depannage/api/cinetpay/notify/"
        for _ in range(2):  # Envoyer deux fois la notification
            response = self.client.post(url, data, format='json')
            self.assertIn(response.status_code, [200, 201])
        # Vérifier qu’un seul abonnement a été créé et qu’il est lié au paiement
        subs = TechnicianSubscription.objects.filter(technician=self.technician, payment=self.payment)
        self.assertEqual(subs.count(), 1)
        sub = subs.first()
        self.assertTrue(sub.is_active)
        self.assertEqual(sub.payment, self.payment)


class NewTechnicianSubscriptionTest(TestCase):
    def setUp(self):
        from django.contrib.auth import get_user_model
        User = get_user_model()
        self.user = User.objects.create_user(username="newtech", email="newtech@example.com", password="testpass", user_type="technician")
        from depannage.models import Technician
        self.technician = Technician.objects.create(user=self.user, specialty="it", phone="+22300000000")
        from depannage.models import CinetPayPayment
        self.payment = CinetPayPayment.objects.create(
            transaction_id="TXN-NEWTECH-001",
            amount=5000,
            currency="XOF",
            description="Abonnement initial",
            customer_name="New",
            customer_surname="Tech",
            customer_email="newtech@example.com",
            customer_phone_number="+22300000000",
            customer_address="Bamako, Mali",
            customer_city="Bamako",
            customer_country="ML",
            customer_state="ML",
            customer_zip_code="1000",
            status="pending",
            metadata=json.dumps({"duration_months": 1}),
            user=self.user
        )
        self.client = APIClient()

    def test_new_technician_subscription_creation(self):
        # Simuler la notification CinetPay ACCEPTED
        data = {
            "transaction_id": self.payment.transaction_id,
            "status": "ACCEPTED",
            "payment_date": timezone.now().isoformat(),
            "payment_token": "testtokennewtech",
            "amount": str(self.payment.amount)
        }
        url = "/depannage/api/cinetpay/notify/"
        response = self.client.post(url, data, format='json')
        self.assertIn(response.status_code, [200, 201])
        # Vérifier qu’un abonnement a été créé et qu’il est lié au paiement
        from depannage.models import TechnicianSubscription
        subs = TechnicianSubscription.objects.filter(technician=self.technician, payment=self.payment)
        self.assertEqual(subs.count(), 1)
        sub = subs.first()
        self.assertTrue(sub.is_active)
        self.assertEqual(sub.payment, self.payment)
