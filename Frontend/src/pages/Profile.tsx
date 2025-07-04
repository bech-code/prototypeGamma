import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

const Profile: React.FC = () => {
    const { user, fetchUser, updateUserProfile, logout } = useAuth();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [geoStatus, setGeoStatus] = useState<string | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const [clientLocation, setClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const navigate = useNavigate();

    // Icône par défaut pour Leaflet (fix bug d'affichage)
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
        iconRetinaUrl: markerIcon2x,
        iconUrl: markerIcon,
        shadowUrl: markerShadow,
    });

    useEffect(() => {
        if (user) {
            setFormData({
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: user.client?.phone || user.technician?.phone || '',
            });
        }
    }, [user]);

    // Rediriger si pas connecté
    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    // Bloquer navigation si numéro manquant
    useEffect(() => {
        if (user && !(user.client?.phone || user.technician?.phone)) {
            setError('Vous devez renseigner un numéro de téléphone pour continuer.');
        }
    }, [user]);

    // Charger la localisation du client au chargement
    useEffect(() => {
        const fetchLocation = async () => {
            const clientId = user?.client?.id;
            if (!clientId) return;
            const res = await fetchWithAuth(`/depannage/api/client-locations/?client=${clientId}`);
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
                setClientLocation({ latitude: data[0].latitude, longitude: data[0].longitude });
            } else {
                setClientLocation(null);
            }
        };
        if (user?.client?.id) fetchLocation();
    }, [user, geoStatus]); // recharge si user ou géoloc change

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        if (!formData.phone.match(/^\+223 ?\d{2} ?\d{2} ?\d{2} ?\d{2}$/)) {
            setError('Le numéro doit être au format +223 XX XX XX XX');
            return;
        }
        setIsLoading(true);
        try {
            await updateUserProfile(formData);
            setSuccess('Profil mis à jour avec succès.');
            fetchUser && fetchUser();
            // Redirection après succès
            setTimeout(() => {
                navigate('/dashboard');
            }, 1500);
        } catch (err) {
            setError("Erreur lors de la mise à jour du profil.");
        } finally {
            setIsLoading(false);
        }
    };

    // Fonction pour envoyer la position à l'API
    const sendLocationToAPI = async (latitude: number, longitude: number) => {
        setGeoLoading(true);
        setGeoStatus(null);
        try {
            const clientId = user?.client?.id;
            if (!clientId) {
                setGeoStatus("Impossible de trouver le profil client.");
                setGeoLoading(false);
                return;
            }
            // Vérifier si une localisation existe déjà (GET)
            const resGet = await fetchWithAuth(`/depannage/api/client-locations/?client=${clientId}`);
            const data = await resGet.json();
            let method = 'POST';
            let url = '/depannage/api/client-locations/';
            if (Array.isArray(data) && data.length > 0) {
                method = 'PATCH';
                url = `/depannage/api/client-locations/${data[0].id}/`;
            }
            const res = await fetchWithAuth(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    client: clientId,
                    latitude,
                    longitude
                })
            });
            if (res.ok) {
                setGeoStatus('Localisation enregistrée avec succès !');
            } else {
                setGeoStatus("Erreur lors de l'enregistrement de la localisation.");
            }
        } catch (e) {
            setGeoStatus("Erreur réseau ou permission refusée.");
        } finally {
            setGeoLoading(false);
        }
    };

    // Fonction pour récupérer la position GPS
    const handleShareLocation = () => {
        setGeoStatus(null);
        if ('geolocation' in navigator) {
            setGeoLoading(true);
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    sendLocationToAPI(position.coords.latitude, position.coords.longitude);
                },
                (error) => {
                    setGeoStatus("Impossible de récupérer la position : " + error.message);
                    setGeoLoading(false);
                }
            );
        } else {
            setGeoStatus("La géolocalisation n'est pas supportée par ce navigateur.");
        }
    };

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
                <h2 className="text-2xl font-bold mb-6 text-center">Mon Profil</h2>
                {error && <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4 text-red-700">{error}</div>}
                {success && <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 text-green-700">{success}</div>}
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                        <input
                            id="first_name"
                            name="first_name"
                            type="text"
                            value={formData.first_name}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                        <input
                            id="last_name"
                            name="last_name"
                            type="text"
                            value={formData.last_name}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                        />
                    </div>
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            required
                            disabled
                        />
                    </div>
                    <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Numéro de téléphone <span className="text-red-500">*</span></label>
                        <input
                            id="phone"
                            name="phone"
                            type="tel"
                            value={formData.phone}
                            onChange={handleChange}
                            className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                            placeholder="+223 XX XX XX XX"
                            pattern="\+223 ?\d{2} ?\d{2} ?\d{2} ?\d{2}"
                            required
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full py-3 bg-blue-600 text-white rounded-md font-semibold hover:bg-blue-700 transition-colors"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Mise à jour...' : 'Enregistrer'}
                    </button>
                </form>
                {/* Bouton de géolocalisation */}
                <button
                    onClick={handleShareLocation}
                    className="w-full mt-4 py-3 bg-green-600 text-white rounded-md font-semibold hover:bg-green-700 transition-colors"
                    disabled={geoLoading}
                >
                    {geoLoading ? 'Récupération de la position...' : 'Partager ma position actuelle'}
                </button>
                {geoStatus && (
                    <div className={`mt-4 p-3 rounded ${geoStatus.includes('succès') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{geoStatus}</div>
                )}
                {/* Affichage de la carte si position connue */}
                <div className="mt-8">
                    <h3 className="text-lg font-semibold mb-2">Ma position actuelle</h3>
                    {clientLocation ? (
                        <MapContainer center={[clientLocation.latitude, clientLocation.longitude]} zoom={15} style={{ height: 300, width: '100%' }}>
                            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                            <Marker position={[clientLocation.latitude, clientLocation.longitude]} />
                        </MapContainer>
                    ) : (
                        <div className="text-gray-500">Aucune position enregistrée.</div>
                    )}
                </div>
                <button
                    onClick={logout}
                    className="w-full mt-6 py-2 bg-red-100 text-red-700 rounded-md font-semibold hover:bg-red-200 transition-colors"
                >
                    Déconnexion
                </button>
            </div>
        </div>
    );
};

export default Profile; 