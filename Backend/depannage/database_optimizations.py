#!/usr/bin/env python3
"""
Module d'optimisation de base de données pour DepanneTeliman
Contient les index optimisés, requêtes améliorées et scripts de maintenance
"""

from django.db import models, connection
from django.core.management.base import BaseCommand
from django.db.models import Index, Q, F, Count, Avg, Max, Min
from typing import Dict, List, Any
import logging

logger = logging.getLogger(__name__)

# =============================================================================
# INDEX OPTIMISÉS POUR LES MODÈLES PRINCIPAUX
# =============================================================================

class OptimizedIndexes:
    """Définition des index optimisés pour améliorer les performances"""
    
    # Index pour le modèle Technician
    TECHNICIAN_INDEXES = [
        # Index composé pour la recherche par spécialité et localisation
        Index(
            fields=['specialty', 'current_latitude', 'current_longitude'],
            name='idx_tech_specialty_location'
        ),
        # Index pour la disponibilité et vérification
        Index(
            fields=['is_available', 'is_verified'],
            name='idx_tech_availability'
        ),
        # Index pour la recherche par expérience
        Index(
            fields=['experience_level', 'years_experience'],
            name='idx_tech_experience'
        ),
        # Index pour la notation moyenne (calculée)
        Index(
            fields=['average_rating'],
            name='idx_tech_rating',
            condition=Q(average_rating__isnull=False)
        ),
        # Index partiel pour les techniciens actifs uniquement
        Index(
            fields=['created_at'],
            name='idx_tech_active_created',
            condition=Q(user__is_active=True)
        ),
    ]
    
    # Index pour le modèle RepairRequest
    REPAIR_REQUEST_INDEXES = [
        # Index composé pour dashboard client
        Index(
            fields=['client', 'status', '-created_at'],
            name='idx_request_client_status'
        ),
        # Index composé pour dashboard technicien
        Index(
            fields=['technician', 'status', '-assigned_at'],
            name='idx_request_tech_status'
        ),
        # Index pour recherche géographique
        Index(
            fields=['latitude', 'longitude', 'status'],
            name='idx_request_geo_status'
        ),
        # Index pour urgence et priorité
        Index(
            fields=['urgency_level', 'priority', '-created_at'],
            name='idx_request_urgency_priority'
        ),
        # Index pour spécialité demandée
        Index(
            fields=['specialty_needed', 'status'],
            name='idx_request_specialty'
        ),
        # Index pour les demandes récentes
        Index(
            fields=['-created_at'],
            name='idx_request_recent',
            condition=Q(status__in=['pending', 'assigned', 'in_progress'])
        ),
        # Index pour les demandes à facturer
        Index(
            fields=['status', 'final_price'],
            name='idx_request_billing',
            condition=Q(status='completed', final_price__gt=0)
        ),
    ]
    
    # Index pour le modèle Review
    REVIEW_INDEXES = [
        # Index pour les avis par technicien
        Index(
            fields=['technician', '-created_at'],
            name='idx_review_technician'
        ),
        # Index pour les notes élevées
        Index(
            fields=['rating', '-created_at'],
            name='idx_review_rating'
        ),
        # Index pour les avis visibles uniquement
        Index(
            fields=['-created_at'],
            name='idx_review_visible',
            condition=Q(is_visible=True)
        ),
        # Index composé pour statistiques
        Index(
            fields=['technician', 'rating'],
            name='idx_review_tech_rating'
        ),
    ]
    
    # Index pour le modèle Notification
    NOTIFICATION_INDEXES = [
        # Index pour notifications utilisateur non lues
        Index(
            fields=['user', 'is_read', '-created_at'],
            name='idx_notif_user_unread'
        ),
        # Index pour nettoyage automatique
        Index(
            fields=['created_at'],
            name='idx_notif_cleanup',
            condition=Q(is_read=True)
        ),
        # Index pour notifications par type
        Index(
            fields=['notification_type', '-created_at'],
            name='idx_notif_type'
        ),
    ]
    
    # Index pour le modèle ChatMessage
    CHAT_MESSAGE_INDEXES = [
        # Index pour conversation et ordre
        Index(
            fields=['conversation', '-created_at'],
            name='idx_chat_msg_conversation'
        ),
        # Index pour messages non lus
        Index(
            fields=['recipient', 'is_read', '-created_at'],
            name='idx_chat_msg_unread'
        ),
        # Index pour recherche de messages
        Index(
            fields=['conversation', 'content'],
            name='idx_chat_msg_search'
        ),
    ]


