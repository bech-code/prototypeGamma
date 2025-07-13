import React, { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Eye, EyeOff } from 'lucide-react';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80';

const ResetPassword: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const token = searchParams.get('token');

    const [formData, setFormData] = useState({
        new_password: '',
        confirm_password: '',
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [showPassword2, setShowPassword2] = useState(false);

    useEffect(() => {
        if (!token) {
            setError('Token de réinitialisation manquant. Veuillez utiliser le lien reçu par email.');
        }
    }, [token]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (!token) {
            setError('Token de réinitialisation manquant.');
            return;
        }

        if (formData.new_password !== formData.confirm_password) {
            setError('Les mots de passe ne correspondent pas');
            return;
        }

        if (formData.new_password.length < 12) {
            setError('Le mot de passe doit contenir au moins 12 caractères');
            return;
        }

        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/users/reset-password/', {
                token,
                new_password: formData.new_password
            });

            if (response.status === 200) {
                setSuccess('Mot de passe mis à jour avec succès ! Redirection vers la page de connexion...');
                setTimeout(() => {
                    navigate('/login');
                }, 2000);
            }
        } catch (err: any) {
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 400) {
                    const details = err.response?.data?.details;
                    if (details?.new_password) {
                        setError(details.new_password);
                    } else {
                        setError(err.response?.data?.error || 'Erreur lors de la réinitialisation');
                    }
                } else if (err.response?.status === 404) {
                    setError('Token invalide ou expiré');
                } else {
                    setError('Erreur lors de la réinitialisation du mot de passe');
                }
            } else {
                setError('Erreur de connexion');
            }
        } finally {
            setIsLoading(false);
        }
    };

    if (!token) {
        return (
            <div
                className="min-h-screen bg-cover bg-center flex items-center justify-center"
                style={{ backgroundImage: `url(${HERO_IMAGE})` }}
            >
                <div className="container mx-auto px-4">
                    <div className="max-w-md mx-auto bg-white bg-opacity-90 rounded-lg shadow-md overflow-hidden backdrop-blur-md">
                        <div className="p-6">
                            <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Réinitialisation de mot de passe</h2>

                            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                                <p className="text-red-700">{error}</p>
                            </div>

                            <div className="text-center">
                                <Link to="/forgot-password" className="text-blue-700 hover:text-blue-800 font-medium">
                                    Demander un nouveau lien de récupération
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div
            className="min-h-screen bg-cover bg-center flex items-center justify-center"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        >
            <div className="container mx-auto px-4">
                <div className="max-w-md mx-auto bg-white bg-opacity-90 rounded-lg shadow-md overflow-hidden backdrop-blur-md">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Nouveau mot de passe</h2>

                        <p className="text-gray-600 text-center mb-6">
                            Créez un nouveau mot de passe pour votre compte.
                        </p>

                        {error && (
                            <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                                <p className="text-red-700">{error}</p>
                            </div>
                        )}

                        {success && (
                            <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4">
                                <p className="text-green-700">{success}</p>
                            </div>
                        )}

                        <form onSubmit={handleSubmit}>
                            <div className="mb-4">
                                <label htmlFor="new_password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Nouveau mot de passe
                                </label>
                                <div className="relative">
                                    <input
                                        id="new_password"
                                        name="new_password"
                                        type={showPassword ? "text" : "password"}
                                        value={formData.new_password}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 focus:outline-none"
                                        onClick={() => setShowPassword((v) => !v)}
                                        tabIndex={-1}
                                    >
                                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700 mb-1">
                                    Confirmer le mot de passe
                                </label>
                                <div className="relative">
                                    <input
                                        id="confirm_password"
                                        name="confirm_password"
                                        type={showPassword2 ? "text" : "password"}
                                        value={formData.confirm_password}
                                        onChange={handleChange}
                                        className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                                        placeholder="••••••••"
                                        required
                                    />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 focus:outline-none"
                                        onClick={() => setShowPassword2((v) => !v)}
                                        tabIndex={-1}
                                    >
                                        {showPassword2 ? <EyeOff size={20} /> : <Eye size={20} />}
                                    </button>
                                </div>
                            </div>

                            <button
                                type="submit"
                                disabled={isLoading}
                                className="w-full bg-blue-700 text-white py-3 rounded-md font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                            >
                                {isLoading ? (
                                    <span className="flex items-center justify-center">
                                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                        </svg>
                                        Mise à jour...
                                    </span>
                                ) : 'Mettre à jour le mot de passe'}
                            </button>
                        </form>

                        <div className="mt-6 text-center">
                            <p className="text-sm text-gray-600">
                                <Link to="/login" className="text-blue-700 hover:text-blue-800 font-medium">
                                    ← Retour à la connexion
                                </Link>
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword; 