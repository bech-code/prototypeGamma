import React, { useState, useEffect } from 'react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { Save, Settings, AlertTriangle, CheckCircle, Info } from 'lucide-react';
import ErrorToast from '../components/ErrorToast';

interface PlatformConfig {
    site_name: string;
    site_description: string;
    contact_email: string;
    contact_phone: string;
    max_technicians_per_request: number;
    request_timeout_hours: number;
    auto_assign_enabled: boolean;
    notification_enabled: boolean;
    maintenance_mode: boolean;
    geolocation_radius_km: number;
    max_requests_per_day: number;
    technician_verification_required: boolean;
    client_verification_required: boolean;
    emergency_contact: string;
    support_hours: string;
    terms_of_service_url: string;
    privacy_policy_url: string;
    help_center_url: string;
    social_media_links: string[];
    feature_flags: {
        chat_enabled: boolean;
        video_call_enabled: boolean;
        file_sharing_enabled: boolean;
        rating_system_enabled: boolean;
        rewards_system_enabled: boolean;
        analytics_enabled: boolean;
    };
}

const AdminConfiguration: React.FC = () => {
    const [config, setConfig] = useState<PlatformConfig>({
        site_name: '',
        site_description: '',
        contact_email: '',
        contact_phone: '',
        max_technicians_per_request: 5,
        request_timeout_hours: 24,
        auto_assign_enabled: true,
        notification_enabled: true,
        maintenance_mode: false,
        geolocation_radius_km: 10,
        max_requests_per_day: 50,
        technician_verification_required: true,
        client_verification_required: false,
        emergency_contact: '',
        support_hours: '',
        terms_of_service_url: '',
        privacy_policy_url: '',
        help_center_url: '',
        social_media_links: [],
        feature_flags: {
            chat_enabled: true,
            video_call_enabled: false,
            file_sharing_enabled: true,
            rating_system_enabled: true,
            rewards_system_enabled: true,
            analytics_enabled: true,
        },
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);

    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    useEffect(() => {
        loadConfiguration();
    }, []);

    const loadConfiguration = async () => {
        try {
            setLoading(true);
            setError(null);
            const response = await fetchWithAuth('/depannage/api/admin/configuration/');
            if (response.ok) {
                const data = await response.json();
                setConfig(data);
                showToast('success', 'Configuration chargée avec succès');
            } else {
                let backendMsg = '';
                try {
                    const errData = await response.json();
                    backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                } catch { }
                setError(`Erreur lors du chargement de la configuration (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
                showToast('error', `Erreur lors du chargement de la configuration (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
            }
        } catch (err) {
            setError('Erreur de connexion lors du chargement de la configuration');
            showToast('error', 'Erreur de connexion lors du chargement de la configuration');
        } finally {
            setLoading(false);
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
            social_media_links: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean)
        }));
    };

    const handleFeatureFlagChange = (feature: string, value: boolean) => {
        setConfig((prev: PlatformConfig) => ({
            ...prev,
            feature_flags: {
                ...prev.feature_flags,
                [feature]: value
            }
        }));
    };

    const handleSave = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const response = await fetchWithAuth('/depannage/api/admin/configuration/', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(config),
            });

            if (response.ok) {
                setSuccess('Configuration sauvegardée avec succès');
                showToast('success', 'Configuration sauvegardée avec succès');
            } else {
                let backendMsg = '';
                try {
                    const errData = await response.json();
                    backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                } catch { }
                setError(`Erreur lors de la sauvegarde (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
                showToast('error', `Erreur lors de la sauvegarde (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
            }
        } catch (err) {
            setError('Erreur de connexion lors de la sauvegarde');
            showToast('error', 'Erreur de connexion lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement de la configuration...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Toast notifications */}
                {toast && (
                    <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
                        {toast.type === 'success' ? (
                            <CheckCircle className="h-5 w-5 mr-2" />
                        ) : toast.type === 'error' ? (
                            <AlertTriangle className="h-5 w-5 mr-2" />
                        ) : (
                            <Info className="h-5 w-5 mr-2" />
                        )}
                        {toast.message}
                    </div>
                )}

                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Configuration de la Plateforme</h1>
                            <p className="text-gray-600 mt-2">
                                Gérez les paramètres généraux et les fonctionnalités de la plateforme
                            </p>
                        </div>
                        <div className="flex items-center">
                            <Settings className="h-8 w-8 text-blue-600" />
                        </div>
                    </div>
                </div>

                {/* Informations générales */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Informations Générales</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nom du site</label>
                            <input
                                type="text"
                                name="site_name"
                                value={config.site_name}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                            <input
                                type="text"
                                name="site_description"
                                value={config.site_description}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Email de contact</label>
                            <input
                                type="email"
                                name="contact_email"
                                value={config.contact_email}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Téléphone de contact</label>
                            <input
                                type="text"
                                name="contact_phone"
                                value={config.contact_phone}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Paramètres de fonctionnement */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Paramètres de Fonctionnement</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Nombre max de techniciens par demande</label>
                            <input
                                type="number"
                                name="max_technicians_per_request"
                                value={config.max_technicians_per_request}
                                onChange={handleChange}
                                min="1"
                                max="20"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Timeout des demandes (heures)</label>
                            <input
                                type="number"
                                name="request_timeout_hours"
                                value={config.request_timeout_hours}
                                onChange={handleChange}
                                min="1"
                                max="168"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Rayon de géolocalisation (km)</label>
                            <input
                                type="number"
                                name="geolocation_radius_km"
                                value={config.geolocation_radius_km}
                                onChange={handleChange}
                                min="1"
                                max="100"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Demandes max par jour</label>
                            <input
                                type="number"
                                name="max_requests_per_day"
                                value={config.max_requests_per_day}
                                onChange={handleChange}
                                min="1"
                                max="1000"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Options */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Options</h2>
                    <div className="space-y-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="auto_assign_enabled"
                                checked={config.auto_assign_enabled}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                                Attribution automatique des demandes
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="notification_enabled"
                                checked={config.notification_enabled}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                                Notifications activées
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="maintenance_mode"
                                checked={config.maintenance_mode}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                                Mode maintenance
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="technician_verification_required"
                                checked={config.technician_verification_required}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                                Vérification obligatoire pour les techniciens
                            </label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                name="client_verification_required"
                                checked={config.client_verification_required}
                                onChange={handleChange}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">
                                Vérification obligatoire pour les clients
                            </label>
                        </div>
                    </div>
                </div>

                {/* Fonctionnalités */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Fonctionnalités</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.feature_flags.chat_enabled}
                                onChange={(e) => handleFeatureFlagChange('chat_enabled', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">Chat en temps réel</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.feature_flags.video_call_enabled}
                                onChange={(e) => handleFeatureFlagChange('video_call_enabled', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">Appels vidéo</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.feature_flags.file_sharing_enabled}
                                onChange={(e) => handleFeatureFlagChange('file_sharing_enabled', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">Partage de fichiers</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.feature_flags.rating_system_enabled}
                                onChange={(e) => handleFeatureFlagChange('rating_system_enabled', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">Système de notation</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.feature_flags.rewards_system_enabled}
                                onChange={(e) => handleFeatureFlagChange('rewards_system_enabled', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">Système de récompenses</label>
                        </div>
                        <div className="flex items-center">
                            <input
                                type="checkbox"
                                checked={config.feature_flags.analytics_enabled}
                                onChange={(e) => handleFeatureFlagChange('analytics_enabled', e.target.checked)}
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label className="ml-2 block text-sm text-gray-900">Analytics</label>
                        </div>
                    </div>
                </div>

                {/* Liens et contacts */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-xl font-semibold text-gray-900 mb-4">Liens et Contacts</h2>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact d'urgence</label>
                            <input
                                type="text"
                                name="emergency_contact"
                                value={config.emergency_contact}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Heures de support</label>
                            <input
                                type="text"
                                name="support_hours"
                                value={config.support_hours}
                                onChange={handleChange}
                                placeholder="ex: 8h-18h, Lundi-Vendredi"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">URL Conditions d'utilisation</label>
                            <input
                                type="url"
                                name="terms_of_service_url"
                                value={config.terms_of_service_url}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">URL Politique de confidentialité</label>
                            <input
                                type="url"
                                name="privacy_policy_url"
                                value={config.privacy_policy_url}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">URL Centre d'aide</label>
                            <input
                                type="url"
                                name="help_center_url"
                                value={config.help_center_url}
                                onChange={handleChange}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Liens réseaux sociaux (séparés par des virgules)</label>
                            <input
                                type="text"
                                value={config.social_media_links.join(', ')}
                                onChange={handleArrayChange}
                                placeholder="ex: https://facebook.com/page, https://twitter.com/page"
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>

                {/* Bouton de sauvegarde */}
                <div className="bg-white rounded-lg shadow-sm p-6">
                    <div className="flex justify-end">
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="flex items-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {saving ? (
                                <div className="animate-spin rounded-full h-5 w-5 border-b border-white mr-2"></div>
                            ) : (
                                <Save className="h-5 w-5 mr-2" />
                            )}
                            {saving ? 'Sauvegarde...' : 'Sauvegarder la configuration'}
                        </button>
                    </div>
                </div>

                {/* Messages d'erreur et de succès */}
                {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}
                {success && (
                    <div className="fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50">
                        <div className="flex items-center">
                            <CheckCircle className="h-5 w-5 mr-2" />
                            {success}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminConfiguration; 