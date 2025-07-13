from django.db import models
from django.conf import settings
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from django.db.models import Avg, Q
from decimal import Decimal
import uuid
from django.contrib.postgres.fields import ArrayField
from django.db.models import JSONField
from django.db.models.signals import post_delete, post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer


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
        related_name="client_profile",
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
        return self.repair_requests.filter(status="completed").count()

    class Meta:
        verbose_name = "Client"
        verbose_name_plural = "Clients"
        ordering = ["-created_at"]


class Technician(BaseTimeStampModel):
    """Profil technicien/dépanneur lié à un utilisateur."""

    class Specialty(models.TextChoices):
        ELECTRICIAN = "electrician", "Électricien"
        PLUMBER = "plumber", "Plombier"
        MECHANIC = "mechanic", "Mécanicien"
        IT = "it", "Informatique"
        AIR_CONDITIONING = "air_conditioning", "Climatisation"
        APPLIANCE_REPAIR = "appliance_repair", "Électroménager"
        LOCKSMITH = "locksmith", "Serrurier"
        OTHER = "other", "Autre"

    class ExperienceLevel(models.TextChoices):
        JUNIOR = "junior", "Junior (0-2 ans)"
        INTERMEDIATE = "intermediate", "Intermédiaire (2-5 ans)"
        SENIOR = "senior", "Senior (5-10 ans)"
        EXPERT = "expert", "Expert (10+ ans)"

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="technician_depannage",
    )
    specialty = models.CharField(
        "Spécialité", max_length=50, choices=Specialty.choices, default=Specialty.OTHER
    )
    phone = models.CharField("Téléphone", max_length=20)
    is_available = models.BooleanField("Disponible", default=True)
    is_verified = models.BooleanField("Vérifié", default=False)
    years_experience = models.PositiveIntegerField("Années d'expérience", default=0)
    experience_level = models.CharField(
        "Niveau d'expérience",
        max_length=20,
        choices=ExperienceLevel.choices,
        default=ExperienceLevel.JUNIOR,
    )
    hourly_rate = models.DecimalField(
        "Tarif horaire (FCFA)", max_digits=8, decimal_places=2, default=Decimal("0.00")
    )
    last_position_update = models.DateTimeField(
        "Dernière mise à jour de position", null=True, blank=True
    )
    current_latitude = models.FloatField("Latitude actuelle", null=True, blank=True)
    current_longitude = models.FloatField("Longitude actuelle", null=True, blank=True)
    is_available_urgent = models.BooleanField("Disponible pour urgence", default=False)
    response_time_minutes = models.PositiveIntegerField(
        "Temps de réponse moyen (minutes)", default=30
    )
    badge_level = models.CharField(
        "Niveau de badge",
        max_length=20,
        choices=[
            ("bronze", "Bronze"),
            ("silver", "Argent"),
            ("gold", "Or"),
            ("platinum", "Platine"),
        ],
        default="bronze",
    )
    service_radius_km = models.PositiveIntegerField(
        "Rayon d'intervention (km)", default=10
    )
    bio = models.TextField("Présentation", blank=True)

    def __str__(self):
        return f"{self.user.get_full_name() or self.user.username} - {self.get_specialty_display()}"

    @property
    def average_rating(self):
        """Calcule la note moyenne du technicien."""
        avg = self.repair_requests.filter(
            status="completed", review__isnull=False
        ).aggregate(avg_rating=Avg("review__rating"))["avg_rating"]
        return round(avg, 1) if avg else 0.0

    @property
    def total_jobs_completed(self):
        return self.repair_requests.filter(status="completed").count()

    @property
    def success_rate(self):
        total = self.repair_requests.exclude(status="pending").count()
        if total == 0:
            return 0
        completed = self.repair_requests.filter(status="completed").count()
        return round((completed / total) * 100, 1)

    @property
    def has_active_subscription(self):
        """Tous les techniciens sont maintenant gratuits - toujours actif"""
        return True

    class Meta:
        verbose_name = "Technicien"
        verbose_name_plural = "Techniciens"
        ordering = ["-is_verified", "-years_experience"]


# ============================================================================
# GESTION DES DEMANDES
# ============================================================================


