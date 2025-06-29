from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from django.utils.html import format_html
from .models import User

@admin.register(User)
class CustomUserAdmin(UserAdmin):
    list_display = ('full_name', 'username', 'email', 'user_type', 'is_staff', 'is_active', 'date_joined')
    list_filter = ('user_type', 'is_staff', 'is_active', 'is_verified')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('-date_joined',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'email')}),
        ('Type de compte', {'fields': ('user_type',)}),
        ('Permissions', {'fields': ('is_active', 'is_staff', 'is_superuser', 'is_verified', 'groups', 'user_permissions')}),
        ('Dates importantes', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'first_name', 'last_name', 'email', 'password', 'password2', 'user_type'),
        }),
    )
    
    def full_name(self, obj):
        """Affiche le nom complet de l'utilisateur."""
        if obj.first_name and obj.last_name:
            return format_html('<strong>{}</strong>', f"{obj.first_name} {obj.last_name}")
        elif obj.first_name:
            return format_html('<strong>{}</strong>', obj.first_name)
        elif obj.last_name:
            return format_html('<strong>{}</strong>', obj.last_name)
        else:
            return format_html('<em>{}</em>', obj.username)
    full_name.short_description = "Nom complet"
    full_name.admin_order_field = 'first_name'
