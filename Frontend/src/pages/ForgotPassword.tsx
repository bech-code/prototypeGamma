import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80';

const ForgotPassword: React.FC = () => {
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [success, setSuccess] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);
        setIsLoading(true);

        try {
            const response = await axios.post('http://127.0.0.1:8000/users/forgot-password/', {
                email
            });

            if (response.status === 200) {
                setSuccess('Un email de récupération a été envoyé à votre adresse email.');
                setEmail('');
            }
        } catch (err: any) {
            if (axios.isAxiosError(err)) {
                if (err.response?.status === 404) {
                    setError('Aucun compte associé à cette adresse email.');
                } else if (err.response?.status === 400) {
                    setError(err.response?.data?.detail || 'Email invalide.');
                } else {
                    setError('Erreur lors de l\'envoi de l\'email de récupération.');
                }
            } else {
                setError('Erreur de connexion.');
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div
            className="min-h-screen bg-cover bg-center flex items-center justify-center"
            style={{ backgroundImage: `url(${HERO_IMAGE})` }}
        >
            <div className="container mx-auto px-4">
                <div className="max-w-md mx-auto bg-white bg-opacity-90 rounded-lg shadow-md overflow-hidden backdrop-blur-md">
                    <div className="p-6">
                        <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Mot de passe oublié</h2>

                        <p className="text-gray-600 text-center mb-6">
                            Entrez votre adresse email pour recevoir un lien de récupération de mot de passe.
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
                            <div className="mb-6">
                                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                                    Adresse email
                                </label>
                                <input
                                    id="email"
                                    name="email"
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    placeholder="nom@exemple.com"
                                    required
                                />
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
                                        Envoi en cours...
                                    </span>
                                ) : 'Envoyer le lien de récupération'}
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

export default ForgotPassword; 