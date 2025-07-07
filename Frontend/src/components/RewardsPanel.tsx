import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, Crown, Medal, TrendingUp, Gift, Target } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface Reward {
    type: string;
    title: string;
    description: string;
    value: string;
}

interface Achievement {
    title: string;
    description: string;
    icon: string;
}

interface RewardsData {
    current_level: string;
    next_level: string | null;
    progress_to_next: number;
    bonuses: Reward[];
    achievements: Achievement[];
}

interface RewardsPanelProps {
    technicianId: number;
}

const RewardsPanel: React.FC<RewardsPanelProps> = ({ technicianId }) => {
    const [rewards, setRewards] = useState<RewardsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchRewards();
    }, [technicianId]);

    const fetchRewards = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/reviews/rewards/');
            if (response.ok) {
                const data = await response.json();
                setRewards(data);
            } else {
                setError('Erreur lors du chargement des récompenses');
            }
        } catch (err) {
            setError('Erreur réseau');
        } finally {
            setLoading(false);
        }
    };

    const getLevelInfo = (level: string) => {
        const levels = {
            'platinum': {
                title: 'Expert Platinium',
                icon: Crown,
                color: 'from-purple-600 to-pink-600',
                description: 'Niveau d\'excellence ultime'
            },
            'gold': {
                title: 'Expert Or',
                icon: Trophy,
                color: 'from-yellow-500 to-orange-500',
                description: 'Niveau d\'expertise avancé'
            },
            'silver': {
                title: 'Expert Argent',
                icon: Medal,
                color: 'from-gray-400 to-gray-600',
                description: 'Niveau d\'expérience confirmé'
            },
            'bronze': {
                title: 'Technicien Confirmé',
                icon: Award,
                color: 'from-orange-600 to-red-600',
                description: 'Niveau de compétence solide'
            },
            'new': {
                title: 'Nouveau Technicien',
                icon: Star,
                color: 'from-blue-500 to-green-500',
                description: 'En cours d\'établissement'
            }
        };
        return levels[level as keyof typeof levels] || levels.new;
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (error || !rewards) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-500">
                    <Target className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Impossible de charger les récompenses</p>
                </div>
            </div>
        );
    }

    const currentLevel = getLevelInfo(rewards.current_level);
    const nextLevel = rewards.next_level ? getLevelInfo(rewards.next_level) : null;
    const LevelIcon = currentLevel.icon;

    return (
        <div className="space-y-6">
            {/* Niveau actuel */}
            <div className={`bg-gradient-to-r ${currentLevel.color} rounded-xl p-6 text-white shadow-lg`}>
                <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                        <div className="bg-white/20 rounded-full p-3">
                            <LevelIcon className="h-8 w-8" />
                        </div>
                        <div>
                            <h3 className="text-xl font-bold">{currentLevel.title}</h3>
                            <p className="text-white/90 text-sm">{currentLevel.description}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <div className="text-2xl font-bold">{rewards.progress_to_next}%</div>
                        <div className="text-white/80 text-sm">Progression</div>
                    </div>
                </div>

                {/* Barre de progression */}
                {rewards.next_level && (
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-white/80 mb-2">
                            <span>{currentLevel.title}</span>
                            <span>{nextLevel.title}</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                            <div
                                className="bg-white h-3 rounded-full transition-all duration-500"
                                style={{ width: `${rewards.progress_to_next}%` }}
                            ></div>
                        </div>
                    </div>
                )}
            </div>

            {/* Bonus actifs */}
            {rewards.bonuses.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Gift className="h-5 w-5 mr-2 text-green-600" />
                        Bonus Actifs
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rewards.bonuses.map((bonus, index) => (
                            <div key={index} className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-between">
                                    <div>
                                        <h4 className="font-semibold text-green-800">{bonus.title}</h4>
                                        <p className="text-sm text-green-700">{bonus.description}</p>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-bold text-green-600">{bonus.value}</div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Achievements */}
            {rewards.achievements.length > 0 && (
                <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Trophy className="h-5 w-5 mr-2 text-yellow-600" />
                        Succès Débloqués
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {rewards.achievements.map((achievement, index) => (
                            <div key={index} className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4">
                                <div className="flex items-center space-x-3">
                                    <div className="text-2xl">{achievement.icon}</div>
                                    <div>
                                        <h4 className="font-semibold text-yellow-800">{achievement.title}</h4>
                                        <p className="text-sm text-yellow-700">{achievement.description}</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Conseils pour progresser */}
            {rewards.next_level && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Conseils pour progresser vers {nextLevel.title}
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        {rewards.current_level === 'bronze' && (
                            <>
                                <li>• Maintenez une note moyenne de 4.2+</li>
                                <li>• Recevez au moins 20 avis</li>
                                <li>• Assurez un taux de recommandation de 85%+</li>
                            </>
                        )}
                        {rewards.current_level === 'silver' && (
                            <>
                                <li>• Améliorez votre note moyenne à 4.5+</li>
                                <li>• Recevez au moins 30 avis</li>
                                <li>• Maintenez un taux de recommandation de 90%+</li>
                            </>
                        )}
                        {rewards.current_level === 'gold' && (
                            <>
                                <li>• Atteignez une note moyenne de 4.8+</li>
                                <li>• Recevez au moins 50 avis</li>
                                <li>• Assurez un taux de recommandation de 95%+</li>
                            </>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default RewardsPanel; 