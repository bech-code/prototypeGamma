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
)

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

# Routes de test publiques
router.register(r"test", PublicTestViewSet, basename="test")

urlpatterns = [
    path("api/", include(router.urls)),
    path("api/find-technician/", find_nearest_technician, name="find-technician"),
]
