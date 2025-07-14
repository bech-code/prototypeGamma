import React, { useState, useEffect } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
    LineChart, Line, PieChart, Pie, Cell, AreaChart, Area, RadarChart, PolarGrid,
    PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import {
    Users, TrendingUp, TrendingDown, DollarSign, Star, Clock,
    MapPin, Wrench, Shield, Activity, BarChart3, PieChart as PieChartIcon,
    Download, RefreshCw, AlertTriangle, CheckCircle, Eye, EyeOff,
    Calendar, Filter, Settings, Zap, Target, Award, Clock3
} from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface GlobalStatistics {
    overview: {
        total_users: number;
        total_clients: number;
        total_technicians: number;
        total_admins: number;
        active_users_30d: number;
        new_users_30d: number;
        total_requests: number;
        completed_requests: number;
        total_revenue: number;
        platform_fees: number;
        avg_rating: number;
        satisfaction_rate: number;
    };
    requests: {
        total: number;
        pending: number;
        in_progress: number;
        completed: number;
        cancelled: number;
        urgent: number;
        success_rate: number;
        avg_response_time_hours: number;
        avg_completion_time_hours: number;
    };
    financial: {
        total_revenue: number;
        total_payouts: number;
        platform_fees: number;
        avg_request_value: number;
        payment_methods: Array<{ method: string; count: number; total: number }>;
        payment_success_rate: number;
    };
    satisfaction: {
        total_reviews: number;
        avg_rating: number;
        satisfaction_rate: number;
        recommendation_rate: number;
    };
    technicians: {
        total: number;
        verified: number;
        available: number;
        avg_rating: number;
        top_technicians: Array<{
            id: number;
            name: string;
            specialty: string;
            total_jobs: number;
            avg_rating: number;
            total_earnings: number;
        }>;
    };
    specialties: {
        distribution: Record<string, { count: number; completed: number; avg_price: number }>;
        top_specialties: Array<{ specialty_needed: string; count: number; completed: number; avg_price: number }>;
    };
    security: {
        total_logins: number;
        failed_logins: number;
        security_alerts: number;
        login_success_rate: number;
    };
    geography: {
        top_cities: Array<{ city: string; count: number }>;
        service_areas: Array<any>;
    };
    trends: {
        daily: Record<string, { requests: number; completed: number; new_users: number; revenue: number }>;
        weekly: Record<string, { requests: number; completed: number; revenue: number }>;
        monthly: Record<string, { requests: number; completed: number; new_users: number; revenue: number }>;
    };
    advanced: {
        conversion_rate: number;
        retention_rate: number;
        churn_rate: number;
    };
    calculation_info: {
        last_calculation: string;
        calculation_duration: number;
    };
}

interface RealTimeStats {
    current_time: string;
    last_24h: {
        new_requests: number;
        completed_requests: number;
        new_users: number;
        new_reviews: number;
        revenue: number;
    };
    last_7d: {
        new_requests: number;
        completed_requests: number;
        new_users: number;
        new_reviews: number;
        revenue: number;
    };
    active_sessions: {
        online_users: number;
        active_technicians: number;
    };
}

const COLORS = {
    primary: '#2563eb',
    secondary: '#7c3aed',
    success: '#059669',
    warning: '#d97706',
    danger: '#dc2626',
    info: '#0891b2',
    light: '#f3f4f6',
    dark: '#1f2937'
};

const CHART_COLORS = ['#2563eb', '#7c3aed', '#059669', '#d97706', '#dc2626', '#0891b2'];

