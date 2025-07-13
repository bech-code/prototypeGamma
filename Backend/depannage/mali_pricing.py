"""
Configuration des prix adaptés au Mali
=====================================

Ce module contient les tarifs et configurations de prix adaptés au marché malien.
Les prix sont exprimés en FCFA (Franc CFA) et tiennent compte du niveau de vie local.
"""

from decimal import Decimal
from typing import Dict, List, Optional

# ============================================================================
# CONFIGURATION GÉNÉRALE POUR LE MALI
# ============================================================================

# Devise officielle du Mali
CURRENCY = "XOF"  # Franc CFA
CURRENCY_SYMBOL = "FCFA"

# Code pays pour les paiements
COUNTRY_CODE = "ML"
PHONE_PREFIX = "223"

# ============================================================================
# TARIFS DES TECHNICIENS PAR SPÉCIALITÉ (FCFA/heure)
# ============================================================================

TECHNICIAN_HOURLY_RATES = {
    "electrician": {
        "junior": Decimal("2500"),      # 0-2 ans d'expérience
        "intermediate": Decimal("3500"), # 2-5 ans d'expérience
        "senior": Decimal("5000"),       # 5-10 ans d'expérience
        "expert": Decimal("7500"),       # 10+ ans d'expérience
        "default": Decimal("3500")
    },
    "plumber": {
        "junior": Decimal("2000"),
        "intermediate": Decimal("3000"),
        "senior": Decimal("4500"),
        "expert": Decimal("6500"),
        "default": Decimal("3000")
    },
    "mechanic": {
        "junior": Decimal("3000"),
        "intermediate": Decimal("4000"),
        "senior": Decimal("5500"),
        "expert": Decimal("8000"),
        "default": Decimal("4000")
    },
    "it": {
        "junior": Decimal("3000"),
        "intermediate": Decimal("4000"),
        "senior": Decimal("6000"),
        "expert": Decimal("9000"),
        "default": Decimal("4000")
    },
    "air_conditioning": {
        "junior": Decimal("3500"),
        "intermediate": Decimal("5000"),
        "senior": Decimal("7000"),
        "expert": Decimal("10000"),
        "default": Decimal("5000")
    },
    "appliance_repair": {
        "junior": Decimal("2500"),
        "intermediate": Decimal("3500"),
        "senior": Decimal("5000"),
        "expert": Decimal("7500"),
        "default": Decimal("3500")
    },
    "locksmith": {
        "junior": Decimal("3000"),
        "intermediate": Decimal("4500"),
        "senior": Decimal("6500"),
        "expert": Decimal("9000"),
        "default": Decimal("4500")
    },
    "other": {
        "junior": Decimal("2000"),
        "intermediate": Decimal("3000"),
        "senior": Decimal("4500"),
        "expert": Decimal("6500"),
        "default": Decimal("3000")
    }
}

# ============================================================================
# FRAIS DE DÉPLACEMENT PAR ZONE (FCFA)
# ============================================================================

TRAVEL_COSTS = {
    "bamako": {
        "same_zone": Decimal("500"),      # Même zone de Bamako
        "different_zone": Decimal("1000"), # Zone différente de Bamako
        "urgent": Decimal("1500")          # Urgence
    },
    "other_cities": {
        "local": Decimal("1000"),         # Même ville
        "nearby": Decimal("2000"),        # Ville voisine
        "urgent": Decimal("3000")         # Urgence
    },
    "rural": {
        "local": Decimal("1500"),         # Même village/commune
        "nearby": Decimal("2500"),        # Village voisin
        "urgent": Decimal("4000")         # Urgence
    }
}

# ============================================================================
# ESTIMATIONS DE PRIX PAR TYPE DE SERVICE (FCFA)
# ============================================================================

