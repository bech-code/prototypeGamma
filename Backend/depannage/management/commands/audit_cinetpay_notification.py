from django.core.management.base import BaseCommand
from users.models import User
from depannage.models import CinetPayPayment
from django.db.models import Q
import json

class Command(BaseCommand):
    help = "Affiche la dernière notification CinetPay reçue pour un paiement (par transaction_id ou email utilisateur)."

    def add_arguments(self, parser):
        parser.add_argument('--transaction_id', type=str, help='ID de transaction CinetPay')
        parser.add_argument('--email', type=str, help='Email utilisateur (optionnel)')

    def handle(self, *args, **options):
        transaction_id = options.get('transaction_id')
        email = options.get('email')
        payment = None
        if transaction_id:
            payment = CinetPayPayment.objects.filter(transaction_id=transaction_id).order_by('-created_at').first()
        elif email:
            try:
                user = User.objects.get(email=email)
                payment = CinetPayPayment.objects.filter(user=user).order_by('-created_at').first()
            except User.DoesNotExist:
                self.stdout.write(self.style.ERROR(f"Aucun utilisateur trouvé avec l’email {email}"))
                return
        if not payment:
            self.stdout.write(self.style.ERROR("Aucun paiement trouvé pour les critères donnés."))
            return
        # Supposons que les notifications sont loguées dans un champ JSONField ou dans les logs (à adapter si besoin)
        if hasattr(payment, 'notification_data') and payment.notification_data:
            self.stdout.write(self.style.SUCCESS(f"Notification CinetPay pour transaction {payment.transaction_id} :"))
            self.stdout.write(json.dumps(payment.notification_data, indent=2, ensure_ascii=False))
        else:
            self.stdout.write(self.style.WARNING("Aucune notification CinetPay stockée pour ce paiement. Vérifiez les logs si besoin.")) 