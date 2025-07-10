from django.urls import path
from .views import (
    UserViewSet,
    user_me,
    update_user_profile,
    admin_users,
    export_users,
    admin_login_locations,
)

user_list = UserViewSet.as_view({
    'get': 'list',
    'post': 'register',
})
user_detail = UserViewSet.as_view({
    'get': 'retrieve',
    'put': 'update',
    'patch': 'partial_update',
    'delete': 'destroy',
})

urlpatterns = [
    # Endpoints d'authentification et profil
    path('register/', UserViewSet.as_view({'post': 'register'}), name='register'),
    path('login/', UserViewSet.as_view({'post': 'login'}), name='login'),
    path('verify_otp/', UserViewSet.as_view({'post': 'verify_otp'}), name='verify_otp'),
    path('forgot_password/', UserViewSet.as_view({'post': 'forgot_password'}), name='forgot_password'),
    path('reset_password/', UserViewSet.as_view({'post': 'reset_password'}), name='reset_password'),
    path('token/refresh/', UserViewSet.as_view({'post': 'refresh_token'}), name='refresh_token'),
    path('me/', user_me, name='user_me'),
    path('update_profile/', update_user_profile, name='update_user_profile'),
    path('admin/users/', admin_users, name='admin_users'),
    path('export/', export_users, name='export_users'),
    path('admin/login-locations/', admin_login_locations, name='admin_login_locations'),
    # ViewSet pour les utilisateurs
    path('', user_list, name='user_list'),
    path('<int:pk>/', user_detail, name='user_detail'),
]
