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
from django.contrib.auth import get_user_model


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
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['created_at']),
        ]


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
        indexes = [
            models.Index(fields=['is_available']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['specialty']),
            models.Index(fields=['experience_level']),
            models.Index(fields=['is_available_urgent']),
            models.Index(fields=['current_latitude', 'current_longitude']),
            models.Index(fields=['last_position_update']),
            models.Index(fields=['badge_level']),
            models.Index(fields=['service_radius_km']),
        ]


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
        return f"{self.title} - {self.get_status_display()}"

    @property
    def total_cost(self):
        """Calcule le coût total de la demande."""
        if self.final_price:
            return self.final_price + self.travel_cost
        return self.estimated_price + self.travel_cost if self.estimated_price else Decimal("0.00")

    @property
    def duration_hours(self):
        """Calcule la durée en heures si les dates sont disponibles."""
        if self.started_at and self.completed_at:
            duration = self.completed_at - self.started_at
            return round(duration.total_seconds() / 3600, 2)
        return None

    def assign_to_technician(self, technician):
        """Assigne la demande à un technicien."""
        self.technician = technician
        self.status = self.Status.ASSIGNED
        self.assigned_at = timezone.now()
        self.save()

    def start_work(self):
        """Marque le début du travail."""
        self.status = self.Status.IN_PROGRESS
        self.started_at = timezone.now()
        self.save()

    def complete_work(self, final_price=None):
        """Marque la fin du travail."""
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
            models.Index(fields=['status']),
            models.Index(fields=['specialty_needed']),
            models.Index(fields=['urgency_level']),
            models.Index(fields=['priority']),
            models.Index(fields=['created_at']),
            models.Index(fields=['assigned_at']),
            models.Index(fields=['completed_at']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['client']),
            models.Index(fields=['technician']),
            models.Index(fields=['mission_validated']),
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

    # Nouveaux critères de qualité
    professionalism_rating = models.PositiveSmallIntegerField(
        "Professionnalisme",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Attitude professionnelle, respect, propreté"
    )
    problem_solving_rating = models.PositiveSmallIntegerField(
        "Résolution de problème",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Capacité à diagnostiquer et résoudre le problème"
    )
    cleanliness_rating = models.PositiveSmallIntegerField(
        "Propreté",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Propreté du travail et de l'environnement"
    )
    price_fairness_rating = models.PositiveSmallIntegerField(
        "Justesse du prix",
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        null=True,
        blank=True,
        help_text="Prix justifié par rapport au travail effectué"
    )

    # Informations supplémentaires
    intervention_duration_minutes = models.PositiveIntegerField(
        "Durée de l'intervention (minutes)",
        null=True,
        blank=True,
        help_text="Durée réelle de l'intervention"
    )
    was_urgent = models.BooleanField(
        "Intervention urgente",
        default=False,
        help_text="L'intervention était-elle urgente ?"
    )
    problem_complexity = models.CharField(
        "Complexité du problème",
        max_length=20,
        choices=[
            ('simple', 'Simple'),
            ('moderate', 'Modérée'),
            ('complex', 'Complexe'),
            ('very_complex', 'Très complexe'),
        ],
        null=True,
        blank=True,
    )
    parts_used = models.BooleanField(
        "Pièces utilisées",
        default=False,
        help_text="Des pièces ont-elles été utilisées ?"
    )
    warranty_offered = models.BooleanField(
        "Garantie offerte",
        default=False,
        help_text="Une garantie a-t-elle été offerte ?"
    )
    warranty_duration_days = models.PositiveIntegerField(
        "Durée de garantie (jours)",
        null=True,
        blank=True,
    )

    # Feedback détaillé
    positive_aspects = models.TextField(
        "Points positifs",
        blank=True,
        help_text="Ce qui s'est bien passé"
    )
    improvement_suggestions = models.TextField(
        "Suggestions d'amélioration",
        blank=True,
        help_text="Ce qui pourrait être amélioré"
    )
    would_use_again = models.BooleanField(
        "Utiliserait à nouveau",
        default=True,
        help_text="Utiliserait ce technicien à nouveau"
    )
    would_recommend_to_friends = models.BooleanField(
        "Recommanderait à des amis",
        default=True,
        help_text="Recommanderait ce technicien à des amis"
    )

    # Métadonnées de qualité
    review_quality_score = models.FloatField(
        "Score de qualité de l'avis",
        null=True,
        blank=True,
        help_text="Score calculé automatiquement basé sur la détail de l'avis"
    )
    is_verified_review = models.BooleanField(
        "Avis vérifié",
        default=False,
        help_text="Avis vérifié par l'équipe de modération"
    )
    moderation_status = models.CharField(
        "Statut de modération",
        max_length=20,
        choices=[
            ('pending', 'En attente'),
            ('approved', 'Approuvé'),
            ('rejected', 'Rejeté'),
            ('flagged', 'Signalé'),
        ],
        default='pending'
    )
    moderation_notes = models.TextField(
        "Notes de modération",
        blank=True,
        help_text="Notes de l'équipe de modération"
    )

    # Tags pour catégorisation
    tags = models.JSONField(
        "Tags",
        default=list,
        blank=True,
        help_text="Tags pour catégoriser l'avis (ex: ['rapide', 'professionnel', 'cher'])"
    )

    def __str__(self):
        return f"Avis {self.rating}/5 - {self.technician.user.get_full_name()}"

    @property
    def overall_score(self):
        """Calcule le score global basé sur tous les critères."""
        ratings = [
            self.rating,
            self.punctuality_rating,
            self.quality_rating,
            self.communication_rating,
            self.professionalism_rating,
            self.problem_solving_rating,
            self.cleanliness_rating,
            self.price_fairness_rating,
        ]
        valid_ratings = [r for r in ratings if r is not None]
        return sum(valid_ratings) / len(valid_ratings) if valid_ratings else 0

    @property
    def is_detailed_review(self):
        """Détermine si l'avis est détaillé."""
        detailed_criteria = [
            self.punctuality_rating,
            self.quality_rating,
            self.communication_rating,
            self.professionalism_rating,
            self.problem_solving_rating,
            self.cleanliness_rating,
            self.price_fairness_rating,
        ]
        return any(r is not None for r in detailed_criteria)

    @property
    def review_completeness(self):
        """Calcule le pourcentage de complétude de l'avis."""
        total_fields = 8  # Nombre total de champs de notation
        filled_fields = sum(1 for field in [
            self.rating,
            self.punctuality_rating,
            self.quality_rating,
            self.communication_rating,
            self.professionalism_rating,
            self.problem_solving_rating,
            self.cleanliness_rating,
            self.price_fairness_rating,
        ] if field is not None)
        return (filled_fields / total_fields) * 100

    def calculate_quality_score(self):
        """Calcule un score de qualité basé sur la complétude et la cohérence."""
        base_score = self.review_completeness
        
        # Bonus pour les avis détaillés
        if self.is_detailed_review:
            base_score += 20
        
        # Bonus pour les commentaires
        if self.comment and len(self.comment.strip()) > 50:
            base_score += 10
        
        # Bonus pour les aspects positifs et suggestions
        if self.positive_aspects:
            base_score += 5
        if self.improvement_suggestions:
            base_score += 5
        
        # Bonus pour les informations supplémentaires
        if self.intervention_duration_minutes:
            base_score += 5
        if self.problem_complexity:
            base_score += 5
        
        return min(base_score, 100)

    def save(self, *args, **kwargs):
        """Recalcule le score de qualité avant la sauvegarde."""
        self.review_quality_score = self.calculate_quality_score()
        super().save(*args, **kwargs)

    class Meta:
        verbose_name = "Avis"
        verbose_name_plural = "Avis"
        ordering = ["-created_at"]
        constraints = [
            models.UniqueConstraint(
                fields=["request"], name="unique_review_per_request"
            )
        ]
        indexes = [
            models.Index(fields=['technician', 'rating']),
            models.Index(fields=['created_at']),
            models.Index(fields=['moderation_status']),
            models.Index(fields=['is_verified_review']),
        ]


