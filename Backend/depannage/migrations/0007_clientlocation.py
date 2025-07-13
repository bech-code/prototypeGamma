from django.db import migrations, models
import django.db.models.deletion

class Migration(migrations.Migration):

    dependencies = [
        ('depannage', '0006_platformconfiguration'),
    ]

    operations = [
        migrations.CreateModel(
            name='ClientLocation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('latitude', models.FloatField(verbose_name='Latitude')),
                ('longitude', models.FloatField(verbose_name='Longitude')),
                ('client', models.OneToOneField(on_delete=django.db.models.deletion.CASCADE, related_name='location', to='depannage.client')),
            ],
            options={
                'verbose_name': 'Localisation de client',
                'verbose_name_plural': 'Localisations des clients',
            },
        ),
        migrations.AddIndex(
            model_name='clientlocation',
            index=models.Index(fields=['client'], name='depannage_client_idx'),
        ),
    ] 