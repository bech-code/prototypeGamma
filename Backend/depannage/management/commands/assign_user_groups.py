from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group

User = get_user_model()

def add_user_to_group(user, group_name):
    try:
        group = Group.objects.get(name=group_name)
        user.groups.add(group)
        user.save()
        return True
    except Group.DoesNotExist:
        print(f"Groupe {group_name} non trouvé.")
        return False

class Command(BaseCommand):
    help = "Assigne automatiquement les utilisateurs à un groupe selon leur rôle (champ 'role' sur le modèle User)"

    def handle(self, *args, **options):
        count = {"Technicien": 0, "Client": 0, "Admin": 0, "Autre": 0}
        for user in User.objects.all():
            role = getattr(user, 'role', None)
            if role == "technicien":
                if add_user_to_group(user, "Technicien"):
                    count["Technicien"] += 1
            elif role == "client":
                if add_user_to_group(user, "Client"):
                    count["Client"] += 1
            elif role == "admin":
                if add_user_to_group(user, "Admin"):
                    count["Admin"] += 1
            else:
                count["Autre"] += 1
        self.stdout.write(self.style.SUCCESS(f"Utilisateurs assignés : {count}")) 