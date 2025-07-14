from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientViewSet,
    TechnicianViewSet,
    RepairRequestViewSet,
    RequestDocumentViewSet,
    ReviewViewSet,
    # PaymentViewSet,  # Supprimé - plus de paiements
    ConversationViewSet,
    MessageViewSet,
    MessageAttachmentViewSet,
    NotificationViewSet,
    TechnicianLocationViewSet,
    SystemConfigurationViewSet,
    # CinetPayViewSet,  # Supprimé - plus de paiements CinetPay
    PublicTestViewSet,
    TechnicianNearbyViewSet,
    find_nearest_technician,
    techniciens_proches,
    techniciens_proches_avances,
    # GroupDetailView,  # Supprimé - non défini
    # PlatformConfigurationViewSet,  # Supprimé - non défini
    ClientLocationViewSet,
    ReportViewSet,
    AdminNotificationViewSet,
    AuditLogListView,
    # SubscriptionRequestViewSet,  # Supprimé - plus de demandes d'abonnement
    # Nouveaux ViewSets pour le chat
    ChatConversationViewSet,
    ChatMessageViewSet,
    ChatMessageAttachmentViewSet,
    ChatGetOrCreateConversationView,
    # Nouveaux endpoints de communication
    ChatStatsView,
    SendLocationView,
    VoiceMessageView,
    CommunicationDashboardView,
    # Nouveaux endpoints
    # admin_dashboard_stats,  # Supprimé - non défini
    # admin_notifications,  # Supprimé - non défini
    # mark_all_notifications_read,  # Supprimé - non défini
    # admin_reviews,  # Supprimé - non défini
    # admin_payments,  # Supprimé - plus de paiements
    # admin_payments_stats,  # Supprimé - plus de statistiques de paiements
    # admin_security_alerts,  # Supprimé - non défini
    # admin_login_locations,  # Supprimé - non défini
    # system_configuration,  # Supprimé - non défini
    # technician_dashboard_data,  # Supprimé - non défini
    # admin_security_stats,  # Supprimé - non défini
    # admin_security_trends,  # Supprimé - non défini
    # CinetPayNotificationAPIView,  # Supprimé - plus de notifications CinetPay
    # export_audit_logs,  # Supprimé - non défini
    # Nouveaux ViewSets pour les statistiques
    StatisticsViewSet,
    InitiateSubscriptionPaymentView,
)
from .export_statistics import export_statistics_excel
from .export_statistics_pdf import export_statistics_pdf
from users.views import UserViewSet
from .views_support_faq import SupportRequestViewSet, FAQViewSet

router = DefaultRouter()
router.register(r"clients", ClientViewSet)
router.register(r"technicians", TechnicianViewSet)
router.register(r"repair-requests", RepairRequestViewSet, basename="repair-request")
router.register(r"documents", RequestDocumentViewSet)
router.register(r"reviews", ReviewViewSet)
# router.register(r"payments", PaymentViewSet)  # Supprimé
router.register(r"conversations", ConversationViewSet)
router.register(r"messages", MessageViewSet)
router.register(r"attachments", MessageAttachmentViewSet)
router.register(r"notifications", NotificationViewSet)
router.register(r"locations", TechnicianLocationViewSet)
router.register(r"configurations", SystemConfigurationViewSet)
# router.register(r"cinetpay", CinetPayViewSet, basename="cinetpay")  # Supprimé
router.register(r"techniciens-proches", TechnicianNearbyViewSet, basename="techniciens-proches")
# router.register(r"configuration", PlatformConfigurationViewSet, basename="configuration")  # Supprimé - non défini
router.register(r"client-locations", ClientLocationViewSet, basename="client-location")
router.register(r'reports', ReportViewSet, basename='reports')
router.register(r'admin-notifications', AdminNotificationViewSet, basename='admin-notifications')
# router.register(r'subscription-requests', SubscriptionRequestViewSet, basename='subscription-request')  # Supprimé

# Nouvelles routes pour le chat
router.register(r'chat/conversations', ChatConversationViewSet, basename='chat-conversation')
router.register(r'chat/messages', ChatMessageViewSet, basename='chat-message')
router.register(r'chat/attachments', ChatMessageAttachmentViewSet, basename='chat-attachment')

# Nouvelles routes pour les statistiques
router.register(r'statistics', StatisticsViewSet, basename='statistics')

router.register(r'support', SupportRequestViewSet, basename='supportrequest')
router.register(r'faq', FAQViewSet, basename='faq')