class ReviewAnalytics(BaseTimeStampModel):
    """Analytics et statistiques des avis pour les techniciens."""
    
    technician = models.OneToOneField(
        Technician, 
        on_delete=models.CASCADE, 
        related_name="review_analytics"
    )
    
    # Statistiques globales
    total_reviews = models.PositiveIntegerField("Total avis", default=0)
    average_rating = models.FloatField("Note moyenne", default=0.0)
    rating_distribution = models.JSONField(
        "Distribution des notes",
        default=dict,
        help_text="{'1': 0, '2': 0, '3': 0, '4': 0, '5': 0}"
    )
    
    # Statistiques par critère
    avg_punctuality = models.FloatField("Ponctualité moyenne", default=0.0)
    avg_quality = models.FloatField("Qualité moyenne", default=0.0)
    avg_communication = models.FloatField("Communication moyenne", default=0.0)
    avg_professionalism = models.FloatField("Professionnalisme moyen", default=0.0)
    avg_problem_solving = models.FloatField("Résolution problème moyenne", default=0.0)
    avg_cleanliness = models.FloatField("Propreté moyenne", default=0.0)
    avg_price_fairness = models.FloatField("Justesse prix moyenne", default=0.0)
    
    # Métriques de satisfaction
    recommendation_rate = models.FloatField("Taux de recommandation (%)", default=0.0)
    reuse_rate = models.FloatField("Taux de réutilisation (%)", default=0.0)
    friend_recommendation_rate = models.FloatField("Taux recommandation amis (%)", default=0.0)
    
    # Métriques de qualité
    detailed_reviews_count = models.PositiveIntegerField("Avis détaillés", default=0)
    verified_reviews_count = models.PositiveIntegerField("Avis vérifiés", default=0)
    avg_review_completeness = models.FloatField("Complétude moyenne (%)", default=0.0)
    
    # Tendances temporelles
    monthly_reviews = models.JSONField(
        "Avis par mois",
        default=dict,
        help_text="{'2024-01': 5, '2024-02': 8, ...}"
    )
    rating_trend = models.JSONField(
        "Tendance des notes",
        default=list,
        help_text="[{'date': '2024-01', 'avg': 4.2}, ...]"
    )
    
    # Tags populaires
    popular_tags = models.JSONField(
        "Tags populaires",
        default=list,
        help_text="[{'tag': 'professionnel', 'count': 15}, ...]"
    )
    
    # Dernière mise à jour
    last_calculation = models.DateTimeField("Dernier calcul", auto_now=True)
    
    def __str__(self):
        return f"Analytics {self.technician.user.get_full_name()}"
    
    def calculate_all_metrics(self):
        """Recalcule toutes les métriques basées sur les avis récents."""
        reviews = Review.objects.filter(
            technician=self.technician,
            is_visible=True,
            moderation_status='approved'
        )
        
        if not reviews.exists():
            return
        
        # Statistiques globales
        self.total_reviews = reviews.count()
        self.average_rating = reviews.aggregate(Avg('rating'))['rating__avg'] or 0.0
        
        # Distribution des notes
        rating_dist = {str(i): 0 for i in range(1, 6)}
        for review in reviews:
            rating_dist[str(review.rating)] += 1
        self.rating_distribution = rating_dist
        
        # Moyennes par critère
        self.avg_punctuality = reviews.aggregate(Avg('punctuality_rating'))['punctuality_rating__avg'] or 0.0
        self.avg_quality = reviews.aggregate(Avg('quality_rating'))['quality_rating__avg'] or 0.0
        self.avg_communication = reviews.aggregate(Avg('communication_rating'))['communication_rating__avg'] or 0.0
        self.avg_professionalism = reviews.aggregate(Avg('professionalism_rating'))['professionalism_rating__avg'] or 0.0
        self.avg_problem_solving = reviews.aggregate(Avg('problem_solving_rating'))['problem_solving_rating__avg'] or 0.0
        self.avg_cleanliness = reviews.aggregate(Avg('cleanliness_rating'))['cleanliness_rating__avg'] or 0.0
        self.avg_price_fairness = reviews.aggregate(Avg('price_fairness_rating'))['price_fairness_rating__avg'] or 0.0
        
        # Taux de recommandation
        recommend_count = reviews.filter(would_recommend=True).count()
        self.recommendation_rate = (recommend_count / self.total_reviews * 100) if self.total_reviews > 0 else 0.0
        
        reuse_count = reviews.filter(would_use_again=True).count()
        self.reuse_rate = (reuse_count / self.total_reviews * 100) if self.total_reviews > 0 else 0.0
        
        friend_recommend_count = reviews.filter(would_recommend_to_friends=True).count()
        self.friend_recommendation_rate = (friend_recommend_count / self.total_reviews * 100) if self.total_reviews > 0 else 0.0
        
        # Métriques de qualité
        self.detailed_reviews_count = reviews.filter(
            punctuality_rating__isnull=False,
            quality_rating__isnull=False,
            communication_rating__isnull=False
        ).count()
        
        self.verified_reviews_count = reviews.filter(is_verified_review=True).count()
        
        # Complétude moyenne
        completeness_scores = [review.review_completeness for review in reviews]
        self.avg_review_completeness = sum(completeness_scores) / len(completeness_scores) if completeness_scores else 0.0
        
        # Tags populaires
        all_tags = []
        for review in reviews:
            if review.tags:
                all_tags.extend(review.tags)
        
        tag_counts = {}
        for tag in all_tags:
            tag_counts[tag] = tag_counts.get(tag, 0) + 1
        
        self.popular_tags = [
            {'tag': tag, 'count': count} 
            for tag, count in sorted(tag_counts.items(), key=lambda x: x[1], reverse=True)[:10]
        ]
        
        self.save()
    
    class Meta:
        verbose_name = "Analytics d'avis"
        verbose_name_plural = "Analytics d'avis"
        ordering = ['-last_calculation']


class ReviewModeration(BaseTimeStampModel):
    """Modération des avis pour maintenir la qualité."""
    
    review = models.OneToOneField(
        Review, 
        on_delete=models.CASCADE, 
        related_name="moderation"
    )
    
    moderator = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="moderated_reviews"
    )
    
    status = models.CharField(
        "Statut",
        max_length=20,
        choices=[
            ('pending', 'En attente'),
            ('approved', 'Approuvé'),
            ('rejected', 'Rejeté'),
            ('flagged', 'Signalé'),
        ],
        default='pending'
    )
    
    moderation_reason = models.CharField(
        "Raison de modération",
        max_length=50,
        choices=[
            ('inappropriate_content', 'Contenu inapproprié'),
            ('fake_review', 'Avis factice'),
            ('spam', 'Spam'),
            ('offensive_language', 'Langage offensant'),
            ('irrelevant', 'Non pertinent'),
            ('duplicate', 'Doublon'),
            ('other', 'Autre'),
        ],
        null=True,
        blank=True
    )
    
    moderation_notes = models.TextField(
        "Notes de modération",
        blank=True
    )
    
    flagged_by_users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        related_name="flagged_reviews",
        blank=True,
        help_text="Utilisateurs ayant signalé cet avis"
    )
    
    auto_moderation_score = models.FloatField(
        "Score de modération automatique",
        null=True,
        blank=True,
        help_text="Score calculé automatiquement pour la modération"
    )
    
    def __str__(self):
        return f"Modération avis #{self.review.id} - {self.get_status_display()}"
    
    class Meta:
        verbose_name = "Modération d'avis"
        verbose_name_plural = "Modérations d'avis"
        ordering = ['-created_at']


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

    # Nouvelles fonctionnalités
    is_pinned = models.BooleanField(
        "Épinglée",
        default=False,
        help_text="Conversation épinglée en haut de la liste"
    )
    muted_until = models.DateTimeField(
        "Silencieuse jusqu'au",
        null=True,
        blank=True,
        help_text="Date jusqu'à laquelle les notifications sont désactivées"
    )
    last_activity_type = models.CharField(
        "Type de dernière activité",
        max_length=20,
        choices=[
            ('message', 'Message'),
            ('location', 'Localisation'),
            ('voice', 'Message vocal'),
            ('file', 'Fichier'),
            ('call', 'Appel'),
        ],
        default='message',
        help_text="Type de la dernière activité dans la conversation"
    )

    class Meta:
        unique_together = ('client', 'technician')
        verbose_name = "Conversation de chat"
        verbose_name_plural = "Conversations de chat"
        ordering = ["-last_message_at", "-created_at"]
        indexes = [
            models.Index(fields=['client', 'last_message_at']),
            models.Index(fields=['technician', 'last_message_at']),
            models.Index(fields=['is_active', 'last_message_at']),
        ]

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

    def is_muted_for_user(self, user):
        """Vérifie si la conversation est en mode silencieux pour l'utilisateur."""
        if not self.muted_until:
            return False
        return timezone.now() < self.muted_until

    def mute_until(self, until_date):
        """Met la conversation en mode silencieux jusqu'à une date."""
        self.muted_until = until_date
        self.save(update_fields=['muted_until'])

    def unmute(self):
        """Désactive le mode silencieux."""
        self.muted_until = None
        self.save(update_fields=['muted_until'])

    def toggle_pin(self):
        """Épingle ou désépingle la conversation."""
        self.is_pinned = not self.is_pinned
        self.save(update_fields=['is_pinned'])


