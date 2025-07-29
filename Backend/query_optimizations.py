
# Optimisations de requêtes pour DepanneTeliman

## 1. Index de base de données
```sql
-- Index pour les recherches de techniciens
CREATE INDEX idx_technician_specialty_location ON depannage_technician(specialty, current_latitude, current_longitude);
CREATE INDEX idx_technician_available ON depannage_technician(is_available, is_verified);

-- Index pour les demandes de réparation
CREATE INDEX idx_repair_request_status_date ON depannage_repairrequest(status, created_at);
CREATE INDEX idx_repair_request_client ON depannage_repairrequest(client_id, status);

-- Index pour les avis
CREATE INDEX idx_review_technician_rating ON depannage_review(technician_id, rating);
CREATE INDEX idx_review_created_at ON depannage_review(created_at);
```

## 2. Optimisations Django ORM
```python
# Utiliser select_related() pour les relations ForeignKey
technicians = Technician.objects.select_related('user').filter(is_available=True)

# Utiliser prefetch_related() pour les relations ManyToMany
requests = RepairRequest.objects.prefetch_related('documents', 'payments').filter(status='pending')

# Éviter les requêtes N+1
for request in RepairRequest.objects.select_related('client', 'technician'):
    print(f"Client: {request.client.user.username}")
    print(f"Technicien: {request.technician.user.username if request.technician else 'Non assigné'}")
```

## 3. Cache Redis
```python
from django.core.cache import cache
from django.conf import settings

# Cache des techniciens disponibles
def get_available_technicians():
    cache_key = 'available_technicians'
    technicians = cache.get(cache_key)
    
    if technicians is None:
        technicians = list(Technician.objects.filter(is_available=True).values())
        cache.set(cache_key, technicians, timeout=300)  # 5 minutes
    
    return technicians

# Cache des statistiques
def get_dashboard_stats():
    cache_key = 'dashboard_stats'
    stats = cache.get(cache_key)
    
    if stats is None:
        stats = {
            'total_requests': RepairRequest.objects.count(),
            'pending_requests': RepairRequest.objects.filter(status='pending').count(),
            'completed_requests': RepairRequest.objects.filter(status='completed').count(),
        }
        cache.set(cache_key, stats, timeout=600)  # 10 minutes
    
    return stats
```
