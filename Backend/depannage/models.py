from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.db.models import Avg, Q
from decimal import Decimal
import uuid


# ============================================================================
# MODÈLES DE BASE ET UTILISATEURS
# ============================================================================

class BaseTimeStampModel(models.Model):
    """Modèle de base avec timestamps automatiques."""
    created_at = models.DateTimeField("Date de création", auto_now_add=True)
    updated_at = models.DateTimeField("Date de modification", auto_now=True)
    
    class Meta:
        abstract = True


class Client(BaseTimeStampModel):
    """Profil client lié à un utilisateur."""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='client_profile'
    )
    address = models.TextField("Adresse complète")
    phone = models.CharField("Téléphone", max_length=20, blank=True)
    is_active = models.BooleanField("Actif", default=True)
    
    def __str__(self):
        return f"Client: {self.user.get_full_name() or self.user.username}"
    
    @property
    def total_requests(self):
        return self.repair_requests.count()
    
    @property
    def completed_requests(self):
        return self.repair_requests.filter(status='completed').count()
    
    class Meta:
        verbose_name = "Client"
        verbose_name_plural = "Clients"
        ordering = ['-created_at']


class Technician(BaseTimeStampModel):
    """Profil technicien/dépanneur lié à un utilisateur."""
    
    class Specialty(models.TextChoices):
        ELECTRICIAN = 'electrician', 'Électricien'
        PLUMBER = 'plumber', 'Plombier'
        MECHANIC = 'mechanic', 'Mécanicien'
        IT = 'it', 'Informatique'
        AIR_CONDITIONING = 'air_conditioning', 'Climatisation'
        APPLIANCE_REPAIR = 'appliance_repair', 'Électroménager'
        LOCKSMITH = 'locksmith', 'Serrurier'
        OTHER = 'other', 'Autre'
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='technician_profile'
    )
    specialty = models.CharField(
        "Spécialité", 
        max_length=50, 
        choices=Specialty.choices, 
        default=Specialty.OTHER
    )
    phone = models.CharField("Téléphone", max_length=20)
    is_available = models.BooleanField("Disponible", default=True)
    is_verified = models.BooleanField("Vérifié", default=False)
    years_experience = models.PositiveIntegerField("Années d'expérience", default=0)
    hourly_rate = models.DecimalField(
        "Tarif horaire (FCFA)", 
        max_digits=8, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    service_radius_km = models.PositiveIntegerField("Rayon d'intervention (km)", default=10)
    bio = models.TextField("Présentation", blank=True)
    
    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_specialty_display()}"
    
    @property
    def average_rating(self):
        """Calcule la note moyenne du technicien."""
        avg = self.repair_requests.filter(
            status='completed', 
            review__isnull=False
        ).aggregate(avg_rating=Avg('review__rating'))['avg_rating']
        return round(avg, 1) if avg else 0.0
    
    @property
    def total_jobs_completed(self):
        return self.repair_requests.filter(status='completed').count()
    
    @property
    def success_rate(self):
        total = self.repair_requests.exclude(status='pending').count()
        if total == 0:
            return 0
        completed = self.repair_requests.filter(status='completed').count()
        return round((completed / total) * 100, 1)
    
    class Meta:
        verbose_name = "Technicien"
        verbose_name_plural = "Techniciens"
        ordering = ['-is_verified', '-years_experience']


# ============================================================================
# GESTION DES DEMANDES
# ============================================================================

