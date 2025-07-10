import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from users.models import User
from depannage.models import Client

def sync_all_clients_phone():
    count_created = 0
    count_updated = 0
    for user in User.objects.filter(user_type='client'):
        # Récupérer ou créer le profil Client
        client, created = Client.objects.get_or_create(
            user=user,
            defaults={
                'address': getattr(user, 'address', '') or '',
                'phone': getattr(user, 'phone_number', '') or '',
                'is_active': True,
            }
        )
        if created:
            count_created += 1
            print(f"Profil Client créé pour {user.email}")
        # Synchroniser le champ phone
        phone_user = getattr(user, 'phone_number', '') or ''
        if phone_user and client.phone != phone_user:
            client.phone = phone_user
            client.save()
            count_updated += 1
            print(f"Numéro synchronisé pour {user.email}: {phone_user}")
    print(f"Synchronisation terminée. Profils créés: {count_created}, numéros mis à jour: {count_updated}")

if __name__ == "__main__":
    sync_all_clients_phone() 