import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import imageHero from '../assets/image/image.png';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

const Profile: React.FC = () => {
    const { user, fetchUser, updateUserProfile, logout, profile } = useAuth();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        specialty: '',
        years_experience: '',
        address: '',
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [geoStatus, setGeoStatus] = useState<string | null>(null);
    const [geoLoading, setGeoLoading] = useState(false);
    const [clientLocation, setClientLocation] = useState<{ latitude: number; longitude: number } | null>(null);
    const [cinetpayTestMode, setCinetpayTestMode] = useState(false);
    const [cinetpayTestStatus, setCinetpayTestStatus] = useState<'success' | 'failed' | 'pending'>('success');
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
                phone: profile?.phone || '', // Utiliser profile.phone pour tous
                specialty: profile?.specialty || '',
                years_experience: profile?.years_experience?.toString() || '',
                address: profile?.address || '',
            });
        }
    }, [user, profile]);

    // Rediriger si pas connecté
    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    // Suppression du message d'erreur automatique sur le numéro de téléphone

    // Retirer toute la logique liée à la localisation

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        // Normaliser les espaces
        const normalizedPhone = formData.phone.trim().replace(/\s+/g, ' ');
        const phonePattern = /^(\+223\d{8}|\+223( +\d{2}){4})$/;
        if (!phonePattern.test(normalizedPhone)) {
            setError('Le numéro doit être au format +223XXXXXXXX ou +223 XX XX XX XX (8 chiffres après +223, espaces autorisés).');
            return;
        }
        setIsLoading(true);
        try {
            await updateUserProfile({ ...formData, phone: normalizedPhone });
            setSuccess('Profil mis à jour avec succès.');
            fetchUser && fetchUser();
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
            const clientId = user?.user_type === 'client' ? user?.client?.id : undefined;
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
            {/* Hero Section avec image de fond */}
            <div className="relative h-64 md:h-80 w-full flex items-center justify-center">
                <img
                    src={imageHero}
                    alt="Profil Hero"
                    className="absolute inset-0 w-full h-full object-cover object-center z-0"
                />
                <div className="absolute inset-0 bg-gradient-to-r from-black/60 to-blue-900/60 z-10"></div>
                <div className="relative z-20 text-center text-white">
                    <h1 className="text-3xl md:text-4xl font-bold mb-2 drop-shadow-lg">Mon Profil</h1>
                    <p className="text-lg md:text-xl font-medium drop-shadow">
                        {formData.first_name} {formData.last_name}
                    </p>
                </div>
            </div>
            {/* Formulaire */}
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8 bg-white rounded-xl shadow-xl -mt-16 relative z-30 animate-fade-in">
                {/* Affichage dynamique des messages */}
                {error && (
                    <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-red-50 border border-red-200 shadow-sm animate-fade-in">
                        <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01" /></svg>
                        <span className="text-red-700 font-medium">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-4 flex items-center gap-3 p-4 rounded-xl bg-green-50 border border-green-200 shadow-sm animate-fade-in">
                        <svg className="w-6 h-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                        <span className="text-green-700 font-medium">{success}</span>
                    </div>
                )}
                {cinetpayTestMode && (
                    <div className="mb-4 p-3 rounded-xl bg-yellow-50 border border-yellow-300 text-yellow-800 font-semibold text-center animate-fade-in">
                        <span>Mode test CinetPay actif : aucun paiement réel n'a été effectué.</span>
                        <div className="mt-2 flex gap-2 justify-center">
                            <button onClick={() => setCinetpayTestStatus('success')} className={`px-3 py-1 rounded bg-green-100 text-green-700 font-medium border border-green-300 ${cinetpayTestStatus === 'success' ? 'ring-2 ring-green-400' : ''}`}>Simuler succès</button>
                            <button onClick={() => setCinetpayTestStatus('failed')} className={`px-3 py-1 rounded bg-red-100 text-red-700 font-medium border border-red-300 ${cinetpayTestStatus === 'failed' ? 'ring-2 ring-red-400' : ''}`}>Simuler échec</button>
                            <button onClick={() => setCinetpayTestStatus('pending')} className={`px-3 py-1 rounded bg-gray-100 text-gray-700 font-medium border border-gray-300 ${cinetpayTestStatus === 'pending' ? 'ring-2 ring-gray-400' : ''}`}>Simuler en attente</button>
                        </div>
                    </div>
                )}
                {/* Affichage dynamique selon le statut simulé */}
                {cinetpayTestMode && cinetpayTestStatus === 'success' && (
                    <div className="mb-4 p-4 rounded-xl bg-green-50 border border-green-300 text-green-800 font-semibold text-center animate-fade-in">
                        Paiement réussi ! Votre abonnement est activé.
                    </div>
                )}
                {cinetpayTestMode && cinetpayTestStatus === 'failed' && (
                    <div className="mb-4 p-4 rounded-xl bg-red-50 border border-red-300 text-red-800 font-semibold text-center animate-fade-in">
                        Paiement refusé. Veuillez réessayer ou contacter le support.
                    </div>
                )}
                {cinetpayTestMode && cinetpayTestStatus === 'pending' && (
                    <div className="mb-4 p-4 rounded-xl bg-gray-50 border border-gray-300 text-gray-800 font-semibold text-center animate-fade-in">
                        Paiement en attente de validation...
                    </div>
                )}
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                            <input
                                id="first_name"
                                name="first_name"
                                type="text"
                                value={formData.first_name}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
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
                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                required
                            />
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                value={formData.email}
                                onChange={handleChange}
                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-100 cursor-not-allowed"
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
                                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                placeholder="+223 XX XX XX XX"
                                pattern="\+223 ?\d{2} ?\d{2} ?\d{2} ?\d{2}"
                                required
                            />
                        </div>
                    </div>
                    {/* Champs spécifiques technicien */}
                    {user?.user_type === 'technician' && user?.technician && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div>
                                <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
                                <input
                                    id="specialty"
                                    name="specialty"
                                    type="text"
                                    value={formData.specialty}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-1">Années d'expérience</label>
                                <input
                                    id="years_experience"
                                    name="years_experience"
                                    type="number"
                                    min="0"
                                    value={formData.years_experience}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    required
                                />
                            </div>
                            <div>
                                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                                <input
                                    id="address"
                                    name="address"
                                    type="text"
                                    value={formData.address}
                                    onChange={handleChange}
                                    className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
                                    required
                                />
                            </div>
                        </div>
                    )}
                    {/* Pièces jointes technicien */}
                    {user?.user_type === 'technician' && user?.technician && (
                        <div className="flex flex-col gap-2 mt-2">
                            <span className="font-medium text-gray-700">Pièces jointes :</span>
                            {user?.technician.piece_identite && (
                                <a
                                    href={user?.technician.piece_identite}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline"
                                >
                                    Télécharger la pièce d'identité
                                </a>
                            )}
                            {user?.technician.certificat_residence && (
                                <a
                                    href={user?.technician.certificat_residence}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline"
                                >
                                    Télécharger le certificat de résidence
                                </a>
                            )}
                        </div>
                    )}
                    <div className="flex flex-col md:flex-row gap-4 mt-8">
                        <button
                            type="submit"
                            className="flex-1 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className="flex items-center justify-center">
                                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Mise à jour...
                                </span>
                            ) : 'Enregistrer'}
                        </button>
                    </div>
                </form>
                <button
                    onClick={logout}
                    className="w-full mt-6 py-2 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors shadow-sm"
                >
                    Déconnexion
                </button>
            </div>
        </div>
    );
};

export default Profile; 