import React, { useEffect, useRef, useCallback } from 'react';

interface LocationTrackerProps {
    userType: 'technician' | 'client';
    userId: number;
    isTracking: boolean;
    intervalMs?: number;
    onLocationUpdate?: (latitude: number, longitude: number) => void;
    onError?: (error: string) => void;
}

const LocationTracker: React.FC<LocationTrackerProps> = ({
    userType,
    userId,
    isTracking,
    intervalMs = 5000, // 5 secondes par défaut
    onLocationUpdate,
    onError
}) => {
    const wsRef = useRef<WebSocket | null>(null);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    const isConnected = useRef(false);

    const getWebSocketUrl = useCallback(() => {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // Correction : forcer le port backend
        const host = '127.0.0.1:8000';
        const endpoint = userType === 'technician'
            ? `ws/technician-tracking/${userId}/`
            : `ws/client-tracking/${userId}/`;
        // Correction : ajout du token JWT dans l'URL pour authentification WebSocket
        const token = localStorage.getItem('token');
        return `${protocol}//${host}/${endpoint}?token=${token}`;
    }, [userType, userId]);

    const connectWebSocket = useCallback(() => {
        if (wsRef.current?.readyState === WebSocket.OPEN) {
            return;
        }

        const token = localStorage.getItem('token');
        const wsUrl = getWebSocketUrl();

        try {
            wsRef.current = new WebSocket(wsUrl);

            wsRef.current.onopen = () => {
                console.log(`📍 WebSocket connecté pour ${userType} ${userId}`);
                isConnected.current = true;
            };

            wsRef.current.onclose = () => {
                console.log(`📍 WebSocket déconnecté pour ${userType} ${userId}`);
                isConnected.current = false;
            };

            wsRef.current.onerror = (error) => {
                console.error(`📍 Erreur WebSocket pour ${userType} ${userId}:`, error);
                onError?.('Erreur de connexion WebSocket');
            };

        } catch (error) {
            console.error(`📍 Erreur lors de la connexion WebSocket:`, error);
            onError?.('Impossible de se connecter au serveur');
        }
    }, [getWebSocketUrl, userType, userId, onError]);

    const sendLocation = useCallback(() => {
        if (!navigator.geolocation) {
            onError?.('La géolocalisation n\'est pas supportée par ce navigateur');
            return;
        }

        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;

                if (wsRef.current?.readyState === WebSocket.OPEN) {
                    const locationData = {
                        latitude,
                        longitude
                    };

                    wsRef.current.send(JSON.stringify(locationData));
                    onLocationUpdate?.(latitude, longitude);

                    console.log(`📍 Position envoyée: ${latitude}, ${longitude}`);
                } else {
                    console.warn('📍 WebSocket non connecté, impossible d\'envoyer la position');
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

                onError?.(errorMessage);
            },
            {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 30000
            }
        );
    }, [onLocationUpdate, onError]);

    const startTracking = useCallback(() => {
        if (!isTracking) return;

        // Connecter le WebSocket
        connectWebSocket();

        // Démarrer l'envoi périodique de position
        intervalRef.current = setInterval(() => {
            if (isConnected.current) {
                sendLocation();
            } else {
                // Reconnecter si déconnecté
                connectWebSocket();
            }
        }, intervalMs);

        // Envoyer la première position immédiatement
        setTimeout(sendLocation, 1000);
    }, [isTracking, connectWebSocket, sendLocation, intervalMs]);

    const stopTracking = useCallback(() => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
        }

        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }

        isConnected.current = false;
    }, []);

    useEffect(() => {
        if (isTracking) {
            startTracking();
        } else {
            stopTracking();
        }

        return () => {
            stopTracking();
        };
    }, [isTracking, startTracking, stopTracking]);

    // Nettoyage à la destruction du composant
    useEffect(() => {
        return () => {
            stopTracking();
        };
    }, [stopTracking]);

    return null; // Ce composant n'a pas d'interface utilisateur
};

export default LocationTracker; 