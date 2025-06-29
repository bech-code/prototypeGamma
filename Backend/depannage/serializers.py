from rest_framework import serializers
from .models import (
    Client, Technician, RepairRequest, RequestDocument, Review, 
    Payment, Conversation, Message, MessageAttachment, 
    Notification, TechnicianLocation, SystemConfiguration, CinetPayPayment
)
from django.conf import settings

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
            'is_available', 'is_verified', 'service_radius_km', 'bio', 'created_at'
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

class RepairRequestSerializer(serializers.ModelSerializer):
    client = ClientSerializer(read_only=True)
    technician = TechnicianSerializer(read_only=True)
    
    class Meta:
        model = RepairRequest
        fields = [
            'id', 'uuid', 'client', 'technician', 'title', 'description',
            'specialty_needed', 'priority', 'status', 'address', 'latitude', 'longitude',
            'preferred_date', 'assigned_at', 'started_at', 'completed_at',
            'estimated_price', 'final_price', 'travel_cost',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uuid', 'created_at', 'updated_at', 'assigned_at', 'started_at', 'completed_at']


class RequestDocumentSerializer(serializers.ModelSerializer):
    """Serializer pour les documents de demande."""
    
    class Meta:
        model = RequestDocument
        fields = ['id', 'request', 'document_type', 'file', 'description', 'uploaded_by', 'created_at']
        read_only_fields = ['id', 'created_at']


class ReviewSerializer(serializers.ModelSerializer):
    """Serializer pour les avis."""
    
    client_name = serializers.CharField(source='client.user.get_full_name', read_only=True)
    technician_name = serializers.CharField(source='technician.user.get_full_name', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'request', 'client', 'technician', 'rating',
            'comment', 'would_recommend', 'punctuality_rating', 'quality_rating', 
            'communication_rating', 'client_name', 'technician_name', 'created_at'
        ]
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
            'id', 'technician', 'latitude', 'longitude', 'accuracy', 'is_active', 'created_at'
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
    
    # Champs du frontend (non présents dans le modèle)
    service_type = serializers.CharField(required=False, help_text="Type de service (sera mappé vers specialty_needed)")
    date = serializers.DateField(required=False, help_text="Date souhaitée")
    time = serializers.TimeField(required=False, help_text="Heure souhaitée")
    is_urgent = serializers.BooleanField(default=False, help_text="Demande urgente")
    city = serializers.CharField(required=False, help_text="Ville (sera ajoutée à l'adresse)")
    postalCode = serializers.CharField(required=False, help_text="Code postal (sera ajouté à l'adresse)")
    
    class Meta:
        model = RepairRequest
        fields = [
            'title', 'description', 'address', 'specialty_needed', 'priority', 'estimated_price',
            # Champs supplémentaires du frontend (non dans le modèle)
            'date', 'time', 'is_urgent', 'service_type', 'city', 'postalCode'
        ]
        extra_kwargs = {
            'title': {'required': False},
            'specialty_needed': {'required': False},
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
            from django.utils import timezone
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
            'payment_token', 'payment_url', 'status', 'metadata', 'invoice_data',
            'request', 'user', 'created_at', 'updated_at', 'paid_at'
        ]
        read_only_fields = [
            'id', 'transaction_id', 'payment_token', 'payment_url', 'status',
            'created_at', 'updated_at', 'paid_at'
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
    currency = serializers.CharField(max_length=3)
    status = serializers.CharField(max_length=20)
    payment_date = serializers.DateTimeField()
    payment_method = serializers.CharField(max_length=50, required=False)
    operator = serializers.CharField(max_length=50, required=False)
    
    def validate_status(self, value):
        """Valide le statut du paiement."""
        valid_statuses = ['ACCEPTED', 'REFUSED', 'PENDING', 'CANCELLED']
        if value not in valid_statuses:
            raise serializers.ValidationError(f"Statut invalide. Valeurs acceptées: {', '.join(valid_statuses)}")
        return value 
    

class RepairRequestCreateSerializer(serializers.ModelSerializer):
    client = serializers.PrimaryKeyRelatedField(
        queryset=Client.objects.all(),
        default=serializers.CurrentUserDefault()
    )
    
    class Meta:
        model = RepairRequest
        fields = [
            'client', 'title', 'description', 'specialty_needed',
            'address', 'preferred_date', 'is_urgent', 'priority',
            'estimated_price'
        ]
        extra_kwargs = {
            'client': {'read_only': True},
        }

    def validate(self, data):
        user = self.context['request'].user
        if not hasattr(user, 'client_profile'):
            raise serializers.ValidationError("L'utilisateur n'a pas de profil client")
        
        data['client'] = user.client_profile
        return data