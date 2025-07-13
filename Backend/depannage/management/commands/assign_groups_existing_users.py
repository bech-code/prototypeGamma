from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

class Command(BaseCommand):
    help = "Assigne le groupe approprié (Technicien ou Client) à chaque utilisateur existant selon son user_type."

    def handle(self, *args, **options):
        User = get_user_model()
        count_tech = 0
        count_client = 0
        for user in User.objects.all():
            if user.user_type == 'technician':
                group, _ = Group.objects.get_or_create(name='Technicien')
                if not user.groups.filter(name='Technicien').exists():
                    user.groups.add(group)
                    count_tech += 1
            elif user.user_type == 'client':
                group, _ = Group.objects.get_or_create(name='Client')
                if not user.groups.filter(name='Client').exists():
                    user.groups.add(group)
                    count_client += 1
        self.stdout.write(self.style.SUCCESS(f"{count_tech} technicien(s) et {count_client} client(s) mis à jour.")) 