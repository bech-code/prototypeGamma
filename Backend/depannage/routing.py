from django.urls import re_path

def get_websocket_urlpatterns():
    from .consumers import NotificationsConsumer, ChatConsumer
    return [
        re_path(r'^ws/notifications/$', NotificationsConsumer.as_asgi()),
        re_path(r'ws/chat/(?P<conversation_id>\d+)/$', ChatConsumer.as_asgi()),
    ] 