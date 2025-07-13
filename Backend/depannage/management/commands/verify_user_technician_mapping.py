from django.core.management.base import BaseCommand
from users.models import User
from depannage.models import Technician, TechnicianSubscription

class Command(BaseCommand):
    help = "Vérifie le mapping User/Technician/Abonnement pour un email donné."

    def add_arguments(self, parser):
        parser.add_argument('email', type=str, help='Email de l’utilisateur à vérifier')

    def handle(self, *args, **options):
        email = options['email']
        try:
            user = User.objects.get(email=email)
            self.stdout.write(self.style.SUCCESS(f"Utilisateur trouvé : {user.username} (id={user.id})"))
            # Vérifier le profil Technician (depannage)
            try:
                tech = Technician.objects.get(user=user)
                self.stdout.write(self.style.SUCCESS(f"Profil Technician trouvé : id={tech.id}, spécialité={tech.specialty}"))
                # Lister les abonnements
                subs = TechnicianSubscription.objects.filter(technician=tech)
                if subs.exists():
                    for sub in subs:
                        self.stdout.write(f"  - Abonnement : id={sub.id}, actif={sub.is_active}, du {sub.start_date} au {sub.end_date}, payment_id={sub.payment_id}")
                else:
                    self.stdout.write(self.style.WARNING("Aucun abonnement trouvé pour ce technicien."))
            except Technician.DoesNotExist:
                self.stdout.write(self.style.ERROR("Aucun profil Technician (depannage) trouvé pour cet utilisateur."))
            # Vérifier le profil TechnicianProfile (users)
            if hasattr(user, 'technician_profile'):
                self.stdout.write(self.style.SUCCESS(f"Profil TechnicianProfile trouvé (users) : spécialité={user.technician_profile.specialty}"))
            else:
                self.stdout.write(self.style.WARNING("Aucun profil TechnicianProfile (users) trouvé pour cet utilisateur."))
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Aucun utilisateur trouvé avec l’email {email}")) 