const EnhancedStatistics: React.FC = () => {
    const [stats, setStats] = useState<GlobalStatistics | null>(null);
    const [realTimeStats, setRealTimeStats] = useState<RealTimeStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState<'24h' | '7d' | '30d' | 'all'>('7d');
    const [showRealTime, setShowRealTime] = useState(true);
    const [autoRefresh, setAutoRefresh] = useState(true);
    const [exporting, setExporting] = useState<'none' | 'excel' | 'pdf' | 'json'>('none');

    useEffect(() => {
        fetchStatistics();
        fetchRealTimeStats();

        if (autoRefresh) {
            const interval = setInterval(() => {
                fetchRealTimeStats();
            }, 30000); // Rafraîchir toutes les 30 secondes

            return () => clearInterval(interval);
        }
    }, [autoRefresh]);

    const fetchStatistics = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/depannage/api/statistics/global_statistics/');

            if (response.ok) {
                const data = await response.json();
                setStats(data);
            } else {
                setError('Erreur lors du chargement des statistiques');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const fetchRealTimeStats = async () => {
        try {
            const response = await fetchWithAuth('/depannage/api/statistics/real_time_stats/');

            if (response.ok) {
                const data = await response.json();
                setRealTimeStats(data);
            }
        } catch (err) {
            console.error('Erreur lors du chargement des stats temps réel:', err);
        }
    };

    const handleExport = async (format: 'excel' | 'pdf' | 'json') => {
        try {
            setExporting(format);
            const response = await fetchWithAuth(`/depannage/api/statistics/export_statistics/?type=${format}`);

            if (response.ok) {
                const data = await response.json();
                // Télécharger le fichier
                window.open(data.download_url, '_blank');
            } else {
                setError('Erreur lors de l\'export');
            }
        } catch (err) {
            setError('Erreur lors de l\'export');
        } finally {
            setExporting('none');
        }
    };

    const getMetricCard = (title: string, value: string | number, icon: React.ReactNode,
        trend?: number, color: string = COLORS.primary) => (
        <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300">
            <div className="flex items-center justify-between">
                <div className="flex items-center">
                    <div className={`p-3 rounded-lg ${color} bg-opacity-10`}>
                        {icon}
                    </div>
                    <div className="ml-4">
                        <p className="text-sm font-medium text-gray-600">{title}</p>
                        <p className="text-2xl font-bold text-gray-900">{value}</p>
                    </div>
                </div>
                {trend !== undefined && (
                    <div className={`flex items-center text-sm ${trend > 0 ? 'text-green-600' : trend < 0 ? 'text-red-600' : 'text-gray-500'
                        }`}>
                        {trend > 0 ? <TrendingUp className="h-4 w-4" /> :
                            trend < 0 ? <TrendingDown className="h-4 w-4" /> :
                                <Activity className="h-4 w-4" />}
                        <span className="ml-1">{Math.abs(trend)}%</span>
                    </div>
                )}
            </div>
        </div>
    );

    const getChartData = (data: any, key: string) => {
        if (!data) return [];
        return Object.entries(data).map(([date, value]: [string, any]) => ({
            date,
            [key]: value[key] || value
        }));
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <RefreshCw className="h-8 w-8 text-blue-600 animate-spin mx-auto mb-4" />
                    <p className="text-gray-600">Chargement des statistiques...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                    <button
                        onClick={fetchStatistics}
                        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                        Réessayer
                    </button>
                </div>
            </div>
        );
    }

    if (!stats) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <p className="text-gray-600">Aucune donnée disponible</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex items-center justify-between h-16">
                        <div className="flex items-center">
                            <BarChart3 className="h-8 w-8 text-blue-600 mr-3" />
                            <h1 className="text-2xl font-bold text-gray-900">Statistiques Avancées</h1>
                        </div>
                        <div className="flex items-center space-x-4">
                            <div className="flex items-center space-x-2">
                                <button
                                    onClick={() => setShowRealTime(!showRealTime)}
                                    className={`p-2 rounded-lg ${showRealTime ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    {showRealTime ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                                </button>
                                <button
                                    onClick={() => setAutoRefresh(!autoRefresh)}
                                    className={`p-2 rounded-lg ${autoRefresh ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-600'}`}
                                >
                                    <RefreshCw className={`h-4 w-4 ${autoRefresh ? 'animate-spin' : ''}`} />
                                </button>
                            </div>
                            <div className="flex items-center space-x-2">
                                <select
                                    value={timeRange}
                                    onChange={(e) => setTimeRange(e.target.value as any)}
                                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
                                >
                                    <option value="24h">24h</option>
                                    <option value="7d">7 jours</option>
                                    <option value="30d">30 jours</option>
                                    <option value="all">Tout</option>
                                </select>
                                <button
                                    onClick={() => handleExport('excel')}
                                    disabled={exporting !== 'none'}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                                >
                                    {exporting === 'excel' ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                    <span className="ml-2">Excel</span>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Real-time Stats Banner */}
            {showRealTime && realTimeStats && (
                <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-6">
                                <div className="flex items-center space-x-2">
                                    <Activity className="h-4 w-4" />
                                    <span className="text-sm font-medium">Temps réel</span>
                                </div>
                                <div className="flex items-center space-x-6 text-sm">
                                    <span>Utilisateurs en ligne: {realTimeStats.active_sessions.online_users}</span>
                                    <span>Techniciens actifs: {realTimeStats.active_sessions.active_technicians}</span>
                                    <span>Dernière mise à jour: {new Date(realTimeStats.current_time).toLocaleTimeString()}</span>
                                </div>
                            </div>
                            <div className="flex items-center space-x-4 text-sm">
                                <div className="text-center">
                                    <div className="font-bold">{realTimeStats.last_24h.new_requests}</div>
                                    <div>Nouvelles demandes (24h)</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold">{realTimeStats.last_24h.completed_requests}</div>
                                    <div>Demandes terminées (24h)</div>
                                </div>
                                <div className="text-center">
                                    <div className="font-bold">{realTimeStats.last_24h.revenue.toLocaleString()} FCFA</div>
                                    <div>Revenus (24h)</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Navigation Tabs */}
                <div className="mb-8">
                    <nav className="flex space-x-8">
                        {[
                            { id: 'overview', name: 'Vue d\'ensemble', icon: BarChart3 },
                            { id: 'requests', name: 'Demandes', icon: Wrench },
                            { id: 'financial', name: 'Financier', icon: DollarSign },
                            { id: 'satisfaction', name: 'Satisfaction', icon: Star },
                            { id: 'technicians', name: 'Techniciens', icon: Users },
                            { id: 'trends', name: 'Tendances', icon: TrendingUp },
                            { id: 'security', name: 'Sécurité', icon: Shield },
                            { id: 'geography', name: 'Géographie', icon: MapPin }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setActiveTab(tab.id)}
                                className={`flex items-center space-x-2 py-2 px-3 rounded-lg transition-colors ${activeTab === tab.id
                                        ? 'bg-blue-100 text-blue-700'
                                        : 'text-gray-600 hover:text-gray-900'
                                    }`}
                            >
                                <tab.icon className="h-4 w-4" />
                                <span>{tab.name}</span>
                            </button>
                        ))}
                    </nav>
                </div>

                {/* Content */}
                <div className="space-y-8">
                    {activeTab === 'overview' && (
                        <div className="space-y-8">
                            {/* Key Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {getMetricCard(
                                    'Utilisateurs totaux',
                                    stats.overview.total_users.toLocaleString(),
                                    <Users className="h-6 w-6" />,
                                    12,
                                    COLORS.primary
                                )}
                                {getMetricCard(
                                    'Demandes totales',
                                    stats.overview.total_requests.toLocaleString(),
                                    <Wrench className="h-6 w-6" />,
                                    8,
                                    COLORS.success
                                )}
                                {getMetricCard(
                                    'Revenus totaux',
                                    `${stats.overview.total_revenue.toLocaleString()} FCFA`,
                                    <DollarSign className="h-6 w-6" />,
                                    15,
                                    COLORS.warning
                                )}
                                {getMetricCard(
                                    'Note moyenne',
                                    `${stats.overview.avg_rating.toFixed(1)}/5`,
                                    <Star className="h-6 w-6" />,
                                    2,
                                    COLORS.secondary
                                )}
                            </div>

                            {/* Charts Row */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                {/* Requests Evolution */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Évolution des demandes</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={getChartData(stats.trends.daily, 'requests')}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="requests" stroke={COLORS.primary} fill={COLORS.primary} fillOpacity={0.3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>

                                {/* Revenue Chart */}
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Évolution des revenus</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={getChartData(stats.trends.daily, 'revenue')}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="revenue" stroke={COLORS.warning} strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Advanced Metrics */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Métriques avancées</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux de conversion</span>
                                            <span className="font-semibold">{stats.advanced.conversion_rate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux de rétention</span>
                                            <span className="font-semibold">{stats.advanced.retention_rate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux de churn</span>
                                            <span className="font-semibold">{stats.advanced.churn_rate.toFixed(1)}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Performance</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux de succès</span>
                                            <span className="font-semibold">{stats.requests.success_rate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Temps de réponse</span>
                                            <span className="font-semibold">{stats.requests.avg_response_time_hours.toFixed(1)}h</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Temps de completion</span>
                                            <span className="font-semibold">{stats.requests.avg_completion_time_hours.toFixed(1)}h</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Satisfaction</h3>
                                    <div className="space-y-4">
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux de satisfaction</span>
                                            <span className="font-semibold">{stats.satisfaction.satisfaction_rate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Taux de recommandation</span>
                                            <span className="font-semibold">{stats.satisfaction.recommendation_rate.toFixed(1)}%</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Total avis</span>
                                            <span className="font-semibold">{stats.satisfaction.total_reviews}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'requests' && (
                        <div className="space-y-8">
                            {/* Request Status Distribution */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Répartition des demandes</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <PieChart>
                                            <Pie
                                                data={[
                                                    { name: 'Terminées', value: stats.requests.completed, color: COLORS.success },
                                                    { name: 'En cours', value: stats.requests.in_progress, color: COLORS.warning },
                                                    { name: 'En attente', value: stats.requests.pending, color: COLORS.info },
                                                    { name: 'Annulées', value: stats.requests.cancelled, color: COLORS.danger }
                                                ]}
                                                cx="50%"
                                                cy="50%"
                                                outerRadius={80}
                                                dataKey="value"
                                            >
                                                {[
                                                    { name: 'Terminées', value: stats.requests.completed, color: COLORS.success },
                                                    { name: 'En cours', value: stats.requests.in_progress, color: COLORS.warning },
                                                    { name: 'En attente', value: stats.requests.pending, color: COLORS.info },
                                                    { name: 'Annulées', value: stats.requests.cancelled, color: COLORS.danger }
                                                ].map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip />
                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Métriques de performance</h3>
                                    <div className="space-y-6">
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Taux de succès</span>
                                                <span className="text-sm font-medium text-gray-900">{stats.requests.success_rate.toFixed(1)}%</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-green-600 h-2 rounded-full"
                                                    style={{ width: `${stats.requests.success_rate}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Temps de réponse moyen</span>
                                                <span className="text-sm font-medium text-gray-900">{stats.requests.avg_response_time_hours.toFixed(1)}h</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-blue-600 h-2 rounded-full"
                                                    style={{ width: `${Math.min(stats.requests.avg_response_time_hours / 24 * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                        <div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-sm font-medium text-gray-700">Temps de completion moyen</span>
                                                <span className="text-sm font-medium text-gray-900">{stats.requests.avg_completion_time_hours.toFixed(1)}h</span>
                                            </div>
                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                <div
                                                    className="bg-purple-600 h-2 rounded-full"
                                                    style={{ width: `${Math.min(stats.requests.avg_completion_time_hours / 24 * 100, 100)}%` }}
                                                ></div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Request Trends */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Tendances des demandes</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <LineChart data={getChartData(stats.trends.daily, 'requests')}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="requests" stroke={COLORS.primary} strokeWidth={2} name="Nouvelles demandes" />
                                        <Line type="monotone" dataKey="completed" stroke={COLORS.success} strokeWidth={2} name="Demandes terminées" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'financial' && (
                        <div className="space-y-8">
                            {/* Financial Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {getMetricCard(
                                    'Revenus totaux',
                                    `${stats.financial.total_revenue.toLocaleString()} FCFA`,
                                    <DollarSign className="h-6 w-6" />,
                                    15,
                                    COLORS.success
                                )}
                                {getMetricCard(
                                    'Paiements techniciens',
                                    `${stats.financial.total_payouts.toLocaleString()} FCFA`,
                                    <Users className="h-6 w-6" />,
                                    12,
                                    COLORS.primary
                                )}
                                {getMetricCard(
                                    'Frais de plateforme',
                                    `${stats.financial.platform_fees.toLocaleString()} FCFA`,
                                    <BarChart3 className="h-6 w-6" />,
                                    8,
                                    COLORS.warning
                                )}
                                {getMetricCard(
                                    'Valeur moyenne',
                                    `${stats.financial.avg_request_value.toLocaleString()} FCFA`,
                                    <Target className="h-6 w-6" />,
                                    5,
                                    COLORS.secondary
                                )}
                            </div>

                            {/* Payment Methods */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Méthodes de paiement</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={stats.financial.payment_methods}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="method" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="total" fill={COLORS.primary} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Revenue Trends */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Évolution des revenus</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <AreaChart data={getChartData(stats.trends.daily, 'revenue')}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="date" />
                                        <YAxis />
                                        <Tooltip />
                                        <Area type="monotone" dataKey="revenue" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.3} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'satisfaction' && (
                        <div className="space-y-8">
                            {/* Satisfaction Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {getMetricCard(
                                    'Note moyenne',
                                    `${stats.satisfaction.avg_rating.toFixed(1)}/5`,
                                    <Star className="h-6 w-6" />,
                                    2,
                                    COLORS.warning
                                )}
                                {getMetricCard(
                                    'Taux de satisfaction',
                                    `${stats.satisfaction.satisfaction_rate.toFixed(1)}%`,
                                    <CheckCircle className="h-6 w-6" />,
                                    5,
                                    COLORS.success
                                )}
                                {getMetricCard(
                                    'Taux de recommandation',
                                    `${stats.satisfaction.recommendation_rate.toFixed(1)}%`,
                                    <Award className="h-6 w-6" />,
                                    3,
                                    COLORS.secondary
                                )}
                                {getMetricCard(
                                    'Total avis',
                                    stats.satisfaction.total_reviews.toLocaleString(),
                                    <BarChart3 className="h-6 w-6" />,
                                    8,
                                    COLORS.primary
                                )}
                            </div>

                            {/* Rating Distribution */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Distribution des notes</h3>
                                <ResponsiveContainer width="100%" height={300}>
                                    <BarChart data={[
                                        { rating: '1★', count: 0 },
                                        { rating: '2★', count: 0 },
                                        { rating: '3★', count: 0 },
                                        { rating: '4★', count: 0 },
                                        { rating: '5★', count: 0 }
                                    ]}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="rating" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill={COLORS.warning} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'technicians' && (
                        <div className="space-y-8">
                            {/* Technician Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {getMetricCard(
                                    'Total techniciens',
                                    stats.technicians.total.toLocaleString(),
                                    <Users className="h-6 w-6" />,
                                    10,
                                    COLORS.primary
                                )}
                                {getMetricCard(
                                    'Techniciens vérifiés',
                                    stats.technicians.verified.toLocaleString(),
                                    <CheckCircle className="h-6 w-6" />,
                                    15,
                                    COLORS.success
                                )}
                                {getMetricCard(
                                    'Techniciens disponibles',
                                    stats.technicians.available.toLocaleString(),
                                    <Activity className="h-6 w-6" />,
                                    8,
                                    COLORS.info
                                )}
                                {getMetricCard(
                                    'Note moyenne',
                                    `${stats.technicians.avg_rating.toFixed(1)}/5`,
                                    <Star className="h-6 w-6" />,
                                    2,
                                    COLORS.warning
                                )}
                            </div>

                            {/* Top Technicians */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Top techniciens</h3>
                                <div className="overflow-x-auto">
                                    <table className="min-w-full divide-y divide-gray-200">
                                        <thead className="bg-gray-50">
                                            <tr>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technicien</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Spécialité</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Travaux</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Revenus</th>
                                            </tr>
                                        </thead>
                                        <tbody className="bg-white divide-y divide-gray-200">
                                            {stats.technicians.top_technicians.map((tech, index) => (
                                                <tr key={tech.id}>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-10 w-10">
                                                                <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                                    <span className="text-sm font-medium text-blue-600">
                                                                        {tech.name.split(' ').map(n => n[0]).join('')}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <div className="ml-4">
                                                                <div className="text-sm font-medium text-gray-900">{tech.name}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tech.specialty}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{tech.total_jobs}</td>
                                                    <td className="px-6 py-4 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <Star className="h-4 w-4 text-yellow-400" />
                                                            <span className="ml-1 text-sm text-gray-900">{tech.avg_rating.toFixed(1)}</span>
                                                        </div>
                                                    </td>
                                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                        {tech.total_earnings.toLocaleString()} FCFA
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'trends' && (
                        <div className="space-y-8">
                            {/* Trends Overview */}
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Évolution des utilisateurs</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <LineChart data={getChartData(stats.trends.daily, 'new_users')}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line type="monotone" dataKey="new_users" stroke={COLORS.primary} strokeWidth={2} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>

                                <div className="bg-white rounded-lg shadow p-6">
                                    <h3 className="text-lg font-semibold mb-4">Évolution des revenus</h3>
                                    <ResponsiveContainer width="100%" height={300}>
                                        <AreaChart data={getChartData(stats.trends.daily, 'revenue')}>
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="date" />
                                            <YAxis />
                                            <Tooltip />
                                            <Area type="monotone" dataKey="revenue" stroke={COLORS.success} fill={COLORS.success} fillOpacity={0.3} />
                                        </AreaChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>

                            {/* Monthly Trends */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Tendances mensuelles</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={Object.entries(stats.trends.monthly).map(([month, data]: [string, any]) => ({
                                        month,
                                        requests: data.requests,
                                        completed: data.completed,
                                        new_users: data.new_users,
                                        revenue: data.revenue
                                    }))}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="month" />
                                        <YAxis />
                                        <Tooltip />
                                        <Legend />
                                        <Bar dataKey="requests" fill={COLORS.primary} />
                                        <Bar dataKey="completed" fill={COLORS.success} />
                                        <Bar dataKey="new_users" fill={COLORS.secondary} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {activeTab === 'security' && (
                        <div className="space-y-8">
                            {/* Security Overview */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                {getMetricCard(
                                    'Connexions totales',
                                    stats.security.total_logins.toLocaleString(),
                                    <Shield className="h-6 w-6" />,
                                    5,
                                    COLORS.primary
                                )}
                                {getMetricCard(
                                    'Connexions échouées',
                                    stats.security.failed_logins.toLocaleString(),
                                    <AlertTriangle className="h-6 w-6" />,
                                    -2,
                                    COLORS.danger
                                )}
                                {getMetricCard(
                                    'Alertes de sécurité',
                                    stats.security.security_alerts.toLocaleString(),
                                    <AlertTriangle className="h-6 w-6" />,
                                    1,
                                    COLORS.warning
                                )}
                                {getMetricCard(
                                    'Taux de succès',
                                    `${stats.security.login_success_rate.toFixed(1)}%`,
                                    <CheckCircle className="h-6 w-6" />,
                                    1,
                                    COLORS.success
                                )}
                            </div>

                            {/* Security Metrics */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Métriques de sécurité</h3>
                                <div className="space-y-6">
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Taux de succès des connexions</span>
                                            <span className="text-sm font-medium text-gray-900">{stats.security.login_success_rate.toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-green-600 h-2 rounded-full"
                                                style={{ width: `${stats.security.login_success_rate}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div className="flex justify-between mb-2">
                                            <span className="text-sm font-medium text-gray-700">Taux d'échec des connexions</span>
                                            <span className="text-sm font-medium text-gray-900">{((stats.security.failed_logins / (stats.security.total_logins + stats.security.failed_logins)) * 100).toFixed(1)}%</span>
                                        </div>
                                        <div className="w-full bg-gray-200 rounded-full h-2">
                                            <div
                                                className="bg-red-600 h-2 rounded-full"
                                                style={{ width: `${(stats.security.failed_logins / (stats.security.total_logins + stats.security.failed_logins)) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'geography' && (
                        <div className="space-y-8">
                            {/* Top Cities */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Top villes par activité</h3>
                                <ResponsiveContainer width="100%" height={400}>
                                    <BarChart data={stats.geography.top_cities}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="city" />
                                        <YAxis />
                                        <Tooltip />
                                        <Bar dataKey="count" fill={COLORS.primary} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>

                            {/* Service Areas */}
                            <div className="bg-white rounded-lg shadow p-6">
                                <h3 className="text-lg font-semibold mb-4">Zones de service</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {stats.geography.service_areas.map((area: any, index: number) => (
                                        <div key={index} className="border border-gray-200 rounded-lg p-4">
                                            <h4 className="font-medium text-gray-900">{area.name}</h4>
                                            <p className="text-sm text-gray-600">{area.description}</p>
                                            <div className="mt-2 flex items-center justify-between">
                                                <span className="text-sm text-gray-500">Techniciens actifs</span>
                                                <span className="text-sm font-medium">{area.active_technicians || 0}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default EnhancedStatistics; 