from django.core.management.base import BaseCommand
from users.models import User
from depannage.models import CinetPayPayment

class Command(BaseCommand):
    help = "Liste tous les paiements CinetPay pour un utilisateur donné (email)."

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email de l’utilisateur à vérifier')

    def handle(self, *args, **options):
        email = options['email']
        try:
            user = User.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f"Utilisateur trouvé : {user.username} (id={user.id})"))
            payments = CinetPayPayment.objects.filter(user=user).order_by('-created_at')
            if payments.exists():
                for p in payments:
                    self.stdout.write(f"  - Paiement : id={p.id}, transaction_id={p.transaction_id}, statut={p.status}, montant={p.amount}, créé le {p.created_at}")
            else:
                self.stdout.write(self.style.WARNING("Aucun paiement CinetPay trouvé pour cet utilisateur."))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Aucun utilisateur trouvé avec l’email {email}")) 