import React, { useState, useEffect } from 'react';
import { Trophy, Star, Award, Crown, Medal, TrendingUp, Gift, Target, AlertCircle, RefreshCw } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface Reward {
    type: string;
    title: string;
    description: string;
    value: string;
    icon?: string;
    color?: string;
}

interface Achievement {
    title: string;
    description: string;
    icon: string;
    unlocked: boolean;
    progress?: number;
    max_progress?: number;
}

interface RewardsData {
    current_level: string;
    next_level: string | null;
    progress_to_next: number;
    bonuses: Reward[];
    achievements: Achievement[];
    total_points: number;
    monthly_earnings: number;
    completed_jobs: number;
    average_rating: number;
}

interface RewardsPanelProps {
    technicianId: number;
}

const RewardsPanel: React.FC<RewardsPanelProps> = ({ technicianId }) => {
    const [rewards, setRewards] = useState<RewardsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        fetchRewards();
    }, [technicianId]);

    const fetchRewards = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/reviews/rewards/');

            if (response.ok) {
                const data = await response.json();
                setRewards(data);
            } else if (response.status === 404) {
                setError('Aucune donnée de récompenses disponible pour le moment');
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors du chargement des récompenses');
            }
        } catch (err) {
            console.error('Erreur lors du chargement des récompenses:', err);
            setError('Erreur réseau lors du chargement des récompenses');
        } finally {
            setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setRefreshing(true);
        await fetchRewards();
        setRefreshing(false);
    };

    const getLevelInfo = (level: string) => {
        const levels = {
            'bronze': { title: 'Bronze', icon: Medal, color: 'text-orange-600', bgColor: 'bg-orange-100' },
            'silver': { title: 'Argent', icon: Award, color: 'text-gray-600', bgColor: 'bg-gray-100' },
            'gold': { title: 'Or', icon: Crown, color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
            'platinum': { title: 'Platine', icon: Trophy, color: 'text-purple-600', bgColor: 'bg-purple-100' }
        };
        return levels[level as keyof typeof levels] || { title: level, icon: Star, color: 'text-gray-600', bgColor: 'bg-gray-100' };
    };

    const getAchievementIcon = (icon: string) => {
        const icons: { [key: string]: React.ComponentType<any> } = {
            'trophy': Trophy,
            'star': Star,
            'award': Award,
            'crown': Crown,
            'medal': Medal,
            'target': Target,
            'gift': Gift
        };
        return icons[icon] || Star;
    };

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

    if (error) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center">
                        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">Erreur de chargement</h3>
                        <p className="text-gray-600 mb-4">{error}</p>
                        <div className="flex justify-center gap-3">
                            <button
                                onClick={handleRefresh}
                                disabled={refreshing}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                            >
                                {refreshing ? (
                                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                )}
                                Réessayer
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    if (!rewards) {
        return (
            <div className="space-y-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="text-center text-gray-500">
                        <Trophy className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                        <p>Aucune donnée de récompenses disponible</p>
                    </div>
                </div>
            </div>
        );
    }

    const currentLevel = getLevelInfo(rewards.current_level);
    const nextLevel = rewards.next_level ? getLevelInfo(rewards.next_level) : null;
    const CurrentLevelIcon = currentLevel.icon;
    const NextLevelIcon = nextLevel?.icon || Star;

    return (
        <div className="space-y-6">
            {/* En-tête avec bouton de rafraîchissement */}
            <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-800">Système de Récompenses</h2>
                <button
                    onClick={handleRefresh}
                    disabled={refreshing}
                    className="inline-flex items-center px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 disabled:opacity-50"
                >
                    {refreshing ? (
                        <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                </button>
            </div>

            {/* Statistiques générales */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <Star className="h-8 w-8 text-yellow-500 mr-4" />
                        <div>
                            <p className="text-sm font-medium text-gray-600">Note moyenne</p>
                            <p className="text-2xl font-bold text-gray-900">{rewards.average_rating}/5</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <Target className="h-8 w-8 text-green-500 mr-4" />
                        <div>
                            <p className="text-sm font-medium text-gray-600">Missions terminées</p>
                            <p className="text-2xl font-bold text-gray-900">{rewards.completed_jobs}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <TrendingUp className="h-8 w-8 text-blue-500 mr-4" />
                        <div>
                            <p className="text-sm font-medium text-gray-600">Gains mensuels</p>
                            <p className="text-2xl font-bold text-gray-900">{rewards.monthly_earnings} FCFA</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                    <div className="flex items-center">
                        <Trophy className="h-8 w-8 text-purple-500 mr-4" />
                        <div>
                            <p className="text-sm font-medium text-gray-600">Points totaux</p>
                            <p className="text-2xl font-bold text-gray-900">{rewards.total_points}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Niveau actuel */}
            <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow p-6 text-white">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center">
                        <CurrentLevelIcon className="h-8 w-8 mr-3" />
                        <div>
                            <h3 className="text-xl font-semibold">Niveau {currentLevel.title}</h3>
                            <p className="text-orange-100">Votre niveau actuel</p>
                        </div>
                    </div>
                    {nextLevel && (
                        <div className="text-right">
                            <div className="flex items-center">
                                <span className="text-orange-100 mr-2">Prochain niveau:</span>
                                <NextLevelIcon className="h-6 w-6" />
                                <span className="ml-1">{nextLevel.title}</span>
                            </div>
                        </div>
                    )}
                </div>

                {rewards.next_level && (
                    <div className="mt-4">
                        <div className="flex justify-between text-sm text-white/80 mb-2">
                            <span>{currentLevel.title}</span>
                            <span>{nextLevel?.title}</span>
                        </div>
                        <div className="w-full bg-white/20 rounded-full h-3">
                            <div
                                className="bg-white h-3 rounded-full transition-all duration-500"
                                style={{ width: `${rewards.progress_to_next}%` }}
                            ></div>
                        </div>
                        <p className="text-sm text-white/80 mt-2">
                            {rewards.progress_to_next}% vers le niveau {nextLevel?.title}
                        </p>
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
                        Réalisations
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {rewards.achievements.map((achievement, index) => {
                            const AchievementIcon = getAchievementIcon(achievement.icon);
                            return (
                                <div
                                    key={index}
                                    className={`border rounded-lg p-4 ${achievement.unlocked
                                            ? 'bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200'
                                            : 'bg-gray-50 border-gray-200'
                                        }`}
                                >
                                    <div className="flex items-center mb-3">
                                        <AchievementIcon
                                            className={`h-6 w-6 mr-3 ${achievement.unlocked ? 'text-yellow-600' : 'text-gray-400'
                                                }`}
                                        />
                                        <h4 className={`font-semibold ${achievement.unlocked ? 'text-yellow-800' : 'text-gray-500'
                                            }`}>
                                            {achievement.title}
                                        </h4>
                                    </div>
                                    <p className={`text-sm ${achievement.unlocked ? 'text-yellow-700' : 'text-gray-500'
                                        }`}>
                                        {achievement.description}
                                    </p>
                                    {achievement.progress !== undefined && achievement.max_progress && (
                                        <div className="mt-3">
                                            <div className="flex justify-between text-xs text-gray-500 mb-1">
                                                <span>Progression</span>
                                                <span>{achievement.progress}/{achievement.max_progress}</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                                                    style={{ width: `${(achievement.progress / achievement.max_progress) * 100}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Conseils pour progresser */}
            {rewards.next_level && (
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-2 flex items-center">
                        <TrendingUp className="h-4 w-4 mr-2" />
                        Conseils pour progresser vers {nextLevel?.title}
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                        {rewards.current_level === 'bronze' && (
                            <>
                                <li>• Maintenez une note moyenne de 4.2+</li>
                                <li>• Recevez au moins 20 avis</li>
                                <li>• Assurez un taux de recommandation de 85%+</li>
                                <li>• Terminez au moins 50 missions</li>
                            </>
                        )}
                        {rewards.current_level === 'silver' && (
                            <>
                                <li>• Améliorez votre note moyenne à 4.5+</li>
                                <li>• Recevez au moins 30 avis</li>
                                <li>• Maintenez un taux de recommandation de 90%+</li>
                                <li>• Terminez au moins 100 missions</li>
                            </>
                        )}
                        {rewards.current_level === 'gold' && (
                            <>
                                <li>• Atteignez une note moyenne de 4.8+</li>
                                <li>• Recevez au moins 50 avis</li>
                                <li>• Assurez un taux de recommandation de 95%+</li>
                                <li>• Terminez au moins 200 missions</li>
                            </>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default RewardsPanel; 