import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';
import {
    Users, FileText, DollarSign, Star, Shield, MapPin,
    TrendingUp, Clock, CheckCircle, AlertCircle, UserCheck, Award,
    BarChart3, PieChart, LineChart, Activity, Download
} from 'lucide-react';
import AmChartsLine from '../components/AmChartsLine';
import AmChartsPie from '../components/AmChartsPie';
import AmChartsBar from '../components/AmChartsBar';

interface Review {
    id: number;
    rating: number;
    comment: string;
    created_at: string;
    user: { id: number; username: string };
}

interface PaymentMethod {
    method: string;
    count: number;
    total: number;
    date?: string;
}

interface StatisticsData {
    overview: {
        total_users: number;
        total_clients: number;
        total_technicians: number;
        total_admins: number;
        active_users_30d: number;
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
        recent_24h: number;
        recent_7d: number;
        recent_30d: number;
        daily_evolution: Array<{ date: string; count: number }>;
    };
    financial: {
        total_revenue: number;
        total_payouts: number;
        platform_fees: number;
        payment_methods: PaymentMethod[];
    };
    specialties: {
        stats: Array<{ specialty_needed: string; count: number; completed: number; avg_price: number }>;
        top_technicians: Array<{
            id: number;
            name: string;
            specialty: string;
            total_jobs: number;
            avg_rating: number;
            total_earnings: number;
        }>;
    };
    technicians: {
        total: number;
        verified: number;
        available: number;
        availability_rate: number;
    };
    satisfaction: {
        total_reviews: number;
        avg_rating: number;
        satisfaction_rate: number;
        reviews?: Review[];
    };
    security: {
        total_logins: number;
        failed_logins: number;
        security_alerts: number;
        success_rate: number;
    };
    geography: {
        top_cities: Array<{ city: string; count: number }>;
    };
}

