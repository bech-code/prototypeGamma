import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { useNavigate } from 'react-router-dom';
import { Settings, Save, RotateCcw, AlertTriangle, CheckCircle, X, RefreshCw, Eye, EyeOff, Shield, Globe, CreditCard, MapPin, Palette, Clock, Users, Wrench } from 'lucide-react';
import ApexCharts from 'apexcharts';
import ErrorToast from '../components/ErrorToast';

interface PlatformConfig {
    platform_name: string;
    support_email: string;
    default_language: string;
    timezone: string;
    payment_methods: string[];
    commission_rate: number;
    min_payout_amount: number;
    max_interventions_per_day: number;
    service_radius_km: number;
    cancelation_deadline_hours: number;
    enable_geolocation_map: boolean;
    default_map_provider: string;
    theme_color: string;
    enable_2fa_admin: boolean;
    maintenance_mode: boolean;
    auto_backup_enabled: boolean;
    email_notifications_enabled: boolean;
    sms_notifications_enabled: boolean;
    max_file_size_mb: number;
    session_timeout_minutes: number;
}

const defaultConfig: PlatformConfig = {
    platform_name: 'DepanneTeliman',
    support_email: 'support@depanneteliman.com',
    default_language: 'fr',
    timezone: 'Africa/Abidjan',
    payment_methods: ['CinetPay', 'Mobile Money', 'Virement Bancaire'],
    commission_rate: 10.0,
    min_payout_amount: 1000.0,
    max_interventions_per_day: 10,
    service_radius_km: 20.0,
    cancelation_deadline_hours: 2,
    enable_geolocation_map: true,
    default_map_provider: 'OpenStreetMap',
    theme_color: '#2563eb',
    enable_2fa_admin: false,
    maintenance_mode: false,
    auto_backup_enabled: true,
    email_notifications_enabled: true,
    sms_notifications_enabled: true,
    max_file_size_mb: 10,
    session_timeout_minutes: 60,
};

