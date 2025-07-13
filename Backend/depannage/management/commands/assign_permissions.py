from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission
from django.contrib.contenttypes.models import ContentType

TECHNICIEN_PERMS = [
    ("depannage", "repairrequest", "view_repairrequest"),
    ("depannage", "repairrequest", "change_repairrequest"),
    ("depannage", "technician", "view_technician"),
    ("depannage", "technician", "change_technician"),
    ("depannage", "technicianlocation", "add_technicianlocation"),
    ("depannage", "technicianlocation", "change_technicianlocation"),
    ("depannage", "technicianlocation", "view_technicianlocation"),
    ("depannage", "message", "add_message"),
    ("depannage", "message", "view_message"),
    ("depannage", "notification", "add_notification"),
    ("depannage", "notification", "view_notification"),
    ("depannage", "messageattachment", "add_messageattachment"),
    ("depannage", "messageattachment", "view_messageattachment"),
    ("depannage", "conversation", "add_conversation"),
    ("depannage", "conversation", "view_conversation"),
    ("depannage", "payment", "view_payment"),
    ("depannage", "reward", "view_reward"),
    ("depannage", "rewardclaim", "add_rewardclaim"),
    ("depannage", "loyaltyprogram", "view_loyaltyprogram"),
    ("users", "user", "change_user"),
]

CLIENT_PERMS = [
    ("depannage", "repairrequest", "add_repairrequest"),
    ("depannage", "repairrequest", "view_repairrequest"),
    ("depannage", "repairrequest", "change_repairrequest"),
    ("depannage", "repairrequest", "delete_repairrequest"),
    ("depannage", "client", "view_client"),
    ("depannage", "client", "change_client"),
    # ("depannage", "payment", "add_payment"),  # Désactivé côté client
    ("depannage", "payment", "view_payment"),
    ("depannage", "notification", "add_notification"),
    ("depannage", "notification", "view_notification"),
    ("depannage", "message", "add_message"),
    ("depannage", "message", "view_message"),
    ("depannage", "messageattachment", "add_messageattachment"),
    ("depannage", "messageattachment", "view_messageattachment"),
    ("depannage", "conversation", "add_conversation"),
    ("depannage", "conversation", "view_conversation"),
    ("depannage", "review", "add_review"),
    ("depannage", "review", "view_review"),
    ("depannage", "reward", "view_reward"),
    ("depannage", "rewardclaim", "add_rewardclaim"),
    ("depannage", "loyaltyprogram", "view_loyaltyprogram"),
    ("users", "user", "change_user"),
]

class Command(BaseCommand):
    help = "Assigne les permissions professionnelles et sécurisées aux groupes Technicien et Client."

    def handle(self, *args, **options):
        # Technicien
        tech_group, _ = Group.objects.get_or_create(name="Technicien")
        tech_group.permissions.clear()
        for app, model, codename in TECHNICIEN_PERMS:
            try:
                ct = ContentType.objects.get(app_label=app, model=model)
                perm = Permission.objects.get(content_type=ct, codename=codename)
                tech_group.permissions.add(perm)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Permission manquante pour Technicien: {app}.{model}.{codename} ({e})"))
        self.stdout.write(self.style.SUCCESS("Permissions mises à jour pour le groupe Technicien."))

        # Client
        client_group, _ = Group.objects.get_or_create(name="Client")
        client_group.permissions.clear()
        for app, model, codename in CLIENT_PERMS:
            try:
                ct = ContentType.objects.get(app_label=app, model=model)
                perm = Permission.objects.get(content_type=ct, codename=codename)
                client_group.permissions.add(perm)
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"Permission manquante pour Client: {app}.{model}.{codename} ({e})"))
        self.stdout.write(self.style.SUCCESS("Permissions mises à jour pour le groupe Client.")) 