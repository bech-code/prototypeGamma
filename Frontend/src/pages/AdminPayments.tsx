import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../contexts/fetchWithAuth";
import { CheckCircle, X, AlertTriangle, Eye, RefreshCw, Download, Filter, Search, CreditCard, DollarSign, TrendingUp, Calendar, Info, User, Shield, Clock, FileText } from "lucide-react";
import ErrorToast from '../components/ErrorToast';

interface Payment {
    id: number;
    amount: number;
    currency: string;
    payment_method: string;
    status: 'pending' | 'completed' | 'failed' | 'refunded';
    payer_name: string;
    payer_email: string;
    recipient_name: string;
    recipient_email: string;
    description: string;
    transaction_id: string;
    created_at: string;
    updated_at: string;
    commission_amount?: number;
    platform_fee?: number;
    payment_gateway?: string;
    refund_reason?: string;
    notification_data?: any; // Ajout du champ notification_data
}

interface PaymentStats {
    total_payments: number;
    total_amount: number;
    completed_payments: number;
    pending_payments: number;
    failed_payments: number;
    refunded_payments: number;
    total_commission: number;
    average_payment: number;
    monthly_revenue: number;
    payment_methods: { [key: string]: number };
}

// Fonction utilitaire pour normaliser un user partiel en user complet
function normalizeUser(user: any) {
    return {
        id: typeof user?.id === 'number' ? user.id : 0,
        first_name: typeof user?.first_name === 'string' ? user.first_name : '',
        last_name: typeof user?.last_name === 'string' ? user.last_name : '',
        email: typeof user?.email === 'string' ? user.email : '',
        username: typeof user?.username === 'string' ? user.username : '',
    };
}