class ChatMessage(BaseTimeStampModel):
    """Message dans une conversation de chat."""
    
    class MessageType(models.TextChoices):
        TEXT = "text", "Texte"
        IMAGE = "image", "Image"
        FILE = "file", "Fichier"
        SYSTEM = "system", "Système"
        LOCATION = "location", "Localisation"
        VOICE = "voice", "Message vocal"
        VIDEO = "video", "Vidéo"

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
    
    # Pour les messages vocaux
    voice_duration = models.PositiveIntegerField(
        "Durée du message vocal (secondes)",
        null=True,
        blank=True,
        help_text="Durée en secondes pour les messages vocaux"
    )
    
    # Pour les messages modifiés
    is_edited = models.BooleanField(
        "Modifié",
        default=False,
        help_text="Indique si le message a été modifié"
    )
    edited_at = models.DateTimeField(
        "Modifié le",
        null=True,
        blank=True,
        help_text="Date de modification du message"
    )
    
    # Pour les réponses
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name="Réponse à",
        help_text="Message auquel celui-ci répond"
    )

    def __str__(self):
        return f"Message de {self.sender.get_full_name()} - {self.created_at}"

    def mark_as_read(self):
        """Marque le message comme lu."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save()

    def edit_message(self, new_content):
        """Modifie le contenu du message."""
        self.content = new_content
        self.is_edited = True
        self.edited_at = timezone.now()
        self.save()

    def save(self, *args, **kwargs):
        """Met à jour last_message_at de la conversation."""
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        if is_new:
            # Mettre à jour le timestamp du dernier message
            self.conversation.last_message_at = self.created_at
            self.conversation.last_activity_type = self.message_type
            self.conversation.save(update_fields=['last_message_at', 'last_activity_type'])

    class Meta:
        verbose_name = "Message de chat"
        verbose_name_plural = "Messages de chat"
        ordering = ["created_at"]
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['is_read', 'sender']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(voice_duration__isnull=True) | models.Q(voice_duration__gte=1),
                name='voice_duration_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(message_type='location') | models.Q(latitude__isnull=True),
                name='location_coords_only_for_location_messages'
            ),
            models.CheckConstraint(
                condition=models.Q(message_type='location') | models.Q(longitude__isnull=True),
                name='location_coords_only_for_location_messages_long'
            ),
        ]


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
    
    # Nouvelles fonctionnalités
    duration = models.PositiveIntegerField(
        "Durée (secondes)",
        null=True,
        blank=True,
        help_text="Durée pour les fichiers audio/vidéo"
    )
    thumbnail = models.ImageField(
        "Miniature",
        upload_to='chat_thumbnails/',
        null=True,
        blank=True,
        help_text="Miniature pour les images/vidéos"
    )
    is_processed = models.BooleanField(
        "Traité",
        default=False,
        help_text="Indique si le fichier a été traité (génération de miniature, etc.)"
    )

    def __str__(self):
        return f"Pièce jointe - {self.file_name}"

    def get_file_url(self):
        """Retourne l'URL du fichier."""
        if self.file:
            return self.file.url
        return None

    def get_thumbnail_url(self):
        """Retourne l'URL de la miniature."""
        if self.thumbnail:
            return self.thumbnail.url
        return None

    def is_media_file(self):
        """Vérifie si le fichier est un média (image, audio, vidéo)."""
        content_type = self.content_type.lower()
        return any(media_type in content_type for media_type in ['image', 'audio', 'video'])

    class Meta:
        verbose_name = "Pièce jointe de chat"
        verbose_name_plural = "Pièces jointes de chat"


# Nouveaux modèles pour les fonctionnalités avancées

class CommunicationStats(BaseTimeStampModel):
    """Statistiques de communication pour une conversation."""
    
    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name='stats',
        verbose_name="Conversation"
    )
    
    # Compteurs de messages
    total_messages = models.PositiveIntegerField("Messages totaux", default=0)
    text_messages = models.PositiveIntegerField("Messages texte", default=0)
    voice_messages = models.PositiveIntegerField("Messages vocaux", default=0)
    location_shares = models.PositiveIntegerField("Partages de localisation", default=0)
    file_shares = models.PositiveIntegerField("Partages de fichiers", default=0)
    
    # Métriques de performance
    avg_response_time_minutes = models.FloatField("Temps de réponse moyen (minutes)", default=0.0)
    last_message_at = models.DateTimeField("Dernier message", null=True, blank=True)
    first_message_at = models.DateTimeField("Premier message", null=True, blank=True)
    
    # Temps en ligne
    client_online_time = models.PositiveIntegerField("Temps en ligne client (minutes)", default=0)
    technician_online_time = models.PositiveIntegerField("Temps en ligne technicien (minutes)", default=0)

    def __str__(self):
        return f"Stats - {self.conversation}"

    def update_stats(self):
        """Met à jour les statistiques basées sur les messages actuels."""
        messages = self.conversation.messages.all()
        
        self.total_messages = messages.count()
        self.text_messages = messages.filter(message_type='text').count()
        self.voice_messages = messages.filter(message_type='voice').count()
        self.location_shares = messages.filter(message_type='location').count()
        self.file_shares = messages.filter(message_type__in=['image', 'file']).count()
        
        if messages.exists():
            self.first_message_at = messages.earliest('created_at').created_at
            self.last_message_at = messages.latest('created_at').created_at
        
        self.save()

    class Meta:
        verbose_name = "Statistiques de communication"
        verbose_name_plural = "Statistiques de communication"
        ordering = ['-updated_at']


class CommunicationSession(BaseTimeStampModel):
    """Session de communication d'un utilisateur."""
    
    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name='sessions',
        verbose_name="Conversation"
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='communication_sessions',
        verbose_name="Utilisateur"
    )
    
    started_at = models.DateTimeField("Démarrée à", auto_now_add=True)
    ended_at = models.DateTimeField("Terminée à", null=True, blank=True)
    
    # Métriques de session
    messages_sent = models.PositiveIntegerField("Messages envoyés", default=0)
    messages_received = models.PositiveIntegerField("Messages reçus", default=0)
    is_active = models.BooleanField("Active", default=True)
    
    # Informations techniques
    device_info = models.JSONField("Informations appareil", default=dict, blank=True)
    ip_address = models.GenericIPAddressField("Adresse IP", null=True, blank=True)

    def __str__(self):
        return f"Session - {self.user} dans {self.conversation}"

    def end_session(self):
        """Termine la session."""
        self.ended_at = timezone.now()
        self.is_active = False
        self.save(update_fields=['ended_at', 'is_active'])

    def get_duration_minutes(self):
        """Retourne la durée de la session en minutes."""
        end_time = self.ended_at or timezone.now()
        duration = end_time - self.started_at
        return duration.total_seconds() / 60

    class Meta:
        verbose_name = "Session de communication"
        verbose_name_plural = "Sessions de communication"
        ordering = ['-started_at']
        indexes = [
            models.Index(fields=['user', 'is_active']),
        ]


