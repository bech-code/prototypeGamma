from .models import AuditLog, SecurityNotification
from django.core.mail import send_mail
from django.conf import settings

def log_event(request, event_type, status, risk_score=0, metadata=None):
    user = request.user if hasattr(request, 'user') and request.user.is_authenticated else None
    ip = request.META.get('REMOTE_ADDR')
    user_agent = request.META.get('HTTP_USER_AGENT', '')
    geo_country = getattr(request, 'geoip_country', '') or request.META.get('GEOIP_COUNTRY', '')
    geo_city = getattr(request, 'geoip_city', '') or request.META.get('GEOIP_CITY', '')
    AuditLog.objects.create(
        user=user,
        ip_address=ip,
        user_agent=user_agent,
        event_type=event_type,
        status=status,
        geo_country=geo_country,
        geo_city=geo_city,
        risk_score=risk_score,
        metadata=metadata or {}
    )

def send_security_notification(user, subject, message, html_message=None, event_type=None):
    email = user.email
    if not email:
        return
    send_mail(
        subject,
        message,
        settings.DEFAULT_FROM_EMAIL,
        [email],
        html_message=html_message,
        fail_silently=False,
    )
    # Journalisation
    SecurityNotification.objects.create(
        user=user,
        subject=subject,
        message=message,
        event_type=event_type,
    ) 