function AdminPayments() {
    const [payments, setPayments] = useState<Payment[]>([]);
    const [stats, setStats] = useState<PaymentStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [methodFilter, setMethodFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("all");
    const [amountFilter, setAmountFilter] = useState<string>("all");

    useEffect(() => {
        fetchPayments();
        fetchPaymentStats();
    }, []);

    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchPayments = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetchWithAuth("/depannage/api/payments/");
            if (response.ok) {
                const data = await response.json();
                setPayments(data.results || data);
                showToast('success', 'Paiements chargés avec succès');
            } else {
                let backendMsg = '';
                try {
                    const errData = await response.json();
                    backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                } catch { }
                setError(`Erreur lors du chargement des paiements (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
                showToast('error', `Erreur lors du chargement des paiements (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
            }
        } catch (err) {
            setError('Erreur de connexion lors du chargement des paiements.');
            showToast('error', 'Erreur de connexion lors du chargement des paiements.');
        } finally {
            setLoading(false);
        }
    };

    const fetchPaymentStats = async () => {
        try {
            const response = await fetchWithAuth("/depannage/api/payments/stats/");
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                let backendMsg = '';
                try {
                    const errData = await response.json();
                    backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                } catch { }
                setError(`Erreur lors du chargement des statistiques de paiement (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
                showToast('error', `Erreur lors du chargement des statistiques de paiement (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
            }
        } catch (error) {
            setError('Erreur lors du chargement des statistiques de paiement.');
            showToast('error', 'Erreur lors du chargement des statistiques de paiement.');
        }
    };

    const updatePaymentStatus = async (paymentId: number, status: string, refundReason?: string) => {
        try {
            const response = await fetchWithAuth(`/depannage/api/payments/${paymentId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status,
                    refund_reason: refundReason || undefined
                }),
            });

            if (response.ok) {
                const updatedPayment = await response.json();
                setPayments((prev) =>
                    prev.map((payment) =>
                        payment.id === paymentId ? { ...payment, ...updatedPayment } : payment
                    )
                );
                showToast('success', `Statut du paiement mis à jour avec succès`);
                fetchPaymentStats(); // Actualiser les stats
            } else {
                const errorData = await response.json();
                showToast('error', errorData.message || 'Erreur lors de la mise à jour');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de la mise à jour');
        }
    };

    const exportPayments = async () => {
        setExporting(true);
        try {
            const response = await fetchWithAuth("/depannage/api/payments/export/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status_filter: statusFilter,
                    method_filter: methodFilter,
                    date_filter: dateFilter,
                    amount_filter: amountFilter,
                    search_term: searchTerm
                }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `paiements-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('success', 'Export des paiements réussi');
            } else {
                showToast('error', 'Erreur lors de l\'export');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de l\'export');
        } finally {
            setExporting(false);
        }
    };

    const openDetailModal = (payment: Payment) => {
        setSelectedPayment(payment);
        setShowDetailModal(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'completed':
                return 'bg-green-100 text-green-800';
            case 'failed':
                return 'bg-red-100 text-red-800';
            case 'refunded':
                return 'bg-purple-100 text-purple-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'En attente';
            case 'completed':
                return 'Complété';
            case 'failed':
                return 'Échoué';
            case 'refunded':
                return 'Remboursé';
            default:
                return status;
        }
    };

    const getStatusCount = (status: string) => {
        return payments.filter(payment => payment.status === status).length;
    };

    const formatCurrency = (amount: number, currency: string = 'FCFA') => {
        return new Intl.NumberFormat('fr-FR', {
            style: 'currency',
            currency: currency === 'FCFA' ? 'XOF' : currency,
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
        }).format(amount);
    };

    const filteredPayments = payments.filter(payment => {
        const matchesSearch =
            (typeof payment.payer_name === 'string' && payment.payer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof payment.payer_email === 'string' && payment.payer_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof payment.recipient_name === 'string' && payment.recipient_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof payment.recipient_email === 'string' && payment.recipient_email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof payment.transaction_id === 'string' && payment.transaction_id.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof payment.description === 'string' && payment.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === "all" || payment.status === statusFilter;
        const matchesMethod = methodFilter === "all" || payment.payment_method === methodFilter;

        let matchesDate = true;
        if (dateFilter !== "all") {
            const paymentDate = new Date(payment.created_at);
            const now = new Date();
            const daysAgo = dateFilter === "7d" ? 7 : 30;
            const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            matchesDate = paymentDate >= cutoff;
        }

        let matchesAmount = true;
        if (amountFilter !== "all") {
            const amount = payment.amount;
            switch (amountFilter) {
                case "low":
                    matchesAmount = amount < 10000;
                    break;
                case "medium":
                    matchesAmount = amount >= 10000 && amount < 50000;
                    break;
                case "high":
                    matchesAmount = amount >= 50000;
                    break;
            }
        }

        return matchesSearch && matchesStatus && matchesMethod && matchesDate && matchesAmount;
    });

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Chargement des paiements...</span>
        </div>
    );

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Toast notifications */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center ${toast.type === 'success' ? 'bg-green-500 text-white' :
                    toast.type === 'error' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 mr-2" />
                    ) : toast.type === 'error' ? (
                        <AlertTriangle className="h-5 w-5 mr-2" />
                    ) : (
                        <Info className="h-5 w-5 mr-2" />
                    )}
                    {toast.message}
                    <button
                        onClick={() => setToast(null)}
                        className="ml-4 hover:opacity-75"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header avec statistiques */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
                            <p className="text-gray-600 mt-2">
                                Surveillez et gérez tous les paiements de la plateforme
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={() => { fetchPayments(); fetchPaymentStats(); }}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Actualiser
                            </button>
                            <button
                                onClick={exportPayments}
                                disabled={exporting}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                {exporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-600 mr-2"></div>
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                {exporting ? 'Export...' : 'Exporter'}
                            </button>
                        </div>
                    </div>

                    {/* Statistiques */}
                    {stats && (
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <DollarSign className="h-8 w-8 text-green-600 mr-3" />
                                    <div>
                                        <p className="text-2xl font-bold text-green-900">
                                            {formatCurrency(stats.total_amount)}
                                        </p>
                                        <p className="text-sm text-green-700">Total des paiements</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <CheckCircle className="h-8 w-8 text-blue-600 mr-3" />
                                    <div>
                                        <p className="text-2xl font-bold text-blue-900">{stats.completed_payments}</p>
                                        <p className="text-sm text-blue-700">Paiements complétés</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <Clock className="h-8 w-8 text-yellow-600 mr-3" />
                                    <div>
                                        <p className="text-2xl font-bold text-yellow-900">{stats.pending_payments}</p>
                                        <p className="text-sm text-yellow-700">En attente</p>
                                    </div>
                                </div>
                            </div>
                            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                                <div className="flex items-center">
                                    <TrendingUp className="h-8 w-8 text-purple-600 mr-3" />
                                    <div>
                                        <p className="text-2xl font-bold text-purple-900">
                                            {formatCurrency(stats.total_commission)}
                                        </p>
                                        <p className="text-sm text-purple-700">Commissions</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Filter className="h-5 w-5 mr-2" />
                        Filtres
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Nom, email, transaction..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="pending">En attente</option>
                                <option value="completed">Complété</option>
                                <option value="failed">Échoué</option>
                                <option value="refunded">Remboursé</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Méthode</label>
                            <select
                                value={methodFilter}
                                onChange={(e) => setMethodFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Toutes les méthodes</option>
                                <option value="CinetPay">CinetPay</option>
                                <option value="Mobile Money">Mobile Money</option>
                                <option value="Virement Bancaire">Virement Bancaire</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Toute période</option>
                                <option value="7d">7 derniers jours</option>
                                <option value="30d">30 derniers jours</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Montant</label>
                            <select
                                value={amountFilter}
                                onChange={(e) => setAmountFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Tous les montants</option>
                                <option value="low">&lt; 10,000 FCFA</option>
                                <option value="medium">10,000 - 50,000 FCFA</option>
                                <option value="high">&gt; 50,000 FCFA</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Liste des paiements */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Transaction</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paiement</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payeur</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Bénéficiaire</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredPayments.map((payment) => (
                                    <tr key={payment.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                                                        <CreditCard className="h-6 w-6 text-green-600" />
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {payment.transaction_id}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {payment.payment_method}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatCurrency(payment.amount, payment.currency)}
                                            </div>
                                            {payment.commission_amount && (
                                                <div className="text-sm text-gray-500">
                                                    Commission: {formatCurrency(payment.commission_amount, payment.currency)}
                                                </div>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {payment.payer_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {payment.payer_email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {payment.recipient_name}
                                            </div>
                                            <div className="text-sm text-gray-500">
                                                {payment.recipient_email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(payment.status)}`}>
                                                {getStatusText(payment.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(payment.created_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                className="text-blue-600 hover:text-blue-900"
                                                onClick={() => openDetailModal(payment)}
                                                title="Voir les détails"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {payment.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="text-green-600 hover:text-green-900"
                                                        onClick={() => updatePaymentStatus(payment.id, 'completed')}
                                                        title="Marquer comme complété"
                                                    >
                                                        <CheckCircle className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        className="text-red-600 hover:text-red-900"
                                                        onClick={() => updatePaymentStatus(payment.id, 'failed')}
                                                        title="Marquer comme échoué"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </>
                                            )}
                                            {payment.status === 'completed' && (
                                                <button
                                                    className="text-purple-600 hover:text-purple-900"
                                                    onClick={() => {
                                                        const reason = prompt('Raison du remboursement:');
                                                        if (reason) {
                                                            updatePaymentStatus(payment.id, 'refunded', reason);
                                                        }
                                                    }}
                                                    title="Rembourser"
                                                >
                                                    <Shield className="h-4 w-4" />
                                                </button>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredPayments.length === 0 && (
                        <div className="text-center py-12">
                            <CreditCard className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun paiement trouvé</h3>
                            <p className="text-gray-500">
                                {payments.length === 0 ? 'Aucun paiement disponible.' : 'Aucun paiement ne correspond aux critères de recherche.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de détails */}
            {showDetailModal && selectedPayment && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Détails du Paiement</h3>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">ID Transaction</label>
                                        <p className="text-sm text-gray-900">{selectedPayment.transaction_id}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Montant</label>
                                        <p className="text-sm font-medium text-gray-900">
                                            {formatCurrency(selectedPayment.amount, selectedPayment.currency)}
                                        </p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Payeur</label>
                                        <p className="text-sm text-gray-900">{selectedPayment.payer_name}</p>
                                        <p className="text-sm text-gray-500">{selectedPayment.payer_email}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Bénéficiaire</label>
                                        <p className="text-sm text-gray-900">{selectedPayment.recipient_name}</p>
                                        <p className="text-sm text-gray-500">{selectedPayment.recipient_email}</p>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Méthode de paiement</label>
                                        <p className="text-sm text-gray-900">{selectedPayment.payment_method}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Statut</label>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedPayment.status)}`}>
                                            {getStatusText(selectedPayment.status)}
                                        </span>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <p className="text-sm text-gray-900">{selectedPayment.description}</p>
                                </div>

                                {selectedPayment.commission_amount && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Commission</label>
                                            <p className="text-sm text-gray-900">
                                                {formatCurrency(selectedPayment.commission_amount, selectedPayment.currency)}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Frais plateforme</label>
                                            <p className="text-sm text-gray-900">
                                                {formatCurrency(selectedPayment.platform_fee || 0, selectedPayment.currency)}
                                            </p>
                                        </div>
                                    </div>
                                )}

                                {selectedPayment.refund_reason && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Raison du remboursement</label>
                                        <p className="text-sm text-gray-900">{selectedPayment.refund_reason}</p>
                                    </div>
                                )}

                                {selectedPayment.notification_data && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 flex items-center">
                                            <FileText className="h-4 w-4 mr-2 text-blue-600" />
                                            Notification CinetPay
                                        </label>
                                        <div className="mt-2 bg-gray-50 rounded-lg p-3">
                                            <pre className="text-xs text-gray-800 overflow-x-auto whitespace-pre-wrap max-h-40 overflow-y-auto">
                                                {JSON.stringify(selectedPayment.notification_data, null, 2)}
                                            </pre>
                                        </div>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date de création</label>
                                        <p className="text-sm text-gray-900">
                                            {new Date(selectedPayment.created_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dernière mise à jour</label>
                                        <p className="text-sm text-gray-900">
                                            {new Date(selectedPayment.updated_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            {selectedPayment.status === 'pending' && (
                                <div className="mt-6 flex space-x-3">
                                    <button
                                        onClick={() => {
                                            updatePaymentStatus(selectedPayment.id, 'completed');
                                            setShowDetailModal(false);
                                        }}
                                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700"
                                    >
                                        Marquer comme complété
                                    </button>
                                    <button
                                        onClick={() => {
                                            updatePaymentStatus(selectedPayment.id, 'failed');
                                            setShowDetailModal(false);
                                        }}
                                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700"
                                    >
                                        Marquer comme échoué
                                    </button>
                                </div>
                            )}

                            {selectedPayment.status === 'completed' && (
                                <div className="mt-6">
                                    <button
                                        onClick={() => {
                                            const reason = prompt('Raison du remboursement:');
                                            if (reason) {
                                                updatePaymentStatus(selectedPayment.id, 'refunded', reason);
                                                setShowDetailModal(false);
                                            }
                                        }}
                                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700"
                                    >
                                        Rembourser
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}
        </div>
    );
}

export default AdminPayments; 