urlpatterns = [
    # Endpoint explicite pour get_or_create conversation (AVANT le router)
    path("api/chat/conversations/get_or_create_explicit/", ChatGetOrCreateConversationView.as_view(), name="chat-get-or-create-conversation-explicit"),
    
    # Nouveaux endpoints de communication
    path("api/chat/stats/", ChatStatsView.as_view(), name="chat-stats"),
    path("api/chat/messages/send_location/", SendLocationView.as_view(), name="send-location"),
    path("api/chat/messages/send_voice/", VoiceMessageView.as_view(), name="send-voice"),
    path("api/chat/dashboard/", CommunicationDashboardView.as_view(), name="communication-dashboard"),
    
    # Endpoint de notification CinetPay supprimé - plus de paiements
    
    path("api/", include(router.urls)),
    
    # Endpoints publics de test
    path("api/test/", include([
        path("health_check/", PublicTestViewSet.as_view({"get": "health_check"})),
        path("api_info/", PublicTestViewSet.as_view({"get": "api_info"})),
    ])),
    
    # Endpoints d'export
    path("api/export_statistics_excel/", export_statistics_excel, name="export_statistics_excel"),
    path("api/export_statistics_pdf/", export_statistics_pdf, name="export_statistics_pdf"),
    
    # Endpoints de géolocalisation
    path("api/find_nearest_technician/", find_nearest_technician, name="find_nearest_technician"),
    path("api/techniciens-proches/", techniciens_proches, name="techniciens_proches"),
    path("api/techniciens-proches-avances/", techniciens_proches_avances, name="techniciens_proches_avances"),
    
    # Endpoints de permissions et groupes
    # path("api/permissions/", list_permissions, name="list_permissions"),  # Supprimé - non défini
    # path("api/groups/", GroupListCreateView.as_view(), name="group_list_create"),  # Supprimé - non défini
    # path("api/groups/<int:pk>/", GroupDetailView.as_view(), name="group_detail"),  # Supprimé - non défini
    
    # Endpoints manquants pour corriger les erreurs 404
    path("api/dashboard/stats/", RepairRequestViewSet.as_view({"get": "dashboard_stats"}), name="dashboard_stats"),
    path("api/repair-requests/dashboard_stats/", RepairRequestViewSet.as_view({"get": "dashboard_stats"}), name="repair_requests_dashboard_stats"),
    path("api/technician-subscriptions/<int:pk>/", TechnicianViewSet.as_view({"get": "subscription_status"}), name="technician_subscription_detail"),
    
    # Nouveaux endpoints manquants
    # path("api/admin/dashboard/stats/", admin_dashboard_stats, name="admin_dashboard_stats"),  # Supprimé - non défini
    # path("api/admin/notifications/", admin_notifications, name="admin_notifications"),  # Supprimé - non défini
    # path("api/admin/notifications/mark-all-read/", mark_all_notifications_read, name="mark_all_notifications_read"),  # Supprimé - non défini
    # path("api/admin/reviews/", admin_reviews, name="admin_reviews"),  # Supprimé - non défini
    # path("api/admin/security/alerts/recent/", admin_security_alerts, name="admin_security_alerts"),  # Supprimé - non défini
    # path("api/admin/security/login-locations/", admin_login_locations, name="admin_login_locations"),  # Supprimé - non défini
    # path("api/admin/audit-logs/", AuditLogListView.as_view(), name="admin_audit_logs"),  # Supprimé - non défini
    # path("api/admin/audit-logs/export/", export_audit_logs, name="admin_audit_logs_export"),  # Supprimé - non défini
    # path("api/configuration/", system_configuration, name="system_configuration"),  # Supprimé - non défini
    # path("api/technicians/dashboard/", technician_dashboard_data, name="technician_dashboard_data"),  # Supprimé - non défini
    # path("api/admin/security/stats/", admin_security_stats, name="admin_security_stats"),  # Supprimé - non défini
    # path("api/admin/security/trends/", admin_security_trends, name="admin_security_trends"),  # Supprimé - non défini
    
    # Endpoints pour les rapports
    path("api/reports/export/", ReportViewSet.as_view({"get": "export"}), name="reports_export"),
    
    # Endpoints pour les paiements supprimés
    # path("api/payments/export/", PaymentViewSet.as_view({"get": "export"}), name="payments_export"),  # Supprimé
    # path("api/payments/stats/", PaymentViewSet.as_view({"get": "stats"}), name="payments_stats"),  # Supprimé
    
    # Endpoints pour les avis
    path("api/reviews/export/", ReviewViewSet.as_view({"get": "export"}), name="reviews_export"),
    
    # Endpoints pour les utilisateurs
    path("api/users/export/", include("users.urls")),
    path("api/users/admin/login-locations/", include("users.urls")),
    
    # Endpoints pour les demandes d'abonnement supprimés
    # path("api/subscription-requests/<int:pk>/validate/", SubscriptionRequestViewSet.as_view({"post": "validate_payment"}), name="subscription_request_validate"),  # Supprimé
    
    # Endpoints pour les demandes d'abonnement (actions personnalisées) supprimés
    # path("api/subscription-requests/recent_requests/", SubscriptionRequestViewSet.as_view({"get": "recent_requests"}), name="subscription_requests_recent"),  # Supprimé
    # path("api/subscription-requests/technician_payments/", SubscriptionRequestViewSet.as_view({"get": "technician_payments"}), name="subscription_requests_technician_payments"),  # Supprimé
    # path("api/subscription-requests/dashboard_stats/", SubscriptionRequestViewSet.as_view({"get": "dashboard_stats"}), name="subscription_requests_dashboard_stats"),  # Supprimé

    # Endpoint d'initiation du paiement d'abonnement Cinetpay
    path("api/cinetpay/initiate_subscription_payment/", InitiateSubscriptionPaymentView.as_view(), name="initiate_subscription_payment"),
    # Alias pour l'inscription utilisateur (register)
    path("api/auth/register/", UserViewSet.as_view({"post": "register"}), name="depannage_register"),

    # Endpoint de test général
    path("api/test/", PublicTestViewSet.as_view({"get": "health_check"}), name="test_api_info")
]
