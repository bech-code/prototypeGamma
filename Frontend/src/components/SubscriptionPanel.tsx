import React, { useState, useEffect } from 'react';
import { CreditCard, Calendar, DollarSign, AlertTriangle, CheckCircle, Clock, Download, Eye, EyeOff } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface Payment {
    id: number;
    amount: number;
    status: 'pending' | 'completed' | 'failed';
    payment_method: string;
    created_at: string;
    transaction_id?: string;
}

interface Subscription {
    id: number;
    plan_name: string;
    start_date: string;
    end_date: string;
    is_active: boolean;
    amount: number;
    status: 'active' | 'expired' | 'pending';
}

interface SubscriptionPanelProps {
    technicianId: number;
}

const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({ technicianId }) => {
    const [subscription, setSubscription] = useState<Subscription | null>(null);
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [showPaymentHistory, setShowPaymentHistory] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState<'mobile_money' | 'card'>('mobile_money');
    const [phoneNumber, setPhoneNumber] = useState('');
    const [processingPayment, setProcessingPayment] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedDuration, setSelectedDuration] = useState(1);
    const [showRenewModal, setShowRenewModal] = useState(false);

    const durationOptions = [
        { value: 1, label: '1 mois', price: 5000, savings: 0 },
        { value: 3, label: '3 mois', price: 15000, savings: 0 },
        { value: 6, label: '6 mois', price: 30000, savings: 0 }
    ];

    useEffect(() => {
        fetchSubscriptionData();
    }, [technicianId]);

    const fetchSubscriptionData = async () => {
        try {
            setLoading(true);

            // Récupérer l'abonnement actuel
            const subResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/technicians/renew_subscription/', {
                method: 'GET'
            });

            if (subResponse.ok) {
                const subData = await subResponse.json();
                setSubscription(subData.subscription);
            }

            // Récupérer l'historique des paiements
            const paymentsResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/payments/', {
                method: 'GET'
            });

            if (paymentsResponse.ok) {
                const paymentsData = await paymentsResponse.json();
                setPayments(paymentsData.results || paymentsData || []);
            }
        } catch (err) {
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const handleRenewSubscription = async () => {
        setLoading(true);
        setError(null);
        setSuccess(null);

        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://127.0.0.1:8000/depannage/api/cinetpay/initiate_subscription_payment/', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    duration_months: selectedDuration
                }),
            });

            if (response.ok) {
                const data = await response.json();
                if (data.payment_url) {
                    // Afficher un message de confirmation avant redirection
                    setSuccess(`Redirection vers CinetPay pour payer ${data.amount} FCFA...`);
                    setTimeout(() => {
                        window.location.href = data.payment_url;
                    }, 2000);
                } else {
                    setError('Erreur lors de la génération du paiement.');
                }
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors du renouvellement.');
            }
        } catch (e) {
            setError('Erreur lors du renouvellement.');
        } finally {
            setLoading(false);
        }
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

    const daysUntilExpiry = subscription ?
        Math.ceil((new Date(subscription.end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)) : 0;

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
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
                                    <p className={`text-sm font-medium ${daysUntilExpiry <= 7 ? 'text-red-600' : 'text-yellow-600'}`}>{daysUntilExpiry > 0 ? 'Jours restants' : 'Expiré depuis'}</p>
                                    <p className={`text-lg font-bold ${daysUntilExpiry <= 7 ? 'text-red-800' : 'text-yellow-800'}`}>{Math.abs(daysUntilExpiry)} jours</p>
                                </div>
                                <Clock className={`h-8 w-8 ${daysUntilExpiry <= 7 ? 'text-red-600' : 'text-yellow-600'}`} />
                            </div>
                        </div>

                        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
                        <p className="text-gray-500">Aucun abonnement actif</p>
                    </div>
                )}
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Actions</h3>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={() => setShowRenewModal(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors"
                        disabled={processingPayment}
                    >
                        <CreditCard className="h-4 w-4 mr-2" />
                        {processingPayment ? 'Traitement...' : 'Renouveler l\'abonnement'}
                    </button>

                    <button
                        onClick={() => setShowPaymentHistory(!showPaymentHistory)}
                        className="inline-flex items-center px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        {showPaymentHistory ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                        {showPaymentHistory ? 'Masquer' : 'Voir'} l'historique
                    </button>

                    <button
                        onClick={() => {
                            // Télécharger le reçu
                            const receiptData = subscription ? {
                                plan: subscription.plan_name,
                                amount: subscription.amount,
                                startDate: subscription.start_date,
                                endDate: subscription.end_date
                            } : null;

                            if (receiptData) {
                                const receipt = `
                  Reçu d'abonnement
                  =================
                  Plan: ${receiptData.plan}
                  Montant: ${receiptData.amount} FCFA
                  Période: ${formatDate(receiptData.startDate)} - ${formatDate(receiptData.endDate)}
                  Statut: ${subscription?.is_active ? 'Actif' : 'Inactif'}
                `;

                                const blob = new Blob([receipt], { type: 'text/plain' });
                                const url = URL.createObjectURL(blob);
                                const a = document.createElement('a');
                                a.href = url;
                                a.download = `abonnement_${new Date().toISOString().split('T')[0]}.txt`;
                                a.click();
                                URL.revokeObjectURL(url);
                            }
                        }}
                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger le reçu
                    </button>
                </div>
            </div>

            {/* Historique des paiements */}
            {showPaymentHistory && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Historique des paiements</h3>
                    {payments.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <CreditCard className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>Aucun paiement trouvé</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((payment) => (
                                <div key={payment.id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="font-semibold">{payment.amount} FCFA</p>
                                            <p className="text-sm text-gray-600">
                                                {payment.payment_method} • {formatDate(payment.created_at)}
                                            </p>
                                            {payment.transaction_id && (
                                                <p className="text-xs text-gray-500">ID: {payment.transaction_id}</p>
                                            )}
                                        </div>
                                        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getPaymentStatusColor(payment.status)}`}>
                                            {payment.status === 'completed' ? 'Payé' :
                                                payment.status === 'pending' ? 'En cours' : 'Échoué'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* Messages d'erreur et de succès */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-800">{error}</p>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-green-800">{success}</p>
                </div>
            )}

            {/* Modal de paiement */}
            {showRenewModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">Choisir votre abonnement</h3>

                        <div className="space-y-3 mb-6">
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
                                        <div className="font-medium">{option.label}</div>
                                        <div className="text-sm text-gray-600">{option.price.toLocaleString()} FCFA</div>
                                    </div>
                                    {option.savings > 0 && (
                                        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                            Économisez {option.savings} FCFA
                                        </div>
                                    )}
                                </label>
                            ))}
                        </div>

                        <div className="bg-gray-50 p-3 rounded-lg mb-4">
                            <p className="text-sm text-gray-600">
                                <strong>Total à payer :</strong> {durationOptions.find(o => o.value === selectedDuration)?.price.toLocaleString()} FCFA
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                                Paiement sécurisé via CinetPay
                            </p>
                        </div>

                        <div className="flex space-x-3">
                            <button
                                onClick={() => setShowRenewModal(false)}
                                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleRenewSubscription}
                                disabled={loading}
                                className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {loading ? 'Traitement...' : 'Payer maintenant'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SubscriptionPanel; 