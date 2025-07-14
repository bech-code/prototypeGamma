import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Search, Filter, Clock, Star, Phone, MessageSquare, Navigation, AlertCircle, CheckCircle, XCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Circle } from 'react-leaflet';
import L from 'leaflet';
import axios from 'axios';

interface Technician {
    id: number;
    user: {
        id: number;
        first_name: string;
        last_name: string;
        email: string;
        username: string;
    };
    specialty: string;
    years_experience: number;
    hourly_rate: number;
    is_available: boolean;
    is_verified: boolean;
    distance: number;
    average_rating: number;
    city: string;
    eta_minutes: number;
    location_quality: string;
    is_urgent_available: boolean;
    availability_score: number;
    reliability_score: number;
    current_location: {
        latitude: number;
        longitude: number;
        accuracy: number | null;
        is_moving: boolean;
        last_update: string | null;
    };
}

interface SearchFilters {
    specialty: string;
    min_experience_level: string;
    min_rating: string;
    urgence: string;
    max_distance: number;
}

interface SearchStats {
    total_found: number;
    search_radius_km: number;
    user_location: {
        latitude: number;
        longitude: number;
    };
    filters_applied: {
        specialty: string;
        min_experience_level: string;
        min_rating: string;
        urgence: string;
    };
}

const PreciseTechnicianSearch: React.FC = () => {
    const [technicians, setTechnicians] = useState<Technician[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
    const [searchStats, setSearchStats] = useState<SearchStats | null>(null);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedTechnician, setSelectedTechnician] = useState<Technician | null>(null);

    const [filters, setFilters] = useState<SearchFilters>({
        specialty: '',
        min_experience_level: '',
        min_rating: '3.0',
        urgence: 'normal',
        max_distance: 30
    });

    const specialties = [
        { value: 'plumber', label: 'Plomberie' },
        { value: 'electrician', label: 'Électricité' },
        { value: 'locksmith', label: 'Serrurerie' },
        { value: 'carpenter', label: 'Menuiserie' },
        { value: 'painter', label: 'Peinture' },
        { value: 'mechanic', label: 'Mécanique' },
        { value: 'technician', label: 'Technicien général' }
    ];

    const experienceLevels = [
        { value: '1', label: '1+ an' },
        { value: '3', label: '3+ ans' },
        { value: '5', label: '5+ ans' },
        { value: '10', label: '10+ ans' }
    ];

    const ratingOptions = [
        { value: '3.0', label: '3.0+ étoiles' },
        { value: '3.5', label: '3.5+ étoiles' },
        { value: '4.0', label: '4.0+ étoiles' },
        { value: '4.5', label: '4.5+ étoiles' }
    ];

    const urgenceOptions = [
        { value: 'normal', label: 'Normal' },
        { value: 'urgent', label: 'Urgent' },
        { value: 'sos', label: 'SOS' }
    ];

    const getLocationQualityIcon = (quality: string) => {
        switch (quality) {
            case 'excellent':
                return <CheckCircle className="w-4 h-4 text-green-500" />;
            case 'good':
                return <CheckCircle className="w-4 h-4 text-blue-500" />;
            case 'fair':
                return <AlertCircle className="w-4 h-4 text-yellow-500" />;
            case 'poor':
                return <XCircle className="w-4 h-4 text-red-500" />;
            default:
                return <AlertCircle className="w-4 h-4 text-gray-500" />;
        }
    };

    const getLocationQualityLabel = (quality: string) => {
        switch (quality) {
            case 'excellent':
                return 'Excellente';
            case 'good':
                return 'Bonne';
            case 'fair':
                return 'Moyenne';
            case 'poor':
                return 'Faible';
            default:
                return 'Inconnue';
        }
    };

    const getSpecialtyLabel = (specialty: string) => {
        const found = specialties.find(s => s.value === specialty);
        return found ? found.label : specialty;
    };

    const getUrgenceLabel = (urgence: string) => {
        const found = urgenceOptions.find(u => u.value === urgence);
        return found ? found.label : urgence;
    };

    const getUserLocation = useCallback(() => {
        setLoading(true);
        setError(null);

        if (!navigator.geolocation) {
            setError('La géolocalisation n\'est pas supportée par votre navigateur');
            setLoading(false);
            return;
        }

        navigator.geolocation.getCurrentPosition(
            async (position) => {
                const { latitude, longitude } = position.coords;
                setUserLocation([latitude, longitude]);
                await searchTechnicians(latitude, longitude);
            },
            (err: GeolocationPositionError) => {
                let errorMessage = 'Erreur de géolocalisation';
                switch (err.code) {
                    case 1:
                        errorMessage = 'Permission de géolocalisation refusée';
                        break;
                    case 2:
                        errorMessage = 'Position non disponible';
                        break;
                    case 3:
                        errorMessage = 'Délai d\'attente dépassé';
                        break;
                }
                setError(errorMessage);
                setLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
        );
    }, []);

    const searchTechnicians = async (lat: number, lng: number) => {
        try {
            const token = localStorage.getItem('token');
            const params = new URLSearchParams({
                lat: lat.toString(),
                lng: lng.toString(),
                max_distance: filters.max_distance.toString(),
                limit: '20'
            });

            if (filters.specialty) {
                params.append('specialty', filters.specialty);
            }
            if (filters.min_experience_level) {
                params.append('min_experience_level', filters.min_experience_level);
            }
            if (filters.min_rating) {
                params.append('min_rating', filters.min_rating);
            }
            if (filters.urgence) {
                params.append('urgence', filters.urgence);
            }

            const response = await axios.get(
                `/depannage/api/techniciens-proches/?${params}`,
                {
                    headers: token ? { Authorization: `Bearer ${token}` } : {},
                }
            );

            setTechnicians(response.data.technicians || []);
            setSearchStats(response.data.search_stats || null);
        } catch (error) {
            console.error('Erreur lors de la recherche:', error);
            setError('Erreur lors de la recherche de techniciens');
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (key: keyof SearchFilters, value: string | number) => {
        setFilters(prev => ({ ...prev, [key]: value }));
    };

    const handleSearch = () => {
        if (userLocation) {
            searchTechnicians(userLocation[0], userLocation[1]);
        }
    };

    const handleContactTechnician = (technician: Technician) => {
        // Implémenter la logique de contact
        console.log('Contacter le technicien:', technician.id);
        setSelectedTechnician(technician);
    };

    const handleCallTechnician = (technician: Technician) => {
        // Implémenter la logique d'appel
        console.log('Appeler le technicien:', technician.id);
    };

    const handleMessageTechnician = (technician: Technician) => {
        // Implémenter la logique de message
        console.log('Envoyer un message au technicien:', technician.id);
    };

    const handleNavigateToTechnician = (technician: Technician) => {
        const { latitude, longitude } = technician.current_location;
        const url = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
        window.open(url, '_blank');
    };

    useEffect(() => {
        if (userLocation) {
            searchTechnicians(userLocation[0], userLocation[1]);
        }
    }, [filters]);

    return (
        <div className="max-w-7xl mx-auto px-4 py-8">
            {/* En-tête */}
            <div className="text-center mb-8">
                <h1 className="text-3xl font-bold text-gray-900 mb-4">
                    Trouvez les Techniciens les Plus Proches
                </h1>
                <p className="text-gray-600 max-w-2xl mx-auto">
                    Géolocalisation précise pour trouver les techniciens qualifiés dans un rayon de 30km autour de votre position.
                </p>
            </div>

            {/* Bouton de géolocalisation */}
            <div className="flex justify-center mb-8">
                <button
                    onClick={getUserLocation}
                    disabled={loading}
                    className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-lg transition-colors inline-flex items-center space-x-2 disabled:opacity-50"
                >
                    {loading ? (
                        <>
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                            <span>Localisation en cours...</span>
                        </>
                    ) : (
                        <>
                            <MapPin className="h-5 w-5" />
                            <span>Utiliser Ma Position</span>
                        </>
                    )}
                </button>
            </div>

            {/* Message d'erreur */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 max-w-2xl mx-auto">
                    <div className="flex items-center">
                        <AlertCircle className="w-5 h-5 mr-2" />
                        <span>{error}</span>
                    </div>
                </div>
            )}

            {/* Statistiques de recherche */}
            {searchStats && (
                <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-lg mb-6 max-w-2xl mx-auto">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <Search className="w-5 h-5 mr-2" />
                            <span>
                                Trouvé {searchStats.total_found} technicien(s) dans un rayon de {searchStats.search_radius_km}km
                            </span>
                        </div>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800"
                        >
                            <Filter className="w-4 h-4" />
                            <span>Filtres</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Filtres */}
            {showFilters && (
                <div className="bg-white border border-gray-200 rounded-lg p-6 mb-8 max-w-4xl mx-auto">
                    <h3 className="text-lg font-semibold mb-4">Filtres de Recherche</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {/* Spécialité */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Spécialité
                            </label>
                            <select
                                value={filters.specialty}
                                onChange={(e) => handleFilterChange('specialty', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Toutes les spécialités</option>
                                {specialties.map(specialty => (
                                    <option key={specialty.value} value={specialty.value}>
                                        {specialty.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Niveau d'expérience */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Expérience minimale
                            </label>
                            <select
                                value={filters.min_experience_level}
                                onChange={(e) => handleFilterChange('min_experience_level', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="">Tous niveaux</option>
                                {experienceLevels.map(level => (
                                    <option key={level.value} value={level.value}>
                                        {level.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Note minimale */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Note minimale
                            </label>
                            <select
                                value={filters.min_rating}
                                onChange={(e) => handleFilterChange('min_rating', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {ratingOptions.map(rating => (
                                    <option key={rating.value} value={rating.value}>
                                        {rating.label}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Niveau d'urgence */}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                                Niveau d'urgence
                            </label>
                            <select
                                value={filters.urgence}
                                onChange={(e) => handleFilterChange('urgence', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                {urgenceOptions.map(urgence => (
                                    <option key={urgence.value} value={urgence.value}>
                                        {urgence.label}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="mt-4 flex justify-end">
                        <button
                            onClick={handleSearch}
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
                        >
                            Appliquer les Filtres
                        </button>
                    </div>
                </div>
            )}

            {/* Carte et Liste */}
            {userLocation && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Carte */}
                    <div className="bg-white rounded-lg shadow-lg overflow-hidden">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">Carte des Techniciens</h3>
                        </div>
                        <div className="h-96">
                            <MapContainer
                                center={userLocation}
                                zoom={12}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />

                                {/* Cercle de recherche */}
                                <Circle
                                    center={userLocation}
                                    radius={filters.max_distance * 1000}
                                    pathOptions={{ color: 'blue', fillColor: 'blue', fillOpacity: 0.1 }}
                                />

                                {/* Marqueur utilisateur */}
                                <Marker position={userLocation}>
                                    <Popup>Votre position</Popup>
                                </Marker>

                                {/* Marqueurs techniciens */}
                                {technicians.map((tech) => (
                                    <Marker
                                        key={tech.id}
                                        position={[tech.current_location.latitude, tech.current_location.longitude]}
                                    >
                                        <Popup>
                                            <div className="min-w-[250px]">
                                                <div className="font-semibold text-gray-800 mb-2">
                                                    {tech.user.first_name} {tech.user.last_name}
                                                </div>
                                                <div className="text-sm text-gray-600 mb-2">
                                                    {getSpecialtyLabel(tech.specialty)}
                                                </div>
                                                <div className="flex items-center text-sm text-gray-500 mb-2">
                                                    <Star className="w-4 h-4 text-yellow-500 mr-1" />
                                                    {tech.average_rating} ({tech.years_experience} ans d'expérience)
                                                </div>
                                                <div className="text-sm text-gray-500 mb-2">
                                                    <MapPin className="w-4 h-4 inline mr-1" />
                                                    {tech.distance} km
                                                </div>
                                                <div className="text-sm text-gray-500 mb-2">
                                                    <Clock className="w-4 h-4 inline mr-1" />
                                                    {tech.eta_minutes} min
                                                </div>
                                                <div className="text-sm font-semibold text-green-600 mb-3">
                                                    {tech.hourly_rate} FCFA/h
                                                </div>
                                                <div className="flex space-x-2">
                                                    <button
                                                        onClick={() => handleContactTechnician(tech)}
                                                        className="flex-1 bg-blue-600 text-white py-1 px-2 rounded text-xs hover:bg-blue-700"
                                                    >
                                                        Contacter
                                                    </button>
                                                    <button
                                                        onClick={() => handleCallTechnician(tech)}
                                                        className="bg-green-600 text-white py-1 px-2 rounded text-xs hover:bg-green-700"
                                                    >
                                                        <Phone className="w-3 h-3" />
                                                    </button>
                                                </div>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </div>
                    </div>

                    {/* Liste des techniciens */}
                    <div className="bg-white rounded-lg shadow-lg">
                        <div className="p-4 border-b border-gray-200">
                            <h3 className="text-lg font-semibold">Techniciens Proches ({technicians.length})</h3>
                        </div>
                        <div className="max-h-96 overflow-y-auto">
                            {technicians.length === 0 ? (
                                <div className="p-6 text-center text-gray-500">
                                    Aucun technicien trouvé dans votre zone
                                </div>
                            ) : (
                                <div className="divide-y divide-gray-200">
                                    {technicians.map((tech) => (
                                        <div key={tech.id} className="p-4 hover:bg-gray-50">
                                            <div className="flex items-start justify-between">
                                                <div className="flex-1">
                                                    <div className="flex items-center space-x-2 mb-2">
                                                        <h4 className="font-semibold text-gray-900">
                                                            {tech.user.first_name} {tech.user.last_name}
                                                        </h4>
                                                        {tech.is_verified && (
                                                            <CheckCircle className="w-4 h-4 text-green-500" title="Vérifié" />
                                                        )}
                                                        {tech.is_urgent_available && (
                                                            <AlertCircle className="w-4 h-4 text-red-500" title="Disponible en urgence" />
                                                        )}
                                                    </div>

                                                    <div className="text-sm text-gray-600 mb-2">
                                                        {getSpecialtyLabel(tech.specialty)} • {tech.years_experience} ans d'expérience
                                                    </div>

                                                    <div className="flex items-center space-x-4 text-sm text-gray-500 mb-2">
                                                        <div className="flex items-center">
                                                            <Star className="w-4 h-4 text-yellow-500 mr-1" />
                                                            {tech.average_rating}
                                                        </div>
                                                        <div className="flex items-center">
                                                            <MapPin className="w-4 h-4 mr-1" />
                                                            {tech.distance} km
                                                        </div>
                                                        <div className="flex items-center">
                                                            <Clock className="w-4 h-4 mr-1" />
                                                            {tech.eta_minutes} min
                                                        </div>
                                                        <div className="flex items-center">
                                                            {getLocationQualityIcon(tech.location_quality)}
                                                            <span className="ml-1">{getLocationQualityLabel(tech.location_quality)}</span>
                                                        </div>
                                                    </div>

                                                    <div className="text-sm font-semibold text-green-600 mb-3">
                                                        {tech.hourly_rate} FCFA/h
                                                    </div>

                                                    <div className="flex items-center space-x-2">
                                                        <button
                                                            onClick={() => handleContactTechnician(tech)}
                                                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                                                        >
                                                            Contacter
                                                        </button>
                                                        <button
                                                            onClick={() => handleCallTechnician(tech)}
                                                            className="bg-green-600 text-white p-1 rounded hover:bg-green-700 transition-colors"
                                                            title="Appeler"
                                                        >
                                                            <Phone className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleMessageTechnician(tech)}
                                                            className="bg-purple-600 text-white p-1 rounded hover:bg-purple-700 transition-colors"
                                                            title="Message"
                                                        >
                                                            <MessageSquare className="w-4 h-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => handleNavigateToTechnician(tech)}
                                                            className="bg-orange-600 text-white p-1 rounded hover:bg-orange-700 transition-colors"
                                                            title="Navigation"
                                                        >
                                                            <Navigation className="w-4 h-4" />
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Modal de contact (à implémenter) */}
            {selectedTechnician && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
                        <h3 className="text-lg font-semibold mb-4">
                            Contacter {selectedTechnician.user.first_name} {selectedTechnician.user.last_name}
                        </h3>
                        <p className="text-gray-600 mb-4">
                            Spécialité: {getSpecialtyLabel(selectedTechnician.specialty)}
                        </p>
                        <div className="flex space-x-2">
                            <button
                                onClick={() => handleCallTechnician(selectedTechnician)}
                                className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700"
                            >
                                Appeler
                            </button>
                            <button
                                onClick={() => handleMessageTechnician(selectedTechnician)}
                                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700"
                            >
                                Message
                            </button>
                            <button
                                onClick={() => setSelectedTechnician(null)}
                                className="bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400"
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PreciseTechnicianSearch; 