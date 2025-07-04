from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import UserViewSet, SecurityDashboardView, SecurityNotificationsView, LoginLocationsView

router = DefaultRouter()
router.register(r'', UserViewSet, basename='user')

urlpatterns = [
    path('', include(router.urls)),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('admin/security-dashboard/', SecurityDashboardView.as_view(), name='security-dashboard'),
    path('admin/security-notifications/', SecurityNotificationsView.as_view(), name='security-notifications'),
    path('admin/login-locations/', LoginLocationsView.as_view(), name='login-locations'),
]
