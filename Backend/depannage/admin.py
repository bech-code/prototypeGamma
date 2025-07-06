from django.contrib import admin
from django.utils.html import format_html
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.db.models import Count, Avg, Q
from django.contrib.admin import SimpleListFilter
from django.utils import timezone
from datetime import timedelta

from .models import (
    Client, Technician, RepairRequest, RequestDocument, Review, 
    Payment, Conversation, Message, MessageAttachment, 
    Notification, TechnicianLocation, SystemConfiguration, CinetPayPayment, ClientLocation
)


# ============================================================================
# FILTRES PERSONNALISÉS
# ============================================================================

class RequestStatusFilter(SimpleListFilter):
    """Filtre personnalisé pour les statuts des demandes."""
    title = 'Statut avec compteurs'
    parameter_name = 'status_filter'

    def lookups(self, request, model_admin):
        return (
            ('pending', 'En attente'),
            ('assigned', 'Assignées'),
            ('in_progress', 'En cours'),
            ('completed', 'Terminées'),
            ('cancelled', 'Annulées'),
        )

    def queryset(self, request, queryset):
        if self.value():
            return queryset.filter(status=self.value())
        return queryset


class RecentActivityFilter(SimpleListFilter):
    """Filtre pour l'activité récente."""
    title = 'Activité récente'
    parameter_name = 'recent_activity'

    def lookups(self, request, model_admin):
        return (
            ('today', 'Aujourd\'hui'),
            ('week', 'Cette semaine'),
            ('month', 'Ce mois'),
        )

    def queryset(self, request, queryset):
        now = timezone.now()
        if self.value() == 'today':
            return queryset.filter(created_at__date=now.date())
        elif self.value() == 'week':
            return queryset.filter(created_at__gte=now - timedelta(days=7))
        elif self.value() == 'month':
            return queryset.filter(created_at__gte=now - timedelta(days=30))
        return queryset


class TechnicianRatingFilter(SimpleListFilter):
    """Filtre par note moyenne des techniciens."""
    title = 'Note moyenne'
    parameter_name = 'rating_filter'

    def lookups(self, request, model_admin):
        return (
            ('excellent', '4.5+ étoiles'),
            ('good', '3.5-4.4 étoiles'),
            ('average', '2.5-3.4 étoiles'),
            ('poor', 'Moins de 2.5 étoiles'),
        )

    def queryset(self, request, queryset):
        if self.value() == 'excellent':
            return queryset.filter(
                repair_requests__review__rating__gte=4.5
            ).distinct()
        elif self.value() == 'good':
            return queryset.filter(
                repair_requests__review__rating__gte=3.5,
                repair_requests__review__rating__lt=4.5
            ).distinct()
        elif self.value() == 'average':
            return queryset.filter(
                repair_requests__review__rating__gte=2.5,
                repair_requests__review__rating__lt=3.5
            ).distinct()
        elif self.value() == 'poor':
            return queryset.filter(
                repair_requests__review__rating__lt=2.5
            ).distinct()
        return queryset


# ============================================================================
# INLINES POUR RELATIONS
# ============================================================================

class RequestDocumentInline(admin.TabularInline):
    model = RequestDocument
    extra = 0
    readonly_fields = ('created_at', 'uploaded_by')
    fields = ('document_type', 'file', 'description', 'uploaded_by', 'created_at')


class PaymentInline(admin.TabularInline):
    model = Payment
    extra = 0
    readonly_fields = ('uuid', 'created_at', 'processed_at', 'net_amount')
    fields = ('payment_type', 'amount', 'fees', 'net_amount', 'method', 'status', 'created_at')

    def net_amount(self, obj):
        return f"{obj.net_amount} FCFA"
    net_amount.short_description = "Montant net"


class ReviewInline(admin.StackedInline):
    model = Review
    extra = 0
    readonly_fields = ('created_at',)
    fields = (
        ('rating', 'would_recommend'),
        ('punctuality_rating', 'quality_rating', 'communication_rating'),
        'comment',
        'created_at'
    )


class MessageInline(admin.TabularInline):
    model = Message
    extra = 0
    readonly_fields = ('created_at', 'read_at')
    fields = ('sender', 'content', 'message_type', 'is_read', 'created_at')


# ============================================================================
# ADMINISTRATION DES MODÈLES PRINCIPAUX
# ============================================================================

