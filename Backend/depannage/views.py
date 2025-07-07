from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Count, F, Avg
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
)
from .models import (
    Client, Technician, RepairRequest, RequestDocument, Review, Payment, Conversation, Message, Notification, MessageAttachment, TechnicianLocation, SystemConfiguration, CinetPayPayment, PlatformConfiguration, ClientLocation
)

logger = logging.getLogger(__name__)

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
            status=status.HTTP_400_BAD_REQUEST,
        )

    # Récupérer tous les techniciens disponibles
    available_technicians = Technician.objects.filter(is_available=True)

    if not available_technicians:
        return Response(
            {"error": "Aucun technicien disponible pour le moment"},
            status=status.HTTP_404_NOT_FOUND,
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


class CinetPayViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les paiements CinetPay."""

    queryset = CinetPayPayment.objects.all()
    serializer_class = CinetPayPaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ["notify", "webhook"]:
            return [AllowAny()]
        return super().get_permissions()

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def initiate_payment(self, request):
        """Initialise un nouveau paiement CinetPay."""
        serializer = CinetPayInitiationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Récupérer la demande de réparation
                repair_request = get_object_or_404(
                    RepairRequest, id=serializer.validated_data["request_id"]
                )

                # Vérifier que l'utilisateur est le propriétaire de la demande
                if repair_request.client.user != request.user:
                    return Response(
                        {"error": "Vous n'êtes pas autorisé à payer cette demande."},
                        status=status.HTTP_403_FORBIDDEN,
                    )

                # Calculer le montant total
                amount = serializer.validated_data["amount"]
                if repair_request.is_urgent:
                    amount += 25000  # Frais d'urgence

                # Récupérer le numéro de téléphone du client (User ou Client ou body)
                phone = (
                    serializer.validated_data.get('phone')
                    or getattr(request.user, 'phone', None)
                    or getattr(request.user, 'phone_number', None)
                    or '+22300000000'
                )

                # Créer le paiement
                payment_data = {
                    "amount": amount,
                    "currency": "XOF",
                    "description": serializer.validated_data["description"],
                    "customer_name": request.user.last_name,
                    "customer_surname": request.user.first_name,
                    "customer_email": request.user.email,
                    "customer_phone_number": phone,  # Numéro dynamique ou défaut Mali
                    "customer_address": repair_request.address,
                    "customer_city": "Bamako",  # Ville du Mali
                    "customer_country": "ML",    # Code ISO du Mali
                    "customer_state": "ML",      # Code ISO du Mali
                    "customer_zip_code": "00000",
                    "request": repair_request.id,  # Passer l'ID
                    "user": request.user.id,        # Passer l'ID
                    "metadata": f"user_{request.user.id}_request_{repair_request.id}",
                    "invoice_data": {
                        "Service": repair_request.specialty_needed,
                        "Demande": f"#{repair_request.id}",
                        "Urgence": "Oui" if repair_request.is_urgent else "Non",
                    },
                }

                payment_serializer = CinetPayPaymentSerializer(data=payment_data)
                if payment_serializer.is_valid():
                    payment = payment_serializer.save()

                    # Initialiser le paiement avec CinetPay
                    cinetpay_response = self._initiate_cinetpay_payment(payment)

                    if cinetpay_response.get("success"):
                        return Response(
                            {
                                "success": True,
                                "payment_url": cinetpay_response["payment_url"],
                                "transaction_id": payment.transaction_id,
                                "amount": payment.amount,
                                "message": "Paiement initialisé avec succès",
                            }
                        )
                    else:
                        return Response(
                            {
                                "success": False,
                                "error": cinetpay_response.get(
                                    "error",
                                    "Erreur lors de l'initialisation du paiement",
                                ),
                            },
                            status=status.HTTP_400_BAD_REQUEST,
                        )
                else:
                    return Response(
                        payment_serializer.errors, status=status.HTTP_400_BAD_REQUEST
                    )

            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du paiement: {str(e)}")
                return Response(
                    {"success": False, "error": "Erreur interne du serveur"},
                    status=status.HTTP_500_INTERNAL_SERVER_ERROR,
                )
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated], url_path="initiate_subscription_payment")
    def initiate_subscription_payment(self, request):
        """Initialise un paiement CinetPay pour l'abonnement technicien."""
        user = request.user
        technician = getattr(user, 'technician_profile', None)
        if not technician:
            return Response({"error": "Seul un technicien peut initier un paiement d'abonnement."}, status=403)
        
        # Récupérer la durée depuis la requête (défaut: 1 mois)
        duration_months = request.data.get('duration_months', 1)
        if duration_months not in [1, 3, 6]:
            return Response({"error": "Durée invalide. Choisissez 1, 3 ou 6 mois."}, status=400)
        
        # Calculer le montant selon la durée
        base_amount = 5000  # Montant de base pour 1 mois
        amount = base_amount * duration_months
        
        # Messages personnalisés selon la durée
        duration_texts = {
            1: "1 mois",
            3: "3 mois",
            6: "6 mois"
        }
        
        description = f"Abonnement technicien {duration_texts[duration_months]} - Accès premium aux demandes de réparation"
        
        phone = getattr(user, 'phone', None) or getattr(user, 'phone_number', None) or '+22300000000'
        
        # Créer directement l'objet CinetPayPayment sans utiliser le serializer
        payment = CinetPayPayment(
            amount=amount,
            currency="XOF",
            description=description,
            customer_name=user.last_name,
            customer_surname=user.first_name,
            customer_email=user.email,
            customer_phone_number=phone,
            customer_address="Bamako, Mali",
            customer_city="Bamako",
            customer_country="ML",
            customer_state="ML",
            customer_zip_code="00000",
            user=user,
            metadata=f"user_{user.id}_subscription_{duration_months}months",
            invoice_data={
                "Type": "Abonnement technicien",
                "Technicien": user.get_full_name(),
                "Durée": f"{duration_months} mois"
            },
        )
        payment.transaction_id = payment.generate_transaction_id()
        payment.save()
        
        cinetpay_response = self._initiate_cinetpay_payment(payment)
        if cinetpay_response.get("success"):
            return Response({
                "success": True,
                "payment_url": cinetpay_response["payment_url"],
                "transaction_id": payment.transaction_id,
                "amount": payment.amount,
                "duration_months": duration_months,
                "message": f"Paiement d'abonnement {duration_texts[duration_months]} initialisé avec succès",
            })
        else:
            return Response({
                "success": False,
                "error": cinetpay_response.get("error", "Erreur lors de l'initialisation du paiement"),
            }, status=status.HTTP_400_BAD_REQUEST)

    def _initiate_cinetpay_payment(self, payment):
        """Initialise un paiement avec l'API CinetPay selon la documentation officielle."""
        try:
            # Configuration CinetPay depuis settings
            from django.conf import settings

            CINETPAY_CONFIG = getattr(settings, "CINETPAY_CONFIG", {})
            
            # Vérifier si les clés CinetPay sont configurées
            api_key = CINETPAY_CONFIG.get("API_KEY", "")
            site_id = CINETPAY_CONFIG.get("SITE_ID", "")
            
            # Si les clés ne sont pas configurées, retourner une réponse de test
            if not api_key or not site_id or api_key == "test_api_key_123456789" or site_id == "test_site_id_123456":
                logger.warning("Clés CinetPay non configurées - Mode test activé")
                
                # Simuler une réponse de test
                payment.payment_token = f"test_token_{payment.transaction_id}"
                payment.payment_url = f"http://127.0.0.1:5173/payment/test/{payment.transaction_id}"
                payment.save()
                
                logger.info(f"Paiement de test initialisé: {payment.transaction_id}")
                
                return {
                    "success": True,
                    "payment_url": payment.payment_url,
                    "payment_token": payment.payment_token,
                }

            # Code pour l'API CinetPay réelle (seulement si les clés sont valides)
            logger.info("Utilisation de l'API CinetPay réelle")

            # S'assurer que le montant est un multiple de 5 (requis par CinetPay)
            amount = int(payment.amount)
            if amount % 5 != 0:
                amount = ((amount // 5) + 1) * 5

            # Préparer les données pour CinetPay selon la documentation
            payload = {
                "apikey": api_key,
                "site_id": site_id,
                "transaction_id": payment.transaction_id,
                "amount": amount,
                "currency": CINETPAY_CONFIG.get("CURRENCY", "XOF"),
                "description": payment.description,
                "notify_url": f"{settings.BASE_URL}/depannage/api/cinetpay/notify/",
                "return_url": f"{settings.FRONTEND_URL}/payment/success?transaction_id={payment.transaction_id}&amount={payment.amount}",
                "channels": "ALL",
                "lang": CINETPAY_CONFIG.get("LANG", "fr"),
                "metadata": payment.metadata,
                "invoice_data": payment.invoice_data,
                # Informations client obligatoires pour carte bancaire
                "customer_id": str(payment.user.id),
                "customer_name": payment.customer_name,
                "customer_surname": payment.customer_surname,
                "customer_email": payment.customer_email,
                "customer_phone_number": payment.customer_phone_number,
                "customer_address": payment.customer_address,
                "customer_city": payment.customer_city,
                "customer_country": payment.customer_country,
                "customer_state": payment.customer_state,
                "customer_zip_code": payment.customer_zip_code,
            }

            # Log de la requête pour debug
            logger.info(f"Requête CinetPay: {payload}")

            # Envoyer la requête à CinetPay
            response = requests.post(
                CINETPAY_CONFIG.get(
                    "API_URL", "https://api-checkout.cinetpay.com/v2/payment"
                ),
                json=payload,
                headers={
                    "Content-Type": "application/json",
                    "User-Agent": "Django-CinetPay-Integration/1.0",
                },
                timeout=30,
            )

            logger.info(
                f"Réponse CinetPay - Status: {response.status_code}, Body: {response.text}"
            )

            if response.status_code == 200:
                data = response.json()

                # Vérifier le code de réponse selon la documentation
                if data.get("code") == "201":
                    # Succès - Mettre à jour le paiement
                    payment.payment_token = data["data"]["payment_token"]
                    payment.payment_url = data["data"]["payment_url"]
                    payment.save()

                    logger.info(
                        f"Paiement CinetPay initialisé avec succès: {payment.transaction_id}"
                    )

                    return {
                        "success": True,
                        "payment_url": data["data"]["payment_url"],
                        "payment_token": data["data"]["payment_token"],
                    }
                else:
                    # Erreur CinetPay
                    error_msg = f"CinetPay Error {data.get('code')}: {data.get('message', 'Erreur inconnue')}"
                    logger.error(f"Erreur CinetPay: {error_msg}")

                    return {"success": False, "error": error_msg}
            elif response.status_code == 403:
                return {
                    "success": False,
                    "error": "Erreur 403: Service non identifié ou URLs localhost non autorisées",
                }
            elif response.status_code == 429:
                return {
                    "success": False,
                    "error": "Erreur 429: Trop de requêtes. Veuillez réessayer plus tard.",
                }
            else:
                return {
                    "success": False,
                    "error": f"Erreur HTTP {response.status_code}: {response.text}",
                }

        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur de connexion à CinetPay: {str(e)}")
            return {
                "success": False,
                "error": "Erreur de connexion au service de paiement",
            }
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation CinetPay: {str(e)}")
            return {
                "success": False,
                "error": "Erreur interne lors de l'initialisation du paiement",
            }

    @action(detail=False, methods=["post"], permission_classes=[AllowAny])
    def notify(self, request):
        """Endpoint pour recevoir les notifications de paiement de CinetPay."""
        try:
            # Log de la notification reçue
            logger.info(f"Notification CinetPay reçue: {request.data}")

            # Valider les données reçues
            serializer = CinetPayNotificationSerializer(data=request.data)
            if serializer.is_valid():
                data = serializer.validated_data

                # Récupérer le paiement
                try:
                    payment = CinetPayPayment.objects.get(
                        transaction_id=data["transaction_id"]
                    )
                except CinetPayPayment.DoesNotExist:
                    logger.error(f"Paiement non trouvé: {data['transaction_id']}")
                    return Response(
                        {"error": "Paiement non trouvé"},
                        status=status.HTTP_404_NOT_FOUND,
                    )

                # Mettre à jour le statut du paiement
                if data["status"] == "ACCEPTED":
                    payment.status = "success"
                    payment.paid_at = timezone.now()
                    payment.cinetpay_transaction_id = data.get("payment_token", "")

                    # Paiement d'abonnement technicien ?
                    if payment.metadata and "subscription" in payment.metadata:
                        from .models import TechnicianSubscription, Technician
                        user = payment.user
                        technician = getattr(user, 'technician_profile', None)
                        if technician:
                            now = timezone.now()
                            
                            # Extraire la durée depuis le metadata
                            duration_months = 1  # Par défaut
                            if "_subscription_" in payment.metadata:
                                try:
                                    duration_part = payment.metadata.split("_subscription_")[1]
                                    duration_months = int(duration_part.split("months")[0])
                                except:
                                    duration_months = 1
                            
                            # Chercher l'abonnement actif ou le plus récent
                            sub = technician.subscriptions.filter(end_date__gt=now).order_by('-end_date').first()
                            if sub:
                                # Prolonger l'abonnement existant
                                sub.end_date += timedelta(days=30 * duration_months)
                                sub.payment = payment
                                sub.save()
                            else:
                                # Créer un nouvel abonnement
                                sub = technician.subscriptions.create(
                                    plan_name=f"Standard {duration_months} mois",
                                    start_date=now,
                                    end_date=now + timedelta(days=30 * duration_months),
                                    payment=payment
                                )
                            
                            # Message personnalisé selon la durée
                            duration_texts = {1: "1 mois", 3: "3 mois", 6: "6 mois"}
                            duration_text = duration_texts.get(duration_months, f"{duration_months} mois")
                            
                            Notification.objects.create(
                                recipient=user,
                                title="Abonnement renouvelé avec succès !",
                                message=f"Votre abonnement a été renouvelé pour {duration_text} jusqu'au {sub.end_date.strftime('%d/%m/%Y')}. Vous pouvez maintenant recevoir de nouvelles demandes de réparation.",
                                type="subscription_renewed",
                            )
                    else:
                        # Paiement classique (demande de réparation)
                        repair_request = payment.request
                        repair_request.status = "paid"
                        repair_request.save()
                        Notification.objects.create(
                            recipient=payment.user,
                            title="Paiement réussi",
                            message=f"Votre paiement de {payment.amount} FCFA a été effectué avec succès.",
                            type="payment_success",
                        )
                    # ENVOI EMAIL DE CONFIRMATION MALI
                    try:
                        subject = "Paiement reçu – Merci pour votre confiance !"
                        message = (
                            f"Bonjour {payment.customer_name},\n\n"
                            f"Votre paiement de {payment.amount} FCFA a bien été reçu pour la demande #{repair_request.id} à Bamako/Mali.\n"
                            f"Un technicien malien vous contactera sous peu pour planifier l'intervention.\n\n"
                            f"Contact support : +223 XX XX XX XX (WhatsApp disponible)\n"
                            f"Merci d'avoir choisi [Votre Service]."
                        )
                        send_mail(
                            subject,
                            message,
                            'no-reply@votreservice.ml',  # À personnaliser
                            [payment.customer_email],
                            fail_silently=True,
                        )
                        logger.info(f"Email de confirmation envoyé à {payment.customer_email}")
                    except Exception as e:
                        logger.error(f"Erreur lors de l'envoi de l'email de confirmation: {e}")

                    # ENVOI SMS DE CONFIRMATION (Twilio ou à adapter)
                    try:
                        if TwilioClient:
                            twilio_sid = os.getenv('TWILIO_ACCOUNT_SID')
                            twilio_token = os.getenv('TWILIO_AUTH_TOKEN')
                            twilio_from = os.getenv('TWILIO_FROM_NUMBER', '+15017122661')
                            if twilio_sid and twilio_token:
                                client = TwilioClient(twilio_sid, twilio_token)
                                sms_body = (
                                    f"[Votre Service] Paiement reçu !\n"
                                    f"Montant : {payment.amount} FCFA\n"
                                    f"Demande #{repair_request.id} à Bamako.\n"
                                    f"Merci pour votre confiance."
                                )
                                client.messages.create(
                                    body=sms_body,
                                    from_=twilio_from,
                                    to=payment.customer_phone_number
                                )
                                logger.info(f"SMS de confirmation envoyé à {payment.customer_phone_number}")
                            else:
                                logger.warning("Twilio non configuré (TWILIO_ACCOUNT_SID/TOKEN)")
                        else:
                            logger.warning("TwilioClient non importé (twilio non installé)")
                    except Exception as e:
                        logger.error(f"Erreur lors de l'envoi du SMS de confirmation: {e}")

                elif data["status"] == "REFUSED":
                    payment.status = "failed"
                    Notification.objects.create(
                        recipient=payment.user,
                        title="Paiement échoué",
                        message="Votre paiement a échoué. Veuillez réessayer.",
                        type="payment_failed",
                    )

                payment.save()

                return Response({"success": True})
            else:
                logger.error(f"Données de notification invalides: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        except Exception as e:
            logger.error(f"Erreur lors du traitement de la notification: {str(e)}")
            return Response(
                {"error": "Erreur interne"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )

    @action(detail=True, methods=["get"], permission_classes=[IsAuthenticated])
    def check_status(self, request, pk=None):
        """Vérifie le statut d'un paiement."""
        payment = self.get_object()

        # Vérifier que l'utilisateur est autorisé
        if payment.user != request.user:
            return Response({"error": "Non autorisé"}, status=status.HTTP_403_FORBIDDEN)

        return Response(
            {
                "transaction_id": payment.transaction_id,
                "status": payment.status,
                "amount": payment.amount,
                "currency": payment.currency,
                "created_at": payment.created_at,
                "paid_at": payment.paid_at,
            }
        )

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def my_payments(self, request):
        """Récupère tous les paiements de l'utilisateur connecté."""
        payments = CinetPayPayment.objects.filter(user=request.user).order_by(
            "-created_at"
        )
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)


class RepairRequestViewSet(viewsets.ModelViewSet):
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
        status = data.get('status', RepairRequest.Status.PENDING)
        repair_request = serializer.save(client=client, **data)

        if status == RepairRequest.Status.DRAFT:
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
        ).exclude(id=technician.id)
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
                message=f"La demande #{repair_request.id} a été acceptée par un autre technicien.",
                type="request_taken",
                request=repair_request,
            )

        # Notifier les admins
        from users.models import User
        admin_users = User.objects.filter(is_staff=True, is_active=True)
        for admin in admin_users:
            Notification.objects.create(
                recipient=admin,
                title="Demande acceptée par un technicien",
                message=f"La demande #{repair_request.id} a été acceptée par {technician.user.get_full_name()}",
                type="request_accepted",
                request=repair_request,
            )

        # Retourne la réponse complète avec l'ID
        response_serializer = RepairRequestSerializer(repair_request, context={'request': self.request})
        self.response = Response(response_serializer.data, status=status.HTTP_201_CREATED)

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
                {"error": "ID du technicien requis"}, status=status.HTTP_400_BAD_REQUEST
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
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if technician.specialty != repair_request.specialty_needed:
                    logger.warning(f"Spécialité non correspondante: {technician.specialty} vs {repair_request.specialty_needed}")
                    return Response(
                        {
                            "error": "Ce technicien ne correspond pas à la spécialité requise"
                        },
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            # Cas technicien : auto-assignation ou refus
            elif user.user_type == "technician" and technician.user == user:
                logger.info(f"Action par technicien: {action}")
                if repair_request.status != "pending":
                    logger.warning(f"Demande non en attente: {repair_request.status}")
                    return Response(
                        {"error": "Seules les demandes en attente peuvent être traitées."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if technician.specialty != repair_request.specialty_needed:
                    logger.warning(f"Spécialité technicien non correspondante: {technician.specialty} vs {repair_request.specialty_needed}")
                    return Response(
                        {"error": "Vous ne correspondez pas à la spécialité requise."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
                if not technician.is_available:
                    logger.warning(f"Technicien {technician.id} non disponible")
                    return Response(
                        {"error": "Vous n'êtes pas disponible."},
                        status=status.HTTP_400_BAD_REQUEST,
                    )
            else:
                logger.error(f"Non autorisé - User type: {user.user_type}, Technician user: {technician.user.id if technician else 'None'}")
                return Response(
                    {"error": "Non autorisé."}, status=status.HTTP_403_FORBIDDEN
                )

            # Traiter l'action
            if action == "refuse":
                # Refuser la demande
                repair_request.status = "refused"
                repair_request.save()
                
                logger.info(f"Demande {repair_request.id} refusée par le technicien {technician.user.get_full_name()}")

                # Envoyer notification au client
                Notification.objects.create(
                    recipient=repair_request.client.user,
                    title="Demande refusée",
                    message=f"Votre demande #{repair_request.id} a été refusée par un technicien.",
                    type="request_refused",
                )

                # Créer un message automatique
                conversation = repair_request.conversation
                Message.objects.create(
                    conversation=conversation,
                    sender=user,
                    content="La demande a été refusée par un technicien",
                    message_type="system",
                )

                return Response(
                    {
                        "success": True,
                        "message": "Demande refusée avec succès",
                    }
                )
            else:
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
                ).exclude(id=technician.id)
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
                        message=f"La demande #{repair_request.id} a été acceptée par un autre technicien.",
                        type="request_taken",
                        request=repair_request,
                    )

                # Notifier les admins
                from users.models import User
                admin_users = User.objects.filter(is_staff=True, is_active=True)
                for admin in admin_users:
                    Notification.objects.create(
                        recipient=admin,
                        title="Demande acceptée par un technicien",
                        message=f"La demande #{repair_request.id} a été acceptée par {technician.user.get_full_name()}",
                        type="request_accepted",
                        request=repair_request,
                    )

                return Response(
                    {
                        "success": True,
                        "message": f"Technicien {technician.user.get_full_name()} assigné avec succès",
                    }
                )

        except Technician.DoesNotExist:
            logger.error(f"Technicien avec ID {technician_id} non trouvé")
            return Response(
                {"error": "Technicien non trouvé"}, status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=True, methods=["post"], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        """Met à jour le statut d'une demande."""
        repair_request = self.get_object()
        user = request.user
        new_status = request.data.get("status")

        if not new_status:
            return Response(
                {"error": "Nouveau statut requis"}, status=status.HTTP_400_BAD_REQUEST
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
            # Technicien assigné OU technicien de la spécialité sur une demande en attente
            can_update = True
        elif user.user_type == "client" and repair_request.client.user == user:
            # Les clients peuvent seulement annuler
            can_update = new_status == "cancelled"

        if not can_update:
            return Response(
                {"error": "Vous n'êtes pas autorisé à modifier cette demande"},
                status=status.HTTP_403_FORBIDDEN,
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
                {"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN
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
                {"error": "Accès non autorisé"}, status=status.HTTP_403_FORBIDDEN
            )

        if not specialty:
            return Response(
                {"error": "Spécialité requise"}, status=status.HTTP_400_BAD_REQUEST
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

    def create(self, request, *args, **kwargs):
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
        return Response(response_serializer.data, status=status.HTTP_201_CREATED, headers=headers)

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
            # Les clients peuvent seulement annuler
            can_update = new_status == "cancelled"
            logger.info(f"Client autorisé à annuler sa demande: {can_update}")

        if not can_update:
            logger.error(f"Utilisateur {user.id} non autorisé à modifier la demande {repair_request.id}")
            return Response(
                {"error": "Vous n'êtes pas autorisé à modifier cette demande"},
                status=status.HTTP_403_FORBIDDEN,
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
        """Retourne le statut détaillé de l'abonnement du technicien."""
        user = request.user
        if not hasattr(user, "technician_profile"):
            return Response({"error": "Vous n'êtes pas un technicien."}, status=403)
        
        technician = user.technician_profile
        now = timezone.now()
        
        # Récupérer l'abonnement actif
        active_subscription = technician.subscriptions.filter(
            end_date__gt=now,
            is_active=True
        ).order_by('-end_date').first()
        
        # Récupérer l'historique des paiements
        payments = Payment.objects.filter(payer=user).order_by('-created_at')[:10]
        
        # Calculer les jours restants
        days_remaining = 0
        if active_subscription:
            days_remaining = (active_subscription.end_date - now).days
        
        # Déterminer le statut
        status = 'active'
        if not active_subscription:
            status = 'expired'
        elif days_remaining <= 7:
            status = 'warning'
        elif days_remaining <= 3:
            status = 'critical'
        
        # Créer une notification si l'abonnement expire bientôt
        if active_subscription and days_remaining <= 7 and days_remaining > 0:
            existing_notification = Notification.objects.filter(
                recipient=user,
                type='subscription_expiry',
                is_read=False
            ).first()
            
            if not existing_notification:
                Notification.objects.create(
                    recipient=user,
                    title="Abonnement expirant",
                    message=f"Votre abonnement expire dans {days_remaining} jour(s). Renouvelez-le pour continuer à recevoir des demandes.",
                    type="subscription_expiry"
                )
        
        return Response({
            'status': status,
            'subscription': active_subscription,
            'days_remaining': days_remaining,
            'payments': PaymentSerializer(payments, many=True).data,
            'can_receive_requests': active_subscription is not None
        })

    @action(detail=False, methods=["post"], permission_classes=[IsAuthenticated])
    def renew_subscription(self, request):
        """Permet au technicien de renouveler son abonnement (1 mois par défaut)."""
        user = request.user
        try:
            technician = Technician.objects.get(user=user)
        except Technician.DoesNotExist:
            return Response({"error": "Technicien introuvable"}, status=404)
        
        # Récupérer les paramètres de paiement
        payment_method = request.data.get('payment_method', 'mobile_money')
        phone_number = request.data.get('phone_number', '')
        
        # Chercher l'abonnement actif ou le plus récent
        now = timezone.now()
        sub = technician.subscriptions.filter(end_date__gt=now).order_by('-end_date').first()
        
        if sub:
            # Prolonger l'abonnement existant
            sub.end_date += timedelta(days=30)
            sub.save()
        else:
            # Créer un nouvel abonnement
            sub = technician.subscriptions.create(
                plan_name="Standard",
                start_date=now,
                end_date=now + timedelta(days=30)
            )
        
        # Créer un paiement
        payment = Payment.objects.create(
            payer=user,
            amount=5000,  # Montant standard
            payment_method=payment_method,
            status='pending',
            description=f"Renouvellement abonnement {sub.plan_name}"
        )
        
        return Response({
            "success": True,
            "subscription": {
                "plan": sub.plan_name,
                "start_date": sub.start_date,
                "end_date": sub.end_date,
                "is_active": sub.is_active,
                "amount": 5000
            },
            "payment": {
                "id": payment.id,
                "status": payment.status
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
        try:
            technician = Technician.objects.get(user=user)
            serializer = self.get_serializer(technician)
            return Response(serializer.data)
        except Technician.DoesNotExist:
            return Response({"error": "Technicien introuvable"}, status=404)


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

    def get_queryset(self):
        if self.request.user.is_staff:
            return Review.objects.all()
        return Review.objects.filter(client__user=self.request.user)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def received(self, request):
        """Retourne la liste des avis reçus par le technicien connecté."""
        user = request.user
        if not hasattr(user, "technician_profile"):
            return Response({"error": "Vous n'êtes pas un technicien."}, status=403)
        technician = user.technician_profile
        reviews = Review.objects.filter(technician=technician).order_by("-created_at")
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)

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
        
        # Sérialiser avec les informations nécessaires pour la page de notation
        data = []
        for request in completed_requests:
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
        
        return Response(data)

    @action(detail=False, methods=["get"], permission_classes=[IsAuthenticated])
    def statistics(self, request):
        """Retourne les statistiques des avis pour l'utilisateur connecté."""
        user = request.user
        
        if hasattr(user, "technician_profile"):
            # Statistiques pour un technicien
            technician = user.technician_profile
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
        if not hasattr(user, "technician_profile"):
            return Response({"error": "Vous n'êtes pas un technicien."}, status=403)
        
        technician = user.technician_profile
        reviews = Review.objects.filter(technician=technician)
        
        # Calculer les statistiques
        avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0
        total_reviews = reviews.count()
        recommendation_rate = reviews.filter(would_recommend=True).count() / total_reviews * 100 if total_reviews > 0 else 0
        completed_jobs = RepairRequest.objects.filter(technician=technician, status='completed').count()
        
        # Calculer les récompenses
        rewards = {
            'current_level': 'bronze',
            'next_level': 'silver',
            'progress_to_next': 0,
            'bonuses': [],
            'achievements': []
        }
        
        # Déterminer le niveau actuel
        if avg_rating >= 4.8 and total_reviews >= 50 and recommendation_rate >= 95:
            rewards['current_level'] = 'platinum'
            rewards['next_level'] = None
        elif avg_rating >= 4.5 and total_reviews >= 30 and recommendation_rate >= 90:
            rewards['current_level'] = 'gold'
            rewards['next_level'] = 'platinum'
            rewards['progress_to_next'] = min(100, (avg_rating - 4.5) / 0.3 * 100)
        elif avg_rating >= 4.2 and total_reviews >= 20 and recommendation_rate >= 85:
            rewards['current_level'] = 'silver'
            rewards['next_level'] = 'gold'
            rewards['progress_to_next'] = min(100, (avg_rating - 4.2) / 0.3 * 100)
        elif avg_rating >= 3.8 and total_reviews >= 10:
            rewards['current_level'] = 'bronze'
            rewards['next_level'] = 'silver'
            rewards['progress_to_next'] = min(100, (avg_rating - 3.8) / 0.4 * 100)
        else:
            rewards['current_level'] = 'new'
            rewards['next_level'] = 'bronze'
            rewards['progress_to_next'] = min(100, total_reviews / 10 * 100)
        
        # Calculer les bonus
        if avg_rating >= 4.5:
            rewards['bonuses'].append({
                'type': 'rating_bonus',
                'title': 'Bonus Note Exceptionnelle',
                'description': f'Bonus de 10% pour votre note de {avg_rating:.1f}/5',
                'value': '10%'
            })
        
        if recommendation_rate >= 95:
            rewards['bonuses'].append({
                'type': 'recommendation_bonus',
                'title': 'Bonus Recommandation',
                'description': f'Bonus de 5% pour {recommendation_rate:.0f}% de recommandation',
                'value': '5%'
            })
        
        if completed_jobs >= 100:
            rewards['bonuses'].append({
                'type': 'experience_bonus',
                'title': 'Bonus Expérience',
                'description': f'Bonus de 15% pour {completed_jobs} missions terminées',
                'value': '15%'
            })
        
        # Déterminer les achievements
        if total_reviews >= 50:
            rewards['achievements'].append({
                'title': 'Critique Expert',
                'description': '50+ avis reçus',
                'icon': '🏆'
            })
        
        if avg_rating >= 4.8:
            rewards['achievements'].append({
                'title': 'Perfectionniste',
                'description': 'Note moyenne de 4.8+',
                'icon': '💎'
            })
        
        if recommendation_rate >= 98:
            rewards['achievements'].append({
                'title': 'Hautement Recommandé',
                'description': '98%+ de recommandation',
                'icon': '⭐'
            })
        
        return Response(rewards)


class PaymentViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les paiements."""

    queryset = Payment.objects.all()
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return Payment.objects.all()
        return Payment.objects.filter(payer=self.request.user)


class ConversationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les conversations."""

    queryset = Conversation.objects.all()
    serializer_class = ConversationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return Conversation.objects.filter(participants=self.request.user)


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
            return Response({"error": "Format attendu: {'ids': [1,2,3]}"}, status=status.HTTP_400_BAD_REQUEST)
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

    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)

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

    def get_queryset(self):
        if self.request.user.is_staff:
            return TechnicianLocation.objects.all()
        return TechnicianLocation.objects.filter(technician__user=self.request.user)


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
            
            # Validation des paramètres
            if not lat or not lng:
                return Response({
                    'error': 'Les paramètres lat et lng sont requis'
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                lat = float(lat)
                lng = float(lng)
            except ValueError:
                return Response({
                    'error': 'Les coordonnées lat et lng doivent être des nombres'
                }, status=status.HTTP_400_BAD_REQUEST)
            
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
                # Récupérer la localisation du technicien
                try:
                    location = technician.location
                    if location:
                        # Calculer la distance avec la formule de Haversine
                        distance = self.calculate_haversine_distance(
                            lat, lng, location.latitude, location.longitude
                        )
                        
                        # Filtrer par rayon de recherche
                        if distance <= search_radius:
                            technician.distance_km = round(distance, 2)
                            technicians_with_distance.append(technician)
                except TechnicianLocation.DoesNotExist:
                    # Si pas de localisation, on peut utiliser une distance par défaut
                    # ou ignorer le technicien
                    continue
            
            # Trier par distance croissante
            technicians_with_distance.sort(key=lambda x: x.distance_km)
            
            # Limiter le nombre de résultats (optionnel)
            max_results = 20
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
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
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
            return Response(GroupSerializer(group).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

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
        return Response(status=status.HTTP_204_NO_CONTENT)

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
        return Response({'detail': 'Création non autorisée.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

    def destroy(self, request, *args, **kwargs):
        return Response({'detail': 'Suppression non autorisée.'}, status=status.HTTP_405_METHOD_NOT_ALLOWED)

class ClientLocationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les localisations des clients."""
    queryset = ClientLocation.objects.all()
    serializer_class = ClientLocationSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        if self.request.user.is_staff:
            return ClientLocation.objects.all()
        return ClientLocation.objects.filter(client__user=self.request.user)