class RepairRequest(BaseTimeStampModel):
    """Demande de dépannage créée par un client."""

    class Status(models.TextChoices):
        DRAFT = "draft", "Brouillon"
        PENDING = "pending", "En attente"
        ASSIGNED = "assigned", "Assignée"
        IN_PROGRESS = "in_progress", "En cours"
        COMPLETED = "completed", "Terminée"
        CANCELLED = "cancelled", "Annulée"

    class UrgencyLevel(models.TextChoices):
        NORMAL = "normal", "Normal (48h)"
        SAME_DAY = "same_day", "Dans la journée"
        URGENT = "urgent", "Urgent (2h)"
        SOS = "sos", "SOS (30min)"

    class Priority(models.TextChoices):
        LOW = "low", "Basse"
        MEDIUM = "medium", "Moyenne"
        HIGH = "high", "Haute"
        URGENT = "urgent", "Urgente"

    # Identifiant unique pour le suivi
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    # Relations
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="repair_requests"
    )
    technician = models.ForeignKey(
        Technician,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="repair_requests",
    )

    # Détails de la demande
    title = models.CharField("Titre", max_length=200)
    description = models.TextField("Description détaillée", blank=True, null=True)
    specialty_needed = models.CharField(
        "Spécialité requise", max_length=50, choices=Technician.Specialty.choices
    )
    priority = models.CharField(
        "Priorité", max_length=20, choices=Priority.choices, default=Priority.MEDIUM
    )
    urgency_level = models.CharField(
        "Niveau d'urgence",
        max_length=20,
        choices=UrgencyLevel.choices,
        default=UrgencyLevel.NORMAL,
    )
    min_experience_level = models.CharField(
        "Niveau d'expérience minimum requis",
        max_length=20,
        choices=Technician.ExperienceLevel.choices,
        default=Technician.ExperienceLevel.JUNIOR,
    )
    min_rating = models.PositiveSmallIntegerField(
        "Note minimale requise",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
    )
    status = models.CharField(
        "Statut", max_length=20, choices=Status.choices, default=Status.PENDING
    )
    last_position_refresh = models.DateTimeField(
        "Dernière actualisation de position", null=True, blank=True
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
        "Prix estimé", max_digits=10, decimal_places=2, null=True, blank=True
    )
    final_price = models.DecimalField(
        "Prix final", max_digits=10, decimal_places=2, null=True, blank=True
    )
    travel_cost = models.DecimalField(
        "Frais de déplacement", max_digits=8, decimal_places=2, default=Decimal("0.00")
    )

    # Champs d'aide frontend stockés pour l'historique
    is_urgent = models.BooleanField("Demande urgente (frontend)", default=False)
    city = models.CharField("Ville (frontend)", max_length=100, blank=True)
    postalCode = models.CharField("Code postal (frontend)", max_length=20, blank=True)
    date = models.DateField("Date souhaitée (frontend)", null=True, blank=True)
    time = models.TimeField("Heure souhaitée (frontend)", null=True, blank=True)
    service_type = models.CharField("Type de service (frontend)", max_length=50, blank=True)

    # Nouveau champ no_show_count
    no_show_count = models.PositiveIntegerField(default=0, verbose_name="Nombre de signalements d'absence technicien")
    # Nouveau champ : validation finale de la mission par le client
    mission_validated = models.BooleanField(default=False, verbose_name="Mission validée par le client")

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
        ordering = ["-priority", "-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["specialty_needed", "status"]),
            models.Index(fields=["client", "status"]),
            models.Index(fields=["technician", "status"]),
        ]


class RequestDocument(BaseTimeStampModel):
    """Documents liés à une demande de dépannage."""

    class DocumentType(models.TextChoices):
        PHOTO_BEFORE = "photo_before", "Photo avant"
        PHOTO_AFTER = "photo_after", "Photo après"
        INVOICE = "invoice", "Facture"
        ESTIMATE = "estimate", "Devis"
        OTHER = "other", "Autre"

    def get_upload_path(self, filename):
        return f"requests/{self.request.uuid}/documents/{filename}"

    request = models.ForeignKey(
        RepairRequest, on_delete=models.CASCADE, related_name="documents"
    )
    file = models.FileField("Fichier", upload_to=get_upload_path)
    document_type = models.CharField(
        "Type de document",
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.OTHER,
    )
    description = models.CharField("Description", max_length=200, blank=True)
    uploaded_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="uploaded_documents",
    )

    def __str__(self):
        return (
            f"Document {self.get_document_type_display()} - Demande #{self.request.id}"
        )

    class Meta:
        verbose_name = "Document"
        verbose_name_plural = "Documents"
        ordering = ["-created_at"]


# ============================================================================
# SYSTÈME D'ÉVALUATION
# ============================================================================


