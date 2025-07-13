from django.core.management.base import BaseCommand
from users.models import User
from depannage.models import Technician, TechnicianSubscription, CinetPayPayment
from django.utils import timezone
from datetime import timedelta

class Command(BaseCommand):
    help = "Force la création d’un abonnement test pour un technicien (email), lié à son dernier paiement CinetPay validé."

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email du technicien')

    def handle(self, *args, **options):
        email = options['email']
        try:
            user = User.objects.get(email=email)
            tech = Technician.objects.get(user=user)
            payment = CinetPayPayment.objects.filter(user=user, status='success').order_by('-created_at').first()
            if not payment:
                self.stdout.write(self.style.ERROR("Aucun paiement CinetPay validé trouvé pour cet utilisateur."))
                return
            now = timezone.now()
            sub = TechnicianSubscription.objects.create(
                technician=tech,
                plan_name="Test Abonnement Forcé",
                start_date=now,
                end_date=now + timedelta(days=30),
                payment=payment,
                is_active=True
            )
            self.stdout.write(self.style.SUCCESS(f"Abonnement créé : id={sub.id}, du {sub.start_date} au {sub.end_date}, payment_id={payment.id}"))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Aucun utilisateur trouvé avec l’email {email}"))
        except Technician.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Aucun technicien trouvé pour cet utilisateur.")) 