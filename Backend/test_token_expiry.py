from django.test import TestCase
from rest_framework.test import APIClient
from rest_framework_simplejwt.tokens import AccessToken
from django.contrib.auth import get_user_model
from datetime import timedelta
from django.utils import timezone

User = get_user_model()

class TokenExpiryTest(TestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='testpass')
        self.client = APIClient()

    def test_expired_token(self):
        # Générer un token déjà expiré
        token = AccessToken.for_user(self.user)
        token.set_exp(from_time=timezone.now() - timedelta(hours=1))  # Expiré il y a 1h
        self.client.credentials(HTTP_AUTHORIZATION=f'Bearer {str(token)}')
        response = self.client.get('/depannage/api/notifications/')
        self.assertEqual(response.status_code, 401)
        import json
        data = json.loads(response.content.decode())
        self.assertIn('token', data.get('detail', '').lower()) 