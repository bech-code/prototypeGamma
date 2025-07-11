import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { CheckCircle, X, AlertTriangle, Eye, RefreshCw, Clock, User, DollarSign, Calendar, Check, XCircle, TrendingUp, BarChart3, Filter, Download, Plus, Search, CreditCard, Users, Activity } from 'lucide-react';

interface SubscriptionPaymentRequest {
    id: number;
    technician: {
        id: number;
        user: {
            first_name: string;
            last_name: string;
            email: string;
        };
    };
    technician_name: string;
    amount: number;
    duration_months: number;
    payment_method: string;
    description: string;
    status: 'pending' | 'approved' | 'rejected' | 'cancelled';
    validated_by?: {
        first_name: string;
        last_name: string;
    };
    validated_at?: string;
    validation_notes?: string;
    created_at: string;
}

interface CinetPayPayment {
    id: number;
    transaction_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'success' | 'failed' | 'cancelled';
    customer_name: string;
    customer_email: string;
    description: string;
    created_at: string;
    paid_at?: string;
    user: {
        id: number;
        username: string;
        email: string;
        first_name: string;
        last_name: string;
    };
}

interface DashboardStats {
    subscriptions: {
        total: number;
        active: number;
        expired: number;
        recent: number;
    };
    payment_requests: {
        total: number;
        pending: number;
        approved: number;
        recent: number;
    };
    payments: {
        total: number;
        successful: number;
        total_amount: number;
    };
}

