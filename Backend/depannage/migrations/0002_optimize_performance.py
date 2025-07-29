
# Migration pour optimiser la base de données
from django.db import migrations

class Migration(migrations.Migration):
    dependencies = [
        ('depannage', '0001_initial'),
    ]
    
    operations = [
        # Index pour les performances
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_technician_location ON depannage_technician(current_latitude, current_longitude);",
            "DROP INDEX IF EXISTS idx_technician_location;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_repair_request_status ON depannage_repairrequest(status, created_at);",
            "DROP INDEX IF EXISTS idx_repair_request_status;"
        ),
        migrations.RunSQL(
            "CREATE INDEX IF NOT EXISTS idx_review_rating ON depannage_review(rating, created_at);",
            "DROP INDEX IF EXISTS idx_review_rating;"
        ),
    ]
