from django.core.management.base import BaseCommand
from django.core.mail import EmailMessage
from django.contrib.auth import get_user_model
from depannage.models import Review
import openpyxl
from io import BytesIO

class Command(BaseCommand):
    help = "Génère un rapport statistique et l'envoie par email à tous les techniciens et admins."

    def handle(self, *args, **options):
        User = get_user_model()
        recipients = list(User.objects.filter(is_active=True, is_staff=True).values_list('email', flat=True))
        # Ajouter les techniciens si besoin (exemple)
        # recipients += list(User.objects.filter(groups__name='Technicien').values_list('email', flat=True))
        recipients = list(set(r for r in recipients if r))
        if not recipients:
            self.stdout.write(self.style.WARNING("Aucun destinataire trouvé."))
            return

        # Générer le rapport Excel
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Avis reçus"
        ws.append(["Technicien", "Client", "Note", "Commentaire", "Date"])
        for review in Review.objects.select_related('technician', 'client').all():
            ws.append([
                getattr(review.technician.user, 'email', ''),
                getattr(review.client.user, 'email', ''),
                review.rating,
                review.comment or '',
                review.created_at.strftime('%Y-%m-%d %H:%M') if review.created_at else ''
            ])
        # Sauver en mémoire
        output = BytesIO()
        wb.save(output)
        output.seek(0)

        # Préparer l'email
        subject = "Rapport statistique automatique"
        body = "Veuillez trouver ci-joint le rapport statistique des avis reçus."
        email = EmailMessage(subject, body, to=recipients)
        email.attach('rapport_avis.xlsx', output.read(), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        email.send()
        self.stdout.write(self.style.SUCCESS(f"Rapport envoyé à {len(recipients)} destinataires.")) 