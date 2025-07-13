from django.core.management.base import BaseCommand
from depannage.models import Conversation

class Command(BaseCommand):
    help = "Supprime tous les messages non système d'une conversation (par ID)."

    def add_arguments(self, parser):
        parser.add_argument('--conversation_id', type=int, required=True, help='ID de la conversation à nettoyer')

    def handle(self, *args, **options):
        conv_id = options['conversation_id']
        try:
            conv = Conversation.objects.get(id=conv_id)
        except Conversation.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"Conversation {conv_id} introuvable."))
            return
        deleted, _ = conv.messages.exclude(message_type="system").delete()
        self.stdout.write(self.style.SUCCESS(f"{deleted} messages supprimés de la conversation {conv_id}.")) 