from rest_framework import serializers
from .models import (
    Client, Technician, RepairRequest, RequestDocument, Review, 
    Payment, Conversation, Message, MessageAttachment, 
    Notification, TechnicianLocation, SystemConfiguration, CinetPayPayment, PlatformConfiguration, ClientLocation, Report, AdminNotification, SubscriptionPaymentRequest, TechnicianSubscription
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

    class Meta:
        model = Review
        fields = [
            'id', 'request', 'technician', 'rating',
            'comment', 'would_recommend', 'punctuality_rating', 'quality_rating', 
            'communication_rating', 'client_name', 'technician_name', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']

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
        read_only_fields = ['id', 'created_at', 'reviewed_at', 'reviewed_by']

class AdminNotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = AdminNotification
        fields = '__all__'

class AuditLogSerializer(serializers.ModelSerializer):
    user_email = serializers.ReadOnlyField(source='user.email')
    class Meta:
        model = AuditLog
        fields = '__all__'


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