import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap, ZoomControl, LayersControl } from 'react-leaflet';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { MapPin, AlertTriangle, Clock, CheckCircle, X, RefreshCw, Filter, Search, Eye, User, Wrench, Info } from 'lucide-react';
import 'leaflet/dist/leaflet.css';
import L, { Icon } from 'leaflet';
import ErrorToast from './ErrorToast';

// Fix Leaflet marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface Request {
    id: number;
    latitude: number;
    longitude: number;
    address: string;
    city: string;
    service: {
        id: number;
        name: string;
        description: string;
        price: number;
    };
    status: string;
    priority: string;
    client: {
        id: number;
        user: {
            username: string;
            email: string;
        };
        phone: string;
        address: string;
    };
    client_email?: string;
    created_at?: string;
    updated_at?: string;
    severity?: string;
    technician?: {
        id: number;
        user: {
            username: string;
            email: string;
        };
        phone: string;
        hourly_rate: number;
        average_rating: number;
    };
    conversation?: {
        id: number;
        unread_count: number;
    };
    quartier?: string;
    is_urgent?: boolean;
    description?: string;
}

interface Technician {
    id: number;
    name: string;
    email: string;
    latitude: number;
    longitude: number;
    is_available: boolean;
    rating?: number;
    specialties?: string[];
}

interface AdminRequestsMapProps {
    requests: Request[];
    technicians?: Technician[];
    showTechnicians?: boolean;
    showRequests?: boolean;
    onRequestClick?: (request: Request) => void;
    onTechnicianClick?: (technician: Technician) => void;
}

// Mapping quartiers -> communes (exemple simplifié, à compléter selon besoin réel)
const quartierToCommune: Record<string, string> = {
    'Sotuba': 'Commune I',
    'Magnambougou': 'Commune VI',
    'Yirimadio': 'Commune VI',
    'Sabalibougou': 'Commune V',
    'Lafiabougou': 'Commune IV',
    'Badalabougou': 'Commune V',
    'Hamdallaye': 'Commune IV',
    'Missira': 'Commune II',
    'Niamakoro': 'Commune VI',
    'Banankabougou': 'Commune VI',
    'Daoudabougou': 'Commune V',
    'Djicoroni': 'Commune IV',
    'Sogoniko': 'Commune VI',
    'Faladié': 'Commune V',
    'Niaréla': 'Commune II',
    'Quinzambougou': 'Commune II',
    'Medina Coura': 'Commune II',
    'Bacodjicoroni': 'Commune V',
    'Torokorobougou': 'Commune V',
    'Sebenicoro': 'Commune IV',
    'Kalaban Coura': 'Commune V',
    'Kalabanbougou': 'Commune V',
    // ... compléter selon besoin
};

function isCoherent(quartier?: string, city?: string) {
    if (!quartier || !city) return true;
    const commune = quartierToCommune[quartier];
    if (!commune) return true; // quartier inconnu, on ne bloque pas
    return city.toLowerCase().includes(commune.toLowerCase());
}

// Icônes personnalisées
const requestIcon = new Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/icons/geo-alt-fill.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'leaflet-request-icon',
});

const urgentIcon = new Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/icons/exclamation-triangle-fill.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'leaflet-urgent-icon',
});

const technicianIcon = new Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/icons/person-badge.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'leaflet-technician-icon',
});

const alertIcon = new Icon({
    iconUrl: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/icons/exclamation-triangle-fill.svg',
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32],
    className: 'leaflet-alert-icon',
});

// Composant pour centrer la carte sur les données
function MapController({ requests, technicians }: { requests: Request[], technicians: Technician[] }) {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        const validRequestPoints = requests
            .filter(req => typeof req.latitude === 'number' && typeof req.longitude === 'number' && !isNaN(req.latitude) && !isNaN(req.longitude))
            .map(req => [req.latitude, req.longitude] as [number, number]);
        const validTechnicianPoints = technicians
            .filter(tech => typeof tech.latitude === 'number' && typeof tech.longitude === 'number' && !isNaN(tech.latitude) && !isNaN(tech.longitude))
            .map(tech => [tech.latitude, tech.longitude] as [number, number]);
        const points = [...validRequestPoints, ...validTechnicianPoints];
        if (points.length > 0) {
            const bounds = L.latLngBounds(points);
            if (bounds.isValid()) {
                try {
                    map.fitBounds(bounds, { padding: [20, 20] });
                } catch (e) {
                    // Ignore Leaflet errors
                }
            }
        }
    }, [requests, technicians, map]);

    return null;
}

