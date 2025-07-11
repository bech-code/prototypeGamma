import io
import datetime
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAdminUser
from django.http import HttpResponse
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from .models import RepairRequest, Payment, Review
from users.models import User
from django.db.models import Count, Sum, Avg, Q

@api_view(['GET'])
@permission_classes([IsAdminUser])
def export_statistics_pdf(request):
    """Export des statistiques en PDF."""
    if not request.user.is_staff:
        return Response({"error": "Accès non autorisé"}, status=403)
    
    try:
        from reportlab.lib.pagesizes import letter, A4
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.units import inch
        from reportlab.lib import colors
        from django.http import HttpResponse
        from django.db.models import Q, Count, Sum, Avg
        from datetime import datetime, timedelta
        from django.utils import timezone
        
        # Calculer les statistiques
        now = timezone.now()
        
        # Utilisateurs actifs (correction de la requête)
        active_users_30d = User.objects.filter(
            Q(client_profile__repair_requests__created_at__gte=now - timedelta(days=30)) |
            Q(technician_depannage__repair_requests__created_at__gte=now - timedelta(days=30))
        ).distinct().count()

        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=A4)
        width, height = A4

        y = height - 40
        p.setFont("Helvetica-Bold", 16)
        p.drawString(40, y, "Statistiques DepanneTeliman")
        p.setFont("Helvetica", 10)
        y -= 30
        p.drawString(40, y, f"Généré le : {now.strftime('%d/%m/%Y %H:%M:%S')}")

        y -= 30
        p.setFont("Helvetica-Bold", 12)
        p.drawString(40, y, "Vue d'ensemble")
        p.setFont("Helvetica", 10)
        y -= 20

        # Statistiques utilisateurs
        total_users = User.objects.count()
        total_clients = User.objects.filter(user_type='client').count()
        total_technicians = User.objects.filter(user_type='technician').count()
        total_admins = User.objects.filter(user_type='admin').count()
        stats = [
            ("Total utilisateurs", total_users),
            ("Clients", total_clients),
            ("Techniciens", total_technicians),
            ("Admins", total_admins),
            ("Utilisateurs actifs (30j)", active_users_30d),
        ]
        for label, value in stats:
            p.drawString(60, y, f"{label} : {value}")
            y -= 15

        y -= 10
        p.setFont("Helvetica-Bold", 12)
        p.drawString(40, y, "Demandes")
        p.setFont("Helvetica", 10)
        y -= 20

        total_requests = RepairRequest.objects.count()
        completed_requests = RepairRequest.objects.filter(status="completed").count()
        pending_requests = RepairRequest.objects.filter(status="pending").count()
        in_progress_requests = RepairRequest.objects.filter(status="in_progress").count()
        cancelled_requests = RepairRequest.objects.filter(status="cancelled").count()
        stats = [
            ("Total demandes", total_requests),
            ("Terminées", completed_requests),
            ("En attente", pending_requests),
            ("En cours", in_progress_requests),
            ("Annulées", cancelled_requests),
        ]
        for label, value in stats:
            p.drawString(60, y, f"{label} : {value}")
            y -= 15

        y -= 10
        p.setFont("Helvetica-Bold", 12)
        p.drawString(40, y, "Finances")
        p.setFont("Helvetica", 10)
        y -= 20

        total_revenue = Payment.objects.filter(status='completed', payment_type='client_payment').aggregate(total=Sum('amount'))['total'] or 0
        total_payouts = Payment.objects.filter(status='completed', payment_type='technician_payout').aggregate(total=Sum('amount'))['total'] or 0
        stats = [
            ("Revenus totaux (XOF)", float(total_revenue)),
            ("Paiements techniciens (XOF)", float(total_payouts)),
            ("Frais plateforme (XOF)", float(total_revenue) - float(total_payouts)),
        ]
        for label, value in stats:
            p.drawString(60, y, f"{label} : {value}")
            y -= 15

        y -= 10
        p.setFont("Helvetica-Bold", 12)
        p.drawString(40, y, "Satisfaction")
        p.setFont("Helvetica", 10)
        y -= 20

        total_reviews = Review.objects.count()
        avg_rating = Review.objects.aggregate(avg=Avg('rating'))['avg'] or 0
        p.drawString(60, y, f"Nombre d'avis : {total_reviews}")
        y -= 15
        p.drawString(60, y, f"Note moyenne : {round(avg_rating, 2)}")
        y -= 20

        # Spécialités
        p.setFont("Helvetica-Bold", 12)
        p.drawString(40, y, "Demandes par spécialité")
        p.setFont("Helvetica", 10)
        y -= 20
        specialty_stats = (
            RepairRequest.objects.values('specialty_needed')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        for s in specialty_stats:
            p.drawString(60, y, f"{s['specialty_needed']} : {s['count']}")
            y -= 13

        y -= 10
        p.setFont("Helvetica-Bold", 12)
        p.drawString(40, y, "Demandes par ville (top 10)")
        p.setFont("Helvetica", 10)
        y -= 20
        city_stats = (
            RepairRequest.objects.values('city')
            .annotate(count=Count('id'))
            .order_by('-count')[:10]
        )
        for c in city_stats:
            p.drawString(60, y, f"{c['city']} : {c['count']}")
            y -= 13

        p.showPage()
        p.save()
        buffer.seek(0)
        filename = f"statistiques_depanneteliman_{now.strftime('%Y%m%d_%H%M%S')}.pdf"
        response = HttpResponse(buffer, content_type='application/pdf')
        response['Content-Disposition'] = f'attachment; filename={filename}'
        return response 
    except Exception as e:
        return HttpResponse(f"Erreur lors de la génération du PDF: {e}", status=500) 