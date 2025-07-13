#!/usr/bin/env python3
"""
Script pour modifier les demandes de réparation existantes en plomberie
afin que ballo@gmail.com (plombier) puisse être trouvé dans les recherches.
"""

import os
import django

# Configuration Django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from depannage.models import RepairRequest, Technician
from users.models import User

def modify_requests_to_plumbing():
    """Modifie les demandes existantes pour qu'elles soient en plomberie."""
    
    print("🔧 Modification des demandes de réparation vers la plomberie")
    print("=" * 60)
    
    # Vérifier que ballo@gmail.com existe et est un plombier
    try:
        ballo_user = User.objects.get(email="ballo@gmail.com")
        ballo_technician = Technician.objects.get(user=ballo_user)
        print(f"✅ Technicien trouvé: {ballo_user.get_full_name()}")
        print(f"   Email: {ballo_user.email}")
        print(f"   Spécialité: {ballo_technician.specialty}")
        print(f"   Vérifié: {ballo_technician.is_verified}")
        print(f"   Disponible: {ballo_technician.is_available}")
        
        if ballo_technician.specialty != "plumber":
            print("⚠️  Attention: ballo@gmail.com n'est pas un plombier!")
            print(f"   Spécialité actuelle: {ballo_technician.specialty}")
            response = input("Voulez-vous continuer quand même? (y/N): ")
            if response.lower() != 'y':
                print("❌ Opération annulée")
                return
    except User.DoesNotExist:
        print("❌ Utilisateur ballo@gmail.com non trouvé")
        return
    except Technician.DoesNotExist:
        print("❌ Profil technicien non trouvé pour ballo@gmail.com")
        return
    
    # Compter les demandes existantes par spécialité
    print("\n📊 Demandes existantes par spécialité:")
    specialty_counts = {}
    for request in RepairRequest.objects.all():
        specialty = request.specialty_needed
        specialty_counts[specialty] = specialty_counts.get(specialty, 0) + 1
    
    for specialty, count in specialty_counts.items():
        print(f"   {specialty}: {count} demandes")
    
    # Modifier les demandes en attente vers la plomberie
    pending_requests = RepairRequest.objects.filter(status='pending')
    print(f"\n🔄 Modification de {pending_requests.count()} demandes en attente...")
    
    modified_count = 0
    for request in pending_requests:
        old_specialty = request.specialty_needed
        request.specialty_needed = 'plumber'
        request.save()
        modified_count += 1
        print(f"   ✅ Demande #{request.id}: {old_specialty} → plumber")
    
    print(f"\n✅ {modified_count} demandes modifiées vers la plomberie")
    
    # Vérifier les demandes assignées à ballo
    ballo_requests = RepairRequest.objects.filter(technician=ballo_technician)
    print(f"\n📋 Demandes assignées à {ballo_user.get_full_name()}: {ballo_requests.count()}")
    
    for request in ballo_requests:
        print(f"   - Demande #{request.id}: {request.title} ({request.status})")
    
    # Statistiques finales
    print("\n📊 Statistiques finales:")
    final_counts = {}
    for request in RepairRequest.objects.all():
        specialty = request.specialty_needed
        final_counts[specialty] = final_counts.get(specialty, 0) + 1
    
    for specialty, count in final_counts.items():
        print(f"   {specialty}: {count} demandes")
    
    print("\n🎉 Modification terminée!")
    print("Maintenant ballo@gmail.com devrait apparaître dans les recherches de plomberie.")

if __name__ == "__main__":
    modify_requests_to_plumbing() 