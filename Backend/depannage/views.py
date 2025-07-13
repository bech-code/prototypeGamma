from django.shortcuts import render
from rest_framework import viewsets, permissions
import rest_framework.status as rf_status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.exceptions import PermissionDenied
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Count, F, Avg, Sum
from django.core.paginator import Paginator
from .utils import calculate_distance
import requests
import json
import logging
from decimal import Decimal
import math
from datetime import timedelta
# Temporairement commenté pour éviter l'erreur GDAL
# from django.contrib.gis.geos import Point
# from django.contrib.gis.db.models.functions import Distance
from django.core.mail import send_mail
# Ajout import Twilio
try:
    from twilio.rest import Client as TwilioClient
except ImportError:
    TwilioClient = None
import os
from django.contrib.auth.models import Permission, Group
from .serializers import (
    ClientSerializer,
    TechnicianSerializer,
    RepairRequestSerializer,
    RequestDocumentSerializer,
    ReviewSerializer,
    PaymentSerializer,
    ConversationSerializer,
    MessageSerializer,
    MessageAttachmentSerializer,
    NotificationSerializer,
    TechnicianLocationSerializer,
    SystemConfigurationSerializer,
    CinetPayPaymentSerializer,
    CinetPayInitiationSerializer,
    CinetPayNotificationSerializer,
    RepairRequestCreateSerializer,
    TechnicianNearbySerializer,
    PermissionSerializer,
    GroupSerializer,
    PlatformConfigurationSerializer,
    ClientLocationSerializer,
    ReportSerializer,
    AdminNotificationSerializer,
    AuditLogSerializer,
    SubscriptionPaymentRequestSerializer,
    TechnicianSubscriptionSerializer,
    ChatConversationSerializer,
    ChatMessageSerializer,
    ChatMessageAttachmentSerializer,
)
from .models import (
    Client, Technician, RepairRequest, RequestDocument, Review, Payment, Conversation, Message, Notification, MessageAttachment, TechnicianLocation, SystemConfiguration, CinetPayPayment, PlatformConfiguration, ClientLocation,
    Report, AdminNotification, SubscriptionPaymentRequest, TechnicianSubscription,
    ChatConversation, ChatMessage, ChatMessageAttachment,
)
from rest_framework.views import APIView
from users.models import AuditLog
from django.utils.timezone import now
from rest_framework.pagination import PageNumberPagination
from django.views.decorators.csrf import csrf_exempt
from django.utils.decorators import method_decorator
from django.utils.decorators import classonlymethod
from .cinetpay import init_cinetpay_payment
from django.http import HttpResponse
import csv
import openpyxl

logger = logging.getLogger(__name__)

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

def get_technician_profile(user):
    """
    Récupère le profil technicien d'un utilisateur en essayant les deux relations possibles.
    Retourne le premier profil trouvé ou None si aucun n'existe.
    """
    import logging
    logger = logging.getLogger(__name__)
    # Essayer d'abord technician_depannage (relation dans l'app depannage)
    technician = getattr(user, 'technician_depannage', None)
    if technician:
        logger.info(f"[DEBUG] get_technician_profile: technician_depannage trouvé: {technician} (type: {type(technician)})")
        return technician
    # Essayer ensuite technician_profile (relation dans l'app users)
    technician = getattr(user, 'technician_profile', None)
    if technician:
        logger.info(f"[DEBUG] get_technician_profile: technician_profile trouvé: {technician} (type: {type(technician)})")
        return technician
    logger.info(f"[DEBUG] get_technician_profile: Aucun profil technicien trouvé pour user {user}")
    return None

# ============================================================================
# VUES DE TEST PUBLIQUES
# ============================================================================


@api_view(["POST"])
@permission_classes([IsAuthenticated])
def find_nearest_technician(request):
    """Find the nearest available technician based on user's location."""
    try:
        user_latitude = float(request.data.get("latitude"))
        user_longitude = float(request.data.get("longitude"))
    except (TypeError, ValueError):
        return Response(
            {"error": "Latitude et longitude invalides"},
            status=400,
        )

    # Récupérer tous les techniciens disponibles
    available_technicians = Technician.objects.filter(is_available=True)

    if not available_technicians:
        return Response(
            {"error": "Aucun technicien disponible pour le moment"},
            status=404,
        )

    # Calculer la distance pour chaque technicien
    technicians_with_distance = []
    for technician in available_technicians:
        distance = calculate_distance(
            user_latitude, user_longitude, technician.current_latitude, technician.current_longitude
        )
        technicians_with_distance.append((technician, distance))

    # Trier par distance et prendre le plus proche
    nearest_technician, distance = min(technicians_with_distance, key=lambda x: x[1])

    # Sérialiser le technicien et ajouter la distance
    serializer = TechnicianSerializer(nearest_technician)
    response_data = serializer.data
    response_data["distance"] = round(distance, 2)

    return Response(response_data)


class PublicTestViewSet(viewsets.ViewSet):
    """ViewSet pour les tests publics de l'API."""

    permission_classes = [AllowAny]

    @action(detail=False, methods=["get"])
    def health_check(self, request):
        """Vérification de santé de l'API."""
        return Response(
            {
                "status": "healthy",
                "message": "API DepanneTeliman fonctionne correctement",
                "timestamp": timezone.now().isoformat(),
                "version": "1.0.0",
            }
        )

    @action(detail=False, methods=["get"])
    def api_info(self, request):
        """Informations sur l'API."""
        return Response(
            {
                "name": "DepanneTeliman API",
                "description": "API pour la gestion des services de dépannage",
                "endpoints": {
                    "auth": "/users/login/",
                    "register": "/users/register/",
                    "repair_requests": "/depannage/api/repair-requests/",
                    "technicians": "/depannage/api/technicians/",
                    "clients": "/depannage/api/clients/",
                    "admin": "/admin/",
                },
                "authentication": "JWT (Bearer Token)",
                "documentation": "Consultez les endpoints pour plus d'informations",
            }
        )


# ============================================================================
# VIEWSETS EXISTANTES
# ============================================================================


class CsrfExemptMixin(object):
    @classonlymethod
    def as_view(cls, *args, **kwargs):
        view = super().as_view(*args, **kwargs)
        return csrf_exempt(view)