const AdminConfiguration: React.FC = () => {
    const context = useContext(AuthContext);
    const { user } = context || {};
    const navigate = useNavigate();
    const [config, setConfig] = useState<PlatformConfig>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [showChart, setShowChart] = useState(false);
    const [paymentsStats, setPaymentsStats] = useState<any>(null);
    const [showAdvanced, setShowAdvanced] = useState(false);
    const [originalConfig, setOriginalConfig] = useState<PlatformConfig | null>(null);
    const [error, setError] = useState<string | null>(null);

    // Fonction pour afficher les toasts
    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    useEffect(() => {
        if (!user || !('user_type' in user) || user?.user_type !== 'admin') {
            navigate('/', { state: { error: "Accès réservé à l'administrateur." } });
            return;
        }
        loadConfiguration();
        loadPaymentStats();
    }, [user, navigate]);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/api/configuration/');
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
                setOriginalConfig(data);
                showToast('success', 'Configuration chargée avec succès');
            } else {
                let backendMsg = '';
                try {
                    const errData = await response.json();
                    backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                } catch { }
                showToast('error', `Erreur lors du chargement de la configuration (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
            }
        } catch (error) {
            showToast('error', 'Erreur de connexion lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const loadPaymentStats = async () => {
        try {
            const response = await fetchWithAuth('/api/payments/stats/');
            if (response.ok) {
                const data = await response.json();
                setPaymentsStats(data);
                setShowChart(true);
            } else {
                let backendMsg = '';
                try {
                    const errData = await response.json();
                    backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                } catch { }
                showToast('error', `Erreur lors du chargement des statistiques de paiement (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques de paiement:', error);
            showToast('error', 'Erreur lors du chargement des statistiques de paiement.');
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const checked = (e.target as HTMLInputElement).checked;

        setConfig((prev: PlatformConfig) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked :
                type === 'number' ? parseFloat(value) || 0 : value,
        }));
    };

    const handleArrayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setConfig((prev: PlatformConfig) => ({
            ...prev,
            payment_methods: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
        }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const response = await fetchWithAuth('/api/configuration/1/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });

            if (response.ok) {
                setOriginalConfig(config);
                showToast('success', 'Configuration enregistrée avec succès');
            } else {
                const errorData = await response.json();
                showToast('error', errorData.message || 'Erreur lors de la sauvegarde');
            }
        } catch (error) {
            showToast('error', 'Erreur de connexion lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleRestore = () => {
        if (originalConfig) {
            setConfig(originalConfig);
            showToast('info', 'Configuration restaurée');
        } else {
            setConfig(defaultConfig);
            showToast('info', 'Configuration restaurée aux valeurs par défaut');
        }
    };

    const handleResetToDefaults = () => {
        if (window.confirm('Êtes-vous sûr de vouloir restaurer toutes les valeurs par défaut ? Cette action est irréversible.')) {
            setConfig(defaultConfig);
            showToast('info', 'Configuration restaurée aux valeurs par défaut');
        }
    };

    const hasChanges = () => {
        if (!originalConfig) return false;
        return JSON.stringify(config) !== JSON.stringify(originalConfig);
    };

    useEffect(() => {
        if (showChart && paymentsStats) {
            const chart = new ApexCharts(document.querySelector('#paymentsChart'), {
                chart: {
                    type: 'bar',
                    height: 250,
                    toolbar: { show: false }
                },
                series: [{
                    name: 'Montant (FCFA)',
                    data: paymentsStats.amounts
                }],
                xaxis: {
                    categories: paymentsStats.labels,
                    labels: { style: { fontSize: '12px' } }
                },
                yaxis: {
                    labels: {
                        formatter: (value: number) => `${value.toLocaleString()} FCFA`
                    }
                },
                colors: ['#2563eb'],
                plotOptions: {
                    bar: {
                        borderRadius: 4,
                        dataLabels: {
                            position: 'top',
                        },
                    }
                },
                dataLabels: {
                    enabled: true,
                    formatter: (value: number) => `${value.toLocaleString()} FCFA`,
                    style: {
                        fontSize: '12px',
                        colors: ['#fff']
                    }
                },
            });
            chart.render();
            return () => chart.destroy();
        }
    }, [showChart, paymentsStats]);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement de la configuration...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Toast notifications */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center ${toast.type === 'success' ? 'bg-green-500 text-white' :
                    toast.type === 'error' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 mr-2" />
                    ) : toast.type === 'error' ? (
                        <AlertTriangle className="h-5 w-5 mr-2" />
                    ) : (
                        <Settings className="h-5 w-5 mr-2" />
                    )}
                    {toast.message}
                    <button
                        onClick={() => setToast(null)}
                        className="ml-4 hover:opacity-75"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}
            {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}

            <div className="max-w-6xl mx-auto py-8 px-4">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Configuration de la Plateforme</h1>
                            <p className="text-gray-600 mt-2">
                                Gérez les paramètres système, les paiements et les préférences de la plateforme
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={loadConfiguration}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Actualiser
                            </button>
                            <button
                                onClick={() => setShowAdvanced(!showAdvanced)}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                {showAdvanced ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                                {showAdvanced ? 'Masquer avancé' : 'Options avancées'}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Résumé actuel */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
                        <Settings className="h-5 w-5 mr-2" />
                        Résumé de la Configuration
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Globe className="h-5 w-5 text-blue-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{config.platform_name}</p>
                                <p className="text-xs text-gray-500">Nom de la plateforme</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <CreditCard className="h-5 w-5 text-green-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{config.commission_rate}%</p>
                                <p className="text-xs text-gray-500">Taux de commission</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <MapPin className="h-5 w-5 text-purple-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{config.service_radius_km} km</p>
                                <p className="text-xs text-gray-500">Rayon de service</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Wrench className="h-5 w-5 text-orange-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{config.max_interventions_per_day}</p>
                                <p className="text-xs text-gray-500">Max interventions/jour</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Clock className="h-5 w-5 text-red-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{config.cancelation_deadline_hours}h</p>
                                <p className="text-xs text-gray-500">Délai d'annulation</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                            <Shield className="h-5 w-5 text-indigo-600" />
                            <div>
                                <p className="text-sm font-medium text-gray-900">{config.enable_2fa_admin ? 'Activé' : 'Désactivé'}</p>
                                <p className="text-xs text-gray-500">2FA Admin</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Formulaire de configuration */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-6">Paramètres de Configuration</h2>

                    <form className="space-y-6">
                        {/* Informations générales */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Informations Générales</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Nom de la plateforme</label>
                                    <input
                                        name="platform_name"
                                        value={config.platform_name}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Email de support</label>
                                    <input
                                        name="support_email"
                                        value={config.support_email}
                                        onChange={handleChange}
                                        type="email"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Langue par défaut</label>
                                    <select
                                        name="default_language"
                                        value={config.default_language}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    >
                                        <option value="fr">Français</option>
                                        <option value="en">English</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fuseau horaire</label>
                                    <input
                                        name="timezone"
                                        value={config.timezone}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Paramètres de paiement */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres de Paiement</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Méthodes de paiement (séparées par virgule)</label>
                                    <input
                                        name="payment_methods"
                                        value={config.payment_methods?.join(', ')}
                                        onChange={handleArrayChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Taux de commission (%)</label>
                                    <input
                                        name="commission_rate"
                                        value={config.commission_rate}
                                        onChange={handleChange}
                                        type="number"
                                        min="0"
                                        max="100"
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Montant minimum de virement (FCFA)</label>
                                    <input
                                        name="min_payout_amount"
                                        value={config.min_payout_amount}
                                        onChange={handleChange}
                                        type="number"
                                        min="0"
                                        step="0.01"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Paramètres de service */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres de Service</h3>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Maximum d'interventions par jour</label>
                                    <input
                                        name="max_interventions_per_day"
                                        value={config.max_interventions_per_day}
                                        onChange={handleChange}
                                        type="number"
                                        min="1"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Rayon de service (km)</label>
                                    <input
                                        name="service_radius_km"
                                        value={config.service_radius_km}
                                        onChange={handleChange}
                                        type="number"
                                        min="0"
                                        step="0.1"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Délai d'annulation (heures)</label>
                                    <input
                                        name="cancelation_deadline_hours"
                                        value={config.cancelation_deadline_hours}
                                        onChange={handleChange}
                                        type="number"
                                        min="0"
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Paramètres d'interface */}
                        <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-4">Paramètres d'Interface</h3>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="flex items-center space-x-3">
                                    <input
                                        name="enable_geolocation_map"
                                        type="checkbox"
                                        checked={config.enable_geolocation_map}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="text-sm font-medium text-gray-700">Carte de géolocalisation active</label>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Fournisseur de carte</label>
                                    <input
                                        name="default_map_provider"
                                        value={config.default_map_provider}
                                        onChange={handleChange}
                                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Couleur du thème</label>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            name="theme_color"
                                            value={config.theme_color}
                                            onChange={handleChange}
                                            type="color"
                                            className="h-10 w-16 border border-gray-300 rounded-md"
                                        />
                                        <span className="text-sm text-gray-500">{config.theme_color}</span>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-3">
                                    <input
                                        name="enable_2fa_admin"
                                        type="checkbox"
                                        checked={config.enable_2fa_admin}
                                        onChange={handleChange}
                                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                    <label className="text-sm font-medium text-gray-700">Authentification à deux facteurs pour admin</label>
                                </div>
                            </div>
                        </div>

                        {/* Options avancées */}
                        {showAdvanced && (
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 mb-4">Options Avancées</h3>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="flex items-center space-x-3">
                                        <input
                                            name="maintenance_mode"
                                            type="checkbox"
                                            checked={config.maintenance_mode}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label className="text-sm font-medium text-gray-700">Mode maintenance</label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            name="auto_backup_enabled"
                                            type="checkbox"
                                            checked={config.auto_backup_enabled}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label className="text-sm font-medium text-gray-700">Sauvegarde automatique</label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            name="email_notifications_enabled"
                                            type="checkbox"
                                            checked={config.email_notifications_enabled}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label className="text-sm font-medium text-gray-700">Notifications par email</label>
                                    </div>
                                    <div className="flex items-center space-x-3">
                                        <input
                                            name="sms_notifications_enabled"
                                            type="checkbox"
                                            checked={config.sms_notifications_enabled}
                                            onChange={handleChange}
                                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                        />
                                        <label className="text-sm font-medium text-gray-700">Notifications par SMS</label>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Taille maximale des fichiers (MB)</label>
                                        <input
                                            name="max_file_size_mb"
                                            value={config.max_file_size_mb}
                                            onChange={handleChange}
                                            type="number"
                                            min="1"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Timeout de session (minutes)</label>
                                        <input
                                            name="session_timeout_minutes"
                                            value={config.session_timeout_minutes}
                                            onChange={handleChange}
                                            type="number"
                                            min="5"
                                            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-4 pt-6 border-t border-gray-200">
                            <button
                                type="button"
                                className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                                onClick={handleSave}
                                disabled={saving || !hasChanges()}
                            >
                                {saving ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                                ) : (
                                    <Save className="h-4 w-4 mr-2" />
                                )}
                                {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
                            </button>
                            <button
                                type="button"
                                className="flex items-center px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300 transition-colors"
                                onClick={handleRestore}
                                disabled={!originalConfig}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Restaurer
                            </button>
                            <button
                                type="button"
                                className="flex items-center px-6 py-3 bg-red-100 text-red-700 rounded-lg font-semibold hover:bg-red-200 transition-colors"
                                onClick={handleResetToDefaults}
                            >
                                <RotateCcw className="h-4 w-4 mr-2" />
                                Valeurs par défaut
                            </button>
                        </div>

                        {hasChanges() && (
                            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                                <div className="flex items-center">
                                    <AlertTriangle className="h-5 w-5 text-yellow-600 mr-2" />
                                    <span className="text-sm text-yellow-800">
                                        Des modifications non sauvegardées sont présentes
                                    </span>
                                </div>
                            </div>
                        )}
                    </form>
                </div>

                {/* Graphique des paiements */}
                {showChart && (
                    <div className="bg-white rounded-lg shadow-sm p-6 mt-6">
                        <h2 className="text-xl font-semibold text-gray-900 mb-4">Statistiques des Paiements</h2>
                        <div id="paymentsChart" className="w-full"></div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminConfiguration; 