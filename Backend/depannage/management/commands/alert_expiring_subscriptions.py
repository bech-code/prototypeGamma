from django.core.management.base import BaseCommand
from django.utils import timezone
from depannage.models import TechnicianSubscription, Notification
from datetime import timedelta

class Command(BaseCommand):
    help = "Alerte les techniciens dont l'abonnement expire dans 3 jours"

    def handle(self, *args, **options):
        target_date = timezone.now() + timedelta(days=3)
        expiring_subs = TechnicianSubscription.objects.filter(
            end_date__date=target_date.date(),
            is_active=True
        )
        count = 0
        for sub in expiring_subs:
            tech = sub.technician
            Notification.objects.create(
                recipient=tech.user,
                title="Votre abonnement expire bientôt",
                message=f"Votre abonnement au plan {sub.plan_name} expire le {sub.end_date.strftime('%d/%m/%Y')}. Pensez à le renouveler pour continuer à recevoir des demandes.",
                type="subscription_expiry_alert"
            )
            count += 1
        self.stdout.write(self.style.SUCCESS(f"{count} notifications envoyées.")) 