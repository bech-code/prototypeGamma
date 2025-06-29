from django.shortcuts import render
from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.conf import settings
from django.utils import timezone
from django.db.models import Q, Count
import requests
import json
import logging
from decimal import Decimal

from .models import (
    Client, Technician, RepairRequest, RequestDocument, Review, 
    Payment, Conversation, Message, MessageAttachment, 
    Notification, TechnicianLocation, SystemConfiguration, CinetPayPayment
)
from .serializers import (
    ClientSerializer, TechnicianSerializer, RepairRequestSerializer, 
    RequestDocumentSerializer, ReviewSerializer, PaymentSerializer,
    ConversationSerializer, MessageSerializer, MessageAttachmentSerializer,
    NotificationSerializer, TechnicianLocationSerializer, SystemConfigurationSerializer,
    CinetPayPaymentSerializer, CinetPayInitiationSerializer, CinetPayNotificationSerializer,
    RepairRequestCreateSerializer
)

logger = logging.getLogger(__name__)

# ============================================================================
# VUES DE TEST PUBLIQUES
# ============================================================================

class PublicTestViewSet(viewsets.ViewSet):
    """ViewSet pour les tests publics de l'API."""
    permission_classes = [AllowAny]
    
    @action(detail=False, methods=['get'])
    def health_check(self, request):
        """Vérification de santé de l'API."""
        return Response({
            'status': 'healthy',
            'message': 'API DepanneTeliman fonctionne correctement',
            'timestamp': timezone.now().isoformat(),
            'version': '1.0.0'
        })
    
    @action(detail=False, methods=['get'])
    def api_info(self, request):
        """Informations sur l'API."""
        return Response({
            'name': 'DepanneTeliman API',
            'description': 'API pour la gestion des services de dépannage',
            'endpoints': {
                'auth': '/users/login/',
                'register': '/users/register/',
                'repair_requests': '/depannage/api/repair-requests/',
                'technicians': '/depannage/api/technicians/',
                'clients': '/depannage/api/clients/',
                'admin': '/admin/'
            },
            'authentication': 'JWT (Bearer Token)',
            'documentation': 'Consultez les endpoints pour plus d\'informations'
        })

# ============================================================================
# VIEWSETS EXISTANTES
# ============================================================================

class CinetPayViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les paiements CinetPay."""
    queryset = CinetPayPayment.objects.all()
    serializer_class = CinetPayPaymentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_permissions(self):
        if self.action in ['notify', 'webhook']:
            return [AllowAny()]
        return super().get_permissions()
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def initiate_payment(self, request):
        """Initialise un nouveau paiement CinetPay."""
        serializer = CinetPayInitiationSerializer(data=request.data)
        if serializer.is_valid():
            try:
                # Récupérer la demande de réparation
                repair_request = get_object_or_404(RepairRequest, id=serializer.validated_data['request_id'])
                
                # Vérifier que l'utilisateur est le propriétaire de la demande
                if repair_request.client.user != request.user:
                    return Response(
                        {'error': 'Vous n\'êtes pas autorisé à payer cette demande.'},
                        status=status.HTTP_403_FORBIDDEN
                    )
                
                # Calculer le montant total
                amount = serializer.validated_data['amount']
                if repair_request.is_urgent:
                    amount += 25000  # Frais d'urgence
                
                # Créer le paiement
                payment_data = {
                    'amount': amount,
                    'currency': 'XOF',
                    'description': serializer.validated_data['description'],
                    'customer_name': request.user.last_name,
                    'customer_surname': request.user.first_name,
                    'customer_email': request.user.email,
                    'customer_phone_number': request.user.phone_number or '+225000000000',
                    'customer_address': repair_request.address,
                    'customer_city': 'Abidjan',  # À adapter selon vos besoins
                    'customer_country': 'CI',
                    'customer_state': 'CI',
                    'customer_zip_code': '00000',
                    'request': repair_request,
                    'user': request.user,
                    'metadata': f"user_{request.user.id}_request_{repair_request.id}",
                    'invoice_data': {
                        'Service': repair_request.specialty_needed,
                        'Demande': f"#{repair_request.id}",
                        'Urgence': 'Oui' if repair_request.is_urgent else 'Non'
                    }
                }
                
                payment_serializer = CinetPayPaymentSerializer(data=payment_data)
                if payment_serializer.is_valid():
                    payment = payment_serializer.save()
                    
                    # Initialiser le paiement avec CinetPay
                    cinetpay_response = self._initiate_cinetpay_payment(payment)
                    
                    if cinetpay_response.get('success'):
                        return Response({
                            'success': True,
                            'payment_url': cinetpay_response['payment_url'],
                            'transaction_id': payment.transaction_id,
                            'amount': payment.amount,
                            'message': 'Paiement initialisé avec succès'
                        })
                    else:
                        return Response({
                            'success': False,
                            'error': cinetpay_response.get('error', 'Erreur lors de l\'initialisation du paiement')
                        }, status=status.HTTP_400_BAD_REQUEST)
                else:
                    return Response(payment_serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                    
            except Exception as e:
                logger.error(f"Erreur lors de l'initialisation du paiement: {str(e)}")
                return Response({
                    'success': False,
                    'error': 'Erreur interne du serveur'
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        else:
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    def _initiate_cinetpay_payment(self, payment):
        """Initialise un paiement avec l'API CinetPay selon la documentation officielle."""
        try:
            # Configuration CinetPay depuis settings
            from django.conf import settings
            CINETPAY_CONFIG = getattr(settings, 'CINETPAY_CONFIG', {})
            
            # S'assurer que le montant est un multiple de 5 (requis par CinetPay)
            amount = int(payment.amount)
            if amount % 5 != 0:
                amount = ((amount // 5) + 1) * 5
            
            # Préparer les données pour CinetPay selon la documentation
            payload = {
                'apikey': CINETPAY_CONFIG.get('API_KEY', ''),
                'site_id': CINETPAY_CONFIG.get('SITE_ID', ''),
                'transaction_id': payment.transaction_id,
                'amount': amount,
                'currency': CINETPAY_CONFIG.get('CURRENCY', 'XOF'),
                'description': payment.description,
                'notify_url': f"{settings.BASE_URL}/depannage/api/cinetpay/notify/",
                'return_url': f"{settings.FRONTEND_URL}/payment",
                'channels': 'ALL',
                'lang': CINETPAY_CONFIG.get('LANG', 'fr'),
                'metadata': payment.metadata,
                'invoice_data': payment.invoice_data,
                # Informations client obligatoires pour carte bancaire
                'customer_id': str(payment.user.id),
                'customer_name': payment.customer_name,
                'customer_surname': payment.customer_surname,
                'customer_email': payment.customer_email,
                'customer_phone_number': payment.customer_phone_number,
                'customer_address': payment.customer_address,
                'customer_city': payment.customer_city,
                'customer_country': payment.customer_country,
                'customer_state': payment.customer_state,
                'customer_zip_code': payment.customer_zip_code,
            }
            
            # Log de la requête pour debug
            logger.info(f"Requête CinetPay: {payload}")
            
            # Envoyer la requête à CinetPay
            response = requests.post(
                CINETPAY_CONFIG.get('API_URL', 'https://api-checkout.cinetpay.com/v2/payment'),
                json=payload,
                headers={
                    'Content-Type': 'application/json',
                    'User-Agent': 'Django-CinetPay-Integration/1.0'
                },
                timeout=30
            )
            
            logger.info(f"Réponse CinetPay - Status: {response.status_code}, Body: {response.text}")
            
            if response.status_code == 200:
                data = response.json()
                
                # Vérifier le code de réponse selon la documentation
                if data.get('code') == '201':
                    # Succès - Mettre à jour le paiement
                    payment.payment_token = data['data']['payment_token']
                    payment.payment_url = data['data']['payment_url']
                    payment.save()
                    
                    logger.info(f"Paiement CinetPay initialisé avec succès: {payment.transaction_id}")
                    
                    return {
                        'success': True,
                        'payment_url': data['data']['payment_url'],
                        'payment_token': data['data']['payment_token']
                    }
                else:
                    # Erreur CinetPay
                    error_msg = f"CinetPay Error {data.get('code')}: {data.get('message', 'Erreur inconnue')}"
                    logger.error(f"Erreur CinetPay: {error_msg}")
                    
                    return {
                        'success': False,
                        'error': error_msg
                    }
            elif response.status_code == 403:
                return {
                    'success': False,
                    'error': 'Erreur 403: Service non identifié ou URLs localhost non autorisées'
                }
            elif response.status_code == 429:
                return {
                    'success': False,
                    'error': 'Erreur 429: Trop de requêtes. Veuillez réessayer plus tard.'
                }
            else:
                return {
                    'success': False,
                    'error': f"Erreur HTTP {response.status_code}: {response.text}"
                }
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Erreur de connexion à CinetPay: {str(e)}")
            return {
                'success': False,
                'error': 'Erreur de connexion au service de paiement'
            }
        except Exception as e:
            logger.error(f"Erreur lors de l'initialisation CinetPay: {str(e)}")
            return {
                'success': False,
                'error': 'Erreur interne lors de l\'initialisation du paiement'
            }
    
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
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
                    payment = CinetPayPayment.objects.get(transaction_id=data['transaction_id'])
                except CinetPayPayment.DoesNotExist:
                    logger.error(f"Paiement non trouvé: {data['transaction_id']}")
                    return Response({'error': 'Paiement non trouvé'}, status=status.HTTP_404_NOT_FOUND)
                
                # Mettre à jour le statut du paiement
                if data['status'] == 'ACCEPTED':
                    payment.status = 'success'
                    payment.paid_at = timezone.now()
                    payment.cinetpay_transaction_id = data.get('payment_token', '')
                    
                    # Mettre à jour la demande de réparation
                    repair_request = payment.request
                    repair_request.status = 'paid'
                    repair_request.save()
                    
                    # Créer une notification
                    Notification.objects.create(
                        recipient=payment.user,
                        title="Paiement réussi",
                        message=f"Votre paiement de {payment.amount} FCFA a été effectué avec succès.",
                        type="payment_success"
                    )
                    
                elif data['status'] == 'REFUSED':
                    payment.status = 'failed'
                    
                    # Créer une notification
                    Notification.objects.create(
                        recipient=payment.user,
                        title="Paiement échoué",
                        message="Votre paiement a échoué. Veuillez réessayer.",
                        type="payment_failed"
                    )
                
                payment.save()
                
                return Response({'success': True})
            else:
                logger.error(f"Données de notification invalides: {serializer.errors}")
                return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            logger.error(f"Erreur lors du traitement de la notification: {str(e)}")
            return Response({'error': 'Erreur interne'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    @action(detail=True, methods=['get'], permission_classes=[IsAuthenticated])
    def check_status(self, request, pk=None):
        """Vérifie le statut d'un paiement."""
        payment = self.get_object()
        
        # Vérifier que l'utilisateur est autorisé
        if payment.user != request.user:
            return Response({'error': 'Non autorisé'}, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            'transaction_id': payment.transaction_id,
            'status': payment.status,
            'amount': payment.amount,
            'currency': payment.currency,
            'created_at': payment.created_at,
            'paid_at': payment.paid_at
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_payments(self, request):
        """Récupère tous les paiements de l'utilisateur connecté."""
        payments = CinetPayPayment.objects.filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(payments, many=True)
        return Response(serializer.data)

class RepairRequestViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les demandes de réparation."""
    serializer_class = RepairRequestSerializer
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        """Retourne le serializer approprié selon l'action."""
        if self.action == 'create':
            return RepairRequestCreateSerializer
        return RepairRequestSerializer
    
    def get_queryset(self):
        """Filtre les demandes selon le type d'utilisateur."""
        user = self.request.user
        
        if user.user_type == 'admin':
            # Admin voit toutes les demandes
            return RepairRequest.objects.all().order_by('-created_at')
        elif user.user_type == 'technician':
            # Technicien voit ses demandes assignées et les demandes de sa spécialité
            technician = get_object_or_404(Technician, user=user)
            return RepairRequest.objects.filter(
                Q(technician=technician) | 
                Q(specialty_needed=technician.specialty, status='pending')
            ).order_by('-created_at')
        else:
            # Client voit ses propres demandes
            client = get_object_or_404(Client, user=user)
            return RepairRequest.objects.filter(client=client).order_by('-created_at')
    
    def perform_create(self, serializer):
        """Crée une nouvelle demande et envoie les notifications."""
        user = self.request.user
        
        # Créer ou récupérer le profil client
        client, created = Client.objects.get_or_create(
            user=user,
            defaults={
                'address': self.request.data.get('address', 'Adresse non spécifiée'),
                'phone': user.phone_number if hasattr(user, 'phone_number') else '',
                'is_active': True
            }
        )
        
        # Préparer les données pour la création
        data = serializer.validated_data.copy()
        
        # Mapper les champs du frontend vers le modèle
        if 'service_type' in data:
            data['specialty_needed'] = data.pop('service_type')
        
        # Créer un titre si non fourni
        if 'title' not in data or not data['title']:
            service_name = data.get('specialty_needed', 'Service')
            data['title'] = f"Demande de {service_name}"
        
        # Créer la demande
        repair_request = serializer.save(client=client, **data)
        
        # Créer une conversation pour cette demande
        conversation = Conversation.objects.create(
            request=repair_request,
            is_active=True
        )
        conversation.participants.add(user)
        
        # Envoyer notification à l'admin
        from users.models import User
        admin_users = User.objects.filter(is_staff=True, is_active=True)
        for admin in admin_users:
            Notification.objects.create(
                recipient=admin,
                title="Nouvelle demande de réparation",
                message=f"Nouvelle demande #{repair_request.id} - {repair_request.specialty_needed}",
                type="new_request"
            )
        
        # Envoyer notification aux techniciens de la spécialité
        technicians = Technician.objects.filter(
            specialty=repair_request.specialty_needed,
            is_available=True,
            is_verified=True
        )
        for technician in technicians:
            Notification.objects.create(
                recipient=technician.user,
                title="Nouvelle demande dans votre spécialité",
                message=f"Demande #{repair_request.id} - {repair_request.title}",
                type="new_request_technician"
            )
        
        # Créer un message automatique
        Message.objects.create(
            conversation=conversation,
            sender=user,
            content=f"Demande créée le {timezone.now().strftime('%d/%m/%Y à %H:%M')}",
            message_type="system"
        )
        
        logger.info(f"Nouvelle demande créée: {repair_request.id} par {user.username}")
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def assign_technician(self, request, pk=None):
        """Assigne un technicien à une demande (Admin seulement)."""
        repair_request = self.get_object()
        user = request.user
        
        if user.user_type != 'admin':
            return Response(
                {'error': 'Seuls les administrateurs peuvent assigner des techniciens'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        technician_id = request.data.get('technician_id')
        if not technician_id:
            return Response(
                {'error': 'ID du technicien requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            technician = Technician.objects.get(id=technician_id)
            
            # Vérifier que le technicien est disponible et de la bonne spécialité
            if not technician.is_available:
                return Response(
                    {'error': 'Ce technicien n\'est pas disponible'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if technician.specialty != repair_request.specialty_needed:
                return Response(
                    {'error': 'Ce technicien ne correspond pas à la spécialité requise'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Assigner le technicien
            repair_request.technician = technician
            repair_request.status = 'assigned'
            repair_request.assigned_at = timezone.now()
            repair_request.save()
            
            # Ajouter le technicien à la conversation
            conversation = repair_request.conversation
            conversation.participants.add(technician.user)
            
            # Envoyer notification au technicien
            Notification.objects.create(
                recipient=technician.user,
                title="Nouvelle demande assignée",
                message=f"Vous avez été assigné à la demande #{repair_request.id}",
                type="request_assigned"
            )
            
            # Envoyer notification au client
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Technicien assigné",
                message=f"Un technicien a été assigné à votre demande #{repair_request.id}",
                type="technician_assigned"
            )
            
            # Créer un message automatique
            Message.objects.create(
                conversation=conversation,
                sender=request.user,
                content=f"Technicien {technician.user.get_full_name()} assigné à cette demande",
                message_type="system"
            )
            
            return Response({
                'success': True,
                'message': f'Technicien {technician.user.get_full_name()} assigné avec succès'
            })
            
        except Technician.DoesNotExist:
            return Response(
                {'error': 'Technicien non trouvé'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def update_status(self, request, pk=None):
        """Met à jour le statut d'une demande."""
        repair_request = self.get_object()
        user = request.user
        new_status = request.data.get('status')
        
        if not new_status:
            return Response(
                {'error': 'Nouveau statut requis'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Vérifier les permissions
        can_update = False
        if user.user_type == 'admin':
            can_update = True
        elif user.user_type == 'technician' and repair_request.technician and repair_request.technician.user == user:
            can_update = True
        elif user.user_type == 'client' and repair_request.client.user == user:
            # Les clients peuvent seulement annuler
            can_update = new_status == 'cancelled'
        
        if not can_update:
            return Response(
                {'error': 'Vous n\'êtes pas autorisé à modifier cette demande'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Mettre à jour le statut
        old_status = repair_request.status
        repair_request.status = new_status
        
        # Mettre à jour les timestamps selon le statut
        if new_status == 'in_progress' and old_status != 'in_progress':
            repair_request.started_at = timezone.now()
        elif new_status == 'completed' and old_status != 'completed':
            repair_request.completed_at = timezone.now()
        
        repair_request.save()
        
        # Envoyer notifications
        if new_status == 'in_progress':
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Travaux commencés",
                message=f"Les travaux pour la demande #{repair_request.id} ont commencé",
                type="work_started"
            )
        elif new_status == 'completed':
            Notification.objects.create(
                recipient=repair_request.client.user,
                title="Travaux terminés",
                message=f"Les travaux pour la demande #{repair_request.id} sont terminés",
                type="work_completed"
            )
        
        # Créer un message automatique
        conversation = repair_request.conversation
        status_messages = {
            'in_progress': 'Les travaux ont commencé',
            'completed': 'Les travaux sont terminés',
            'cancelled': 'La demande a été annulée'
        }
        
        if new_status in status_messages:
            Message.objects.create(
                conversation=conversation,
                sender=user,
                content=status_messages[new_status],
                message_type="system"
            )
        
        return Response({
            'success': True,
            'message': f'Statut mis à jour vers {new_status}'
        })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def dashboard_stats(self, request):
        """Récupère les statistiques pour le tableau de bord."""
        user = request.user
        
        if user.user_type == 'admin':
            # Statistiques admin
            total_requests = RepairRequest.objects.count()
            pending_requests = RepairRequest.objects.filter(status='pending').count()
            in_progress_requests = RepairRequest.objects.filter(status='in_progress').count()
            completed_requests = RepairRequest.objects.filter(status='completed').count()
            
            # Demandes par spécialité
            specialty_stats = RepairRequest.objects.values('specialty_needed').annotate(
                count=Count('id')
            ).order_by('-count')
            
            return Response({
                'total_requests': total_requests,
                'pending_requests': pending_requests,
                'in_progress_requests': in_progress_requests,
                'completed_requests': completed_requests,
                'specialty_stats': list(specialty_stats)
            })
            
        elif user.user_type == 'technician':
            # Statistiques technicien
            technician = get_object_or_404(Technician, user=user)
            assigned_requests = RepairRequest.objects.filter(technician=technician).count()
            completed_requests = RepairRequest.objects.filter(
                technician=technician, 
                status='completed'
            ).count()
            pending_requests = RepairRequest.objects.filter(
                technician=technician,
                status__in=['assigned', 'in_progress']
            ).count()
            
            return Response({
                'assigned_requests': assigned_requests,
                'completed_requests': completed_requests,
                'pending_requests': pending_requests,
                'specialty': technician.specialty
            })
            
        else:
            # Statistiques client
            client = get_object_or_404(Client, user=user)
            total_requests = RepairRequest.objects.filter(client=client).count()
            active_requests = RepairRequest.objects.filter(
                client=client,
                status__in=['pending', 'assigned', 'in_progress']
            ).count()
            completed_requests = RepairRequest.objects.filter(
                client=client,
                status='completed'
            ).count()
            
            return Response({
                'total_requests': total_requests,
                'active_requests': active_requests,
                'completed_requests': completed_requests
            })
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def available_technicians(self, request):
        """Récupère les techniciens disponibles pour une spécialité (Admin seulement)."""
        user = request.user
        specialty = request.query_params.get('specialty')
        
        if user.user_type != 'admin':
            return Response(
                {'error': 'Accès non autorisé'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if not specialty:
            return Response(
                {'error': 'Spécialité requise'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        technicians = Technician.objects.filter(
            specialty=specialty,
            is_available=True,
            is_verified=True
        ).select_related('user')
        
        technician_data = []
        for tech in technicians:
            # Calculer la note moyenne
            avg_rating = tech.average_rating
            total_jobs = tech.total_jobs_completed
            
            technician_data.append({
                'id': tech.id,
                'name': tech.user.get_full_name(),
                'email': tech.user.email,
                'phone': tech.phone,
                'years_experience': tech.years_experience,
                'average_rating': avg_rating,
                'total_jobs': total_jobs,
                'hourly_rate': tech.hourly_rate,
                'bio': tech.bio
            })
        
        return Response(technician_data)

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


class MessageAttachmentViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les pièces jointes des messages."""
    queryset = MessageAttachment.objects.all()
    serializer_class = MessageAttachmentSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return MessageAttachment.objects.filter(message__conversation__participants=self.request.user)


class NotificationViewSet(viewsets.ModelViewSet):
    """ViewSet pour gérer les notifications."""
    queryset = Notification.objects.all()
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        return Notification.objects.filter(recipient=self.request.user)
    
    @action(detail=True, methods=['post'])
    def mark_as_read(self, request, pk=None):
        """Marquer une notification comme lue."""
        notification = self.get_object()
        notification.mark_as_read()
        return Response({'status': 'success'})
    
    @action(detail=False, methods=['post'])
    def mark_all_as_read(self, request):
        """Marquer toutes les notifications comme lues."""
        self.get_queryset().update(is_read=True, read_at=timezone.now())
        return Response({'status': 'success'})


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
