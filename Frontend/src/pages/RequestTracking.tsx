import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Phone, MapPin, Clock, Car, AlertCircle, CheckCircle, Navigation } from 'lucide-react';
import RealTimeTracking from '../components/RealTimeTracking';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface RepairRequest {
    id: number;
    title: string;
    description: string;
    status: string;
    address: string;
    created_at: string;
    client: {
        id: number;
        user: {
            first_name: string;
            last_name: string;
            phone: string;
        };
    };
    technician: {
        id: number;
        user: {
            first_name: string;
            last_name: string;
            phone: string;
        };
        specialty: string;
    };
    service: {
        name: string;
    };
}

const RequestTracking: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [request, setRequest] = useState<RepairRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchRequest = async () => {
            if (!requestId) {
                setError('ID de demande manquant');
                setLoading(false);
                return;
            }

            try {
                const response = await fetchWithAuth(`/depannage/api/repair-requests/${requestId}/`);
                if (!response.ok) {
                    throw new Error('Demande non trouvée');
                }

                const data = await response.json();
                setRequest(data);
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Erreur lors du chargement de la demande');
            } finally {
                setLoading(false);
            }
        };

        fetchRequest();
    }, [requestId]);

    const handleStatusUpdate = (newStatus: string) => {
        if (request) {
            setRequest(prev => prev ? { ...prev, status: newStatus } : null);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'assigned': return 'bg-blue-100 text-blue-800';
            case 'in_progress': return 'bg-orange-100 text-orange-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending': return 'En attente';
            case 'assigned': return 'Assignée';
            case 'in_progress': return 'En cours';
            case 'completed': return 'Terminée';
            case 'cancelled': return 'Annulée';
            default: return status;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement de la demande...</p>
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Erreur</h2>
                    <p className="text-gray-600 mb-4">{error || 'Demande non trouvée'}</p>
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Retour au tableau de bord
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="container mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <button
                                onClick={() => navigate('/dashboard')}
                                className="flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5" />
                                <span>Retour</span>
                            </button>

                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">{request.title}</h1>
                                <p className="text-gray-600">Demande #{request.id}</p>
                            </div>
                        </div>

                        <div className="flex items-center gap-4">
                            <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                                {getStatusText(request.status)}
                            </span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Informations de la demande */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-lg shadow-lg p-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-6">Détails de la demande</h2>

                            <div className="space-y-4">
                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Service demandé</h3>
                                    <p className="text-gray-600">{request.service?.name || 'Service non spécifié'}</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Description</h3>
                                    <p className="text-gray-600">{request.description}</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Adresse</h3>
                                    <p className="text-gray-600">{request.address}</p>
                                </div>

                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Date de création</h3>
                                    <p className="text-gray-600">
                                        {new Date(request.created_at).toLocaleDateString('fr-FR', {
                                            year: 'numeric',
                                            month: 'long',
                                            day: 'numeric',
                                            hour: '2-digit',
                                            minute: '2-digit'
                                        })}
                                    </p>
                                </div>

                                {request.technician && (
                                    <div>
                                        <h3 className="font-semibold text-gray-900 mb-2">Technicien assigné</h3>
                                        <div className="bg-blue-50 p-3 rounded-lg">
                                            <p className="font-medium text-blue-900">
                                                {request.technician.user.first_name} {request.technician.user.last_name}
                                            </p>
                                            <p className="text-sm text-blue-700">{request.technician.specialty}</p>
                                            <p className="text-sm text-blue-600">{request.technician.user.phone}</p>
                                        </div>
                                    </div>
                                )}

                                <div>
                                    <h3 className="font-semibold text-gray-900 mb-2">Client</h3>
                                    <div className="bg-gray-50 p-3 rounded-lg">
                                        <p className="font-medium text-gray-900">
                                            {request.client.user.first_name} {request.client.user.last_name}
                                        </p>
                                        <p className="text-sm text-gray-600">{request.client.user.phone}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Suivi en temps réel */}
                    <div className="lg:col-span-2">
                        {request.technician ? (
                            <RealTimeTracking
                                requestId={request.id}
                                clientId={request.client.id}
                                technicianId={request.technician.id}
                                clientPhone={request.client.user.phone}
                                technicianPhone={request.technician.user.phone}
                                clientName={`${request.client.user.first_name} ${request.client.user.last_name}`}
                                technicianName={`${request.technician.user.first_name} ${request.technician.user.last_name}`}
                                status={request.status}
                                onStatusUpdate={handleStatusUpdate}
                            />
                        ) : (
                            <div className="bg-white rounded-lg shadow-lg p-6">
                                <div className="text-center">
                                    <Clock className="h-12 w-12 text-yellow-500 mx-auto mb-4" />
                                    <h2 className="text-xl font-semibold text-gray-900 mb-2">En attente d'un technicien</h2>
                                    <p className="text-gray-600 mb-4">
                                        Votre demande a été reçue et sera assignée à un technicien prochainement.
                                    </p>
                                    <div className="bg-yellow-50 p-4 rounded-lg">
                                        <p className="text-sm text-yellow-800">
                                            Le suivi en temps réel sera disponible une fois qu'un technicien sera assigné à votre demande.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default RequestTracking; 