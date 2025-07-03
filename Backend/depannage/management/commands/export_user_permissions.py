from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
import csv
import pandas as pd

class Command(BaseCommand):
    help = "Exporte la liste des utilisateurs, leurs groupes et leurs permissions effectives en CSV et Excel."

    def handle(self, *args, **options):
        User = get_user_model()
        users = User.objects.all()
        data = []
        for user in users:
            groups = ', '.join([g.name for g in user.groups.all()])
            perms = list(user.get_all_permissions())
            if perms:
                for perm in perms:
                    data.append({
                        'username': user.username,
                        'groups': groups,
                        'permission': perm
                    })
            else:
                data.append({
                    'username': user.username,
                    'groups': groups,
                    'permission': ''
                })
        # Export CSV
        with open('user_permissions_export.csv', 'w', newline='', encoding='utf-8') as csvfile:
            fieldnames = ['username', 'groups', 'permission']
            writer = csv.DictWriter(csvfile, fieldnames=fieldnames)
            writer.writeheader()
            for row in data:
                writer.writerow(row)
        # Export Excel
        df = pd.DataFrame(data)
        df.to_excel('user_permissions_export.xlsx', index=False)
        self.stdout.write(self.style.SUCCESS("Export terminé dans user_permissions_export.csv et user_permissions_export.xlsx")) 