import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Polyline } from 'react-leaflet';
import L from 'leaflet';
import { Phone, MapPin, Navigation, Clock, User, Car, AlertCircle, CheckCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

// Import marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

interface RealTimeTrackingProps {
    requestId: number;
    clientId: number;
    technicianId: number;
    clientPhone: string;
    technicianPhone: string;
    clientName: string;
    technicianName: string;
    status: string;
    onStatusUpdate?: (status: string) => void;
}

interface Location {
    latitude: number;
    longitude: number;
    timestamp: string;
}

interface TrackingData {
    clientLocation: Location | null;
    technicianLocation: Location | null;
    estimatedArrival: string | null;
    distance: number | null;
    isTechnicianMoving: boolean;
}

const RealTimeTracking: React.FC<RealTimeTrackingProps> = ({
    requestId,
    clientId,
    technicianId,
    clientPhone,
    technicianPhone,
    clientName,
    technicianName,
    status,
    onStatusUpdate
}) => {
    const { user } = useAuth();
    const [trackingData, setTrackingData] = useState<TrackingData>({
        clientLocation: null,
        technicianLocation: null,
        estimatedArrival: null,
        distance: null,
        isTechnicianMoving: false
    });
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isSharingLocation, setIsSharingLocation] = useState(false);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

    const wsRef = useRef<WebSocket | null>(null);
    const locationIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const isClient = user?.user_type === 'client';
    const isTechnician = user?.user_type === 'technician';

    // Position par défaut (Bamako)
    const defaultPosition: [number, number] = [12.6392, -8.0029];

    const getWebSocketUrl = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = '127.0.0.1:8000';
        const token = localStorage.getItem('token');
        return `${protocol}//${host}/ws/request-tracking/${requestId}/?token=${token}`;
    };

    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const wsUrl = getWebSocketUrl();

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log(`🗺️ WebSocket connecté pour le suivi de la demande ${requestId}`);
                setIsConnected(true);
                setError(null);
            };

            wsRef.current.onclose = () => {
                console.log(`🗺️ WebSocket déconnecté pour la demande ${requestId}`);
                setIsConnected(false);
            };

            wsRef.current.onerror = (error) => {
                console.error(`🗺️ Erreur WebSocket pour la demande ${requestId}:`, error);
                setError('Erreur de connexion WebSocket');
                setIsConnected(false);
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    handleWebSocketMessage(data);
                } catch (error) {
                    console.error('🗺️ Erreur lors du parsing des données WebSocket:', error);
                }
            };

        } catch (error) {
            console.error(`🗺️ Erreur lors de la connexion WebSocket:`, error);
            setError('Impossible de se connecter au serveur');
        }
    };

    const handleWebSocketMessage = (data: any) => {
        switch (data.type) {
            case 'location_update':
                if (data.user_type === 'client') {
                    setTrackingData(prev => ({
                        ...prev,
                        clientLocation: {
                            latitude: data.latitude,
                            longitude: data.longitude,
                            timestamp: data.timestamp
                        }
                    }));
                } else if (data.user_type === 'technician') {
                    setTrackingData(prev => ({
                        ...prev,
                        technicianLocation: {
                            latitude: data.latitude,
                            longitude: data.longitude,
                            timestamp: data.timestamp
                        }
                    }));
                }
                setLastUpdate(new Date());
                break;

            case 'status_update':
                onStatusUpdate?.(data.status);
                break;

            case 'estimated_arrival':
                setTrackingData(prev => ({
                    ...prev,
                    estimatedArrival: data.estimated_arrival,
                    distance: data.distance,
                    isTechnicianMoving: data.is_moving
                }));
                break;

            case 'error':
                setError(data.message);
                break;
        }
    };

    const startLocationSharing = () => {
        if (!navigator.geolocation) {
            setError('La géolocalisation n\'est pas supportée par votre navigateur');
            return;
        }

        setIsSharingLocation(true);

        const sendLocation = () => {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;

                    if (wsRef.current?.readyState === WebSocket.OPEN) {
                        const locationData = {
                            type: 'location_update',
                            user_type: isClient ? 'client' : 'technician',
                            latitude,
                            longitude,
                            timestamp: new Date().toISOString()
                        };

                        wsRef.current.send(JSON.stringify(locationData));
                        console.log(`📍 Position envoyée: ${latitude}, ${longitude}`);
                    }
                },
                (error) => {
                    console.error('📍 Erreur de géolocalisation:', error);
                    let errorMessage = 'Erreur de géolocalisation';

                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage = 'Permission de géolocalisation refusée';
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage = 'Position indisponible';
                            break;
                        case error.TIMEOUT:
                            errorMessage = 'Délai de géolocalisation dépassé';
                            break;
                    }

                    setError(errorMessage);
                    setIsSharingLocation(false);
                },
                {
                    enableHighAccuracy: true,
                    timeout: 10000,
                    maximumAge: 30000
                }
            );
        };

        // Envoyer la première position immédiatement
        sendLocation();

        // Envoyer la position toutes les 10 secondes
        locationIntervalRef.current = setInterval(sendLocation, 10000);
    };

    const stopLocationSharing = () => {
        setIsSharingLocation(false);
        if (locationIntervalRef.current) {
            clearInterval(locationIntervalRef.current);
            locationIntervalRef.current = null;
        }
    };

    const handleCall = (phoneNumber: string, name: string) => {
        if (confirm(`Appeler ${name} au ${phoneNumber} ?`)) {
            window.location.href = `tel:${phoneNumber}`;
        }
    };

    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
        const R = 6371; // Rayon de la Terre en km
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getMarkerIcon = (type: 'client' | 'technician') => {
        const iconUrl = type === 'technician'
            ? 'https://cdn-icons-png.flaticon.com/512/684/684908.png' // Icône technicien
            : 'https://cdn-icons-png.flaticon.com/512/684/684909.png'; // Icône client

        return L.icon({
            iconUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
        });
    };

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
            stopLocationSharing();
        };
    }, [requestId]);

    // Calculer la distance et l'ETA quand les positions changent
    useEffect(() => {
        if (trackingData.clientLocation && trackingData.technicianLocation) {
            const distance = calculateDistance(
                trackingData.clientLocation.latitude,
                trackingData.clientLocation.longitude,
                trackingData.technicianLocation.latitude,
                trackingData.technicianLocation.longitude
            );

            // Estimation du temps d'arrivée (5 minutes par km)
            const estimatedMinutes = Math.ceil(distance * 5);
            const estimatedArrival = new Date(Date.now() + estimatedMinutes * 60000);

            setTrackingData(prev => ({
                ...prev,
                distance,
                estimatedArrival: estimatedArrival.toISOString()
            }));
        }
    }, [trackingData.clientLocation, trackingData.technicianLocation]);

    const centerPosition = trackingData.technicianLocation
        ? [trackingData.technicianLocation.latitude, trackingData.technicianLocation.longitude] as [number, number]
        : trackingData.clientLocation
            ? [trackingData.clientLocation.latitude, trackingData.clientLocation.longitude] as [number, number]
            : defaultPosition;

    return (
        <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Navigation className="h-6 w-6 text-blue-600" />
                    Suivi en temps réel
                </h2>

                <div className="flex items-center gap-2">
                    {isConnected ? (
                        <div className="flex items-center gap-2 text-green-600">
                            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                            <span className="text-sm">Connecté</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-red-600">
                            <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                            <span className="text-sm">Déconnecté</span>
                        </div>
                    )}
                </div>
            </div>

            {/* Contrôles de partage de position */}
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between">
                    <div>
                        <h3 className="font-semibold text-gray-900 mb-1">Partage de position</h3>
                        <p className="text-sm text-gray-600">
                            {isSharingLocation
                                ? 'Votre position est partagée en temps réel'
                                : 'Partagez votre position pour améliorer le suivi'
                            }
                        </p>
                    </div>

                    <button
                        onClick={isSharingLocation ? stopLocationSharing : startLocationSharing}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${isSharingLocation
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        {isSharingLocation ? 'Arrêter le partage' : 'Partager ma position'}
                    </button>
                </div>
            </div>

            {/* Informations de suivi */}
            {trackingData.distance !== null && (
                <div className="mb-6 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <MapPin className="h-5 w-5 text-blue-600" />
                            <span className="font-semibold text-blue-900">Distance</span>
                        </div>
                        <p className="text-2xl font-bold text-blue-700">
                            {trackingData.distance.toFixed(1)} km
                        </p>
                    </div>

                    {trackingData.estimatedArrival && (
                        <div className="bg-green-50 p-4 rounded-lg">
                            <div className="flex items-center gap-2 mb-2">
                                <Clock className="h-5 w-5 text-green-600" />
                                <span className="font-semibold text-green-900">Arrivée estimée</span>
                            </div>
                            <p className="text-2xl font-bold text-green-700">
                                {new Date(trackingData.estimatedArrival).toLocaleTimeString('fr-FR', {
                                    hour: '2-digit',
                                    minute: '2-digit'
                                })}
                            </p>
                        </div>
                    )}

                    <div className="bg-orange-50 p-4 rounded-lg">
                        <div className="flex items-center gap-2 mb-2">
                            <Car className="h-5 w-5 text-orange-600" />
                            <span className="font-semibold text-orange-900">Statut</span>
                        </div>
                        <p className="text-lg font-bold text-orange-700">
                            {trackingData.isTechnicianMoving ? 'En route' : 'Arrêté'}
                        </p>
                    </div>
                </div>
            )}

            {/* Boutons d'appel */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                <button
                    onClick={() => handleCall(clientPhone, clientName)}
                    className="flex items-center justify-center gap-3 p-4 bg-green-500 hover:bg-green-600 text-white rounded-lg font-medium transition-colors"
                >
                    <Phone className="h-5 w-5" />
                    <span>Appeler le client</span>
                </button>

                <button
                    onClick={() => handleCall(technicianPhone, technicianName)}
                    className="flex items-center justify-center gap-3 p-4 bg-blue-500 hover:bg-blue-600 text-white rounded-lg font-medium transition-colors"
                >
                    <Phone className="h-5 w-5" />
                    <span>Appeler le technicien</span>
                </button>
            </div>

            {/* Carte */}
            <div className="h-[400px] rounded-lg overflow-hidden border">
                <MapContainer
                    center={centerPosition}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {/* Marqueur du client */}
                    {trackingData.clientLocation && (
                        <Marker
                            position={[trackingData.clientLocation.latitude, trackingData.clientLocation.longitude]}
                            icon={getMarkerIcon('client')}
                        >
                            <Popup>
                                <div className="text-center">
                                    <div className="font-semibold text-blue-600">{clientName}</div>
                                    <div className="text-sm text-gray-600">Client</div>
                                    <div className="text-xs text-gray-500">
                                        {formatTime(new Date(trackingData.clientLocation.timestamp))}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Marqueur du technicien */}
                    {trackingData.technicianLocation && (
                        <Marker
                            position={[trackingData.technicianLocation.latitude, trackingData.technicianLocation.longitude]}
                            icon={getMarkerIcon('technician')}
                        >
                            <Popup>
                                <div className="text-center">
                                    <div className="font-semibold text-green-600">{technicianName}</div>
                                    <div className="text-sm text-gray-600">Technicien</div>
                                    <div className="text-xs text-gray-500">
                                        {formatTime(new Date(trackingData.technicianLocation.timestamp))}
                                    </div>
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    {/* Ligne de route entre client et technicien */}
                    {trackingData.clientLocation && trackingData.technicianLocation && (
                        <Polyline
                            positions={[
                                [trackingData.clientLocation.latitude, trackingData.clientLocation.longitude],
                                [trackingData.technicianLocation.latitude, trackingData.technicianLocation.longitude]
                            ]}
                            color="blue"
                            weight={3}
                            opacity={0.7}
                        />
                    )}
                </MapContainer>
            </div>

            {/* Dernière mise à jour */}
            {lastUpdate && (
                <div className="mt-4 text-center text-sm text-gray-500">
                    Dernière mise à jour : {formatTime(lastUpdate)}
                </div>
            )}

            {/* Erreur */}
            {error && (
                <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <div className="flex items-center gap-2">
                        <AlertCircle className="h-5 w-5 text-red-600" />
                        <span className="text-red-800 font-medium">Erreur:</span>
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RealTimeTracking; 