class RepairRequest(BaseTimeStampModel):
    """Demande de dépannage créée par un client."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        ASSIGNED = 'assigned', 'Assignée'
        IN_PROGRESS = 'in_progress', 'En cours'
        COMPLETED = 'completed', 'Terminée'
        CANCELLED = 'cancelled', 'Annulée'
    
    class Priority(models.TextChoices):
        LOW = 'low', 'Basse'
        MEDIUM = 'medium', 'Moyenne'
        HIGH = 'high', 'Haute'
        URGENT = 'urgent', 'Urgente'
    
    # Identifiant unique pour le suivi
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    # Relations
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='repair_requests'
    )
    technician = models.ForeignKey(
        Technician, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name='repair_requests'
    )
    
    # Détails de la demande
    title = models.CharField("Titre", max_length=200)
    description = models.TextField("Description détaillée")
    specialty_needed = models.CharField(
        "Spécialité requise", 
        max_length=50, 
        choices=Technician.Specialty.choices
    )
    priority = models.CharField(
        "Priorité", 
        max_length=20, 
        choices=Priority.choices, 
        default=Priority.MEDIUM
    )
    status = models.CharField(
        "Statut", 
        max_length=20, 
        choices=Status.choices, 
        default=Status.PENDING
    )
    
    # Localisation
    address = models.TextField("Adresse d'intervention")
    latitude = models.FloatField("Latitude", null=True, blank=True)
    longitude = models.FloatField("Longitude", null=True, blank=True)
    
    # Dates importantes
    preferred_date = models.DateTimeField("Date souhaitée", null=True, blank=True)
    assigned_at = models.DateTimeField("Assignée le", null=True, blank=True)
    started_at = models.DateTimeField("Commencée le", null=True, blank=True)
    completed_at = models.DateTimeField("Terminée le", null=True, blank=True)
    
    # Tarification
    estimated_price = models.DecimalField(
        "Prix estimé", 
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    final_price = models.DecimalField(
        "Prix final", 
        max_digits=10, 
        decimal_places=2, 
        null=True, 
        blank=True
    )
    travel_cost = models.DecimalField(
        "Frais de déplacement", 
        max_digits=8, 
        decimal_places=2, 
        default=Decimal('0.00')
    )
    
    def __str__(self):
        return f"#{self.id} - {self.title} - {self.get_status_display()}"
    
    @property
    def total_cost(self):
        if self.final_price:
            return self.final_price + self.travel_cost
        return None
    
    @property
    def duration_hours(self):
        if self.started_at and self.completed_at:
            delta = self.completed_at - self.started_at
            return round(delta.total_seconds() / 3600, 2)
        return None
    
    def assign_to_technician(self, technician):
        """Assigne la demande à un technicien."""
        self.technician = technician
        self.status = self.Status.ASSIGNED
        self.assigned_at = timezone.now()
        self.save()
    
    def start_work(self):
        """Marque le début du travail."""
        if self.status == self.Status.ASSIGNED:
            self.status = self.Status.IN_PROGRESS
            self.started_at = timezone.now()
            self.save()
    
    def complete_work(self, final_price=None):
        """Marque la fin du travail."""
        if self.status == self.Status.IN_PROGRESS:
            self.status = self.Status.COMPLETED
            self.completed_at = timezone.now()
            if final_price:
                self.final_price = final_price
            self.save()
    
    class Meta:
        verbose_name = "Demande de dépannage"
        verbose_name_plural = "Demandes de dépannage"
        ordering = ['-priority', '-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['specialty_needed', 'status']),
            models.Index(fields=['client', 'status']),
            models.Index(fields=['technician', 'status']),
        ]


class RequestDocument(BaseTimeStampModel):
    """Documents liés à une demande de dépannage."""
    
    class DocumentType(models.TextChoices):
        PHOTO_BEFORE = 'photo_before', 'Photo avant'
        PHOTO_AFTER = 'photo_after', 'Photo après'
        INVOICE = 'invoice', 'Facture'
        ESTIMATE = 'estimate', 'Devis'
        OTHER = 'other', 'Autre'
    
    def get_upload_path(self, filename):
        return f'requests/{self.request.uuid}/documents/{filename}'
    
    request = models.ForeignKey(
        RepairRequest, 
        on_delete=models.CASCADE, 
        related_name='documents'
    )
    file = models.FileField("Fichier", upload_to=get_upload_path)
    document_type = models.CharField(
        "Type de document", 
        max_length=20, 
        choices=DocumentType.choices, 
        default=DocumentType.OTHER
    )
    description = models.CharField("Description", max_length=200, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='uploaded_documents'
    )
    
    def __str__(self):
        return f"Document {self.get_document_type_display()} - Demande #{self.request.id}"
    
    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        ordering = ['-created_at']


# ============================================================================
# SYSTÈME D'ÉVALUATION
# ============================================================================

class Review(BaseTimeStampModel):
    """Avis laissé par un client sur une demande terminée."""
    request = models.OneToOneField(
        RepairRequest, 
        on_delete=models.CASCADE, 
        related_name='review'
    )
    client = models.ForeignKey(
        Client, 
        on_delete=models.CASCADE, 
        related_name='reviews_given'
    )
    technician = models.ForeignKey(
        Technician, 
        on_delete=models.CASCADE, 
        related_name='reviews_received'
    )
    rating = models.PositiveSmallIntegerField(
        "Note", 
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField("Commentaire", blank=True)
    would_recommend = models.BooleanField("Recommanderait", default=True)
    
    # Critères détaillés
    punctuality_rating = models.PositiveSmallIntegerField(
        "Ponctualité", 
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    quality_rating = models.PositiveSmallIntegerField(
        "Qualité du travail", 
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    communication_rating = models.PositiveSmallIntegerField(
        "Communication", 
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True, blank=True
    )
    
    def __str__(self):
        return f"Avis {self.rating}/5 - {self.technician.user.get_full_name()}"
    
    class Meta:
        verbose_name = "Avis"
        verbose_name_plural = "Avis"
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(
                fields=['request'], 
                name='unique_review_per_request'
            )
        ]


# ============================================================================
# GESTION DES PAIEMENTS
# ============================================================================

class Payment(BaseTimeStampModel):
    """Paiement lié à une demande de dépannage."""
    
    class Status(models.TextChoices):
        PENDING = 'pending', 'En attente'
        PROCESSING = 'processing', 'En cours'
        COMPLETED = 'completed', 'Complété'
        FAILED = 'failed', 'Échoué'
        REFUNDED = 'refunded', 'Remboursé'
    
    class Method(models.TextChoices):
        ORANGE_MONEY = 'orange_money', 'Orange Money'
        MOOV_MONEY = 'moov_money', 'Moov Money'
        CASH = 'cash', 'Espèces'
        BANK_TRANSFER = 'bank_transfer', 'Virement bancaire'
    
    class PaymentType(models.TextChoices):
        CLIENT_PAYMENT = 'client_payment', 'Paiement client'
        TECHNICIAN_PAYOUT = 'technician_payout', 'Paiement technicien'
        REFUND = 'refund', 'Remboursement'
    
    # Identifiant unique pour le suivi
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    
    request = models.ForeignKey(
        RepairRequest, 
        on_delete=models.CASCADE, 
        related_name='payments'
    )
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='payments_made'
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='payments_received'
    )
    
    amount = models.DecimalField("Montant", max_digits=10, decimal_places=2)
    status = models.CharField("Statut", max_length=20, choices=Status.choices, default=Status.PENDING)
    method = models.CharField("Méthode", max_length=20, choices=Method.choices)
    payment_type = models.CharField("Type de paiement", max_length=20, choices=PaymentType.choices)
    
    # Détails du paiement
    transaction_id = models.CharField("ID Transaction", max_length=100, blank=True)
    reference = models.CharField("Référence", max_length=100, blank=True)
    fees = models.DecimalField("Frais", max_digits=8, decimal_places=2, default=Decimal('0.00'))
    
    # Métadonnées
    processed_at = models.DateTimeField("Traité le", null=True, blank=True)
    notes = models.TextField("Notes", blank=True)
    
    def __str__(self):
        return f"Paiement {self.amount} FCFA - {self.get_status_display()}"
    
    @property
    def net_amount(self):
        amount = self.amount if self.amount is not None else Decimal('0')
        fees = self.fees if self.fees is not None else Decimal('0')
        return amount - fees
    
    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['status', 'created_at']),
            models.Index(fields=['payer', 'status']),
            models.Index(fields=['recipient', 'status']),
        ]


# ============================================================================
# SYSTÈME DE MESSAGERIE
# ============================================================================

class Conversation(BaseTimeStampModel):
    """Conversation entre utilisateurs liée à une demande."""
    request = models.OneToOneField(
        RepairRequest, 
        on_delete=models.CASCADE, 
        related_name='conversation'
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, 
        related_name='conversations'
    )
    is_active = models.BooleanField("Active", default=True)
    
    def __str__(self):
        return f"Conversation - Demande #{self.request.id}"
    
    @property
    def latest_message(self):
        return self.messages.first()
    
    def unread_count_for_user(self, user):
        return self.messages.filter(is_read=False).exclude(sender=user).count()
    
    class Meta:
        verbose_name = "Conversation"
        verbose_name_plural = "Conversations"
        ordering = ['-updated_at']


class Message(BaseTimeStampModel):
    """Message dans une conversation."""
    
    class MessageType(models.TextChoices):
        TEXT = 'text', 'Texte'
        IMAGE = 'image', 'Image'
        FILE = 'file', 'Fichier'
        SYSTEM = 'system', 'Système'
    
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE, 
        related_name='messages'
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='sent_messages'
    )
    content = models.TextField("Contenu")
    message_type = models.CharField(
        "Type", 
        max_length=20, 
        choices=MessageType.choices, 
        default=MessageType.TEXT
    )
    is_read = models.BooleanField("Lu", default=False)
    read_at = models.DateTimeField("Lu le", null=True, blank=True)
    
    def __str__(self):
        return f"Message de {self.sender.get_full_name()} - {self.created_at}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
    
    class Meta:
        verbose_name = "Message"
        verbose_name_plural = "Messages"
        ordering = ['-created_at']


class MessageAttachment(BaseTimeStampModel):
    """Pièce jointe d'un message."""
    
    def get_upload_path(self, filename):
        return f'messages/{self.message.conversation.request.uuid}/{filename}'
    
    message = models.ForeignKey(
        Message, 
        on_delete=models.CASCADE, 
        related_name='attachments'
    )
    file = models.FileField("Fichier", upload_to=get_upload_path)
    file_name = models.CharField("Nom du fichier", max_length=255)
    file_size = models.PositiveIntegerField("Taille du fichier")
    content_type = models.CharField("Type MIME", max_length=100)
    
    def __str__(self):
        return f"Pièce jointe - {self.file_name}"
    
    class Meta:
        verbose_name = "Pièce jointe"
        verbose_name_plural = "Pièces jointes"


