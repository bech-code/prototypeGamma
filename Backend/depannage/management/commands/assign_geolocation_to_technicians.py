from django.core.management.base import BaseCommand
from depannage.models import Technician

class Command(BaseCommand):
    help = "Attribue une latitude/longitude par défaut à tous les techniciens non géolocalisés."

    def handle(self, *args, **options):
        default_lat = 12.6392  # Bamako
        default_lng = -8.0029
        count = 0
        for tech in Technician.objects.filter(current_latitude__isnull=True) | Technician.objects.filter(current_longitude__isnull=True):
            tech.current_latitude = default_lat
            tech.current_longitude = default_lng
            tech.save()
            self.stdout.write(self.style.SUCCESS(f"Technicien {tech.user.username} géolocalisé en ({default_lat}, {default_lng})"))
            count += 1
        if count == 0:
            self.stdout.write(self.style.WARNING("Aucun technicien à géolocaliser."))
        else:
            self.stdout.write(self.style.SUCCESS(f"{count} technicien(s) géolocalisé(s) avec succès.")) 