class Review(BaseTimeStampModel):
    """Avis laissé par un client sur une demande terminée."""

    request = models.OneToOneField(
        RepairRequest, on_delete=models.CASCADE, related_name="review"
    )
    client = models.ForeignKey(
        Client, on_delete=models.CASCADE, related_name="reviews_given"
    )
    technician = models.ForeignKey(
        Technician, on_delete=models.CASCADE, related_name="reviews_received"
    )
    rating = models.PositiveSmallIntegerField(
        "Note", validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    comment = models.TextField("Commentaire", blank=True)
    would_recommend = models.BooleanField("Recommanderait", default=True)
    is_visible = models.BooleanField("Visible", default=True)

    # Critères détaillés
    punctuality_rating = models.PositiveSmallIntegerField(
        "Ponctualité",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
    )
    quality_rating = models.PositiveSmallIntegerField(
        "Qualité du travail",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
    )
    communication_rating = models.PositiveSmallIntegerField(
        "Communication",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
    )

    def __str__(self):
        return f"Avis {self.rating}/5 - {self.technician.user.get_full_name()}"

    class Meta:
        verbose_name = "Avis"
        verbose_name_plural = "Avis"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["request"], name="unique_review_per_request"
            )
        ]


# ============================================================================
# GESTION DES PAIEMENTS
# ============================================================================


class Payment(BaseTimeStampModel):
    """Paiement lié à une demande de dépannage."""

    class Status(models.TextChoices):
        PENDING = "pending", "En attente"
        PROCESSING = "processing", "En cours"
        COMPLETED = "completed", "Complété"
        FAILED = "failed", "Échoué"
        REFUNDED = "refunded", "Remboursé"

    class Method(models.TextChoices):
        ORANGE_MONEY = "orange_money", "Orange Money"
        MOOV_MONEY = "moov_money", "Moov Money"
        CASH = "cash", "Espèces"
        BANK_TRANSFER = "bank_transfer", "Virement bancaire"

    class PaymentType(models.TextChoices):
        CLIENT_PAYMENT = "client_payment", "Paiement client"
        TECHNICIAN_PAYOUT = "technician_payout", "Paiement technicien"
        REFUND = "refund", "Remboursement"

    # Identifiant unique pour le suivi
    uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)

    request = models.ForeignKey(
        RepairRequest, on_delete=models.CASCADE, related_name="payments"
    )
    payer = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="payments_made"
    )
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="payments_received",
    )

    amount = models.DecimalField("Montant", max_digits=10, decimal_places=2)
    status = models.CharField(
        "Statut", max_length=20, choices=Status.choices, default=Status.PENDING
    )
    method = models.CharField("Méthode", max_length=20, choices=Method.choices)
    payment_type = models.CharField(
        "Type de paiement", max_length=20, choices=PaymentType.choices
    )

    # Détails du paiement
    transaction_id = models.CharField("ID Transaction", max_length=100, blank=True)
    reference = models.CharField("Référence", max_length=100, blank=True)
    fees = models.DecimalField(
        "Frais", max_digits=8, decimal_places=2, default=Decimal("0.00")
    )

    # Métadonnées
    processed_at = models.DateTimeField("Traité le", null=True, blank=True)
    notes = models.TextField("Notes", blank=True)

    def __str__(self):
        return f"Paiement {self.amount} FCFA - {self.get_status_display()}"

    @property
    def net_amount(self):
        amount = self.amount if self.amount is not None else Decimal("0")
        fees = self.fees if self.fees is not None else Decimal("0")
        return amount - fees

    class Meta:
        verbose_name = "Paiement"
        verbose_name_plural = "Paiements"
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["status", "created_at"]),
            models.Index(fields=["payer", "status"]),
            models.Index(fields=["recipient", "status"]),
        ]


# ============================================================================
# SYSTÈME DE MESSAGERIE - NOUVELLE LOGIQUE
# ============================================================================

class ChatConversation(BaseTimeStampModel):
    """Conversation directe entre un client et un technicien."""
    
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='client_chat_conversations'
    )
    technician = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='technician_chat_conversations'
    )
    request = models.ForeignKey(
        RepairRequest, 
        on_delete=models.SET_NULL, 
        null=True, 
        blank=True, 
        related_name="chat_conversation"
    )
    is_active = models.BooleanField("Active", default=True)
    last_message_at = models.DateTimeField("Dernier message", null=True, blank=True)

    class Meta:
        unique_together = ('client', 'technician')
        verbose_name = "Conversation de chat"
        verbose_name_plural = "Conversations de chat"
        ordering = ["-last_message_at", "-created_at"]

    def __str__(self):
        return f"Chat: {self.client.get_full_name()} ↔ {self.technician.get_full_name()}"

    @property
    def latest_message(self):
        return self.messages.order_by('-created_at').first()

    def unread_count_for_user(self, user):
        return self.messages.filter(is_read=False).exclude(sender=user).count()

    def mark_all_as_read_for_user(self, user):
        """Marque tous les messages comme lus pour un utilisateur."""
        unread_messages = self.messages.filter(is_read=False).exclude(sender=user)
        unread_messages.update(is_read=True, read_at=timezone.now())


