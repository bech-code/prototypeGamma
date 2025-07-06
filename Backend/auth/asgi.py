"""
ASGI config for auth project.

It exposes the ASGI callable as a module-level variable named ``application``.

For more information on this file, see
https://docs.djangoproject.com/en/5.2/howto/deployment/asgi/
"""

import os

from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.urls import path
from .jwt_auth_middleware import JWTAuthMiddleware

# Utiliser le routing centralisé
def get_websocket_urlpatterns():
    try:
        from depannage.routing import websocket_urlpatterns
        return websocket_urlpatterns
    except ImportError:
        return []

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')

application = ProtocolTypeRouter({
    "http": get_asgi_application(),
    "websocket": JWTAuthMiddleware(
        AuthMiddlewareStack(
            URLRouter(get_websocket_urlpatterns())
        )
    ),
})
