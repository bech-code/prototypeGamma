from django.contrib import admin
from django.utils.html import format_html
from django.utils import timezone
from datetime import timedelta
from django.db.models import Sum, Avg, Count
from django.urls import reverse
from django.utils.safestring import mark_safe
from django.contrib.admin import SimpleListFilter

from .models import (
    Client, Technician, RepairRequest, RequestDocument, Review, 
    Payment, Conversation, Message, MessageAttachment, 
    Notification, TechnicianLocation, SystemConfiguration, CinetPayPayment, ClientLocation, Report, AdminNotification,
    TechnicianSubscription, SubscriptionPaymentRequest, ChatConversation, ChatMessage, ChatMessageAttachment, CommunicationStats, CommunicationSession, CommunicationNotification, CommunicationSettings, LocationHistory,
    ServiceZone, Route, PointOfInterest, GeolocationAlert, GeolocationSettings
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
    """Admin pour la localisation des techniciens."""
    
    list_display = [
        'technician', 'latitude', 'longitude', 'accuracy', 'is_moving',
        'battery_level', 'location_source', 'city', 'created_at'
    ]
    list_filter = [
        'is_moving', 'location_source', 'city', 'country',
        'created_at', 'updated_at'
    ]
    search_fields = [
        'technician__user__first_name', 'technician__user__last_name',
        'technician__user__email', 'address', 'city'
    ]
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 20
    
    fieldsets = (
        ('Technicien', {
            'fields': ('technician',)
        }),
        ('Coordonnées', {
            'fields': ('latitude', 'longitude', 'accuracy', 'altitude')
        }),
        ('Mouvement', {
            'fields': ('speed', 'heading', 'is_moving')
        }),
        ('Dispositif', {
            'fields': ('battery_level', 'location_source')
        }),
        ('Adresse', {
            'fields': ('address', 'city', 'country')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ClientLocation)
class ClientLocationAdmin(admin.ModelAdmin):
    """Admin pour la localisation des clients."""
    
    list_display = [
        'client', 'latitude', 'longitude', 'accuracy', 'is_moving',
        'battery_level', 'location_source', 'city', 'created_at'
    ]
    list_filter = [
        'is_moving', 'location_source', 'city', 'country',
        'created_at', 'updated_at'
    ]
    search_fields = [
        'client__user__first_name', 'client__user__last_name',
        'client__user__email', 'address', 'city'
    ]
    readonly_fields = ['created_at', 'updated_at']
    list_per_page = 20
    
    fieldsets = (
        ('Client', {
            'fields': ('client',)
        }),
        ('Coordonnées', {
            'fields': ('latitude', 'longitude', 'accuracy', 'altitude')
        }),
        ('Mouvement', {
            'fields': ('speed', 'heading', 'is_moving')
        }),
        ('Dispositif', {
            'fields': ('battery_level', 'location_source')
        }),
        ('Adresse', {
            'fields': ('address', 'city', 'country')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(LocationHistory)
class LocationHistoryAdmin(admin.ModelAdmin):
    """Admin pour l'historique de localisation."""
    list_display = [
        'user', 'latitude', 'longitude', 'accuracy', 'is_moving',
        'location_source', 'city', 'created_at'
    ]
    list_filter = [
        'is_moving', 'location_source', 'city', 'country',
        'created_at'
    ]
    search_fields = [
        'user__first_name', 'user__last_name', 'user__email',
        'address', 'city'
    ]
    readonly_fields = ['created_at']
    list_per_page = 50
    date_hierarchy = 'created_at'
    fieldsets = (
        ('Localisation', {
            'fields': ('user', 'latitude', 'longitude', 'accuracy', 'is_moving', 'location_source', 'city', 'country', 'address')
        }),
        ('Statut', {
            'fields': ('created_at',),
            'classes': ('collapse',)
        }),
    )


@admin.register(ServiceZone)
class ServiceZoneAdmin(admin.ModelAdmin):
    """Admin pour les zones de service."""
    
    list_display = [
        'name', 'center_latitude', 'center_longitude', 'radius_km',
        'is_active', 'technician_count', 'created_at'
    ]
    list_filter = ['is_active', 'created_at', 'updated_at']
    search_fields = ['name', 'description']
    readonly_fields = ['created_at', 'updated_at']
    filter_horizontal = ['technicians']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'description', 'is_active', 'color')
        }),
        ('Géométrie', {
            'fields': ('center_latitude', 'center_longitude', 'radius_km')
        }),
        ('Techniciens', {
            'fields': ('technicians',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    def technician_count(self, obj):
        """Retourne le nombre de techniciens dans la zone."""
        return obj.technicians.count()
    technician_count.short_description = "Nombre de techniciens"


@admin.register(Route)
class RouteAdmin(admin.ModelAdmin):
    """Admin pour les itinéraires."""
    
    list_display = [
        'name', 'technician', 'request', 'route_type', 'distance_km',
        'estimated_duration_minutes', 'is_active', 'created_at'
    ]
    list_filter = [
        'route_type', 'is_active', 'created_at', 'updated_at'
    ]
    search_fields = [
        'name', 'description', 'technician__user__first_name',
        'technician__user__last_name', 'request__title'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'description', 'is_active', 'route_type')
        }),
        ('Relations', {
            'fields': ('request', 'technician')
        }),
        ('Point de départ', {
            'fields': ('start_latitude', 'start_longitude')
        }),
        ('Point d\'arrivée', {
            'fields': ('end_latitude', 'end_longitude')
        }),
        ('Métriques', {
            'fields': ('distance_km', 'estimated_duration_minutes')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(PointOfInterest)
class PointOfInterestAdmin(admin.ModelAdmin):
    """Admin pour les points d'intérêt."""
    
    list_display = [
        'name', 'poi_type', 'latitude', 'longitude', 'is_active',
        'rating', 'created_at'
    ]
    list_filter = [
        'poi_type', 'is_active', 'rating', 'created_at', 'updated_at'
    ]
    search_fields = [
        'name', 'description', 'address', 'phone', 'website'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Informations générales', {
            'fields': ('name', 'description', 'poi_type', 'is_active', 'rating')
        }),
        ('Coordonnées', {
            'fields': ('latitude', 'longitude')
        }),
        ('Contact', {
            'fields': ('address', 'phone', 'website')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(GeolocationAlert)
class GeolocationAlertAdmin(admin.ModelAdmin):
    """Admin pour les alertes de géolocalisation."""
    
    list_display = [
        'alert_type', 'user', 'severity', 'is_read', 'created_at'
    ]
    list_filter = [
        'alert_type', 'severity', 'is_read', 'created_at', 'updated_at'
    ]
    search_fields = [
        'title', 'message', 'user__first_name', 'user__last_name',
        'user__email'
    ]
    readonly_fields = ['created_at', 'updated_at', 'read_at']
    list_per_page = 50
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Alerte', {
            'fields': ('alert_type', 'title', 'message', 'severity')
        }),
        ('Utilisateur', {
            'fields': ('user', 'request')
        }),
        ('Localisation', {
            'fields': ('latitude', 'longitude', 'extra_data')
        }),
        ('Statut', {
            'fields': ('is_read', 'read_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['mark_as_read', 'mark_as_unread']
    
    def mark_as_read(self, request, queryset):
        """Marque les alertes comme lues."""
        updated = queryset.update(is_read=True, read_at=timezone.now())
        self.message_user(
            request,
            f"{updated} alerte(s) marquée(s) comme lue(s)."
        )
    mark_as_read.short_description = "Marquer comme lues"
    
    def mark_as_unread(self, request, queryset):
        """Marque les alertes comme non lues."""
        updated = queryset.update(is_read=False, read_at=None)
        self.message_user(
            request,
            f"{updated} alerte(s) marquée(s) comme non lue(s)."
        )
    mark_as_unread.short_description = "Marquer comme non lues"


@admin.register(GeolocationSettings)
class GeolocationSettingsAdmin(admin.ModelAdmin):
    """Admin pour les paramètres de géolocalisation."""
    
    list_display = [
        'user', 'location_sharing_enabled', 'background_location_enabled',
        'high_accuracy_mode', 'map_provider', 'created_at'
    ]
    list_filter = [
        'location_sharing_enabled', 'background_location_enabled',
        'high_accuracy_mode', 'geofencing_enabled', 'alert_notifications_enabled',
        'show_traffic', 'show_pois', 'map_provider', 'created_at', 'updated_at'
    ]
    search_fields = [
        'user__first_name', 'user__last_name', 'user__email'
    ]
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Partage de localisation', {
            'fields': (
                'location_sharing_enabled', 'background_location_enabled',
                'high_accuracy_mode', 'location_update_interval_seconds'
            )
        }),
        ('Historique', {
            'fields': ('max_location_history_days',)
        }),
        ('Géofencing', {
            'fields': ('geofencing_enabled',)
        }),
        ('Limites', {
            'fields': ('speed_limit_kmh', 'battery_threshold_percent', 'accuracy_threshold_meters')
        }),
        ('Notifications', {
            'fields': ('alert_notifications_enabled',)
        }),
        ('Carte', {
            'fields': ('map_provider', 'default_zoom_level', 'show_traffic', 'show_pois')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


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
        'created_at', 'updated_at', 'paid_at', 'notification_data_pretty'
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
            'fields': ('metadata', 'invoice_data', 'notification_data_pretty'),
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

    def notification_data_pretty(self, obj):
        import json
        if obj.notification_data:
            return format_html('<pre style="max-width:700px;overflow:auto;">{}</pre>',
                json.dumps(obj.notification_data, indent=2, ensure_ascii=False)
            )
        return mark_safe('<span style="color:#888;">Aucune notification stockée</span>')
    notification_data_pretty.short_description = "Notification CinetPay (JSON)"


@admin.register(Report)
class ReportAdmin(admin.ModelAdmin):
    list_display = ('id', 'sender', 'request', 'subject', 'status', 'created_at', 'reviewed_by')
    list_filter = ('status', 'created_at')
    search_fields = ('subject', 'message', 'sender__email')

@admin.register(AdminNotification)
class AdminNotificationAdmin(admin.ModelAdmin):
    list_display = ('id', 'title', 'severity', 'is_read', 'created_at', 'related_request', 'triggered_by')
    list_filter = ('severity', 'is_read', 'created_at')
    search_fields = ('title', 'message')


@admin.register(TechnicianSubscription)
class TechnicianSubscriptionAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour les abonnements des techniciens."""
    list_display = (
        'technician', 'plan_name', 'is_active', 'start_date', 'end_date', 'payment'
    )
    list_filter = (
        'is_active', 'plan_name', 'start_date', 'end_date'
    )
    search_fields = (
        'technician__user__username', 'technician__user__email', 
        'technician__user__first_name', 'technician__user__last_name'
    )
    # Pas de readonly_fields ni de date_hierarchy car non présents dans le modèle
    # Pas de 'created_at' ni 'updated_at' ni 'days_remaining_display'
    # Pas de list_filter sur 'created_at'
    # Pas de date_hierarchy sur 'created_at'
    
    fieldsets = (
        ('Informations', {
            'fields': ('technician', 'plan_name', 'start_date', 'end_date', 'is_active', 'payment')
        }),
    )
    
    actions = ['activate_subscriptions', 'deactivate_subscriptions', 'extend_subscriptions']
    
    def technician_info(self, obj):
        return format_html(
            '<strong>{}</strong><br><span style="color: #666;">{}</span>',
            obj.technician.user.get_full_name() or obj.technician.user.username,
            obj.technician.user.email
        )
    technician_info.short_description = "Technicien"
    
    def status_display(self, obj):
        if obj.is_active and obj.end_date > timezone.now():
            return format_html('<span style="color: green;">✓ Actif</span>')
        elif obj.end_date <= timezone.now():
            return format_html('<span style="color: red;">✗ Expiré</span>')
        else:
            return format_html('<span style="color: orange;">⚠ Inactif</span>')
    status_display.short_description = "Statut"
    
    def days_remaining(self, obj):
        if obj.end_date > timezone.now():
            days = (obj.end_date - timezone.now()).days
            color = "green" if days > 30 else "orange" if days > 7 else "red"
            return format_html('<span style="color: {};">{} jours</span>', color, days)
        return "Expiré"
    days_remaining.short_description = "Jours restants"
    
    def payment_info(self, obj):
        if obj.payment:
            return format_html(
                '<span style="color: blue;">{}</span><br><small>{}</small>',
                obj.payment.transaction_id,
                obj.payment.status
            )
        return "Aucun paiement"
    payment_info.short_description = "Paiement"
    
    def days_remaining_display(self, obj):
        if obj.end_date > timezone.now():
            return f"{(obj.end_date - timezone.now()).days} jours restants"
        return "Expiré"
    days_remaining_display.short_description = "Jours restants"
    
    def activate_subscriptions(self, request, queryset):
        updated = queryset.update(is_active=True)
        self.message_user(request, f"{updated} abonnement(s) activé(s).")
    activate_subscriptions.short_description = "Activer les abonnements sélectionnés"
    
    def deactivate_subscriptions(self, request, queryset):
        updated = queryset.update(is_active=False)
        self.message_user(request, f"{updated} abonnement(s) désactivé(s).")
    deactivate_subscriptions.short_description = "Désactiver les abonnements sélectionnés"
    
    def extend_subscriptions(self, request, queryset):
        days = int(request.POST.get('days', 30))
        for subscription in queryset:
            subscription.end_date += timedelta(days=days)
            subscription.save()
        self.message_user(request, f"{queryset.count()} abonnement(s) prolongé(s) de {days} jours.")
    extend_subscriptions.short_description = "Prolonger les abonnements sélectionnés"


@admin.register(SubscriptionPaymentRequest)
class SubscriptionPaymentRequestAdmin(admin.ModelAdmin):
    """Configuration de l'admin pour les demandes de paiement d'abonnement."""
    list_display = (
        'technician_info', 'amount_display', 'duration_months', 'payment_method',
        'status_display', 'created_at', 'validated_info'
    )
    list_filter = (
        'status', 'payment_method', 'duration_months', 'created_at', 'validated_at'
    )
    search_fields = (
        'technician__user__username', 'technician__user__email',
        'technician__user__first_name', 'technician__user__last_name',
        'description'
    )
    readonly_fields = (
        'created_at', 'updated_at', 'validated_at', 'validated_by'
    )
    date_hierarchy = 'created_at'
    
    fieldsets = (
        ('Informations technicien', {
            'fields': ('technician',)
        }),
        ('Détails paiement', {
            'fields': ('amount', 'duration_months', 'payment_method', 'description')
        }),
        ('Statut', {
            'fields': ('status',)
        }),
        ('Validation', {
            'fields': ('validated_by', 'validated_at', 'validation_notes'),
            'classes': ('collapse',)
        }),
        ('Abonnement créé', {
            'fields': ('subscription',),
            'classes': ('collapse',)
        }),
        ('Métadonnées', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    
    actions = ['approve_requests', 'reject_requests', 'cancel_requests']
    
    def technician_info(self, obj):
        return format_html(
            '<strong>{}</strong><br><span style="color: #666;">{}</span>',
            obj.technician.user.get_full_name() or obj.technician.user.username,
            obj.technician.user.email
        )
    technician_info.short_description = "Technicien"
    
    def amount_display(self, obj):
        return format_html('<strong>{:,} FCFA</strong>', obj.amount)
    amount_display.short_description = "Montant"
    
    def status_display(self, obj):
        status_colors = {
            'pending': '#ffa500',
            'approved': '#008000',
            'rejected': '#cc0000',
            'cancelled': '#666'
        }
        color = status_colors.get(obj.status, '#666')
        return format_html(
            '<span style="color: {}; font-weight: bold;">●</span> {}',
            color, obj.get_status_display()
        )
    status_display.short_description = "Statut"
    
    def validated_info(self, obj):
        if obj.validated_by:
            return format_html(
                '<span style="color: blue;">{}</span><br><small>{}</small>',
                obj.validated_by.get_full_name() or obj.validated_by.username,
                obj.validated_at.strftime('%d/%m/%Y %H:%M') if obj.validated_at else ''
            )
        return "Non validé"
    validated_info.short_description = "Validé par"
    
    def approve_requests(self, request, queryset):
        from django.utils import timezone
        from datetime import timedelta
        
        approved_count = 0
        for payment_request in queryset.filter(status='pending'):
            try:
                # Créer l'abonnement
                end_date = timezone.now() + timedelta(days=30 * payment_request.duration_months)
                subscription = TechnicianSubscription.objects.create(
                    technician=payment_request.technician,
                    plan_name=f"Plan {payment_request.duration_months} mois",
                    start_date=timezone.now(),
                    end_date=end_date,
                    is_active=True
                )
                
                # Mettre à jour la demande
                payment_request.status = 'approved'
                payment_request.validated_by = request.user
                payment_request.validated_at = timezone.now()
                payment_request.subscription = subscription
                payment_request.save()
                
                approved_count += 1
            except Exception as e:
                self.message_user(request, f"Erreur lors de l'approbation: {e}", level='ERROR')
        
        self.message_user(request, f"{approved_count} demande(s) approuvée(s).")
    approve_requests.short_description = "Approuver les demandes sélectionnées"
    
    def reject_requests(self, request, queryset):
        updated = queryset.filter(status='pending').update(
            status='rejected',
            validated_by=request.user,
            validated_at=timezone.now()
        )
        self.message_user(request, f"{updated} demande(s) rejetée(s).")
    reject_requests.short_description = "Rejeter les demandes sélectionnées"
    
    def cancel_requests(self, request, queryset):
        updated = queryset.filter(status='pending').update(
            status='cancelled',
            validated_by=request.user,
            validated_at=timezone.now()
        )
        self.message_user(request, f"{updated} demande(s) annulée(s).")
    cancel_requests.short_description = "Annuler les demandes sélectionnées"


@admin.register(ChatConversation)
class ChatConversationAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'technician', 'is_active', 'last_message_at', 'is_pinned', 'last_activity_type']
    list_filter = ['is_active', 'is_pinned', 'last_activity_type', 'created_at']
    search_fields = ['client__user__first_name', 'client__user__last_name', 'technician__user__first_name', 'technician__user__last_name']
    readonly_fields = ['created_at', 'updated_at', 'last_message_at']
    ordering = ['-last_message_at']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('client', 'technician', 'request', 'is_active')
        }),
        ('Paramètres avancés', {
            'fields': ('is_pinned', 'muted_until', 'last_activity_type')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at', 'last_message_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ChatMessage)
class ChatMessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'sender', 'message_type', 'content_preview', 'is_read', 'created_at']
    list_filter = ['message_type', 'is_read', 'is_edited', 'created_at']
    search_fields = ['content', 'sender__first_name', 'sender__last_name']
    readonly_fields = ['created_at', 'updated_at', 'read_at', 'edited_at']
    ordering = ['-created_at']
    
    def content_preview(self, obj):
        return obj.content[:50] + '...' if len(obj.content) > 50 else obj.content
    content_preview.short_description = 'Aperçu du contenu'
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('conversation', 'sender', 'content', 'message_type')
        }),
        ('Localisation', {
            'fields': ('latitude', 'longitude'),
            'classes': ('collapse',)
        }),
        ('Message vocal', {
            'fields': ('voice_duration',),
            'classes': ('collapse',)
        }),
        ('Modification', {
            'fields': ('is_edited', 'edited_at', 'reply_to'),
            'classes': ('collapse',)
        }),
        ('Statut', {
            'fields': ('is_read', 'read_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(ChatMessageAttachment)
class ChatMessageAttachmentAdmin(admin.ModelAdmin):
    list_display = ['id', 'message', 'file_name', 'file_size', 'content_type', 'is_processed', 'created_at']
    list_filter = ['content_type', 'is_processed', 'created_at']
    search_fields = ['file_name', 'message__content']
    readonly_fields = ['created_at', 'updated_at', 'file_size', 'content_type']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('message', 'file', 'file_name')
        }),
        ('Métadonnées', {
            'fields': ('file_size', 'content_type', 'duration')
        }),
        ('Traitement', {
            'fields': ('thumbnail', 'is_processed')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CommunicationStats)
class CommunicationStatsAdmin(admin.ModelAdmin):
    list_display = ['id', 'conversation', 'total_messages', 'avg_response_time_minutes', 'last_message_at']
    list_filter = ['created_at', 'updated_at']
    search_fields = ['conversation__client__user__first_name', 'conversation__technician__user__first_name']
    readonly_fields = ['created_at', 'updated_at']
    ordering = ['-updated_at']
    
    fieldsets = (
        ('Conversation', {
            'fields': ('conversation',)
        }),
        ('Compteurs de messages', {
            'fields': ('total_messages', 'text_messages', 'voice_messages', 'location_shares', 'file_shares')
        }),
        ('Métriques de performance', {
            'fields': ('avg_response_time_minutes', 'last_message_at', 'first_message_at')
        }),
        ('Temps en ligne', {
            'fields': ('client_online_time', 'technician_online_time')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CommunicationSession)
class CommunicationSessionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'conversation', 'is_active', 'messages_sent', 'messages_received', 'started_at']
    list_filter = ['is_active', 'started_at', 'ended_at']
    search_fields = ['user__first_name', 'user__last_name']
    readonly_fields = ['created_at', 'updated_at', 'started_at']
    ordering = ['-started_at']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('conversation', 'user', 'is_active')
        }),
        ('Durée', {
            'fields': ('started_at', 'ended_at')
        }),
        ('Métriques', {
            'fields': ('messages_sent', 'messages_received')
        }),
        ('Informations techniques', {
            'fields': ('device_info', 'ip_address'),
            'classes': ('collapse',)
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CommunicationNotification)
class CommunicationNotificationAdmin(admin.ModelAdmin):
    list_display = ['id', 'recipient', 'notification_type', 'title', 'is_read', 'created_at']
    list_filter = ['notification_type', 'is_read', 'created_at']
    search_fields = ['title', 'message', 'recipient__first_name', 'recipient__last_name']
    readonly_fields = ['created_at', 'updated_at', 'read_at']
    ordering = ['-created_at']
    
    fieldsets = (
        ('Informations de base', {
            'fields': ('recipient', 'conversation', 'notification_type')
        }),
        ('Contenu', {
            'fields': ('title', 'message', 'extra_data')
        }),
        ('Statut', {
            'fields': ('is_read', 'read_at')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )


@admin.register(CommunicationSettings)
class CommunicationSettingsAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'auto_read_receipts', 'typing_indicators', 'sound_notifications', 'language']
    list_filter = ['auto_read_receipts', 'typing_indicators', 'sound_notifications', 'language', 'theme']
    search_fields = ['user__first_name', 'user__last_name', 'user__email']
    readonly_fields = ['created_at', 'updated_at']
    
    fieldsets = (
        ('Utilisateur', {
            'fields': ('user',)
        }),
        ('Paramètres de notification', {
            'fields': ('auto_read_receipts', 'typing_indicators', 'sound_notifications', 'vibration_notifications', 'message_preview')
        }),
        ('Paramètres de médias', {
            'fields': ('auto_download_media', 'max_file_size_mb', 'allowed_file_types')
        }),
        ('Heures silencieuses', {
            'fields': ('quiet_hours_start', 'quiet_hours_end'),
            'classes': ('collapse',)
        }),
        ('Paramètres d\'interface', {
            'fields': ('language', 'theme')
        }),
        ('Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )