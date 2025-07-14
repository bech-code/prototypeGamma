from django.urls import re_path

def get_websocket_urlpatterns():
    from .consumers import NotificationsConsumer, ChatConsumer, TechnicianLocationConsumer, ClientLocationConsumer, RequestTrackingConsumer
    return [
        re_path(r'^ws/notifications/$', NotificationsConsumer.as_asgi()),
        re_path(r'ws/chat/(?P<conversation_id>\d+)/$', ChatConsumer.as_asgi()),
        re_path(r'ws/technician-tracking/(?P<technician_id>\d+)/$', TechnicianLocationConsumer.as_asgi()),
        re_path(r'ws/client-tracking/(?P<client_id>\d+)/$', ClientLocationConsumer.as_asgi()),
        re_path(r'ws/request-tracking/(?P<request_id>\d+)/$', RequestTrackingConsumer.as_asgi()),
    ] 