# =============================================================================
# REQUÊTES OPTIMISÉES
# =============================================================================

class OptimizedQueries:
    """Collection de requêtes optimisées pour les cas d'usage fréquents"""
    
    @staticmethod
    def get_available_technicians_near(latitude: float, longitude: float, 
                                     specialty: str = None, radius_km: float = 50):
        """
        Récupère les techniciens disponibles près d'une localisation
        Utilise les index optimisés pour les performances
        """
        from .models import Technician
        
        # Calcul approximatif des coordonnées dans un rayon
        lat_delta = radius_km / 111.0  # 1 degré ≈ 111km
        lng_delta = radius_km / (111.0 * abs(float(latitude)) * 0.017453292519943295)
        
        queryset = Technician.objects.select_related('user').filter(
            is_available=True,
            is_verified=True,
            current_latitude__range=(latitude - lat_delta, latitude + lat_delta),
            current_longitude__range=(longitude - lng_delta, longitude + lng_delta),
        ).annotate(
            # Calcul de distance approximatif (pour tri initial)
            distance_approx=models.Case(
                models.When(
                    current_latitude__isnull=False,
                    current_longitude__isnull=False,
                    then=models.F('current_latitude') - latitude + 
                         models.F('current_longitude') - longitude
                ),
                default=999999,
                output_field=models.FloatField()
            )
        ).order_by('distance_approx', '-average_rating')
        
        if specialty:
            queryset = queryset.filter(specialty=specialty)
        
        return queryset
    
    @staticmethod
    def get_technician_dashboard_data(technician_id: int):
        """Récupère toutes les données nécessaires pour le dashboard technicien"""
        from .models import Technician, RepairRequest, Review
        
        # Utiliser une seule requête avec annotations
        technician = Technician.objects.select_related('user').annotate(
            pending_requests_count=Count(
                'repair_requests_assigned',
                filter=Q(repair_requests_assigned__status='pending')
            ),
            in_progress_count=Count(
                'repair_requests_assigned',
                filter=Q(repair_requests_assigned__status='in_progress')
            ),
            completed_today_count=Count(
                'repair_requests_assigned',
                filter=Q(
                    repair_requests_assigned__status='completed',
                    repair_requests_assigned__completed_at__date=models.functions.Now().date()
                )
            ),
            recent_rating=Avg(
                'reviews_received__rating',
                filter=Q(reviews_received__created_at__gte=models.functions.Now() - models.DurationField(days=30))
            )
        ).get(id=technician_id)
        
        return technician
    
    @staticmethod
    def get_client_dashboard_data(client_id: int):
        """Récupère les données optimisées pour le dashboard client"""
        from .models import Client, RepairRequest
        
        client = Client.objects.select_related('user').annotate(
            active_requests_count=Count(
                'repair_requests',
                filter=Q(repair_requests__status__in=['pending', 'assigned', 'in_progress'])
            ),
            completed_requests_count=Count(
                'repair_requests',
                filter=Q(repair_requests__status='completed')
            ),
            total_spent=models.Sum(
                'repair_requests__final_price',
                filter=Q(repair_requests__status='completed')
            )
        ).get(id=client_id)
        
        return client
    
    @staticmethod
    def get_trending_technicians(limit: int = 10):
        """Récupère les techniciens tendance basé sur les avis récents"""
        from .models import Technician
        
        return Technician.objects.select_related('user').annotate(
            recent_reviews_count=Count(
                'reviews_received',
                filter=Q(reviews_received__created_at__gte=models.functions.Now() - models.DurationField(days=7))
            ),
            recent_avg_rating=Avg(
                'reviews_received__rating',
                filter=Q(reviews_received__created_at__gte=models.functions.Now() - models.DurationField(days=30))
            )
        ).filter(
            is_available=True,
            is_verified=True,
            recent_reviews_count__gt=0
        ).order_by('-recent_avg_rating', '-recent_reviews_count')[:limit]
    
    @staticmethod
    def get_request_statistics(date_from=None, date_to=None):
        """Statistiques optimisées des demandes de réparation"""
        from .models import RepairRequest
        
        queryset = RepairRequest.objects.all()
        
        if date_from:
            queryset = queryset.filter(created_at__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__lte=date_to)
        
        return queryset.aggregate(
            total_requests=Count('id'),
            completed_requests=Count('id', filter=Q(status='completed')),
            pending_requests=Count('id', filter=Q(status='pending')),
            in_progress_requests=Count('id', filter=Q(status='in_progress')),
            total_revenue=models.Sum('final_price', filter=Q(status='completed')),
            avg_completion_time=Avg(
                models.F('completed_at') - models.F('created_at'),
                filter=Q(status='completed', completed_at__isnull=False)
            ),
            avg_rating=Avg('review__rating'),
        )


