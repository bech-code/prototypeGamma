import React, { useState, useEffect } from 'react';
import { CheckCircle, Info, Star, Zap, Shield } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface SubscriptionPanelProps {
    technicianId?: number;
}

const SubscriptionPanel: React.FC<SubscriptionPanelProps> = ({ technicianId }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Simuler un chargement pour la transition
        const timer = setTimeout(() => {
            setLoading(false);
        }, 500);
        return () => clearTimeout(timer);
    }, []);

    if (loading) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="animate-pulse">
                        <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
                        <div className="h-32 bg-gray-200 rounded mb-4"></div>
                        <div className="h-20 bg-gray-200 rounded"></div>
                    </div>
                </div>
            </div>
        );
    }

    const getBenefits = () => [
        {
            icon: <Star className="w-5 h-5 text-yellow-500" />,
            title: 'Profil Premium',
            description: 'Votre profil est mis en avant dans les recherches'
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
        }
    ];

    return (
        <div className="space-y-6">
            {/* Statut d'abonnement gratuit */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <CheckCircle className="h-5 w-5 mr-2 text-green-600" />
                        Statut d'abonnement
                    </h3>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <div className="flex items-center">
                        <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                        <div>
                            <h4 className="text-lg font-semibold text-green-800">
                                Accès gratuit illimité
                            </h4>
                            <p className="text-green-700">
                                Votre compte technicien est maintenant gratuit et vous avez un accès illimité à toutes les fonctionnalités.
                            </p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    {getBenefits().map((benefit, index) => (
                        <div key={index} className="bg-gray-50 rounded-lg p-4">
                            <div className="flex items-center mb-2">
                                {benefit.icon}
                                <h5 className="font-semibold text-gray-800 ml-2">
                                    {benefit.title}
                                </h5>
                            </div>
                            <p className="text-sm text-gray-600">
                                {benefit.description}
                            </p>
                        </div>
                    ))}
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                        <Info className="h-5 w-5 text-blue-600 mr-2 mt-0.5" />
                        <div>
                            <h5 className="font-semibold text-blue-800 mb-1">
                                Changement de modèle
                            </h5>
                            <p className="text-blue-700 text-sm">
                                Notre plateforme est maintenant entièrement gratuite pour tous les techniciens.
                                Vous pouvez continuer à recevoir des demandes de réparation sans aucun coût.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SubscriptionPanel; 