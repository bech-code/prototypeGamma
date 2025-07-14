import React, { useState, useEffect } from 'react';
import { Star, TrendingUp, TrendingDown, Users, Award, Clock, MessageSquare, Shield, Zap, CheckCircle, AlertCircle, Tag, BarChart3, PieChart, Activity, ThumbsUp } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface ReviewAnalytics {
    id: number;
    technician: number;
    technician_name: string;
    total_reviews: number;
    average_rating: number;
    rating_distribution: Record<string, number>;
    avg_punctuality: number;
    avg_quality: number;
    avg_communication: number;
    avg_professionalism: number;
    avg_problem_solving: number;
    avg_cleanliness: number;
    avg_price_fairness: number;
    recommendation_rate: number;
    reuse_rate: number;
    friend_recommendation_rate: number;
    detailed_reviews_count: number;
    verified_reviews_count: number;
    avg_review_completeness: number;
    monthly_reviews: Record<string, number>;
    rating_trend: Array<{ date: string; avg: number }>;
    popular_tags: Array<{ tag: string; count: number }>;
    last_calculation: string;
}

const ReviewAnalytics: React.FC = () => {
    const [analytics, setAnalytics] = useState<ReviewAnalytics | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

    useEffect(() => {
        fetchAnalytics();
    }, []);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/depannage/api/reviews/analytics/');

            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            } else {
                setError('Erreur lors du chargement des analytics');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 4.5) return 'text-green-600 bg-green-100';
        if (rating >= 4.0) return 'text-blue-600 bg-blue-100';
        if (rating >= 3.5) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const getTrendIcon = (current: number, previous: number) => {
        if (current > previous) return <TrendingUp className="h-4 w-4 text-green-500" />;
        if (current < previous) return <TrendingDown className="h-4 w-4 text-red-500" />;
        return <Activity className="h-4 w-4 text-gray-500" />;
    };

    const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
        const starSize = size === 'sm' ? 'h-3 w-3' : size === 'lg' ? 'h-6 w-6' : 'h-4 w-4';

        return (
            <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                        key={star}
                        className={`${star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'} ${starSize}`}
                    />
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement des analytics...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                </div>
            </div>
        );
    }

    if (!analytics) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-600">Aucune donnée disponible</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics d'avis</h1>
                    <p className="text-gray-600">Statistiques détaillées de vos performances</p>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-xl p-6 mb-8 shadow-sm">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <label className="text-sm font-medium text-gray-700">Période :</label>
                            <select
                                value={selectedPeriod}
                                onChange={(e) => setSelectedPeriod(e.target.value as any)}
                                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="7d">7 derniers jours</option>
                                <option value="30d">30 derniers jours</option>
                                <option value="90d">90 derniers jours</option>
                                <option value="all">Tout</option>
                            </select>
                        </div>
                        <button
                            onClick={fetchAnalytics}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                            Actualiser
                        </button>
                    </div>
                </div>

                {/* Statistiques principales */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Note moyenne</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.average_rating.toFixed(1)}</p>
                            </div>
                            <div className="text-3xl">⭐</div>
                        </div>
                        <div className="mt-2">
                            {renderStars(analytics.average_rating, 'sm')}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Total avis</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.total_reviews}</p>
                            </div>
                            <Users className="h-8 w-8 text-blue-500" />
                        </div>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                {analytics.detailed_reviews_count} avis détaillés
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Taux de recommandation</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.recommendation_rate.toFixed(1)}%</p>
                            </div>
                            <ThumbsUp className="h-8 w-8 text-green-500" />
                        </div>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                {analytics.reuse_rate.toFixed(1)}% réutilisation
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="flex items-center justify-between">
                            <div>
                                <p className="text-sm font-medium text-gray-600">Complétude moyenne</p>
                                <p className="text-2xl font-bold text-gray-900">{analytics.avg_review_completeness.toFixed(1)}%</p>
                            </div>
                            <PieChart className="h-8 w-8 text-purple-500" />
                        </div>
                        <div className="mt-2">
                            <p className="text-sm text-gray-500">
                                Qualité des avis
                            </p>
                        </div>
                    </div>
                </div>

                {/* Graphiques et détails */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Distribution des notes */}
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <BarChart3 className="h-5 w-5 mr-2" />
                            Distribution des notes
                        </h3>
                        <div className="space-y-3">
                            {Object.entries(analytics.rating_distribution).reverse().map(([rating, count]) => (
                                <div key={rating} className="flex items-center justify-between">
                                    <div className="flex items-center space-x-2">
                                        <span className="text-sm font-medium text-gray-700">{rating} étoiles</span>
                                        {renderStars(parseInt(rating), 'sm')}
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <div className="w-32 bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-yellow-400 h-2 rounded-full"
                                                style={{
                                                    width: `${(count / analytics.total_reviews) * 100}%`
                                                }}
                                            />
                                        </div>
                                        <span className="text-sm text-gray-600 w-8 text-right">{count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Critères détaillés */}
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <Award className="h-5 w-5 mr-2" />
                            Critères détaillés
                        </h3>
                        <div className="space-y-4">
                            {[
                                { key: 'avg_punctuality', label: 'Ponctualité', icon: Clock },
                                { key: 'avg_quality', label: 'Qualité', icon: Award },
                                { key: 'avg_communication', label: 'Communication', icon: MessageSquare },
                                { key: 'avg_professionalism', label: 'Professionnalisme', icon: Shield },
                                { key: 'avg_problem_solving', label: 'Résolution', icon: Zap },
                                { key: 'avg_cleanliness', label: 'Propreté', icon: CheckCircle },
                                { key: 'avg_price_fairness', label: 'Prix', icon: AlertCircle }
                            ].map(({ key, label, icon: Icon }) => {
                                const rating = analytics[key as keyof ReviewAnalytics] as number;
                                return (
                                    <div key={key} className="flex items-center justify-between">
                                        <div className="flex items-center space-x-2">
                                            <Icon className="h-4 w-4 text-gray-500" />
                                            <span className="text-sm font-medium text-gray-700">{label}</span>
                                        </div>
                                        <div className="flex items-center space-x-2">
                                            {renderStars(rating, 'sm')}
                                            <span className={`text-sm font-medium px-2 py-1 rounded ${getRatingColor(rating)}`}>
                                                {rating.toFixed(1)}
                                            </span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>

                {/* Tags populaires */}
                <div className="bg-white rounded-xl p-6 shadow-sm mt-8">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Tag className="h-5 w-5 mr-2" />
                        Tags populaires
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {analytics.popular_tags.map(({ tag, count }) => (
                            <div
                                key={tag}
                                className="flex items-center space-x-2 px-3 py-2 bg-blue-100 text-blue-800 rounded-full"
                            >
                                <span className="text-sm font-medium">{tag}</span>
                                <span className="text-xs bg-blue-200 px-2 py-1 rounded-full">{count}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Tendances */}
                {analytics.rating_trend.length > 0 && (
                    <div className="bg-white rounded-xl p-6 shadow-sm mt-8">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                            <TrendingUp className="h-5 w-5 mr-2" />
                            Évolution des notes
                        </h3>
                        <div className="space-y-3">
                            {analytics.rating_trend.slice(-10).map((trend, index) => (
                                <div key={trend.date} className="flex items-center justify-between">
                                    <span className="text-sm text-gray-600">
                                        {new Date(trend.date).toLocaleDateString('fr-FR')}
                                    </span>
                                    <div className="flex items-center space-x-2">
                                        {renderStars(trend.avg, 'sm')}
                                        <span className="text-sm font-medium text-gray-700">
                                            {trend.avg.toFixed(1)}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Métriques de qualité */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-blue-600 mb-2">
                                {analytics.verified_reviews_count}
                            </div>
                            <p className="text-sm font-medium text-gray-700">Avis vérifiés</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {((analytics.verified_reviews_count / analytics.total_reviews) * 100).toFixed(1)}% du total
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-green-600 mb-2">
                                {analytics.friend_recommendation_rate.toFixed(1)}%
                            </div>
                            <p className="text-sm font-medium text-gray-700">Recommandation amis</p>
                            <p className="text-xs text-gray-500 mt-1">
                                Taux de recommandation sociale
                            </p>
                        </div>
                    </div>

                    <div className="bg-white rounded-xl p-6 shadow-sm">
                        <div className="text-center">
                            <div className="text-3xl font-bold text-purple-600 mb-2">
                                {analytics.detailed_reviews_count}
                            </div>
                            <p className="text-sm font-medium text-gray-700">Avis détaillés</p>
                            <p className="text-xs text-gray-500 mt-1">
                                {((analytics.detailed_reviews_count / analytics.total_reviews) * 100).toFixed(1)}% du total
                            </p>
                        </div>
                    </div>
                </div>

                {/* Dernière mise à jour */}
                <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500">
                        Dernière mise à jour : {new Date(analytics.last_calculation).toLocaleString('fr-FR')}
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ReviewAnalytics; 