const AdminSubscriptionRequests: React.FC = () => {
    const [requests, setRequests] = useState<SubscriptionPaymentRequest[]>([]);
    const [payments, setPayments] = useState<CinetPayPayment[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<SubscriptionPaymentRequest | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [processingAction, setProcessingAction] = useState<number | null>(null);
    const [actionNotes, setActionNotes] = useState('');
    const [stats, setStats] = useState<DashboardStats | null>(null);
    const [activeTab, setActiveTab] = useState<'requests' | 'payments' | 'stats'>('requests');
    const [filters, setFilters] = useState({
        status: 'all',
        days: 30,
        technician: '',
        paymentStatus: 'all'
    });

    useEffect(() => {
        loadData();
    }, [filters]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError(null);

            // Charger les demandes récentes
            try {
                const requestsResponse = await fetchWithAuth(
                    `/depannage/api/subscription-requests/recent_requests/?days=${filters.days}&status=${filters.status === 'all' ? '' : filters.status}`
                );

                if (requestsResponse.ok) {
                    const requestsData = await requestsResponse.json();
                    // S'assurer que c'est un tableau
                    const requestsArray = Array.isArray(requestsData) ? requestsData :
                        Array.isArray(requestsData.results) ? requestsData.results : [];
                    setRequests(requestsArray);
                } else {
                    console.error('Erreur lors du chargement des demandes:', requestsResponse.status);
                    setRequests([]);
                }
            } catch (err) {
                console.error('Erreur lors du chargement des demandes:', err);
                setRequests([]);
            }

            // Charger les paiements CinetPay des techniciens
            try {
                const paymentsResponse = await fetchWithAuth(
                    `/depannage/api/subscription-requests/technician_payments/?days=${filters.days}&status=${filters.paymentStatus === 'all' ? '' : filters.paymentStatus}`
                );

                if (paymentsResponse.ok) {
                    const paymentsData = await paymentsResponse.json();
                    // S'assurer que c'est un tableau
                    const paymentsArray = Array.isArray(paymentsData) ? paymentsData :
                        Array.isArray(paymentsData.results) ? paymentsData.results : [];
                    setPayments(paymentsArray);
                } else {
                    console.error('Erreur lors du chargement des paiements:', paymentsResponse.status);
                    setPayments([]);
                }
            } catch (err) {
                console.error('Erreur lors du chargement des paiements:', err);
                setPayments([]);
            }

            // Charger les statistiques du dashboard
            try {
                const statsResponse = await fetchWithAuth('/depannage/api/subscription-requests/dashboard_stats/');
                if (statsResponse.ok) {
                    const statsData = await statsResponse.json();
                    setStats(statsData);
                } else {
                    console.error('Erreur lors du chargement des statistiques:', statsResponse.status);
                    setStats(null);
                }
            } catch (err) {
                console.error('Erreur lors du chargement des statistiques:', err);
                setStats(null);
            }

        } catch (err) {
            setError('Erreur de connexion');
            console.error('Erreur générale lors du chargement:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId: number, action: 'approve' | 'reject') => {
        setProcessingAction(requestId);
        try {
            const response = await fetchWithAuth(`/depannage/api/subscription-requests/${requestId}/validate_payment/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    action,
                    notes: actionNotes
                }),
            });

            if (response.ok) {
                const data = await response.json();
                alert(data.message);
                loadData(); // Rafraîchir les données
                setShowDetailModal(false);
                setSelectedRequest(null);
                setActionNotes('');
            } else {
                const errorData = await response.json();
                alert(errorData.error || 'Erreur lors de la validation');
            }
        } catch (err) {
            alert('Erreur de connexion');
        } finally {
            setProcessingAction(null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'approved': return 'bg-green-100 text-green-800';
            case 'rejected': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'approved': return <CheckCircle className="h-4 w-4" />;
            case 'rejected': return <XCircle className="h-4 w-4" />;
            case 'cancelled': return <X className="h-4 w-4" />;
            default: return <Clock className="h-4 w-4" />;
        }
    };

    const getPaymentStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'success': return 'bg-green-100 text-green-800';
            case 'failed': return 'bg-red-100 text-red-800';
            case 'cancelled': return 'bg-gray-100 text-gray-800';
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

    const exportData = async (type: 'requests' | 'payments') => {
        try {
            const data = type === 'requests' ? requests : payments;

            // Vérifier que les données sont un tableau valide
            if (!Array.isArray(data) || data.length === 0) {
                alert(`Aucune donnée à exporter pour ${type === 'requests' ? 'les demandes' : 'les paiements'}`);
                return;
            }

            const headers = type === 'requests'
                ? ['ID', 'Technicien', 'Montant', 'Durée', 'Méthode', 'Statut', 'Date']
                : ['ID', 'Transaction', 'Montant', 'Client', 'Statut', 'Date'];

            const rows = data.map(item => {
                if (type === 'requests') {
                    return [
                        item.id,
                        `${item.technician?.user?.first_name || ''} ${item.technician?.user?.last_name || ''}`,
                        formatCurrency(item.amount || 0),
                        `${item.duration_months || 0} mois`,
                        item.payment_method || '',
                        item.status || '',
                        formatDate(item.created_at || new Date().toISOString())
                    ];
                } else {
                    return [
                        item.id,
                        item.transaction_id || '',
                        formatCurrency(item.amount || 0),
                        `${item.user?.first_name || ''} ${item.user?.last_name || ''}`,
                        item.status || '',
                        formatDate(item.created_at || new Date().toISOString())
                    ];
                }
            });

            const csvContent = [headers, ...rows]
                .map(row => row.map(cell => `"${cell}"`).join(','))
                .join('\n');

            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `${type}_subscription_data.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        } catch (error) {
            console.error('Erreur lors de l\'export:', error);
            alert('Erreur lors de l\'export');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Gestion des Abonnements</h1>
                            <p className="mt-2 text-gray-600">
                                Gérer les demandes de paiement d'abonnement et les paiements CinetPay des techniciens
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={loadData}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Actualiser
                            </button>
                            <button
                                onClick={() => exportData(activeTab === 'requests' ? 'requests' : 'payments')}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <Download className="h-4 w-4 mr-2" />
                                Exporter
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                        <div className="flex items-center">
                            <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                            <p className="text-red-800">{error}</p>
                        </div>
                    </div>
                )}

                {/* Statistiques */}
                {stats && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <Users className="h-8 w-8 text-blue-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Abonnements actifs</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.subscriptions.active}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <Clock className="h-8 w-8 text-yellow-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Demandes en attente</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.payment_requests.pending}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <CreditCard className="h-8 w-8 text-green-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Paiements réussis</p>
                                    <p className="text-2xl font-bold text-gray-900">{stats.payments.successful}</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-white rounded-lg shadow p-6">
                            <div className="flex items-center">
                                <DollarSign className="h-8 w-8 text-purple-600" />
                                <div className="ml-4">
                                    <p className="text-sm font-medium text-gray-600">Montant total</p>
                                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.payments.total_amount)}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Filtres */}
                <div className="bg-white rounded-lg shadow p-6 mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-lg font-semibold">Filtres</h2>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setActiveTab('requests')}
                                className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'requests'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                    }`}
                            >
                                Demandes
                            </button>
                            <button
                                onClick={() => setActiveTab('payments')}
                                className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'payments'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                    }`}
                            >
                                Paiements
                            </button>
                            <button
                                onClick={() => setActiveTab('stats')}
                                className={`px-4 py-2 rounded-md text-sm font-medium ${activeTab === 'stats'
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-200 text-gray-700'
                                    }`}
                            >
                                Statistiques
                            </button>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                            <select
                                value={filters.days}
                                onChange={(e) => setFilters({ ...filters, days: parseInt(e.target.value) })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value={7}>7 derniers jours</option>
                                <option value={30}>30 derniers jours</option>
                                <option value={90}>90 derniers jours</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                            <select
                                value={filters.status}
                                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="pending">En attente</option>
                                <option value="approved">Approuvé</option>
                                <option value="rejected">Rejeté</option>
                                <option value="cancelled">Annulé</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Statut paiement</label>
                            <select
                                value={filters.paymentStatus}
                                onChange={(e) => setFilters({ ...filters, paymentStatus: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="pending">En attente</option>
                                <option value="success">Réussi</option>
                                <option value="failed">Échoué</option>
                                <option value="cancelled">Annulé</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                            <input
                                type="text"
                                placeholder="Nom technicien..."
                                value={filters.technician}
                                onChange={(e) => setFilters({ ...filters, technician: e.target.value })}
                                className="w-full border border-gray-300 rounded-md px-3 py-2"
                            />
                        </div>
                    </div>
                </div>

                {/* Contenu des onglets */}
                {activeTab === 'requests' && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">Demandes de Paiement d'Abonnement</h3>
                        </div>
                        <div className="overflow-x-auto">
                            {requests.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    Aucune demande trouvée.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Technicien
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Montant
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Durée
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Statut
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {Array.isArray(requests) && requests.length > 0 ? (
                                            requests.map((request) => (
                                                <tr key={request.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <User className="h-8 w-8 text-gray-400 mr-3" />
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {request.technician.user.first_name} {request.technician.user.last_name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">{request.technician.user.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{formatCurrency(request.amount)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm text-gray-900">{request.duration_months} mois</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                            {getStatusIcon(request.status)}
                                                            <span className="ml-1">{request.status}</span>
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(request.created_at)}
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                        <div className="flex space-x-2">
                                                            <button
                                                                onClick={() => {
                                                                    setSelectedRequest(request);
                                                                    setShowDetailModal(true);
                                                                }}
                                                                className="text-blue-600 hover:text-blue-900"
                                                            >
                                                                <Eye className="h-4 w-4" />
                                                            </button>
                                                            {request.status === 'pending' && (
                                                                <>
                                                                    <button
                                                                        onClick={() => handleAction(request.id, 'approve')}
                                                                        disabled={processingAction === request.id}
                                                                        className="text-green-600 hover:text-green-900"
                                                                    >
                                                                        <Check className="h-4 w-4" />
                                                                    </button>
                                                                    <button
                                                                        onClick={() => handleAction(request.id, 'reject')}
                                                                        disabled={processingAction === request.id}
                                                                        className="text-red-600 hover:text-red-900"
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={6} className="px-6 py-8 text-center text-gray-500">
                                                    {loading ? 'Chargement...' : 'Aucune demande trouvée.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'payments' && (
                    <div className="bg-white rounded-lg shadow">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">Paiements CinetPay des Techniciens</h3>
                        </div>
                        <div className="overflow-x-auto">
                            {payments.length === 0 ? (
                                <div className="p-8 text-center text-gray-500">
                                    Aucun paiement trouvé.
                                </div>
                            ) : (
                                <table className="min-w-full divide-y divide-gray-200">
                                    <thead className="bg-gray-50">
                                        <tr>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Technicien
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Transaction
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Montant
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Statut
                                            </th>
                                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                                Date
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {Array.isArray(payments) && payments.length > 0 ? (
                                            payments.map((payment) => (
                                                <tr key={payment.id} className="hover:bg-gray-50">
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <User className="h-8 w-8 text-gray-400 mr-3" />
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">
                                                                    {payment.user.first_name} {payment.user.last_name}
                                                                </div>
                                                                <div className="text-sm text-gray-500">{payment.user.email}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-mono text-gray-900">{payment.transaction_id}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="text-sm font-medium text-gray-900">{formatCurrency(payment.amount)}</div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getPaymentStatusColor(payment.status)}`}>
                                                            {payment.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                        {formatDate(payment.created_at)}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                                    {loading ? 'Chargement...' : 'Aucun paiement trouvé.'}
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'stats' && stats && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h3 className="text-lg font-semibold mb-6">Statistiques Détaillées</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="bg-blue-50 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-blue-900 mb-4">Abonnements</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Total:</span>
                                        <span className="font-semibold">{stats.subscriptions?.total || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Actifs:</span>
                                        <span className="font-semibold text-green-600">{stats.subscriptions?.active || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Expirés:</span>
                                        <span className="font-semibold text-red-600">{stats.subscriptions?.expired || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Récents (7j):</span>
                                        <span className="font-semibold text-blue-600">{stats.subscriptions?.recent || 0}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-yellow-50 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-yellow-900 mb-4">Demandes de Paiement</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Total:</span>
                                        <span className="font-semibold">{stats.requests?.total || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>En attente:</span>
                                        <span className="font-semibold text-yellow-600">{stats.requests?.pending || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Approuvées:</span>
                                        <span className="font-semibold text-green-600">{stats.requests?.approved || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Récentes (7j):</span>
                                        <span className="font-semibold text-blue-600">{stats.requests?.recent || 0}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-green-50 rounded-lg p-6">
                                <h4 className="text-lg font-semibold text-green-900 mb-4">Paiements</h4>
                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <span>Total:</span>
                                        <span className="font-semibold">{stats.payments?.total || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Réussis:</span>
                                        <span className="font-semibold text-green-600">{stats.payments?.successful || 0}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span>Montant total:</span>
                                        <span className="font-semibold text-green-600">{formatCurrency(stats.payments.total_amount)}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Modal de détails */}
            {showDetailModal && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                            onClick={() => setShowDetailModal(false)}
                        >
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-2xl font-bold mb-4">Détails de la Demande</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700">Technicien</label>
                                <p className="text-sm text-gray-900">
                                    {selectedRequest.technician.user.first_name} {selectedRequest.technician.user.last_name}
                                </p>
                                <p className="text-sm text-gray-500">{selectedRequest.technician.user.email}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Montant</label>
                                <p className="text-lg font-semibold text-gray-900">{formatCurrency(selectedRequest.amount)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Durée</label>
                                <p className="text-sm text-gray-900">{selectedRequest.duration_months} mois</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Méthode de paiement</label>
                                <p className="text-sm text-gray-900">{selectedRequest.payment_method}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700">Statut</label>
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedRequest.status)}`}>
                                    {getStatusIcon(selectedRequest.status)}
                                    <span className="ml-1">{selectedRequest.status}</span>
                                </span>
                            </div>

                            {selectedRequest.status === 'pending' && (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Notes de validation</label>
                                    <textarea
                                        value={actionNotes}
                                        onChange={(e) => setActionNotes(e.target.value)}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2"
                                        rows={3}
                                        placeholder="Notes optionnelles..."
                                    />
                                </div>
                            )}
                        </div>

                        {selectedRequest.status === 'pending' && (
                            <div className="flex space-x-3 mt-6">
                                <button
                                    onClick={() => handleAction(selectedRequest.id, 'approve')}
                                    disabled={processingAction === selectedRequest.id}
                                    className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                    {processingAction === selectedRequest.id ? 'Approbation...' : 'Approuver'}
                                </button>
                                <button
                                    onClick={() => handleAction(selectedRequest.id, 'reject')}
                                    disabled={processingAction === selectedRequest.id}
                                    className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                                >
                                    {processingAction === selectedRequest.id ? 'Rejet...' : 'Rejeter'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptionRequests; 