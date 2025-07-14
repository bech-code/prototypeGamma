import os
import sys

# S'assurer que le script est lancé depuis le dossier Backend
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
import django
django.setup()

from users.models import User

print('--- CLIENTS ---')
clients = User.objects.filter(user_type='client')
for u in clients:
    print(u.username, sorted(u.get_group_permissions()))

print('--- TECHNICIENS ---')
techs = User.objects.filter(user_type='technician')
for u in techs:
    print(u.username, sorted(u.get_group_permissions())) 