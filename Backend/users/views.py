from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
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
        if self.action in ['register', 'login']:
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
        print("Type de request:", type(request))
        print("request.data:", getattr(request, 'data', None))
        email = request.data.get('email') if hasattr(request, 'data') else None
        password = request.data.get('password') if hasattr(request, 'data') else None
        
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
            }, status=status.HTTP_400_BAD_REQUEST)
        except User.DoesNotExist:
            return Response({
                'error': 'Identifiants invalides',
                'details': {'email': 'Aucun compte associé à cet email'}
            }, status=status.HTTP_404_NOT_FOUND)

    @action(detail=False, methods=['get'])
    def me(self, request):
        user = request.user
        profile = self.get_profile_data(user)
        serializer = UserSerializer(user)
        return Response({
            'user': serializer.data,
            'profile': profile
        })
