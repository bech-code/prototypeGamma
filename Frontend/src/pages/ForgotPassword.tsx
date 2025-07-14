import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { Mail, ArrowLeft, ArrowRight, CheckCircle, AlertCircle, Lock, Send } from 'lucide-react';

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
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-8">
            <div className="container mx-auto px-4">
                <div className="max-w-2xl mx-auto">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-4xl font-bold text-gray-900 mb-2">Mot de passe oublié</h1>
                        <p className="text-gray-600 text-lg">Nous vous aiderons à récupérer votre compte</p>
                    </div>

                    {/* Main Form Container */}
                    <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
                        <div className="p-8">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <Lock className="w-8 h-8 text-blue-600" />
                                </div>
                                <h2 className="text-2xl font-bold text-gray-900 mb-2">Récupération de mot de passe</h2>
                                <p className="text-gray-600">
                                    Entrez votre adresse email pour recevoir un lien de récupération de mot de passe.
                                </p>
                            </div>

                            {/* Error Display */}
                            {error && (
                                <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 shadow-sm">
                                    <AlertCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="font-semibold text-red-700 text-base mb-1">Erreur</div>
                                        <div className="text-red-700 text-sm">{error}</div>
                                    </div>
                                </div>
                            )}

                            {/* Success Display */}
                            {success && (
                                <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 shadow-sm">
                                    <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                                    <div className="flex-1">
                                        <div className="font-semibold text-green-700 text-base mb-1">Email envoyé !</div>
                                        <div className="text-green-700 text-sm">{success}</div>
                                    </div>
                                </div>
                            )}

                            {/* Form */}
                            <form onSubmit={handleSubmit} className="space-y-6">
                                <div className="space-y-2">
                                    <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700">
                                        <Mail className="w-4 h-4 mr-2" />
                                        Adresse email
                                    </label>
                                    <input
                                        id="email"
                                        name="email"
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                                        placeholder="nom@exemple.com"
                                        required
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-200"
                                >
                                    {isLoading ? (
                                        <span className="flex items-center justify-center">
                                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                            </svg>
                                            Envoi en cours...
                                        </span>
                                    ) : (
                                        <span className="flex items-center justify-center">
                                            <Send className="mr-2 w-4 h-4" />
                                            Envoyer le lien de récupération
                                        </span>
                                    )}
                                </button>
                            </form>

                            {/* Footer */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <div className="text-center">
                                    <Link
                                        to="/login"
                                        className="inline-flex items-center text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                                    >
                                        <ArrowLeft className="mr-2 w-4 h-4" />
                                        Retour à la connexion
                                    </Link>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-blue-600 font-bold text-sm">1</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Entrez votre email</h3>
                            <p className="text-gray-600 text-sm">
                                Saisissez l'adresse email associée à votre compte DepanneTeliman.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-blue-600 font-bold text-sm">2</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Recevez le lien</h3>
                            <p className="text-gray-600 text-sm">
                                Nous vous enverrons un email avec un lien sécurisé de récupération.
                            </p>
                        </div>

                        <div className="bg-white rounded-xl p-6 border border-gray-200 shadow-sm">
                            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mb-4">
                                <span className="text-blue-600 font-bold text-sm">3</span>
                            </div>
                            <h3 className="font-semibold text-gray-900 mb-2">Réinitialisez</h3>
                            <p className="text-gray-600 text-sm">
                                Cliquez sur le lien dans l'email pour créer un nouveau mot de passe.
                            </p>
                        </div>
                    </div>

                    {/* Additional Help */}
                    <div className="mt-8 text-center">
                        <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">Besoin d'aide ?</h3>
                            <p className="text-blue-700 text-sm mb-4">
                                Si vous ne recevez pas l'email ou si vous rencontrez des difficultés, contactez notre support.
                            </p>
                            <div className="flex justify-center space-x-4 text-sm">
                                <Link
                                    to="/contact"
                                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                                >
                                    Contact Support
                                </Link>
                                <span className="text-blue-400">•</span>
                                <Link
                                    to="/faq"
                                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                                >
                                    FAQ
                                </Link>
                                <span className="text-blue-400">•</span>
                                <Link
                                    to="/register"
                                    className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                                >
                                    Créer un compte
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword; 