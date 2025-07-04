from django.test import TestCase
from .models import SystemConfiguration

# Create your tests here.

class SystemConfigurationTestCase(TestCase):
    def test_system_configuration_exists(self):
        """Vérifie qu'au moins une configuration système existe dans la base."""
        count = SystemConfiguration.objects.count()
        self.assertGreater(count, 0, "Aucune configuration système trouvée dans la base. Veuillez en créer une via l'admin Django.")
