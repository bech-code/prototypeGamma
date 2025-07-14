from rest_framework import serializers
from .models import (
    Client, Technician, RepairRequest, RequestDocument, Review, 
    Payment, Conversation, Message, MessageAttachment, 
    Notification, TechnicianLocation, SystemConfiguration, CinetPayPayment, PlatformConfiguration, ClientLocation, Report, AdminNotification, SubscriptionPaymentRequest, TechnicianSubscription, ChatConversation, ChatMessage, ChatMessageAttachment, CommunicationStats, CommunicationSession, CommunicationNotification, CommunicationSettings, ReviewAnalytics, ReviewModeration, LocationHistory, ServiceZone, Route, PointOfInterest, GeolocationAlert, GeolocationSettings, SupportRequest, FAQ
)
from django.conf import settings
from django.contrib.auth.models import Permission, Group
from users.models import AuditLog
from django.utils import timezone

# Serializers pour les modèles de base
class ClientUserSerializer(serializers.ModelSerializer):
    class Meta:
        model = settings.AUTH_USER_MODEL
        fields = ['id', 'first_name', 'last_name', 'email', 'username']

class ClientSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    class Meta:
        model = Client
        fields = ['id', 'user', 'address', 'phone', 'is_active', 'created_at']
        read_only_fields = ['id', 'created_at']
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email,
            'username': obj.user.username,
        }

class TechnicianSerializer(serializers.ModelSerializer):
    user = serializers.SerializerMethodField()
    
    class Meta:
        model = Technician
        fields = [
            'id', 'user', 'specialty', 'years_experience', 'hourly_rate',
            'is_available', 'is_verified', 'service_radius_km', 'bio', 'created_at',
            'phone'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email,
            'username': obj.user.username,
        }
    
    def validate_hourly_rate(self, value):
        """Validation du taux horaire."""
        if value < 0:
            raise serializers.ValidationError("Le taux horaire ne peut pas être négatif.")
        if value > 100000:
            raise serializers.ValidationError("Le taux horaire ne peut pas dépasser 100,000 FCFA.")
        return value
    
    def validate_years_experience(self, value):
        """Validation des années d'expérience."""
        if value < 0:
            raise serializers.ValidationError("Les années d'expérience ne peuvent pas être négatives.")
        if value > 50:
            raise serializers.ValidationError("Les années d'expérience ne peuvent pas dépasser 50.")
        return value
    
    def validate_service_radius_km(self, value):
        """Validation du rayon de service."""
        if value < 1:
            raise serializers.ValidationError("Le rayon de service doit être d'au moins 1 km.")
        if value > 100:
            raise serializers.ValidationError("Le rayon de service ne peut pas dépasser 100 km.")
        return value

class ReviewSerializer(serializers.ModelSerializer):
    """Serializer pour les avis."""
    client_name = serializers.CharField(source='client.user.get_full_name', read_only=True)
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    overall_score = serializers.FloatField(read_only=True)
    is_detailed_review = serializers.BooleanField(read_only=True)
    review_completeness = serializers.FloatField(read_only=True)

    class Meta:
        model = Review
        fields = [
            'id', 'request', 'technician', 'rating',
            'comment', 'would_recommend', 'punctuality_rating', 'quality_rating', 
            'communication_rating', 'client_name', 'technician_name', 'created_at', 'is_visible',
            # Nouveaux champs de notation
            'professionalism_rating', 'problem_solving_rating', 'cleanliness_rating', 'price_fairness_rating',
            # Informations supplémentaires
            'intervention_duration_minutes', 'was_urgent', 'problem_complexity',
            'parts_used', 'warranty_offered', 'warranty_duration_days',
            # Feedback détaillé
            'positive_aspects', 'improvement_suggestions', 'would_use_again', 'would_recommend_to_friends',
            # Métadonnées de qualité
            'review_quality_score', 'is_verified_review', 'moderation_status', 'moderation_notes',
            # Tags et propriétés calculées
            'tags', 'overall_score', 'is_detailed_review', 'review_completeness'
        ]
        read_only_fields = ['id', 'created_at', 'overall_score', 'is_detailed_review', 'review_completeness', 'review_quality_score']

    def validate(self, data):
        user = self.context['request'].user
        repair_request = data['request']
        # Vérifier que la demande appartient au client connecté
        if not hasattr(user, 'client_profile') or repair_request.client.user != user:
            raise serializers.ValidationError("Vous ne pouvez noter que vos propres demandes.")
        if repair_request.status != 'completed':
            raise serializers.ValidationError("Vous ne pouvez noter qu'une demande terminée.")
        if hasattr(repair_request, 'review'):
            raise serializers.ValidationError("Un avis existe déjà pour cette demande.")
        return data

    def create(self, validated_data):
        user = self.context['request'].user
        client = user.client_profile
        review = Review.objects.create(
            client=client,
            **validated_data
        )
        # Créer la notification pour le technicien
        from .models import Notification
        Notification.objects.create(
            recipient=review.technician.user,
            type=Notification.Type.REVIEW_RECEIVED,
            title="Nouvel avis reçu",
            message=f"Vous avez reçu un nouvel avis ({review.rating}/5) de la part d'un client.",
            request=review.request
        )
        return review


class ReviewAnalyticsSerializer(serializers.ModelSerializer):
    """Serializer pour les analytics d'avis."""
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    
    class Meta:
        model = ReviewAnalytics
        fields = [
            'id', 'technician', 'technician_name', 'total_reviews', 'average_rating',
            'rating_distribution', 'avg_punctuality', 'avg_quality', 'avg_communication',
            'avg_professionalism', 'avg_problem_solving', 'avg_cleanliness', 'avg_price_fairness',
            'recommendation_rate', 'reuse_rate', 'friend_recommendation_rate',
            'detailed_reviews_count', 'verified_reviews_count', 'avg_review_completeness',
            'monthly_reviews', 'rating_trend', 'popular_tags', 'last_calculation'
        ]
        read_only_fields = ['id', 'last_calculation']


