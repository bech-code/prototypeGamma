import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { CheckCircle, X, AlertTriangle, Eye, RefreshCw, Clock, User, DollarSign, Calendar, Check, XCircle } from 'lucide-react';

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

const AdminSubscriptionRequests: React.FC = () => {
    const [requests, setRequests] = useState<SubscriptionPaymentRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedRequest, setSelectedRequest] = useState<SubscriptionPaymentRequest | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [processingAction, setProcessingAction] = useState<number | null>(null);
    const [actionNotes, setActionNotes] = useState('');

    useEffect(() => {
        fetchRequests();
    }, []);

    const fetchRequests = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/depannage/api/subscription-requests/');
            if (response.ok) {
                const data = await response.json();
                setRequests(data.results || data);
            } else {
                setError('Erreur lors du chargement des demandes');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const handleAction = async (requestId: number, action: 'approve' | 'reject') => {
        setProcessingAction(requestId);
        try {
            const response = await fetchWithAuth(`/depannage/api/subscription-requests/${requestId}/validate/`, {
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
                fetchRequests(); // Rafraîchir la liste
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
                            <h1 className="text-3xl font-bold text-gray-900">Demandes d'Abonnement</h1>
                            <p className="mt-2 text-gray-600">
                                Gérer les demandes de paiement d'abonnement des techniciens
                            </p>
                        </div>
                        <button
                            onClick={fetchRequests}
                            className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualiser
                        </button>
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
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Clock className="h-8 w-8 text-yellow-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">En attente</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {requests.filter(r => r.status === 'pending').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Approuvées</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {requests.filter(r => r.status === 'approved').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <XCircle className="h-8 w-8 text-red-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Rejetées</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {requests.filter(r => r.status === 'rejected').length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <DollarSign className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total demandes</p>
                                <p className="text-2xl font-bold text-gray-900">{requests.length}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liste des demandes */}
                <div className="bg-white rounded-lg shadow">
                    <div className="px-6 py-4 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900">Demandes récentes</h2>
                    </div>
                    <div className="overflow-x-auto">
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
                                {requests.map((request) => (
                                    <tr key={request.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <User className="h-5 w-5 text-gray-400 mr-2" />
                                                <div>
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {request.technician_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {request.technician?.user?.email || 'Email non disponible'}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {formatCurrency(request.amount)}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">
                                                {request.duration_months} mois
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                                                {getStatusIcon(request.status)}
                                                <span className="ml-1">
                                                    {request.status === 'pending' && 'En attente'}
                                                    {request.status === 'approved' && 'Approuvé'}
                                                    {request.status === 'rejected' && 'Rejeté'}
                                                    {request.status === 'cancelled' && 'Annulé'}
                                                </span>
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                            {formatDate(request.created_at)}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                            <button
                                                onClick={() => {
                                                    setSelectedRequest(request);
                                                    setShowDetailModal(true);
                                                }}
                                                className="text-blue-600 hover:text-blue-900 mr-3"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {request.status === 'pending' && (
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleAction(request.id, 'approve')}
                                                        disabled={processingAction === request.id}
                                                        className="text-green-600 hover:text-green-900 disabled:opacity-50"
                                                    >
                                                        <Check className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        onClick={() => handleAction(request.id, 'reject')}
                                                        disabled={processingAction === request.id}
                                                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                                                    >
                                                        <X className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {requests.length === 0 && (
                    <div className="text-center py-12">
                        <Clock className="mx-auto h-12 w-12 text-gray-400" />
                        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune demande</h3>
                        <p className="mt-1 text-sm text-gray-500">
                            Aucune demande de paiement d'abonnement pour le moment.
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de détail */}
            {showDetailModal && selectedRequest && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative">
                        <button
                            className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
                            onClick={() => {
                                setShowDetailModal(false);
                                setSelectedRequest(null);
                                setActionNotes('');
                            }}
                        >
                            <X className="h-5 w-5" />
                        </button>

                        <h2 className="text-xl font-bold mb-4">Détails de la demande</h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Technicien</label>
                                <p className="text-sm text-gray-900">{selectedRequest.technician_name}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <p className="text-sm text-gray-900">{selectedRequest.technician?.user?.email || 'Email non disponible'}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Montant</label>
                                <p className="text-sm text-gray-900">{formatCurrency(selectedRequest.amount)}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Durée</label>
                                <p className="text-sm text-gray-900">{selectedRequest.duration_months} mois</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                                <p className="text-sm text-gray-900">{selectedRequest.description}</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Date de création</label>
                                <p className="text-sm text-gray-900">{formatDate(selectedRequest.created_at)}</p>
                            </div>

                            {selectedRequest.status !== 'pending' && (
                                <>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Validé par</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedRequest.validated_by ?
                                                `${selectedRequest.validated_by.first_name} ${selectedRequest.validated_by.last_name}` :
                                                'N/A'
                                            }
                                        </p>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Date de validation</label>
                                        <p className="text-sm text-gray-900">
                                            {selectedRequest.validated_at ? formatDate(selectedRequest.validated_at) : 'N/A'}
                                        </p>
                                    </div>

                                    {selectedRequest.validation_notes && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                                            <p className="text-sm text-gray-900">{selectedRequest.validation_notes}</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>

                        {selectedRequest.status === 'pending' && (
                            <div className="mt-6">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Notes (optionnel)</label>
                                <textarea
                                    value={actionNotes}
                                    onChange={(e) => setActionNotes(e.target.value)}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    rows={3}
                                    placeholder="Notes sur la validation..."
                                />

                                <div className="mt-4 flex space-x-3">
                                    <button
                                        onClick={() => handleAction(selectedRequest.id, 'approve')}
                                        disabled={processingAction === selectedRequest.id}
                                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {processingAction === selectedRequest.id ? 'Traitement...' : 'Approuver'}
                                    </button>
                                    <button
                                        onClick={() => handleAction(selectedRequest.id, 'reject')}
                                        disabled={processingAction === selectedRequest.id}
                                        className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {processingAction === selectedRequest.id ? 'Traitement...' : 'Rejeter'}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminSubscriptionRequests; 