class ChatMessage(BaseTimeStampModel):
    """Message dans une conversation de chat."""
    
    class MessageType(models.TextChoices):
        TEXT = "text", "Texte"
        IMAGE = "image", "Image"
        FILE = "file", "Fichier"
        SYSTEM = "system", "Système"
        LOCATION = "location", "Localisation"

    conversation = models.ForeignKey(
        ChatConversation, 
        on_delete=models.CASCADE, 
        related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name="sent_chat_messages"
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
    
    # Pour les messages de localisation
    latitude = models.FloatField("Latitude", null=True, blank=True)
    longitude = models.FloatField("Longitude", null=True, blank=True)

    def __str__(self):
        return f"Message de {self.sender.get_full_name()} - {self.created_at}"

    def mark_as_read(self):
        """Marque le message comme lu."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()

    def save(self, *args, **kwargs):
        """Met à jour last_message_at de la conversation."""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # Mettre à jour le timestamp du dernier message
            self.conversation.last_message_at = self.created_at
            self.conversation.save(update_fields=['last_message_at'])

    class Meta:
        verbose_name = "Message de chat"
        verbose_name_plural = "Messages de chat"
        ordering = ["created_at"]


class ChatMessageAttachment(BaseTimeStampModel):
    """Pièce jointe d'un message de chat."""
    
    def get_upload_path(self, filename):
        return f"chat_attachments/{self.message.conversation.id}/{filename}"

    message = models.ForeignKey(
        ChatMessage, 
        on_delete=models.CASCADE, 
        related_name="attachments"
    )
    file = models.FileField("Fichier", upload_to=get_upload_path)
    file_name = models.CharField("Nom du fichier", max_length=255)
    file_size = models.PositiveIntegerField("Taille du fichier")
    content_type = models.CharField("Type MIME", max_length=100)

    def __str__(self):
        return f"Pièce jointe - {self.file_name}"

    class Meta:
        verbose_name = "Pièce jointe de chat"
        verbose_name_plural = "Pièces jointes de chat"


# ============================================================================
# SYSTÈME DE MESSAGERIE (ANCIEN - À DÉPRÉCIER)
# ============================================================================

class Conversation(BaseTimeStampModel):
    """Conversation entre utilisateurs liée à une demande."""

    request = models.OneToOneField(
        RepairRequest, on_delete=models.CASCADE, related_name="conversation"
    )
    participants = models.ManyToManyField(
        settings.AUTH_USER_MODEL, related_name="conversations"
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
        ordering = ["-updated_at"]


class Message(BaseTimeStampModel):
    """Message dans une conversation."""

    class MessageType(models.TextChoices):
        TEXT = "text", "Texte"
        IMAGE = "image", "Image"
        FILE = "file", "Fichier"
        SYSTEM = "system", "Système"

    conversation = models.ForeignKey(
        Conversation, on_delete=models.CASCADE, related_name="messages"
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="sent_messages"
    )
    content = models.TextField("Contenu")
    message_type = models.CharField(
        "Type", max_length=20, choices=MessageType.choices, default=MessageType.TEXT
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
        ordering = ["-created_at"]


class MessageAttachment(BaseTimeStampModel):
    """Pièce jointe d'un message."""

    def get_upload_path(self, filename):
        return f"messages/{self.message.conversation.request.uuid}/{filename}"

    message = models.ForeignKey(
        Message, on_delete=models.CASCADE, related_name="attachments"
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
# SYSTÈME DE RÉCOMPENSES ET FIDÉLITÉ
# ============================================================================


class LoyaltyProgram(BaseTimeStampModel):
    """Programme de fidélité pour les clients."""

    client = models.OneToOneField(
        Client, on_delete=models.CASCADE, related_name="loyalty_program"
    )
    points = models.PositiveIntegerField("Points de fidélité", default=0)
    total_spent = models.DecimalField(
        "Montant total dépensé",
        max_digits=10,
        decimal_places=2,
        default=Decimal("0.00"),
    )
    membership_level = models.CharField(
        "Niveau de membre",
        max_length=20,
        choices=[
            ("standard", "Standard"),
            ("silver", "Argent"),
            ("gold", "Or"),
            ("platinum", "Platine"),
        ],
        default="standard",
    )
    last_reward_claimed = models.DateTimeField(
        "Dernière récompense réclamée", null=True, blank=True
    )

    def __str__(self):
        return f"Programme fidélité - {self.client.user.get_full_name()}"

    class Meta:
        verbose_name = "Programme de fidélité"
        verbose_name_plural = "Programmes de fidélité"


class Reward(BaseTimeStampModel):
    """Récompense disponible dans le programme de fidélité."""

    title = models.CharField("Titre", max_length=200)
    description = models.TextField("Description")
    points_required = models.PositiveIntegerField("Points nécessaires")
    discount_amount = models.DecimalField(
        "Montant de la réduction", max_digits=8, decimal_places=2, null=True, blank=True
    )
    discount_percentage = models.PositiveSmallIntegerField(
        "Pourcentage de réduction",
        validators=[MaxValueValidator(100)],
        null=True,
        blank=True,
    )
    valid_from = models.DateTimeField("Valide à partir de")
    valid_until = models.DateTimeField("Valide jusqu'à")
    is_active = models.BooleanField("Active", default=True)
    quantity_available = models.PositiveIntegerField(
        "Quantité disponible", null=True, blank=True
    )
    minimum_membership_level = models.CharField(
        "Niveau minimum requis",
        max_length=20,
        choices=[
            ("standard", "Standard"),
            ("silver", "Argent"),
            ("gold", "Or"),
            ("platinum", "Platine"),
        ],
        default="standard",
    )

    def __str__(self):
        return self.title

    class Meta:
        verbose_name = "Récompense"
        verbose_name_plural = "Récompenses"
        ordering = ["points_required", "-valid_until"]


class RewardClaim(BaseTimeStampModel):
    """Historique des récompenses réclamées par les clients."""

    loyalty_program = models.ForeignKey(
        LoyaltyProgram, on_delete=models.CASCADE, related_name="reward_claims"
    )
    reward = models.ForeignKey(Reward, on_delete=models.CASCADE, related_name="claims")
    points_spent = models.PositiveIntegerField("Points dépensés")
    used_at = models.DateTimeField("Utilisée le", null=True, blank=True)
    repair_request = models.ForeignKey(
        RepairRequest,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="reward_claims",
    )

    def __str__(self):
        return (
            f"{self.reward.title} - {self.loyalty_program.client.user.get_full_name()}"
        )

    class Meta:
        verbose_name = "Récompense réclamée"
        verbose_name_plural = "Récompenses réclamées"
        ordering = ["-created_at"]


# ============================================================================
# SYSTÈME DE NOTIFICATIONS
# ============================================================================


class NotificationPreference(BaseTimeStampModel):
    """Préférences de notification d'un utilisateur."""

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="notification_preferences",
    )
    push_enabled = models.BooleanField("Notifications push activées", default=True)
    email_enabled = models.BooleanField("Notifications email activées", default=True)
    nearby_technician_alerts = models.BooleanField(
        "Alertes techniciens à proximité", default=True
    )
    status_updates = models.BooleanField("Mises à jour de statut", default=True)
    promotional_notifications = models.BooleanField(
        "Notifications promotionnelles", default=True
    )
    quiet_hours_start = models.TimeField(
        "Début des heures silencieuses", null=True, blank=True
    )
    quiet_hours_end = models.TimeField(
        "Fin des heures silencieuses", null=True, blank=True
    )

    def __str__(self):
        return f"Préférences de notification - {self.user.get_full_name()}"

    class Meta:
        verbose_name = "Préférence de notification"
        verbose_name_plural = "Préférences de notification"


class Notification(BaseTimeStampModel):
    """Notification envoyée à un utilisateur."""

    class Type(models.TextChoices):
        REQUEST_CREATED = "request_created", "Nouvelle demande"
        REQUEST_ASSIGNED = "request_assigned", "Demande assignée"
        REQUEST_STARTED = "request_started", "Travail commencé"
        REQUEST_COMPLETED = "request_completed", "Travail terminé"
        MESSAGE_RECEIVED = "message_received", "Nouveau message"
        PAYMENT_RECEIVED = "payment_received", "Paiement reçu"
        REVIEW_RECEIVED = "review_received", "Nouvel avis"
        NEARBY_TECHNICIAN = "nearby_technician", "Technicien à proximité"
        URGENT_REQUEST = "urgent_request", "Demande urgente"
        PROMOTIONAL = "promotional", "Promotion"
        SYSTEM = "system", "Système"

    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="notifications"
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
        related_name="notifications",
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
        ordering = ["-created_at"]
        indexes = [
            models.Index(fields=["recipient", "is_read", "-created_at"]),
        ]


# ============================================================================
# GESTION DE LA LOCALISATION
# ============================================================================


class TechnicianLocation(BaseTimeStampModel):
    """Localisation en temps réel d'un technicien."""

    technician = models.OneToOneField(
        Technician, on_delete=models.CASCADE, related_name="location"
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
            models.Index(fields=["technician"]),
        ]


# ============================================================================
# GESTION DE LA LOCALISATION DES CLIENTS
# ============================================================================

class ClientLocation(BaseTimeStampModel):
    """Localisation en temps réel d'un client."""
    client = models.OneToOneField(
        Client, on_delete=models.CASCADE, related_name="location"
    )
    latitude = models.FloatField("Latitude")
    longitude = models.FloatField("Longitude")
    # Optionnel : précision et statut d'activité
    # accuracy = models.FloatField("Précision", null=True, blank=True)
    # is_active = models.BooleanField("Actif", default=True)

    def __str__(self):
        return f"Localisation de {self.client.user.get_full_name()}"

    class Meta:
        verbose_name = "Localisation de client"
        verbose_name_plural = "Localisations des clients"
        indexes = [
            models.Index(fields=["client"]),
        ]


# ============================================================================
# SIGNALEMENTS ET LITIGES (REPORTS)
# =========================================================================

from django.conf import settings

class Report(models.Model):
    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("resolved", "Résolu"),
        ("rejected", "Rejeté"),
    ]
    sender = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reports_sent")
    request = models.ForeignKey('RepairRequest', on_delete=models.CASCADE, related_name="reports")
    subject = models.CharField(max_length=255)
    message = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    created_at = models.DateTimeField(auto_now_add=True)
    reviewed_at = models.DateTimeField(null=True, blank=True)
    reviewed_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="reports_reviewed")

    def __str__(self):
        return f"Report by {self.sender} on request #{self.request.id} ({self.status})"

# =========================================================================
# NOTIFICATIONS ADMIN
# =========================================================================

class AdminNotification(models.Model):
    SEVERITY_CHOICES = [
        ("info", "Info"),
        ("warning", "Avertissement"),
        ("critical", "Critique"),
    ]
    title = models.CharField(max_length=200)
    message = models.TextField()
    severity = models.CharField(max_length=20, choices=SEVERITY_CHOICES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    related_request = models.ForeignKey('RepairRequest', on_delete=models.SET_NULL, null=True, blank=True)
    triggered_by = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.severity.upper()} - {self.title}"


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
        ordering = ["key"]


class CinetPayPayment(models.Model):
    """Modèle pour gérer les paiements CinetPay."""

    STATUS_CHOICES = [
        ("pending", "En attente"),
        ("success", "Réussi"),
        ("failed", "Échoué"),
        ("cancelled", "Annulé"),
    ]

    # Informations de base
    transaction_id = models.CharField("ID Transaction", max_length=100, unique=True)
    amount = models.DecimalField("Montant", max_digits=10, decimal_places=2)
    currency = models.CharField("Devise", max_length=3, default="XOF")
    description = models.TextField("Description")

    # Informations client
    customer_name = models.CharField("Nom client", max_length=100)
    customer_surname = models.CharField("Prénom client", max_length=100)
    customer_email = models.EmailField("Email client")
    customer_phone_number = models.CharField("Téléphone client", max_length=20)
    customer_address = models.CharField("Adresse client", max_length=200)
    customer_city = models.CharField("Ville client", max_length=100)
    customer_country = models.CharField("Pays client", max_length=2, default="CI")
    customer_state = models.CharField("État client", max_length=2, default="CI")
    customer_zip_code = models.CharField("Code postal client", max_length=10)

    # Informations CinetPay
    payment_token = models.CharField(
        "Token de paiement", max_length=255, blank=True, null=True
    )
    payment_url = models.URLField("URL de paiement", blank=True, null=True)
    cinetpay_transaction_id = models.CharField(
        "ID Transaction CinetPay", max_length=100, blank=True, null=True
    )
    notification_data = models.JSONField("Notification brute CinetPay", null=True, blank=True)

    # Statut et métadonnées
    status = models.CharField(
        "Statut", max_length=20, choices=STATUS_CHOICES, default="pending"
    )
    metadata = models.TextField("Métadonnées", blank=True)
    invoice_data = models.JSONField("Données facture", default=dict, blank=True)

    # Liens avec d'autres modèles
    request = models.ForeignKey(
        RepairRequest, on_delete=models.CASCADE, related_name="cinetpay_payments", null=True, blank=True
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="cinetpay_payments",
        verbose_name="Utilisateur",
    )

    # Timestamps
    created_at = models.DateTimeField("Créé le", auto_now_add=True)
    updated_at = models.DateTimeField("Modifié le", auto_now=True)
    paid_at = models.DateTimeField("Payé le", blank=True, null=True)

    def __str__(self):
        return f"Paiement {self.transaction_id} - {self.amount} {self.currency}"

    class Meta:
        verbose_name = "Paiement CinetPay"
        verbose_name_plural = "Paiements CinetPay"
        ordering = ["-created_at"]

    def generate_transaction_id(self):
        """Génère un ID de transaction unique."""
        import uuid

        return f"TXN_{uuid.uuid4().hex[:16].upper()}"

    def get_total_amount(self):
        """Retourne le montant total en tenant compte des frais d'urgence."""
        total = self.amount
        if self.request and self.request.is_urgent:
            total += 25000  # Frais d'urgence
        return total


class PlatformConfiguration(models.Model):
    LANG_CHOICES = [
        ('fr', 'Français'),
        ('en', 'English'),
    ]
    platform_name = models.CharField(max_length=100)
    support_email = models.EmailField()
    default_language = models.CharField(max_length=2, choices=LANG_CHOICES, default='fr')
    timezone = models.CharField(max_length=50, default='Africa/Abidjan')
    payment_methods = JSONField(default=list, blank=True)
    commission_rate = models.DecimalField(max_digits=5, decimal_places=2, default=10.0)
    min_payout_amount = models.DecimalField(max_digits=10, decimal_places=2, default=1000.0)
    max_interventions_per_day = models.IntegerField(default=10)
    service_radius_km = models.FloatField(default=20.0)
    cancelation_deadline_hours = models.IntegerField(default=2)
    enable_geolocation_map = models.BooleanField(default=True)
    default_map_provider = models.CharField(max_length=50, default='OpenStreetMap')
    theme_color = models.CharField(max_length=20, default='#2563eb')
    enable_2fa_admin = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        self.pk = 1  # Singleton pattern
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        pass  # Prevent deletion

    def __str__(self):
        return f"Configuration Plateforme ({self.platform_name})"


# Signaux pour notifier le technicien lors de la suppression ou modification d'un avis
@receiver(post_delete, sender=Review)
def notify_technician_on_review_delete(sender, instance, **kwargs):
    from .models import Notification
    Notification.objects.create(
        recipient=instance.technician.user,
        type=Notification.Type.REVIEW_RECEIVED,
        title="Avis supprimé",
        message=f"Un avis laissé par un client sur la demande #{instance.request.id} a été supprimé.",
        request=instance.request
    )

@receiver(post_save, sender=Review)
def notify_technician_on_review_update(sender, instance, created, **kwargs):
    from .models import Notification
    if not created:
        Notification.objects.create(
            recipient=instance.technician.user,
            type=Notification.Type.REVIEW_RECEIVED,
            title="Avis modifié",
            message=f"Un avis laissé par un client sur la demande #{instance.request.id} a été modifié.",
            request=instance.request
        )

def send_ws_notification(user_id, content):
    channel_layer = get_channel_layer()
    async_to_sync(channel_layer.group_send)(
        f"user_{user_id}",
        {"type": "send.notification", "content": content}
    )

@receiver(post_save, sender=Notification)
def notify_ws_on_notification(sender, instance, created, **kwargs):
    if created and instance.recipient_id:
        send_ws_notification(
            instance.recipient_id,
            {
                "title": instance.title,
                "message": instance.message,
                "type": instance.type,
                "created_at": instance.created_at.isoformat() if instance.created_at else None,
            }
        )

class TechnicianSubscription(models.Model):
    technician = models.ForeignKey('Technician', on_delete=models.CASCADE, related_name='subscriptions')
    plan_name = models.CharField(max_length=100, default='Standard')
    start_date = models.DateTimeField(default=timezone.now)
    end_date = models.DateTimeField()
    payment = models.ForeignKey('CinetPayPayment', on_delete=models.SET_NULL, null=True, blank=True, related_name='subscription_payments')
    is_active = models.BooleanField(default=True)

    def save(self, *args, **kwargs):
        self.is_active = self.end_date > timezone.now()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Abonnement {self.plan_name} ({self.technician}) jusqu'au {self.end_date.strftime('%d/%m/%Y')}"

    class Meta:
        verbose_name = "Abonnement technicien"
        verbose_name_plural = "Abonnements techniciens"
        ordering = ['-end_date']
        unique_together = ('technician', 'start_date', 'end_date')


class SubscriptionPaymentRequest(BaseTimeStampModel):
    """Demande de paiement d'abonnement en attente de validation admin."""
    
    class Status(models.TextChoices):
        PENDING = "pending", "En attente de validation"
        APPROVED = "approved", "Approuvé"
        REJECTED = "rejected", "Rejeté"
        CANCELLED = "cancelled", "Annulé"
    
    technician = models.ForeignKey(
        'Technician', 
        on_delete=models.CASCADE, 
        related_name='subscription_payment_requests'
    )
    amount = models.DecimalField("Montant", max_digits=10, decimal_places=2)
    duration_months = models.PositiveIntegerField("Durée en mois", default=1)
    payment_method = models.CharField("Méthode de paiement", max_length=50, default="manual_validation")
    description = models.TextField("Description", blank=True)
    status = models.CharField(
        "Statut", 
        max_length=20, 
        choices=Status.choices, 
        default=Status.PENDING
    )
    
    # Validation admin
    validated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='validated_subscription_requests'
    )
    validated_at = models.DateTimeField("Validé le", null=True, blank=True)
    validation_notes = models.TextField("Notes de validation", blank=True)
    
    # Abonnement créé après validation
    subscription = models.ForeignKey(
        'TechnicianSubscription',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='payment_request'
    )
    
    def __str__(self):
        return f"Demande d'abonnement {self.technician.user.get_full_name()} - {self.amount} FCFA"
    
    class Meta:
        verbose_name = "Demande de paiement d'abonnement"
        verbose_name_plural = "Demandes de paiement d'abonnement"