class CommunicationNotification(BaseTimeStampModel):
    """Notification spécifique à la communication."""
    
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='communication_notifications',
        verbose_name="Destinataire"
    )
    conversation = models.ForeignKey(
        ChatConversation,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name="Conversation"
    )
    
    notification_type = models.CharField(
        "Type de notification",
        max_length=30,
        choices=[
            ('new_message', 'Nouveau message'),
            ('message_read', 'Message lu'),
            ('typing_started', 'Début de frappe'),
            ('typing_stopped', 'Fin de frappe'),
            ('location_shared', 'Localisation partagée'),
            ('voice_message', 'Message vocal'),
            ('file_shared', 'Fichier partagé'),
            ('call_missed', 'Appel manqué'),
            ('user_online', 'Utilisateur en ligne'),
            ('user_offline', 'Utilisateur hors ligne'),
        ]
    )
    
    title = models.CharField("Titre", max_length=200)
    message = models.TextField("Message")
    is_read = models.BooleanField("Lue", default=False)
    read_at = models.DateTimeField("Lue le", null=True, blank=True)
    extra_data = models.JSONField("Données supplémentaires", default=dict, blank=True)

    def __str__(self):
        return f"Notification - {self.recipient} - {self.notification_type}"

    def mark_as_read(self):
        """Marque la notification comme lue."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    class Meta:
        verbose_name = "Notification de communication"
        verbose_name_plural = "Notifications de communication"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
        ]


class CommunicationSettings(BaseTimeStampModel):
    """Paramètres de communication d'un utilisateur."""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='communication_settings',
        verbose_name="Utilisateur"
    )
    
    # Paramètres de notification
    auto_read_receipts = models.BooleanField("Accusés de lecture automatiques", default=True)
    typing_indicators = models.BooleanField("Indicateurs de frappe", default=True)
    sound_notifications = models.BooleanField("Notifications sonores", default=True)
    vibration_notifications = models.BooleanField("Notifications vibrantes", default=True)
    message_preview = models.BooleanField("Aperçu des messages", default=True)
    
    # Paramètres de médias
    auto_download_media = models.BooleanField("Téléchargement automatique des médias", default=False)
    max_file_size_mb = models.PositiveIntegerField("Taille maximale des fichiers (MB)", default=10)
    allowed_file_types = models.JSONField("Types de fichiers autorisés", default=list)
    
    # Paramètres de confort
    quiet_hours_start = models.TimeField("Début des heures silencieuses", null=True, blank=True)
    quiet_hours_end = models.TimeField("Fin des heures silencieuses", null=True, blank=True)
    
    # Paramètres d'interface
    language = models.CharField("Langue", max_length=10, default='fr')
    theme = models.CharField("Thème", max_length=20, default='light')

    def __str__(self):
        return f"Paramètres - {self.user}"

    def is_in_quiet_hours(self):
        """Vérifie si on est dans les heures silencieuses."""
        if not self.quiet_hours_start or not self.quiet_hours_end:
            return False
        
        now = timezone.now().time()
        return self.quiet_hours_start <= now <= self.quiet_hours_end

    def get_allowed_file_types(self):
        """Retourne la liste des types de fichiers autorisés."""
        if not self.allowed_file_types:
            return ['image/*', 'audio/*', 'video/*', 'application/pdf']
        return self.allowed_file_types

    class Meta:
        verbose_name = "Paramètres de communication"
        verbose_name_plural = "Paramètres de communication"


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

    # Nouvelles fonctionnalités de géolocalisation
    accuracy = models.FloatField(
        "Précision (mètres)",
        null=True,
        blank=True,
        help_text="Précision GPS en mètres"
    )
    altitude = models.FloatField(
        "Altitude (mètres)",
        null=True,
        blank=True,
        help_text="Altitude en mètres"
    )
    speed = models.FloatField(
        "Vitesse (km/h)",
        null=True,
        blank=True,
        help_text="Vitesse de déplacement en km/h"
    )
    heading = models.FloatField(
        "Direction (degrés)",
        null=True,
        blank=True,
        help_text="Direction en degrés (0-360)"
    )
    is_moving = models.BooleanField(
        "En mouvement",
        default=False,
        help_text="Indique si le technicien est en mouvement"
    )
    battery_level = models.PositiveSmallIntegerField(
        "Niveau de batterie (%)",
        null=True,
        blank=True,
        help_text="Niveau de batterie du dispositif"
    )
    location_source = models.CharField(
        "Source de localisation",
        max_length=20,
        choices=[
            ('gps', 'GPS'),
            ('network', 'Réseau cellulaire'),
            ('wifi', 'WiFi'),
            ('manual', 'Manuel'),
        ],
        default='gps',
        help_text="Source de la localisation"
    )
    address = models.TextField(
        "Adresse",
        blank=True,
        help_text="Adresse géocodée"
    )
    city = models.CharField(
        "Ville",
        max_length=100,
        blank=True,
        help_text="Ville de localisation"
    )
    country = models.CharField(
        "Pays",
        max_length=2,
        default='CI',
        help_text="Code pays ISO"
    )

    def __str__(self):
        return f"Localisation - {self.technician.user.get_full_name()}"

    def get_distance_to(self, lat, lng):
        """Calcule la distance vers un point donné."""
        from math import radians, cos, sin, asin, sqrt
        
        # Convertir en radians
        lat1, lng1 = radians(self.latitude), radians(self.longitude)
        lat2, lng2 = radians(lat), radians(lng)
        
        # Rayon de la Terre en km
        R = 6371
        
        # Formule de Haversine
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        distance = R * c
        
        return distance

    def get_eta_to(self, lat, lng, avg_speed_kmh=30):
        """Calcule le temps d'arrivée estimé."""
        distance = self.get_distance_to(lat, lng)
        if avg_speed_kmh > 0:
            return (distance / avg_speed_kmh) * 60  # En minutes
        return None

    def is_accurate_enough(self, threshold_meters=100):
        """Vérifie si la précision est suffisante."""
        if self.accuracy is None:
            return True  # Si pas de précision, on suppose que c'est OK
        return self.accuracy <= threshold_meters

    def get_location_quality(self):
        """Retourne la qualité de la localisation."""
        if self.accuracy is None:
            return 'unknown'
        elif self.accuracy <= 10:
            return 'excellent'
        elif self.accuracy <= 50:
            return 'good'
        elif self.accuracy <= 100:
            return 'fair'
        else:
            return 'poor'

    class Meta:
        verbose_name = "Localisation de technicien"
        verbose_name_plural = "Localisations des techniciens"
        indexes = [
            models.Index(fields=["technician", "created_at"]),
            models.Index(fields=["latitude", "longitude"]),
            models.Index(fields=["is_moving", "created_at"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(accuracy__isnull=True) | models.Q(accuracy__gte=0),
                name='tech_location_accuracy_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(speed__isnull=True) | models.Q(speed__gte=0),
                name='tech_location_speed_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(heading__isnull=True) | (models.Q(heading__gte=0) & models.Q(heading__lte=360)),
                name='tech_location_heading_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(battery_level__isnull=True) | (models.Q(battery_level__gte=0) & models.Q(battery_level__lte=100)),
                name='tech_location_battery_valid'
            ),
        ]


class ClientLocation(BaseTimeStampModel):
    """Localisation en temps réel d'un client."""
    
    client = models.OneToOneField(
        Client, on_delete=models.CASCADE, related_name="location"
    )
    latitude = models.FloatField("Latitude")
    longitude = models.FloatField("Longitude")
    
    # Nouvelles fonctionnalités de géolocalisation
    accuracy = models.FloatField(
        "Précision (mètres)",
        null=True,
        blank=True,
        help_text="Précision GPS en mètres"
    )
    altitude = models.FloatField(
        "Altitude (mètres)",
        null=True,
        blank=True,
        help_text="Altitude en mètres"
    )
    speed = models.FloatField(
        "Vitesse (km/h)",
        null=True,
        blank=True,
        help_text="Vitesse de déplacement en km/h"
    )
    heading = models.FloatField(
        "Direction (degrés)",
        null=True,
        blank=True,
        help_text="Direction en degrés (0-360)"
    )
    is_moving = models.BooleanField(
        "En mouvement",
        default=False,
        help_text="Indique si le client est en mouvement"
    )
    battery_level = models.PositiveSmallIntegerField(
        "Niveau de batterie (%)",
        null=True,
        blank=True,
        help_text="Niveau de batterie du dispositif"
    )
    location_source = models.CharField(
        "Source de localisation",
        max_length=20,
        choices=[
            ('gps', 'GPS'),
            ('network', 'Réseau cellulaire'),
            ('wifi', 'WiFi'),
            ('manual', 'Manuel'),
        ],
        default='gps',
        help_text="Source de la localisation"
    )
    address = models.TextField(
        "Adresse",
        blank=True,
        help_text="Adresse géocodée"
    )
    city = models.CharField(
        "Ville",
        max_length=100,
        blank=True,
        help_text="Ville de localisation"
    )
    country = models.CharField(
        "Pays",
        max_length=2,
        default='CI',
        help_text="Code pays ISO"
    )

    def __str__(self):
        return f"Localisation - {self.client.user.get_full_name()}"

    def get_distance_to(self, lat, lng):
        """Calcule la distance vers un point donné."""
        from math import radians, cos, sin, asin, sqrt
        
        # Convertir en radians
        lat1, lng1 = radians(self.latitude), radians(self.longitude)
        lat2, lng2 = radians(lat), radians(lng)
        
        # Rayon de la Terre en km
        R = 6371
        
        # Formule de Haversine
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        distance = R * c
        
        return distance

    def is_accurate_enough(self, threshold_meters=100):
        """Vérifie si la précision est suffisante."""
        if self.accuracy is None:
            return True
        return self.accuracy <= threshold_meters

    def get_location_quality(self):
        """Retourne la qualité de la localisation."""
        if self.accuracy is None:
            return 'unknown'
        elif self.accuracy <= 10:
            return 'excellent'
        elif self.accuracy <= 50:
            return 'good'
        elif self.accuracy <= 100:
            return 'fair'
        else:
            return 'poor'

    class Meta:
        verbose_name = "Localisation de client"
        verbose_name_plural = "Localisations des clients"
        indexes = [
            models.Index(fields=["client", "created_at"]),
            models.Index(fields=["latitude", "longitude"]),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(accuracy__isnull=True) | models.Q(accuracy__gte=0),
                name='client_location_accuracy_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(speed__isnull=True) | models.Q(speed__gte=0),
                name='client_location_speed_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(heading__isnull=True) | (models.Q(heading__gte=0) & models.Q(heading__lte=360)),
                name='client_location_heading_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(battery_level__isnull=True) | (models.Q(battery_level__gte=0) & models.Q(battery_level__lte=100)),
                name='client_location_battery_valid'
            ),
        ]


# Nouveaux modèles pour le système de géolocalisation avancé

