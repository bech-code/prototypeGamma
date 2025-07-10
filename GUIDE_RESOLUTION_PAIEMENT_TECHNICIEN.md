# Guide de résolution - Problème de paiement technicien

## 🔍 **Problème identifié**

Le paiement est enregistré en base de données mais le technicien ne peut pas accéder à son dashboard et aux demandes.

### **Causes possibles :**

1. **Abonnement non créé** : Le paiement est enregistré mais l'abonnement n'est pas créé automatiquement
2. **Abonnement expiré** : L'abonnement existe mais a expiré
3. **Profil technicien manquant** : L'utilisateur n'a pas de profil technicien associé
4. **Logique de notification défaillante** : La notification CinetPay ne traite pas correctement l'activation

---

## 🛠️ **Solutions**

### **1. Diagnostic du problème**

Exécutez le script de diagnostic :

```bash
cd /Users/mohamedbechirdiarra/Downloads/Prototype5b
python diagnostic_subscription_activation.py
```

Ce script va :
- Vérifier les techniciens existants
- Analyser les paiements CinetPay
- Identifier les abonnements manquants
- Tester la fonction `get_technician_profile`

### **2. Correction automatique**

Exécutez le script de correction :

```bash
python fix_subscription_activation.py
```

Ce script va :
- Créer les abonnements manquants pour les paiements réussis
- Créer des abonnements de test pour les techniciens sans abonnement
- Vérifier l'accès au dashboard

### **3. Amélioration de la logique CinetPay**

Exécutez le script d'amélioration :

```bash
python fix_cinetpay_notification.py
```

Ce script va :
- Corriger les paiements existants
- Tester l'endpoint de notification
- Générer un code amélioré pour la fonction `notify`

---

## 📋 **Instructions détaillées**

### **Étape 1 : Diagnostic**

1. **Arrêter le serveur Django** (Ctrl+C)
2. **Exécuter le diagnostic** :
   ```bash
   python diagnostic_subscription_activation.py
   ```
3. **Analyser les résultats** :
   - Vérifier le nombre de techniciens sans abonnement
   - Identifier les paiements sans abonnement créé
   - Noter les problèmes détectés

### **Étape 2 : Correction**

1. **Exécuter la correction** :
   ```bash
   python fix_subscription_activation.py
   ```
2. **Vérifier les résultats** :
   - Confirmer que tous les techniciens ont un abonnement actif
   - Tester l'accès au dashboard

### **Étape 3 : Amélioration du code**

1. **Remplacer la fonction notify** dans `Backend/depannage/views.py` :

```python
@action(detail=False, methods=["post"], permission_classes=[AllowAny], url_path="cinetpay/notify")
@permission_classes([AllowAny])
def notify(self, request):
    """Endpoint pour recevoir les notifications de paiement de CinetPay (abonnement technicien)."""
    logger.info(f"Notification CinetPay reçue: {request.data}")
    
    try:
        serializer = CinetPayNotificationSerializer(data=request.data)
        if not serializer.is_valid():
            logger.error(f"Données de notification invalides: {serializer.errors}")
            return Response(serializer.errors, status=400)
        
        data = serializer.validated_data
        
        # Récupérer le paiement
        try:
            payment = CinetPayPayment.objects.get(transaction_id=data["transaction_id"])
        except CinetPayPayment.DoesNotExist:
            logger.error(f"Paiement non trouvé: {data['transaction_id']}")
            return Response({"error": "Paiement non trouvé"}, status=404)
        
        # Traiter le statut du paiement
        if data["status"] == "ACCEPTED":
            payment.status = "success"
            payment.paid_at = timezone.now()
            payment.cinetpay_transaction_id = data.get("payment_token", "")
            
            # Activation abonnement technicien
            if payment.metadata and "subscription" in payment.metadata:
                from .models import TechnicianSubscription
                
                user = payment.user
                if not user:
                    logger.error(f"Paiement {payment.transaction_id} sans utilisateur")
                    return Response({"error": "Utilisateur non trouvé"}, status=400)
                
                # Récupérer le profil technicien
                technician = None
                try:
                    technician = user.technician_depannage
                except:
                    try:
                        technician = user.technician_profile
                    except:
                        pass
                
                if not technician:
                    logger.error(f"Utilisateur {user.username} sans profil technicien")
                    return Response({"error": "Profil technicien non trouvé"}, status=400)
                
                # Extraire la durée depuis le metadata
                duration_months = 1
                if "_subscription_" in payment.metadata:
                    try:
                        duration_part = payment.metadata.split("_subscription_")[1]
                        duration_months = int(duration_part.split("months")[0])
                    except Exception as e:
                        logger.warning(f"Erreur extraction durée: {e}, utilisation valeur par défaut")
                        duration_months = 1
                
                now = timezone.now()
                
                # Vérifier s'il y a déjà un abonnement actif à prolonger
                active_sub = technician.subscriptions.filter(end_date__gt=now).order_by('-end_date').first()
                
                if active_sub:
                    # Prolonger l'abonnement existant
                    active_sub.end_date += timedelta(days=30 * duration_months)
                    active_sub.payment = payment
                    active_sub.save()
                    sub = active_sub
                    logger.info(f"Abonnement prolongé pour {technician.user.username}")
                else:
                    # Créer un nouvel abonnement
                    sub = TechnicianSubscription.objects.create(
                        technician=technician,
                        plan_name=f"Standard {duration_months} mois",
                        start_date=now,
                        end_date=now + timedelta(days=30 * duration_months),
                        payment=payment,
                        is_active=True
                    )
                    logger.info(f"Nouvel abonnement créé pour {technician.user.username}")
                
                # Créer une notification pour l'utilisateur
                try:
                    Notification.objects.create(
                        recipient=user,
                        title="Abonnement activé avec succès !",
                        message=f"Votre abonnement a été activé pour {duration_months} mois jusqu'au {sub.end_date.strftime('%d/%m/%Y')}. Vous pouvez maintenant recevoir de nouvelles demandes de réparation.",
                        type="subscription_renewed",
                    )
                except Exception as e:
                    logger.error(f"Erreur création notification: {e}")
            
            payment.save()
            logger.info(f"Paiement {payment.transaction_id} traité avec succès")
            return Response({"success": True})
            
        elif data["status"] == "CANCELLED":
            payment.status = "failed"
            payment.save()
            
            try:
                Notification.objects.create(
                    recipient=payment.user,
                    title="Paiement échoué",
                    message="Votre paiement a échoué. Veuillez réessayer.",
                    type="payment_failed",
                )
            except Exception as e:
                logger.error(f"Erreur création notification d'échec: {e}")
            
            return Response({"success": False, "error": "Paiement annulé"}, status=400)
        else:
            logger.warning(f"Statut de paiement inattendu: {data['status']}")
            return Response({"error": "Statut de paiement inconnu"}, status=400)
            
    except Exception as e:
        logger.error(f"Erreur lors du traitement de la notification: {e}")
        return Response({"error": "Erreur interne du serveur"}, status=500)
```

