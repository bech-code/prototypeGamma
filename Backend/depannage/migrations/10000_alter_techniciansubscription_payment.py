# Generated by Django 5.2.3 on 2025-07-11 03:30

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('depannage', '9999_add_unique_constraint_subscription'),
    ]

    operations = [
        migrations.AlterField(
            model_name='techniciansubscription',
            name='payment',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='subscription_payments', to='depannage.cinetpaypayment'),
        ),
    ]
