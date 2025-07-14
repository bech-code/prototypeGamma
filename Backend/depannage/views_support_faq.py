from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from .models import SupportRequest, FAQ
from .serializers import SupportRequestSerializer, FAQSerializer

class SupportRequestViewSet(viewsets.ModelViewSet):
    """API pour soumettre et consulter les demandes de support."""
    queryset = SupportRequest.objects.all().order_by('-created_at')
    serializer_class = SupportRequestSerializer
    parser_classes = [MultiPartParser, FormParser]
    permission_classes = [permissions.AllowAny]

    def perform_create(self, serializer):
        user = self.request.user if self.request.user.is_authenticated else None
        serializer.save(user=user)

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated and not user.is_staff:
            # Un utilisateur connecté ne voit que ses propres demandes
            return SupportRequest.objects.filter(user=user).order_by('-created_at')
        elif user.is_staff:
            # Le staff voit tout
            return SupportRequest.objects.all().order_by('-created_at')
        # Les anonymes ne voient rien
        return SupportRequest.objects.none()

class FAQViewSet(viewsets.ReadOnlyModelViewSet):
    """API pour consulter la FAQ (lecture seule)."""
    queryset = FAQ.objects.filter(is_active=True).order_by('category', 'order')
    serializer_class = FAQSerializer
    permission_classes = [permissions.AllowAny] 