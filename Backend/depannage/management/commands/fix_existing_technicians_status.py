from django.core.management.base import BaseCommand
from depannage.models import Technician

class Command(BaseCommand):
    help = "Rend tous les techniciens existants disponibles et vérifiés (is_available=True, is_verified=True)."

    def handle(self, *args, **options):
        updated = 0
        for tech in Technician.objects.all():
            changed = False
            if not tech.is_available:
                tech.is_available = True
                changed = True
            if not tech.is_verified:
                tech.is_verified = True
                changed = True
            if changed:
                tech.save(update_fields=["is_available", "is_verified"])
                updated += 1
        self.stdout.write(self.style.SUCCESS(f"{updated} technicien(s) mis à jour (disponibles et vérifiés).")) 