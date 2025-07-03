from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import TokenError
from django.contrib.auth import get_user_model
from .serializers import UserSerializer, UserRegistrationSerializer
from rest_framework.permissions import IsAuthenticated, AllowAny
from depannage.models import Client, Technician

User = get_user_model()

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
        
        if not email or not password:
            return Response({
                'error': 'Données manquantes',
                'details': {
                    'email': 'L\'email est requis' if not email else None,
                    'password': 'Le mot de passe est requis' if not password else None
                }
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            user = User.objects.get(email=email)
            if user.check_password(password):
                refresh = RefreshToken.for_user(user)
                profile = self.get_profile_data(user)
                return Response({
                    'user': UserSerializer(user).data,
                    'profile': profile,
                    'refresh': str(refresh),
                    'access': str(refresh.access_token),
                })
            return Response({
                'error': 'Identifiants invalides',
                'details': {'password': 'Mot de passe incorrect'}
            }, status=status.HTTP_401_UNAUTHORIZED)
        except User.DoesNotExist:
            return Response({
                'error': 'Identifiants invalides',
                'details': {'email': 'Aucun compte associé à cet email'}
            }, status=status.HTTP_404_NOT_FOUND)

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
