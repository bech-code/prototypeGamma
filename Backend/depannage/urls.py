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

# Routes de test publiques
router.register(r"test", PublicTestViewSet, basename="test")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/find-technician/", find_nearest_technician, name="find-technician"),
    path('api/permissions/', list_permissions, name='api-permissions'),
    path('api/groups/', GroupListCreateView.as_view(), name='api-groups'),
    path('api/groups/<int:pk>/', GroupDetailView.as_view(), name='api-group-detail'),
    path('api/export_statistics_excel/', export_statistics_excel, name='export-statistics-excel'),
    path('api/export_statistics_pdf/', export_statistics_pdf, name='export-statistics-pdf'),
]