SERVICE_ESTIMATES = {
    "electrician": {
        "simple_repair": {
            "min": Decimal("5000"),
            "max": Decimal("15000"),
            "description": "Réparation simple (interrupteur, prise, etc.)"
        },
        "complex_repair": {
            "min": Decimal("15000"),
            "max": Decimal("35000"),
            "description": "Réparation complexe (tableau électrique, etc.)"
        },
        "installation": {
            "min": Decimal("10000"),
            "max": Decimal("50000"),
            "description": "Installation électrique"
        }
    },
    "plumber": {
        "simple_repair": {
            "min": Decimal("3000"),
            "max": Decimal("10000"),
            "description": "Réparation simple (fuite, robinet, etc.)"
        },
        "complex_repair": {
            "min": Decimal("10000"),
            "max": Decimal("25000"),
            "description": "Réparation complexe (canalisation, etc.)"
        },
        "installation": {
            "min": Decimal("8000"),
            "max": Decimal("40000"),
            "description": "Installation plomberie"
        }
    },
    "mechanic": {
        "diagnostic": {
            "min": Decimal("2000"),
            "max": Decimal("5000"),
            "description": "Diagnostic véhicule"
        },
        "simple_repair": {
            "min": Decimal("5000"),
            "max": Decimal("20000"),
            "description": "Réparation simple"
        },
        "complex_repair": {
            "min": Decimal("15000"),
            "max": Decimal("50000"),
            "description": "Réparation complexe"
        }
    },
    "it": {
        "diagnostic": {
            "min": Decimal("2000"),
            "max": Decimal("5000"),
            "description": "Diagnostic informatique"
        },
        "simple_repair": {
            "min": Decimal("5000"),
            "max": Decimal("15000"),
            "description": "Réparation simple (nettoyage, logiciel)"
        },
        "complex_repair": {
            "min": Decimal("10000"),
            "max": Decimal("30000"),
            "description": "Réparation complexe (hardware)"
        }
    },
    "air_conditioning": {
        "maintenance": {
            "min": Decimal("8000"),
            "max": Decimal("15000"),
            "description": "Maintenance climatisation"
        },
        "repair": {
            "min": Decimal("15000"),
            "max": Decimal("40000"),
            "description": "Réparation climatisation"
        },
        "installation": {
            "min": Decimal("25000"),
            "max": Decimal("80000"),
            "description": "Installation climatisation"
        }
    },
    "appliance_repair": {
        "simple_repair": {
            "min": Decimal("3000"),
            "max": Decimal("12000"),
            "description": "Réparation simple électroménager"
        },
        "complex_repair": {
            "min": Decimal("10000"),
            "max": Decimal("30000"),
            "description": "Réparation complexe électroménager"
        }
    },
    "locksmith": {
        "simple_service": {
            "min": Decimal("3000"),
            "max": Decimal("8000"),
            "description": "Service simple (copie clé, etc.)"
        },
        "complex_service": {
            "min": Decimal("8000"),
            "max": Decimal("25000"),
            "description": "Service complexe (changement serrure)"
        }
    }
}

# ============================================================================
# TARIFS D'ABONNEMENT POUR TECHNICIENS (FCFA/mois)
# ============================================================================

SUBSCRIPTION_PLANS = {
    "basic": {
        "price": Decimal("2000"),
        "duration_months": 1,
        "features": [
            "Accès complet à la plateforme",
            "Notifications de demandes",
            "Support client"
        ]
    },
    "premium": {
        "price": Decimal("5000"),
        "duration_months": 1,
        "features": [
            "Toutes les fonctionnalités Basic",
            "Priorité dans les résultats",
            "Statistiques détaillées",
            "Support prioritaire"
        ]
    },
    "professional": {
        "price": Decimal("10000"),
        "duration_months": 1,
        "features": [
            "Toutes les fonctionnalités Premium",
            "Badge vérifié",
            "Promotion automatique",
            "Support dédié"
        ]
    }
}

# ============================================================================
# FRAIS DE PLATEFORME (pourcentage)
# ============================================================================

PLATFORM_FEES = {
    "commission_rate": Decimal("0.10"),  # 10% de commission
    "min_fee": Decimal("500"),           # Frais minimum en FCFA
    "max_fee": Decimal("5000")           # Frais maximum en FCFA
}

# ============================================================================
# FONCTIONS UTILITAIRES
# ============================================================================

def get_hourly_rate(specialty: str, experience_level: str = "intermediate") -> Decimal:
    """
    Retourne le tarif horaire pour une spécialité et un niveau d'expérience.
    
    Args:
        specialty: Spécialité du technicien
        experience_level: Niveau d'expérience (junior, intermediate, senior, expert)
    
    Returns:
        Tarif horaire en FCFA
    """
    rates = TECHNICIAN_HOURLY_RATES.get(specialty, TECHNICIAN_HOURLY_RATES["other"])
    return rates.get(experience_level, rates["default"])

