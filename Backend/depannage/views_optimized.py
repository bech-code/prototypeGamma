#!/usr/bin/env python3
"""
Vues optimisées pour DepanneTeliman
Implémente les meilleures pratiques de performance avec cache et requêtes optimisées
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.db.models import Q, Count, Avg, F
from django.core.cache import cache
import logging

# Import de nos modules d'optimisation
from .optimizations import (
    cache_response, monitor_performance, invalidate_cache_on_change,
    OptimizedViewMixin, SmartCacheManager, RealTimeStateManager,
    OptimizedPagination
)
from .database_optimizations import OptimizedQueries
from .models import Technician, RepairRequest, Client, Review, Notification
from .serializers import (
    TechnicianSerializer, RepairRequestSerializer, ClientSerializer,
    ReviewSerializer, NotificationSerializer
)

logger = logging.getLogger(__name__)


# =============================================================================
# VIEWSETS OPTIMISÉS
# =============================================================================

class OptimizedTechnicianViewSet(OptimizedViewMixin, viewsets.ModelViewSet):
    """ViewSet optimisé pour les techniciens"""
    
    serializer_class = TechnicianSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OptimizedPagination
    
    def get_queryset(self):
        """Queryset optimisé avec gestion intelligente du cache"""
        return super().get_queryset().filter(user__is_active=True)
    
    @cache_response(timeout=300, key_prefix="technicians_available")
    @monitor_performance(log_slow=1.5)
    @action(detail=False, methods=['get'])
    def available_technicians(self, request):
        """Liste des techniciens disponibles avec cache intelligent"""
        
        # Paramètres de recherche
        latitude = request.query_params.get('latitude')
        longitude = request.query_params.get('longitude')
        specialty = request.query_params.get('specialty')
        radius = float(request.query_params.get('radius', 50))
        
        # Clé de cache basée sur les paramètres
        cache_key = SmartCacheManager.cache_key(
            'available_technicians',
            latitude=latitude,
            longitude=longitude,
            specialty=specialty or 'all',
            radius=radius
        )
        
        # Vérifier le cache d'abord
        def get_technicians():
            if latitude and longitude:
                # Utiliser la requête optimisée avec géolocalisation
                queryset = OptimizedQueries.get_available_technicians_near(
                    float(latitude), float(longitude), specialty, radius
                )
            else:
                # Requête standard optimisée
                queryset = self.get_queryset().filter(
                    is_available=True,
                    is_verified=True
                )
                if specialty:
                    queryset = queryset.filter(specialty=specialty)
                
                queryset = queryset.order_by('-average_rating', '-total_reviews')
            
            # Limiter les résultats pour éviter les réponses trop lourdes
            queryset = queryset[:50]
            
            serializer = self.get_serializer(queryset, many=True)
            return serializer.data
        
        # Utiliser le cache intelligent
        data = SmartCacheManager.get_or_set(
            cache_key, 
            get_technicians,
            data_type='search_results'
        )
        
        return Response({
            'results': data,
            'count': len(data),
            'cached': True,
            'search_params': {
                'latitude': latitude,
                'longitude': longitude,
                'specialty': specialty,
                'radius': radius
            }
        })
    
    @invalidate_cache_on_change(['technician', 'available'])
    @monitor_performance()
    @action(detail=True, methods=['post'])
    def toggle_availability(self, request, pk=None):
        """Basculer la disponibilité d'un technicien"""
        technician = self.get_object()
        
        # Vérifier les permissions
        if request.user != technician.user:
            return Response(
                {'error': 'Permission refusée'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Basculer la disponibilité
        technician.is_available = not technician.is_available
        technician.save(update_fields=['is_available'])
        
        # Mettre à jour le cache en temps réel
        RealTimeStateManager.update_technician_availability(
            technician.id, technician.is_available
        )
        
        return Response({
            'is_available': technician.is_available,
            'message': f'Disponibilité mise à jour: {"Disponible" if technician.is_available else "Indisponible"}'
        })
    
    @cache_response(timeout=600, key_prefix="technician_dashboard")
    @monitor_performance(log_slow=2.0)
    @action(detail=True, methods=['get'])
    def dashboard_data(self, request, pk=None):
        """Données du dashboard technicien optimisées"""
        technician = self.get_object()
        
        # Vérifier les permissions
        if request.user != technician.user:
            return Response(
                {'error': 'Permission refusée'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Utiliser la requête optimisée
        def get_dashboard_data():
            data = OptimizedQueries.get_technician_dashboard_data(technician.id)
            
            return {
                'technician': TechnicianSerializer(data).data,
                'stats': {
                    'pending_requests': data.pending_requests_count,
                    'in_progress': data.in_progress_count,
                    'completed_today': data.completed_today_count,
                    'recent_rating': data.recent_rating,
                },
                'availability_status': RealTimeStateManager.get_cached_technician_availability(
                    technician.id
                ) or technician.is_available
            }
        
        cache_key = SmartCacheManager.cache_key('technician_dashboard', technician.id)
        data = SmartCacheManager.get_or_set(
            cache_key,
            get_dashboard_data,
            data_type='user_data'
        )
        
        return Response(data)


class OptimizedRepairRequestViewSet(OptimizedViewMixin, viewsets.ModelViewSet):
    """ViewSet optimisé pour les demandes de réparation"""
    
    serializer_class = RepairRequestSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OptimizedPagination
    
    @cache_response(timeout=120, key_prefix="repair_requests")
    @monitor_performance(log_slow=2.0)
    def list(self, request, *args, **kwargs):
        """Liste optimisée des demandes"""
        return super().list(request, *args, **kwargs)
    
    @invalidate_cache_on_change(['repair_request', 'dashboard'])
    @monitor_performance()
    def create(self, request, *args, **kwargs):
        """Création optimisée d'une demande"""
        response = super().create(request, *args, **kwargs)
        
        # Invalider les caches liés
        if response.status_code == 201:
            # Invalider le cache des techniciens disponibles
            cache.delete_many(cache.keys("*available_technicians*"))
            
        return response
    
    @action(detail=False, methods=['get'])
    @cache_response(timeout=300, key_prefix="dashboard_stats")
    @monitor_performance()
    def dashboard_stats(self, request):
        """Statistiques optimisées pour le dashboard"""
        
        def get_stats():
            user = request.user
            
            if hasattr(user, 'client_profile'):
                # Stats client
                client_data = OptimizedQueries.get_client_dashboard_data(user.client_profile.id)
                return {
                    'user_type': 'client',
                    'active_requests': client_data.active_requests_count,
                    'completed_requests': client_data.completed_requests_count,
                    'total_spent': client_data.total_spent or 0,
                }
            
            elif hasattr(user, 'technician_depannage'):
                # Stats technicien
                tech_data = OptimizedQueries.get_technician_dashboard_data(user.technician_depannage.id)
                return {
                    'user_type': 'technician',
                    'pending_requests': tech_data.pending_requests_count,
                    'in_progress': tech_data.in_progress_count,
                    'completed_today': tech_data.completed_today_count,
                    'recent_rating': tech_data.recent_rating,
                }
            
            else:
                # Stats générales
                return OptimizedQueries.get_request_statistics()
        
        cache_key = SmartCacheManager.cache_key('dashboard_stats', request.user.id)
        data = SmartCacheManager.get_or_set(
            cache_key,
            get_stats,
            data_type='stats'
        )
        
        return Response(data)
    
    @action(detail=False, methods=['get'])
    @cache_response(timeout=600, key_prefix="nearby_requests")
    @monitor_performance()
    def nearby_requests(self, request):
        """Demandes à proximité pour les techniciens"""
        
        # Vérifier que l'utilisateur est un technicien
        if not hasattr(request.user, 'technician_depannage'):
            return Response(
                {'error': 'Seuls les techniciens peuvent voir les demandes à proximité'}, 
                status=status.HTTP_403_FORBIDDEN
            )
        
        technician = request.user.technician_depannage
        
        if not technician.current_latitude or not technician.current_longitude:
            return Response({
                'results': [],
                'message': 'Localisation du technicien non disponible'
            })
        
        # Utiliser la requête optimisée
        radius = float(request.query_params.get('radius', 25))
        
        def get_nearby_requests():
            # Filtrer les demandes dans un rayon
            lat_delta = radius / 111.0
            lng_delta = radius / (111.0 * abs(float(technician.current_latitude)) * 0.017453292519943295)
            
            queryset = self.get_queryset().filter(
                status='pending',
                specialty_needed=technician.specialty,
                latitude__range=(technician.current_latitude - lat_delta, technician.current_latitude + lat_delta),
                longitude__range=(technician.current_longitude - lng_delta, technician.current_longitude + lng_delta),
            ).order_by('-priority', '-created_at')[:20]
            
            serializer = self.get_serializer(queryset, many=True)
            return serializer.data
        
        cache_key = SmartCacheManager.cache_key(
            'nearby_requests', 
            technician.id, 
            radius=radius
        )
        data = SmartCacheManager.get_or_set(
            cache_key,
            get_nearby_requests,
            data_type='real_time'
        )
        
        return Response({
            'results': data,
            'technician_location': {
                'latitude': technician.current_latitude,
                'longitude': technician.current_longitude,
            },
            'search_radius': radius
        })


class OptimizedReviewViewSet(OptimizedViewMixin, viewsets.ModelViewSet):
    """ViewSet optimisé pour les avis"""
    
    serializer_class = ReviewSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OptimizedPagination
    
    @cache_response(timeout=600, key_prefix="reviews_by_technician")
    @monitor_performance()
    @action(detail=False, methods=['get'])
    def by_technician(self, request):
        """Avis par technicien avec cache"""
        technician_id = request.query_params.get('technician_id')
        
        if not technician_id:
            return Response(
                {'error': 'technician_id requis'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        def get_reviews():
            queryset = self.get_queryset().filter(
                technician_id=technician_id,
                is_visible=True
            ).order_by('-created_at')[:50]
            
            serializer = self.get_serializer(queryset, many=True)
            
            # Calculer les statistiques
            stats = queryset.aggregate(
                avg_rating=Avg('rating'),
                total_reviews=Count('id'),
                rating_5=Count('id', filter=Q(rating=5)),
                rating_4=Count('id', filter=Q(rating=4)),
                rating_3=Count('id', filter=Q(rating=3)),
                rating_2=Count('id', filter=Q(rating=2)),
                rating_1=Count('id', filter=Q(rating=1)),
            )
            
            return {
                'reviews': serializer.data,
                'stats': stats
            }
        
        cache_key = SmartCacheManager.cache_key('reviews_by_technician', technician_id)
        data = SmartCacheManager.get_or_set(
            cache_key,
            get_reviews,
            data_type='user_data'
        )
        
        return Response(data)
    
    @invalidate_cache_on_change(['review', 'technician'])
    @monitor_performance()
    def create(self, request, *args, **kwargs):
        """Création d'avis avec invalidation de cache"""
        response = super().create(request, *args, **kwargs)
        
        if response.status_code == 201:
            # Mettre à jour les notes des techniciens en arrière-plan
            from .database_optimizations import DatabaseMaintenance
            try:
                DatabaseMaintenance.update_technician_ratings()
            except Exception as e:
                logger.error(f"Erreur mise à jour ratings: {e}")
        
        return response


class OptimizedNotificationViewSet(OptimizedViewMixin, viewsets.ModelViewSet):
    """ViewSet optimisé pour les notifications"""
    
    serializer_class = NotificationSerializer
    permission_classes = [IsAuthenticated]
    pagination_class = OptimizedPagination
    
    def get_queryset(self):
        """Queryset filtré par utilisateur"""
        return super().get_queryset().filter(user=self.request.user)
    
    @cache_response(timeout=60, key_prefix="user_notifications")
    @monitor_performance()
    def list(self, request, *args, **kwargs):
        """Liste des notifications avec cache court"""
        return super().list(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    @cache_response(timeout=30, key_prefix="unread_notifications")
    def unread_count(self, request):
        """Nombre de notifications non lues"""
        
        def get_unread_count():
            return self.get_queryset().filter(is_read=False).count()
        
        cache_key = SmartCacheManager.cache_key('unread_notifications', request.user.id)
        count = SmartCacheManager.get_or_set(
            cache_key,
            get_unread_count,
            data_type='real_time'
        )
        
        return Response({'unread_count': count})
    
    @action(detail=False, methods=['post'])
    @invalidate_cache_on_change(['notification'])
    def mark_all_read(self, request):
        """Marquer toutes les notifications comme lues"""
        updated = self.get_queryset().filter(is_read=False).update(is_read=True)
        
        return Response({
            'message': f'{updated} notifications marquées comme lues',
            'updated_count': updated
        })


# =============================================================================
# VUES SPÉCIALISÉES OPTIMISÉES
# =============================================================================

from rest_framework.views import APIView

class OptimizedSearchView(APIView):
    """Vue de recherche globale optimisée"""
    
    permission_classes = [IsAuthenticated]
    
    @cache_response(timeout=300, key_prefix="global_search")
    @monitor_performance(log_slow=2.0)
    def get(self, request):
        """Recherche globale optimisée"""
        query = request.query_params.get('q', '').strip()
        search_type = request.query_params.get('type', 'all')  # all, technicians, requests
        
        if len(query) < 2:
            return Response({
                'error': 'La recherche doit contenir au moins 2 caractères'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        def perform_search():
            results = {}
            
            if search_type in ['all', 'technicians']:
                # Recherche de techniciens
                technicians = Technician.objects.filter(
                    Q(user__first_name__icontains=query) |
                    Q(user__last_name__icontains=query) |
                    Q(specialty__icontains=query),
                    is_verified=True,
                    user__is_active=True
                ).select_related('user')[:10]
                
                results['technicians'] = TechnicianSerializer(technicians, many=True).data
            
            if search_type in ['all', 'requests'] and hasattr(request.user, 'client_profile'):
                # Recherche de demandes (pour les clients seulement)
                requests = RepairRequest.objects.filter(
                    Q(description__icontains=query) |
                    Q(specialty_needed__icontains=query),
                    client=request.user.client_profile
                ).select_related('technician', 'client')[:10]
                
                results['requests'] = RepairRequestSerializer(requests, many=True).data
            
            return results
        
        cache_key = SmartCacheManager.cache_key(
            'global_search',
            request.user.id,
            query=query,
            type=search_type
        )
        
        data = SmartCacheManager.get_or_set(
            cache_key,
            perform_search,
            data_type='search_results'
        )
        
        return Response({
            'query': query,
            'search_type': search_type,
            'results': data
        })


class TrendingTechniciansView(APIView):
    """Vue pour les techniciens tendance"""
    
    permission_classes = [AllowAny]
    
    @cache_response(timeout=1800, key_prefix="trending_technicians")  # 30 minutes
    @monitor_performance()
    def get(self, request):
        """Techniciens tendance avec cache long"""
        
        limit = min(int(request.query_params.get('limit', 10)), 50)
        
        def get_trending():
            technicians = OptimizedQueries.get_trending_technicians(limit)
            return TechnicianSerializer(technicians, many=True).data
        
        cache_key = SmartCacheManager.cache_key('trending_technicians', limit=limit)
        data = SmartCacheManager.get_or_set(
            cache_key,
            get_trending,
            data_type='static_data'
        )
        
        return Response({
            'trending_technicians': data,
            'count': len(data),
            'cache_duration': '30 minutes'
        })