const AdminRequestsMap: React.FC<AdminRequestsMapProps> = ({
    requests = [],
    technicians = [],
    showTechnicians = true,
    showRequests = true,
    onRequestClick,
    onTechnicianClick
}) => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [mapRequests, setMapRequests] = useState<Request[]>(requests);
    const [mapTechnicians, setMapTechnicians] = useState<Technician[]>(technicians);
    const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
    const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [filterStatus, setFilterStatus] = useState<string>('all');
    const [filterPriority, setFilterPriority] = useState<string>('all');
    const [searchTerm, setSearchTerm] = useState('');

    // Fonction pour afficher les toasts
    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    // Charger les données si pas fournies
    const loadMapData = useCallback(async () => {
        if (requests.length === 0 && technicians.length === 0) {
            setLoading(true);
            try {
                // Charger les demandes
                const requestsResponse = await fetchWithAuth('/depannage/api/repair-requests/');
                if (requestsResponse.ok) {
                    const requestsData = await requestsResponse.json();
                    setMapRequests(requestsData.results || requestsData);
                } else {
                    let backendMsg = '';
                    try {
                        const errData = await requestsResponse.json();
                        backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                    } catch { }
                    setError(`Erreur lors du chargement des demandes (code ${requestsResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
                    showToast('error', `Erreur lors du chargement des demandes (code ${requestsResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
                }

                // Charger les techniciens
                const techniciansResponse = await fetchWithAuth('/depannage/api/technicians/');
                if (techniciansResponse.ok) {
                    const techniciansData = await techniciansResponse.json();
                    setMapTechnicians(techniciansData.results || techniciansData);
                } else {
                    let backendMsg = '';
                    try {
                        const errData = await techniciansResponse.json();
                        backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                    } catch { }
                    setError(`Erreur lors du chargement des techniciens (code ${techniciansResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
                    showToast('error', `Erreur lors du chargement des techniciens (code ${techniciansResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
                }

                showToast('success', 'Données de la carte chargées');
            } catch (error) {
                setError('Erreur lors du chargement des données');
                showToast('error', 'Erreur de connexion');
            } finally {
                setLoading(false);
            }
        } else {
            setMapRequests(requests);
            setMapTechnicians(technicians);
        }
    }, [requests, technicians]);

    useEffect(() => {
        loadMapData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // ← tableau vide pour éviter la boucle infinie

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return 'text-yellow-600';
            case 'in_progress': return 'text-blue-600';
            case 'completed': return 'text-green-600';
            case 'cancelled': return 'text-red-600';
            default: return 'text-gray-600';
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high': return 'text-red-600';
            case 'medium': return 'text-orange-600';
            case 'low': return 'text-blue-600';
            default: return 'text-gray-600';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'pending': return <Clock className="h-4 w-4" />;
            case 'in_progress': return <Wrench className="h-4 w-4" />;
            case 'completed': return <CheckCircle className="h-4 w-4" />;
            case 'cancelled': return <X className="h-4 w-4" />;
            default: return <Info className="h-4 w-4" />;
        }
    };

    const filteredRequests = mapRequests.filter(req => {
        const clientName = req.client && req.client.user
            ? `${req.client.user.username}`.toLowerCase()
            : '';
        const matchesSearch =
            (typeof clientName === 'string' && clientName.includes(searchTerm.toLowerCase())) ||
            (typeof req.service?.name === 'string' && req.service?.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof req.address === 'string' && req.address.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
        const matchesPriority = filterPriority === 'all' || req.priority === filterPriority;

        return matchesSearch && matchesStatus && matchesPriority;
    });

    const filteredTechnicians = mapTechnicians.filter(tech => {
        return typeof tech.name === 'string' && tech.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            typeof tech.email === 'string' && tech.email.toLowerCase().includes(searchTerm.toLowerCase());
    });

    // Centre sur Bamako
    const defaultCenter: [number, number] = [12.6392, -8.0029];

    if (loading) {
        return (
            <div className="w-full h-[500px] rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement de la carte...</span>
            </div>
        );
    }

    return (
        <div className="w-full">
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
                </div>
            )}

            {/* Contrôles de la carte */}
            <div className="bg-white rounded-lg shadow-sm p-4 mb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center space-x-4">
                        <h3 className="text-lg font-semibold text-gray-900">Carte des Demandes</h3>
                        <div className="flex items-center space-x-2">
                            <div className="w-4 h-4 bg-blue-500 rounded-full"></div>
                            <span className="text-sm text-gray-600">Demandes ({filteredRequests.length})</span>
                        </div>
                        {showTechnicians && (
                            <div className="flex items-center space-x-2">
                                <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                                <span className="text-sm text-gray-600">Techniciens ({filteredTechnicians.length})</span>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center space-x-4">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                            <input
                                type="text"
                                placeholder="Rechercher..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <select
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Tous les statuts</option>
                            <option value="pending">En attente</option>
                            <option value="in_progress">En cours</option>
                            <option value="completed">Terminé</option>
                            <option value="cancelled">Annulé</option>
                        </select>

                        <select
                            value={filterPriority}
                            onChange={(e) => setFilterPriority(e.target.value)}
                            className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                            <option value="all">Toutes priorités</option>
                            <option value="high">Haute</option>
                            <option value="medium">Moyenne</option>
                            <option value="low">Basse</option>
                        </select>

                        <button
                            onClick={loadMapData}
                            className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                        >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Actualiser
                        </button>
                    </div>
                </div>
            </div>

            {/* Carte */}
            <div className="w-full h-[600px] rounded-lg overflow-hidden border border-gray-200">
                <MapContainer
                    center={defaultCenter}
                    zoom={12}
                    style={{ height: '100%', width: '100%' }}
                    zoomControl={false}
                >
                    <ZoomControl position="bottomright" />
                    <LayersControl position="topright">
                        <LayersControl.BaseLayer checked name="OpenStreetMap">
                            <TileLayer
                                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            />
                        </LayersControl.BaseLayer>
                        <LayersControl.BaseLayer name="Satellite">
                            <TileLayer
                                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                                attribution='&copy; Esri'
                            />
                        </LayersControl.BaseLayer>
                    </LayersControl>

                    <MapController requests={filteredRequests} technicians={filteredTechnicians} />

                    {/* Marqueurs des demandes */}
                    {showRequests && filteredRequests.map((req) => {
                        if (
                            typeof req.latitude !== 'number' ||
                            typeof req.longitude !== 'number' ||
                            isNaN(req.latitude) ||
                            isNaN(req.longitude)
                        ) {
                            return null;
                        }

                        const incoherent = !isCoherent(req.quartier, req.city);
                        const icon = req.is_urgent ? urgentIcon : incoherent ? alertIcon : requestIcon;

                        return (
                            <Marker
                                key={`request-${req.id}`}
                                position={[req.latitude, req.longitude]}
                                icon={icon}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedRequest(req);
                                        setShowDetailModal(true);
                                        onRequestClick?.(req);
                                    }
                                }}
                            >
                                <Popup>
                                    <div className="min-w-[200px]">
                                        <div className="font-bold text-blue-700 mb-2">{req.service?.name || ''}</div>
                                        <div className="text-sm text-gray-700 mb-1">{req.address}</div>
                                        <div className="text-xs text-gray-500 mb-1">
                                            {req.quartier ? req.quartier + ', ' : ''}{req.city}
                                        </div>
                                        <div className="text-xs text-gray-500 mb-1">Client : {req.client && req.client.user ? `${req.client.user.username}` : ''}</div>
                                        <div className="text-xs mb-1 flex items-center">
                                            Statut : <span className={`font-semibold ml-1 ${getStatusColor(req.status)}`}>
                                                {req.status}
                                            </span>
                                            <span className="ml-1">{getStatusIcon(req.status)}</span>
                                        </div>
                                        {req.is_urgent && (
                                            <div className="text-xs text-red-600 font-bold mb-1">🚨 URGENCE</div>
                                        )}
                                        {req.priority && (
                                            <div className={`text-xs font-semibold mb-1 ${getPriorityColor(req.priority)}`}>
                                                Priorité : {req.priority.toUpperCase()}
                                            </div>
                                        )}
                                        {incoherent && (
                                            <div className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-1 rounded mt-2">
                                                ⚠️ Incohérence quartier/commune
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedRequest(req);
                                                setShowDetailModal(true);
                                            }}
                                            className="mt-2 w-full bg-blue-600 text-white text-xs px-2 py-1 rounded hover:bg-blue-700"
                                        >
                                            Voir détails
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}

                    {/* Marqueurs des techniciens */}
                    {showTechnicians && filteredTechnicians.map((tech) => {
                        if (
                            typeof tech.latitude !== 'number' ||
                            typeof tech.longitude !== 'number' ||
                            isNaN(tech.latitude) ||
                            isNaN(tech.longitude)
                        ) {
                            return null;
                        }

                        return (
                            <Marker
                                key={`technician-${tech.id}`}
                                position={[tech.latitude, tech.longitude]}
                                icon={technicianIcon}
                                eventHandlers={{
                                    click: () => {
                                        setSelectedTechnician(tech);
                                        setShowDetailModal(true);
                                        onTechnicianClick?.(tech);
                                    }
                                }}
                            >
                                <Circle
                                    center={[tech.latitude, tech.longitude]}
                                    radius={tech.is_available ? 1000 : 500}
                                    pathOptions={{
                                        color: tech.is_available ? 'green' : 'red',
                                        fillColor: tech.is_available ? 'green' : 'red',
                                        fillOpacity: 0.1
                                    }}
                                />
                                <Popup>
                                    <div className="min-w-[200px]">
                                        <div className="font-bold text-green-700 mb-2">{tech.name}</div>
                                        <div className="text-sm text-gray-700 mb-1">{tech.email}</div>
                                        <div className="text-xs text-gray-500 mb-1">
                                            Statut : <span className={`font-semibold ${tech.is_available ? 'text-green-600' : 'text-red-600'}`}>
                                                {tech.is_available ? 'Disponible' : 'Indisponible'}
                                            </span>
                                        </div>
                                        {tech.rating && (
                                            <div className="text-xs text-gray-500 mb-1">
                                                Note : ⭐ {tech.rating}/5
                                            </div>
                                        )}
                                        {tech.specialties && tech.specialties.length > 0 && (
                                            <div className="text-xs text-gray-500 mb-1">
                                                Spécialités : {tech.specialties.join(', ')}
                                            </div>
                                        )}
                                        <button
                                            onClick={() => {
                                                setSelectedTechnician(tech);
                                                setShowDetailModal(true);
                                            }}
                                            className="mt-2 w-full bg-green-600 text-white text-xs px-2 py-1 rounded hover:bg-green-700"
                                        >
                                            Voir profil
                                        </button>
                                    </div>
                                </Popup>
                            </Marker>
                        );
                    })}
                </MapContainer>
            </div>

            {/* Modal de détails */}
            {showDetailModal && (selectedRequest || selectedTechnician) && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    {selectedRequest ? 'Détails de la Demande' : 'Profil du Technicien'}
                                </h3>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            {selectedRequest && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Service</label>
                                            <p className="text-sm text-gray-900">{selectedRequest.service?.name || ''}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Statut</label>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedRequest.status)}`}>
                                                {selectedRequest.status}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Adresse</label>
                                        <p className="text-sm text-gray-900">{selectedRequest.address}</p>
                                        <p className="text-xs text-gray-500">{selectedRequest.quartier}, {selectedRequest.city}</p>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Client</label>
                                            <p className="text-sm text-gray-900">{selectedRequest.client && selectedRequest.client.user ? `${selectedRequest.client.user.username}` : ''}</p>
                                            <p className="text-xs text-gray-500">{selectedRequest.client && selectedRequest.client.user ? selectedRequest.client.user.email : ''}</p>
                                        </div>
                                        {selectedRequest.technician && (
                                            <div>
                                                <label className="block text-sm font-medium text-gray-700">Technicien</label>
                                                <p className="text-sm text-gray-900">{selectedRequest.technician?.user?.username || 'Utilisateur inconnu'}</p>
                                                <p className="text-xs text-gray-500">{selectedRequest.technician?.user?.email || 'Email non disponible'}</p>
                                            </div>
                                        )}
                                    </div>

                                    {selectedRequest.description && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Description</label>
                                            <p className="text-sm text-gray-900">{selectedRequest.description}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Date de création</label>
                                            <p className="text-sm text-gray-900">
                                                {new Date(selectedRequest.created_at || '').toLocaleString('fr-FR')}
                                            </p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Dernière mise à jour</label>
                                            <p className="text-sm text-gray-900">
                                                {new Date(selectedRequest.updated_at || '').toLocaleString('fr-FR')}
                                            </p>
                                        </div>
                                    </div>

                                    {selectedRequest.is_urgent && (
                                        <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                                            <div className="flex items-center">
                                                <AlertTriangle className="h-5 w-5 text-red-600 mr-2" />
                                                <span className="text-sm font-medium text-red-800">Demande urgente</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}

                            {selectedTechnician && (
                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Nom</label>
                                            <p className="text-sm text-gray-900">{selectedTechnician.name}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Statut</label>
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedTechnician.is_available ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {selectedTechnician.is_available ? 'Disponible' : 'Indisponible'}
                                            </span>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Email</label>
                                        <p className="text-sm text-gray-900">{selectedTechnician.email}</p>
                                    </div>

                                    {selectedTechnician.rating && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Note</label>
                                            <p className="text-sm text-gray-900">⭐ {selectedTechnician.rating}/5</p>
                                        </div>
                                    )}

                                    {selectedTechnician.specialties && selectedTechnician.specialties.length > 0 && (
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Spécialités</label>
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {selectedTechnician.specialties.map((specialty, index) => (
                                                    <span key={index} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded">
                                                        {specialty}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Latitude</label>
                                            <p className="text-sm text-gray-900">{selectedTechnician.latitude}</p>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700">Longitude</label>
                                            <p className="text-sm text-gray-900">{selectedTechnician.longitude}</p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}
        </div>
    );
};

export default AdminRequestsMap; 