class ReviewModerationSerializer(serializers.ModelSerializer):
    """Serializer pour la modération d'avis."""
    review_data = ReviewSerializer(source='review', read_only=True)
    moderator_name = serializers.CharField(source='moderator.get_full_name', read_only=True)
    
    class Meta:
        model = ReviewModeration
        fields = [
            'id', 'review', 'review_data', 'moderator', 'moderator_name', 'status',
            'moderation_reason', 'moderation_notes', 'flagged_by_users', 'auto_moderation_score',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

class RepairRequestSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    technician = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()
    review = ReviewSerializer(read_only=True, allow_null=True)
    no_show_count = serializers.IntegerField(read_only=True)
    mission_validated = serializers.BooleanField(read_only=True)
    conversation = serializers.SerializerMethodField()
    
    class Meta:
        model = RepairRequest
        fields = [
            'id', 'uuid', 'client', 'technician', 'title', 'description',
            'specialty_needed', 'priority', 'status', 'address', 'latitude', 'longitude',
            'preferred_date', 'assigned_at', 'started_at', 'completed_at',
            'estimated_price', 'final_price', 'travel_cost',
            'is_urgent', 'city', 'postalCode', 'date', 'time', 'service_type',
            'no_show_count', 'mission_validated',
            'payment_status', 'review', 'conversation',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uuid', 'created_at', 'updated_at', 'assigned_at', 'started_at', 'completed_at']
        extra_kwargs = {
            'description': {'required': False, 'allow_blank': True, 'allow_null': True},
        }

    def get_client(self, obj):
        if obj.client:
            return {
                'id': obj.client.id,
                'user': {
                    'id': obj.client.user.id,
                    'first_name': obj.client.user.first_name,
                    'last_name': obj.client.user.last_name,
                    'email': obj.client.user.email,
                    'username': obj.client.user.username,
                },
                'phone': obj.client.phone,
            }
        return None
    
    def get_technician(self, obj):
        if obj.technician:
            return {
                'id': obj.technician.id,
                'user': {
                    'id': obj.technician.user.id,
                    'first_name': obj.technician.user.first_name,
                    'last_name': obj.technician.user.last_name,
                    'email': obj.technician.user.email,
                },
                'specialty': obj.technician.specialty,
                'average_rating': obj.technician.average_rating,
            }
        return None
    
    def get_payment_status(self, obj):
        latest_payment = obj.cinetpay_payments.order_by('-created_at').first()
        if latest_payment:
            return latest_payment.status
        return 'non payé'
    
    def get_conversation(self, obj):
        request = self.context.get('request', None)
        user = request.user if request else None
        if hasattr(obj, 'conversation') and obj.conversation:
            unread = obj.conversation.unread_count_for_user(user) if user else 0
            return {
                'id': obj.conversation.id,
                'unread_count': unread
            }
        return None
    
    def validate_title(self, value):
        """Validation du titre."""
        if len(value.strip()) < 5:
            raise serializers.ValidationError("Le titre doit contenir au moins 5 caractères.")
        if len(value) > 200:
            raise serializers.ValidationError("Le titre ne peut pas dépasser 200 caractères.")
        return value.strip()
    
    def validate_description(self, value):
        """Validation de la description."""
        if len(value.strip()) < 10:
            raise serializers.ValidationError("La description doit contenir au moins 10 caractères.")
        if len(value) > 2000:
            raise serializers.ValidationError("La description ne peut pas dépasser 2000 caractères.")
        return value.strip()
    
    def validate_final_price(self, value):
        """Validation du prix final."""
        if value is not None:
            if value < 0:
                raise serializers.ValidationError("Le prix ne peut pas être négatif.")
            if value > 1000000:
                raise serializers.ValidationError("Le prix ne peut pas dépasser 1,000,000 FCFA.")
        return value


class RequestDocumentSerializer(serializers.ModelSerializer):
    """Serializer pour les documents de demande."""
    
    class Meta:
        model = RequestDocument
        fields = ['id', 'request', 'document_type', 'file', 'description', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements."""
    
    class Meta:
        model = Payment
        fields = [
            'id', 'uuid', 'request', 'payer', 'recipient', 'amount', 'status',
            'method', 'payment_type', 'transaction_id', 'reference', 'fees',
            'processed_at', 'notes', 'created_at'
        ]
        read_only_fields = ['id', 'uuid', 'created_at', 'processed_at']

    def get_payer(self, obj):
        if obj.payer:
            return {
                'id': obj.payer.id,
                'first_name': obj.payer.first_name,
                'last_name': obj.payer.last_name,
                'email': obj.payer.email,
            }
        return None
    
    def validate_amount(self, value):
        """Validation du montant."""
        if value <= 0:
            raise serializers.ValidationError("Le montant doit être positif.")
        if value > 1000000:
            raise serializers.ValidationError("Le montant ne peut pas dépasser 1,000,000 FCFA.")
        return value
    
    def validate_payment_method(self, value):
        """Validation de la méthode de paiement."""
        valid_methods = ['mobile_money', 'card', 'cash', 'bank_transfer']
        if value not in valid_methods:
            raise serializers.ValidationError(f"Méthode de paiement invalide. Options: {', '.join(valid_methods)}")
        return value


class ConversationSerializer(serializers.ModelSerializer):
    """Serializer pour les conversations."""
    
    class Meta:
        model = Conversation
        fields = ['id', 'request', 'participants', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class MessageSerializer(serializers.ModelSerializer):
    """Serializer pour les messages."""
    
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    
    class Meta:
        model = Message
        fields = [
            'id', 'conversation', 'sender', 'content', 'message_type',
            'is_read', 'read_at', 'sender_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class MessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer pour les pièces jointes des messages."""
    
    class Meta:
        model = MessageAttachment
        fields = ['id', 'message', 'file', 'file_name', 'file_size', 'content_type', 'created_at']
        read_only_fields = ['id', 'created_at']


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications."""
    
    class Meta:
        model = Notification
        fields = [
            'id', 'recipient', 'type', 'title', 'message', 'is_read', 'read_at',
            'request', 'extra_data', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class TechnicianLocationSerializer(serializers.ModelSerializer):
    """Serializer pour les localisations des techniciens."""
    
    class Meta:
        model = TechnicianLocation
        fields = [
            'id', 'technician', 'latitude', 'longitude', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class SystemConfigurationSerializer(serializers.ModelSerializer):
    """Serializer pour la configuration système."""
    
    class Meta:
        model = SystemConfiguration
        fields = [
            'id', 'key', 'value', 'description', 'is_active', 'updated_at'
        ]
        read_only_fields = ['id', 'updated_at']


# Serializers pour les actions spéciales
class RepairRequestCreateSerializer(serializers.ModelSerializer):
    """Serializer pour la création de demandes de réparation."""
    # Champs d'aide frontend (acceptés en entrée, jamais renvoyés en sortie)
    is_urgent = serializers.BooleanField(required=False, write_only=True)
    city = serializers.CharField(required=False, write_only=True)
    postalCode = serializers.CharField(required=False, write_only=True)
    date = serializers.DateField(required=False, write_only=True)
    time = serializers.TimeField(required=False, write_only=True)
    service_type = serializers.CharField(required=False, write_only=True)
    # Champs du modèle manquants
    urgency_level = serializers.ChoiceField(choices=RepairRequest.UrgencyLevel.choices, required=False)
    min_experience_level = serializers.ChoiceField(choices=Technician.ExperienceLevel.choices, required=False)
    min_rating = serializers.IntegerField(required=False, min_value=1, max_value=5)
    latitude = serializers.FloatField(required=False)
    longitude = serializers.FloatField(required=False)
    status = serializers.ChoiceField(choices=RepairRequest.Status.choices, required=False)
    
    class Meta:
        model = RepairRequest
        fields = [
            'title', 'description', 'address', 'specialty_needed', 'priority', 'estimated_price',
            'urgency_level', 'min_experience_level', 'min_rating', 'latitude', 'longitude',
            'is_urgent', 'city', 'postalCode', 'date', 'time', 'service_type', 'status'
        ]
        extra_kwargs = {
            'title': {'required': False},
            'specialty_needed': {'required': False},
            'description': {'required': False, 'allow_blank': True, 'allow_null': True},
        }
    
    def validate(self, data):
        """Valide et transforme les données."""
        # Mapper service_type vers specialty_needed
        if 'service_type' in data and not data.get('specialty_needed'):
            data['specialty_needed'] = data['service_type']
        # Créer un titre si non fourni
        if not data.get('title'):
            service_name = data.get('specialty_needed', 'Service')
            data['title'] = f"Demande de {service_name}"
        # Construire l'adresse complète avec ville et code postal
        address_parts = []
        if data.get('address'):
            address_parts.append(data['address'])
        if data.get('city'):
            address_parts.append(data['city'])
        if data.get('postalCode'):
            address_parts.append(data['postalCode'])
        if address_parts:
            data['address'] = ', '.join(address_parts)
        # Combiner date et time en preferred_date
        if data.get('date') and data.get('time'):
            import datetime
            combined_datetime = datetime.datetime.combine(data['date'], data['time'])
            data['preferred_date'] = timezone.make_aware(combined_datetime)
        # Définir la priorité basée sur is_urgent
        if data.get('is_urgent'):
            data['priority'] = 'high'
        elif 'priority' not in data:
            data['priority'] = 'medium'
        return data


class RepairRequestUpdateSerializer(serializers.ModelSerializer):
    """Serializer pour la mise à jour de demandes de réparation."""
    
    class Meta:
        model = RepairRequest
        fields = ['status', 'total_amount']


class RepairRequestStatsSerializer(serializers.Serializer):
    """Serializer pour les statistiques des demandes."""
    
    total_requests = serializers.IntegerField()
    pending_requests = serializers.IntegerField()
    in_progress_requests = serializers.IntegerField()
    completed_requests = serializers.IntegerField()
    cancelled_requests = serializers.IntegerField()
    total_amount = serializers.DecimalField(max_digits=10, decimal_places=2)


class TechnicianAssignmentSerializer(serializers.Serializer):
    """Serializer pour l'assignation de techniciens."""
    
    technician_id = serializers.IntegerField()


class StatusUpdateSerializer(serializers.Serializer):
    """Serializer pour la mise à jour de statut."""
    
    status = serializers.ChoiceField(choices=RepairRequest.Status.choices)


# Serializers CinetPay
class CinetPayPaymentSerializer(serializers.ModelSerializer):
    """Serializer pour les paiements CinetPay."""
    
    class Meta:
        model = CinetPayPayment
        fields = [
            'id', 'transaction_id', 'amount', 'currency', 'description',
            'customer_name', 'customer_surname', 'customer_email', 'customer_phone_number',
            'customer_address', 'customer_city', 'customer_country', 'customer_state', 'customer_zip_code',
            'payment_token', 'payment_url', 'status', 'metadata', 'invoice_data', 'notification_data',
            'request', 'user', 'created_at', 'updated_at', 'paid_at'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'payment_token', 'payment_url', 'status',
            'created_at', 'updated_at', 'paid_at', 'notification_data'
        ]
    
    def validate_amount(self, value):
        """Valide que le montant est un multiple de 5 pour CinetPay."""
        if value % 5 != 0:
            raise serializers.ValidationError("Le montant doit être un multiple de 5 pour CinetPay.")
        return value
    
    def validate_customer_phone_number(self, value):
        """Valide le format du numéro de téléphone."""
        if not value.startswith('+'):
            value = '+' + value
        return value
    
    def create(self, validated_data):
        """Crée un nouveau paiement avec un ID de transaction unique."""
        payment = CinetPayPayment(**validated_data)
        payment.transaction_id = payment.generate_transaction_id()
        payment.save()
        return payment


class CinetPayInitiationSerializer(serializers.Serializer):
    """Serializer pour l'initialisation d'un paiement CinetPay."""
    
    request_id = serializers.IntegerField(help_text="ID de la demande de réparation")
    amount = serializers.DecimalField(max_digits=10, decimal_places=2, help_text="Montant du paiement")
    description = serializers.CharField(max_length=500, help_text="Description du paiement")
    phone = serializers.CharField(max_length=20, required=False, help_text="Numéro de téléphone du client (optionnel)")
    
    def validate_amount(self, value):
        """Valide que le montant est un multiple de 5."""
        if value % 5 != 0:
            raise serializers.ValidationError("Le montant doit être un multiple de 5 pour CinetPay.")
        return value


class CinetPayNotificationSerializer(serializers.Serializer):
    """Serializer pour les notifications de paiement CinetPay."""
    
    transaction_id = serializers.CharField(max_length=100)
    payment_token = serializers.CharField(max_length=255)
    amount = serializers.DecimalField(max_digits=10, decimal_places=2)
    currency = serializers.CharField(max_length=3, required=False, default='XOF')
    status = serializers.CharField(max_length=20)
    payment_date = serializers.DateTimeField(required=False)
    payment_method = serializers.CharField(max_length=50, required=False, default='MOBILE_MONEY')
    operator = serializers.CharField(max_length=50, required=False, default='ORANGE')
    
    def validate_status(self, value):
        """Valide le statut du paiement."""
        valid_statuses = ['ACCEPTED', 'REFUSED', 'PENDING', 'CANCELLED']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Statut invalide. Valeurs acceptées: {', '.join(valid_statuses)}")
        return value
    
    def validate_payment_date(self, value):
        """Valide la date de paiement."""
        if value is None:
            return timezone.now()
        return value


class TechnicianNearbySerializer(serializers.ModelSerializer):
    """Serializer pour les techniciens proches avec calcul de distance."""
    
    user = serializers.SerializerMethodField()
    distance = serializers.SerializerMethodField()
    average_rating = serializers.SerializerMethodField()
    city = serializers.SerializerMethodField()
    
    class Meta:
        model = Technician
        fields = [
            'id', 'user', 'specialty', 'years_experience', 'hourly_rate',
            'is_available', 'is_verified', 'distance', 'average_rating', 'city'
        ]
    
    def get_user(self, obj):
        return {
            'id': obj.user.id,
            'first_name': obj.user.first_name,
            'last_name': obj.user.last_name,
            'email': obj.user.email,
            'username': obj.user.username,
        }

    def get_distance(self, obj):
        """Retourne la distance calculée en km."""
        return getattr(obj, 'distance_km', None)
    
    def get_average_rating(self, obj):
        """Retourne la note moyenne du technicien."""
        return obj.average_rating
    
    def get_city(self, obj):
        """Retourne la ville du technicien (extrait de l'adresse)."""
        # Pour l'instant, on retourne une ville par défaut
        # En production, on pourrait extraire la ville de l'adresse du technicien
        return "Abidjan"  # À adapter selon vos besoins

class PermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'codename', 'content_type']

class GroupSerializer(serializers.ModelSerializer):
    permissions = PermissionSerializer(many=True, read_only=True)
    class Meta:
        model = Group
        fields = ['id', 'name', 'permissions']

class PlatformConfigurationSerializer(serializers.ModelSerializer):
    class Meta:
        model = PlatformConfiguration
        fields = '__all__'

    def validate_commission_rate(self, value):
        if value < 0 or value > 100:
            raise serializers.ValidationError('Le taux de commission doit être entre 0 et 100.')
        return value
    def validate_min_payout_amount(self, value):
        if value < 0:
            raise serializers.ValidationError('Le montant minimum doit être positif.')
        return value
    def validate_max_interventions_per_day(self, value):
        if value < 1:
            raise serializers.ValidationError('Au moins 1 intervention par jour.')
        return value
    def validate_service_radius_km(self, value):
        if value < 0:
            raise serializers.ValidationError('Le rayon doit être positif.')
        return value
    def validate_cancelation_deadline_hours(self, value):
        if value < 0:
            raise serializers.ValidationError('Le délai doit être positif.')
        return value

class ClientLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientLocation
        fields = ['id', 'client', 'latitude', 'longitude', 'created_at']
        read_only_fields = ['id', 'created_at']

# Serializers pour Report et AdminNotification
class ReportSerializer(serializers.ModelSerializer):
    sender_name = serializers.ReadOnlyField(source='sender.get_full_name')
    reviewed_by_name = serializers.ReadOnlyField(source='reviewed_by.get_full_name')
    class Meta:
        model = Report
        fields = '__all__'
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'reviewed_by', 'sender']

class AdminNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminNotification
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    class Meta:
        model = AuditLog
        fields = [
            'id', 'timestamp', 'user', 'user_email', 'event_type', 'status', 
            'ip_address', 'geo_country', 'geo_city', 'location', 'user_agent', 
            'risk_score', 'metadata'
        ]


class SubscriptionPaymentRequestSerializer(serializers.ModelSerializer):
    """Serializer pour les demandes de paiement d'abonnement."""
    
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    validated_by_name = serializers.CharField(source='validated_by.get_full_name', read_only=True)
    
    class Meta:
        model = SubscriptionPaymentRequest
        fields = [
            'id', 'technician', 'technician_name', 'amount', 'duration_months',
            'payment_method', 'description', 'status', 'validated_by', 'validated_by_name',
            'validated_at', 'validation_notes', 'subscription', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'validated_at', 'validated_by', 'subscription']
    
    def validate_amount(self, value):
        """Validation du montant."""
        if value <= 0:
            raise serializers.ValidationError("Le montant doit être positif.")
        if value > 1000000:
            raise serializers.ValidationError("Le montant ne peut pas dépasser 1,000,000 FCFA.")
        return value
    
    def validate_duration_months(self, value):
        """Validation de la durée."""
        if value < 1:
            raise serializers.ValidationError("La durée doit être d'au moins 1 mois.")
        if value > 12:
            raise serializers.ValidationError("La durée ne peut pas dépasser 12 mois.")
        return value


class TechnicianSubscriptionSerializer(serializers.ModelSerializer):
    """Serializer pour les abonnements techniciens."""
    
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    
    class Meta:
        model = TechnicianSubscription
        fields = [
            'id', 'technician', 'technician_name', 'plan_name', 'start_date',
            'end_date', 'is_active', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

class ChatConversationSerializer(serializers.ModelSerializer):
    """Serializer pour les conversations de chat."""
    
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatConversation
        fields = [
            'id', 'client', 'technician', 'client_name', 'technician_name',
            'request', 'is_active', 'last_message_at', 'last_message', 
            'unread_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_message_at']
    
    def get_last_message(self, obj):
        last_msg = obj.latest_message
        if last_msg:
            return {
                'id': last_msg.id,
                'content': last_msg.content,
                'message_type': last_msg.message_type,
                'created_at': last_msg.created_at.isoformat(),
                'sender_id': last_msg.sender.id,
                'sender_name': last_msg.sender.get_full_name()
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.unread_count_for_user(request.user)
        return 0


class ChatMessageSerializer(serializers.ModelSerializer):
    """Serializer pour les messages de chat."""
    
    sender_name = serializers.CharField(source='sender.get_full_name', read_only=True)
    sender_avatar = serializers.SerializerMethodField()
    attachments = serializers.SerializerMethodField()
    reply_to_info = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessage
        fields = [
            'id', 'conversation', 'sender', 'sender_name', 'sender_avatar',
            'content', 'message_type', 'is_read', 'read_at', 'attachments',
            'latitude', 'longitude', 'voice_duration', 'is_edited', 'edited_at',
            'reply_to', 'reply_to_info', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'read_at', 'edited_at']
    
    def get_sender_avatar(self, obj):
        # Placeholder pour avatar - à implémenter selon vos besoins
        return None
    
    def get_attachments(self, obj):
        attachments = obj.attachments.all()
        return [
            {
                'id': att.id,
                'file_name': att.file_name,
                'file_size': att.file_size,
                'content_type': att.content_type,
                'file_url': att.get_file_url(),
                'thumbnail_url': att.get_thumbnail_url(),
                'duration': att.duration,
                'is_processed': att.is_processed
            }
            for att in attachments
        ]
    
    def get_reply_to_info(self, obj):
        if obj.reply_to:
            return {
                'id': obj.reply_to.id,
                'content': obj.reply_to.content[:100] + '...' if len(obj.reply_to.content) > 100 else obj.reply_to.content,
                'sender_name': obj.reply_to.sender.get_full_name(),
                'message_type': obj.reply_to.message_type,
                'created_at': obj.reply_to.created_at.isoformat()
            }
        return None


class ChatConversationSerializer(serializers.ModelSerializer):
    """Serializer pour les conversations de chat."""
    
    client_name = serializers.CharField(source='client.get_full_name', read_only=True)
    technician_name = serializers.CharField(source='technician.get_full_name', read_only=True)
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    is_muted = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatConversation
        fields = [
            'id', 'client', 'technician', 'client_name', 'technician_name',
            'request', 'is_active', 'last_message_at', 'last_message', 
            'unread_count', 'is_pinned', 'muted_until', 'last_activity_type',
            'is_muted', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'last_message_at']
    
    def get_last_message(self, obj):
        last_msg = obj.latest_message
        if last_msg:
            return {
                'id': last_msg.id,
                'content': last_msg.content,
                'message_type': last_msg.message_type,
                'created_at': last_msg.created_at.isoformat(),
                'sender_id': last_msg.sender.id,
                'sender_name': last_msg.sender.get_full_name()
            }
        return None
    
    def get_unread_count(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.unread_count_for_user(request.user)
        return 0
    
    def get_is_muted(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.is_muted_for_user(request.user)
        return False


class ChatMessageAttachmentSerializer(serializers.ModelSerializer):
    """Serializer pour les pièces jointes de chat."""
    
    file_url = serializers.SerializerMethodField()
    thumbnail_url = serializers.SerializerMethodField()
    
    class Meta:
        model = ChatMessageAttachment
        fields = [
            'id', 'message', 'file', 'file_name', 'file_size', 'content_type',
            'duration', 'thumbnail', 'is_processed', 'file_url', 'thumbnail_url'
        ]
        read_only_fields = ['id', 'file_size', 'content_type', 'file_url', 'thumbnail_url']
    
    def get_file_url(self, obj):
        return obj.get_file_url()
    
    def get_thumbnail_url(self, obj):
        return obj.get_thumbnail_url()
    
    def validate_file(self, value):
        """Validation du fichier uploadé."""
        if value.size > 10 * 1024 * 1024:  # 10MB max
            raise serializers.ValidationError("Le fichier ne peut pas dépasser 10MB.")
        return value
    
    def create(self, validated_data):
        """Surcharge pour calculer automatiquement file_size et content_type."""
        file_obj = validated_data['file']
        validated_data['file_size'] = file_obj.size
        validated_data['content_type'] = file_obj.content_type
        return super().create(validated_data)


class CommunicationStatsSerializer(serializers.ModelSerializer):
    """Serializer pour les statistiques de communication."""
    
    conversation_info = serializers.SerializerMethodField()
    
    class Meta:
        model = CommunicationStats
        fields = [
            'id', 'conversation', 'conversation_info', 'total_messages',
            'text_messages', 'voice_messages', 'location_shares', 'file_shares',
            'avg_response_time_minutes', 'last_message_at', 'first_message_at',
            'client_online_time', 'technician_online_time', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_conversation_info(self, obj):
        return {
            'id': obj.conversation.id,
            'client_name': obj.conversation.client.get_full_name(),
            'technician_name': obj.conversation.technician.get_full_name()
        }


class CommunicationSessionSerializer(serializers.ModelSerializer):
    """Serializer pour les sessions de communication."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    duration_minutes = serializers.SerializerMethodField()
    
    class Meta:
        model = CommunicationSession
        fields = [
            'id', 'conversation', 'user', 'user_name', 'started_at', 'ended_at',
            'messages_sent', 'messages_received', 'is_active', 'device_info',
            'ip_address', 'duration_minutes', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'started_at']
    
    def get_duration_minutes(self, obj):
        return obj.get_duration_minutes()


class CommunicationNotificationSerializer(serializers.ModelSerializer):
    """Serializer pour les notifications de communication."""
    
    recipient_name = serializers.CharField(source='recipient.get_full_name', read_only=True)
    conversation_info = serializers.SerializerMethodField()
    
    class Meta:
        model = CommunicationNotification
        fields = [
            'id', 'recipient', 'recipient_name', 'conversation', 'conversation_info',
            'notification_type', 'title', 'message', 'is_read', 'read_at',
            'extra_data', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'read_at']
    
    def get_conversation_info(self, obj):
        return {
            'id': obj.conversation.id,
            'client_name': obj.conversation.client.get_full_name(),
            'technician_name': obj.conversation.technician.get_full_name()
        }


class CommunicationSettingsSerializer(serializers.ModelSerializer):
    """Serializer pour les paramètres de communication."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    is_in_quiet_hours = serializers.SerializerMethodField()
    
    class Meta:
        model = CommunicationSettings
        fields = [
            'id', 'user', 'user_name', 'auto_read_receipts', 'typing_indicators',
            'sound_notifications', 'vibration_notifications', 'message_preview',
            'auto_download_media', 'max_file_size_mb', 'allowed_file_types',
            'quiet_hours_start', 'quiet_hours_end', 'language', 'theme',
            'is_in_quiet_hours', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_is_in_quiet_hours(self, obj):
        return obj.is_in_quiet_hours()
    
    def validate_quiet_hours_start(self, value):
        """Validation de l'heure de début des heures silencieuses."""
        if value and self.instance and self.instance.quiet_hours_end:
            if value >= self.instance.quiet_hours_end:
                raise serializers.ValidationError(
                    "L'heure de début doit être antérieure à l'heure de fin."
                )
        return value
    
    def validate_quiet_hours_end(self, value):
        """Validation de l'heure de fin des heures silencieuses."""
        if value and self.instance and self.instance.quiet_hours_start:
            if value <= self.instance.quiet_hours_start:
                raise serializers.ValidationError(
                    "L'heure de fin doit être postérieure à l'heure de début."
                )
        return value
    
    def validate_max_file_size_mb(self, value):
        """Validation de la taille maximale des fichiers."""
        if value < 1:
            raise serializers.ValidationError("La taille minimale est de 1MB.")
        if value > 100:
            raise serializers.ValidationError("La taille maximale est de 100MB.")
        return value


class MessageEditSerializer(serializers.Serializer):
    """Serializer pour l'édition de messages."""
    
    content = serializers.CharField(max_length=5000)
    
    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Le contenu ne peut pas être vide.")
        return value.strip()


class MessageReplySerializer(serializers.Serializer):
    """Serializer pour les réponses aux messages."""
    
    content = serializers.CharField(max_length=5000)
    message_type = serializers.ChoiceField(
        choices=ChatMessage.MessageType.choices,
        default=ChatMessage.MessageType.TEXT
    )
    reply_to_id = serializers.IntegerField(required=False)
    
    def validate_content(self, value):
        if not value.strip():
            raise serializers.ValidationError("Le contenu ne peut pas être vide.")
        return value.strip()


class LocationShareSerializer(serializers.Serializer):
    """Serializer pour le partage de localisation."""
    
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    address = serializers.CharField(max_length=500, required=False)
    
    def validate_latitude(self, value):
        if value < -90 or value > 90:
            raise serializers.ValidationError("La latitude doit être entre -90 et 90.")
        return value
    
    def validate_longitude(self, value):
        if value < -180 or value > 180:
            raise serializers.ValidationError("La longitude doit être entre -180 et 180.")
        return value


class VoiceMessageSerializer(serializers.Serializer):
    """Serializer pour les messages vocaux."""
    
    audio_file = serializers.FileField()
    duration = serializers.IntegerField(min_value=1, max_value=300)  # 1-300 secondes
    
    def validate_audio_file(self, value):
        if not value.content_type.startswith('audio/'):
            raise serializers.ValidationError("Le fichier doit être un fichier audio.")
        if value.size > 50 * 1024 * 1024:  # 50MB max
            raise serializers.ValidationError("Le fichier audio ne peut pas dépasser 50MB.")
        return value


class ConversationMuteSerializer(serializers.Serializer):
    """Serializer pour le mode silencieux des conversations."""
    
    muted_until = serializers.DateTimeField(required=False)
    mute_duration_hours = serializers.IntegerField(min_value=1, max_value=168, required=False)  # 1h-1semaine
    
    def validate(self, data):
        if not data.get('muted_until') and not data.get('mute_duration_hours'):
            raise serializers.ValidationError(
                "Vous devez spécifier soit une date de fin, soit une durée."
            )
        return data


class ConversationPinSerializer(serializers.Serializer):
    """Serializer pour épingler/désépingler une conversation."""
    
    is_pinned = serializers.BooleanField()


class CommunicationDashboardSerializer(serializers.Serializer):
    """Serializer pour le tableau de bord de communication."""
    
    total_conversations = serializers.IntegerField()
    active_conversations = serializers.IntegerField()
    unread_messages = serializers.IntegerField()
    total_messages_today = serializers.IntegerField()
    voice_messages_today = serializers.IntegerField()
    location_shares_today = serializers.IntegerField()
    avg_response_time_minutes = serializers.FloatField()
    recent_conversations = ChatConversationSerializer(many=True)
    recent_notifications = CommunicationNotificationSerializer(many=True)

class TechnicianLocationSerializer(serializers.ModelSerializer):
    """Serializer pour la localisation des techniciens."""
    
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    distance_to_client = serializers.SerializerMethodField()
    eta_minutes = serializers.SerializerMethodField()
    location_quality = serializers.SerializerMethodField()
    
    class Meta:
        model = TechnicianLocation
        fields = [
            'id', 'technician', 'technician_name', 'latitude', 'longitude',
            'accuracy', 'altitude', 'speed', 'heading', 'is_moving',
            'battery_level', 'location_source', 'address', 'city', 'country',
            'distance_to_client', 'eta_minutes', 'location_quality',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_distance_to_client(self, obj):
        """Calcule la distance vers le client si fournie dans le contexte."""
        request = self.context.get('request')
        if request and hasattr(request, 'client_lat') and hasattr(request, 'client_lng'):
            return obj.get_distance_to(request.client_lat, request.client_lng)
        return None
    
    def get_eta_minutes(self, obj):
        """Calcule le temps d'arrivée estimé."""
        request = self.context.get('request')
        if request and hasattr(request, 'client_lat') and hasattr(request, 'client_lng'):
            return obj.get_eta_to(request.client_lat, request.client_lng)
        return None
    
    def get_location_quality(self, obj):
        """Retourne la qualité de la localisation."""
        return obj.get_location_quality()


class ClientLocationSerializer(serializers.ModelSerializer):
    """Serializer pour la localisation des clients."""
    
    client_name = serializers.CharField(source='client.user.get_full_name', read_only=True)
    location_quality = serializers.SerializerMethodField()
    
    class Meta:
        model = ClientLocation
        fields = [
            'id', 'client', 'client_name', 'latitude', 'longitude',
            'accuracy', 'altitude', 'speed', 'heading', 'is_moving',
            'battery_level', 'location_source', 'address', 'city', 'country',
            'location_quality', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_location_quality(self, obj):
        """Retourne la qualité de la localisation."""
        return obj.get_location_quality()


class LocationHistorySerializer(serializers.ModelSerializer):
    """Serializer pour l'historique de localisation."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    distance_from_previous = serializers.SerializerMethodField()
    
    class Meta:
        model = LocationHistory
        fields = [
            'id', 'user', 'user_name', 'latitude', 'longitude', 'accuracy',
            'altitude', 'speed', 'heading', 'is_moving', 'battery_level',
            'location_source', 'address', 'city', 'country', 'request',
            'distance_from_previous', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def get_distance_from_previous(self, obj):
        """Calcule la distance depuis la position précédente."""
        previous_location = LocationHistory.objects.filter(
            user=obj.user
        ).exclude(id=obj.id).order_by('-created_at').first()
        
        if previous_location:
            return obj.get_distance_to(previous_location.latitude, previous_location.longitude)
        return None


class ServiceZoneSerializer(serializers.ModelSerializer):
    """Serializer pour les zones de service."""
    
    technician_count = serializers.SerializerMethodField()
    is_point_inside = serializers.SerializerMethodField()
    
    class Meta:
        model = ServiceZone
        fields = [
            'id', 'name', 'description', 'center_latitude', 'center_longitude',
            'radius_km', 'is_active', 'color', 'technicians', 'technician_count',
            'is_point_inside', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_technician_count(self, obj):
        """Retourne le nombre de techniciens dans la zone."""
        return obj.technicians.count()
    
    def get_is_point_inside(self, obj):
        """Vérifie si un point est dans la zone."""
        request = self.context.get('request')
        if request and hasattr(request, 'lat') and hasattr(request, 'lng'):
            return obj.is_point_inside(request.lat, request.lng)
        return None


class RouteSerializer(serializers.ModelSerializer):
    """Serializer pour les itinéraires."""
    
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    request_title = serializers.CharField(source='request.title', read_only=True)
    calculated_distance = serializers.SerializerMethodField()
    estimated_duration = serializers.SerializerMethodField()
    
    class Meta:
        model = Route
        fields = [
            'id', 'name', 'description', 'start_latitude', 'start_longitude',
            'end_latitude', 'end_longitude', 'distance_km', 'estimated_duration_minutes',
            'route_type', 'is_active', 'request', 'technician', 'technician_name',
            'request_title', 'calculated_distance', 'estimated_duration',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_calculated_distance(self, obj):
        """Retourne la distance calculée."""
        return obj.calculate_distance()
    
    def get_estimated_duration(self, obj):
        """Retourne la durée estimée."""
        return obj.estimate_duration()


class PointOfInterestSerializer(serializers.ModelSerializer):
    """Serializer pour les points d'intérêt."""
    
    distance_to_user = serializers.SerializerMethodField()
    
    class Meta:
        model = PointOfInterest
        fields = [
            'id', 'name', 'description', 'latitude', 'longitude', 'poi_type',
            'address', 'phone', 'website', 'is_active', 'rating',
            'distance_to_user', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_distance_to_user(self, obj):
        """Calcule la distance vers l'utilisateur."""
        request = self.context.get('request')
        if request and hasattr(request, 'user_lat') and hasattr(request, 'user_lng'):
            return obj.get_distance_to(request.user_lat, request.user_lng)
        return None


class GeolocationAlertSerializer(serializers.ModelSerializer):
    """Serializer pour les alertes de géolocalisation."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    request_title = serializers.CharField(source='request.title', read_only=True)
    
    class Meta:
        model = GeolocationAlert
        fields = [
            'id', 'alert_type', 'title', 'message', 'severity', 'is_read',
            'read_at', 'latitude', 'longitude', 'extra_data', 'user', 'user_name',
            'request', 'request_title', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'read_at']


class GeolocationSettingsSerializer(serializers.ModelSerializer):
    """Serializer pour les paramètres de géolocalisation."""
    
    user_name = serializers.CharField(source='user.get_full_name', read_only=True)
    
    class Meta:
        model = GeolocationSettings
        fields = [
            'id', 'user', 'user_name', 'location_sharing_enabled',
            'background_location_enabled', 'high_accuracy_mode',
            'location_update_interval_seconds', 'max_location_history_days',
            'geofencing_enabled', 'speed_limit_kmh', 'battery_threshold_percent',
            'accuracy_threshold_meters', 'alert_notifications_enabled',
            'map_provider', 'default_zoom_level', 'show_traffic', 'show_pois',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_location_update_interval_seconds(self, value):
        """Validation de l'intervalle de mise à jour."""
        if value < 5:
            raise serializers.ValidationError("L'intervalle minimum est de 5 secondes.")
        if value > 3600:
            raise serializers.ValidationError("L'intervalle maximum est de 3600 secondes.")
        return value
    
    def validate_max_location_history_days(self, value):
        """Validation de la durée d'historique."""
        if value < 1:
            raise serializers.ValidationError("La durée minimum est de 1 jour.")
        if value > 365:
            raise serializers.ValidationError("La durée maximum est de 365 jours.")
        return value
    
    def validate_battery_threshold_percent(self, value):
        """Validation du seuil de batterie."""
        if value < 0 or value > 100:
            raise serializers.ValidationError("Le seuil doit être entre 0 et 100%.")
        return value
    
    def validate_accuracy_threshold_meters(self, value):
        """Validation du seuil de précision."""
        if value < 1:
            raise serializers.ValidationError("Le seuil minimum est de 1 mètre.")
        if value > 10000:
            raise serializers.ValidationError("Le seuil maximum est de 10000 mètres.")
        return value


class LocationUpdateSerializer(serializers.Serializer):
    """Serializer pour la mise à jour de localisation."""
    
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    accuracy = serializers.FloatField(required=False, allow_null=True)
    altitude = serializers.FloatField(required=False, allow_null=True)
    speed = serializers.FloatField(required=False, allow_null=True)
    heading = serializers.FloatField(required=False, allow_null=True)
    is_moving = serializers.BooleanField(required=False, default=False)
    battery_level = serializers.IntegerField(required=False, allow_null=True)
    location_source = serializers.ChoiceField(
        choices=[
            ('gps', 'GPS'),
            ('network', 'Réseau cellulaire'),
            ('wifi', 'WiFi'),
            ('manual', 'Manuel'),
        ],
        required=False,
        default='gps'
    )
    address = serializers.CharField(required=False, allow_blank=True)
    city = serializers.CharField(required=False, allow_blank=True)
    country = serializers.CharField(required=False, default='CI')
    
    def validate_latitude(self, value):
        """Validation de la latitude."""
        if value < -90 or value > 90:
            raise serializers.ValidationError("La latitude doit être entre -90 et 90.")
        return value
    
    def validate_longitude(self, value):
        """Validation de la longitude."""
        if value < -180 or value > 180:
            raise serializers.ValidationError("La longitude doit être entre -180 et 180.")
        return value
    
    def validate_accuracy(self, value):
        """Validation de la précision."""
        if value is not None and value < 0:
            raise serializers.ValidationError("La précision doit être positive.")
        return value
    
    def validate_speed(self, value):
        """Validation de la vitesse."""
        if value is not None and value < 0:
            raise serializers.ValidationError("La vitesse doit être positive.")
        return value
    
    def validate_heading(self, value):
        """Validation de la direction."""
        if value is not None and (value < 0 or value > 360):
            raise serializers.ValidationError("La direction doit être entre 0 et 360 degrés.")
        return value
    
    def validate_battery_level(self, value):
        """Validation du niveau de batterie."""
        if value is not None and (value < 0 or value > 100):
            raise serializers.ValidationError("Le niveau de batterie doit être entre 0 et 100%.")
        return value


class GeofenceSerializer(serializers.Serializer):
    """Serializer pour les géofences."""
    
    name = serializers.CharField(max_length=200)
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    radius_meters = serializers.FloatField()
    is_active = serializers.BooleanField(default=True)
    
    def validate_radius_meters(self, value):
        """Validation du rayon."""
        if value < 10:
            raise serializers.ValidationError("Le rayon minimum est de 10 mètres.")
        if value > 50000:
            raise serializers.ValidationError("Le rayon maximum est de 50000 mètres.")
        return value


class RouteCalculationSerializer(serializers.Serializer):
    """Serializer pour le calcul d'itinéraire."""
    
    start_latitude = serializers.FloatField()
    start_longitude = serializers.FloatField()
    end_latitude = serializers.FloatField()
    end_longitude = serializers.FloatField()
    route_type = serializers.ChoiceField(
        choices=[
            ('driving', 'Voiture'),
            ('walking', 'À pied'),
            ('bicycling', 'Vélo'),
            ('transit', 'Transport en commun'),
        ],
        default='driving'
    )
    avoid_tolls = serializers.BooleanField(default=False)
    avoid_highways = serializers.BooleanField(default=False)
    
    def validate(self, data):
        """Validation croisée des coordonnées."""
        start_lat, start_lng = data['start_latitude'], data['start_longitude']
        end_lat, end_lng = data['end_latitude'], data['end_longitude']
        
        # Vérifier que les points de départ et d'arrivée sont différents
        if abs(start_lat - end_lat) < 0.0001 and abs(start_lng - end_lng) < 0.0001:
            raise serializers.ValidationError("Les points de départ et d'arrivée doivent être différents.")
        
        return data


class NearbyTechniciansSerializer(serializers.Serializer):
    """Serializer pour les techniciens à proximité."""
    
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
    radius_km = serializers.FloatField(default=10.0)
    specialty = serializers.CharField(required=False, allow_blank=True)
    max_results = serializers.IntegerField(default=10, min_value=1, max_value=50)
    
    def validate_radius_km(self, value):
        """Validation du rayon de recherche."""
        if value < 0.1:
            raise serializers.ValidationError("Le rayon minimum est de 0.1 km.")
        if value > 100:
            raise serializers.ValidationError("Le rayon maximum est de 100 km.")
        return value


class GeolocationDashboardSerializer(serializers.Serializer):
    """Serializer pour le tableau de bord de géolocalisation."""
    
    total_active_locations = serializers.IntegerField()
    technicians_online = serializers.IntegerField()
    clients_online = serializers.IntegerField()
    active_zones = serializers.IntegerField()
    total_routes = serializers.IntegerField()
    alerts_today = serializers.IntegerField()
    avg_location_accuracy = serializers.FloatField()
    recent_locations = LocationHistorySerializer(many=True)
    active_zones_list = ServiceZoneSerializer(many=True)
    recent_alerts = GeolocationAlertSerializer(many=True)

class SupportRequestSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupportRequest
        fields = ['id', 'name', 'email', 'subject', 'message', 'attachment', 'status', 'created_at', 'user']
        read_only_fields = ['id', 'status', 'created_at', 'user']

class FAQSerializer(serializers.ModelSerializer):
    class Meta:
        model = FAQ
        fields = ['id', 'question', 'answer', 'category', 'order', 'is_active']
        read_only_fields = ['id']