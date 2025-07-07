from django.contrib.auth.models import AbstractUser, UserManager
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.contrib.auth import get_user_model
import uuid
from django.utils import timezone
from django.conf import settings

class CustomUserManager(UserManager):
    def create_superuser(self, username, email=None, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('user_type', 'admin')
        if extra_fields.get('user_type') != 'admin':
            raise ValueError('Le superuser doit avoir user_type="admin".')
        return super().create_superuser(username, email, password, **extra_fields)

class User(AbstractUser):
    USER_TYPE_CHOICES = (
        ('technician', 'Technicien'),
        ('client', 'Client'),
        ('admin', 'Administrateur'),
    )
    
    # Rendre l'email unique et l'utiliser pour l'authentification
    email = models.EmailField(_('email address'), unique=True)

    user_type = models.CharField(max_length=20, choices=USER_TYPE_CHOICES)
    is_verified = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    # Personnaliser les related_name pour éviter les conflits
    groups = models.ManyToManyField(
        'auth.Group',
        verbose_name='groups',
        blank=True,
        help_text='The groups this user belongs to.',
        related_name='custom_user_set',
        related_query_name='user'
    )
    user_permissions = models.ManyToManyField(
        'auth.Permission',
        verbose_name='user permissions',
        blank=True,
        help_text='Specific permissions for this user.',
        related_name='custom_user_set',
        related_query_name='user'
    )
    
    class Meta:
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
    
    def __str__(self):
        return f"{self.username} ({self.get_user_type_display()})"

    objects = CustomUserManager()

class AuditLog(models.Model):
    EVENT_TYPES = [
        ('login', 'Connexion'),
        ('logout', 'Déconnexion'),
        ('profile_update', 'Modification profil'),
        ('password_change', 'Changement mot de passe'),
        ('payment', 'Paiement'),
        ('account_delete', 'Suppression de compte'),
        ('otp_sent', 'OTP envoyé'),
        ('otp_verified', 'OTP vérifié'),
        ('session_revoke', 'Session révoquée'),
        # ... autres types
    ]
    user = models.ForeignKey(get_user_model(), null=True, blank=True, on_delete=models.SET_NULL)
    ip_address = models.GenericIPAddressField()
    user_agent = models.TextField()
    event_type = models.CharField(max_length=32, choices=EVENT_TYPES)
    status = models.CharField(max_length=16, choices=[('success', 'Succès'), ('failure', 'Échec')])
    timestamp = models.DateTimeField(auto_now_add=True)
    geo_country = models.CharField(max_length=64, blank=True)
    geo_city = models.CharField(max_length=64, blank=True)
    risk_score = models.PositiveSmallIntegerField(default=0)
    metadata = models.JSONField(blank=True, default=dict)

    def __str__(self):
        return f"[{self.timestamp}] {self.user} - {self.event_type} ({self.status})"

class OTPChallenge(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    code = models.CharField(max_length=6)
    created_at = models.DateTimeField(auto_now_add=True)
    is_used = models.BooleanField(default=False)
    session_uuid = models.UUIDField(default=uuid.uuid4, editable=False)
    expires_at = models.DateTimeField()
    metadata = models.JSONField(blank=True, default=dict)

    def is_expired(self):
        return timezone.now() > self.expires_at or self.is_used

class SecurityNotification(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    subject = models.CharField(max_length=255)
    message = models.TextField()
    sent_at = models.DateTimeField(auto_now_add=True)
    event_type = models.CharField(max_length=64, blank=True, null=True)

    def __str__(self):
        return f"{self.subject} - {self.user.email} ({self.sent_at})"

class PasswordResetToken(models.Model):
    user = models.ForeignKey(get_user_model(), on_delete=models.CASCADE)
    token = models.CharField(max_length=100, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    expires_at = models.DateTimeField()
    is_used = models.BooleanField(default=False)

    def is_expired(self):
        return timezone.now() > self.expires_at or self.is_used

    def __str__(self):
        return f"Reset token for {self.user.email} - {'Used' if self.is_used else 'Active'}"

class PieceJointe(models.Model):
    TYPE_CHOICES = [
        ("carte_identite", "Carte d'identité nationale"),
        ("carte_biometrique", "Carte biométrique"),
        ("passeport", "Passeport"),
        ("certificat_residence", "Certificat de résidence"),
    ]
    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="pieces_jointes")
    type_piece = models.CharField(max_length=32, choices=TYPE_CHOICES)
    fichier = models.FileField(upload_to="pieces_jointes/")
    date_upload = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Pièce jointe justificative"
        verbose_name_plural = "Pièces jointes justificatives"
        ordering = ["-date_upload"]

    def __str__(self):
        return f"{self.get_type_piece_display()} - {self.user.username} ({self.date_upload:%d/%m/%Y})"

class TechnicianProfile(models.Model):
    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='technician_profile')
    piece_identite = models.FileField(upload_to='technician_docs/')
    certificat_residence = models.FileField(upload_to='technician_docs/')
    specialty = models.CharField(max_length=100)
    years_experience = models.PositiveIntegerField(default=0)
    phone = models.CharField(max_length=20)
    address = models.CharField(max_length=255, blank=True)

    def __str__(self):
        return f"{self.user.username} ({self.specialty})"
