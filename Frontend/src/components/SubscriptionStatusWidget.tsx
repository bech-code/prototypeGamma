import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle, AlertTriangle, Clock, RefreshCw, Crown, Zap, Shield } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface SubscriptionStatus {
    status: 'active' | 'warning' | 'critical' | 'expired';
    subscription: number | null;
    days_remaining: number;
    can_receive_requests: boolean;
    is_active: boolean;
    subscription_details?: {
        plan_name: string;
        start_date: string;
        end_date: string;
    };
}

interface SubscriptionStatusWidgetProps {
    autoRefresh?: boolean;
    refreshInterval?: number; // en millisecondes
    showDetails?: boolean;
}

const SubscriptionStatusWidget: React.FC<SubscriptionStatusWidgetProps> = ({
    autoRefresh = true,
    refreshInterval = 30000, // 30 secondes par défaut
    showDetails = true
}) => {
    const [subscription, setSubscription] = useState<SubscriptionStatus | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);

    const fetchSubscriptionStatus = async (): Promise<SubscriptionStatus | null> => {
        try {
            const response = await fetchWithAuth('/depannage/api/technicians/subscription_status/');

            if (response.ok) {
                const data = await response.json();
                setLastUpdate(new Date());
                return data;
            } else {
                console.error('Erreur lors de la vérification du statut:', response.status);
                return null;
            }
        } catch (error) {
            console.error('Erreur réseau lors de la vérification:', error);
            return null;
        }
    };

    const loadSubscriptionStatus = async (showLoading = true) => {
        if (showLoading) {
            setLoading(true);
        } else {
            setRefreshing(true);
        }

        setError(null);

        try {
            const status = await fetchSubscriptionStatus();
            if (status) {
                setSubscription(status);
            } else {
                setError('Impossible de récupérer le statut d\'abonnement');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    // Chargement initial
    useEffect(() => {
        loadSubscriptionStatus();
    }, []);

    // Polling automatique
    useEffect(() => {
        if (autoRefresh && refreshInterval > 0) {
            intervalRef.current = setInterval(() => {
                loadSubscriptionStatus(false);
            }, refreshInterval);

            return () => {
                if (intervalRef.current) {
                    clearInterval(intervalRef.current);
                }
            };
        }
    }, [autoRefresh, refreshInterval]);

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'active': return 'bg-green-100 text-green-800 border-green-200';
            case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
            case 'critical': return 'bg-red-100 text-red-800 border-red-200';
            case 'expired': return 'bg-gray-100 text-gray-800 border-gray-200';
            default: return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'active': return <CheckCircle className="h-5 w-5 text-green-600" />;
            case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-600" />;
            case 'critical': return <AlertTriangle className="h-5 w-5 text-red-600" />;
            case 'expired': return <Clock className="h-5 w-5 text-gray-600" />;
            default: return <Clock className="h-5 w-5 text-gray-600" />;
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'active': return 'Actif';
            case 'warning': return 'Expire bientôt';
            case 'critical': return 'Expire très bientôt';
            case 'expired': return 'Expiré';
            default: return 'Inconnu';
        }
    };

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleDateString('fr-FR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/3 mb-4"></div>
                    <div className="h-6 bg-gray-200 rounded w-1/2 mb-2"></div>
                    <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="bg-white rounded-lg shadow p-6">
            {/* En-tête avec bouton de rafraîchissement */}
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                    <Crown className="h-5 w-5 text-purple-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Statut de l'Abonnement</h3>
                </div>
                <button
                    onClick={() => loadSubscriptionStatus(false)}
                    disabled={refreshing}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50 transition-colors"
                    title="Actualiser le statut"
                >
                    {refreshing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Message d'erreur */}
            {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center">
                        <AlertTriangle className="h-4 w-4 text-red-600 mr-2" />
                        <span className="text-red-800 text-sm">{error}</span>
                    </div>
                </div>
            )}

            {/* Statut principal */}
            {subscription && (
                <div className="space-y-4">
                    {/* Badge de statut */}
                    <div className={`inline-flex items-center px-3 py-2 rounded-full border ${getStatusColor(subscription.status)}`}>
                        {getStatusIcon(subscription.status)}
                        <span className="ml-2 font-medium">{getStatusText(subscription.status)}</span>
                    </div>

                    {/* Statut de réception des demandes */}
                    <div className="flex items-center space-x-3">
                        {subscription.can_receive_requests ? (
                            <>
                                <Zap className="h-5 w-5 text-green-600" />
                                <span className="text-green-700 font-medium">Vous pouvez recevoir des demandes</span>
                            </>
                        ) : (
                            <>
                                <Shield className="h-5 w-5 text-red-600" />
                                <span className="text-red-700 font-medium">Accès aux demandes suspendu</span>
                            </>
                        )}
                    </div>

                    {/* Détails de l'abonnement */}
                    {showDetails && subscription.subscription_details && (
                        <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                            <h4 className="font-medium text-gray-900">Détails de l'abonnement</h4>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                                <div>
                                    <span className="text-gray-600">Plan :</span>
                                    <span className="ml-2 font-medium">{subscription.subscription_details.plan_name}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Début :</span>
                                    <span className="ml-2 font-medium">{formatDate(subscription.subscription_details.start_date)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Fin :</span>
                                    <span className="ml-2 font-medium">{formatDate(subscription.subscription_details.end_date)}</span>
                                </div>
                                <div>
                                    <span className="text-gray-600">Jours restants :</span>
                                    <span className={`ml-2 font-medium ${subscription.days_remaining <= 3 ? 'text-red-600' :
                                            subscription.days_remaining <= 7 ? 'text-yellow-600' :
                                                'text-green-600'
                                        }`}>
                                        {subscription.days_remaining} jour(s)
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Actions selon le statut */}
                    {subscription.status === 'expired' && (
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                                <div>
                                    <p className="text-yellow-800 font-medium">Abonnement expiré</p>
                                    <p className="text-yellow-700 text-sm">Renouvelez votre abonnement pour continuer à recevoir des demandes.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {subscription.status === 'warning' && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <Clock className="h-5 w-5 text-blue-600 mr-2" />
                                <div>
                                    <p className="text-blue-800 font-medium">Abonnement expirant</p>
                                    <p className="text-blue-700 text-sm">Votre abonnement expire dans {subscription.days_remaining} jour(s). Pensez à le renouveler.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dernière mise à jour */}
                    {lastUpdate && (
                        <div className="text-xs text-gray-500 text-center">
                            Dernière mise à jour : {lastUpdate.toLocaleTimeString('fr-FR')}
                        </div>
                    )}
                </div>
            )}

            {/* État sans abonnement */}
            {!subscription && !error && (
                <div className="text-center py-8">
                    <Clock className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucun abonnement trouvé</p>
                    <p className="text-gray-500 text-sm">Souscrivez à un abonnement pour commencer à recevoir des demandes.</p>
                </div>
            )}
        </div>
    );
};

export default SubscriptionStatusWidget; 