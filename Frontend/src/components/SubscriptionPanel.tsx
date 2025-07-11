import React, { useState, useEffect } from 'react';
import { CreditCard, Clock, AlertTriangle, CheckCircle, Download, RefreshCw, AlertCircle, Calendar, DollarSign, ExternalLink, Eye, FileText, X } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface Payment {
    id: number;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    payment_method: string;
    created_at: string;
    transaction_id?: string;
    description?: string;
    notification_data?: any; // Ajout du champ notification_data
}

interface Subscription {
    id: number;
    plan_name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    amount: number;
    status: 'active' | 'expired' | 'pending';
    plan_type?: string;
    features?: string[];
}

interface SubscriptionPanelProps {
    technicianId: number;
}

const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({ technicianId }) => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [processingPayment, setProcessingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedDuration, setSelectedDuration] = useState(1);
    const [showRenewModal, setShowRenewModal] = useState(false);
    const [showNotificationModal, setShowNotificationModal] = useState(false);
    const [selectedNotification, setSelectedNotification] = useState<any>(null);

    // Tarifs clairs : 5000 FCFA/mois
    const durationOptions = [
        { value: 1, label: '1 mois', price: 5000, savings: 0, popular: false, description: 'Accès premium 1 mois' },
        { value: 3, label: '3 mois', price: 15000, savings: 0, popular: true, description: 'Accès premium 3 mois (économies)' },
        { value: 6, label: '6 mois', price: 30000, savings: 0, popular: false, description: 'Accès premium 6 mois (meilleur prix)' }
    ];

    useEffect(() => {
        fetchSubscriptionData();
    }, [technicianId]);

    const fetchSubscriptionData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Récupérer l'abonnement actuel via l'endpoint backend
            const subResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/technicians/subscription_status/', {
                method: 'GET'
            });

            if (subResponse.ok) {
                const subData = await subResponse.json();
                setSubscription(subData.subscription);
            } else if (subResponse.status === 404) {
                setSubscription(null);
            } else {
                const errorData = await subResponse.json();
                setError(errorData.error || 'Erreur lors du chargement de l\'abonnement');
            }

            // Récupérer l'historique des paiements CinetPay
            const paymentsResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/cinetpay/my_payments/', {
                method: 'GET'
            });

            if (paymentsResponse.ok) {
                const paymentsData = await paymentsResponse.json();
                setPayments(paymentsData.results || paymentsData || []);
            } else {
                console.warn('Erreur lors du chargement des paiements:', paymentsResponse.status);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des données:', err);
            setError('Erreur réseau lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchSubscriptionData();
        setRefreshing(false);
    };

    const handleRenewSubscription = async () => {
        setProcessingPayment(true);
        setError(null);
        setSuccess(null);

        try {
            // Appel à l'API backend pour initier le paiement CinetPay
            const response = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/cinetpay/initiate_subscription_payment/', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    duration_months: selectedDuration
                }),
            });

            if (response.ok) {
                const data = await response.json();

                if (data.success && data.payment_url) {
                    // Redirection vers CinetPay (ou page de succès en mode test)
                    setSuccess(`Redirection vers le paiement de ${data.amount} FCFA...`);
                    setTimeout(() => {
                        window.location.href = data.payment_url;
                    }, 1500);
                } else {
                    setError(data.error || 'Erreur: URL de paiement non reçue');
                }
            } else {
                const errorData = await response.json();

                // Gestion spécifique des erreurs
                if (errorData.error && errorData.error.includes("abonnement actif")) {
                    setError("Vous avez déjà un abonnement actif. Vous ne pouvez pas souscrire à un nouvel abonnement tant que l'actuel est valide.");
                } else {
                    setError(errorData.error || 'Erreur lors de l\'initiation du paiement.');
                }
            }
        } catch (err) {
            console.error('Erreur lors de l\'initiation du paiement:', err);
            setError('Erreur réseau lors de l\'initiation du paiement.');
        } finally {
            setProcessingPayment(false);
        }
    };

    const downloadPaymentHistory = async () => {
        try {
            const response = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/payments/export/', {
                method: 'GET'
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `historique_paiements_${new Date().toISOString().split('T')[0]}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                setSuccess('Historique des paiements téléchargé avec succès !');
            } else {
                setError('Erreur lors du téléchargement de l\'historique');
            }
        } catch (err) {
            setError('Erreur réseau lors du téléchargement');
        }
    };

    const openNotificationModal = (notificationData: any) => {
        setSelectedNotification(notificationData);
        setShowNotificationModal(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800';
            case 'expired': return 'bg-red-100 text-red-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="h-4 w-4" />;
            case 'expired': return <AlertTriangle className="h-4 w-4" />;
            case 'pending': return <Clock className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'completed': return 'bg-green-100 text-green-800';
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'failed': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(amount);
    };

    const daysUntilExpiry = subscription ?
        Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-32 bg-gray-200 rounded mb-4"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    if (error && !subscription) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {refreshing ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Réessayer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* En-tête avec bouton de rafraîchissement */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Gestion de l'Abonnement</h2>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                    {refreshing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Messages d'erreur et de succès */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                        <p className="text-green-800">{success}</p>
                    </div>
                </div>
            )}

            {/* Statut de l'abonnement */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <CreditCard className="h-5 w-5 mr-2 text-blue-600" />
                        Statut de l'abonnement
                    </h3>
                    {subscription && (
                        <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center ${getStatusColor(subscription.status)}`}>
                            {getStatusIcon(subscription.status)}
                            <span className="ml-1">{subscription.status === 'active' ? 'Actif' : subscription.status === 'expired' ? 'Expiré' : 'En attente'}</span>
                        </span>
                    )}
                </div>

                {subscription ? (
                    <>
                        <div className={`rounded-lg p-4 ${daysUntilExpiry <= 7 ? 'bg-red-50' : 'bg-yellow-50'}`}>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className={`text-sm font-medium ${daysUntilExpiry <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>
                                        {daysUntilExpiry > 0 ? 'Jours restants' : 'Expiré depuis'}
                                    </p>
                                    <p className={`text-lg font-bold ${daysUntilExpiry <= 7 ? 'text-red-800' : 'text-yellow-800'}`}>
                                        {Math.abs(daysUntilExpiry)} jours
                                    </p>
                                </div>
                                <Clock className={`h-8 w-8 ${daysUntilExpiry <= 7 ? 'text-red-600' : 'text-yellow-600'}`} />
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <p className="text-sm text-gray-600">Plan</p>
                                <p className="font-semibold">{subscription.plan_name}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Montant</p>
                                <p className="font-semibold">{formatCurrency(subscription.amount)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Date de début</p>
                                <p className="font-semibold">{formatDate(subscription.start_date)}</p>
                            </div>
                            <div>
                                <p className="text-sm text-gray-600">Date d'expiration</p>
                                <p className="font-semibold">{formatDate(subscription.end_date)}</p>
                            </div>
                        </div>

                        {/* Avertissement si expiration proche */}
                        {daysUntilExpiry <= 7 && daysUntilExpiry > 0 && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                                    <div>
                                        <p className="text-red-800 font-semibold">Attention : Expiration proche</p>
                                        <p className="text-red-700 text-sm">
                                            Votre abonnement expire dans {daysUntilExpiry} jour{daysUntilExpiry > 1 ? 's' : ''}.
                                            Renouvelez-le pour continuer à recevoir des demandes.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Message si expiré */}
                        {daysUntilExpiry < 0 && (
                            <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                                    <div>
                                        <p className="text-red-800 font-semibold">Abonnement expiré</p>
                                        <p className="text-red-700 text-sm">
                                            Votre abonnement a expiré. Vous ne recevez plus de nouvelles demandes.
                                            Renouvelez-le pour reprendre votre activité.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="text-center py-8">
                        <CreditCard className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-500 mb-4">Aucun abonnement actif</p>
                        <button
                            onClick={() => setShowRenewModal(true)}
                            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Souscrire un abonnement
                        </button>
                    </div>
                )}
            </div>

            {/* Historique des paiements */}
            {payments.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                            <DollarSign className="h-5 w-5 mr-2 text-green-600" />
                            Historique des paiements
                        </h3>
                        <button
                            onClick={downloadPaymentHistory}
                            className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                        >
                            <Download className="h-4 w-4 mr-2" />
                            Exporter
                        </button>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Date
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Montant
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Méthode
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Statut
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Transaction
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                        Détails
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {payments.slice(0, 10).map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {formatDate(payment.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                                            {formatCurrency(payment.amount)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {payment.payment_method}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPaymentStatusColor(payment.status)}`}>
                                                {payment.status === 'completed' ? 'Terminé' : payment.status === 'pending' ? 'En cours' : 'Échoué'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.transaction_id || 'N/A'}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {payment.notification_data ? (
                                                <button
                                                    onClick={() => openNotificationModal(payment.notification_data)}
                                                    className="inline-flex items-center px-2 py-1 text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded"
                                                    title="Voir la notification CinetPay"
                                                >
                                                    <FileText className="h-3 w-3 mr-1" />
                                                    Notification
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-xs">N/A</span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {payments.length > 10 && (
                        <div className="mt-4 text-center">
                            <button
                                onClick={() => setShowPaymentHistory(true)}
                                className="text-blue-600 hover:text-blue-700 text-sm"
                            >
                                Voir tous les paiements ({payments.length})
                            </button>
                        </div>
                    )}
                </div>
            )}

            {/* Bouton de renouvellement */}
            {subscription && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Renouveler l'abonnement</h3>
                    <button
                        onClick={() => setShowRenewModal(true)}
                        disabled={processingPayment}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                        {processingPayment ? 'Traitement...' : 'Renouveler maintenant'}
                    </button>
                </div>
            )}

            {/* Modal de renouvellement */}
            {showRenewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold text-gray-800 mb-4">Choisir un abonnement</h3>

                        {/* Informations sur les tarifs */}
                        <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                            <p className="text-sm text-blue-800">
                                <strong>Tarif : 5000 FCFA/mois</strong><br />
                                Accès premium aux demandes de réparation
                            </p>
                        </div>

                        <div className="space-y-3 mb-4">
                            {durationOptions.map((option) => (
                                <label key={option.value} className="flex items-center p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
                                    <input
                                        type="radio"
                                        name="duration"
                                        value={option.value}
                                        checked={selectedDuration === option.value}
                                        onChange={(e) => setSelectedDuration(Number(e.target.value))}
                                        className="mr-3"
                                    />
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">{option.label}</span>
                                            <span className="font-bold text-blue-600">{formatCurrency(option.price)}</span>
                                        </div>
                                        <p className="text-xs text-gray-600 mt-1">{option.description}</p>
                                        {option.popular && (
                                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                                                Populaire
                                            </span>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>

                        <div className="mb-4 p-3 bg-yellow-50 rounded-lg">
                            <p className="text-sm text-yellow-800">
                                <strong>Paiement sécurisé via CinetPay</strong><br />
                                Orange Money, Moov Money, Cartes bancaires
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowRenewModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleRenewSubscription}
                                disabled={processingPayment}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center"
                            >
                                {processingPayment ? (
                                    <>
                                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                        Traitement...
                                    </>
                                ) : (
                                    <>
                                        <ExternalLink className="h-4 w-4 mr-2" />
                                        Payer maintenant
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de notification brute */}
            {showNotificationModal && selectedNotification && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                                <FileText className="h-5 w-5 mr-2 text-blue-600" />
                                Notification CinetPay
                            </h3>
                            <button
                                onClick={() => setShowNotificationModal(false)}
                                className="text-gray-400 hover:text-gray-600"
                            >
                                <X className="h-6 w-6" />
                            </button>
                        </div>

                        <div className="bg-gray-50 rounded-lg p-4">
                            <h4 className="text-sm font-medium text-gray-700 mb-2">Données brutes reçues de CinetPay :</h4>
                            <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap">
                                {JSON.stringify(selectedNotification, null, 2)}
                            </pre>
                        </div>

                        <div className="mt-4 flex justify-end">
                            <button
                                onClick={() => setShowNotificationModal(false)}
                                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                            >
                                Fermer
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPanel; 