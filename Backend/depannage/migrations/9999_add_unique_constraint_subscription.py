from django.db import migrations, models

class Migration(migrations.Migration):
    dependencies = [
        ('depannage', '0016_subscriptionpaymentrequest'),
    ]
    operations = [
        migrations.AlterUniqueTogether(
            name='techniciansubscription',
            unique_together={('technician', 'start_date', 'end_date')},
        ),
    ] 