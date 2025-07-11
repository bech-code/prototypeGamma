from django.core.management.base import BaseCommand
from depannage.models import Conversation, RepairRequest

class Command(BaseCommand):
    help = "Corrige les participants de toutes les conversations pour qu'elles ne contiennent que le client et le technicien assigné."

    def handle(self, *args, **options):
        count_fixed = 0
        for conv in Conversation.objects.all():
            req = conv.request
            expected_participants = set()
            if req.client and req.client.user:
                expected_participants.add(req.client.user)
            if req.technician and req.technician.user:
                expected_participants.add(req.technician.user)
            # Retirer les participants inattendus
            to_remove = [u for u in conv.participants.all() if u not in expected_participants]
            for u in to_remove:
                conv.participants.remove(u)
            # Ajouter les participants manquants
            for u in expected_participants:
                conv.participants.add(u)
            if to_remove or len(expected_participants - set(conv.participants.all())) > 0:
                count_fixed += 1
        self.stdout.write(self.style.SUCCESS(f"Conversations corrigées: {count_fixed}")) 