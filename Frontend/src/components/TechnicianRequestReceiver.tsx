import React, { useState, useEffect, useRef } from 'react';
import { Bell, MapPin, Clock, User, Phone, MessageSquare, CheckCircle, X, AlertCircle, Wrench, Star, Navigation } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { useAuth } from '../contexts/AuthContext';

interface RepairRequest {
    id: number;
    title: string;
    description: string;
    status: string;
    specialty_needed: string;
    urgency_level: string;
    priority: string;
    address: string;
    latitude: number;
    longitude: number;
    estimated_price: number;
    client: {
        user: {
            username: string;
            first_name: string;
            last_name: string;
        };
        phone: string;
    };
    created_at: string;
    is_urgent: boolean;
}

interface Notification {
    id: number;
    title: string;
    message: string;
    type: string;
    is_read: boolean;
    created_at: string;
    request?: RepairRequest;
}

const TechnicianRequestReceiver: React.FC = () => {
    const { user, token } = useAuth();
    const [requests, setRequests] = useState<RepairRequest[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'new' | 'assigned' | 'in_progress'>('new');
    const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
    const [showDetails, setShowDetails] = useState(false);
    const [acceptingRequest, setAcceptingRequest] = useState<number | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    // WebSocket pour les notifications en temps réel
    const wsRef = useRef<WebSocket | null>(null);
    const reconnectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        fetchData();
        setupWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (reconnectTimeoutRef.current) {
                clearTimeout(reconnectTimeoutRef.current);
            }
        };
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);

            // Récupérer les demandes disponibles
            const requestsResponse = await fetchWithAuth('/depannage/api/repair-requests/?status=pending');
            if (requestsResponse.ok) {
                const data = await requestsResponse.json();
                setRequests(data.results || data);
            }

            // Récupérer les notifications
            const notificationsResponse = await fetchWithAuth('/depannage/api/notifications/');
            if (notificationsResponse.ok) {
                const data = await notificationsResponse.json();
                setNotifications(data.results || data);
            }

        } catch (error) {
            console.error('Erreur lors du chargement:', error);
            setError('Erreur lors du chargement des données');
        } finally {
            setLoading(false);
        }
    };

    const setupWebSocket = () => {
        if (!token) return;

        const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
        const wsUrl = `${wsProtocol}://${window.location.hostname}:8000/ws/notifications/?token=${token}`;

        wsRef.current = new WebSocket(wsUrl);

        wsRef.current.onopen = () => {
            console.log('WebSocket connecté pour les notifications technicien');
        };

        wsRef.current.onmessage = (event) => {
            try {
                const data = JSON.parse(event.data);
                handleNewNotification(data);
            } catch (error) {
                console.error('Erreur parsing WebSocket message:', error);
            }
        };

        wsRef.current.onclose = () => {
            console.log('WebSocket déconnecté, reconnexion...');
            reconnectTimeoutRef.current = setTimeout(setupWebSocket, 5000);
        };

        wsRef.current.onerror = (error) => {
            console.error('Erreur WebSocket:', error);
        };
    };

    const handleNewNotification = (notification: any) => {
        if (notification.type === 'urgent_request' || notification.type === 'new_request_technician') {
            // Recharger les demandes disponibles
            fetchData();

            // Afficher une notification toast
            setSuccess('Nouvelle demande disponible !');
            setTimeout(() => setSuccess(null), 3000);
        }
    };

    const acceptRequest = async (requestId: number) => {
        try {
            setAcceptingRequest(requestId);
            setError(null);

            const response = await fetchWithAuth(`/depannage/api/repair-requests/${requestId}/assign_technician/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setSuccess('Demande acceptée avec succès !');
                setSelectedRequest(null);
                setShowDetails(false);
                fetchData(); // Recharger les données
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors de l\'acceptation');
            }
        } catch (error) {
            console.error('Erreur lors de l\'acceptation:', error);
            setError('Erreur de connexion');
        } finally {
            setAcceptingRequest(null);
        }
    };

    const getUrgencyColor = (urgency: string) => {
        switch (urgency) {
            case 'sos': return 'bg-red-500 text-white';
            case 'urgent': return 'bg-orange-500 text-white';
            case 'same_day': return 'bg-yellow-500 text-white';
            default: return 'bg-blue-500 text-white';
        }
    };

    const getUrgencyText = (urgency: string) => {
        switch (urgency) {
            case 'sos': return 'SOS (30min)';
            case 'urgent': return 'Urgent (2h)';
            case 'same_day': return 'Même jour';
            default: return 'Normal (48h)';
        }
    };

    const formatDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371; // Rayon de la Terre en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;
        return distance.toFixed(1);
    };

    const calculateDistance = (request: RepairRequest) => {
        // Utiliser la position du technicien (à implémenter)
        const techLat = 12.6508; // Position par défaut (Bamako)
        const techLon = -8.0000;
        return formatDistance(techLat, techLon, request.latitude, request.longitude);
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Chargement des demandes...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
            {/* Header */}
            <div className="bg-white shadow-lg border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <div className="w-12 h-12 bg-gradient-to-r from-orange-500 to-orange-600 rounded-full flex items-center justify-center">
                                <Wrench className="h-6 w-6 text-white" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Réception des Demandes</h1>
                                <p className="text-gray-600">Bienvenue, {user?.username}</p>
                            </div>
                        </div>

                        {/* Notifications badge */}
                        <div className="relative">
                            <Bell className="h-8 w-8 text-gray-600" />
                            {notifications.filter(n => !n.is_read).length > 0 && (
                                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse">
                                    {notifications.filter(n => !n.is_read).length}
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Messages d'état */}
            {error && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center">
                        <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
                        <p className="text-red-800">{error}</p>
                    </div>
                </div>
            )}

            {success && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center">
                        <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
                        <p className="text-green-800">{success}</p>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Onglets */}
                <div className="bg-white rounded-xl shadow-lg mb-8">
                    <div className="border-b border-gray-200">
                        <nav className="flex space-x-8 px-6" role="tablist">
                            <button
                                onClick={() => setActiveTab('new')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'new'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Nouvelles Demandes ({requests.filter(r => r.status === 'pending').length})
                            </button>
                            <button
                                onClick={() => setActiveTab('assigned')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'assigned'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                Demandes Assignées
                            </button>
                            <button
                                onClick={() => setActiveTab('in_progress')}
                                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'in_progress'
                                        ? 'border-orange-500 text-orange-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                    }`}
                            >
                                En Cours
                            </button>
                        </nav>
                    </div>

                    {/* Contenu des onglets */}
                    <div className="p-6">
                        {activeTab === 'new' && (
                            <div className="space-y-6">
                                {requests.filter(r => r.status === 'pending').length === 0 ? (
                                    <div className="text-center py-12">
                                        <Bell className="mx-auto h-12 w-12 text-gray-400" />
                                        <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune nouvelle demande</h3>
                                        <p className="mt-1 text-sm text-gray-500">
                                            Les nouvelles demandes apparaîtront ici en temps réel.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {requests
                                            .filter(r => r.status === 'pending')
                                            .map((request) => (
                                                <div
                                                    key={request.id}
                                                    className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                                                    onClick={() => {
                                                        setSelectedRequest(request);
                                                        setShowDetails(true);
                                                    }}
                                                >
                                                    <div className="p-6">
                                                        {/* Header avec urgence */}
                                                        <div className="flex items-start justify-between mb-4">
                                                            <div className="flex-1">
                                                                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                                                                    {request.title}
                                                                </h3>
                                                                <p className="text-sm text-gray-600 line-clamp-2">
                                                                    {request.description}
                                                                </p>
                                                            </div>
                                                            <span className={`ml-3 px-3 py-1 rounded-full text-xs font-semibold ${getUrgencyColor(request.urgency_level)}`}>
                                                                {getUrgencyText(request.urgency_level)}
                                                            </span>
                                                        </div>

                                                        {/* Informations client et localisation */}
                                                        <div className="space-y-3">
                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <User className="h-4 w-4 mr-2" />
                                                                <span>{request.client.user.first_name} {request.client.user.last_name}</span>
                                                            </div>

                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <MapPin className="h-4 w-4 mr-2" />
                                                                <span>{request.address}</span>
                                                                <span className="ml-2 text-xs bg-gray-100 px-2 py-1 rounded">
                                                                    {calculateDistance(request)} km
                                                                </span>
                                                            </div>

                                                            <div className="flex items-center text-sm text-gray-600">
                                                                <Clock className="h-4 w-4 mr-2" />
                                                                <span>{new Date(request.created_at).toLocaleString('fr-FR')}</span>
                                                            </div>
                                                        </div>

                                                        {/* Prix estimé */}
                                                        <div className="mt-4 pt-4 border-t border-gray-100">
                                                            <div className="flex items-center justify-between">
                                                                <span className="text-sm text-gray-600">Prix estimé</span>
                                                                <span className="text-lg font-bold text-orange-600">
                                                                    {request.estimated_price.toLocaleString()} FCFA
                                                                </span>
                                                            </div>
                                                        </div>

                                                        {/* Actions */}
                                                        <div className="mt-4 flex space-x-3">
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    acceptRequest(request.id);
                                                                }}
                                                                disabled={acceptingRequest === request.id}
                                                                className="flex-1 bg-orange-600 text-white px-4 py-2 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                            >
                                                                {acceptingRequest === request.id ? (
                                                                    <div className="flex items-center justify-center">
                                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                                        Acceptation...
                                                                    </div>
                                                                ) : (
                                                                    'Accepter la demande'
                                                                )}
                                                            </button>

                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    setSelectedRequest(request);
                                                                    setShowDetails(true);
                                                                }}
                                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                                            >
                                                                Détails
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Autres onglets à implémenter */}
                        {(activeTab === 'assigned' || activeTab === 'in_progress') && (
                            <div className="text-center py-12">
                                <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Fonctionnalité en développement</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    La gestion des demandes assignées et en cours sera bientôt disponible.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal de détails */}
            {showDetails && selectedRequest && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                        <div className="p-6">
                            <div className="flex items-center justify-between mb-6">
                                <h2 className="text-xl font-bold text-gray-900">Détails de la demande</h2>
                                <button
                                    onClick={() => setShowDetails(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-6">
                                {/* Informations principales */}
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{selectedRequest.title}</h3>
                                    <p className="text-gray-600">{selectedRequest.description}</p>
                                </div>

                                {/* Informations client */}
                                <div className="bg-gray-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-gray-900 mb-3">Informations client</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center">
                                            <User className="h-4 w-4 mr-2 text-gray-500" />
                                            <span className="text-sm">{selectedRequest.client.user.first_name} {selectedRequest.client.user.last_name}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <Phone className="h-4 w-4 mr-2 text-gray-500" />
                                            <span className="text-sm">{selectedRequest.client.phone}</span>
                                        </div>
                                        <div className="flex items-center">
                                            <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                                            <span className="text-sm">{selectedRequest.address}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Détails techniques */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-blue-900 mb-2">Spécialité</h4>
                                        <p className="text-blue-700">{selectedRequest.specialty_needed}</p>
                                    </div>
                                    <div className="bg-orange-50 rounded-lg p-4">
                                        <h4 className="font-semibold text-orange-900 mb-2">Urgence</h4>
                                        <p className="text-orange-700">{getUrgencyText(selectedRequest.urgency_level)}</p>
                                    </div>
                                </div>

                                {/* Prix */}
                                <div className="bg-green-50 rounded-lg p-4">
                                    <h4 className="font-semibold text-green-900 mb-2">Prix estimé</h4>
                                    <p className="text-2xl font-bold text-green-700">
                                        {selectedRequest.estimated_price.toLocaleString()} FCFA
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                                    <button
                                        onClick={() => acceptRequest(selectedRequest.id)}
                                        disabled={acceptingRequest === selectedRequest.id}
                                        className="flex-1 bg-orange-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                    >
                                        {acceptingRequest === selectedRequest.id ? 'Acceptation...' : 'Accepter la demande'}
                                    </button>
                                    <button
                                        onClick={() => setShowDetails(false)}
                                        className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                    >
                                        Fermer
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicianRequestReceiver; 