2. **Redémarrer le serveur Django** :
   ```bash
   cd Backend
   python manage.py runserver
   ```

### **Étape 4 : Test**

1. **Tester avec un technicien existant** :
   - Se connecter avec un compte technicien
   - Vérifier l'accès au dashboard
   - Vérifier la visibilité des demandes

2. **Tester un nouveau paiement** :
   - Initier un paiement d'abonnement
   - Simuler la notification CinetPay
   - Vérifier l'activation automatique

---

## 🔧 **Vérifications manuelles**

### **1. Vérifier les abonnements en base**

```python
# Dans le shell Django
python manage.py shell

from depannage.models import Technician, TechnicianSubscription
from django.utils import timezone

# Lister tous les techniciens
technicians = Technician.objects.all()
for tech in technicians:
    print(f"Technicien: {tech.user.username}")
    active_subs = tech.subscriptions.filter(end_date__gt=timezone.now())
    print(f"  Abonnements actifs: {active_subs.count()}")
    for sub in active_subs:
        print(f"    - {sub.plan_name} jusqu'au {sub.end_date}")
```

### **2. Vérifier les paiements**

```python
from depannage.models import CinetPayPayment

# Lister les paiements réussis
payments = CinetPayPayment.objects.filter(status='success')
for payment in payments:
    print(f"Paiement: {payment.transaction_id}")
    print(f"  Utilisateur: {payment.user.username if payment.user else 'None'}")
    print(f"  Métadonnées: {payment.metadata}")
    print(f"  Payé le: {payment.paid_at}")
```

### **3. Tester l'endpoint subscription_status**

```bash
# Connexion technicien
curl -X POST http://127.0.0.1:8000/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email": "technicien@depanneteliman.com", "password": "technicien123"}'

# Récupérer le token et tester l'endpoint
curl -X GET http://127.0.0.1:8000/depannage/api/technicians/subscription_status/ \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 🚨 **Problèmes courants et solutions**

### **Problème 1 : Technicien sans profil**
**Symptôme** : Erreur "Profil technicien non trouvé"
**Solution** : Créer le profil technicien manuellement

### **Problème 2 : Abonnement expiré**
**Symptôme** : Technicien connecté mais pas de demandes visibles
**Solution** : Renouveler l'abonnement ou créer un nouvel abonnement

### **Problème 3 : Notification non traitée**
**Symptôme** : Paiement enregistré mais pas d'abonnement créé
**Solution** : Vérifier les logs et corriger la logique de notification

### **Problème 4 : Relation technician manquante**
**Symptôme** : Erreur lors de la récupération du profil technicien
**Solution** : Vérifier les deux relations (`technician_depannage` et `technician_profile`)

---

## 📞 **Support**

Si le problème persiste après avoir suivi ce guide :

1. **Vérifier les logs Django** :
   ```bash
   tail -f Backend/django.log
   ```

2. **Exécuter les tests de diagnostic** :
   ```bash
   python diagnostic_subscription_activation.py
   ```

3. **Contacter l'administrateur** avec les logs d'erreur

---

## ✅ **Validation finale**

Après avoir appliqué toutes les corrections :

1. ✅ Tous les techniciens ont un abonnement actif
2. ✅ Les paiements sont correctement liés aux abonnements
3. ✅ Les techniciens peuvent accéder à leur dashboard
4. ✅ Les demandes sont visibles pour les techniciens
5. ✅ Les nouvelles notifications CinetPay fonctionnent

**Le problème est résolu ! 🎉** 