# ============================================================================
# SYSTÈME DE NOTIFICATIONS
# ============================================================================

class Notification(BaseTimeStampModel):
    """Notification envoyée à un utilisateur."""
    
    class Type(models.TextChoices):
        REQUEST_CREATED = 'request_created', 'Nouvelle demande'
        REQUEST_ASSIGNED = 'request_assigned', 'Demande assignée'
        REQUEST_STARTED = 'request_started', 'Travail commencé'
        REQUEST_COMPLETED = 'request_completed', 'Travail terminé'
        MESSAGE_RECEIVED = 'message_received', 'Nouveau message'
        PAYMENT_RECEIVED = 'payment_received', 'Paiement reçu'
        REVIEW_RECEIVED = 'review_received', 'Nouvel avis'
        SYSTEM = 'system', 'Système'
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='notifications'
    )
    type = models.CharField("Type", max_length=30, choices=Type.choices)
    title = models.CharField("Titre", max_length=200)
    message = models.TextField("Message")
    is_read = models.BooleanField("Lue", default=False)
    read_at = models.DateTimeField("Lue le", null=True, blank=True)
    
    # Lien optionnel vers un objet
    request = models.ForeignKey(
        RepairRequest, 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='notifications'
    )
    
    # Données supplémentaires (JSON)
    extra_data = models.JSONField("Données supplémentaires", default=dict, blank=True)
    
    def __str__(self):
        return f"{self.get_type_display()} - {self.recipient.get_full_name()}"
    
    def mark_as_read(self):
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()
    
    class Meta:
        verbose_name = "Notification"
        verbose_name_plural = "Notifications"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read', '-created_at']),
        ]


