from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ClientViewSet,
    TechnicianViewSet,
    RepairRequestViewSet,
    RequestDocumentViewSet,
    ReviewViewSet,
    PaymentViewSet,
    ConversationViewSet,
    MessageViewSet,
    MessageAttachmentViewSet,
    NotificationViewSet,
    TechnicianLocationViewSet,
    SystemConfigurationViewSet,
    CinetPayViewSet,
    PublicTestViewSet,
    TechnicianNearbyViewSet,
    find_nearest_technician,
    list_permissions,
    GroupListCreateView,
    GroupDetailView,
    PlatformConfigurationViewSet,
    ClientLocationViewSet,
    ReportViewSet,
    AdminNotificationViewSet,
    AuditLogListView,
    SubscriptionRequestViewSet,
    # Nouveaux endpoints
    admin_dashboard_stats,
    admin_notifications,
    mark_all_notifications_read,
    admin_reviews,
    admin_payments,
    admin_payments_stats,
    admin_security_alerts,
    admin_login_locations,
    system_configuration,
    technician_dashboard_data,
    admin_security_stats,
    admin_security_trends,
)
from .export_statistics import export_statistics_excel
from .export_statistics_pdf import export_statistics_pdf

router = DefaultRouter()
router.register(r"clients", ClientViewSet)
router.register(r"technicians", TechnicianViewSet)
router.register(r"repair-requests", RepairRequestViewSet, basename="repair-request")
router.register(r"documents", RequestDocumentViewSet)
router.register(r"reviews", ReviewViewSet)
router.register(r"payments", PaymentViewSet)
router.register(r"conversations", ConversationViewSet)
router.register(r"messages", MessageViewSet)
router.register(r"attachments", MessageAttachmentViewSet)
router.register(r"notifications", NotificationViewSet)
router.register(r"locations", TechnicianLocationViewSet)
router.register(r"configurations", SystemConfigurationViewSet)
router.register(r"cinetpay", CinetPayViewSet, basename="cinetpay")
router.register(r"techniciens-proches", TechnicianNearbyViewSet, basename="techniciens-proches")
router.register(r"configuration", PlatformConfigurationViewSet, basename="configuration")
router.register(r"client-locations", ClientLocationViewSet, basename="client-location")
router.register(r'reports', ReportViewSet, basename='reports')
router.register(r'admin-notifications', AdminNotificationViewSet, basename='admin-notifications')
router.register(r'subscription-requests', SubscriptionRequestViewSet, basename='subscription-request')

urlpatterns = [
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
    
    # Endpoints de permissions et groupes
    path("api/permissions/", list_permissions, name="list_permissions"),
    path("api/groups/", GroupListCreateView.as_view(), name="group_list_create"),
    path("api/groups/<int:pk>/", GroupDetailView.as_view(), name="group_detail"),
    
    # Nouveaux endpoints manquants
    path("api/admin/dashboard/stats/", admin_dashboard_stats, name="admin_dashboard_stats"),
    path("api/admin/notifications/", admin_notifications, name="admin_notifications"),
    path("api/admin/notifications/mark-all-read/", mark_all_notifications_read, name="mark_all_notifications_read"),
    path("api/admin/reviews/", admin_reviews, name="admin_reviews"),
    path("api/admin/payments/", admin_payments, name="admin_payments"),
    path("api/admin/payments/stats/", admin_payments_stats, name="admin_payments_stats"),
    path("api/admin/security/alerts/recent/", admin_security_alerts, name="admin_security_alerts"),
    path("api/admin/security/login-locations/", admin_login_locations, name="admin_login_locations"),
    path("api/admin/audit-logs/", AuditLogListView.as_view(), name="admin_audit_logs"),
    path("api/configuration/", system_configuration, name="system_configuration"),
    path("api/technicians/dashboard/", technician_dashboard_data, name="technician_dashboard_data"),
    path("api/admin/security/stats/", admin_security_stats, name="admin_security_stats"),
    path("api/admin/security/trends/", admin_security_trends, name="admin_security_trends"),
    
    # Endpoints pour les rapports
    path("api/reports/export/", ReportViewSet.as_view({"get": "export"}), name="reports_export"),
    
    # Endpoints pour les paiements
    path("api/payments/export/", PaymentViewSet.as_view({"get": "export"}), name="payments_export"),
    path("api/payments/stats/", PaymentViewSet.as_view({"get": "stats"}), name="payments_stats"),
    
    # Endpoints pour les avis
    path("api/reviews/export/", ReviewViewSet.as_view({"get": "export"}), name="reviews_export"),
    
    # Endpoints pour les utilisateurs
    path("api/users/export/", include("users.urls")),
    path("api/users/admin/login-locations/", include("users.urls")),
    
    # Endpoints pour les demandes d'abonnement
    path("api/subscription-requests/<int:pk>/validate/", SubscriptionRequestViewSet.as_view({"post": "validate_payment"}), name="subscription_request_validate"),
    
    # Endpoint de test général
    path("api/test/", PublicTestViewSet.as_view({"get": "health_check"}), name="test_api_info"),
]
