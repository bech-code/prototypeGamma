import React, { useEffect, useState } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { CheckCircle, Clock, Star, Shield, Zap, ArrowRight } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface PaymentSuccessProps {
    // Props if needed
}

const PaymentSuccess: React.FC<PaymentSuccessProps> = () => {
    const [searchParams] = useSearchParams();
    const [isVisible, setIsVisible] = useState(false);
    const navigate = useNavigate();
    const [checking, setChecking] = useState(false);

    const transactionId = searchParams.get('transaction_id');
    const amount = searchParams.get('amount');
    const duration = searchParams.get('duration');
    const status = searchParams.get('status');

    useEffect(() => {
        // Animation d'entrée
        const timer = setTimeout(() => setIsVisible(true), 100);
        return () => clearTimeout(timer);
    }, []);

    // Rafraîchir le statut d’abonnement après paiement réussi
    useEffect(() => {
        if (status === 'success') {
            setChecking(true);
            fetchWithAuth('/depannage/api/technicians/subscription_status/')
                .then(res => res.json())
                .then(data => {
                    if (data && data.can_receive_requests) {
                        setTimeout(() => navigate('/technician/dashboard'), 2000);
                    }
                })
                .finally(() => setChecking(false));
        }
    }, [status, navigate]);

    const getDurationText = (duration: string | null) => {
        switch (duration) {
            case '1': return '1 mois';
            case '3': return '3 mois';
            case '6': return '6 mois';
            default: return '1 mois';
        }
    };

    const getBenefits = (duration: string | null) => {
        const months = parseInt(duration || '1');
        return [
            {
                icon: <Star className="w-5 h-5 text-yellow-500" />,
                title: 'Profil Premium',
                description: 'Votre profil sera mis en avant dans les recherches'
            },
            {
                icon: <Zap className="w-5 h-5 text-blue-500" />,
                title: 'Demandes Prioritaires',
                description: 'Recevez les nouvelles demandes en premier'
            },
            {
                icon: <Shield className="w-5 h-5 text-green-500" />,
                title: 'Support Prioritaire',
                description: 'Accès direct à notre équipe de support'
            },
            {
                icon: <Clock className="w-5 h-5 text-purple-500" />,
                title: `Abonnement ${getDurationText(duration)}`,
                description: `Actif jusqu'au ${new Date(Date.now() + (months * 30 * 24 * 60 * 60 * 1000)).toLocaleDateString('fr-FR')}`
            }
        ];
    };

    if (status !== 'success') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-red-100 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">Paiement Échoué</h1>
                    <p className="text-gray-600 mb-6">
                        Le paiement n'a pas pu être traité. Veuillez réessayer ou contacter le support.
                    </p>
                    <Link
                        to="/technician/dashboard"
                        className="inline-flex items-center px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                    >
                        Retour au Tableau de Bord
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-green-50 via-blue-50 to-purple-50">
            {/* Header avec animation */}
            <div className={`transition-all duration-1000 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                <div className="container mx-auto px-4 py-8">
                    <div className="max-w-4xl mx-auto">
                        {/* Carte principale */}
                        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden">
                            {/* Header avec gradient */}
                            <div className="bg-gradient-to-r from-green-400 via-blue-500 to-purple-600 p-8 text-white text-center relative overflow-hidden">
                                <div className="absolute inset-0 bg-black opacity-10"></div>
                                <div className="relative z-10">
                                    <div className={`w-20 h-20 bg-white bg-opacity-20 rounded-full flex items-center justify-center mx-auto mb-6 transition-all duration-1000 ${isVisible ? 'scale-100' : 'scale-0'}`}>
                                        <CheckCircle className="w-10 h-10 text-white" />
                                    </div>
                                    <h1 className="text-4xl font-bold mb-4">Paiement Réussi !</h1>
                                    <p className="text-xl opacity-90">
                                        Votre abonnement premium est maintenant actif
                                    </p>
                                </div>
                            </div>

                            {/* Contenu principal */}
                            <div className="p-8">
                                {/* Détails de la transaction */}
                                <div className={`mb-8 transition-all duration-1000 delay-300 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Détails de la Transaction</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="bg-gray-50 rounded-xl p-6">
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-gray-600 font-medium">ID Transaction</span>
                                                <span className="text-sm bg-gray-200 px-2 py-1 rounded">#{transactionId}</span>
                                            </div>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-gray-600 font-medium">Montant</span>
                                                <span className="text-2xl font-bold text-green-600">{amount} FCFA</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-gray-600 font-medium">Durée</span>
                                                <span className="text-lg font-semibold text-blue-600">{getDurationText(duration)}</span>
                                            </div>
                                        </div>

                                        <div className="bg-blue-50 rounded-xl p-6">
                                            <h3 className="text-lg font-semibold text-blue-900 mb-4">Statut de l'Abonnement</h3>
                                            <div className="flex items-center space-x-3 mb-4">
                                                <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
                                                <span className="text-green-700 font-medium">Actif</span>
                                            </div>
                                            <p className="text-blue-700 text-sm">
                                                Votre profil premium est maintenant visible par les clients
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Avantages de l'abonnement */}
                                <div className={`mb-8 transition-all duration-1000 delay-500 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                    <h2 className="text-2xl font-semibold text-gray-900 mb-6">Vos Avantages Premium</h2>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {getBenefits(duration).map((benefit, index) => (
                                            <div
                                                key={index}
                                                className={`bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition-all duration-300 delay-${index * 100}`}
                                            >
                                                <div className="flex items-start space-x-4">
                                                    <div className="flex-shrink-0">
                                                        {benefit.icon}
                                                    </div>
                                                    <div>
                                                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{benefit.title}</h3>
                                                        <p className="text-gray-600">{benefit.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className={`transition-all duration-1000 delay-700 ${isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}`}>
                                    <div className="flex flex-col sm:flex-row gap-4">
                                        <Link
                                            to="/technician/dashboard"
                                            className="flex-1 bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-xl font-semibold text-center hover:from-blue-700 hover:to-purple-700 transition-all duration-300 transform hover:scale-105 flex items-center justify-center space-x-2"
                                        >
                                            <span>Accéder au Tableau de Bord</span>
                                            <ArrowRight className="w-5 h-5" />
                                        </Link>
                                        <Link
                                            to="/technician/profile"
                                            className="flex-1 bg-gray-100 text-gray-700 py-4 px-6 rounded-xl font-semibold text-center hover:bg-gray-200 transition-all duration-300 border border-gray-300"
                                        >
                                            Voir Mon Profil
                                        </Link>
                                    </div>
                                </div>

                                {/* Message de remerciement */}
                                <div className={`mt-8 text-center transition-all duration-1000 delay-1000 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
                                    <p className="text-gray-600">
                                        Merci de faire confiance à notre plateforme. Nous sommes là pour vous accompagner dans votre réussite !
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess; 