from django.core.management.base import BaseCommand
from depannage.models import Technician, TechnicianSubscription
from django.utils import timezone

class Command(BaseCommand):
    help = "Affiche la liste détaillée des techniciens qui n'ont pas d'abonnement actif."

    def handle(self, *args, **options):
        now = timezone.now()
        unsubscribed = Technician.objects.exclude(
            subscriptions__end_date__gt=now,
            subscriptions__is_active=True
        )
        if not unsubscribed.exists():
            self.stdout.write(self.style.SUCCESS("Tous les techniciens ont un abonnement actif."))
            return
        self.stdout.write(self.style.WARNING(f"{unsubscribed.count()} technicien(s) sans abonnement actif :"))
        for tech in unsubscribed:
            user = tech.user
            name = user.get_full_name() or user.username
            email = user.email
            phone = tech.phone
            specialty = tech.get_specialty_display() if hasattr(tech, 'get_specialty_display') else tech.specialty
            created = tech.created_at.strftime('%Y-%m-%d') if hasattr(tech, 'created_at') else 'N/A'
            all_subs = tech.subscriptions.all().order_by('-end_date')
            nb_subs = all_subs.count()
            last_sub = all_subs.first()
            last_sub_end = last_sub.end_date.strftime('%Y-%m-%d') if last_sub else 'Jamais'
            self.stdout.write(f"- {name} | {email} | {phone} | {specialty} | Créé le: {created} | Abonnements: {nb_subs} | Dernier abonnement fin: {last_sub_end}") 