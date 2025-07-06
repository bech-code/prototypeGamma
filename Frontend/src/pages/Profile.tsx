import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import imageHero from '../assets/image/image.png';

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
    const navigate = useNavigate();

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
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8 bg-white rounded-xl shadow-lg -mt-16 relative z-30">
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