# =============================================================================
# SCRIPTS DE MAINTENANCE DE BASE DE DONNÉES
# =============================================================================

class DatabaseMaintenance:
    """Scripts de maintenance pour optimiser la base de données"""
    
    @staticmethod
    def update_technician_ratings():
        """Met à jour les notes moyennes des techniciens"""
        from .models import Technician
        
        sql = """
        UPDATE depannage_technician 
        SET average_rating = (
            SELECT AVG(rating) 
            FROM depannage_review 
            WHERE technician_id = depannage_technician.id
            AND is_visible = true
        ),
        total_reviews = (
            SELECT COUNT(*) 
            FROM depannage_review 
            WHERE technician_id = depannage_technician.id
            AND is_visible = true
        )
        WHERE id IN (
            SELECT DISTINCT technician_id 
            FROM depannage_review 
            WHERE is_visible = true
        );
        """
        
        with connection.cursor() as cursor:
            cursor.execute(sql)
            affected_rows = cursor.rowcount
        
        logger.info(f"Mis à jour les notes de {affected_rows} techniciens")
        return affected_rows
    
    @staticmethod
    def cleanup_old_notifications(days_old: int = 30):
        """Supprime les anciennes notifications lues"""
        from .models import Notification
        from django.utils import timezone
        
        cutoff_date = timezone.now() - timezone.timedelta(days=days_old)
        
        deleted_count = Notification.objects.filter(
            is_read=True,
            created_at__lt=cutoff_date
        ).delete()[0]
        
        logger.info(f"Supprimé {deleted_count} anciennes notifications")
        return deleted_count
    
    @staticmethod
    def cleanup_old_chat_messages(days_old: int = 90):
        """Archive les anciens messages de chat"""
        from .models import ChatMessage
        from django.utils import timezone
        
        cutoff_date = timezone.now() - timezone.timedelta(days=days_old)
        
        # Au lieu de supprimer, on peut marquer comme archivé
        archived_count = ChatMessage.objects.filter(
            created_at__lt=cutoff_date
        ).update(is_archived=True)
        
        logger.info(f"Archivé {archived_count} anciens messages")
        return archived_count
    
    @staticmethod
    def analyze_table_sizes():
        """Analyse la taille des tables pour identifier les problèmes de performance"""
        tables_info = []
        
        with connection.cursor() as cursor:
            # Pour SQLite
            if 'sqlite' in connection.vendor:
                cursor.execute("""
                    SELECT name, 
                           (SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=m.name) as row_count
                    FROM sqlite_master m 
                    WHERE type='table' 
                    AND name NOT LIKE 'sqlite_%'
                    ORDER BY name;
                """)
            else:
                # Pour PostgreSQL/MySQL
                cursor.execute("""
                    SELECT table_name, table_rows, data_length, index_length
                    FROM information_schema.tables 
                    WHERE table_schema = DATABASE()
                    ORDER BY data_length DESC;
                """)
            
            tables_info = cursor.fetchall()
        
        return tables_info
    
    @staticmethod
    def optimize_database():
        """Exécute une série d'optimisations sur la base de données"""
        logger.info("Début de l'optimisation de la base de données")
        
        # Mettre à jour les statistiques
        DatabaseMaintenance.update_technician_ratings()
        
        # Nettoyer les données anciennes
        DatabaseMaintenance.cleanup_old_notifications()
        DatabaseMaintenance.cleanup_old_chat_messages()
        
        # Analyser les tailles de tables
        table_info = DatabaseMaintenance.analyze_table_sizes()
        logger.info(f"Analysé {len(table_info)} tables")
        
        # Pour PostgreSQL, mettre à jour les statistiques
        if 'postgresql' in connection.vendor:
            with connection.cursor() as cursor:
                cursor.execute("ANALYZE;")
                logger.info("Statistiques PostgreSQL mises à jour")
        
        logger.info("Optimisation de la base de données terminée")


