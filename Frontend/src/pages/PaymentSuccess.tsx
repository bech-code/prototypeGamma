import React, { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { CheckCircle, AlertCircle, Clock, ExternalLink, Star, Shield, Zap, RefreshCw, XCircle } from "lucide-react";
import { fetchWithAuth } from "../contexts/fetchWithAuth";

interface PaymentSuccessProps { }

interface SubscriptionStatus {
    status: 'active' | 'warning' | 'critical' | 'expired';
    subscription: number | null;
    days_remaining: number;
    payments: any[];
    can_receive_requests: boolean;
}

const MAX_POLLING_ATTEMPTS = 10;

const PaymentSuccess: React.FC<PaymentSuccessProps> = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [subscriptionStatus, setSubscriptionStatus] = useState<SubscriptionStatus | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [pollingActive, setPollingActive] = useState(false);
    const [pollingCount, setPollingCount] = useState(0);
    const [activationMessage, setActivationMessage] = useState("Vérification de l'activation...");
    const [pollingFailed, setPollingFailed] = useState(false);
    const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

    const transactionId = searchParams.get('transaction_id');
    const amount = searchParams.get('amount');
    const status = searchParams.get('status');

    useEffect(() => {
        const timer = setTimeout(() => setLoading(false), 1000);
        return () => clearTimeout(timer);
    }, []);

    const checkSubscriptionStatus = async (): Promise<SubscriptionStatus | null> => {
        try {
            const response = await fetchWithAuth('/depannage/api/technicians/subscription_status/');
            if (response.ok) {
                const data = await response.json();
                return data;
            } else {
                return null;
            }
        } catch (error) {
            return null;
        }
    };

    const startPolling = () => {
        setPollingActive(true);
        setPollingCount(0);
        setPollingFailed(false);

        let attempts = 0;

        const poll = async () => {
            attempts += 1;
            setPollingCount(attempts);

            const status = await checkSubscriptionStatus();
            if (status) {
                setSubscriptionStatus(status);
                if (status.can_receive_requests && status.status === 'active') {
                    setPollingActive(false);
                    setActivationMessage("🎉 Abonnement activé avec succès !");
                    setTimeout(() => {
                        navigate('/technician/dashboard');
                    }, 2000);
                    return;
                }
                if (status.status === 'active') {
                    setActivationMessage("Activation en cours... Vérification de l'accès aux demandes...");
                } else if (status.status === 'warning') {
                    setActivationMessage("Activation en cours... Vérification des paramètres...");
                } else {
                    setActivationMessage("Activation en cours... Traitement du paiement...");
                }
            }

            if (attempts < MAX_POLLING_ATTEMPTS) {
                pollingIntervalRef.current = setTimeout(poll, 2000);
            } else {
                setPollingActive(false);
                setPollingFailed(true);
                setActivationMessage("L'activation prend plus de temps que prévu. Veuillez vérifier manuellement votre abonnement ou contacter le support.");
            }
        };

        poll();
    };

    useEffect(() => {
        if (status === 'success') {
            checkSubscriptionStatus().then(initialStatus => {
                if (initialStatus) {
                    setSubscriptionStatus(initialStatus);
                    if (initialStatus.can_receive_requests && initialStatus.status === 'active') {
                        setActivationMessage("🎉 Abonnement déjà actif !");
                        setTimeout(() => {
                            navigate('/technician/dashboard');
                        }, 2000);
                    } else {
                        startPolling();
                    }
                } else {
                    setError('Erreur lors de la vérification du statut d\'abonnement');
                }
            });
        } else {
            setError('Statut de paiement invalide');
        }
        return () => {
            if (pollingIntervalRef.current) {
                clearTimeout(pollingIntervalRef.current);
            }
        };
    }, [status, navigate]);

    const formatCurrency = (amount: string | null) => {
        if (!amount) return '0 FCFA';
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: 'XOF'
        }).format(parseInt(amount));
    };

    const getBenefits = () => [
        {
            icon: <Star className="w-5 h-5 text-yellow-500" />,
            title: 'Profil Premium',
            description: 'Votre profil sera mis en avant dans les recherches'
        },
        {
            icon: <Zap className="w-5 h-5 text-blue-500" />,
            title: 'Demandes Prioritaires',
            description: 'Recevez les nouvelles demandes en premier'
        },
        {
            icon: <Shield className="w-5 h-5 text-green-500" />,
            title: 'Support Prioritaire',
            description: 'Accès direct à notre équipe de support'
        }
    ];

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-green-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Traitement du paiement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 flex items-center justify-center p-4">
            <div className="max-w-4xl w-full bg-white rounded-2xl shadow-xl overflow-hidden">
                {error ? (
                    <div className="p-8 text-center">
                        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                        <h1 className="text-2xl font-bold text-red-700 mb-4">Erreur de Paiement</h1>
                        <p className="text-red-600 mb-6">{error}</p>
                        <button
                            onClick={() => navigate('/technician/dashboard')}
                            className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
                        >
                            Retour au Dashboard
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Header avec gradient */}
                        <div className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 p-8 text-white text-center">
                            <CheckCircle className="h-16 w-16 text-white mx-auto mb-4" />
                            <h1 className="text-3xl font-bold mb-2">🎉 Paiement Réussi !</h1>
                            <p className="text-xl opacity-90">
                                {subscriptionStatus?.can_receive_requests ? "Votre abonnement premium est maintenant actif" : "Votre abonnement premium est en cours d'activation"}
                            </p>
                        </div>

                        <div className="p-8">
                            {/* Détails de la transaction */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Détails de la Transaction</h3>
                                    <div className="space-y-3">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Montant payé :</span>
                                            <span className="font-semibold text-green-600">{formatCurrency(amount)}</span>
                                        </div>
                                        {transactionId && (
                                            <div className="flex justify-between">
                                                <span className="text-gray-600">Transaction :</span>
                                                <span className="text-sm bg-gray-200 px-2 py-1 rounded">{transactionId}</span>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="bg-blue-50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-blue-900 mb-4">Statut de l'Abonnement</h3>
                                    <div className="space-y-4">
                                        {/* Affichage conditionnel selon l'état */}
                                        {pollingFailed ? (
                                            <div className="flex items-center space-x-3 mb-2">
                                                <XCircle className="w-5 h-5 text-orange-500" />
                                                <span className="font-medium text-orange-700">{activationMessage}</span>
                                            </div>
                                        ) : subscriptionStatus?.can_receive_requests ? (
                                            <div className="flex items-center space-x-3 mb-2">
                                                <CheckCircle className="w-5 h-5 text-green-500" />
                                                <span className="font-medium text-green-700">Abonnement actif</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center space-x-3 mb-2">
                                                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                                                <span className="font-medium text-blue-700">{activationMessage}</span>
                                            </div>
                                        )}
                                        {/* Compteur de tentatives */}
                                        {pollingActive && !pollingFailed && (
                                            <div className="text-sm text-gray-600">
                                                Tentative {Math.min(pollingCount, MAX_POLLING_ATTEMPTS)}/{MAX_POLLING_ATTEMPTS} - Vérification automatique...
                                            </div>
                                        )}
                                        {/* Statut détaillé */}
                                        {subscriptionStatus && (
                                            <div className="text-sm text-gray-600">
                                                {subscriptionStatus.days_remaining > 0 ? (
                                                    <span>Expire dans {subscriptionStatus.days_remaining} jour(s)</span>
                                                ) : (
                                                    <span>Abonnement actif</span>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Avantages de l'abonnement */}
                            <div className="mb-8">
                                <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vos Avantages Premium</h2>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    {getBenefits().map((benefit, index) => (
                                        <div key={index} className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300">
                                            <div className="flex items-start space-x-4">
                                                <div className="flex-shrink-0">
                                                    {benefit.icon}
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                                                    <p className="text-gray-600 text-sm">{benefit.description}</p>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex flex-col sm:flex-row gap-4">
                                {subscriptionStatus?.can_receive_requests && !pollingActive && !pollingFailed && (
                                    <div className="flex items-center justify-center text-green-600 mb-4 animate-pulse">
                                        <CheckCircle className="h-5 w-5 mr-2" />
                                        <span>Redirection vers votre tableau de bord dans quelques secondes...</span>
                                    </div>
                                )}
                                {!pollingActive && pollingFailed && (
                                    <div className="flex items-center justify-center text-orange-600 mb-4">
                                        <XCircle className="h-5 w-5 mr-2" />
                                        <span>L'activation a pris trop de temps. Veuillez vérifier manuellement ou contacter le support.</span>
                                    </div>
                                )}
                                <button
                                    onClick={() => navigate('/technician/dashboard')}
                                    className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                                >
                                    <span>Accéder au Dashboard</span>
                                    <ExternalLink className="w-5 h-5" />
                                </button>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
};

export default PaymentSuccess; 