class RepairRequestViewSet(CsrfExemptMixin, viewsets.ModelViewSet):
    """ViewSet pour gérer les demandes de réparation."""

    serializer_class = RepairRequestSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        """Retourne le serializer approprié selon l'action."""
        if self.action == "create":
            return RepairRequestCreateSerializer
        return RepairRequestSerializer

    def get_queryset(self):
        """Filtre les demandes selon le type d'utilisateur."""
        user = self.request.user

        if user.user_type == "admin":
            # Admin voit toutes les demandes
            return RepairRequest.objects.all().order_by("-created_at")
        elif user.user_type == "technician":
            # Technicien voit ses demandes assignées et les demandes de sa spécialité
            technician = get_object_or_404(Technician, user=user)
            return RepairRequest.objects.filter(
                Q(technician=technician)
                | Q(specialty_needed=technician.specialty, status="pending")
            ).order_by("-created_at")
        else:
            # Client voit ses propres demandes
            client = get_object_or_404(Client, user=user)
            return RepairRequest.objects.filter(client=client).order_by("-created_at")

    def perform_create(self, serializer):
        technician = None  # Initialisation systématique pour éviter UnboundLocalError
        user = self.request.user

        lat = serializer.validated_data.get('latitude')
        lng = serializer.validated_data.get('longitude')
        if lat is None or lng is None:
            from rest_framework.exceptions import ValidationError
            raise ValidationError({
                'latitude': 'La latitude est obligatoire pour créer une demande.',
                'longitude': 'La longitude est obligatoire pour créer une demande.'
            })

        client, created = Client.objects.get_or_create(
            user=user,
            defaults={
                "address": self.request.data.get("address", "Adresse non spécifiée"),
                "phone": user.phone_number if hasattr(user, "phone_number") else "",
                "is_active": True,
            },
        )

        data = serializer.validated_data.copy()
        if "service_type" in data:
            data["specialty_needed"] = data.pop("service_type")
        if "title" not in data or not data["title"]:
            service_name = data.get("specialty_needed", "Service")
            data["title"] = f"Demande de {service_name}"

        # Nouveau : gestion du statut draft
        request_status = data.get('status', RepairRequest.Status.PENDING)
        repair_request = serializer.save(client=client, **data)

        if request_status == RepairRequest.Status.DRAFT:
            # Ne pas créer de conversation ni envoyer de notification
            return

        # Création de la conversation et notification comme avant
        conversation = Conversation.objects.create(
            request=repair_request, is_active=True
        )
        conversation.participants.add(user)

        from users.models import User
        admin_users = User.objects.filter(is_staff=True, is_active=True)
        for admin in admin_users:
            Notification.objects.create(
                recipient=admin,
                title="Nouvelle demande de réparation",
                message=f"Nouvelle demande #{repair_request.id} - {repair_request.specialty_needed}",
                type="new_request",
            )

        # Envoyer notification aux techniciens de la spécialité (seulement les 10 plus proches)
        lat = repair_request.latitude
        lng = repair_request.longitude
        # 1. Filtrer les techniciens de la spécialité, disponibles, vérifiés, géolocalisés
        technicians = Technician.objects.filter(
            specialty=repair_request.specialty_needed,
            is_available=True,
            is_verified=True,
            current_latitude__isnull=False,
            current_longitude__isnull=False,
        )
        # 2. Filtrer sur abonnement actif
        technicians = [t for t in technicians if t.has_active_subscription]
        # 3. Exclure les techniciens ayant une demande en cours (assigned ou in_progress)
        busy_tech_ids = set(
            RepairRequest.objects.filter(
                status__in=[RepairRequest.Status.ASSIGNED, RepairRequest.Status.IN_PROGRESS]
            ).values_list('technician_id', flat=True)
        )
        technicians = [t for t in technicians if t.id not in busy_tech_ids]
        # 4. Filtrer sur note minimale (par défaut 3.5, ou configurable)
        MIN_RATING = 3.5
        technicians = [t for t in technicians if t.average_rating >= MIN_RATING]
        # 5. Filtrer sur rayon d'intervention
        tech_with_distance = []
        for tech in technicians:
            distance = calculate_distance(lat, lng, tech.current_latitude, tech.current_longitude)
            if distance <= tech.service_radius_km:
                tech_with_distance.append((tech, distance))
        # 6. Trier par distance et ne garder que les 10 plus proches
        tech_with_distance.sort(key=lambda x: x[1])
        closest_techs = [t[0] for t in tech_with_distance[:10]]
        # DIAGNOSTIC DEBUG
        print("[DEBUG] Techniciens candidats pour notification :")
        for tech, dist in tech_with_distance:
            print(f"  - TechID: {tech.id} | UserID: {tech.user.id} | Username: {tech.user.username} | Spécialité: {tech.specialty} | Distance: {dist:.2f} km | Note: {tech.average_rating}")
        for technician in closest_techs:
            Notification.objects.create(
                recipient=technician.user,
                title="Nouvelle demande dans votre spécialité",
                message=f"Demande #{repair_request.id} - {repair_request.title}",
                type="new_request_technician",
                request=repair_request,
            )

        # Créer un message automatique
        Message.objects.create(
            conversation=conversation,
            sender=user,
            content=f"Demande créée le {timezone.now().strftime('%d/%m/%Y à %H:%M')}",
            message_type="system",
        )

        logger.info(f"Nouvelle demande créée: {repair_request.id} par {user.username}")

        # Notifier les autres techniciens de la spécialité (parmi les plus proches)
        lat = repair_request.latitude
        lng = repair_request.longitude
        technicians = Technician.objects.filter(
            specialty=repair_request.specialty_needed,
            is_available=True,
            is_verified=True,
            current_latitude__isnull=False,
            current_longitude__isnull=False,
        )
        # Exclure le technicien courant seulement si la variable existe
        if 'technician' in locals() and technician is not None:
            technicians = technicians.exclude(id=technician.id)
        tech_with_distance = []
        for tech in technicians:
            distance = calculate_distance(lat, lng, tech.current_latitude, tech.current_longitude)
            tech_with_distance.append((tech, distance))
        tech_with_distance.sort(key=lambda x: x[1])
        closest_techs = [t[0] for t in tech_with_distance[:10]]
        for other_tech in closest_techs:
            Notification.objects.create(
                recipient=other_tech.user,
                title="Demande déjà acceptée",
                message=f"La demande #{repair_request.id} a été acceptée par {technician.user.get_full_name() if 'technician' in locals() and technician is not None else 'un technicien'}.",
                type="request_taken",
                request=repair_request,
            )

        # Notifier les admins
        from users.models import User
        admin_users = User.objects.filter(is_staff=True, is_active=True)
        for admin in admin_users:
            tech_name = technician.user.get_full_name() if 'technician' in locals() and technician is not None else "un technicien"
            Notification.objects.create(
                recipient=admin,
                title="Demande acceptée par un technicien",
                message=f"La demande #{repair_request.id} a été acceptée par {tech_name}",
                type="request_accepted",
                request=repair_request,
            )

        # Retourne la réponse complète avec l'ID
        response_serializer = RepairRequestSerializer(repair_request, context={'request': self.request})
        self.response = Response(response_serializer.data, status=201)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def assign_technician(self, request, pk=None):
        """Assigne un technicien à une demande ou refuse la demande (Admin ou Technicien)."""
        repair_request = self.get_object()
        user = request.user

        action = request.data.get("action", "accept")  # Par défaut: accepter
        logger.info(f"Tentative d'action - Demande: {repair_request.id}, Utilisateur: {user.id} ({user.user_type}), Action: {action}")

        technician_id = request.data.get("technician_id")
        if not technician_id:
            logger.error(f"ID du technicien manquant pour la demande {repair_request.id}")
            return Response(
                {"error": "ID du technicien requis"}, status=400
            )

        logger.info(f"Technician ID reçu: {technician_id}")

        try:
            technician = Technician.objects.get(id=technician_id)
            logger.info(f"Technicien trouvé: {technician.id}, User: {technician.user.id}, Spécialité: {technician.specialty}, Disponible: {technician.is_available}")

            # Cas admin : assignation classique
            if user.user_type == "admin":
                logger.info("Action par admin")
                # Vérifier que le technicien est disponible et de la bonne spécialité
                if not technician.is_available:
                    logger.warning(f"Technicien {technician.id} non disponible")
                    return Response(
                        {"error": "Ce technicien n'est pas disponible"},
                        status=400,
                    )
                if technician.specialty != repair_request.specialty_needed:
                    logger.warning(f"Spécialité non correspondante: {technician.specialty} vs {repair_request.specialty_needed}")
                    return Response(
                        {
                            "error": "Ce technicien ne correspond pas à la spécialité requise"
                        },
                        status=400,
                    )
            # Cas technicien : auto-assignation ou refus
            elif user.user_type == "technician" and technician.user == user:
                logger.info(f"Action par technicien: {action}")
                if repair_request.status != "pending":
                    logger.warning(f"Demande non en attente: {repair_request.status}")
                    return Response(
                        {"error": "Seules les demandes en attente peuvent être traitées."},
                        status=400,
                    )
                if technician.specialty != repair_request.specialty_needed:
                    logger.warning(f"Spécialité technicien non correspondante: {technician.specialty} vs {repair_request.specialty_needed}")
                    return Response(
                        {"error": "Vous ne correspondez pas à la spécialité requise."},
                        status=400,
                    )
                if not technician.is_available:
                    logger.warning(f"Technicien {technician.id} non disponible")
                    return Response(
                        {"error": "Vous n'êtes pas disponible."},
                        status=400,
                    )
            else:
                logger.error(f"Non autorisé - User type: {user.user_type}, Technician user: {technician.user.id if technician else 'None'}")
                return Response(
                    {"error": "Non autorisé."}, status=403
                )

            # Vérifier que le technicien n'a pas déjà une demande en cours
            from depannage.models import RepairRequest
            busy_request = RepairRequest.objects.filter(
                technician=technician,
                status__in=[RepairRequest.Status.ASSIGNED, RepairRequest.Status.IN_PROGRESS]
            ).exclude(id=repair_request.id).first()
            if busy_request:
                return Response(
                    {"error": "Vous avez déjà une demande en cours. Terminez-la avant d'en accepter une nouvelle."},
                    status=400,
                )
            # Accepter la demande (logique existante)
            repair_request.technician = technician
            repair_request.status = "assigned"
            repair_request.assigned_at = timezone.now()
            repair_request.save()
            
            logger.info(f"Technicien {technician.user.get_full_name()} assigné avec succès à la demande {repair_request.id}")

            # Marquer comme lues les notifications pour les autres techniciens
            Notification.objects.filter(
                request=repair_request,
                type="new_request_technician"
            ).exclude(recipient=technician.user).delete()

            # Ajouter le technicien à la conversation
            conversation = repair_request.conversation
            conversation.participants.add(technician.user)

            # Envoyer notification au technicien
            Notification.objects.create(
                recipient=technician.user,
                title="Nouvelle demande assignée",
                message=f"Vous avez été assigné à la demande #{repair_request.id}",
                type="request_assigned",
            )

            # Envoyer notification au client
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Technicien assigné",
                message=f"Un technicien a été assigné à votre demande #{repair_request.id}",
                type="technician_assigned",
            )

            # Créer un message automatique
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=f"Technicien {technician.user.get_full_name()} assigné à cette demande",
                message_type="system",
            )

            # Notifier les autres techniciens de la spécialité (parmi les plus proches)
            lat = repair_request.latitude
            lng = repair_request.longitude
            technicians = Technician.objects.filter(
                specialty=repair_request.specialty_needed,
                is_available=True,
                is_verified=True,
                current_latitude__isnull=False,
                current_longitude__isnull=False,
            )
            # Exclure le technicien courant seulement si la variable existe
            if 'technician' in locals() and technician is not None:
                technicians = technicians.exclude(id=technician.id)
            tech_with_distance = []
            for tech in technicians:
                distance = calculate_distance(lat, lng, tech.current_latitude, tech.current_longitude)
                tech_with_distance.append((tech, distance))
            tech_with_distance.sort(key=lambda x: x[1])
            closest_techs = [t[0] for t in tech_with_distance[:10]]
            for other_tech in closest_techs:
                Notification.objects.create(
                    recipient=other_tech.user,
                    title="Demande déjà acceptée",
                    message=f"La demande #{repair_request.id} a été acceptée par {technician.user.get_full_name() if 'technician' in locals() and technician is not None else 'un technicien'}.",
                    type="request_taken",
                    request=repair_request,
                )

            # Notifier les admins
            from users.models import User
            admin_users = User.objects.filter(is_staff=True, is_active=True)
            for admin in admin_users:
                tech_name = technician.user.get_full_name() if 'technician' in locals() and technician is not None else "un technicien"
                Notification.objects.create(
                    recipient=admin,
                    title="Demande acceptée par un technicien",
                    message=f"La demande #{repair_request.id} a été acceptée par {tech_name}",
                    type="request_accepted",
                    request=repair_request,
                )

            # Retirer l'ancien technicien des participants si différent du nouveau
            old_technician = None
            if repair_request.conversation.participants.count() > 1:
                for participant in repair_request.conversation.participants.all():
                    if hasattr(participant, 'technician_depannage') and participant != technician.user:
                        old_technician = participant
                        break
            if old_technician:
                repair_request.conversation.participants.remove(old_technician)
            # Ajouter le nouveau technicien
            repair_request.conversation.participants.add(technician.user)

            # Ajouter le client aux participants
            repair_request.conversation.participants.add(repair_request.client.user)

            return Response(
                {
                    "success": True,
                    "message": f"Technicien {technician.user.get_full_name()} assigné avec succès",
                }
            )

        except Technician.DoesNotExist:
            logger.error(f"Technicien avec ID {technician_id} non trouvé")
            return Response(
                {"error": "Technicien non trouvé"}, status=404
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        """Met à jour le statut d'une demande."""
        repair_request = self.get_object()
        user = request.user
        new_status = request.data.get("status")

        if not new_status:
            return Response(
                {"error": "Nouveau statut requis"}, status=400
            )

        # Vérifier les permissions
        can_update = False
        if user.user_type == "admin":
            can_update = True
        elif (
            user.user_type == "technician"
            and (
                (repair_request.technician and repair_request.technician.user == user)
                or (repair_request.status == "pending" and repair_request.specialty_needed == user.technician.specialty)
            )
        ):
            can_update = True
        elif user.user_type == "client" and repair_request.client.user == user:
            can_update = new_status == "cancelled" and repair_request.status == "pending"
            logger.info(f"Client autorisé à annuler sa demande: {can_update}")

        if not can_update:
            return Response(
                {"error": "Vous n'êtes pas autorisé à modifier cette demande"},
                status=403,
            )

        # Mettre à jour le statut
        old_status = repair_request.status
        repair_request.status = new_status

        # Mettre à jour les timestamps selon le statut
        if new_status == "in_progress" and old_status != "in_progress":
            repair_request.started_at = timezone.now()
        elif new_status == "completed" and old_status != "completed":
            repair_request.completed_at = timezone.now()

        repair_request.save()

        # Envoyer notifications
        if new_status == "in_progress":
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Travaux commencés",
                message=f"Les travaux pour la demande #{repair_request.id} ont commencé",
                type="work_started",
            )
        elif new_status == "completed":
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Travaux terminés",
                message=f"Les travaux pour la demande #{repair_request.id} sont terminés",
                type="work_completed",
            )
        elif new_status == "refused":
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Demande refusée",
                message=f"Votre demande #{repair_request.id} a été refusée par un technicien.",
                type="request_refused",
            )

        # Créer un message automatique
        conversation = repair_request.conversation
        status_messages = {
            "in_progress": "Les travaux ont commencé",
            "completed": "Les travaux sont terminés",
            "cancelled": "La demande a été annulée",
            "refused": "La demande a été refusée par un technicien",
        }

        if new_status in status_messages:
            Message.objects.create(
                conversation=conversation,
                sender=user,
                content=status_messages[new_status],
                message_type="system",
            )

        return Response(
            {"success": True, "message": f"Statut mis à jour vers {new_status}"}
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def dashboard_stats(self, request):
        """Récupère les statistiques pour le tableau de bord."""
        user = request.user

        if user.user_type == "admin":
            # Statistiques admin
            total_requests = RepairRequest.objects.count()
            pending_requests = RepairRequest.objects.filter(status="pending").count()
            in_progress_requests = RepairRequest.objects.filter(
                status="in_progress"
            ).count()
            completed_requests = RepairRequest.objects.filter(
                status="completed"
            ).count()

            # Demandes par spécialité
            specialty_stats = (
                RepairRequest.objects.values("specialty_needed")
                .annotate(count=Count("id"))
                .order_by("-count")
            )

            return Response(
                {
                    "total_requests": total_requests,
                    "pending_requests": pending_requests,
                    "in_progress_requests": in_progress_requests,
                    "completed_requests": completed_requests,
                    "specialty_stats": list(specialty_stats),
                }
            )

        elif user.user_type == "technician":
            # Statistiques technicien
            technician = get_object_or_404(Technician, user=user)
            assigned_requests = RepairRequest.objects.filter(
                technician=technician
            ).count()
            completed_requests = RepairRequest.objects.filter(
                technician=technician, status="completed"
            ).count()
            pending_requests = RepairRequest.objects.filter(
                technician=technician, status__in=["assigned", "in_progress"]
            ).count()

            return Response(
                {
                    "assigned_requests": assigned_requests,
                    "completed_requests": completed_requests,
                    "pending_requests": pending_requests,
                    "specialty": technician.specialty,
                }
            )

        else:
            # Statistiques client
            client = get_object_or_404(Client, user=user)
            total_requests = RepairRequest.objects.filter(client=client).count()
            active_requests = RepairRequest.objects.filter(
                client=client, status__in=["pending", "assigned", "in_progress"]
            ).count()
            completed_requests = RepairRequest.objects.filter(
                client=client, status="completed"
            ).count()

            return Response(
                {
                    "total_requests": total_requests,
                    "active_requests": active_requests,
                    "completed_requests": completed_requests,
                }
            )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def project_statistics(self, request):
        """Récupère les statistiques complètes du projet (Admin seulement)."""
        user = request.user
        
        if user.user_type != "admin":
            return Response(
                {"error": "Accès non autorisé"}, status=403
            )

        from django.utils import timezone
        from django.db.models import Count, Sum, Avg, Q
        from datetime import timedelta
        from users.models import User, AuditLog
        from decimal import Decimal

        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        last_7_days = now - timedelta(days=7)
        last_24_hours = now - timedelta(hours=24)

        # Statistiques utilisateurs
        total_users = User.objects.count()
        total_clients = User.objects.filter(user_type='client').count()
        total_technicians = User.objects.filter(user_type='technician').count()
        total_admins = User.objects.filter(user_type='admin').count()
        
        # Utilisateurs actifs (avec activité récente) - version robuste
        active_client_ids = Client.objects.filter(
            repair_requests__created_at__gte=last_30_days
        ).values_list('user_id', flat=True)
        active_technician_ids = Technician.objects.filter(
            repair_requests__created_at__gte=last_30_days
        ).values_list('user_id', flat=True)
        active_users_30d = User.objects.filter(
            Q(id__in=active_client_ids) | Q(id__in=active_technician_ids)
        ).distinct().count()

        # Statistiques demandes
        total_requests = RepairRequest.objects.count()
        pending_requests = RepairRequest.objects.filter(status="pending").count()
        in_progress_requests = RepairRequest.objects.filter(status="in_progress").count()
        completed_requests = RepairRequest.objects.filter(status="completed").count()
        cancelled_requests = RepairRequest.objects.filter(status="cancelled").count()
        
        # Demandes récentes
        requests_24h = RepairRequest.objects.filter(created_at__gte=last_24_hours).count()
        requests_7d = RepairRequest.objects.filter(created_at__gte=last_7_days).count()
        requests_30d = RepairRequest.objects.filter(created_at__gte=last_30_days).count()

        # Statistiques financières
        total_revenue = Payment.objects.filter(
            status='completed', 
            payment_type='client_payment'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        total_payouts = Payment.objects.filter(
            status='completed', 
            payment_type='technician_payout'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        platform_fees = total_revenue - total_payouts

        # Statistiques par spécialité
        specialty_stats = (
            RepairRequest.objects.values("specialty_needed")
            .annotate(
                count=Count("id"),
                completed=Count("id", filter=Q(status="completed")),
                avg_price=Avg("final_price")
            )
            .order_by("-count")
        )

        # Statistiques techniciens
        total_verified_technicians = Technician.objects.filter(is_verified=True).count()
        total_available_technicians = Technician.objects.filter(is_available=True, is_verified=True).count()
        
        # Top techniciens par performance
        top_technicians = (
            Technician.objects.filter(is_verified=True)
            .annotate(
                total_jobs=Count("repair_requests", filter=Q(repair_requests__status="completed")),
                avg_rating=Avg("repair_requests__review__rating", filter=Q(repair_requests__status="completed")),
                total_earnings=Sum("repair_requests__payments__amount", filter=Q(repair_requests__payments__status="completed"))
            )
            .filter(total_jobs__gt=0)
            .order_by("-total_jobs")[:10]
        )

        # Statistiques de satisfaction
        total_reviews = Review.objects.count()
        avg_rating = Review.objects.aggregate(avg=Avg('rating'))['avg'] or 0
        satisfaction_rate = (
            Review.objects.filter(rating__gte=4).count() / total_reviews * 100
        ) if total_reviews > 0 else 0

        # Statistiques de sécurité
        total_logins = AuditLog.objects.filter(event_type='login', status='success').count()
        failed_logins = AuditLog.objects.filter(event_type='login', status='failure').count()
        security_alerts = AuditLog.objects.filter(risk_score__gte=80).count()
        
        # Statistiques temporelles (évolution)
        daily_requests = []
        for i in range(7):
            date = now - timedelta(days=i)
            count = RepairRequest.objects.filter(
                created_at__date=date.date()
            ).count()
            daily_requests.append({
                'date': date.strftime('%Y-%m-%d'),
                'count': count
            })
        daily_requests.reverse()

        # Statistiques géographiques
        city_stats = (
            RepairRequest.objects.values("city")
            .annotate(count=Count("id"))
            .filter(city__isnull=False)
            .exclude(city="")
            .order_by("-count")[:10]
        )

        # Statistiques de paiement
        payment_methods = (
            Payment.objects.values("method")
            .annotate(count=Count("id"), total=Sum("amount"))
            .filter(status="completed")
            .order_by("-total")
        )

        # Préparer les données de réponse
        response_data = {
            # Vue d'ensemble
            'overview': {
                'total_users': total_users,
                'total_clients': total_clients,
                'total_technicians': total_technicians,
                'total_admins': total_admins,
                'active_users_30d': active_users_30d,
                'total_requests': total_requests,
                'completed_requests': completed_requests,
                'total_revenue': float(total_revenue),
                'platform_fees': float(platform_fees),
                'avg_rating': round(avg_rating, 1),
                'satisfaction_rate': round(satisfaction_rate, 1)
            },
            
            # Demandes
            'requests': {
                'total': total_requests,
                'pending': pending_requests,
                'in_progress': in_progress_requests,
                'completed': completed_requests,
                'cancelled': cancelled_requests,
                'recent_24h': requests_24h,
                'recent_7d': requests_7d,
                'recent_30d': requests_30d,
                'daily_evolution': daily_requests
            },
            
            # Financier
            'financial': {
                'total_revenue': float(total_revenue),
                'total_payouts': float(total_payouts),
                'platform_fees': float(platform_fees),
                'payment_methods': list(payment_methods)
            },
            
            # Spécialités
            'specialties': {
                'stats': list(specialty_stats),
                'top_technicians': [
                    {
                        'id': tech.id,
                        'name': tech.user.get_full_name() or tech.user.username,
                        'specialty': tech.get_specialty_display(),
                        'total_jobs': tech.total_jobs,
                        'avg_rating': round(tech.avg_rating or 0, 1),
                        'total_earnings': float(tech.total_earnings or 0)
                    }
                    for tech in top_technicians
                ]
            },
            
            # Techniciens
            'technicians': {
                'total': total_technicians,
                'verified': total_verified_technicians,
                'available': total_available_technicians,
                'availability_rate': round((total_available_technicians / total_verified_technicians * 100) if total_verified_technicians > 0 else 0, 1)
            },
            
            # Satisfaction
            'satisfaction': {
                'total_reviews': total_reviews,
                'avg_rating': round(avg_rating, 1),
                'satisfaction_rate': round(satisfaction_rate, 1)
            },
            
            # Sécurité
            'security': {
                'total_logins': total_logins,
                'failed_logins': failed_logins,
                'security_alerts': security_alerts,
                'success_rate': round((total_logins / (total_logins + failed_logins) * 100) if (total_logins + failed_logins) > 0 else 0, 1)
            },
            
            # Géographie
            'geography': {
                'top_cities': list(city_stats)
            }
        }

        # DEBUG : Affiche la réponse dans la console
        print("=== project_statistics response ===")
        import pprint; pprint.pprint(response_data)
        return Response(response_data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def available_technicians(self, request):
        """Récupère les techniciens disponibles pour une spécialité (Admin seulement)."""
        user = request.user
        specialty = request.query_params.get("specialty")

        if user.user_type != "admin":
            return Response(
                {"error": "Accès non autorisé"}, status=403
            )

        if not specialty:
            return Response(
                {"error": "Spécialité requise"}, status=400
            )

        technicians = Technician.objects.filter(
            specialty=specialty, is_available=True, is_verified=True
        ).select_related("user")

        technician_data = []
        for tech in technicians:
            # Calculer la note moyenne
            avg_rating = tech.average_rating
            total_jobs = tech.total_jobs_completed

            technician_data.append(
                {
                    "id": tech.id,
                    "name": tech.user.get_full_name(),
                    "email": tech.user.email,
                    "phone": tech.phone,
                    "years_experience": tech.years_experience,
                    "average_rating": avg_rating,
                    "total_jobs": total_jobs,
                    "hourly_rate": tech.hourly_rate,
                    "bio": tech.bio,
                }
            )

        return Response(technician_data)

    @csrf_exempt
    def create(self, request, *args, **kwargs):
        try:
            try:
                logger.info('[DEBUG] Body reçu pour création RepairRequest: %s', request.data)
            except Exception as e:
                logger.error('[DEBUG] Erreur lors du log du body: %s', e)
            serializer = self.get_serializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            # Sérialiser la demande créée pour la réponse
            response_serializer = RepairRequestSerializer(serializer.instance, context={'request': request})
            headers = self.get_success_headers(serializer.data)
            return Response(response_serializer.data, status=201, headers=headers)
        except Exception as exc:
            import traceback
            tb = traceback.format_exc()
            logger.error(f'[DEBUG][EXCEPTION] {exc}\n{tb}')
            return Response({'error': str(exc), 'traceback': tb}, status=500)

    def partial_update(self, request, *args, **kwargs):
        """Gère les mises à jour partielles avec vérification des permissions."""
        repair_request = self.get_object()
        user = request.user
        new_status = request.data.get("status")
        
        logger.info(f"Tentative de mise à jour - Demande: {repair_request.id}, Utilisateur: {user.id} ({user.user_type}), Nouveau statut: {new_status}")

        # Vérifier les permissions selon le type d'utilisateur
        can_update = False
        if user.user_type == "admin":
            can_update = True
            logger.info("Admin autorisé à modifier la demande")
        elif user.user_type == "technician":
            # Vérifier si le technicien peut modifier cette demande
            try:
                technician = Technician.objects.get(user=user)
                if (repair_request.technician and repair_request.technician.user == user) or \
                   (repair_request.status == "pending" and repair_request.specialty_needed == technician.specialty):
                    can_update = True
                    logger.info(f"Technicien {technician.id} autorisé à modifier la demande")
                else:
                    logger.warning(f"Technicien {technician.id} non autorisé - Demande assignée à un autre ou spécialité différente")
            except Technician.DoesNotExist:
                logger.error(f"Profil technicien non trouvé pour l'utilisateur {user.id}")
        elif user.user_type == "client" and repair_request.client.user == user:
            # Les clients peuvent seulement annuler si la demande n'est pas acceptée
            can_update = new_status == "cancelled" and repair_request.status == "pending"
            logger.info(f"Client autorisé à annuler sa demande: {can_update}")

        if not can_update:
            logger.error(f"Utilisateur {user.id} non autorisé à modifier la demande {repair_request.id}")
            return Response(
                {"error": "Vous n'êtes pas autorisé à modifier cette demande"},
                status=403,
            )

        # Si c'est un changement de statut, utiliser la logique de update_status
        if new_status and new_status != repair_request.status:
            logger.info(f"Changement de statut de {repair_request.status} vers {new_status}")
            
            # Mettre à jour le statut
            old_status = repair_request.status
            repair_request.status = new_status

            # Mettre à jour les timestamps selon le statut
            if new_status == "in_progress" and old_status != "in_progress":
                repair_request.started_at = timezone.now()
            elif new_status == "completed" and old_status != "completed":
                repair_request.completed_at = timezone.now()

            repair_request.save()

            # Envoyer notifications selon le nouveau statut
            if new_status == "in_progress":
                Notification.objects.create(
                    recipient=repair_request.client.user,
                    title="Travaux commencés",
                    message=f"Les travaux pour la demande #{repair_request.id} ont commencé",
                    type="work_started",
                )
            elif new_status == "completed":
                Notification.objects.create(
                    recipient=repair_request.client.user,
                    title="Travaux terminés",
                    message=f"Les travaux pour la demande #{repair_request.id} sont terminés",
                    type="work_completed",
                )
            elif new_status == "refused":
                Notification.objects.create(
                    recipient=repair_request.client.user,
                    title="Demande refusée",
                    message=f"Votre demande #{repair_request.id} a été refusée par un technicien.",
                    type="request_refused",
                )

            # Créer un message automatique
            conversation = repair_request.conversation
            status_messages = {
                "in_progress": "Les travaux ont commencé",
                "completed": "Les travaux sont terminés",
                "cancelled": "La demande a été annulée",
                "refused": "La demande a été refusée par un technicien",
            }

            if new_status in status_messages:
                Message.objects.create(
                    conversation=conversation,
                    sender=user,
                    content=status_messages[new_status],
                    message_type="system",
                )

            logger.info(f"Statut mis à jour avec succès vers {new_status}")
            return Response(
                {"success": True, "message": f"Statut mis à jour vers {new_status}"}
            )

        # Pour les autres champs, utiliser la logique par défaut
        return super().partial_update(request, *args, **kwargs)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def notification_candidates(self, request):
        """Endpoint temporaire pour diagnostiquer les techniciens candidats à la notification."""
        specialty = request.query_params.get("specialty")
        lat = request.query_params.get("lat")
        lng = request.query_params.get("lng")
        if not specialty or not lat or not lng:
            return Response({"error": "specialty, lat et lng requis"}, status=400)
        try:
            lat = float(lat)
            lng = float(lng)
        except ValueError:
            return Response({"error": "lat/lng invalides"}, status=400)
        technicians = Technician.objects.filter(
            specialty=specialty,
            is_available=True,
            is_verified=True,
            current_latitude__isnull=False,
            current_longitude__isnull=False,
        )
        tech_with_distance = []
        for tech in technicians:
            distance = calculate_distance(lat, lng, tech.current_latitude, tech.current_longitude)
            tech_with_distance.append({
                "tech_id": tech.id,
                "user_id": tech.user.id,
                "username": tech.user.username,
                "specialty": tech.specialty,
                "distance_km": round(distance, 2),
                "is_available": tech.is_available,
                "is_verified": tech.is_verified,
                "lat": tech.current_latitude,
                "lng": tech.current_longitude
            })
        tech_with_distance.sort(key=lambda x: x["distance_km"])
        return Response({"candidates": tech_with_distance})

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def report_no_show(self, request, pk=None):
        """Signaler que le technicien n'est pas venu : notification admin + réassignation automatique (max 2 fois)."""
        repair_request = self.get_object()
        user = request.user
        from users.models import User
        # Incrémenter le compteur d'absence
        repair_request.no_show_count = (repair_request.no_show_count or 0) + 1
        repair_request.save()
        # Notifier l'admin
        admin_users = User.objects.filter(is_staff=True, is_active=True)
        for admin in admin_users:
            Notification.objects.create(
                recipient=admin,
                title="Technicien non venu",
                message=f"Le client a signalé l'absence du technicien pour la demande #{repair_request.id}",
                type="technician_no_show",
                request=repair_request,
            )
        # Limite de réaffectation automatique
        if repair_request.no_show_count > 2:
            for admin in admin_users:
                Notification.objects.create(
                    recipient=admin,
                    title="Intervention humaine requise",
                    message=f"La demande #{repair_request.id} a déjà été réaffectée 2 fois. Intervention manuelle nécessaire.",
                    type="manual_reassignment_required",
                    request=repair_request,
                )
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Intervention admin requise",
                message=f"Nous n'avons pas pu réassigner automatiquement un technicien pour votre demande #{repair_request.id}. Un admin va vous contacter.",
                type="manual_reassignment_required",
                request=repair_request,
            )
            return Response({"success": False, "message": "Limite de réaffectation automatique atteinte. Intervention admin requise."}, status=400)
        # Exclure le technicien précédent
        previous_technician = repair_request.technician
        # Relancer le matching (mêmes critères, hors technicien précédent)
        lat = repair_request.latitude
        lng = repair_request.longitude
        technicians = Technician.objects.filter(
            specialty=repair_request.specialty_needed,
            is_available=True,
            is_verified=True,
            current_latitude__isnull=False,
            current_longitude__isnull=False,
        ).exclude(id=previous_technician.id if previous_technician else None)
        technicians = [t for t in technicians if t.has_active_subscription]
        busy_tech_ids = set(
            RepairRequest.objects.filter(
                status__in=[RepairRequest.Status.ASSIGNED, RepairRequest.Status.IN_PROGRESS]
            ).values_list('technician_id', flat=True)
        )
        technicians = [t for t in technicians if t.id not in busy_tech_ids]
        MIN_RATING = 3.5
        technicians = [t for t in technicians if t.average_rating >= MIN_RATING]
        tech_with_distance = []
        for tech in technicians:
            distance = calculate_distance(lat, lng, tech.current_latitude, tech.current_longitude)
            if distance <= tech.service_radius_km:
                tech_with_distance.append((tech, distance))
        tech_with_distance.sort(key=lambda x: x[1])
        closest_techs = [t[0] for t in tech_with_distance[:10]]
        # Réassigner au premier dispo
        if closest_techs:
            new_technician = closest_techs[0]
            repair_request.technician = new_technician
            repair_request.status = RepairRequest.Status.ASSIGNED
            repair_request.save()
            # Notifier le nouveau technicien
            Notification.objects.create(
                recipient=new_technician.user,
                title="Nouvelle demande réassignée",
                message=f"Vous avez été réassigné à la demande #{repair_request.id}",
                type="new_request_technician",
                request=repair_request,
            )
            # Notifier le client avec le nom du nouveau technicien
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Nouveau technicien en route",
                message=f"{new_technician.user.get_full_name() or new_technician.user.username} a été réassigné à votre demande #{repair_request.id}",
                type="technician_assigned",
                request=repair_request,
            )
            # Retirer l'ancien technicien des participants si différent du nouveau
            old_technician = None
            if repair_request.conversation.participants.count() > 1:
                for participant in repair_request.conversation.participants.all():
                    if hasattr(participant, 'technician_depannage') and participant != new_technician.user:
                        old_technician = participant
                        break
            if old_technician:
                repair_request.conversation.participants.remove(old_technician)
            # Ajouter le nouveau technicien
            repair_request.conversation.participants.add(new_technician.user)

            # Ajouter le client aux participants
            repair_request.conversation.participants.add(repair_request.client.user)

            return Response({"success": True, "message": f"Demande réassignée à {new_technician.user.get_full_name() or new_technician.user.username}."})
        else:
            # Aucun technicien dispo
            for admin in admin_users:
                Notification.objects.create(
                    recipient=admin,
                    title="Aucun technicien disponible",
                    message=f"Aucun technicien n'a pu être réassigné à la demande #{repair_request.id}",
                    type="no_technician_available",
                    request=repair_request,
                )
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Aucun technicien disponible",
                message=f"Nous n'avons pas pu réassigner un technicien pour votre demande #{repair_request.id}. Un admin va vous contacter.",
                type="no_technician_available",
                request=repair_request,
            )
            return Response({"success": False, "message": "Aucun technicien disponible pour la réaffectation."}, status=400)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def validate_mission(self, request, pk=None):
        """Valide la mission côté client, envoie le reçu et retourne les infos du reçu."""
        repair_request = self.get_object()
        user = request.user
        if not hasattr(user, 'client_profile') or repair_request.client.user != user:
            return Response({"error": "Seul le client peut valider la mission."}, status=403)
        if not repair_request.status == RepairRequest.Status.COMPLETED:
            return Response({"error": "La mission doit être terminée pour être validée."}, status=400)
        if repair_request.mission_validated:
            return Response({"error": "La mission a déjà été validée."}, status=400)
        if repair_request.status in [RepairRequest.Status.CANCELLED, RepairRequest.Status.CANCELLED]:
            return Response({"error": "Impossible de valider une mission annulée ou refusée."}, status=400)
        # Marquer comme validée
        repair_request.mission_validated = True
        repair_request.save()
        # Envoi du reçu par email
        try:
            subject = "Reçu de mission - Merci pour votre confiance !"
            message = (
                f"Bonjour {user.get_full_name()},\n\n"
                f"Votre mission #{repair_request.id} a été validée le {repair_request.completed_at.strftime('%d/%m/%Y à %Hh%M')}.\n"
                f"Technicien : {repair_request.technician.user.get_full_name()}\n"
                f"Service : {repair_request.title}\n"
                f"Adresse : {repair_request.address}\n"
                f"Référence : {repair_request.uuid}\n"
                f"Paiement : effectué en main propre au technicien.\n\n"
                f"Merci d'avoir choisi notre plateforme !"
            )
            send_mail(
                subject,
                message,
                'no-reply@votreservice.ml',
                [user.email],
                fail_silently=True,
            )
        except Exception as e:
            logger.error(f"Erreur lors de l'envoi du reçu de mission : {e}")
        # Notification pour le reçu
        Notification.objects.create(
            recipient=user,
            title="Reçu de mission",
            message=f"Votre reçu de mission #{repair_request.id} est disponible.",
            type="system",
            request=repair_request,
        )
        
        # Notification pour encourager la notation
        Notification.objects.create(
            recipient=user,
            title="Partagez votre expérience !",
            message=f"Votre mission avec {repair_request.technician.user.get_full_name() or repair_request.technician.user.username} est terminée. Aidez d'autres clients en notant votre technicien !",
            type="review_reminder",
            request=repair_request
        )
        # Retourner les infos du reçu
        data = {
            "success": True,
            "date": repair_request.completed_at,
            "technician": repair_request.technician.user.get_full_name() if repair_request.technician else None,
            "service": repair_request.title,
            "address": repair_request.address,
            "reference": str(repair_request.uuid),
            "payment": "Effectué en main propre au technicien."
        }
        return Response(data)


# ============================================================================
# VIEWSETS MANQUANTS
# ============================================================================


class ClientViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les clients."""

    queryset = Client.objects.all()
    serializer_class = ClientSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Client.objects.all()
        return Client.objects.filter(user=self.request.user)


class TechnicianViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les techniciens."""

    queryset = Technician.objects.all()
    serializer_class = TechnicianSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Technician.objects.all()
        return Technician.objects.filter(user=self.request.user)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def subscription_status(self, request):
        """Retourne le statut d'abonnement - maintenant gratuit pour tous les techniciens."""
        user = request.user
        logger = logging.getLogger(__name__)
        
        try:
            # Récupérer le profil technicien avec gestion d'erreur robuste
            technician = get_technician_profile(user)
            
            if not technician:
                logger.warning(f"Utilisateur {user.id} n'est pas un technicien")
                return Response({"error": "Vous n'êtes pas un technicien."}, status=403)
            
            # Tous les techniciens sont maintenant gratuits
            logger.info(f"Technicien {user.id} - Accès gratuit activé")
            
            return Response({
                'status': 'active',
                'subscription': None,
                'days_remaining': 999999,  # Illimité
                'payments': [],
                'can_receive_requests': True,
                'is_active': True,
                'subscription_details': {
                    'plan_name': 'Gratuit',
                    'start_date': timezone.now().isoformat(),
                    'end_date': (timezone.now() + timezone.timedelta(days=36500)).isoformat(),  # 100 ans
                },
                'message': 'Accès gratuit activé'
            })
            
        except Exception as e:
            logger.error(f"Erreur lors de la vérification du statut d'abonnement pour {user.id}: {str(e)}")
            return Response({
                "error": "Erreur lors de la vérification du statut d'abonnement",
                "details": str(e)
            }, status=500)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def renew_subscription(self, request):
        """Méthode supprimée - tous les techniciens sont maintenant gratuits."""
        return Response({
            "success": True,
            "message": "Tous les techniciens ont maintenant un accès gratuit illimité",
            "subscription": {
                "plan": "Gratuit",
                "is_active": True,
                "amount": 0
            }
        })

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def upload_photo(self, request, pk=None):
        """Permet au technicien de télécharger sa photo de profil."""
        technician = self.get_object()
        
        if 'profile_picture' not in request.FILES:
            return Response({"error": "Aucune photo fournie"}, status=400)
        
        file = request.FILES['profile_picture']
        
        # Validation du fichier
        if file.size > 5 * 1024 * 1024:  # 5MB max
            return Response({"error": "Fichier trop volumineux (max 5MB)"}, status=400)
        
        if not file.content_type.startswith('image/'):
            return Response({"error": "Format de fichier non supporté"}, status=400)
        
        # Sauvegarder la photo
        technician.profile_picture = file
        technician.save()
        
        return Response({
            "success": True,
            "profile_picture": technician.profile_picture.url
        })

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def upload_kyc(self, request, pk=None):
        """Permet au technicien de télécharger son document KYC."""
        technician = self.get_object()
        
        if 'kyc_document' not in request.FILES:
            return Response({"error": "Aucun document fourni"}, status=400)
        
        file = request.FILES['kyc_document']
        
        # Validation du fichier
        if file.size > 10 * 1024 * 1024:  # 10MB max
            return Response({"error": "Fichier trop volumineux (max 10MB)"}, status=400)
        
        allowed_types = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
        if file.content_type not in allowed_types:
            return Response({"error": "Format de fichier non supporté (PDF, JPG, PNG uniquement)"}, status=400)
        
        # Sauvegarder le document KYC
        technician.kyc_document = file
        technician.save()
        
        return Response({
            "success": True,
            "kyc_document": technician.kyc_document.url
        })

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def download_receipts(self, request, pk=None):
        """Permet au technicien de télécharger ses reçus."""
        technician = self.get_object()
        
        # Récupérer tous les paiements du technicien
        payments = Payment.objects.filter(payer=technician.user)
        
        # Créer un fichier ZIP avec les reçus
        import zipfile
        import io
        
        zip_buffer = io.BytesIO()
        
        with zipfile.ZipFile(zip_buffer, 'w') as zip_file:
            for payment in payments:
                receipt_content = f"""
                Reçu de paiement
                ================
                ID: {payment.id}
                Montant: {payment.amount} FCFA
                Méthode: {payment.payment_method}
                Date: {payment.created_at}
                Statut: {payment.status}
                Description: {payment.description}
                """
                
                zip_file.writestr(f"recu_{payment.id}.txt", receipt_content)
        
        zip_buffer.seek(0)
        
        from django.http import HttpResponse
        response = HttpResponse(zip_buffer.getvalue(), content_type='application/zip')
        response['Content-Disposition'] = f'attachment; filename="reçus_technicien_{technician.user.username}.zip"'
        
        return response

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def me(self, request):
        """Retourne les informations du technicien connecté."""
        user = request.user
        from .models import Technician
        technician = get_technician_profile(user)
        if not technician:
            technician = Technician.objects.filter(user=user).first()
        if not technician:
            return Response({"error": "Technicien introuvable"}, status=404)
        serializer = self.get_serializer(technician)
        return Response(serializer.data)


class RequestDocumentViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les documents de demande."""

    queryset = RequestDocument.objects.all()
    serializer_class = RequestDocumentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return RequestDocument.objects.all()
        return RequestDocument.objects.filter(request__client__user=self.request.user)


class ReviewViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les avis."""

    queryset = Review.objects.all()
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PageNumberPagination  # Ajout de la pagination

    def get_queryset(self):
        if self.request.user.is_staff:
            return Review.objects.all().select_related('technician__user', 'client__user')
        return Review.objects.filter(client__user=self.request.user).select_related('technician__user', 'client__user')

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def received(self, request):
        """Retourne la liste des avis reçus par le technicien connecté."""
        user = request.user
        from .models import Technician
        technician = get_technician_profile(user)
        if not technician or not isinstance(technician, Technician):
            technician = Technician.objects.filter(user=user).first()
        if not technician:
            return Response({"error": "Vous n'êtes pas un technicien."}, status=403)
        reviews = Review.objects.filter(technician=technician).select_related('client__user').order_by("-created_at")
        
        # Pagination
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        paginator = Paginator(reviews, page_size)
        reviews_page = paginator.get_page(page)
        
        serializer = self.get_serializer(reviews_page, many=True)
        return Response({
            "results": serializer.data,
            "count": paginator.count,
            "next": reviews_page.has_next(),
            "previous": reviews_page.has_previous()
        })

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def pending_reviews(self, request):
        """Retourne les demandes terminées sans avis pour le client connecté."""
        user = request.user
        if not hasattr(user, "client_profile"):
            return Response({"error": "Vous n'êtes pas un client."}, status=403)
        
        client = user.client_profile
        completed_requests = RepairRequest.objects.filter(
            client=client,
            status="completed",
            review__isnull=True
        ).select_related('technician__user').order_by('-completed_at')
        
        # Pagination
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        paginator = Paginator(completed_requests, page_size)
        requests_page = paginator.get_page(page)
        
        # Sérialiser avec les informations nécessaires pour la page de notation
        data = []
        for request in requests_page:
            data.append({
                'id': request.id,
                'title': request.title,
                'description': request.description,
                'completed_at': request.completed_at,
                'technician': {
                    'id': request.technician.id,
                    'user': {
                        'first_name': request.technician.user.first_name,
                        'last_name': request.technician.user.last_name,
                        'email': request.technician.user.email,
                    },
                    'specialty': request.technician.specialty,
                    'years_experience': request.technician.years_experience,
                    'average_rating': request.technician.average_rating,
                    'total_jobs_completed': request.technician.total_jobs_completed,
                }
            })
        
        return Response({
            "results": data,
            "count": paginator.count,
            "next": requests_page.has_next(),
            "previous": requests_page.has_previous()
        })

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def statistics(self, request):
        """Retourne les statistiques des avis pour l'utilisateur connecté."""
        user = request.user
        from .models import Technician
        technician = get_technician_profile(user)
        if technician or Technician.objects.filter(user=user).exists():
            if not technician:
                technician = Technician.objects.filter(user=user).first()
            reviews = Review.objects.filter(technician=technician)
            stats = {
                'total_reviews': reviews.count(),
                'average_rating': reviews.aggregate(avg=Avg('rating'))['avg'] or 0,
                'average_punctuality': reviews.aggregate(avg=Avg('punctuality_rating'))['avg'] or 0,
                'average_quality': reviews.aggregate(avg=Avg('quality_rating'))['avg'] or 0,
                'average_communication': reviews.aggregate(avg=Avg('communication_rating'))['avg'] or 0,
                'recommendation_rate': reviews.filter(would_recommend=True).count() / reviews.count() * 100 if reviews.count() > 0 else 0,
                'recent_reviews': reviews.order_by('-created_at')[:5].values('rating', 'comment', 'created_at', 'client__user__first_name')
            }
            return Response(stats)
        elif hasattr(user, "client_profile"):
            # Statistiques pour un client
            client = user.client_profile
            reviews = Review.objects.filter(client=client)
            
            stats = {
                'total_reviews_given': reviews.count(),
                'average_rating_given': reviews.aggregate(avg=Avg('rating'))['avg'] or 0,
                'recent_reviews': reviews.order_by('-created_at')[:5].values('rating', 'comment', 'created_at', 'technician__user__first_name')
            }
        else:
            return Response({"error": "Profil non trouvé."}, status=404)
        
        return Response(stats)

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def update_review(self, request, pk=None):
        """Permet de modifier un avis existant."""
        review = self.get_object()
        
        # Vérifier que l'utilisateur est le propriétaire de l'avis
        if review.client.user != request.user:
            return Response({"error": "Vous ne pouvez modifier que vos propres avis."}, status=403)
        
        serializer = self.get_serializer(review, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def rewards(self, request):
        """Retourne les récompenses et bonus du technicien basés sur ses performances."""
        user = request.user
        from .models import Technician
        technician = get_technician_profile(user)
        if not technician or not isinstance(technician, Technician):
            technician = Technician.objects.filter(user=user).first()
        if not technician:
            return Response({"error": "Vous n'êtes pas un technicien."}, status=403)
        reviews = Review.objects.filter(technician=technician)
        avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        total_reviews = reviews.count()
        recommendation_rate = reviews.filter(would_recommend=True).count() / total_reviews * 100 if total_reviews > 0 else 0
        completed_jobs = RepairRequest.objects.filter(technician=technician, status='completed').count()
        rewards = {
            'current_level': 'bronze',
            'next_level': 'silver',
            'progress_to_next': 0,
            'bonuses': [],
            'achievements': []
        }
        return Response(rewards)

    @action(detail=True, methods=["PATCH"], permission_classes=[IsAdminUser])
    def moderate(self, request, pk=None):
        """Permet à l'admin de masquer ou rendre visible un avis."""
        review = self.get_object()
        is_visible = request.data.get("is_visible")
        if is_visible is None:
            return Response({"error": "Champ 'is_visible' requis."}, status=400)
        review.is_visible = bool(is_visible) in [True, 1, "1", "True"]
        review.save()
        serializer = self.get_serializer(review)
        return Response(serializer.data)


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les paiements."""

    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PageNumberPagination  # Ajout de la pagination

    def get_queryset(self):
        if self.request.user.is_staff:
            return Payment.objects.all().select_related('payer')
        return Payment.objects.filter(payer=self.request.user).select_related('payer')

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_payments(self, request):
        """Retourne les paiements de l'utilisateur connecté."""
        payments = Payment.objects.filter(payer=request.user).select_related('payer').order_by('-created_at')
        
        # Pagination
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        paginator = Paginator(payments, page_size)
        payments_page = paginator.get_page(page)
        
        serializer = self.get_serializer(payments_page, many=True)
        return Response({
            "results": serializer.data,
            "count": paginator.count,
            "next": payments_page.has_next(),
            "previous": payments_page.has_previous()
        })


class ConversationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les conversations."""

    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=[IsAdminUser])
    def clear_messages(self, request, pk=None):
        """Supprime tous les messages d'une conversation (sauf éventuellement les messages système)."""
        conversation = self.get_object()
        deleted, _ = conversation.messages.exclude(message_type="system").delete()
        return Response({"success": True, "deleted": deleted})


class MessageViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les messages."""

    queryset = Message.objects.all()
    serializer_class = MessageSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Message.objects.filter(conversation__participants=self.request.user)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def mark_as_read(self, request):
        """Marque comme lus les messages dont les IDs sont fournis (si destinés à l'utilisateur courant)."""
        ids = request.data.get("ids", [])
        if not isinstance(ids, list):
            return Response({"error": "Format attendu: {'ids': [1,2,3]}"}, status=400)
        user = request.user
        messages = Message.objects.filter(id__in=ids, conversation__participants=user).exclude(sender=user)
        updated = 0
        for msg in messages:
            if not msg.is_read:
                msg.mark_as_read()
                updated += 1
        return Response({"updated": updated})


class MessageAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les pièces jointes des messages."""

    queryset = MessageAttachment.objects.all()
    serializer_class = MessageAttachmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return MessageAttachment.objects.filter(
            message__conversation__participants=self.request.user
        )


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les notifications."""

    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PageNumberPagination  # Ajout de la pagination

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user).order_by('-created_at')

    @action(detail=True, methods=["post"])
    def mark_as_read(self, request, pk=None):
        """Marquer une notification comme lue."""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({"status": "success"})

    @action(detail=False, methods=["post"])
    def mark_all_as_read(self, request):
        """Marquer toutes les notifications comme lues."""
        self.get_queryset().update(is_read=True, read_at=timezone.now())
        return Response({"status": "success"})


class TechnicianLocationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les localisations des techniciens."""

    queryset = TechnicianLocation.objects.all()
    serializer_class = TechnicianLocationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = PageNumberPagination  # Ajout de la pagination

    def get_queryset(self):
        if self.request.user.is_staff:
            return TechnicianLocation.objects.all().select_related('technician__user')
        return TechnicianLocation.objects.filter(technician__user=self.request.user).select_related('technician__user')


class SystemConfigurationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer la configuration système."""

    queryset = SystemConfiguration.objects.all()
    serializer_class = SystemConfigurationSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.request.user.is_staff:
            return [IsAuthenticated()]
        return [permissions.IsAdminUser()]


class TechnicianNearbyViewSet(viewsets.GenericViewSet):
    """ViewSet pour récupérer les techniciens proches avec géolocalisation."""
    permission_classes = [IsAuthenticated]
    serializer_class = TechnicianNearbySerializer
    
    def list(self, request):
        """Récupère les techniciens proches avec filtres."""
        try:
            # Récupérer les paramètres
            lat = request.query_params.get('lat')
            lng = request.query_params.get('lng')
            service = request.query_params.get('service')
            urgence = request.query_params.get('urgence', 'normal')
            all_techs = request.query_params.get('all', 'false').lower() == 'true'
            
            # Validation des paramètres
            if not lat or not lng:
                return Response({
                    'error': 'Les paramètres lat et lng sont requis'
                }, status=400)
            
            try:
                lat = float(lat)
                lng = float(lng)
            except ValueError:
                return Response({
                    'error': 'Les coordonnées lat et lng doivent être des nombres'
                }, status=400)
            
            # Rayon de recherche (10 km par défaut)
            search_radius = 10.0
            
            # Récupérer tous les techniciens disponibles
            queryset = Technician.objects.filter(
                is_available=True,
                is_verified=True
            ).select_related('user')
            
            # Filtrer par service si spécifié
            if service:
                queryset = queryset.filter(specialty=service)
            
            # Calculer la distance pour chaque technicien
            technicians_with_distance = []
            for technician in queryset:
                try:
                    location = technician.location
                    if location:
                        distance = self.calculate_haversine_distance(
                            lat, lng, location.latitude, location.longitude
                        )
                        technician.distance_km = round(distance, 2)
                        if all_techs or distance <= search_radius:
                            technicians_with_distance.append(technician)
                except TechnicianLocation.DoesNotExist:
                    continue
            
            # Trier par distance croissante
            technicians_with_distance.sort(key=lambda x: x.distance_km)
            
            # Limiter le nombre de résultats (optionnel)
            max_results = 100 if all_techs else 20
            technicians_with_distance = technicians_with_distance[:max_results]
            
            # Sérialiser les résultats
            serializer = self.get_serializer(technicians_with_distance, many=True)
            
            return Response({
                'technicians': serializer.data,
                'count': len(technicians_with_distance),
                'search_radius': search_radius,
                'user_location': {'lat': lat, 'lng': lng}
            })
            
        except Exception as e:
            logger.error(f"Erreur lors de la recherche de techniciens proches: {str(e)}")
            return Response({
                'error': 'Erreur lors de la recherche de techniciens'
            }, status=500)
    
    def calculate_haversine_distance(self, lat1, lon1, lat2, lon2):
        """
        Calcule la distance entre deux points géographiques avec la formule de Haversine.
        Retourne la distance en kilomètres.
        """
        # Rayon de la Terre en kilomètres
        R = 6371.0
        
        # Convertir les degrés en radians
        lat1_rad = math.radians(lat1)
        lon1_rad = math.radians(lon1)
        lat2_rad = math.radians(lat2)
        lon2_rad = math.radians(lon2)
        
        # Différences des coordonnées
        dlat = lat2_rad - lat1_rad
        dlon = lon2_rad - lon1_rad
        
        # Formule de Haversine
        a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
        c = 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
        distance = R * c
        
        return distance

@api_view(['GET'])
@permission_classes([IsAdminUser])
def list_permissions(request):
    perms = Permission.objects.all()
    data = PermissionSerializer(perms, many=True).data
    return Response(data)

from rest_framework.views import APIView

class GroupListCreateView(APIView):
    permission_classes = [IsAdminUser]
    def get(self, request):
        groups = Group.objects.all()
        serializer = GroupSerializer(groups, many=True)
        return Response(serializer.data)
    def post(self, request):
        serializer = GroupSerializer(data=request.data)
        if serializer.is_valid():
            group = Group.objects.create(name=serializer.validated_data['name'])
            # Ajout des permissions si fournies
            perms = request.data.get('permissions', [])
            if perms:
                group.permissions.set(perms)
            group.save()
            return Response(GroupSerializer(group).data, status=201)
        return Response(serializer.errors, status=400)

class GroupDetailView(APIView):
    permission_classes = [IsAdminUser]
    def get_object(self, pk):
        return Group.objects.get(pk=pk)
    def get(self, request, pk):
        group = self.get_object(pk)
        serializer = GroupSerializer(group)
        return Response(serializer.data)
    def patch(self, request, pk):
        group = self.get_object(pk)
        name = request.data.get('name')
        if name:
            group.name = name
        perms = request.data.get('permissions')
        if perms is not None:
            group.permissions.set(perms)
        group.save()
        return Response(GroupSerializer(group).data)
    def delete(self, request, pk):
        group = self.get_object(pk)
        group.delete()
        return Response(status=204)

class IsAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff

class PlatformConfigurationViewSet(viewsets.ModelViewSet):
    queryset = PlatformConfiguration.objects.all()
    serializer_class = PlatformConfigurationSerializer
    permission_classes = [IsAdmin]

    def get_object(self):
        obj, created = PlatformConfiguration.objects.get_or_create(pk=1)
        return obj

    def list(self, request, *args, **kwargs):
        obj = self.get_object()
        serializer = self.get_serializer(obj)
        return Response(serializer.data)

    def create(self, request, *args, **kwargs):
        return Response({'detail': 'Création non autorisée.'}, status=405)

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'Suppression non autorisée.'}, status=405)

class ClientLocationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les localisations des clients."""
    queryset = ClientLocation.objects.all()
    serializer_class = ClientLocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return ClientLocation.objects.all()
        return ClientLocation.objects.filter(client__user=self.request.user)

class ReportViewSet(viewsets.ModelViewSet):
    queryset = Report.objects.all().order_by('-created_at')
    serializer_class = ReportSerializer
    def get_permissions(self):
        if self.request.user.is_staff:
            return [permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        if request.user.is_staff:
            instance.reviewed_by = request.user
            instance.reviewed_at = now()
        return super().update(request, *args, **kwargs)

class AdminNotificationViewSet(viewsets.ModelViewSet):
    queryset = AdminNotification.objects.order_by('-created_at')
    serializer_class = AdminNotificationSerializer
    permission_classes = [permissions.IsAdminUser]
    def perform_update(self, serializer):
        serializer.save()

class AuditLogListView(APIView):
    permission_classes = [permissions.IsAdminUser]
    def get(self, request):
        logs = AuditLog.objects.all()
        # Filtres dynamiques
        event_type = request.GET.get('event_type')
        status = request.GET.get('status')
        user_email = request.GET.get('user_email')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if event_type:
            logs = logs.filter(event_type__icontains=event_type)
        if status:
            logs = logs.filter(status__icontains=status)
        if user_email:
            logs = logs.filter(user__email__icontains=user_email)
        if start_date:
            logs = logs.filter(timestamp__gte=start_date)
        if end_date:
            logs = logs.filter(timestamp__lte=end_date)
        logs = logs.order_by('-timestamp')[:100]
        serializer = AuditLogSerializer(logs, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=["get"], url_path="export", permission_classes=[permissions.IsAdminUser])
    def export(self, request):
        logs = AuditLog.objects.all()
        # Filtres dynamiques
        event_type = request.GET.get('event_type')
        status = request.GET.get('status')
        user_email = request.GET.get('user_email')
        start_date = request.GET.get('start_date')
        end_date = request.GET.get('end_date')
        if event_type:
            logs = logs.filter(event_type__icontains=event_type)
        if status:
            logs = logs.filter(status__icontains=status)
        if user_email:
            logs = logs.filter(user__email__icontains=user_email)
        if start_date:
            logs = logs.filter(timestamp__gte=start_date)
        if end_date:
            logs = logs.filter(timestamp__lte=end_date)
        logs = logs.order_by('-timestamp')
        export_format = request.GET.get('format', 'csv')
        fields = [
            'timestamp', 'user__email', 'event_type', 'status', 'ip_address', 'geo_country', 'geo_city', 'user_agent', 'risk_score', 'metadata'
        ]
        if export_format == 'excel':
            wb = openpyxl.Workbook()
            ws = wb.active
            ws.title = "Audit Log"
            ws.append(['Date', 'Utilisateur', 'Type', 'Statut', 'IP', 'Pays', 'Ville', 'User Agent', 'Risque', 'Détails'])
            for log in logs:
                ws.append([
                    log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    getattr(log.user, 'email', ''),
                    log.event_type,
                    log.status,
                    log.ip_address,
                    log.geo_country,
                    log.geo_city,
                    log.user_agent,
                    log.risk_score,
                    str(log.metadata) if log.metadata else ''
                ])
            from io import BytesIO
            output = BytesIO()
            wb.save(output)
            output.seek(0)
            response = HttpResponse(output, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            response['Content-Disposition'] = 'attachment; filename="audit_log.xlsx"'
            return response
        else:
            response = HttpResponse(content_type='text/csv')
            response['Content-Disposition'] = 'attachment; filename="audit_log.csv"'
            writer = csv.writer(response)
            writer.writerow(['Date', 'Utilisateur', 'Type', 'Statut', 'IP', 'Pays', 'Ville', 'User Agent', 'Risque', 'Détails'])
            for log in logs:
                writer.writerow([
                    log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                    getattr(log.user, 'email', ''),
                    log.event_type,
                    log.status,
                    log.ip_address,
                    log.geo_country,
                    log.geo_city,
                    log.user_agent,
                    log.risk_score,
                    str(log.metadata) if log.metadata else ''
                ])
            return response

# ============================================================================
# ENDPOINTS MANQUANTS - CORRECTIFS
# ============================================================================

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_dashboard_stats(request):
    """Statistiques pour le tableau de bord admin."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        # Statistiques générales
        total_users = User.objects.count()
        total_technicians = Technician.objects.count()
        total_clients = Client.objects.count()
        total_requests = RepairRequest.objects.count()
        
        # Demandes par statut
        pending_requests = RepairRequest.objects.filter(status="pending").count()
        in_progress_requests = RepairRequest.objects.filter(
                status="in_progress"
            ).count()
        completed_requests = RepairRequest.objects.filter(
                status="completed"
            ).count()
        
        # Statistiques financières
        total_revenue = Payment.objects.filter(
            status='completed', 
            payment_type='client_payment'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        # Statistiques de satisfaction
        total_reviews = Review.objects.count()
        avg_rating = Review.objects.aggregate(avg=Avg('rating'))['avg'] or 0
        
        return Response({
            "total_users": total_users,
            "total_technicians": total_technicians,
            "total_clients": total_clients,
            "total_requests": total_requests,
            "pending_requests": pending_requests,
            "in_progress_requests": in_progress_requests,
            "completed_requests": completed_requests,
            "total_revenue": float(total_revenue),
            "total_reviews": total_reviews,
            "avg_rating": round(avg_rating, 1)
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_notifications(request):
    """Notifications pour les administrateurs."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        notifications = AdminNotification.objects.all().order_by('-created_at')
        
        serializer = AdminNotificationSerializer(notifications, many=True)
        return Response(serializer.data)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["POST"])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    """Marquer toutes les notifications comme lues."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        AdminNotification.objects.filter(
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return Response({"success": True})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_reviews(request):
    """Liste des avis pour les administrateurs."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        reviews = Review.objects.all().select_related('technician__user', 'client__user').order_by('-created_at')
        
        # Pagination
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        paginator = Paginator(reviews, page_size)
        reviews_page = paginator.get_page(page)
        
        serializer = ReviewSerializer(reviews_page, many=True)
        return Response({
            "results": serializer.data,
            "count": paginator.count,
            "next": reviews_page.has_next(),
            "previous": reviews_page.has_previous()
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_payments(request):
    """Liste des paiements pour les administrateurs."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        payments = Payment.objects.all().select_related('payer').order_by('-created_at')
        
        # Pagination
        page = request.query_params.get('page', 1)
        page_size = request.query_params.get('page_size', 20)
        
        paginator = Paginator(payments, page_size)
        payments_page = paginator.get_page(page)
        
        serializer = PaymentSerializer(payments_page, many=True)
        return Response({
            "results": serializer.data,
            "count": paginator.count,
            "next": payments_page.has_next(),
            "previous": payments_page.has_previous()
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_payments_stats(request):
    """Statistiques des paiements pour les administrateurs."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        # Statistiques par statut
        pending_payments = Payment.objects.filter(status="pending").count()
        completed_payments = Payment.objects.filter(status="completed").count()
        failed_payments = Payment.objects.filter(status="failed").count()
        
        # Statistiques par type
        client_payments = Payment.objects.filter(payment_type="client_payment").count()
        technician_payouts = Payment.objects.filter(payment_type="technician_payout").count()
        subscription_payments = Payment.objects.filter(payment_type="subscription").count()
        
        # Revenus totaux
        total_revenue = Payment.objects.filter(
            status='completed', 
            payment_type='client_payment'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        total_payouts = Payment.objects.filter(
            status='completed', 
            payment_type='technician_payout'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        return Response({
            "pending_payments": pending_payments,
            "completed_payments": completed_payments,
            "failed_payments": failed_payments,
            "client_payments": client_payments,
            "technician_payouts": technician_payouts,
            "subscription_payments": subscription_payments,
            "total_revenue": float(total_revenue),
            "total_payouts": float(total_payouts),
            "net_revenue": float(total_revenue - total_payouts)
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_security_alerts(request):
    """Alertes de sécurité récentes."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        # Alertes de sécurité récentes
        recent_alerts = AuditLog.objects.filter(
            risk_score__gte=80,
            timestamp__gte=timezone.now() - timedelta(days=7)
        ).order_by('-timestamp')[:10]
        
        alerts_data = []
        for alert in recent_alerts:
            alerts_data.append({
                "id": alert.id,
                "event_type": alert.event_type,
                "risk_score": alert.risk_score,
                "ip_address": alert.ip_address,
                "timestamp": alert.timestamp,
                "user": alert.user.username if alert.user else None
            })
        
        return Response({"alerts": alerts_data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_login_locations(request):
    """Localisations de connexion pour les administrateurs."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        # Connexions récentes avec géolocalisation
        recent_logins = AuditLog.objects.filter(
            event_type='login',
            status='success'
        ).order_by('-timestamp')[:50]
        
        locations_data = []
        for login in recent_logins:
            locations_data.append({
                "id": login.id,
                "user": login.user.username if login.user else None,
                "ip_address": login.ip_address,
                "location": login.location if hasattr(login, 'location') else None,
                "timestamp": login.timestamp,
                "user_agent": login.user_agent if hasattr(login, 'user_agent') else None
            })
        
        return Response({"results": locations_data})
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def system_configuration(request):
    """Configuration système."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        config = PlatformConfiguration.objects.first()
        if config:
            serializer = PlatformConfigurationSerializer(config)
            return Response(serializer.data)
        else:
            return Response({"error": "Configuration non trouvée"}, status=404)
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def technician_dashboard_data(request):
    """Données du tableau de bord pour les techniciens."""
    user = request.user
    from .models import Technician
    technician = get_technician_profile(user)
    if not technician:
        technician = Technician.objects.filter(user=user).first()
    if not technician:
        return Response({"error": "Vous n'êtes pas un technicien"}, status=403)
    try:
        assigned_requests = RepairRequest.objects.filter(technician=technician).count()
        completed_requests = RepairRequest.objects.filter(technician=technician, status="completed").count()
        pending_requests = RepairRequest.objects.filter(technician=technician, status__in=["assigned", "in_progress"]).count()
        total_earnings = Payment.objects.filter(
            technician=technician,
            status="completed",
            payment_type="technician_payout"
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        avg_rating = technician.average_rating
        return Response({
            "assigned_requests": assigned_requests,
            "completed_requests": completed_requests,
            "pending_requests": pending_requests,
            "total_earnings": float(total_earnings),
            "average_rating": avg_rating,
            "specialty": technician.specialty,
            "is_available": technician.is_available,
            "is_verified": technician.is_verified
        })
    except Exception as e:
        return Response({"error": str(e)}, status=500)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_security_stats(request):
    """Statistiques de sécurité factices pour le dashboard admin."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    # Données factices
    data = {
        "total_alerts": 0,
        "high_risk_alerts": 0,
        "medium_risk_alerts": 0,
        "low_risk_alerts": 0
    }
    return Response(data)

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def admin_security_trends(request):
    """Tendances de sécurité factices pour le dashboard admin."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    # Données factices
    data = {
        "daily_alerts": [],
        "weekly_alerts": [],
        "monthly_alerts": []
    }
    return Response(data)

@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_audit_logs(request):
    from users.models import AuditLog
    logs = AuditLog.objects.all()
    # Filtres dynamiques
    event_type = request.GET.get('event_type')
    status = request.GET.get('status')
    user_email = request.GET.get('user_email')
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    if event_type:
        logs = logs.filter(event_type__icontains=event_type)
    if status:
        logs = logs.filter(status__icontains=status)
    if user_email:
        logs = logs.filter(user__email__icontains=user_email)
    if start_date:
        logs = logs.filter(timestamp__gte=start_date)
    if end_date:
        logs = logs.filter(timestamp__lte=end_date)
    logs = logs.order_by('-timestamp')
    export_format = request.GET.get('format', 'csv')
    if export_format == 'excel':
        import openpyxl
        wb = openpyxl.Workbook()
        ws = wb.active
        ws.title = "Audit Log"
        ws.append(['Date', 'Utilisateur', 'Type', 'Statut', 'IP', 'Pays', 'Ville', 'User Agent', 'Risque', 'Détails'])
        for log in logs:
            ws.append([
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                getattr(log.user, 'email', ''),
                log.event_type,
                log.status,
                log.ip_address,
                log.geo_country,
                log.geo_city,
                log.user_agent,
                log.risk_score,
                str(log.metadata) if log.metadata else ''
            ])
        from io import BytesIO
        output = BytesIO()
        wb.save(output)
        output.seek(0)
        response = HttpResponse(output, content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
        response['Content-Disposition'] = 'attachment; filename="audit_log.xlsx"'
        return response
    else:
        import csv
        response = HttpResponse(content_type='text/csv')
        response['Content-Disposition'] = 'attachment; filename="audit_log.csv"'
        writer = csv.writer(response)
        writer.writerow(['Date', 'Utilisateur', 'Type', 'Statut', 'IP', 'Pays', 'Ville', 'User Agent', 'Risque', 'Détails'])
        for log in logs:
            writer.writerow([
                log.timestamp.strftime('%Y-%m-%d %H:%M:%S'),
                getattr(log.user, 'email', ''),
                log.event_type,
                log.status,
                log.ip_address,
                log.geo_country,
                log.geo_city,
                log.user_agent,
                log.risk_score,
                str(log.metadata) if log.metadata else ''
            ])
        return response


class ChatConversationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les conversations de chat."""
    
    serializer_class = ChatConversationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourne les conversations de l'utilisateur connecté."""
        user = self.request.user
        return ChatConversation.objects.filter(
            models.Q(client=user) | models.Q(technician=user)
        ).filter(is_active=True)
    
    @action(detail=False, methods=['post'], url_path='get_or_create', url_name='get_or_create')
    def get_or_create_conversation(self, request):
        """Récupère ou crée une conversation entre un client et un technicien."""
        client_id = request.data.get('client_id')
        technician_id = request.data.get('technician_id')
        request_id = request.data.get('request_id')
        
        if not client_id or not technician_id:
            return Response(
                {'error': 'client_id et technician_id sont requis'}, 
                status=400
            )
        
        # Vérifier que l'utilisateur connecté est soit le client soit le technicien
        user = request.user
        if user.id not in [client_id, technician_id]:
            return Response(
                {'error': 'Vous ne pouvez pas créer une conversation pour d\'autres utilisateurs'}, 
                status=403
            )
        
        # Déterminer qui est client et qui est technicien
        if user.id == client_id:
            client = user
            technician = get_object_or_404(User, id=technician_id)
        else:
            client = get_object_or_404(User, id=client_id)
            technician = user
        
        # Créer ou récupérer la conversation
        conversation, created = ChatConversation.objects.get_or_create(
            client=client,
            technician=technician,
            defaults={
                'request_id': request_id,
                'is_active': True
            }
        )
        
        # Si la conversation existe déjà, mettre à jour la demande si nécessaire
        if not created and request_id and not conversation.request_id:
            conversation.request_id = request_id
            conversation.save()
        
        serializer = self.get_serializer(conversation)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marque tous les messages comme lus pour l'utilisateur connecté."""
        conversation = self.get_object()
        user = request.user
        
        # Vérifier que l'utilisateur fait partie de la conversation
        if user not in [conversation.client, conversation.technician]:
            return Response({'error': 'Accès non autorisé'}, status=403)
        
        conversation.mark_all_as_read_for_user(user)
        return Response({'success': True, 'message': 'Messages marqués comme lus'})
    
    @action(detail=True, methods=['post'])
    def archive(self, request, pk=None):
        """Archive une conversation."""
        conversation = self.get_object()
        user = request.user
        
        # Vérifier que l'utilisateur fait partie de la conversation
        if user not in [conversation.client, conversation.technician]:
            return Response({'error': 'Accès non autorisé'}, status=403)
        
        conversation.is_active = False
        conversation.save()
        return Response({'success': True, 'message': 'Conversation archivée'})


class ChatMessageViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les messages de chat."""
    
    serializer_class = ChatMessageSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourne les messages des conversations de l'utilisateur connecté."""
        user = self.request.user
        return ChatMessage.objects.filter(
            conversation__in=ChatConversation.objects.filter(
                models.Q(client=user) | models.Q(technician=user)
            )
        )
    
    def perform_create(self, serializer):
        """Surcharge pour vérifier les permissions et marquer comme lu."""
        user = self.request.user
        conversation = serializer.validated_data['conversation']
        
        # Vérifier que l'utilisateur fait partie de la conversation
        if user not in [conversation.client, conversation.technician]:
            raise PermissionDenied("Vous ne pouvez pas envoyer de message dans cette conversation")
        
        # Créer le message
        message = serializer.save(sender=user)
        
        # Marquer automatiquement comme lu si l'utilisateur est le destinataire
        if user == conversation.client:
            other_user = conversation.technician
        else:
            other_user = conversation.client
        
        # Marquer les messages non lus de l'autre utilisateur comme lus
        conversation.messages.filter(
            sender=other_user,
            is_read=False
        ).update(is_read=True, read_at=timezone.now())
        
        return message
    
    @action(detail=False, methods=['get'])
    def conversation_messages(self, request):
        """Récupère tous les messages d'une conversation."""
        conversation_id = request.query_params.get('conversation_id')
        if not conversation_id:
            return Response({'error': 'conversation_id requis'}, status=400)
        
        try:
            conversation = ChatConversation.objects.get(id=conversation_id)
        except ChatConversation.DoesNotExist:
            return Response({'error': 'Conversation non trouvée'}, status=404)
        
        # Vérifier que l'utilisateur fait partie de la conversation
        user = request.user
        if user not in [conversation.client, conversation.technician]:
            return Response({'error': 'Accès non autorisé'}, status=403)
        
        messages = conversation.messages.all().order_by('created_at')
        serializer = self.get_serializer(messages, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marque un message spécifique comme lu."""
        message = self.get_object()
        user = request.user
        
        # Vérifier que l'utilisateur est le destinataire
        conversation = message.conversation
        if user not in [conversation.client, conversation.technician]:
            return Response({'error': 'Accès non autorisé'}, status=403)
        
        if message.sender != user:  # Ne pas marquer ses propres messages comme lus
            message.mark_as_read()
        
        return Response({'success': True})
    
    @action(detail=False, methods=['post'])
    def send_location(self, request):
        """Envoie un message de localisation."""
        conversation_id = request.data.get('conversation_id')
        latitude = request.data.get('latitude')
        longitude = request.data.get('longitude')
        
        if not all([conversation_id, latitude, longitude]):
            return Response(
                {'error': 'conversation_id, latitude et longitude sont requis'}, 
                status=400
            )
        
        try:
            conversation = ChatConversation.objects.get(id=conversation_id)
        except ChatConversation.DoesNotExist:
            return Response({'error': 'Conversation non trouvée'}, status=404)
        
        # Vérifier que l'utilisateur fait partie de la conversation
        user = request.user
        if user not in [conversation.client, conversation.technician]:
            return Response({'error': 'Accès non autorisé'}, status=403)
        
        # Créer le message de localisation
        message = ChatMessage.objects.create(
            conversation=conversation,
            sender=user,
            content=f"📍 Ma position actuelle",
            message_type='location',
            latitude=latitude,
            longitude=longitude
        )
        
        serializer = self.get_serializer(message)
        return Response(serializer.data, status=201)


class ChatMessageAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les pièces jointes de chat."""
    
    serializer_class = ChatMessageAttachmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Retourne les pièces jointes des conversations de l'utilisateur connecté."""
        user = self.request.user
        return ChatMessageAttachment.objects.filter(
            message__conversation__in=ChatConversation.objects.filter(
                models.Q(client=user) | models.Q(technician=user)
            )
        )
    
    def perform_create(self, serializer):
        """Surcharge pour vérifier les permissions."""
        user = self.request.user
        message = serializer.validated_data['message']
        conversation = message.conversation
        
        # Vérifier que l'utilisateur fait partie de la conversation
        if user not in [conversation.client, conversation.technician]:
            raise PermissionDenied("Vous ne pouvez pas ajouter des pièces jointes à cette conversation")
        
        return serializer.save()

from rest_framework.views import APIView

class ChatGetOrCreateConversationView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        client_id = request.data.get('client_id')
        technician_id = request.data.get('technician_id')
        request_id = request.data.get('request_id')

        if not client_id or not technician_id:
            return Response(
                {'error': 'client_id et technician_id sont requis'}, 
                status=400
            )

        user = request.user
        if user.id not in [int(client_id), int(technician_id)]:
            return Response(
                {'error': 'Vous ne pouvez pas créer une conversation pour d\'autres utilisateurs'}, 
                status=403
            )

        from .models import ChatConversation
        from django.contrib.auth import get_user_model
        User = get_user_model()
        if user.id == int(client_id):
            client = user
            technician = User.objects.get(id=technician_id)
        else:
            client = User.objects.get(id=client_id)
            technician = user

        conversation, created = ChatConversation.objects.get_or_create(
            client=client,
            technician=technician,
            defaults={
                'request_id': request_id,
                'is_active': True
            }
        )
        if not created and request_id and not conversation.request_id:
            conversation.request_id = request_id
            conversation.save()
        from .serializers import ChatConversationSerializer
        serializer = ChatConversationSerializer(conversation, context={'request': request})
        return Response(serializer.data)