# =============================================================================
# COMMANDE DJANGO POUR L'OPTIMISATION
# =============================================================================

class Command(BaseCommand):
    """Commande Django pour exécuter les optimisations de base de données"""
    help = 'Optimise la base de données DepanneTeliman'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--update-ratings',
            action='store_true',
            help='Met à jour les notes moyennes des techniciens',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Nettoie les données anciennes',
        )
        parser.add_argument(
            '--analyze',
            action='store_true',
            help='Analyse les performances de la base de données',
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Exécute toutes les optimisations',
        )
    
    def handle(self, *args, **options):
        if options['update_ratings'] or options['all']:
            self.stdout.write('Mise à jour des notes des techniciens...')
            count = DatabaseMaintenance.update_technician_ratings()
            self.stdout.write(
                self.style.SUCCESS(f'✅ {count} techniciens mis à jour')
            )
        
        if options['cleanup'] or options['all']:
            self.stdout.write('Nettoyage des données anciennes...')
            notif_count = DatabaseMaintenance.cleanup_old_notifications()
            msg_count = DatabaseMaintenance.cleanup_old_chat_messages()
            self.stdout.write(
                self.style.SUCCESS(
                    f'✅ {notif_count} notifications et {msg_count} messages nettoyés'
                )
            )
        
        if options['analyze'] or options['all']:
            self.stdout.write('Analyse des performances...')
            tables = DatabaseMaintenance.analyze_table_sizes()
            self.stdout.write(
                self.style.SUCCESS(f'✅ {len(tables)} tables analysées')
            )
            
            # Afficher les plus grandes tables
            for i, table in enumerate(tables[:5]):
                self.stdout.write(f"  {i+1}. {table[0]}")
        
        if options['all']:
            self.stdout.write('Optimisation complète...')
            DatabaseMaintenance.optimize_database()
            self.stdout.write(
                self.style.SUCCESS('✅ Optimisation terminée avec succès')
            )


# =============================================================================
# CONFIGURATION DES INDEX POUR MODELS.PY
# =============================================================================

def get_optimized_model_indexes():
    """
    Retourne la configuration d'index à ajouter aux modèles
    Utiliser dans les classes Meta des modèles
    """
    return {
        'Technician': OptimizedIndexes.TECHNICIAN_INDEXES,
        'RepairRequest': OptimizedIndexes.REPAIR_REQUEST_INDEXES,
        'Review': OptimizedIndexes.REVIEW_INDEXES,
        'Notification': OptimizedIndexes.NOTIFICATION_INDEXES,
        'ChatMessage': OptimizedIndexes.CHAT_MESSAGE_INDEXES,
    }


# =============================================================================
# MIDDLEWARE DE MONITORING DES REQUÊTES
# =============================================================================

class DatabaseQueryMonitoringMiddleware:
    """Middleware pour monitorer les requêtes de base de données"""
    
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        # Compter les requêtes avant
        queries_before = len(connection.queries)
        
        # Traiter la requête
        response = self.get_response(request)
        
        # Compter les requêtes après
        queries_after = len(connection.queries)
        query_count = queries_after - queries_before
        
        # Logger si trop de requêtes
        if query_count > 10:  # Seuil configurable
            logger.warning(
                f"HIGH_QUERY_COUNT: {request.path} - {query_count} requêtes"
            )
        
        # Ajouter au header en mode debug
        if settings.DEBUG:
            response['X-DB-Query-Count'] = str(query_count)
        
        return response