# ============================================================================
# GESTION DE LA LOCALISATION
# ============================================================================

class TechnicianLocation(BaseTimeStampModel):
    """Localisation en temps réel d'un technicien."""
    technician = models.OneToOneField(
        Technician, 
        on_delete=models.CASCADE, 
        related_name='location'
    )
    latitude = models.FloatField("Latitude")
    longitude = models.FloatField("Longitude")
    
    # Si vous avez un champ accuracy, ajoutez-le ici
    # accuracy = models.FloatField("Précision", null=True, blank=True)
    
    # Si vous avez un champ is_active, ajoutez-le ici
    # is_active = models.BooleanField("Actif", default=True)
    
    def __str__(self):
        return f"Localisation de {self.technician.user.get_full_name()}"
    
    class Meta:
        verbose_name = "Localisation de technicien"
        verbose_name_plural = "Localisations des techniciens"
        indexes = [
            models.Index(fields=['technician']),
        ]


# ============================================================================
# SYSTÈME DE CONFIGURATION
# ============================================================================

class SystemConfiguration(BaseTimeStampModel):
    """Configuration système de l'application."""
    key = models.CharField("Clé", max_length=100, unique=True)
    value = models.TextField("Valeur")
    description = models.TextField("Description", blank=True)
    is_active = models.BooleanField("Actif", default=True)
    
    def __str__(self):
        return f"{self.key}: {self.value}"
    
    class Meta:
        verbose_name = "Configuration système"
        verbose_name_plural = "Configurations système"
        ordering = ['key']


