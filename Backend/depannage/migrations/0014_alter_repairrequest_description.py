# Generated by Django 5.2.3 on 2025-07-09 01:59

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('depannage', '0013_alter_technician_user'),
    ]

    operations = [
        migrations.AlterField(
            model_name='repairrequest',
            name='description',
            field=models.TextField(blank=True, null=True, verbose_name='Description détaillée'),
        ),
    ]
