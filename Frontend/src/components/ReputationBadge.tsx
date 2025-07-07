import React from 'react';
import { Star, Award, Trophy, Crown, Medal } from 'lucide-react';

interface ReputationBadgeProps {
    averageRating: number;
    totalReviews: number;
    recommendationRate: number;
    completedJobs: number;
    yearsExperience: number;
}

const ReputationBadge: React.FC<ReputationBadgeProps> = ({
    averageRating,
    totalReviews,
    recommendationRate,
    completedJobs,
    yearsExperience
}) => {
    const getBadgeLevel = () => {
        if (averageRating >= 4.8 && totalReviews >= 50 && recommendationRate >= 95) {
            return {
                level: 'platinum',
                title: 'Expert Platinium',
                icon: Crown,
                color: 'from-purple-600 to-pink-600',
                description: 'Technicien d\'exception avec une réputation impeccable'
            };
        } else if (averageRating >= 4.5 && totalReviews >= 30 && recommendationRate >= 90) {
            return {
                level: 'gold',
                title: 'Expert Or',
                icon: Trophy,
                color: 'from-yellow-500 to-orange-500',
                description: 'Technicien très expérimenté et hautement recommandé'
            };
        } else if (averageRating >= 4.2 && totalReviews >= 20 && recommendationRate >= 85) {
            return {
                level: 'silver',
                title: 'Expert Argent',
                icon: Medal,
                color: 'from-gray-400 to-gray-600',
                description: 'Technicien fiable avec une bonne réputation'
            };
        } else if (averageRating >= 3.8 && totalReviews >= 10) {
            return {
                level: 'bronze',
                title: 'Technicien Confirmé',
                icon: Award,
                color: 'from-orange-600 to-red-600',
                description: 'Technicien compétent avec une expérience solide'
            };
        } else {
            return {
                level: 'new',
                title: 'Nouveau Technicien',
                icon: Star,
                color: 'from-blue-500 to-green-500',
                description: 'Technicien en cours d\'établissement de sa réputation'
            };
        }
    };

    const getExperienceBadge = () => {
        if (yearsExperience >= 10) {
            return {
                title: 'Vétéran',
                color: 'bg-purple-100 text-purple-800',
                description: '10+ ans d\'expérience'
            };
        } else if (yearsExperience >= 5) {
            return {
                title: 'Expérimenté',
                color: 'bg-blue-100 text-blue-800',
                description: '5+ ans d\'expérience'
            };
        } else if (yearsExperience >= 2) {
            return {
                title: 'Confirmé',
                color: 'bg-green-100 text-green-800',
                description: '2+ ans d\'expérience'
            };
        } else {
            return {
                title: 'Débutant',
                color: 'bg-gray-100 text-gray-800',
                description: 'Moins de 2 ans d\'expérience'
            };
        }
    };

    const badge = getBadgeLevel();
    const experienceBadge = getExperienceBadge();
    const BadgeIcon = badge.icon;

    return (
        <div className="space-y-4">
            {/* Badge principal de réputation */}
            <div className={`bg-gradient-to-r ${badge.color} rounded-xl p-6 text-white shadow-lg`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/20 rounded-full p-3">
                            <BadgeIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{badge.title}</h3>
                            <p className="text-white/90 text-sm">{badge.description}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-3xl font-bold">{averageRating.toFixed(1)}</div>
                        <div className="text-white/80 text-sm">Note moyenne</div>
                    </div>
                </div>

                {/* Statistiques détaillées */}
                <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-white/20">
                    <div className="text-center">
                        <div className="text-lg font-bold">{totalReviews}</div>
                        <div className="text-white/80 text-xs">Avis reçus</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold">{recommendationRate}%</div>
                        <div className="text-white/80 text-xs">Recommandé</div>
                    </div>
                    <div className="text-center">
                        <div className="text-lg font-bold">{completedJobs}</div>
                        <div className="text-white/80 text-xs">Missions terminées</div>
                    </div>
                </div>
            </div>

            {/* Badge d'expérience */}
            <div className="bg-white rounded-lg p-4 shadow border">
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                        <div className={`px-3 py-1 rounded-full text-sm font-semibold ${experienceBadge.color}`}>
                            {experienceBadge.title}
                        </div>
                        <div className="text-sm text-gray-600">{experienceBadge.description}</div>
                    </div>
                    <div className="flex items-center space-x-1">
                        {[...Array(5)].map((_, i) => (
                            <Star
                                key={i}
                                className={`h-4 w-4 ${i < Math.floor(averageRating) ? 'text-yellow-400 fill-current' : 'text-gray-300'
                                    }`}
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Indicateurs de performance */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg p-4 shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-600">Qualité du service</div>
                            <div className="text-lg font-bold text-gray-900">
                                {averageRating >= 4.5 ? 'Excellent' :
                                    averageRating >= 4.0 ? 'Très bon' :
                                        averageRating >= 3.5 ? 'Bon' : 'À améliorer'}
                            </div>
                        </div>
                        <div className="text-2xl">
                            {averageRating >= 4.5 ? '🏆' :
                                averageRating >= 4.0 ? '⭐' :
                                    averageRating >= 3.5 ? '👍' : '📈'}
                        </div>
                    </div>
                </div>

                <div className="bg-white rounded-lg p-4 shadow border">
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-sm font-medium text-gray-600">Taux de satisfaction</div>
                            <div className="text-lg font-bold text-gray-900">
                                {recommendationRate >= 95 ? 'Exceptionnel' :
                                    recommendationRate >= 85 ? 'Très élevé' :
                                        recommendationRate >= 75 ? 'Élevé' : 'Moyen'}
                            </div>
                        </div>
                        <div className="text-2xl">
                            {recommendationRate >= 95 ? '💎' :
                                recommendationRate >= 85 ? '💫' :
                                    recommendationRate >= 75 ? '✨' : '🌟'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Conseils pour améliorer la réputation */}
            {averageRating < 4.5 && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2">💡 Conseils pour améliorer votre réputation</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        {averageRating < 4.0 && (
                            <li>• Améliorez la ponctualité et la communication</li>
                        )}
                        {recommendationRate < 85 && (
                            <li>• Assurez-vous de bien comprendre les besoins des clients</li>
                        )}
                        {totalReviews < 20 && (
                            <li>• Encouragez vos clients à laisser des avis après chaque mission</li>
                        )}
                        <li>• Maintenez un niveau de qualité constant</li>
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ReputationBadge; 