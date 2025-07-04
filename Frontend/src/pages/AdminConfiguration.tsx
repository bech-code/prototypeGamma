import React, { useEffect, useState, useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import ApexCharts from 'apexcharts';

const defaultConfig = {
    platform_name: '',
    support_email: '',
    default_language: 'fr',
    timezone: '',
    payment_methods: [],
    commission_rate: 10.0,
    min_payout_amount: 1000.0,
    max_interventions_per_day: 10,
    service_radius_km: 20.0,
    cancelation_deadline_hours: 2,
    enable_geolocation_map: true,
    default_map_provider: 'OpenStreetMap',
    theme_color: '#2563eb',
    enable_2fa_admin: false,
};

const AdminConfiguration: React.FC = () => {
    const context = useContext(AuthContext);
    const { user, token } = context || {};
    const navigate = useNavigate();
    const [config, setConfig] = useState<any>(defaultConfig);
    const [loading, setLoading] = useState(true);
    const [success, setSuccess] = useState('');
    const [error, setError] = useState('');
    const [showChart, setShowChart] = useState(false);
    const [paymentsStats, setPaymentsStats] = useState<any>(null);

    useEffect(() => {
        if (!user || !('user_type' in user) || user.user_type !== 'admin') {
            navigate('/', { state: { error: "Accès réservé à l'administrateur." } });
            return;
        }
        fetch('/api/configuration/', {
            headers: { Authorization: token ? `Bearer ${token}` : '' },
            credentials: 'include',
        })
            .then(r => r.json())
            .then(data => {
                setConfig(data);
                setLoading(false);
            })
            .catch(() => {
                setError('Erreur de chargement de la configuration.');
                setLoading(false);
            });
        // Bonus: fetch stats paiements
        fetch('/api/payments/stats/', {
            headers: { Authorization: token ? `Bearer ${token}` : '' },
            credentials: 'include',
        })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (data) {
                    setPaymentsStats(data);
                    setShowChart(true);
                }
            });
    }, [user, token, navigate]);

    const handleChange = (e: any) => {
        const { name, value, type, checked } = e.target;
        setConfig((prev: any) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    const handleArrayChange = (e: any) => {
        setConfig((prev: any) => ({ ...prev, payment_methods: e.target.value.split(',').map((s: string) => s.trim()) }));
    };
    const handleSave = async () => {
        setSuccess(''); setError('');
        const res = await fetch('/api/configuration/1/', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                Authorization: token ? `Bearer ${token}` : '',
            },
            credentials: 'include',
            body: JSON.stringify(config),
        });
        if (res.ok) setSuccess('Configuration enregistrée !');
        else setError('Erreur lors de la sauvegarde.');
    };
    const handleRestore = () => setConfig(defaultConfig);

    useEffect(() => {
        if (showChart && paymentsStats) {
            const chart = new ApexCharts(document.querySelector('#paymentsChart'), {
                chart: { type: 'bar', height: 250 },
                series: [{ name: 'Montant', data: paymentsStats.amounts }],
                xaxis: { categories: paymentsStats.labels },
            });
            chart.render();
            return () => chart.destroy();
        }
    }, [showChart, paymentsStats]);

    if (loading) return <div>Chargement...</div>;

    return (
        <div className="max-w-3xl mx-auto py-8 px-4">
            <h1 className="text-2xl font-bold mb-6">Configuration Plateforme</h1>
            {/* Résumé statique */}
            <div className="mb-6 p-4 bg-gray-50 rounded shadow">
                <div className="font-semibold">Résumé actuel :</div>
                <ul className="text-sm mt-2 grid grid-cols-2 gap-2">
                    <li>Nom : {config.platform_name}</li>
                    <li>Email support : {config.support_email}</li>
                    <li>Langue : {config.default_language}</li>
                    <li>Fuseau horaire : {config.timezone}</li>
                    <li>Méthodes paiement : {config.payment_methods?.join(', ')}</li>
                    <li>Taux commission : {config.commission_rate}%</li>
                    <li>Min. virement : {config.min_payout_amount} F</li>
                    <li>Max interventions/jour : {config.max_interventions_per_day}</li>
                    <li>Rayon service : {config.service_radius_km} km</li>
                    <li>Délai annulation : {config.cancelation_deadline_hours}h</li>
                    <li>Carte active : {config.enable_geolocation_map ? 'Oui' : 'Non'}</li>
                    <li>Map provider : {config.default_map_provider}</li>
                    <li>Couleur thème : <span style={{ color: config.theme_color }}>{config.theme_color}</span></li>
                    <li>2FA admin : {config.enable_2fa_admin ? 'Oui' : 'Non'}</li>
                </ul>
            </div>
            {/* Formulaire édition */}
            <form className="space-y-4 bg-white p-6 rounded shadow">
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium">Nom plateforme</label>
                        <input name="platform_name" value={config.platform_name} onChange={handleChange} className="w-full border rounded px-2 py-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Email support</label>
                        <input name="support_email" value={config.support_email} onChange={handleChange} className="w-full border rounded px-2 py-1" type="email" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Langue par défaut</label>
                        <select name="default_language" value={config.default_language} onChange={handleChange} className="w-full border rounded px-2 py-1">
                            <option value="fr">Français</option>
                            <option value="en">English</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Fuseau horaire</label>
                        <input name="timezone" value={config.timezone} onChange={handleChange} className="w-full border rounded px-2 py-1" />
                    </div>
                    <div className="col-span-2">
                        <label className="block text-sm font-medium">Méthodes de paiement (séparées par virgule)</label>
                        <input name="payment_methods" value={config.payment_methods?.join(', ')} onChange={handleArrayChange} className="w-full border rounded px-2 py-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Taux de commission (%)</label>
                        <input name="commission_rate" value={config.commission_rate} onChange={handleChange} className="w-full border rounded px-2 py-1" type="number" min="0" max="100" step="0.01" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Montant min. virement</label>
                        <input name="min_payout_amount" value={config.min_payout_amount} onChange={handleChange} className="w-full border rounded px-2 py-1" type="number" min="0" step="0.01" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Max interventions/jour</label>
                        <input name="max_interventions_per_day" value={config.max_interventions_per_day} onChange={handleChange} className="w-full border rounded px-2 py-1" type="number" min="1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Rayon service (km)</label>
                        <input name="service_radius_km" value={config.service_radius_km} onChange={handleChange} className="w-full border rounded px-2 py-1" type="number" min="0" step="0.1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Délai annulation (h)</label>
                        <input name="cancelation_deadline_hours" value={config.cancelation_deadline_hours} onChange={handleChange} className="w-full border rounded px-2 py-1" type="number" min="0" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Carte géolocalisation active</label>
                        <input name="enable_geolocation_map" type="checkbox" checked={config.enable_geolocation_map} onChange={handleChange} className="ml-2" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Fournisseur carte</label>
                        <input name="default_map_provider" value={config.default_map_provider} onChange={handleChange} className="w-full border rounded px-2 py-1" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">Couleur thème</label>
                        <input name="theme_color" value={config.theme_color} onChange={handleChange} className="w-full border rounded px-2 py-1" type="color" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium">2FA admin</label>
                        <input name="enable_2fa_admin" type="checkbox" checked={config.enable_2fa_admin} onChange={handleChange} className="ml-2" />
                    </div>
                </div>
                <div className="flex gap-4 mt-6">
                    <button type="button" className="bg-blue-600 text-white px-4 py-2 rounded font-semibold" onClick={handleSave}>Enregistrer les modifications</button>
                    <button type="button" className="bg-gray-200 px-4 py-2 rounded" onClick={handleRestore}>Restaurer valeurs par défaut</button>
                </div>
                {success && <div className="text-green-600 mt-2">{success}</div>}
                {error && <div className="text-red-600 mt-2">{error}</div>}
            </form>
            {/* Bonus: graphique paiements */}
            {showChart && (
                <div className="mt-8">
                    <h3 className="font-semibold mb-2">Statistiques paiements</h3>
                    <div id="paymentsChart" />
                </div>
            )}
        </div>
    );
};

export default AdminConfiguration; 