const Statistics: React.FC = () => {
    const { user, token } = useAuth();
    const [data, setData] = useState<StatisticsData | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('overview');
    // Filtres pour l'onglet financier
    const [financialPeriod, setFinancialPeriod] = useState<'all' | '7d' | '30d'>('all');
    const [paymentMethod, setPaymentMethod] = useState<string>('all');
    // Filtres pour l'onglet satisfaction
    const [reviewPeriod, setReviewPeriod] = useState<'all' | '7d' | '30d'>('all');
    const [reviewMinRating, setReviewMinRating] = useState<number>(1);
    const [showFullComment, setShowFullComment] = useState<string | null>(null);
    // 1. Ajout d'un état pour l'export
    const [exporting, setExporting] = useState<'none' | 'excel' | 'pdf'>('none');
    const [filteringPayments, setFilteringPayments] = useState(false);
    const [filteringReviews, setFilteringReviews] = useState(false);

    useEffect(() => {
        const fetchStatistics = async () => {
            try {
                setLoading(true);
                setError(null);
                let statisticsData = null;
                let parseError = false;
                const response = await fetchWithAuth('/depannage/api/repair-requests/project_statistics/');
                if (response.ok) {
                    try {
                        statisticsData = await response.json();
                    } catch (e) {
                        parseError = true;
                    }
                    if (parseError || !statisticsData) {
                        setError('Erreur de parsing des statistiques');
                        setData(null);
                    } else {
                        setData(statisticsData);
                    }
                } else {
                    setError('Erreur lors du chargement des statistiques');
                }
            } catch (err) {
                setError('Erreur de connexion');
            } finally {
                setLoading(false);
            }
        };
        fetchStatistics();
    }, []);

    // Configuration ApexCharts pour l'évolution des demandes
    const getRequestsChartOptions = (): ApexOptions => ({
        chart: {
            type: 'line',
            height: 300,
            animations: {
                enabled: true,
                speed: 800
            },
            toolbar: { show: false }
        },
        series: [{
            name: 'Demandes',
            data: data?.requests.daily_evolution.map(item => item.count) || []
        }],
        xaxis: {
            categories: data?.requests.daily_evolution.map(item => item.date) || []
        },
        colors: ['#3B82F6'],
        stroke: { curve: 'smooth', width: 3 },
        markers: { size: 6 },
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 1,
                opacityFrom: 0.7,
                opacityTo: 0.2,
                stops: [0, 90, 100]
            }
        },
        tooltip: {
            theme: 'dark',
            y: { formatter: (value) => `${value} demandes` }
        }
    });

    // Configuration ApexCharts pour les spécialités
    const getSpecialtiesChartOptions = (): ApexOptions => ({
        chart: { type: 'pie', height: 300 },
        series: data?.specialties.stats.map(item => item.count) || [],
        labels: data?.specialties.stats.map(item => item.specialty_needed) || [],
        colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'],
        legend: { position: 'bottom' },
        tooltip: {
            y: {
                formatter: (value: number, { series, seriesIndex, dataPointIndex, w }: any) => {
                    const total = w.globals.seriesTotals.reduce((a: number, b: number) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return `${value} demandes (${percentage}%)`;
                }
            }
        }
    });

    // Fonctions de filtrage
    function filterByPeriod<T extends { date?: string; created_at?: string }>(arr: T[], key: 'date' | 'created_at', period: 'all' | '7d' | '30d') {
        if (period === 'all') return arr;
        const now = new Date();
        const days = period === '7d' ? 7 : 30;
        return arr.filter(item => {
            const d = new Date(item[key] || '');
            return !isNaN(d.getTime()) && (now.getTime() - d.getTime()) <= days * 24 * 60 * 60 * 1000;
        });
    }

    // Paiements filtrés
    const filteredPayments = data?.financial?.payment_methods && Array.isArray(data.financial.payment_methods)
        ? filterByPeriod(data.financial.payment_methods, 'date', financialPeriod).filter((p: PaymentMethod) => paymentMethod === 'all' || p.method === paymentMethod)
        : [];
    // Avis filtrés
    const filteredReviews = data?.satisfaction?.reviews && Array.isArray(data.satisfaction.reviews)
        ? filterByPeriod(data.satisfaction.reviews, 'created_at', reviewPeriod).filter((r: Review) => r.rating >= reviewMinRating)
        : [];

    // Fonction d'export Excel
    const handleExportExcel = async () => {
        setExporting('excel');
        try {
            const response = await fetch('/depannage/api/export_statistics_excel/', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.status === 401) {
                setError('Session expirée. Veuillez vous reconnecter.');
                setExporting('none');
                return;
            }
            if (!response.ok) throw new Error("Erreur lors de l'export Excel");
            const blob = await response.blob();
            const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/['"]/g, '') || 'statistiques_depanneteliman.xlsx';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert("Erreur lors de l'export Excel");
            console.error(error);
        } finally {
            setExporting('none');
        }
    };

    // Fonction d'export PDF
    const handleExportPDF = async () => {
        setExporting('pdf');
        try {
            const response = await fetch('/depannage/api/export_statistics_pdf/', {
                method: 'GET',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (response.status === 401) {
                setError('Session expirée. Veuillez vous reconnecter.');
                setExporting('none');
                return;
            }
            if (!response.ok) throw new Error("Erreur lors de l'export PDF");
            const blob = await response.blob();
            const filename = response.headers.get('Content-Disposition')?.split('filename=')[1]?.replace(/['"]/g, '') || 'statistiques_depanneteliman.pdf';
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } catch (error) {
            alert("Erreur lors de l'export PDF");
            console.error(error);
        } finally {
            setExporting('none');
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement des statistiques...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <p className="text-red-600">{error}</p>
                    {error.includes('Session expirée') && (
                        <button
                            className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
                            onClick={() => window.location.href = '/login'}
                            aria-label="Se reconnecter"
                        >
                            Se reconnecter
                        </button>
                    )}
                </div>
            </div>
        );
    }

    if (!data) return null;

    const tabs = [
        { id: 'overview', name: 'Vue d\'ensemble', icon: Activity },
        { id: 'requests', name: 'Demandes', icon: FileText },
        { id: 'financial', name: 'Financier', icon: DollarSign },
        { id: 'technicians', name: 'Techniciens', icon: UserCheck },
        { id: 'security', name: 'Sécurité', icon: Shield }
    ];

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Hero Section */}
            <section className="relative bg-gradient-to-r from-blue-900 to-blue-700 text-white py-24">
                <div className="container mx-auto px-4">
                    <div className="max-w-4xl mx-auto text-center">
                        <h1 className="text-4xl md:text-5xl font-bold mb-4">
                            Statistiques du Projet
                        </h1>
                        <p className="text-xl text-blue-100 mb-2">
                            Bienvenue, Mr {user?.username || 'Administrateur'}
                        </p>
                        <p className="text-lg text-blue-100 mb-8">
                            Vue d'ensemble complète avec graphiques interactifs et animations fluides
                        </p>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                            <div className="bg-blue-800/50 p-6 rounded-lg">
                                <BarChart3 className="w-8 h-8 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">Vue d'ensemble</h3>
                                <p className="text-sm text-blue-100">Métriques principales</p>
                            </div>
                            <div className="bg-blue-800/50 p-6 rounded-lg">
                                <FileText className="w-8 h-8 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">Demandes</h3>
                                <p className="text-sm text-blue-100">Analyse des interventions</p>
                            </div>
                            <div className="bg-blue-800/50 p-6 rounded-lg">
                                <DollarSign className="w-8 h-8 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">Financier</h3>
                                <p className="text-sm text-blue-100">Revenus et paiements</p>
                            </div>
                            <div className="bg-blue-800/50 p-6 rounded-lg">
                                <Shield className="w-8 h-8 mx-auto mb-4" />
                                <h3 className="font-semibold mb-2">Sécurité</h3>
                                <p className="text-sm text-blue-100">Monitoring sécurité</p>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Header avec boutons d'export */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">Tableau de bord analytique</h2>
                            <p className="mt-2 text-gray-600">
                                Dernière mise à jour : {new Date().toLocaleString('fr-FR')}
                            </p>
                        </div>
                        <div className="text-right">
                            {/* Boutons d'export pour les admins */}
                            {user?.user_type === 'admin' && (
                                <div className="flex gap-2">
                                    <button
                                        onClick={handleExportExcel}
                                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium shadow disabled:opacity-50 transition-colors"
                                        disabled={exporting !== 'none'}
                                        aria-busy={exporting === 'excel'}
                                    >
                                        <Download className="h-4 w-4 mr-2" /> Exporter Excel
                                    </button>
                                    <button
                                        onClick={handleExportPDF}
                                        className="inline-flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium shadow disabled:opacity-50 transition-colors"
                                        disabled={exporting !== 'none'}
                                        aria-busy={exporting === 'pdf'}
                                    >
                                        <Download className="h-4 w-4 mr-2" /> Exporter PDF
                                    </button>
                                    {exporting !== 'none' && (
                                        <span className="ml-2 text-blue-600 animate-pulse flex items-center">
                                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                                            Téléchargement en cours...
                                        </span>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
                {/* Navigation par onglets */}
                <div className="mb-8">
                    <nav className="flex space-x-8" aria-label="Tabs">
                        {tabs.map((tab) => {
                            const Icon = tab.icon;
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${activeTab === tab.id
                                        ? 'border-blue-500 text-blue-600'
                                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                        }`}
                                >
                                    <Icon className="h-4 w-4" />
                                    <span>{tab.name}</span>
                                </button>
                            );
                        })}
                    </nav>
                </div>

                {/* Vue d'ensemble */}
                {activeTab === 'overview' && (
                    <div className="space-y-8">
                        {/* Métriques principales */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300">
                                <div className="flex items-center">
                                    <Users className="h-8 w-8 text-blue-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Utilisateurs totaux</p>
                                        <p className="text-2xl font-bold text-gray-900">{data.overview.total_users}</p>
                                    </div>
                                </div>
                                <div className="mt-4 text-sm text-gray-500">
                                    {data.overview.active_users_30d} actifs (30j)
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300">
                                <div className="flex items-center">
                                    <FileText className="h-8 w-8 text-green-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Demandes totales</p>
                                        <p className="text-2xl font-bold text-gray-900">{data.overview.total_requests}</p>
                                    </div>
                                </div>
                                <div className="mt-4 text-sm text-gray-500">
                                    {data.overview.completed_requests} terminées
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300">
                                <div className="flex items-center">
                                    <DollarSign className="h-8 w-8 text-yellow-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Revenus totaux</p>
                                        <p className="text-2xl font-bold text-gray-900">
                                            {data.overview.total_revenue.toLocaleString('fr-FR')} FCFA
                                        </p>
                                    </div>
                                </div>
                                <div className="mt-4 text-sm text-gray-500">
                                    {data.overview.platform_fees.toLocaleString('fr-FR')} FCFA de frais
                                </div>
                            </div>

                            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300">
                                <div className="flex items-center">
                                    <Star className="h-8 w-8 text-purple-600" />
                                    <div className="ml-4">
                                        <p className="text-sm font-medium text-gray-600">Note moyenne</p>
                                        <p className="text-2xl font-bold text-gray-900">{data.overview.avg_rating}/5</p>
                                    </div>
                                </div>
                                <div className="mt-4 text-sm text-gray-500">
                                    {data.overview.satisfaction_rate}% de satisfaction
                                </div>
                            </div>
                        </div>

                        {/* Graphiques amCharts */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des demandes (7 jours)</h3>
                                <AmChartsLine
                                    data={data.requests.daily_evolution.map(item => item.count)}
                                    categoryField="date"
                                    valueField="count"
                                    title="Évolution des demandes"
                                    color="#3B82F6"
                                    height={300}
                                    aria-label="Graphique de l'évolution des demandes"
                                />
                                {data.requests.daily_evolution.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm mt-2">Aucune donnée à afficher</div>
                                )}
                            </div>
                            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300">
                                <h3 className="text-lg font-semibold text-gray-900 mb-6">Répartition par spécialité</h3>
                                
                                {data.specialties.stats.length === 0 ? (
                                    <div className="text-center text-gray-400 text-sm py-12">Aucune donnée à afficher</div>
                                ) : (
                                    <div className="space-y-6">
                                        {/* Graphique circulaire */}
                                        <div className="flex justify-center">
                                            <div className="w-64 h-64">
                                <AmChartsPie
                                    data={data.specialties.stats.map(item => ({ specialty: item.specialty_needed, value: item.count }))}
                                    categoryField="specialty"
                                    valueField="value"
                                                    title=""
                                                    colors={["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"]}
                                                    height={256}
                                    aria-label="Graphique de répartition par spécialité"
                                />
                                            </div>
                                        </div>
                                        
                                        {/* Légende détaillée */}
                                        <div className="border-t pt-6">
                                            <h4 className="text-sm font-medium text-gray-700 mb-4">Détail par spécialité</h4>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                {data.specialties.stats.map((item, index) => {
                                                    const total = data.specialties.stats.reduce((sum, stat) => sum + stat.count, 0);
                                                    const percentage = total > 0 ? ((item.count / total) * 100).toFixed(1) : '0';
                                                    const colors = ["#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899", "#06B6D4", "#84CC16"];
                                                    
                                                    return (
                                                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center space-x-3">
                                                                <div 
                                                                    className="w-4 h-4 rounded-full" 
                                                                    style={{ backgroundColor: colors[index % colors.length] }}
                                                                ></div>
                                                                <div>
                                                                    <p className="text-sm font-medium text-gray-900">{item.specialty_needed}</p>
                                                                    <p className="text-xs text-gray-500">{item.count} demandes</p>
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className="text-sm font-semibold text-gray-900">{percentage}%</p>
                                                                <p className="text-xs text-gray-500">
                                                                    {item.avg_price ? `${item.avg_price.toLocaleString('fr-FR')} FCFA` : 'N/A'}
                                                                </p>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                        
                                        {/* Statistiques résumées */}
                                        <div className="border-t pt-6">
                                            <div className="grid grid-cols-3 gap-4 text-center">
                                                <div>
                                                    <p className="text-2xl font-bold text-blue-600">
                                                        {data.specialties.stats.reduce((sum, stat) => sum + stat.count, 0)}
                                                    </p>
                                                    <p className="text-xs text-gray-500">Total demandes</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-green-600">
                                                        {data.specialties.stats.length}
                                                    </p>
                                                    <p className="text-xs text-gray-500">Spécialités</p>
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold text-purple-600">
                                                        {data.specialties.stats.length > 0 
                                                            ? (data.specialties.stats.reduce((sum, stat) => sum + stat.avg_price, 0) / data.specialties.stats.length).toFixed(0)
                                                            : '0'
                                                        }
                                                    </p>
                                                    <p className="text-xs text-gray-500">Prix moyen</p>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                        {/* Top villes par activité */}
                        <div className="mt-8">
                            <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300 max-w-2xl mx-auto">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Top villes par activité</h3>
                                <AmChartsBar
                                    data={data.geography.top_cities.map(item => ({ city: item.city, demandes: item.count }))}
                                    categoryField="city"
                                    valueField="demandes"
                                    title="Top villes"
                                    color="#10B981"
                                    height={350}
                                    aria-label="Graphique des villes les plus actives"
                                />
                                {data.geography.top_cities.length === 0 && (
                                    <div className="text-center text-gray-400 text-sm mt-2">Aucune donnée à afficher</div>
                                )}
                            </div>
                        </div>
                        {/* Évolution des revenus (7 jours) */}
                        {data.financial && data.requests && data.requests.daily_evolution && (
                            <div className="mt-8">
                                <div className="bg-white rounded-lg shadow p-6 hover:shadow-lg transition-shadow duration-300 max-w-2xl mx-auto">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Évolution des revenus (7 jours)</h3>
                                    <AmChartsLine
                                        data={data.requests.daily_evolution.map(item => ({ date: item.date, revenus: 0 }))}
                                        categoryField="date"
                                        valueField="revenus"
                                        title="Revenus quotidiens"
                                        color="#F59E0B"
                                        height={300}
                                    />
                                    {data.requests.daily_evolution.length === 0 && (
                                        <div className="text-center text-gray-400 text-sm mt-2">Aucune donnée à afficher</div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Autres onglets simplifiés */}
                {activeTab === 'requests' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques des demandes</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-2xl font-bold text-yellow-600">{data.requests.pending}</p>
                                <p className="text-sm text-gray-600">En attente</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-blue-600">{data.requests.in_progress}</p>
                                <p className="text-sm text-gray-600">En cours</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-green-600">{data.requests.completed}</p>
                                <p className="text-sm text-gray-600">Terminées</p>
                            </div>
                            <div className="text-center">
                                <p className="text-2xl font-bold text-red-600">{data.requests.cancelled}</p>
                                <p className="text-sm text-gray-600">Annulées</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'financial' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques financières</h2>
                        <div className="flex flex-wrap gap-4 mb-4">
                            <label htmlFor="financialPeriod" className="sr-only">Période</label>
                            <select value={financialPeriod} onChange={e => setFinancialPeriod(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                                <option value="all">Tout</option>
                                <option value="7d">7 derniers jours</option>
                                <option value="30d">30 derniers jours</option>
                            </select>
                            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                <option value="all">Toutes méthodes</option>
                                {data.financial.payment_methods?.map((m, i) => <option key={i} value={m.method}>{m.method}</option>)}
                            </select>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">
                                    {data.financial.total_revenue.toLocaleString('fr-FR')} FCFA
                                </p>
                                <p className="text-sm text-gray-600">Revenus totaux</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-600">
                                    {data.financial.total_payouts.toLocaleString('fr-FR')} FCFA
                                </p>
                                <p className="text-sm text-gray-600">Paiements techniciens</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-purple-600">
                                    {data.financial.platform_fees.toLocaleString('fr-FR')} FCFA
                                </p>
                                <p className="text-sm text-gray-600">Frais plateforme</p>
                            </div>
                        </div>
                        {/* Liste détaillée des paiements */}
                        <h3 className="text-lg font-semibold mb-2">Détail des paiements</h3>
                        {filteredPayments.length === 0 && (
                            <div className="text-gray-400 text-sm">Aucun paiement trouvé.</div>
                        )}
                    </div>
                )}

                {activeTab === 'technicians' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques des techniciens</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-600">{data.technicians.total}</p>
                                <p className="text-sm text-gray-600">Total</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">{data.technicians.verified}</p>
                                <p className="text-sm text-gray-600">Vérifiés</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-yellow-600">{data.technicians.available}</p>
                                <p className="text-sm text-gray-600">Disponibles</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-purple-600">{data.technicians.availability_rate}%</p>
                                <p className="text-sm text-gray-600">Taux disponibilité</p>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'security' && (
                    <div className="bg-white rounded-lg shadow p-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques de sécurité</h2>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-green-600">{data.security.total_logins}</p>
                                <p className="text-sm text-gray-600">Connexions réussies</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-red-600">{data.security.failed_logins}</p>
                                <p className="text-sm text-gray-600">Échecs connexion</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-orange-600">{data.security.security_alerts}</p>
                                <p className="text-sm text-gray-600">Alertes sécurité</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-blue-600">{data.security.success_rate}%</p>
                                <p className="text-sm text-gray-600">Taux succès</p>
                            </div>
                        </div>
                    </div>
                )}

                {/* Onglet satisfaction/avis détaillé si disponible */}
                {(data as any)?.satisfaction?.reviews && (
                    activeTab === 'overview' || activeTab === 'satisfaction') && (
                        <div className="bg-white rounded-lg shadow p-6 mt-8">
                            <h2 className="text-xl font-semibold text-gray-900 mb-4">Avis et satisfaction</h2>
                            <div className="flex flex-wrap gap-4 mb-4">
                                <select value={reviewPeriod} onChange={e => setReviewPeriod(e.target.value as any)} className="border rounded px-2 py-1 text-sm">
                                    <option value="all">Tout</option>
                                    <option value="7d">7 derniers jours</option>
                                    <option value="30d">30 derniers jours</option>
                                </select>
                                <select value={reviewMinRating} onChange={e => setReviewMinRating(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                                    <option value={1}>Note ≥ 1</option>
                                    <option value={2}>Note ≥ 2</option>
                                    <option value={3}>Note ≥ 3</option>
                                    <option value={4}>Note ≥ 4</option>
                                    <option value={5}>Note = 5</option>
                                </select>
                            </div>
                            {filteredReviews.length === 0 && (
                                <div className="text-gray-400 text-sm">Aucun avis trouvé.</div>
                            )}
                            {/* Modal pour commentaire complet */}
                            {showFullComment && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative">
                                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => setShowFullComment(null)}>
                                            <Star className="h-5 w-5" />
                                        </button>
                                        <h2 className="text-xl font-bold mb-4">Commentaire complet</h2>
                                        <div className="text-gray-800 whitespace-pre-line">{showFullComment}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
            </div>
        </div>
    );
};

export default Statistics;
            