class LocationHistory(BaseTimeStampModel):
    """Historique des positions d'un utilisateur."""
    
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='location_history',
        verbose_name="Utilisateur"
    )
    latitude = models.FloatField("Latitude")
    longitude = models.FloatField("Longitude")
    accuracy = models.FloatField("Précision (mètres)", null=True, blank=True)
    altitude = models.FloatField("Altitude (mètres)", null=True, blank=True)
    speed = models.FloatField("Vitesse (km/h)", null=True, blank=True)
    heading = models.FloatField("Direction (degrés)", null=True, blank=True)
    is_moving = models.BooleanField("En mouvement", default=False)
    battery_level = models.PositiveSmallIntegerField("Niveau de batterie (%)", null=True, blank=True)
    location_source = models.CharField(
        "Source de localisation",
        max_length=20,
        choices=[
            ('gps', 'GPS'),
            ('network', 'Réseau cellulaire'),
            ('wifi', 'WiFi'),
            ('manual', 'Manuel'),
        ],
        default='gps'
    )
    address = models.TextField("Adresse", blank=True)
    city = models.CharField("Ville", max_length=100, blank=True)
    country = models.CharField("Pays", max_length=2, default='CI')
    request = models.ForeignKey(
        'RepairRequest',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='location_history',
        verbose_name="Demande liée"
    )

    def __str__(self):
        return f"Historique - {self.user.get_full_name()} - {self.created_at}"

    def get_distance_to(self, lat, lng):
        """Calcule la distance vers un point donné."""
        from math import radians, cos, sin, asin, sqrt
        
        lat1, lng1 = radians(self.latitude), radians(self.longitude)
        lat2, lng2 = radians(lat), radians(lng)
        
        R = 6371
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        distance = R * c
        
        return distance

    class Meta:
        verbose_name = "Historique de localisation"
        verbose_name_plural = "Historiques de localisation"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['request', 'created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(accuracy__isnull=True) | models.Q(accuracy__gte=0),
                name='location_history_accuracy_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(speed__isnull=True) | models.Q(speed__gte=0),
                name='location_history_speed_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(heading__isnull=True) | (models.Q(heading__gte=0) & models.Q(heading__lte=360)),
                name='location_history_heading_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(battery_level__isnull=True) | (models.Q(battery_level__gte=0) & models.Q(battery_level__lte=100)),
                name='location_history_battery_valid'
            ),
        ]


class ServiceZone(BaseTimeStampModel):
    """Zone de service pour les techniciens."""
    
    name = models.CharField("Nom", max_length=200)
    description = models.TextField("Description", blank=True)
    center_latitude = models.FloatField("Latitude du centre")
    center_longitude = models.FloatField("Longitude du centre")
    radius_km = models.FloatField("Rayon (km)")
    is_active = models.BooleanField("Active", default=True)
    color = models.CharField("Couleur", max_length=7, default='#2563eb')
    technicians = models.ManyToManyField(
        'Technician',
        related_name='service_zones',
        verbose_name="Techniciens"
    )

    def __str__(self):
        return f"Zone - {self.name}"

    def is_point_inside(self, lat, lng):
        """Vérifie si un point est dans la zone."""
        from math import radians, cos, sin, asin, sqrt
        
        lat1, lng1 = radians(self.center_latitude), radians(self.center_longitude)
        lat2, lng2 = radians(lat), radians(lng)
        
        R = 6371
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        distance = R * c
        
        return distance <= self.radius_km

    def get_technicians_in_zone(self, lat, lng):
        """Retourne les techniciens disponibles dans la zone."""
        if not self.is_point_inside(lat, lng):
            return self.technicians.none()
        
        return self.technicians.filter(is_available=True)

    class Meta:
        verbose_name = "Zone de service"
        verbose_name_plural = "Zones de service"
        ordering = ['name']
        indexes = [
            models.Index(fields=['center_latitude', 'center_longitude']),
            models.Index(fields=['is_active']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(radius_km__gt=0),
                name='service_zone_radius_positive'
            ),
        ]


class Route(BaseTimeStampModel):
    """Itinéraire entre deux points."""
    
    name = models.CharField("Nom", max_length=200)
    description = models.TextField("Description", blank=True)
    start_latitude = models.FloatField("Latitude de départ")
    start_longitude = models.FloatField("Longitude de départ")
    end_latitude = models.FloatField("Latitude d'arrivée")
    end_longitude = models.FloatField("Longitude d'arrivée")
    distance_km = models.FloatField("Distance (km)", null=True, blank=True)
    estimated_duration_minutes = models.PositiveIntegerField("Durée estimée (minutes)", null=True, blank=True)
    route_type = models.CharField(
        "Type d'itinéraire",
        max_length=20,
        choices=[
            ('driving', 'Voiture'),
            ('walking', 'À pied'),
            ('bicycling', 'Vélo'),
            ('transit', 'Transport en commun'),
        ],
        default='driving'
    )
    is_active = models.BooleanField("Active", default=True)
    request = models.ForeignKey(
        'RepairRequest',
        on_delete=models.CASCADE,
        related_name='routes',
        verbose_name="Demande"
    )
    technician = models.ForeignKey(
        'Technician',
        on_delete=models.CASCADE,
        related_name='routes',
        verbose_name="Technicien"
    )

    def __str__(self):
        return f"Itinéraire - {self.name}"

    def calculate_distance(self):
        """Calcule la distance de l'itinéraire."""
        from math import radians, cos, sin, asin, sqrt
        
        lat1, lng1 = radians(self.start_latitude), radians(self.start_longitude)
        lat2, lng2 = radians(self.end_latitude), radians(self.end_longitude)
        
        R = 6371
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        distance = R * c
        
        return distance

    def estimate_duration(self, avg_speed_kmh=30):
        """Estime la durée du trajet."""
        if self.distance_km is None:
            self.distance_km = self.calculate_distance()
        
        if avg_speed_kmh > 0:
            return (self.distance_km / avg_speed_kmh) * 60  # En minutes
        return None

    class Meta:
        verbose_name = "Itinéraire"
        verbose_name_plural = "Itinéraires"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['request', 'created_at']),
            models.Index(fields=['technician', 'created_at']),
        ]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(distance_km__isnull=True) | models.Q(distance_km__gte=0),
                name='route_distance_positive'
            ),
            models.CheckConstraint(
                condition=models.Q(estimated_duration_minutes__isnull=True) | models.Q(estimated_duration_minutes__gte=0),
                name='route_duration_positive'
            ),
        ]


class PointOfInterest(BaseTimeStampModel):
    """Point d'intérêt sur la carte."""
    
    name = models.CharField("Nom", max_length=200)
    description = models.TextField("Description", blank=True)
    latitude = models.FloatField("Latitude")
    longitude = models.FloatField("Longitude")
    poi_type = models.CharField(
        "Type de POI",
        max_length=30,
        choices=[
            ('landmark', 'Point de repère'),
            ('restaurant', 'Restaurant'),
            ('gas_station', 'Station-service'),
            ('hospital', 'Hôpital'),
            ('police', 'Commissariat'),
            ('bank', 'Banque'),
            ('pharmacy', 'Pharmacie'),
            ('store', 'Magasin'),
            ('other', 'Autre'),
        ],
        default='other'
    )
    address = models.TextField("Adresse", blank=True)
    phone = models.CharField("Téléphone", max_length=20, blank=True)
    website = models.URLField("Site web", blank=True)
    is_active = models.BooleanField("Active", default=True)
    rating = models.FloatField("Note", null=True, blank=True)

    def __str__(self):
        return f"POI - {self.name}"

    def get_distance_to(self, lat, lng):
        """Calcule la distance vers un point donné."""
        from math import radians, cos, sin, asin, sqrt
        
        lat1, lng1 = radians(self.latitude), radians(self.longitude)
        lat2, lng2 = radians(lat), radians(lng)
        
        R = 6371
        dlat = lat2 - lat1
        dlng = lng2 - lng1
        a = sin(dlat/2)**2 + cos(lat1) * cos(lat2) * sin(dlng/2)**2
        c = 2 * asin(sqrt(a))
        distance = R * c
        
        return distance

    class Meta:
        verbose_name = "Point d'intérêt"
        verbose_name_plural = "Points d'intérêt"
        ordering = ['name']
        indexes = [
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['poi_type', 'is_active']),
        ]