@receiver(post_save, sender=Technician)
def handle_specialty_change(sender, instance, created, **kwargs):
    if created:
        instance._old_specialty = instance.specialty
        return
    # On récupère l'ancienne valeur de la spécialité
    try:
        old_instance = sender.objects.get(pk=instance.pk)
        old_specialty = old_instance.specialty
    except sender.DoesNotExist:
        old_specialty = instance.specialty
    # Si la spécialité a changé
    if old_specialty != instance.specialty:
        from depannage.models import RepairRequest
        from depannage.views import calculate_distance
        from depannage.models import Notification
        from django.utils import timezone
        # Trouver toutes les demandes en cours assignées à ce technicien pour l'ancienne spécialité
        requests = RepairRequest.objects.filter(
            technician=instance,
            status__in=[RepairRequest.Status.ASSIGNED, RepairRequest.Status.IN_PROGRESS],
            specialty_needed=old_specialty
        )
        for req in requests:
            # Chercher un autre technicien libre de la même spécialité
            candidates = sender.objects.filter(
                specialty=old_specialty,
                is_available=True,
                is_verified=True,
                current_latitude__isnull=False,
                current_longitude__isnull=False,
            ).exclude(id=instance.id)
            # Filtrer sur abonnement actif
            candidates = [t for t in candidates if t.has_active_subscription]
            # Exclure ceux qui ont déjà une demande en cours
            busy_tech_ids = set(
                RepairRequest.objects.filter(
                    status__in=[RepairRequest.Status.ASSIGNED, RepairRequest.Status.IN_PROGRESS]
                ).values_list('technician_id', flat=True)
            )
            candidates = [t for t in candidates if t.id not in busy_tech_ids]
            # Filtrer sur note minimale
            MIN_RATING = 3.5
            candidates = [t for t in candidates if t.average_rating >= MIN_RATING]
            # Filtrer sur rayon d'intervention
            tech_with_distance = []
            lat, lng = req.latitude, req.longitude
            for tech in candidates:
                distance = calculate_distance(lat, lng, tech.current_latitude, tech.current_longitude)
                if distance <= tech.service_radius_km:
                    tech_with_distance.append((tech, distance))
            tech_with_distance.sort(key=lambda x: x[1])
            if tech_with_distance:
                new_tech = tech_with_distance[0][0]
                req.technician = new_tech
                req.status = RepairRequest.Status.ASSIGNED
                req.assigned_at = timezone.now()
                req.save()
                # Notifier le nouveau technicien
                Notification.objects.create(
                    recipient=new_tech.user,
                    title="Nouvelle demande réassignée",
                    message=f"Vous avez été réassigné à la demande #{req.id} (suite à un changement de spécialité d'un autre technicien)",
                    type="new_request_technician",
                    request=req,
                )
                # Notifier le client
                Notification.objects.create(
                    recipient=req.client.user,
                    title="Nouveau technicien en route",
                    message=f"Votre demande #{req.id} a été réassignée à un nouveau technicien.",
                    type="technician_assigned",
                    request=req,
                )
            else:
                # Aucun technicien dispo, désassigner la demande
                req.technician = None
                req.status = RepairRequest.Status.PENDING
                req.save()
                Notification.objects.create(
                    recipient=req.client.user,
                    title="Demande en attente",
                    message=f"Votre demande #{req.id} est de nouveau en attente, aucun technicien n'est disponible pour le moment.",
                    type="no_technician_available",
                    request=req,
                )
