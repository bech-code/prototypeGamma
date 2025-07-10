import os
import django
import csv
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from depannage.models import Review

with open('export_reviews.csv', 'w', newline='', encoding='utf-8') as csvfile:
    writer = csv.writer(csvfile)
    writer.writerow([
        'id', 'request_id', 'technician_id', 'client_name', 'technician_name', 'rating', 'comment', 'created_at'
    ])
    for review in Review.objects.select_related('client__user', 'technician__user'):
        writer.writerow([
            review.id,
            review.request.id if review.request else '',
            review.technician.id if review.technician else '',
            review.client.user.get_full_name() if review.client and review.client.user else '',
            review.technician.user.get_full_name() if review.technician and review.technician.user else '',
            review.rating,
            review.comment,
            review.created_at.strftime('%Y-%m-%d %H:%M:%S') if review.created_at else ''
        ])
print('Export terminé : export_reviews.csv') 