class GeolocationAlert(BaseTimeStampModel):
    """Alerte de géolocalisation."""
    
    alert_type = models.CharField(
        "Type d'alerte",
        max_length=30,
        choices=[
            ('technician_nearby', 'Technicien à proximité'),
            ('client_nearby', 'Client à proximité'),
            ('zone_entered', 'Entrée dans une zone'),
            ('zone_exited', 'Sortie d\'une zone'),
            ('route_deviation', 'Déviation d\'itinéraire'),
            ('location_accuracy_low', 'Précision GPS faible'),
            ('battery_low', 'Batterie faible'),
            ('speed_limit_exceeded', 'Limite de vitesse dépassée'),
            ('unusual_movement', 'Mouvement inhabituel'),
            ('location_timeout', 'Timeout de localisation'),
        ]
    )
    title = models.CharField("Titre", max_length=200)
    message = models.TextField("Message")
    severity = models.CharField(
        "Sévérité",
        max_length=20,
        choices=[
            ('info', 'Information'),
            ('warning', 'Avertissement'),
            ('critical', 'Critique'),
        ],
        default='info'
    )
    is_read = models.BooleanField("Lue", default=False)
    read_at = models.DateTimeField("Lue le", null=True, blank=True)
    latitude = models.FloatField("Latitude", null=True, blank=True)
    longitude = models.FloatField("Longitude", null=True, blank=True)
    extra_data = models.JSONField("Données supplémentaires", default=dict, blank=True)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='geolocation_alerts',
        verbose_name="Utilisateur"
    )
    request = models.ForeignKey(
        'RepairRequest',
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='geolocation_alerts',
        verbose_name="Demande"
    )

    def __str__(self):
        return f"Alerte - {self.alert_type} - {self.user.get_full_name()}"

    def mark_as_read(self):
        """Marque l'alerte comme lue."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])

    class Meta:
        verbose_name = "Alerte de géolocalisation"
        verbose_name_plural = "Alertes de géolocalisation"
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['alert_type', 'created_at']),
        ]


class GeolocationSettings(BaseTimeStampModel):
    """Paramètres de géolocalisation d'un utilisateur."""
    
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='geolocation_settings',
        verbose_name="Utilisateur"
    )
    location_sharing_enabled = models.BooleanField("Partage de localisation activé", default=True)
    background_location_enabled = models.BooleanField("Localisation en arrière-plan", default=False)
    high_accuracy_mode = models.BooleanField("Mode haute précision", default=True)
    location_update_interval_seconds = models.PositiveIntegerField("Intervalle de mise à jour (secondes)", default=30)
    max_location_history_days = models.PositiveIntegerField("Historique max (jours)", default=30)
    geofencing_enabled = models.BooleanField("Géofencing activé", default=False)
    speed_limit_kmh = models.PositiveIntegerField("Limite de vitesse (km/h)", null=True, blank=True)
    battery_threshold_percent = models.PositiveSmallIntegerField("Seuil batterie (%)", default=20)
    accuracy_threshold_meters = models.PositiveIntegerField("Seuil précision (mètres)", default=100)
    alert_notifications_enabled = models.BooleanField("Notifications d'alerte", default=True)
    map_provider = models.CharField(
        "Fournisseur de carte",
        max_length=20,
        choices=[
            ('openstreetmap', 'OpenStreetMap'),
            ('google_maps', 'Google Maps'),
            ('mapbox', 'Mapbox'),
            ('here', 'HERE Maps'),
        ],
        default='openstreetmap'
    )
    default_zoom_level = models.PositiveSmallIntegerField("Niveau de zoom par défaut", default=13)
    show_traffic = models.BooleanField("Afficher le trafic", default=False)
    show_pois = models.BooleanField("Afficher les POI", default=True)

    def __str__(self):
        return f"Paramètres géolocalisation - {self.user}"

    def is_location_sharing_allowed(self):
        """Vérifie si le partage de localisation est autorisé."""
        return self.location_sharing_enabled

    def should_update_location(self, last_update_time):
        """Vérifie si la localisation doit être mise à jour."""
        if not self.location_sharing_enabled:
            return False
        
        time_since_update = timezone.now() - last_update_time
        return time_since_update.total_seconds() >= self.location_update_interval_seconds

    def is_battery_low(self, current_battery_level):
        """Vérifie si la batterie est faible."""
        if current_battery_level is None:
            return False
        return current_battery_level <= self.battery_threshold_percent

    def is_accuracy_sufficient(self, current_accuracy):
        """Vérifie si la précision est suffisante."""
        if current_accuracy is None:
            return True
        return current_accuracy <= self.accuracy_threshold_meters

    class Meta:
        verbose_name = "Paramètres de géolocalisation"
        verbose_name_plural = "Paramètres de géolocalisation"
        constraints = [
            models.CheckConstraint(
                condition=models.Q(location_update_interval_seconds__gte=5),
                name='geo_settings_update_interval_min'
            ),
            models.CheckConstraint(
                condition=models.Q(max_location_history_days__gte=1),
                name='geo_settings_history_days_min'
            ),
            models.CheckConstraint(
                condition=models.Q(battery_threshold_percent__gte=0) & models.Q(battery_threshold_percent__lte=100),
                name='geo_settings_battery_threshold_valid'
            ),
            models.CheckConstraint(
                condition=models.Q(accuracy_threshold_meters__gte=1),
                name='geo_settings_accuracy_threshold_min'
            ),
            models.CheckConstraint(
                condition=models.Q(default_zoom_level__gte=1) & models.Q(default_zoom_level__lte=20),
                name='geo_settings_zoom_level_valid'
            ),
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

class GlobalStatistics(BaseTimeStampModel):
    """Statistiques globales de la plateforme."""
    
    # Métriques utilisateurs
    total_users = models.PositiveIntegerField("Total utilisateurs", default=0)
    total_clients = models.PositiveIntegerField("Total clients", default=0)
    total_technicians = models.PositiveIntegerField("Total techniciens", default=0)
    total_admins = models.PositiveIntegerField("Total admins", default=0)
    active_users_30d = models.PositiveIntegerField("Utilisateurs actifs (30j)", default=0)
    new_users_30d = models.PositiveIntegerField("Nouveaux utilisateurs (30j)", default=0)
    
    # Métriques demandes
    total_requests = models.PositiveIntegerField("Total demandes", default=0)
    pending_requests = models.PositiveIntegerField("Demandes en attente", default=0)
    in_progress_requests = models.PositiveIntegerField("Demandes en cours", default=0)
    completed_requests = models.PositiveIntegerField("Demandes terminées", default=0)
    cancelled_requests = models.PositiveIntegerField("Demandes annulées", default=0)
    urgent_requests = models.PositiveIntegerField("Demandes urgentes", default=0)
    
    # Métriques financières
    total_revenue = models.DecimalField("Revenus totaux", max_digits=15, decimal_places=2, default=Decimal('0.00'))
    total_payouts = models.DecimalField("Paiements totaux", max_digits=15, decimal_places=2, default=Decimal('0.00'))
    platform_fees = models.DecimalField("Frais de plateforme", max_digits=15, decimal_places=2, default=Decimal('0.00'))
    avg_request_value = models.DecimalField("Valeur moyenne demande", max_digits=10, decimal_places=2, default=Decimal('0.00'))
    
    # Métriques satisfaction
    total_reviews = models.PositiveIntegerField("Total avis", default=0)
    avg_rating = models.FloatField("Note moyenne", default=0.0)
    satisfaction_rate = models.FloatField("Taux de satisfaction (%)", default=0.0)
    recommendation_rate = models.FloatField("Taux de recommandation (%)", default=0.0)
    
    # Métriques performance
    avg_response_time_hours = models.FloatField("Temps de réponse moyen (h)", default=0.0)
    avg_completion_time_hours = models.FloatField("Temps de completion moyen (h)", default=0.0)
    success_rate = models.FloatField("Taux de succès (%)", default=0.0)
    
    # Métriques géographiques
    top_cities = models.JSONField("Top villes", default=list)
    service_areas = models.JSONField("Zones de service", default=list)
    
    # Métriques spécialités
    specialty_distribution = models.JSONField("Distribution spécialités", default=dict)
    top_specialties = models.JSONField("Top spécialités", default=list)
    
    # Métriques techniciens
    verified_technicians = models.PositiveIntegerField("Techniciens vérifiés", default=0)
    available_technicians = models.PositiveIntegerField("Techniciens disponibles", default=0)
    avg_technician_rating = models.FloatField("Note moyenne techniciens", default=0.0)
    top_technicians = models.JSONField("Top techniciens", default=list)
    
    # Métriques sécurité
    total_logins = models.PositiveIntegerField("Total connexions", default=0)
    failed_logins = models.PositiveIntegerField("Connexions échouées", default=0)
    security_alerts = models.PositiveIntegerField("Alertes de sécurité", default=0)
    login_success_rate = models.FloatField("Taux de succès connexion (%)", default=0.0)
    
    # Métriques paiements
    payment_methods = models.JSONField("Méthodes de paiement", default=list)
    payment_success_rate = models.FloatField("Taux de succès paiement (%)", default=0.0)
    
    # Tendances temporelles
    daily_stats = models.JSONField("Statistiques quotidiennes", default=dict)
    weekly_stats = models.JSONField("Statistiques hebdomadaires", default=dict)
    monthly_stats = models.JSONField("Statistiques mensuelles", default=dict)
    
    # Métriques avancées
    conversion_rate = models.FloatField("Taux de conversion (%)", default=0.0)
    retention_rate = models.FloatField("Taux de rétention (%)", default=0.0)
    churn_rate = models.FloatField("Taux de churn (%)", default=0.0)
    
    # Dernière mise à jour
    last_calculation = models.DateTimeField("Dernier calcul", auto_now=True)
    calculation_duration = models.FloatField("Durée calcul (secondes)", default=0.0)
    
    def __str__(self):
        return f"Statistiques globales - {self.created_at.strftime('%Y-%m-%d %H:%M')}"
    
    def calculate_all_metrics(self):
        """Calcule toutes les métriques globales."""
        import time
        start_time = time.time()
        
        from django.utils import timezone
        from django.db.models import Count, Sum, Avg, Q, F
        from datetime import timedelta
        from users.models import User, AuditLog
        from users.models import Client, Technician
        
        now = timezone.now()
        last_30_days = now - timedelta(days=30)
        last_7_days = now - timedelta(days=7)
        last_24_hours = now - timedelta(hours=24)
        
        # Métriques utilisateurs
        self.total_users = User.objects.count()
        self.total_clients = User.objects.filter(user_type='client').count()
        self.total_technicians = User.objects.filter(user_type='technician').count()
        self.total_admins = User.objects.filter(user_type='admin').count()
        
        # Utilisateurs actifs (30 derniers jours)
        active_client_ids = Client.objects.filter(
            repair_requests__created_at__gte=last_30_days
        ).values_list('user_id', flat=True)
        active_technician_ids = Technician.objects.filter(
            repair_requests__created_at__gte=last_30_days
        ).values_list('user_id', flat=True)
        self.active_users_30d = User.objects.filter(
            Q(id__in=active_client_ids) | Q(id__in=active_technician_ids)
        ).distinct().count()
        
        # Nouveaux utilisateurs (30 derniers jours)
        self.new_users_30d = User.objects.filter(created_at__gte=last_30_days).count()
        
        # Métriques demandes
        self.total_requests = RepairRequest.objects.count()
        self.pending_requests = RepairRequest.objects.filter(status='pending').count()
        self.in_progress_requests = RepairRequest.objects.filter(status='in_progress').count()
        self.completed_requests = RepairRequest.objects.filter(status='completed').count()
        self.cancelled_requests = RepairRequest.objects.filter(status='cancelled').count()
        self.urgent_requests = RepairRequest.objects.filter(urgency_level='urgent').count()
        
        # Métriques financières
        completed_payments = Payment.objects.filter(
            status='completed',
            payment_type='client_payment'
        )
        
        self.total_revenue = completed_payments.aggregate(
            total=Sum('amount')
        )['total'] or Decimal('0.00')
        
        self.total_payouts = Payment.objects.filter(
            status='completed',
            payment_type='technician_payout'
        ).aggregate(total=Sum('amount'))['total'] or Decimal('0.00')
        
        self.platform_fees = self.total_revenue - self.total_payouts
        
        if self.completed_requests > 0:
            self.avg_request_value = self.total_revenue / self.completed_requests
        else:
            self.avg_request_value = Decimal('0.00')
        
        # Métriques satisfaction
        reviews = Review.objects.filter(is_visible=True, moderation_status='approved')
        self.total_reviews = reviews.count()
        
        if self.total_reviews > 0:
            self.avg_rating = reviews.aggregate(avg=Avg('rating'))['avg'] or 0.0
            self.satisfaction_rate = (reviews.filter(rating__gte=4).count() / self.total_reviews) * 100
            self.recommendation_rate = (reviews.filter(would_recommend=True).count() / self.total_reviews) * 100
        else:
            self.avg_rating = 0.0
            self.satisfaction_rate = 0.0
            self.recommendation_rate = 0.0
        
        # Métriques performance
        completed_requests_with_times = RepairRequest.objects.filter(
            status='completed',
            assigned_at__isnull=False,
            completed_at__isnull=False
        )
        
        if completed_requests_with_times.exists():
            avg_response_time = completed_requests_with_times.aggregate(
                avg_response=Avg(F('assigned_at') - F('created_at'))
            )['avg_response']
            
            avg_completion_time = completed_requests_with_times.aggregate(
                avg_completion=Avg(F('completed_at') - F('assigned_at'))
            )['avg_completion']
            
            if avg_response_time:
                self.avg_response_time_hours = avg_response_time.total_seconds() / 3600
            if avg_completion_time:
                self.avg_completion_time_hours = avg_completion_time.total_seconds() / 3600
        
        if self.total_requests > 0:
            self.success_rate = (self.completed_requests / self.total_requests) * 100
        else:
            self.success_rate = 0.0
        
        # Métriques géographiques
        self.top_cities = list(
            RepairRequest.objects.values('city')
            .exclude(city='')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        
        # Métriques spécialités
        specialty_stats = RepairRequest.objects.values('specialty_needed').annotate(
            count=Count('id'),
            completed=Count('id', filter=Q(status='completed')),
            avg_price=Avg('final_price')
        ).order_by('-count')
        
        self.specialty_distribution = {
            item['specialty_needed']: {
                'count': item['count'],
                'completed': item['completed'],
                'avg_price': float(item['avg_price'] or 0)
            }
            for item in specialty_stats
        }
        
        self.top_specialties = list(specialty_stats[:5])
        
        # Métriques techniciens
        self.verified_technicians = Technician.objects.filter(is_verified=True).count()
        self.available_technicians = Technician.objects.filter(
            is_available=True, is_verified=True
        ).count()
        
        technician_reviews = Review.objects.filter(
            is_visible=True,
            moderation_status='approved'
        ).select_related('technician')
        
        if technician_reviews.exists():
            self.avg_technician_rating = technician_reviews.aggregate(
                avg=Avg('rating')
            )['avg'] or 0.0
        
        # Top techniciens
        top_technicians_data = Technician.objects.annotate(
            total_jobs=Count('repair_requests', filter=Q(repair_requests__status='completed')),
            avg_rating=Avg('reviews_received__rating', filter=Q(reviews_received__is_visible=True)),
            total_earnings=Sum('repair_requests__final_price', filter=Q(repair_requests__status='completed'))
        ).filter(total_jobs__gt=0).order_by('-total_jobs')[:10]
        
        self.top_technicians = [
            {
                'id': tech.id,
                'name': tech.user.get_full_name(),
                'specialty': tech.specialty,
                'total_jobs': tech.total_jobs,
                'avg_rating': float(tech.avg_rating or 0),
                'total_earnings': float(tech.total_earnings or 0)
            }
            for tech in top_technicians_data
        ]
        
        # Métriques sécurité
        self.total_logins = AuditLog.objects.filter(event_type='login', status='success').count()
        self.failed_logins = AuditLog.objects.filter(event_type='login', status='failure').count()
        self.security_alerts = SecurityNotification.objects.count()
        
        total_login_attempts = self.total_logins + self.failed_logins
        if total_login_attempts > 0:
            self.login_success_rate = (self.total_logins / total_login_attempts) * 100
        else:
            self.login_success_rate = 0.0
        
        # Métriques paiements
        payment_method_stats = Payment.objects.filter(status='completed').values('method').annotate(
            count=Count('id'),
            total=Sum('amount')
        ).order_by('-total')
        
        self.payment_methods = [
            {
                'method': item['method'],
                'count': item['count'],
                'total': float(item['total'] or 0)
            }
            for item in payment_method_stats
        ]
        
        total_payments = Payment.objects.count()
        successful_payments = Payment.objects.filter(status='completed').count()
        
        if total_payments > 0:
            self.payment_success_rate = (successful_payments / total_payments) * 100
        else:
            self.payment_success_rate = 0.0
        
        # Tendances temporelles
        self.daily_stats = self._calculate_daily_stats()
        self.weekly_stats = self._calculate_weekly_stats()
        self.monthly_stats = self._calculate_monthly_stats()
        
        # Métriques avancées
        self._calculate_advanced_metrics()
        
        # Durée de calcul
        self.calculation_duration = time.time() - start_time
        
        self.save()
    
    def _calculate_daily_stats(self):
        """Calcule les statistiques quotidiennes des 7 derniers jours."""
        from datetime import timedelta
        
        daily_stats = {}
        for i in range(7):
            date = timezone.now().date() - timedelta(days=i)
            start_of_day = timezone.make_aware(datetime.combine(date, datetime.min.time()))
            end_of_day = timezone.make_aware(datetime.combine(date, datetime.max.time()))
            
            daily_stats[date.strftime('%Y-%m-%d')] = {
                'requests': RepairRequest.objects.filter(
                    created_at__range=(start_of_day, end_of_day)
                ).count(),
                'completed': RepairRequest.objects.filter(
                    status='completed',
                    completed_at__range=(start_of_day, end_of_day)
                ).count(),
                'revenue': float(Payment.objects.filter(
                    status='completed',
                    payment_type='client_payment',
                    created_at__range=(start_of_day, end_of_day)
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'new_users': User.objects.filter(
                    created_at__range=(start_of_day, end_of_day)
                ).count()
            }
        
        return daily_stats
    
    def _calculate_weekly_stats(self):
        """Calcule les statistiques hebdomadaires des 4 dernières semaines."""
        weekly_stats = {}
        for i in range(4):
            week_start = timezone.now().date() - timedelta(weeks=i+1)
            week_end = week_start + timedelta(days=6)
            
            weekly_stats[f"Semaine {i+1}"] = {
                'requests': RepairRequest.objects.filter(
                    created_at__date__range=(week_start, week_end)
                ).count(),
                'completed': RepairRequest.objects.filter(
                    status='completed',
                    completed_at__date__range=(week_start, week_end)
                ).count(),
                'revenue': float(Payment.objects.filter(
                    status='completed',
                    payment_type='client_payment',
                    created_at__date__range=(week_start, week_end)
                ).aggregate(total=Sum('amount'))['total'] or 0)
            }
        
        return weekly_stats
    
    def _calculate_monthly_stats(self):
        """Calcule les statistiques mensuelles des 6 derniers mois."""
        monthly_stats = {}
        for i in range(6):
            month_start = (timezone.now().date().replace(day=1) - timedelta(days=30*i)).replace(day=1)
            if month_start.month == 12:
                month_end = month_start.replace(year=month_start.year + 1, month=1) - timedelta(days=1)
            else:
                month_end = month_start.replace(month=month_start.month + 1) - timedelta(days=1)
            
            monthly_stats[month_start.strftime('%Y-%m')] = {
                'requests': RepairRequest.objects.filter(
                    created_at__date__range=(month_start, month_end)
                ).count(),
                'completed': RepairRequest.objects.filter(
                    status='completed',
                    completed_at__date__range=(month_start, month_end)
                ).count(),
                'revenue': float(Payment.objects.filter(
                    status='completed',
                    payment_type='client_payment',
                    created_at__date__range=(month_start, month_end)
                ).aggregate(total=Sum('amount'))['total'] or 0),
                'new_users': User.objects.filter(
                    created_at__date__range=(month_start, month_end)
                ).count()
            }
        
        return monthly_stats
    
    def _calculate_advanced_metrics(self):
        """Calcule les métriques avancées."""
        from datetime import timedelta
        
        # Taux de conversion (demandes terminées / total demandes)
        if self.total_requests > 0:
            self.conversion_rate = (self.completed_requests / self.total_requests) * 100
        else:
            self.conversion_rate = 0.0
        
        # Taux de rétention (utilisateurs actifs / total utilisateurs)
        if self.total_users > 0:
            self.retention_rate = (self.active_users_30d / self.total_users) * 100
        else:
            self.retention_rate = 0.0
        
        # Taux de churn (utilisateurs inactifs)
        self.churn_rate = 100 - self.retention_rate
    
    class Meta:
        verbose_name = "Statistiques globales"
        verbose_name_plural = "Statistiques globales"
        ordering = ['-created_at']


class StatisticsCache(BaseTimeStampModel):
    """Cache pour les statistiques fréquemment demandées."""
    
    cache_key = models.CharField("Clé de cache", max_length=100, unique=True)
    cache_data = models.JSONField("Données en cache")
    expires_at = models.DateTimeField("Expire à")
    calculation_time = models.FloatField("Temps de calcul (secondes)")
    
    def __str__(self):
        return f"Cache {self.cache_key} - Expire: {self.expires_at}"
    
    @classmethod
    def get_or_create_cache(cls, key, data, expires_in_hours=1):
        """Récupère ou crée un cache."""
        expires_at = timezone.now() + timedelta(hours=expires_in_hours)
        
        cache_obj, created = cls.objects.get_or_create(
            cache_key=key,
            defaults={
                'cache_data': data,
                'expires_at': expires_at,
                'calculation_time': 0.0
            }
        )
        
        if not created and cache_obj.expires_at < timezone.now():
            # Cache expiré, mettre à jour
            cache_obj.cache_data = data
            cache_obj.expires_at = expires_at
            cache_obj.save()
        
        return cache_obj
    
    @classmethod
    def get_valid_cache(cls, key):
        """Récupère un cache valide."""
        try:
            cache_obj = cls.objects.get(cache_key=key)
            if cache_obj.expires_at > timezone.now():
                return cache_obj.cache_data
        except cls.DoesNotExist:
            pass
        return None
    
    class Meta:
        verbose_name = "Cache de statistiques"
        verbose_name_plural = "Caches de statistiques"
        ordering = ['-created_at']


# --- Modèles statistiques avancés ---
from django.contrib.auth import get_user_model
from django.db import models
from django.utils import timezone
try:
    from django.db.models import JSONField  # Django >= 3.1
except ImportError:
    from django.contrib.postgres.fields import JSONField  # Django < 3.1

User = get_user_model()

class GlobalStatistics(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    total_users = models.PositiveIntegerField(default=0)
    total_requests = models.PositiveIntegerField(default=0)
    total_reviews = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_payouts = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    platform_fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    avg_request_value = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    avg_response_time_hours = models.FloatField(default=0)
    avg_completion_time_hours = models.FloatField(default=0)
    success_rate = models.FloatField(default=0)
    conversion_rate = models.FloatField(default=0)
    retention_rate = models.FloatField(default=0)
    daily_stats = JSONField(default=dict, blank=True)
    weekly_stats = JSONField(default=dict, blank=True)
    monthly_stats = JSONField(default=dict, blank=True)
    top_cities = JSONField(default=list, blank=True)
    service_areas = JSONField(default=list, blank=True)
    specialty_distribution = JSONField(default=dict, blank=True)
    top_specialties = JSONField(default=list, blank=True)
    calculation_duration = models.FloatField(default=0)

    def calculate_all_metrics(self):
        # Méthode à implémenter selon la logique métier
        pass

class StatisticsCache(models.Model):
    cache_key = models.CharField(max_length=128, unique=True)
    cache_data = JSONField(default=dict, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()

    @classmethod
    def get_or_create_cache(cls, key, data, expires_in_hours=1):
        expires = timezone.now() + timezone.timedelta(hours=expires_in_hours)
        obj, created = cls.objects.get_or_create(cache_key=key, defaults={
            'cache_data': data,
            'expires_at': expires
        })
        if not created:
            obj.cache_data = data
            obj.expires_at = expires
            obj.save()
        return obj

    @classmethod
    def get_valid_cache(cls, key):
        try:
            obj = cls.objects.get(cache_key=key)
            if obj.expires_at > timezone.now():
                return obj.cache_data
        except cls.DoesNotExist:
            return None
        return None

class StatisticsDashboard(models.Model):
    DASHBOARD_TYPES = [
        ('admin', 'Admin'),
        ('technician', 'Technician'),
        ('client', 'Client'),
    ]
    name = models.CharField(max_length=128)
    description = models.TextField(blank=True)
    dashboard_type = models.CharField(max_length=32, choices=DASHBOARD_TYPES, default='admin')
    layout_config = JSONField(default=dict, blank=True)
    widgets_config = JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class StatisticsWidget(models.Model):
    WIDGET_TYPES = [
        ('metric', 'Metric'),
        ('chart', 'Chart'),
        ('table', 'Table'),
        ('custom', 'Custom'),
    ]
    dashboard = models.ForeignKey(StatisticsDashboard, on_delete=models.CASCADE, related_name='widgets')
    name = models.CharField(max_length=128)
    widget_type = models.CharField(max_length=32, choices=WIDGET_TYPES, default='metric')
    data_source = models.CharField(max_length=128)
    config = JSONField(default=dict, blank=True)
    position_x = models.PositiveIntegerField(default=0)
    position_y = models.PositiveIntegerField(default=0)
    width = models.PositiveIntegerField(default=1)
    height = models.PositiveIntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class StatisticsExport(models.Model):
    EXPORT_TYPES = [
        ('excel', 'Excel'),
        ('csv', 'CSV'),
        ('pdf', 'PDF'),
    ]
    export_type = models.CharField(max_length=16, choices=EXPORT_TYPES, default='excel')
    requested_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)
    export_config = JSONField(default=dict, blank=True)
    status = models.CharField(max_length=32, default='pending')
    file_path = models.CharField(max_length=256, blank=True)
    file_size_bytes = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    completed_at = models.DateTimeField(null=True, blank=True)

class StatisticsAlert(models.Model):
    ALERT_TYPES = [
        ('threshold_exceeded', 'Threshold Exceeded'),
        ('anomaly', 'Anomaly'),
        ('info', 'Info'),
        ('warning', 'Warning'),
        ('error', 'Error'),
    ]
    alert_type = models.CharField(max_length=32, choices=ALERT_TYPES, default='info')
    title = models.CharField(max_length=128)
    message = models.TextField()
    severity = models.CharField(max_length=16, default='info')
    triggered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='triggered_alerts')
    is_active = models.BooleanField(default=True)
    resolved_at = models.DateTimeField(null=True, blank=True)
    resolved_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='resolved_alerts')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class SupportRequest(models.Model):
    """Demande de support envoyée par un utilisateur ou visiteur."""
    name = models.CharField(max_length=100)
    email = models.EmailField()
    subject = models.CharField(max_length=200)
    message = models.TextField()
    attachment = models.FileField(upload_to='support_attachments/', blank=True, null=True)
    status = models.CharField(max_length=30, choices=[('new', 'Nouveau'), ('in_progress', 'En cours'), ('resolved', 'Résolu')], default='new')
    created_at = models.DateTimeField(auto_now_add=True)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='support_requests')

    class Meta:
        verbose_name = 'Demande de support'
        verbose_name_plural = 'Demandes de support'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.subject} ({self.email})"

class FAQ(models.Model):
    """Entrée de la Foire Aux Questions."""
    question = models.CharField(max_length=300)
    answer = models.TextField()
    category = models.CharField(max_length=100, blank=True)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'FAQ'
        verbose_name_plural = 'FAQs'
        ordering = ['category', 'order']

    def __str__(self):
        return self.question
