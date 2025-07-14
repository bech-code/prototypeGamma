import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import EnhancedCommunication from '../components/EnhancedCommunication';
import RealTimeTracking from '../components/RealTimeTracking';
import {
    ArrowLeft,
    Phone,
    MapPin,
    MessageSquare,
    Clock,
    User,
    AlertCircle,
    CheckCircle,
    X,
    Info,
    Calendar,
    Map,
    FileText,
    Camera,
    Video,
    Mic
} from 'lucide-react';

interface RepairRequest {
    id: number;
    title: string;
    description: string;
    status: string;
    created_at: string;
    updated_at: string;
    client: {
        id: number;
        first_name: string;
        last_name: string;
        phone_number: string;
        email: string;
    };
    technician: {
        id: number;
        first_name: string;
        last_name: string;
        phone_number: string;
        email: string;
        specializations: string[];
        rating: number;
    };
    location: {
        latitude: number;
        longitude: number;
        address: string;
    };
    estimated_duration: string;
    priority: string;
    category: string;
    conversation?: {
        id: number;
        unread_count: number;
    };
}

interface CommunicationStats {
    total_messages: number;
    unread_messages: number;
    last_activity: string;
    response_time_avg: number;
}

const CommunicationPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [request, setRequest] = useState<RepairRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'chat' | 'tracking' | 'info'>('chat');
    const [stats, setStats] = useState<CommunicationStats | null>(null);
    const [showCallModal, setShowCallModal] = useState(false);

    useEffect(() => {
        if (!requestId) return;

        const fetchRequestDetails = async () => {
            try {
                const response = await fetchWithAuth(`/depannage/api/requests/${requestId}/`);
                if (response.ok) {
                    const data = await response.json();
                    setRequest(data);
                    await fetchCommunicationStats();
                } else {
                    setError('Impossible de charger les détails de la demande');
                }
            } catch (err) {
                setError('Erreur lors du chargement');
            } finally {
                setLoading(false);
            }
        };

        fetchRequestDetails();
    }, [requestId]);

    const fetchCommunicationStats = async () => {
        try {
            const response = await fetchWithAuth(`/depannage/api/chat/stats/?request_id=${requestId}`);
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des statistiques');
        }
    };

    const handleCall = (phoneNumber: string, name: string) => {
        if (confirm(`Appeler ${name} au ${phoneNumber} ?`)) {
            window.location.href = `tel:${phoneNumber}`;
        }
    };

    const handleStatusUpdate = async (newStatus: string) => {
        if (!request) return;

        try {
            const response = await fetchWithAuth(`/depannage/api/requests/${requestId}/update_status/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ status: newStatus }),
            });

            if (response.ok) {
                setRequest(prev => prev ? { ...prev, status: newStatus } : null);
            }
        } catch (err) {
            setError('Impossible de mettre à jour le statut');
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'bg-yellow-100 text-yellow-800';
            case 'accepted': return 'bg-blue-100 text-blue-800';
            case 'in_progress': return 'bg-orange-100 text-orange-800';
            case 'completed': return 'bg-green-100 text-green-800';
            case 'cancelled': return 'bg-red-100 text-red-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'accepted': return <CheckCircle className="h-4 w-4" />;
            case 'in_progress': return <AlertCircle className="h-4 w-4" />;
            case 'completed': return <CheckCircle className="h-4 w-4" />;
            case 'cancelled': return <X className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    if (error || !request) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
                    <p className="text-gray-600 mb-4">{error || 'Demande non trouvée'}</p>
                    <button
                        onClick={() => navigate(-1)}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Retour
                    </button>
                </div>
            </div>
        );
    }

    const isClient = user?.user_type === 'client';
    const isTechnician = user?.user_type === 'technician';
    const otherUser = isClient ? request.technician : request.client;
    const otherUserPhone = isClient ? request.technician.phone_number : request.client.phone_number;

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 text-gray-600 hover:text-gray-900 transition-colors"
                            >
                                <ArrowLeft className="h-5 w-5" />
                            </button>
                            <div>
                                <h1 className="text-lg font-semibold text-gray-900">
                                    Communication - {request.title}
                                </h1>
                                <p className="text-sm text-gray-500">
                                    {isClient ? 'avec le technicien' : 'avec le client'}
                                </p>
                            </div>
                        </div>

                        <div className="flex items-center space-x-2">
                            <button
                                onClick={() => handleCall(otherUserPhone, otherUser.first_name)}
                                className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
                            >
                                <Phone className="h-4 w-4" />
                                <span>Appeler</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Colonne principale */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Onglets */}
                        <div className="bg-white rounded-lg shadow-sm">
                            <div className="border-b border-gray-200">
                                <nav className="flex space-x-8 px-6">
                                    <button
                                        onClick={() => setActiveTab('chat')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'chat'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <MessageSquare className="h-4 w-4" />
                                            <span>Messages</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('tracking')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'tracking'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <MapPin className="h-4 w-4" />
                                            <span>Suivi</span>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('info')}
                                        className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'info'
                                                ? 'border-blue-500 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-2">
                                            <Info className="h-4 w-4" />
                                            <span>Informations</span>
                                        </div>
                                    </button>
                                </nav>
                            </div>

                            <div className="p-6">
                                {activeTab === 'chat' && (
                                    <EnhancedCommunication
                                        requestId={request.id}
                                        clientId={request.client.id}
                                        technicianId={request.technician.id}
                                        clientName={`${request.client.first_name} ${request.client.last_name}`}
                                        technicianName={`${request.technician.first_name} ${request.technician.last_name}`}
                                        clientPhone={request.client.phone_number}
                                        technicianPhone={request.technician.phone_number}
                                        status={request.status}
                                        onStatusUpdate={handleStatusUpdate}
                                    />
                                )}

                                {activeTab === 'tracking' && (
                                    <RealTimeTracking
                                        requestId={request.id}
                                        clientId={request.client.id}
                                        technicianId={request.technician.id}
                                        clientName={`${request.client.first_name} ${request.client.last_name}`}
                                        technicianName={`${request.technician.first_name} ${request.technician.last_name}`}
                                        clientPhone={request.client.phone_number}
                                        technicianPhone={request.technician.phone_number}
                                    />
                                )}

                                {activeTab === 'info' && (
                                    <div className="space-y-6">
                                        {/* Statut de la demande */}
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="text-lg font-semibold mb-4">Statut de la demande</h3>
                                            <div className="flex items-center space-x-3">
                                                <div className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(request.status)}`}>
                                                    <div className="flex items-center space-x-2">
                                                        {getStatusIcon(request.status)}
                                                        <span className="capitalize">{request.status.replace('_', ' ')}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Détails de la demande */}
                                        <div className="bg-gray-50 rounded-lg p-4">
                                            <h3 className="text-lg font-semibold mb-4">Détails de la demande</h3>
                                            <div className="space-y-3">
                                                <div>
                                                    <span className="font-medium text-gray-700">Titre:</span>
                                                    <p className="text-gray-900">{request.title}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Description:</span>
                                                    <p className="text-gray-900">{request.description}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Catégorie:</span>
                                                    <p className="text-gray-900 capitalize">{request.category}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Priorité:</span>
                                                    <p className="text-gray-900 capitalize">{request.priority}</p>
                                                </div>
                                                <div>
                                                    <span className="font-medium text-gray-700">Durée estimée:</span>
                                                    <p className="text-gray-900">{request.estimated_duration}</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Localisation */}
                                        {request.location && (
                                            <div className="bg-gray-50 rounded-lg p-4">
                                                <h3 className="text-lg font-semibold mb-4">Localisation</h3>
                                                <p className="text-gray-900">{request.location.address}</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Profil de l'autre utilisateur */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold mb-4">
                                {isClient ? 'Technicien' : 'Client'}
                            </h3>
                            <div className="space-y-4">
                                <div className="flex items-center space-x-3">
                                    <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                                        <User className="h-6 w-6 text-blue-600" />
                                    </div>
                                    <div>
                                        <h4 className="font-medium text-gray-900">
                                            {otherUser.first_name} {otherUser.last_name}
                                        </h4>
                                        <p className="text-sm text-gray-500">
                                            {isClient ? 'Technicien' : 'Client'}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center space-x-2 text-sm">
                                        <Phone className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">{otherUserPhone}</span>
                                    </div>
                                    <div className="flex items-center space-x-2 text-sm">
                                        <Calendar className="h-4 w-4 text-gray-400" />
                                        <span className="text-gray-700">
                                            Membre depuis {new Date(request.created_at).getFullYear()}
                                        </span>
                                    </div>
                                </div>

                                {isClient && request.technician.specializations && (
                                    <div>
                                        <h5 className="font-medium text-gray-700 mb-2">Spécialisations:</h5>
                                        <div className="flex flex-wrap gap-1">
                                            {request.technician.specializations.map((spec, index) => (
                                                <span
                                                    key={index}
                                                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                                                >
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={() => handleCall(otherUserPhone, otherUser.first_name)}
                                    className="w-full bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center space-x-2"
                                >
                                    <Phone className="h-4 w-4" />
                                    <span>Appeler</span>
                                </button>
                            </div>
                        </div>

                        {/* Statistiques de communication */}
                        {stats && (
                            <div className="bg-white rounded-lg shadow-sm p-6">
                                <h3 className="text-lg font-semibold mb-4">Statistiques</h3>
                                <div className="space-y-3">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Messages totaux:</span>
                                        <span className="font-medium">{stats.total_messages}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Non lus:</span>
                                        <span className="font-medium text-red-600">{stats.unread_messages}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Dernière activité:</span>
                                        <span className="font-medium">{new Date(stats.last_activity).toLocaleDateString('fr-FR')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Temps de réponse moyen:</span>
                                        <span className="font-medium">{stats.response_time_avg} min</span>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions rapides */}
                        <div className="bg-white rounded-lg shadow-sm p-6">
                            <h3 className="text-lg font-semibold mb-4">Actions rapides</h3>
                            <div className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('tracking')}
                                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <MapPin className="h-5 w-5 text-blue-600" />
                                    <span>Voir le suivi en temps réel</span>
                                </button>
                                <button
                                    onClick={() => handleCall(otherUserPhone, otherUser.first_name)}
                                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <Phone className="h-5 w-5 text-green-600" />
                                    <span>Appeler directement</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('info')}
                                    className="w-full flex items-center space-x-3 p-3 text-left hover:bg-gray-50 rounded-lg transition-colors"
                                >
                                    <Info className="h-5 w-5 text-purple-600" />
                                    <span>Voir les détails</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CommunicationPage; 