class CinetPayPayment(models.Model):
    """Modèle pour gérer les paiements CinetPay."""
    STATUS_CHOICES = [
        ('pending', 'En attente'),
        ('success', 'Réussi'),
        ('failed', 'Échoué'),
        ('cancelled', 'Annulé'),
    ]
    
    # Informations de base
    transaction_id = models.CharField("ID Transaction", max_length=100, unique=True)
    amount = models.DecimalField("Montant", max_digits=10, decimal_places=2)
    currency = models.CharField("Devise", max_length=3, default='XOF')
    description = models.TextField("Description")
    
    # Informations client
    customer_name = models.CharField("Nom client", max_length=100)
    customer_surname = models.CharField("Prénom client", max_length=100)
    customer_email = models.EmailField("Email client")
    customer_phone_number = models.CharField("Téléphone client", max_length=20)
    customer_address = models.CharField("Adresse client", max_length=200)
    customer_city = models.CharField("Ville client", max_length=100)
    customer_country = models.CharField("Pays client", max_length=2, default='CI')
    customer_state = models.CharField("État client", max_length=2, default='CI')
    customer_zip_code = models.CharField("Code postal client", max_length=10)
    
    # Informations CinetPay
    payment_token = models.CharField("Token de paiement", max_length=255, blank=True, null=True)
    payment_url = models.URLField("URL de paiement", blank=True, null=True)
    cinetpay_transaction_id = models.CharField("ID Transaction CinetPay", max_length=100, blank=True, null=True)
    
    # Statut et métadonnées
    status = models.CharField("Statut", max_length=20, choices=STATUS_CHOICES, default='pending')
    metadata = models.TextField("Métadonnées", blank=True)
    invoice_data = models.JSONField("Données facture", default=dict, blank=True)
    
    # Liens avec d'autres modèles
    request = models.ForeignKey(RepairRequest, on_delete=models.CASCADE, related_name='cinetpay_payments', verbose_name="Demande de réparation")
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='cinetpay_payments', verbose_name="Utilisateur")
    
    # Timestamps
    created_at = models.DateTimeField("Créé le", auto_now_add=True)
    updated_at = models.DateTimeField("Modifié le", auto_now=True)
    paid_at = models.DateTimeField("Payé le", blank=True, null=True)
    
    def __str__(self):
        return f"Paiement {self.transaction_id} - {self.amount} {self.currency}"
    
    class Meta:
        verbose_name = "Paiement CinetPay"
        verbose_name_plural = "Paiements CinetPay"
        ordering = ['-created_at']
    
    def generate_transaction_id(self):
        """Génère un ID de transaction unique."""
        import uuid
        return f"TXN_{uuid.uuid4().hex[:16].upper()}"
    
    def get_total_amount(self):
        """Retourne le montant total en tenant compte des frais d'urgence."""
        total = self.amount
        if self.request.is_urgent:
            total += 25000  # Frais d'urgence
        return total