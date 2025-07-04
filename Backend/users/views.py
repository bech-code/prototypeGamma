from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserRegistrationSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from depannage.models import Client, Technician
from .utils import log_event, send_security_notification
from .models import OTPChallenge, AuditLog, SecurityNotification
from django.utils import timezone
from django.core.mail import send_mail
import random
from django.db.models import Count
from rest_framework.views import APIView

User = get_user_model()

WEST_AFRICA_COUNTRIES = [
    'Mali', 'Sénégal', "Côte d'Ivoire", 'Burkina Faso', 'Niger', 'Guinée', 'Bénin', 'Togo', 'Ghana', 'Nigeria', 'Sierra Leone', 'Libéria', 'Gambie', 'Cap-Vert'
]

def calculate_risk_score(request, user=None):
    score = 0
    # Pays hors Afrique de l'Ouest
    if getattr(request, 'geoip_country', None) and request.geoip_country not in WEST_AFRICA_COUNTRIES:
        score += 60
    # Heure inhabituelle
    from datetime import datetime
    hour = datetime.now().hour
    if hour < 5 or hour > 22:
        score += 20
    # User-agent inconnu (exemple simplifié)
    ua = request.META.get('HTTP_USER_AGENT', '')
    if user and hasattr(user, 'last_user_agent') and user.last_user_agent != ua:
        score += 10
    # (À compléter avec IP inconnue, tentatives échouées, etc.)
    return min(score, 100)

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['register', 'login', 'refresh_token']:
            return [AllowAny()]
        return super().get_permissions()

    def get_profile_data(self, user):
        if user.user_type == 'client':
            try:
                client = user.client_profile
                return {
                    'type': 'client',
                    'address': client.address,
                    'phone': client.phone
                }
            except Client.DoesNotExist:
                return None
        elif user.user_type == 'technician':
            try:
                technician = user.technician_profile
                return {
                    'type': 'technician',
                    'specialty': technician.specialty,
                    'phone': technician.phone,
                    'years_experience': technician.years_experience,
                    'is_verified': technician.is_verified
                }
            except Technician.DoesNotExist:
                return None
        return None

    @action(detail=False, methods=['post'])
    def register(self, request):
        serializer = UserRegistrationSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            profile = self.get_profile_data(user)
            return Response({
                'user': UserSerializer(user).data,
                'profile': profile,
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            }, status=status.HTTP_201_CREATED)
        
        # Formater les erreurs pour une meilleure lisibilité
        errors = {}
        for field, field_errors in serializer.errors.items():
            if isinstance(field_errors, list):
                errors[field] = field_errors[0]
            else:
                errors[field] = field_errors
                
        return Response({
            'error': 'Erreur de validation',
            'details': errors
        }, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def login(self, request):
        email = request.data.get('email')
        password = request.data.get('password')
        # Blocage géographique
        if getattr(request, 'geoip_country', None) and request.geoip_country not in WEST_AFRICA_COUNTRIES:
            log_event(request, 'login', 'failure', risk_score=90, metadata={'reason': "Connexion hors Afrique de l'Ouest"})
            return Response({'error': 'Connexion depuis une région non autorisée.'}, status=403)
        
        if not email or not password:
            return Response({
                'error': 'Données manquantes',
                'details': {
                    'email': "L'email est requis" if not email else None,
                    'password': 'Le mot de passe est requis' if not password else None
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            risk_score = calculate_risk_score(request, user)
            if user.check_password(password):
                if risk_score >= 80:
                    # Générer OTP
                    code = f"{random.randint(100000, 999999)}"
                    expires = timezone.now() + timezone.timedelta(minutes=10)
                    otp = OTPChallenge.objects.create(user=user, code=code, expires_at=expires)
                    # Envoi email
                    send_mail(
                        'Votre code de connexion DepanneTeliman',
                        f'Votre code de vérification est : {code}',
                        'no-reply@depanneteliman.com',
                        [user.email],
                        fail_silently=False,
                    )
                    log_event(request, 'otp_sent', 'success', risk_score=risk_score, metadata={'session_uuid': str(otp.session_uuid)})
                    if risk_score > 80 and user:
                        send_security_notification(
                            user,
                            "Alerte de sécurité : Connexion inhabituelle",
                            f"Bonjour {user.first_name},\n\nUne connexion inhabituelle a été détectée sur votre compte depuis {request.geoip_country} ({request.META.get('REMOTE_ADDR', 'IP inconnue')}). Si ce n'est pas vous, changez votre mot de passe immédiatement.",
                            event_type="login_high_risk"
                        )
                    return Response({
                        'otp_required': True,
                        'session_uuid': str(otp.session_uuid),
                        'message': 'Un code de vérification a été envoyé à votre email.'
                    }, status=200)
                log_event(request, 'login', 'success', risk_score=risk_score, metadata={})
                refresh = RefreshToken.for_user(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'profile': self.get_profile_data(user),
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
            log_event(request, 'login', 'failure', risk_score=risk_score + 30, metadata={'reason': 'Mot de passe incorrect'})
            return Response({
                'error': 'Identifiants invalides',
                'details': {'password': 'Mot de passe incorrect'}
            }, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            log_event(request, 'login', 'failure', risk_score=100, metadata={'reason': 'Email inconnu'})
            return Response({
                'error': 'Identifiants invalides',
                'details': {'email': 'Aucun compte associé à cet email'}
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['post'])
    def verify_otp(self, request):
        session_uuid = request.data.get('session_uuid')
        code = request.data.get('code')
        try:
            otp = OTPChallenge.objects.get(session_uuid=session_uuid, code=code, is_used=False)
            if otp.is_expired():
                log_event(request, 'otp_verified', 'failure', risk_score=100, metadata={'reason': 'OTP expiré', 'session_uuid': session_uuid})
                return Response({'error': 'Code expiré ou déjà utilisé.'}, status=400)
            otp.is_used = True
            otp.save()
            user = otp.user
            log_event(request, 'otp_verified', 'success', risk_score=0, metadata={'session_uuid': session_uuid})
            refresh = RefreshToken.for_user(user)
            return Response({
                'user': UserSerializer(user).data,
                'profile': self.get_profile_data(user),
                'refresh': str(refresh),
                'access': str(refresh.access_token),
            })
        except OTPChallenge.DoesNotExist:
            log_event(request, 'otp_verified', 'failure', risk_score=100, metadata={'reason': 'OTP incorrect', 'session_uuid': session_uuid})
            return Response({'error': 'Code incorrect ou session invalide.'}, status=400)

    @action(detail=False, methods=['post'])
    def refresh_token(self, request):
        """Endpoint pour rafraîchir un token d'accès."""
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return Response({
                'error': 'Refresh token requis',
                'details': {'refresh': 'Le refresh token est requis'}
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            refresh = RefreshToken(refresh_token)
            return Response({
                'access': str(refresh.access_token),
                'refresh': str(refresh)
            })
        except TokenError:
            return Response({
                'error': 'Token invalide',
                'details': {'refresh': 'Le refresh token est invalide ou expiré'}
            }, status=status.HTTP_401_UNAUTHORIZED)

    @action(detail=False, methods=['get'])
    def me(self, request):
        user = request.user
        profile = self.get_profile_data(user)
        serializer = UserSerializer(user)
        user_data = serializer.data
        # Ajout de l'objet technicien ou client complet si applicable
        if user.user_type == 'technician':
            try:
                tech = Technician.objects.get(user=user)
                # On sérialise les champs utiles
                user_data['technician'] = {
                    'id': tech.id,
                    'specialty': tech.specialty,
                    'phone': tech.phone,
                    'is_verified': tech.is_verified,
                    'years_experience': tech.years_experience,
                }
            except Technician.DoesNotExist:
                user_data['technician'] = None
        elif user.user_type == 'client':
            try:
                client = Client.objects.get(user=user)
                user_data['client'] = {
                    'id': client.id,
                    'address': client.address,
                    'phone': client.phone,
                }
            except Client.DoesNotExist:
                user_data['client'] = None
        return Response({
            'user': user_data,
            'profile': profile
        })

    @action(detail=False, methods=['patch'], url_path='update_profile')
    def update_profile(self, request):
        user = request.user
        data = request.data
        updated_fields = []
        # Mise à jour des champs User
        for field in ['first_name', 'last_name']:
            if field in data:
                setattr(user, field, data[field])
                updated_fields.append(field)
        user.save(update_fields=updated_fields or None)
        # Mise à jour du numéro de téléphone dans le profil lié
        phone = data.get('phone')
        if user.user_type == 'client':
            try:
                client = user.client_profile
                if phone:
                    client.phone = phone
                    client.save(update_fields=['phone'])
            except Exception:
                return Response({'error': 'Profil client introuvable.'}, status=400)
        elif user.user_type == 'technician':
            try:
                technician = user.technician_profile
                if phone:
                    technician.phone = phone
                    technician.save(update_fields=['phone'])
            except Exception:
                return Response({'error': 'Profil technicien introuvable.'}, status=400)
        return Response({'success': True, 'user': UserSerializer(user).data, 'phone': phone})

    def dispatch(self, request, *args, **kwargs):
        # Vérification numéro de téléphone obligatoire sur toutes les requêtes protégées
        # Sauf pour les actions d'inscription, login, refresh, profil, update_profile
        exempt_actions = ['register', 'login', 'refresh_token', 'update_profile', 'me']
        action = getattr(self, 'action', None)
        if request.user.is_authenticated and action not in exempt_actions:
            user = request.user
            # Exception pour les admins et superusers
            if user.is_superuser or user.user_type == 'admin':
                return super().dispatch(request, *args, **kwargs)
            phone = None
            if hasattr(user, 'client_profile'):
                phone = getattr(user.client_profile, 'phone', None)
            elif hasattr(user, 'technician_profile'):
                phone = getattr(user.technician_profile, 'phone', None)
            if not phone:
                return Response({'error': 'Numéro de téléphone obligatoire. Veuillez compléter votre profil.'}, status=403)
        return super().dispatch(request, *args, **kwargs)

class SecurityDashboardView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        now = timezone.now()
        last_7_days = now - timezone.timedelta(days=7)
        # Statistiques globales
        total_logins = AuditLog.objects.filter(event_type='login', status='success').count()
        failed_logins = AuditLog.objects.filter(event_type='login', status='failure').count()
        otp_sent = AuditLog.objects.filter(event_type='otp_sent').count()
        high_risk_logins = AuditLog.objects.filter(event_type='login', risk_score__gte=80).count()
        alerts = SecurityNotification.objects.count()
        # Stats sur 7 jours
        logins_7d = AuditLog.objects.filter(event_type='login', status='success', timestamp__gte=last_7_days).count()
        failed_7d = AuditLog.objects.filter(event_type='login', status='failure', timestamp__gte=last_7_days).count()
        otp_7d = AuditLog.objects.filter(event_type='otp_sent', timestamp__gte=last_7_days).count()
        alerts_7d = SecurityNotification.objects.filter(sent_at__gte=last_7_days).count()
        # Top pays connexions
        top_countries = (AuditLog.objects.filter(event_type='login', status='success')
            .values('geo_country')
            .order_by('-id')
            .annotate(count=Count('id'))[:5])
        # Top utilisateurs à risque
        top_risk_users = (AuditLog.objects.filter(event_type='login', risk_score__gte=80)
            .values('user__email')
            .annotate(count=Count('id'))
            .order_by('-count')[:5])
        return Response({
            'total_logins': total_logins,
            'failed_logins': failed_logins,
            'otp_sent': otp_sent,
            'high_risk_logins': high_risk_logins,
            'alerts': alerts,
            'logins_7d': logins_7d,
            'failed_7d': failed_7d,
            'otp_7d': otp_7d,
            'alerts_7d': alerts_7d,
            'top_countries': list(top_countries),
            'top_risk_users': list(top_risk_users),
        })

class SecurityNotificationsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        limit = int(request.GET.get('limit', 10))
        notifications = SecurityNotification.objects.all().order_by('-sent_at')[:limit]
        data = []
        for notification in notifications:
            data.append({
                'id': notification.id,
                'user_email': notification.user.email if notification.user else 'Unknown',
                'notification_type': notification.notification_type,
                'message': notification.message,
                'sent_at': notification.sent_at,
                'is_read': notification.is_read,
            })
        return Response(data)

class LoginLocationsView(APIView):
    permission_classes = [IsAdminUser]

    def get(self, request):
        limit = int(request.GET.get('limit', 100))
        logins = AuditLog.objects.filter(
            event_type='login', 
            status='success',
            geo_latitude__isnull=False,
            geo_longitude__isnull=False
        ).order_by('-timestamp')[:limit]
        
        data = []
        for login in logins:
            data.append({
                'id': login.id,
                'user_email': login.user.email if login.user else 'Unknown',
                'timestamp': login.timestamp,
                'ip_address': login.ip_address,
                'geo_country': login.geo_country,
                'geo_city': login.geo_city,
                'geo_latitude': login.geo_latitude,
                'geo_longitude': login.geo_longitude,
                'risk_score': login.risk_score,
                'user_agent': login.user_agent,
            })
        return Response(data)
