import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

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

interface LiveLocationMapProps {
    userType: 'technician' | 'client';
    userId: number;
    title?: string;
    height?: string;
    showGoogleMapsLink?: boolean;
    onLocationReceived?: (latitude: number, longitude: number) => void;
}

// Composant pour centrer automatiquement la carte sur la nouvelle position
const MapUpdater: React.FC<{ position: [number, number] | null }> = ({ position }) => {
    const map = useMap();

    useEffect(() => {
        if (!map) return;
        if (position && Array.isArray(position) && position.length === 2 &&
            typeof position[0] === 'number' && typeof position[1] === 'number' &&
            !isNaN(position[0]) && !isNaN(position[1])) {
            try {
                map.setView(position, map.getZoom());
            } catch (e) {
                // Ignore Leaflet errors
            }
        }
    }, [position, map]);

    return null;
};

const LiveLocationMap: React.FC<LiveLocationMapProps> = ({
    userType,
    userId,
    title = 'Suivi en temps réel',
    height = '400px',
    showGoogleMapsLink = true,
    onLocationReceived
}) => {
    const [position, setPosition] = useState<[number, number] | null>(null);
    const [isConnected, setIsConnected] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const wsRef = useRef<WebSocket | null>(null);

    const getWebSocketUrl = () => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Correction : forcer le port backend
        const host = '127.0.0.1:8000';
        const endpoint = userType === 'technician'
            ? `ws/technician-tracking/${userId}/`
            : `ws/client-tracking/${userId}/`;
        // Correction : ajout du token JWT dans l'URL pour authentification WebSocket
        const token = localStorage.getItem('token');
        return `${protocol}//${host}/${endpoint}?token=${token}`;
    };

    const connectWebSocket = () => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const wsUrl = getWebSocketUrl();

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log(`🗺️ WebSocket connecté pour suivre ${userType} ${userId}`);
                setIsConnected(true);
                setError(null);
            };

            wsRef.current.onclose = () => {
                console.log(`🗺️ WebSocket déconnecté pour ${userType} ${userId}`);
                setIsConnected(false);
            };

            wsRef.current.onerror = (error) => {
                console.error(`🗺️ Erreur WebSocket pour ${userType} ${userId}:`, error);
                setError('Erreur de connexion WebSocket');
                setIsConnected(false);
            };

            wsRef.current.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);

                    if (data.type === 'location_update' && data.latitude && data.longitude) {
                        const newPosition: [number, number] = [data.latitude, data.longitude];
                        setPosition(newPosition);
                        setLastUpdate(new Date());
                        onLocationReceived?.(data.latitude, data.longitude);

                        console.log(`🗺️ Position reçue: ${data.latitude}, ${data.longitude}`);
                    }
                } catch (error) {
                    console.error('🗺️ Erreur lors du parsing des données WebSocket:', error);
                }
            };

        } catch (error) {
            console.error(`🗺️ Erreur lors de la connexion WebSocket:`, error);
            setError('Impossible de se connecter au serveur');
        }
    };

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
                wsRef.current = null;
            }
        };
    }, [userType, userId]);

    // Position par défaut (Bamako)
    const defaultPosition: [number, number] = [12.6392, -8.0029];

    const getMarkerIcon = () => {
        const iconUrl = userType === 'technician'
            ? 'https://cdn-icons-png.flaticon.com/512/684/684908.png' // Icône technicien
            : 'https://cdn-icons-png.flaticon.com/512/684/684909.png'; // Icône client

        return L.icon({
            iconUrl,
            iconSize: [32, 32],
            iconAnchor: [16, 32],
            popupAnchor: [0, -32],
        });
    };

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    return (
        <div className="w-full">
            <div className="mb-4">
                <h3 className="text-lg font-semibold mb-2">{title}</h3>

                <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
                        <span>{isConnected ? 'Connecté' : 'Déconnecté'}</span>
                    </div>

                    {lastUpdate && (
                        <span className="text-gray-600">
                            Dernière mise à jour: {formatTime(lastUpdate)}
                        </span>
                    )}

                    {error && (
                        <span className="text-red-600">{error}</span>
                    )}
                </div>
            </div>

            <div
                className="border rounded-lg overflow-hidden"
                style={{ height }}
            >
                <MapContainer
                    center={position || defaultPosition}
                    zoom={15}
                    style={{ height: '100%', width: '100%' }}
                >
                    <TileLayer
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    />

                    {position && (
                        <Marker position={position} icon={getMarkerIcon()}>
                            <Popup>
                                <div className="text-center">
                                    <p className="font-semibold">
                                        {userType === 'technician' ? 'Technicien' : 'Client'}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Lat: {position[0].toFixed(6)}
                                    </p>
                                    <p className="text-sm text-gray-600">
                                        Lng: {position[1].toFixed(6)}
                                    </p>

                                    {showGoogleMapsLink && (
                                        <a
                                            href={`https://www.google.com/maps?q=${position[0]},${position[1]}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-block mt-2 px-3 py-1 bg-blue-500 text-white text-sm rounded hover:bg-blue-600 transition-colors"
                                        >
                                            📍 Ouvrir dans Google Maps
                                        </a>
                                    )}
                                </div>
                            </Popup>
                        </Marker>
                    )}

                    <MapUpdater position={position} />
                </MapContainer>
            </div>

            {!position && (
                <div className="mt-4 p-4 bg-gray-100 rounded-lg text-center">
                    <p className="text-gray-600">
                        En attente de la position du {userType === 'technician' ? 'technicien' : 'client'}...
                    </p>
                </div>
            )}
        </div>
    );
};

export default LiveLocationMap; 