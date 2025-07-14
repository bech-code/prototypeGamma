#!/usr/bin/env python3
"""
Script pour créer 32 techniciens de test, un pour chaque service du BookingForm, avec profil complet et pièces jointes.
"""
import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'auth.settings')
django.setup()

from django.contrib.auth import get_user_model
from depannage.models import Technician
from users.models import TechnicianProfile

User = get_user_model()

# Liste complète des services (id, name)
services = [
    {"id": "plumber", "name": "Plomberie"},
    {"id": "electrician", "name": "Électricité"},
    {"id": "locksmith", "name": "Serrurerie"},
    {"id": "it", "name": "Support Informatique"},
    {"id": "air_conditioning", "name": "Chauffage & Climatisation"},
    {"id": "appliance_repair", "name": "Réparation d'Électroménagers"},
    {"id": "panneauxolaires", "name": "Panneaux Solaires"},
    {"id": "maconnerie", "name": "Maçonnerie"},
    {"id": "decoration", "name": "Décoration"},
    {"id": "soudure", "name": "Soudure"},
    {"id": "groupeelectrogene", "name": "Groupe électrogène"},
    {"id": "pneumatique", "name": "Pneumatique"},
    {"id": "coiffeur", "name": "Coiffeur"},
    {"id": "pressing", "name": "Pressing"},
    {"id": "tele", "name": "Télé"},
    {"id": "esthetique", "name": "Esthétique et Beauté"},
    {"id": "lessive", "name": "Lessive à Domicile"},
    {"id": "aidemenagere", "name": "Aide Ménagère"},
    {"id": "vidange", "name": "Vidange"},
    {"id": "livraison", "name": "Livraison"},
    {"id": "demenagement", "name": "Déménagement"},
    {"id": "depannage_voiture", "name": "Dépannage Voiture"},
    {"id": "nettoyage", "name": "Nettoyage"},
    {"id": "froid", "name": "Froid"},
    {"id": "menuisier", "name": "Menuisier"},
    {"id": "lavage", "name": "Lavage"},
    {"id": "remorquage_auto", "name": "Remorquage Auto"},
    {"id": "telephone", "name": "Téléphone"},
    {"id": "livraison_gaz", "name": "Livraison Gaz"},
    {"id": "maquillage", "name": "Maquillage"},
    {"id": "antenne", "name": "Antenne"},
    {"id": "pressing_chemise", "name": "Pressing Chemise"},
]

quartiers = [
    "Sotuba", "Badalabougou", "Hamdallaye", "Yirimadio", "Lafiabougou", "Kalaban Coura", "Sabalibougou", "Niaréla"
]