def get_travel_cost(city: str, is_urgent: bool = False, same_zone: bool = True) -> Decimal:
    """
    Calcule les frais de déplacement selon la localisation.
    
    Args:
        city: Ville d'intervention
        is_urgent: Si c'est une urgence
        same_zone: Si c'est dans la même zone
    
    Returns:
        Frais de déplacement en FCFA
    """
    if city.lower() == "bamako":
        costs = TRAVEL_COSTS["bamako"]
        if is_urgent:
            return costs["urgent"]
        return costs["same_zone"] if same_zone else costs["different_zone"]
    elif city.lower() in ["kayes", "koulikoro", "sikasso", "ségou", "mopti", "tombouctou", "gao", "kidal"]:
        costs = TRAVEL_COSTS["other_cities"]
        if is_urgent:
            return costs["urgent"]
        return costs["local"] if same_zone else costs["nearby"]
    else:
        costs = TRAVEL_COSTS["rural"]
        if is_urgent:
            return costs["urgent"]
        return costs["local"] if same_zone else costs["nearby"]

def estimate_service_price(specialty: str, service_type: str = "simple_repair") -> Dict[str, Decimal]:
    """
    Estime le prix d'un service selon la spécialité et le type.
    
    Args:
        specialty: Spécialité du technicien
        service_type: Type de service (simple_repair, complex_repair, installation, etc.)
    
    Returns:
        Dictionnaire avec min, max et description
    """
    services = SERVICE_ESTIMATES.get(specialty, SERVICE_ESTIMATES["other"])
    return services.get(service_type, services["simple_repair"])

def calculate_platform_fee(amount: Decimal) -> Decimal:
    """
    Calcule les frais de plateforme sur un montant.
    
    Args:
        amount: Montant de la transaction
    
    Returns:
        Frais de plateforme en FCFA
    """
    fee = amount * PLATFORM_FEES["commission_rate"]
    if fee < PLATFORM_FEES["min_fee"]:
        return PLATFORM_FEES["min_fee"]
    elif fee > PLATFORM_FEES["max_fee"]:
        return PLATFORM_FEES["max_fee"]
    return fee

def format_price(amount: Decimal) -> str:
    """
    Formate un prix pour l'affichage.
    
    Args:
        amount: Montant en FCFA
    
    Returns:
        Prix formaté avec le symbole FCFA
    """
    return f"{amount:,.0f} {CURRENCY_SYMBOL}"

def get_subscription_price(plan: str = "basic") -> Decimal:
    """
    Retourne le prix d'un abonnement.
    
    Args:
        plan: Type d'abonnement (basic, premium, professional)
    
    Returns:
        Prix de l'abonnement en FCFA
    """
    return SUBSCRIPTION_PLANS.get(plan, SUBSCRIPTION_PLANS["basic"])["price"]

# ============================================================================
# CONFIGURATION POUR LES TESTS
# ============================================================================

TEST_AMOUNTS = {
    "subscription": Decimal("2000"),     # Abonnement de test
    "small_service": Decimal("5000"),    # Petit service
    "medium_service": Decimal("15000"),  # Service moyen
    "large_service": Decimal("35000"),   # Gros service
    "urgent_service": Decimal("25000")   # Service urgent
}

# ============================================================================
# VALIDATION DES PRIX
# ============================================================================

def validate_price_range(amount: Decimal, min_amount: Decimal = Decimal("1000"), max_amount: Decimal = Decimal("100000")) -> bool:
    """
    Valide qu'un prix est dans une plage acceptable.
    
    Args:
        amount: Montant à valider
        min_amount: Montant minimum
        max_amount: Montant maximum
    
    Returns:
        True si le prix est valide
    """
    return min_amount <= amount <= max_amount

def get_price_suggestions(specialty: str, complexity: str = "simple") -> List[Dict[str, any]]:
    """
    Retourne des suggestions de prix pour une spécialité.
    
    Args:
        specialty: Spécialité du technicien
        complexity: Complexité du service (simple, medium, complex)
    
    Returns:
        Liste de suggestions de prix
    """
    services = SERVICE_ESTIMATES.get(specialty, SERVICE_ESTIMATES["other"])
    suggestions = []
    
    for service_type, details in services.items():
        if complexity in service_type:
            suggestions.append({
                "type": service_type,
                "min_price": details["min"],
                "max_price": details["max"],
                "description": details["description"],
                "formatted_min": format_price(details["min"]),
                "formatted_max": format_price(details["max"])
            })
    
    return suggestions