@admin.register(Client)
class ClientAdmin(admin.ModelAdmin):
    list_display = (
        'user_info', 'address_short', 'phone', 'total_requests_count', 
        'completed_requests_count', 'is_active', 'created_at'
    )
    list_filter = ('is_active', RecentActivityFilter, 'created_at')
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name', 'address', 'phone')
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at', 'total_requests_count', 'completed_requests_count')
    
    fieldsets = (
        ('Informations utilisateur', {
            'fields': ('user', 'is_active')
        }),
        ('Coordonnées', {
            'fields': ('address', 'phone')
        }),
        ('Statistiques', {
            'fields': ('total_requests_count', 'completed_requests_count'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def user_info(self, obj):
        return format_html(
            '<strong>{}</strong><br><span style="color: #666;">{}</span>',
            obj.user.get_full_name() or obj.user.username,
            obj.user.email
        )
    user_info.short_description = "Utilisateur"
    
    def address_short(self, obj):
        return obj.address[:50] + "..." if len(obj.address) > 50 else obj.address
    address_short.short_description = "Adresse"
    
    def total_requests_count(self, obj):
        return obj.total_requests
    total_requests_count.short_description = "Total demandes"
    
    def completed_requests_count(self, obj):
        return obj.completed_requests
    completed_requests_count.short_description = "Demandes terminées"


@admin.register(Technician)
class TechnicianAdmin(admin.ModelAdmin):
    list_display = (
        'user_info', 'specialty', 'availability_status', 'verification_status', 
        'experience_level', 'average_rating_display', 'total_jobs_display', 'created_at'
    )
    list_filter = (
        'specialty', 'is_available', 'is_verified', 
        TechnicianRatingFilter, 'years_experience', 'created_at'
    )
    search_fields = ('user__username', 'user__email', 'user__first_name', 'user__last_name', 'specialty')
    date_hierarchy = 'created_at'
    readonly_fields = (
        'created_at', 'updated_at', 'average_rating_display', 
        'total_jobs_display', 'success_rate_display'
    )
    
    fieldsets = (
        ('Informations utilisateur', {
            'fields': ('user', 'phone')
        }),
        ('Profil professionnel', {
            'fields': ('specialty', 'years_experience', 'hourly_rate', 'service_radius_km', 'bio')
        }),
        ('Statut', {
            'fields': ('is_available', 'is_verified')
        }),
        ('Statistiques', {
            'fields': ('average_rating_display', 'total_jobs_display', 'success_rate_display'),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['verify_technicians', 'unverify_technicians', 'set_available', 'set_unavailable']
    
    def user_info(self, obj):
        return format_html(
            '<strong>{}</strong><br><span style="color: #666;">{}</span>',
            obj.user.get_full_name() or obj.user.username,
            obj.user.email
        )
    user_info.short_description = "Technicien"
    
    def availability_status(self, obj):
        if obj.is_available:
            return format_html('<span style="color: green;">✓ Disponible</span>')
        return format_html('<span style="color: red;">✗ Indisponible</span>')
    availability_status.short_description = "Disponibilité"
    
    def verification_status(self, obj):
        if obj.is_verified:
            return format_html('<span style="color: blue;">✓ Vérifié</span>')
        return format_html('<span style="color: orange;">⚠ Non vérifié</span>')
    verification_status.short_description = "Vérification"
    
    def experience_level(self, obj):
        if obj.years_experience >= 10:
            return format_html('<span style="color: gold;">★ Expert ({} ans)</span>', obj.years_experience)
        elif obj.years_experience >= 5:
            return format_html('<span style="color: green;">▲ Expérimenté ({} ans)</span>', obj.years_experience)
        else:
            return format_html('<span style="color: blue;">● Débutant ({} ans)</span>', obj.years_experience)
    experience_level.short_description = "Expérience"
    
    def average_rating_display(self, obj):
        rating = obj.average_rating
        if rating > 0:
            stars = "★" * int(rating) + "☆" * (5 - int(rating))
            return format_html('<span title="{}/5">{}</span>', rating, stars)
        return "Aucune note"
    average_rating_display.short_description = "Note moyenne"
    
    def total_jobs_display(self, obj):
        return obj.total_jobs_completed
    total_jobs_display.short_description = "Travaux terminés"
    
    def success_rate_display(self, obj):
        rate = obj.success_rate
        color = "green" if rate >= 90 else "orange" if rate >= 70 else "red"
        return format_html('<span style="color: {};">{} %</span>', color, rate)
    success_rate_display.short_description = "Taux de réussite"
    
    # Actions personnalisées
    def verify_technicians(self, request, queryset):
        updated = queryset.update(is_verified=True)
        self.message_user(request, f"{updated} technicien(s) vérifié(s).")
    verify_technicians.short_description = "Vérifier les techniciens sélectionnés"
    
    def unverify_technicians(self, request, queryset):
        updated = queryset.update(is_verified=False)
        self.message_user(request, f"{updated} technicien(s) non vérifié(s).")
    unverify_technicians.short_description = "Annuler la vérification"
    
    def set_available(self, request, queryset):
        updated = queryset.update(is_available=True)
        self.message_user(request, f"{updated} technicien(s) marqué(s) comme disponible(s).")
    set_available.short_description = "Marquer comme disponible"
    
    def set_unavailable(self, request, queryset):
        updated = queryset.update(is_available=False)
        self.message_user(request, f"{updated} technicien(s) marqué(s) comme indisponible(s).")
    set_unavailable.short_description = "Marquer comme indisponible"


@admin.register(RepairRequest)
class RepairRequestAdmin(admin.ModelAdmin):
    list_display = (
        'request_info', 'client_link', 'technician_link', 'status_display', 
        'priority_display', 'total_cost_display', 'duration_display', 'created_at'
    )
    list_filter = (
        RequestStatusFilter, 'priority', 'specialty_needed', 
        RecentActivityFilter, 'created_at'
    )
    search_fields = (
        'title', 'description', 'uuid', 'client__user__username', 
        'technician__user__username', 'address'
    )
    date_hierarchy = 'created_at'
    readonly_fields = (
        'uuid', 'created_at', 'updated_at', 'assigned_at', 
        'started_at', 'completed_at', 'duration_display', 'total_cost_display'
    )
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('uuid', 'title', 'description', 'specialty_needed', 'priority')
        }),
        ('Participants', {
            'fields': ('client', 'technician')
        }),
        ('Localisation', {
            'fields': ('address', 'latitude', 'longitude')
        }),
        ('Statut et dates', {
            'fields': (
                'status', 'preferred_date', 'assigned_at', 
                'started_at', 'completed_at', 'duration_display'
            )
        }),
        ('Tarification', {
            'fields': ('estimated_price', 'final_price', 'travel_cost', 'total_cost_display')
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    inlines = [RequestDocumentInline, PaymentInline, ReviewInline]
    actions = ['assign_to_technician', 'mark_as_completed', 'cancel_requests']
    
    def request_info(self, obj):
        return format_html(
            '<strong>#{}</strong><br><span style="color: #666;">{}</span>',
            obj.id, obj.title[:40] + "..." if len(obj.title) > 40 else obj.title
        )
    request_info.short_description = "Demande"
    
    def client_link(self, obj):
        url = reverse('admin:depannage_client_change', args=[obj.client.id])
        display_name = obj.client.user.get_full_name() or obj.client.user.username
        return format_html('<a href="{}">{}</a>', url, display_name)
    client_link.short_description = "Client"
    
    def technician_link(self, obj):
        if obj.technician:
            url = reverse('admin:depannage_technician_change', args=[obj.technician.id])
            display_name = obj.technician.user.get_full_name() or obj.technician.user.username
            return format_html('<a href="{}">{}</a>', url, display_name)
        return "Non assigné"
    technician_link.short_description = "Technicien"
    
    def status_display(self, obj):
        status_colors = {
            'pending': '#ffa500',
            'assigned': '#0066cc',
            'in_progress': '#ff6600',
            'completed': '#008000',
            'cancelled': '#cc0000'
        }
        color = status_colors.get(obj.status, '#666')
        return format_html(
            '<span style="color: {}; font-weight: bold;">●</span> {}',
            color, obj.get_status_display()
        )
    status_display.short_description = "Statut"
    
    def priority_display(self, obj):
        priority_colors = {
            'low': '#666',
            'medium': '#0066cc',
            'high': '#ff6600',
            'urgent': '#cc0000'
        }
        color = priority_colors.get(obj.priority, '#666')
        return format_html(
            '<span style="color: {};">▲</span> {}',
            color, obj.get_priority_display()
        )
    priority_display.short_description = "Priorité"
    
    def total_cost_display(self, obj):
        if obj.total_cost:
            return f"{obj.total_cost} FCFA"
        return "Non défini"
    total_cost_display.short_description = "Coût total"
    
    def duration_display(self, obj):
        if obj.duration_hours:
            return f"{obj.duration_hours}h"
        return "N/A"
    duration_display.short_description = "Durée"


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = (
        'payment_info', 'request_link', 'amount_display', 'method', 
        'status_display', 'payment_type', 'created_at'
    )
    list_filter = ('status', 'method', 'payment_type', RecentActivityFilter, 'created_at')
    search_fields = (
        'uuid', 'transaction_id', 'reference', 'request__id', 
        'payer__username', 'recipient__username'
    )
    date_hierarchy = 'created_at'
    readonly_fields = (
        'uuid', 'created_at', 'updated_at', 'processed_at', 'net_amount_display'
    )
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('uuid', 'request', 'payment_type')
        }),
        ('Participants', {
            'fields': ('payer', 'recipient')
        }),
        ('Détails du paiement', {
            'fields': ('amount', 'fees', 'net_amount_display', 'method', 'status')
        }),
        ('Traçabilité', {
            'fields': ('transaction_id', 'reference', 'processed_at')
        }),
        ('Notes', {
            'fields': ('notes',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def payment_info(self, obj):
        return format_html('<strong>#{}</strong>', obj.id)
    payment_info.short_description = "Paiement"
    
    def request_link(self, obj):
        url = reverse('admin:depannage_repairrequest_change', args=[obj.request.id])
        return format_html('<a href="{}">Demande #{}</a>', url, obj.request.id)
    request_link.short_description = "Demande"
    
    def amount_display(self, obj):
        return format_html('<strong>{} FCFA</strong>', obj.amount)
    amount_display.short_description = "Montant"
    
    def status_display(self, obj):
        status_colors = {
            'pending': '#ffa500',
            'processing': '#0066cc',
            'completed': '#008000',
            'failed': '#cc0000',
            'refunded': '#666'
        }
        color = status_colors.get(obj.status, '#666')
        return format_html(
            '<span style="color: {}; font-weight: bold;">●</span> {}',
            color, obj.get_status_display()
        )
    status_display.short_description = "Statut"
    
    def net_amount_display(self, obj):
        return f"{obj.net_amount} FCFA"
    net_amount_display.short_description = "Montant net"


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = (
        'review_info', 'client_link', 'technician_link', 'rating_display', 
        'would_recommend', 'created_at'
    )
    list_filter = ('rating', 'would_recommend', RecentActivityFilter, 'created_at')
    search_fields = (
        'client__user__username', 'technician__user__username', 
        'comment', 'request__title'
    )
    date_hierarchy = 'created_at'
    readonly_fields = ('created_at', 'updated_at')
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('request', 'client', 'technician')
        }),
        ('Évaluation', {
            'fields': (
                'rating', 'would_recommend',
                'punctuality_rating', 'quality_rating', 'communication_rating'
            )
        }),
        ('Commentaire', {
            'fields': ('comment',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def review_info(self, obj):
        return format_html('<strong>Avis #{}</strong>', obj.id)
    review_info.short_description = "Avis"
    
    def client_link(self, obj):
        url = reverse('admin:depannage_client_change', args=[obj.client.id])
        display_name = obj.client.user.get_full_name() or obj.client.user.username
        return format_html('<a href="{}">{}</a>', url, display_name)
    client_link.short_description = "Client"
    
    def technician_link(self, obj):
        url = reverse('admin:depannage_technician_change', args=[obj.technician.id])
        display_name = obj.technician.user.get_full_name() or obj.technician.user.username
        return format_html('<a href="{}">{}</a>', url, display_name)
    technician_link.short_description = "Technicien"
    
    def rating_display(self, obj):
        stars = "★" * obj.rating + "☆" * (5 - obj.rating)
        return format_html('<span title="{}/5">{}</span>', obj.rating, stars)
    rating_display.short_description = "Note"


# ============================================================================
# ADMINISTRATION DES MODÈLES SECONDAIRES
# ============================================================================

@admin.register(RequestDocument)
class RequestDocumentAdmin(admin.ModelAdmin):
    list_display = ('document_info', 'request_link', 'document_type', 'uploaded_by', 'created_at')
    list_filter = ('document_type', RecentActivityFilter, 'created_at')
    search_fields = ('request__id', 'description', 'uploaded_by__username')
    readonly_fields = ('created_at', 'updated_at')
    
    def document_info(self, obj):
        return format_html('<strong>Doc #{}</strong>', obj.id)
    document_info.short_description = "Document"
    
    def request_link(self, obj):
        url = reverse('admin:depannage_repairrequest_change', args=[obj.request.id])
        return format_html('<a href="{}">Demande #{}</a>', url, obj.request.id)
    request_link.short_description = "Demande"


@admin.register(Notification)
class NotificationAdmin(admin.ModelAdmin):
    list_display = ('notification_info', 'recipient', 'type', 'read_status', 'created_at')
    list_filter = ('type', 'is_read', RecentActivityFilter, 'created_at')
    search_fields = ('recipient__username', 'title', 'message')
    readonly_fields = ('created_at', 'updated_at', 'read_at')
    actions = ['mark_as_read', 'mark_as_unread']
    
    def notification_info(self, obj):
        return format_html('<strong>{}</strong>', obj.title[:30] + "..." if len(obj.title) > 30 else obj.title)
    notification_info.short_description = "Notification"
    
    def read_status(self, obj):
        if obj.is_read:
            return format_html('<span style="color: green;">✓ Lue</span>')
        return format_html('<span style="color: orange;">● Non lue</span>')
    read_status.short_description = "Statut"
    
    def mark_as_read(self, request, queryset):
        updated = queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(request, f"{updated} notification(s) marquée(s) comme lue(s).")
    mark_as_read.short_description = "Marquer comme lues"
    
    def mark_as_unread(self, request, queryset):
        updated = queryset.update(is_read=False, read_at=None)
        self.message_user(request, f"{updated} notification(s) marquée(s) comme non lues.")
    mark_as_unread.short_description = "Marquer comme non lues"


@admin.register(Conversation)
class ConversationAdmin(admin.ModelAdmin):
    list_display = ('conversation_info', 'request_link', 'participants_list', 'latest_message_info', 'is_active')
    list_filter = ('is_active', RecentActivityFilter, 'created_at')
    search_fields = ('request__id', 'participants__username')
    inlines = [MessageInline]
    
    def conversation_info(self, obj):
        return format_html('<strong>Conv #{}</strong>', obj.id)
    conversation_info.short_description = "Conversation"
    
    def request_link(self, obj):
        url = reverse('admin:depannage_repairrequest_change', args=[obj.request.id])
        return format_html('<a href="{}">Demande #{}</a>', url, obj.request.id)
    request_link.short_description = "Demande"
    
    def participants_list(self, obj):
        participants = obj.participants.all()[:3]  # Limiter à 3 pour l'affichage
        names = [p.get_full_name() or p.username for p in participants]
        return ", ".join(names)
    participants_list.short_description = "Participants"
    
    def latest_message_info(self, obj):
        latest = obj.latest_message
        if latest:
            return format_html(
                '<span style="color: #666;">{} - {}</span>',
                latest.sender.get_full_name() or latest.sender.username,
                latest.created_at.strftime('%d/%m %H:%M')
            )
        return "Aucun message"
    latest_message_info.short_description = "Dernier message"


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ('message_info', 'conversation_link', 'sender', 'message_type', 'read_status', 'created_at')
    list_filter = ('message_type', 'is_read', RecentActivityFilter, 'created_at')
    search_fields = ('content', 'sender__username', 'conversation__request__id')
    readonly_fields = ('created_at', 'updated_at', 'read_at')
    
    def message_info(self, obj):
        content = obj.content[:40] + "..." if len(obj.content) > 40 else obj.content
        return format_html('<strong>Msg #{}</strong><br><span style="color: #666;">{}</span>', obj.id, content)
    message_info.short_description = "Message"
    
    def conversation_link(self, obj):
        url = reverse('admin:depannage_conversation_change', args=[obj.conversation.id])
        return format_html('<a href="{}">Conversation #{}</a>', url, obj.conversation.id)
    conversation_link.short_description = "Conversation"
    
    def read_status(self, obj):
        if obj.is_read:
            return format_html('<span style="color: green;">✓ Lu</span>')
        return format_html('<span style="color: orange;">● Non lu</span>')
    read_status.short_description = "Statut"


@admin.register(MessageAttachment)
class MessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ('attachment_info', 'message_link', 'file_name', 'file_size_display', 'created_at')
    list_filter = ('content_type', RecentActivityFilter, 'created_at')
    search_fields = ('file_name', 'message__content')
    readonly_fields = ('created_at', 'updated_at', 'file_size_display')
    
    def attachment_info(self, obj):
        return format_html('<strong>PJ #{}</strong>', obj.id)
    attachment_info.short_description = "Pièce jointe"
    
    def message_link(self, obj):
        url = reverse('admin:depannage_message_change', args=[obj.message.id])
        return format_html('<a href="{}">Message #{}</a>', url, obj.message.id)
    message_link.short_description = "Message"
    
    def file_size_display(self, obj):
        size_mb = obj.file_size / (1024 * 1024)
        if size_mb >= 1:
            return f"{size_mb:.2f} MB"
        else:
            size_kb = obj.file_size / 1024
            return f"{size_kb:.2f} KB"
    file_size_display.short_description = "Taille"


@admin.register(TechnicianLocation)
class TechnicianLocationAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour la localisation des techniciens."""
    list_display = ('technician', 'latitude', 'longitude', 'technician_availability', 'updated_at')
    list_filter = ('technician__is_available',)
    search_fields = ('technician__user__username', 'technician__user__first_name')
    readonly_fields = ('created_at', 'updated_at')

    @admin.display(description='Disponibilité', boolean=True)
    def technician_availability(self, obj):
        """Affiche la disponibilité du technicien lié."""
        return obj.technician.is_available

# Assurez-vous que les autres modèles sont aussi enregistrés si nécessaire
# admin.site.register(Client)
# admin.site.register(Technician)
# ... etc


@admin.register(SystemConfiguration)
class SystemConfigurationAdmin(admin.ModelAdmin):
    list_display = ('key', 'value_short', 'is_active', 'created_at')
    list_filter = ('is_active', RecentActivityFilter, 'created_at')
    search_fields = ('key', 'description')
    readonly_fields = ('created_at', 'updated_at')
    
    def value_short(self, obj):
        return obj.value[:50] + "..." if len(obj.value) > 50 else obj.value
    value_short.short_description = "Valeur"


@admin.register(CinetPayPayment)
class CinetPayPaymentAdmin(admin.ModelAdmin):
    list_display = (
        'transaction_info', 'client_info', 'amount_display', 'status_display', 
        'payment_method_display', 'created_at'
    )
    list_filter = ('status', 'currency', 'created_at')
    search_fields = (
        'transaction_id', 'customer_name', 'customer_email', 
        'customer_phone_number', 'description'
    )
    readonly_fields = (
        'transaction_id', 'payment_token', 'payment_url', 'cinetpay_transaction_id',
        'created_at', 'updated_at', 'paid_at'
    )
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('transaction_id', 'amount', 'currency', 'description', 'status')
        }),
        ('Informations client', {
            'fields': (
                'customer_name', 'customer_surname', 'customer_email', 'customer_phone_number',
                'customer_address', 'customer_city', 'customer_country', 'customer_state', 'customer_zip_code'
            )
        }),
        ('Informations CinetPay', {
            'fields': ('payment_token', 'payment_url', 'cinetpay_transaction_id'),
            'classes': ('collapse',)
        }),
        ('Relations', {
            'fields': ('request', 'user')
        }),
        ('Métadonnées', {
            'fields': ('metadata', 'invoice_data'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'paid_at'),
            'classes': ('collapse',)
        }),
    )
    
    def transaction_info(self, obj):
        return format_html(
            '<strong>{}</strong><br><span style="color: #666;">{}</span>',
            obj.transaction_id,
            obj.description[:50] + "..." if len(obj.description) > 50 else obj.description
        )
    transaction_info.short_description = "Transaction"
    
    def client_info(self, obj):
        return format_html(
            '<strong>{} {}</strong><br><span style="color: #666;">{}</span>',
            obj.customer_name, obj.customer_surname, obj.customer_email
        )
    client_info.short_description = "Client"
    
    def amount_display(self, obj):
        return format_html('<strong>{} {}</strong>', obj.amount, obj.currency)
    amount_display.short_description = "Montant"
    
    def status_display(self, obj):
        status_colors = {
            'pending': '#ffa500',
            'success': '#008000',
            'failed': '#cc0000',
            'cancelled': '#666'
        }
        color = status_colors.get(obj.status, '#666')
        return format_html(
            '<span style="color: {}; font-weight: bold;">●</span> {}',
            color, obj.get_status_display()
        )
    status_display.short_description = "Statut"
    
    def payment_method_display(self, obj):
        if obj.payment_url:
            return format_html(
                '<a href="{}" target="_blank" class="button">Voir le paiement</a>',
                obj.payment_url
            )
        return "N/A"
    payment_method_display.short_description = "Méthode de paiement"


@admin.register(ClientLocation)
class ClientLocationAdmin(admin.ModelAdmin):
    list_display = ('client', 'latitude', 'longitude', 'created_at', 'updated_at')
    search_fields = ('client__user__username', 'client__user__first_name', 'client__user__last_name')
    readonly_fields = ('created_at', 'updated_at')