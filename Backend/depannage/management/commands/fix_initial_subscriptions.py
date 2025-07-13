from django.core.management.base import BaseCommand
from depannage.models import Technician, TechnicianSubscription
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = "Crée un abonnement actif de 1 mois pour chaque technicien sans abonnement actif."

    def handle(self, *args, **options):
        now = timezone.now()
        count_created = 0
        for tech in Technician.objects.all():
            has_active = tech.subscriptions.filter(end_date__gt=now, is_active=True).exists()
            if not has_active:
                sub = TechnicianSubscription.objects.create(
                    technician=tech,
                    plan_name="Abonnement initial offert",
                    start_date=now,
                    end_date=now + timedelta(days=30),
                    is_active=True
                )
                count_created += 1
                self.stdout.write(self.style.SUCCESS(f"Abonnement créé pour {tech.user.username} (id={sub.id}) du {sub.start_date} au {sub.end_date}"))
        if count_created == 0:
            self.stdout.write(self.style.WARNING("Tous les techniciens ont déjà un abonnement actif."))
        else:
            self.stdout.write(self.style.SUCCESS(f"{count_created} abonnement(s) initial(aux) créé(s).")) 