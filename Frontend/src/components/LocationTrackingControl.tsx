import React, { useState, useCallback } from 'react';
import LocationTracker from './LocationTracker';

interface LocationTrackingControlProps {
    userType: 'technician' | 'client';
    userId: number;
    title?: string;
    description?: string;
    onTrackingStart?: () => void;
    onTrackingStop?: () => void;
    onLocationUpdate?: (latitude: number, longitude: number) => void;
    onError?: (error: string) => void;
}

const LocationTrackingControl: React.FC<LocationTrackingControlProps> = ({
    userType,
    userId,
    title = 'Suivi de géolocalisation',
    description,
    onTrackingStart,
    onTrackingStop,
    onLocationUpdate,
    onError
}) => {
    const [isTracking, setIsTracking] = useState(false);
    const [currentPosition, setCurrentPosition] = useState<{ latitude: number; longitude: number } | null>(null);
    const [lastUpdate, setLastUpdate] = useState<Date | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleTrackingToggle = useCallback(() => {
        if (isTracking) {
            setIsTracking(false);
            onTrackingStop?.();
        } else {
            setIsTracking(true);
            onTrackingStart?.();
        }
    }, [isTracking, onTrackingStart, onTrackingStop]);

    const handleLocationUpdate = useCallback((latitude: number, longitude: number) => {
        setCurrentPosition({ latitude, longitude });
        setLastUpdate(new Date());
        setError(null);
        onLocationUpdate?.(latitude, longitude);
    }, [onLocationUpdate]);

    const handleError = useCallback((errorMessage: string) => {
        setError(errorMessage);
        onError?.(errorMessage);
    }, [onError]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString('fr-FR', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
    };

    const getStatusColor = () => {
        if (error) return 'text-red-600';
        if (isTracking && currentPosition) return 'text-green-600';
        if (isTracking) return 'text-yellow-600';
        return 'text-gray-600';
    };

    const getStatusText = () => {
        if (error) return 'Erreur';
        if (isTracking && currentPosition) return 'Actif';
        if (isTracking) return 'En cours...';
        return 'Inactif';
    };

    return (
        <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
                <div>
                    <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
                    {description && (
                        <p className="text-sm text-gray-600 mt-1">{description}</p>
                    )}
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <div className={`w-3 h-3 rounded-full ${getStatusColor().replace('text-', 'bg-')}`}></div>
                        <span className={`text-sm font-medium ${getStatusColor()}`}>
                            {getStatusText()}
                        </span>
                    </div>

                    <button
                        onClick={handleTrackingToggle}
                        className={`px-4 py-2 rounded-lg font-medium transition-colors ${isTracking
                                ? 'bg-red-500 hover:bg-red-600 text-white'
                                : 'bg-blue-500 hover:bg-blue-600 text-white'
                            }`}
                    >
                        {isTracking ? '🛑 Arrêter le suivi' : '📍 Démarrer le suivi'}
                    </button>
                </div>
            </div>

            {currentPosition && lastUpdate && (
                <div className="bg-gray-50 rounded-lg p-4 mb-4">
                    <h4 className="font-medium text-gray-900 mb-2">Position actuelle</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                            <span className="text-gray-600">Latitude:</span>
                            <span className="ml-2 font-mono">{currentPosition.latitude.toFixed(6)}</span>
                        </div>
                        <div>
                            <span className="text-gray-600">Longitude:</span>
                            <span className="ml-2 font-mono">{currentPosition.longitude.toFixed(6)}</span>
                        </div>
                        <div className="col-span-2">
                            <span className="text-gray-600">Dernière mise à jour:</span>
                            <span className="ml-2">{formatTime(lastUpdate)}</span>
                        </div>
                    </div>

                    <div className="mt-3">
                        <a
                            href={`https://www.google.com/maps?q=${currentPosition.latitude},${currentPosition.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-2 px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 transition-colors"
                        >
                            📍 Voir sur Google Maps
                        </a>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center gap-2">
                        <span className="text-red-600">⚠️</span>
                        <span className="text-red-800 font-medium">Erreur:</span>
                        <span className="text-red-700">{error}</span>
                    </div>
                </div>
            )}

            {isTracking && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center gap-2">
                        <div className="animate-pulse w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-blue-800 text-sm">
                            Suivi en cours... La position est envoyée toutes les 5 secondes
                        </span>
                    </div>
                </div>
            )}

            {/* Composant LocationTracker invisible qui gère le tracking */}
            <LocationTracker
                userType={userType}
                userId={userId}
                isTracking={isTracking}
                intervalMs={5000}
                onLocationUpdate={handleLocationUpdate}
                onError={handleError}
            />
        </div>
    );
};

export default LocationTrackingControl; 