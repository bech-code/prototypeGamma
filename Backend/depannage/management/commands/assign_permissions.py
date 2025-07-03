from django.core.management.base import BaseCommand
from django.contrib.auth.models import Group, Permission

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
    ("depannage", "review", "add_review"),
    ("depannage", "review", "view_review"),
    ("depannage", "payment", "add_payment"),
    ("depannage", "payment", "view_payment"),
    ("depannage", "message", "add_message"),
    ("depannage", "message", "view_message"),
    ("depannage", "notification", "add_notification"),
    ("depannage", "notification", "view_notification"),
    ("depannage", "messageattachment", "add_messageattachment"),
    ("depannage", "messageattachment", "view_messageattachment"),
    ("depannage", "conversation", "add_conversation"),
    ("depannage", "conversation", "view_conversation"),
    ("depannage", "client", "view_client"),
    ("depannage", "client", "change_client"),
    ("depannage", "reward", "view_reward"),
    ("depannage", "rewardclaim", "add_rewardclaim"),
    ("depannage", "loyaltyprogram", "view_loyaltyprogram"),
]

def get_permissions_by_codename(perm_tuples):
    perms = []
    for app_label, model, codename in perm_tuples:
        try:
            perm = Permission.objects.get(
                content_type__app_label=app_label,
                content_type__model=model,
                codename=codename
            )
        except Permission.DoesNotExist:
            print(f"Permission non trouvée : {app_label} | {model} | {codename}")
            continue
        perms.append(perm)
    return perms

class Command(BaseCommand):
    help = "Attribue automatiquement les permissions aux groupes Technicien, Client et Admin"

    def handle(self, *args, **options):
        technicien_group, _ = Group.objects.get_or_create(name="Technicien")
        client_group, _ = Group.objects.get_or_create(name="Client")
        admin_group, _ = Group.objects.get_or_create(name="Admin")

        technicien_perms = get_permissions_by_codename(TECHNICIEN_PERMS)
        client_perms = get_permissions_by_codename(CLIENT_PERMS)
        all_perms = Permission.objects.all()

        technicien_group.permissions.set(technicien_perms)
        client_group.permissions.set(client_perms)
        admin_group.permissions.set(all_perms)

        self.stdout.write(self.style.SUCCESS("Permissions attribuées avec succès aux groupes Technicien, Client et Admin.")) 