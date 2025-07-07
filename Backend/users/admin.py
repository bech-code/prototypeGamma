from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User, AuditLog, OTPChallenge, PasswordResetToken, PieceJointe, TechnicianProfile

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('full_name', 'username', 'email', 'user_type', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_staff', 'is_active', 'is_verified')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'email')}),
        ('Type de compte', {'fields': ('user_type',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_verified', 'groups', 'user_permissions')}),
        ('Dates importantes', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'email', 'password', 'password2', 'user_type'),
        }),
    )
    
    def full_name(self, obj):
        """Affiche le nom complet de l'utilisateur."""
        if obj.first_name and obj.last_name:
            return format_html('<strong>{}</strong>', f"{obj.first_name} {obj.last_name}")
        elif obj.first_name:
            return format_html('<strong>{}</strong>', obj.first_name)
        elif obj.last_name:
            return format_html('<strong>{}</strong>', obj.last_name)
        else:
            return format_html('<em>{}</em>', obj.username)
    full_name.short_description = "Nom complet"
    full_name.admin_order_field = 'first_name'

@admin.register(AuditLog)
class AuditLogAdmin(admin.ModelAdmin):
    list_display = ('timestamp', 'user', 'event_type', 'status', 'ip_address', 'geo_country', 'risk_score')
    search_fields = ('user__username', 'ip_address', 'event_type', 'geo_country')
    list_filter = ('event_type', 'status', 'geo_country')
    readonly_fields = ('timestamp',)

@admin.register(OTPChallenge)
class OTPChallengeAdmin(admin.ModelAdmin):
    list_display = ('user', 'code', 'created_at', 'is_used', 'session_uuid', 'expires_at')
    search_fields = ('user__username', 'code', 'session_uuid')
    list_filter = ('is_used',)
    readonly_fields = ('created_at',)

@admin.register(PasswordResetToken)
class PasswordResetTokenAdmin(admin.ModelAdmin):
    list_display = ('user', 'token', 'created_at', 'expires_at', 'is_used')
    search_fields = ('user__email', 'token')
    list_filter = ('is_used',)
    readonly_fields = ('created_at',)

@admin.register(PieceJointe)
class PieceJointeAdmin(admin.ModelAdmin):
    list_display = ("user", "type_piece", "fichier", "date_upload", "preview")
    list_filter = ("type_piece", "date_upload")
    search_fields = ("user__username", "user__email")

    def preview(self, obj):
        if obj.fichier:
            url = obj.fichier.url
            if url.lower().endswith(('.jpg', '.jpeg', '.png', '.gif', '.webp')):
                return format_html('<a href="{}" target="_blank"><img src="{}" style="max-height:60px;max-width:80px;border-radius:4px;box-shadow:0 1px 4px #ccc;"/></a>', url, url)
            elif url.lower().endswith('.pdf'):
                return format_html('<a href="{}" target="_blank">Voir PDF</a>', url)
            else:
                return format_html('<a href="{}" target="_blank">Télécharger</a>', url)
        return "-"
    preview.short_description = "Aperçu / Lien"

@admin.register(TechnicianProfile)
class TechnicianProfileAdmin(admin.ModelAdmin):
    list_display = ("user", "specialty", "years_experience", "phone", "piece_identite", "certificat_residence")
    search_fields = ("user__username", "user__email", "specialty")
    list_filter = ("specialty",)
