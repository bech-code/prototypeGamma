from rest_framework import serializers
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from depannage.models import Client, Technician
from .models import PieceJointe
from django.utils import timezone

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'user_type', 'is_verified', 'created_at', 'updated_at', 'is_superuser', 'first_name', 'last_name')
        read_only_fields = ('id', 'created_at', 'updated_at', 'is_superuser')

class UserRegistrationSerializer(serializers.ModelSerializer):
    password = serializers.CharField(
        write_only=True,
        required=True,
        validators=[validate_password],
        error_messages={
            'required': 'Le mot de passe est requis',
            'blank': 'Le mot de passe ne peut pas être vide'
        }
    )
    password2 = serializers.CharField(
        write_only=True,
        required=True,
        error_messages={
            'required': 'La confirmation du mot de passe est requise',
            'blank': 'La confirmation du mot de passe ne peut pas être vide'
        }
    )
    address = serializers.CharField(required=False, allow_blank=True)
    first_name = serializers.CharField(required=True, allow_blank=False)
    last_name = serializers.CharField(required=True, allow_blank=False)
    # Champs spécifiques pour technicien
    specialty = serializers.CharField(required=False, allow_blank=True)
    years_experience = serializers.IntegerField(required=False, allow_null=True)
    phone = serializers.CharField(required=False, allow_blank=True)
    # Champs pour upload de pièces justificatives (uniquement pour technicien)
    piece_identite = serializers.FileField(write_only=True, required=False)
    certificat_residence = serializers.FileField(write_only=True, required=False)

    class Meta:
        model = User
        fields = (
            'username', 'password', 'password2', 'email', 'user_type',
            'address', 'first_name', 'last_name',
            'specialty', 'years_experience', 'phone',
            'piece_identite', 'certificat_residence'
        )
        extra_kwargs = {
            'username': {
                'required': True,
                'error_messages': {
                    'required': 'Le nom d\'utilisateur est requis',
                    'blank': 'Le nom d\'utilisateur ne peut pas être vide'
                }
            },
            'email': {
                'required': True,
                'error_messages': {
                    'required': 'L\'email est requis',
                    'blank': 'L\'email ne peut pas être vide',
                    'invalid': 'Veuillez entrer une adresse email valide'
                }
            },
            'user_type': {
                'required': True,
                'error_messages': {
                    'required': 'Le type d\'utilisateur est requis',
                    'blank': 'Le type d\'utilisateur ne peut pas être vide',
                    'invalid_choice': 'Le type d\'utilisateur doit être client ou technicien'
                }
            },
            'first_name': {
                'required': True,
                'error_messages': {
                    'required': 'Le prénom est requis',
                    'blank': 'Le prénom ne peut pas être vide'
                }
            },
            'last_name': {
                'required': True,
                'error_messages': {
                    'required': 'Le nom est requis',
                    'blank': 'Le nom ne peut pas être vide'
                }
            },
        }

    def validate(self, attrs):
        if attrs['password'] != attrs['password2']:
            raise serializers.ValidationError({"password": "Les mots de passe ne correspondent pas"})
        if len(attrs['password']) < 12:
            raise serializers.ValidationError({"password": "Le mot de passe doit contenir au moins 12 caractères"})
        if attrs['user_type'] == 'technician' and not attrs.get('specialty'):
            raise serializers.ValidationError({"specialty": "La spécialité est requise pour un technicien."})
        user_type = attrs.get('user_type')
        piece_identite = attrs.get('piece_identite')
        certificat_residence = attrs.get('certificat_residence')
        allowed_exts = ['.pdf', '.jpg', '.jpeg', '.png']
        # Pour les techniciens, les deux fichiers sont obligatoires
        if user_type == 'technician':
            if not piece_identite:
                raise serializers.ValidationError({'piece_identite': "La pièce d'identité est obligatoire pour les techniciens."})
            if not certificat_residence:
                raise serializers.ValidationError({'certificat_residence': "Le certificat de résidence est obligatoire pour les techniciens."})
            # Vérification extension
            for f, label in [(piece_identite, 'pièce d\'identité'), (certificat_residence, 'certificat de résidence')]:
                if f:
                    ext = f.name.lower().rsplit('.', 1)[-1]
                    if f'.{ext}' not in allowed_exts:
                        raise serializers.ValidationError({
                            'piece_identite' if f == piece_identite else 'certificat_residence': f"Le fichier {label} doit être au format PDF, JPG ou PNG."
                        })
        return attrs

    def create(self, validated_data):
        # Extraire les champs du profil technicien
        piece_identite = validated_data.pop('piece_identite', None)
        if isinstance(piece_identite, list):
            piece_identite = piece_identite[0] if piece_identite else None
        certificat_residence = validated_data.pop('certificat_residence', None)
        if isinstance(certificat_residence, list):
            certificat_residence = certificat_residence[0] if certificat_residence else None
        specialty = validated_data.pop('specialty', None)
        years_experience = validated_data.pop('years_experience', 0)
        phone = validated_data.pop('phone', '')
        address = validated_data.pop('address', '')
        user_type = validated_data.get('user_type')
        password = validated_data.pop('password', None)
        validated_data.pop('password2', None)

        # Créer l'utilisateur
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()

        # Création du profil lié
        if user_type == 'client':
            Client.objects.create(user=user, address=address, phone=phone)
        elif user_type == 'technician':
            from .models import TechnicianProfile, PieceJointe
            from depannage.models import Technician as DepannageTechnician
            # 1. Profil technicien dédié
            TechnicianProfile.objects.create(
                user=user,
                piece_identite=piece_identite,
                certificat_residence=certificat_residence,
                specialty=specialty,
                years_experience=years_experience,
                phone=phone,
                address=address
            )
            # 2. Technicien (depannage)
            DepannageTechnician.objects.create(
                user=user,
                specialty=specialty,
                years_experience=years_experience,
                phone=phone
            )
            # 3. Pièces jointes
            PieceJointe.objects.create(
                user=user,
                type_piece='carte_identite',
                fichier=piece_identite
            )
            PieceJointe.objects.create(
                user=user,
                type_piece='certificat_residence',
                fichier=certificat_residence
            )
        return user
    