# Liste de fichiers pour pièces jointes (on prend les 32 premiers de chaque type)
piece_identite_files = [
    f"technician_docs/{f}" for f in [
        "test_piece_identite_oj3HZb5.pdf", "test_piece_identite_P6vPwHK.pdf", "test_piece_identite_aiJYIa3.pdf", "test_piece_identite_QiNWkFA.pdf", "test_piece_identite_iblISR8.pdf", "test_piece_identite_8BZ3SNM.pdf", "test_piece_identite_ZbilRyX.pdf", "test_piece_identite_b9yPs71.pdf", "test_piece_identite_QM1fLL1.pdf", "test_piece_identite_Jb4lN23.pdf", "test_piece_identite_mQX8vr2.pdf", "test_piece_identite_bBbF7OO.pdf", "test_piece_identite_cKKEtWo.pdf", "test_piece_identite_IQUFY6D.pdf", "test_piece_identite_HtKbXXy.pdf", "test_piece_identite_4IBl0nK.pdf", "test_piece_identite_HG2qx3l.pdf", "test_piece_identite_YqaaNhK.pdf", "test_piece_identite_cIPKbeZ.pdf", "test_piece_identite_VjBPt8P.pdf", "test_piece_identite_jnKYYsr.pdf", "test_piece_identite_KwNGIJj.pdf", "test_piece_identite_OmFoRzI.pdf", "test_piece_identite_NdIqreo.pdf", "test_piece_identite_9NVflW5.pdf", "test_piece_identite_FK5LPlw.pdf", "test_piece_identite_5FfnmIq.pdf", "test_piece_identite_FOJy2zE.pdf", "test_piece_identite_E0BpLkP.pdf", "test_piece_identite_tgmXJYR.pdf", "test_piece_identite_8zod9Ga.pdf", "test_piece_identite_RgLeGdg.pdf"
    ]
]
certificat_residence_files = [
    f"technician_docs/{f}" for f in [
        "test_certificat_residence_BWh7Dvj.pdf", "test_certificat_residence_gp0cKsO.pdf", "test_certificat_residence_oXWZQA0.pdf", "test_certificat_residence_i0VpIOg.pdf", "test_certificat_residence_O2tdcV4.pdf", "test_certificat_residence_57xgpnm.pdf", "test_certificat_residence_bYYXLIn.pdf", "test_certificat_residence_ZfOPiMq.pdf", "test_certificat_residence_NcMmsp5.pdf", "test_certificat_residence_d3hDJuG.pdf", "test_certificat_residence_GaYDaTf.pdf", "test_certificat_residence_U7MKg9Y.pdf", "test_certificat_residence_airWS4d.pdf", "test_certificat_residence_0teGEqQ.pdf", "test_certificat_residence_BZIRheQ.pdf", "test_certificat_residence_nwQPQTd.pdf", "test_certificat_residence_tdW0Rnm.pdf", "test_certificat_residence_Xu51vhc.pdf", "test_certificat_residence_FRySIPd.pdf", "test_certificat_residence_jc5O9xr.pdf", "test_certificat_residence_xDydtn4.pdf", "test_certificat_residence_82jrtk5.pdf", "test_certificat_residence_93wmoPi.pdf", "test_certificat_residence_iwLJcb7.pdf", "test_certificat_residence_Qn9fe04.pdf", "test_certificat_residence_NtrggNK.pdf", "test_certificat_residence_GkFSowZ.pdf", "test_certificat_residence_tS1p2om.pdf", "test_certificat_residence_bOPQyIl.pdf", "test_certificat_residence_Vzupn3H.pdf", "test_certificat_residence_STpTxO0.pdf", "test_certificat_residence_bsmi2Sz.pdf"
    ]
]

for idx, service in enumerate(services, 1):
    quartier = quartiers[(idx - 1) % len(quartiers)]
    phone = f"+223 70 {10 + idx:02d} {idx:02d} {idx+10:02d}"
    username = f"tech_{service['id']}"
    email = f"{service['id']}@gmail.com"
    password = "bechir66312345"
    years_experience = 5
    address = f"{quartier}, Bamako"
    piece_identite = piece_identite_files[(idx - 1) % len(piece_identite_files)]
    certificat_residence = certificat_residence_files[(idx - 1) % len(certificat_residence_files)]

    user, created = User.objects.get_or_create(email=email, defaults={
        "username": username,
        "user_type": "technician",
        "first_name": "Tech",
        "last_name": service["name"]
    })
    user.set_password(password)
    user.user_type = "technician"
    user.username = username
    user.first_name = "Tech"
    user.last_name = service["name"]
    user.save()

    # Créer ou mettre à jour le profil technicien
    profile, p_created = TechnicianProfile.objects.get_or_create(user=user, defaults={
        "piece_identite": piece_identite,
        "certificat_residence": certificat_residence,
        "specialty": service["id"],
        "years_experience": years_experience,
        "phone": phone,
        "address": address
    })
    if not p_created:
        profile.piece_identite = piece_identite
        profile.certificat_residence = certificat_residence
        profile.specialty = service["id"]
        profile.years_experience = years_experience
        profile.phone = phone
        profile.address = address
        profile.save()

    # Créer ou mettre à jour le technicien (dépannage)
    tech, t_created = Technician.objects.get_or_create(user=user, defaults={
        "specialty": service["id"],
        "years_experience": years_experience,
        "phone": phone,
        "is_available": True,
        "is_verified": True
    })
    if not t_created:
        tech.specialty = service["id"]
        tech.years_experience = years_experience
        tech.phone = phone
        tech.is_available = True
        tech.is_verified = True
        tech.save()

    print(f"{'Créé' if created else 'Mis à jour'} : {email} ({service['name']}) - {quartier} - {phone}")

print("\n🎉 32 techniciens de test créés avec succès (profils complets) !") 