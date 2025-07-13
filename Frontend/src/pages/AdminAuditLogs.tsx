import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../contexts/fetchWithAuth";
import { Download, RefreshCw, Filter, AlertTriangle, CheckCircle, X } from "lucide-react";
import ErrorToast from '../components/ErrorToast';

interface AuditLog {
    id: number;
    timestamp: string;
    user_email: string;
    event_type: string;
    status: string;
    ip_address: string;
    geo_city: string;
    geo_country: string;
    metadata: any;
}

// Fonction utilitaire pour normaliser un user partiel en user complet
function normalizeUser(user: any) {
    return {
        id: typeof user?.id === 'number' ? user.id : 0,
        first_name: typeof user?.first_name === 'string' ? user.first_name : '',
        last_name: typeof user?.last_name === 'string' ? user.last_name : '',
        email: typeof user?.email === 'string' ? user.email : '',
        username: typeof user?.username === 'string' ? user.username : '',
    };
}

function AdminAuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [filter, setFilter] = useState({
        event_type: '',
        status: '',
        user_email: '',
        date_from: '',
        date_to: ''
    });
    const [showFilters, setShowFilters] = useState(false);
    const [exporting, setExporting] = useState(false);

    useEffect(() => {
        fetchLogs();
    }, []);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchLogs = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetchWithAuth("/depannage/api/admin/audit-logs/");
            if (response.ok) {
                const data = await response.json();
                setLogs(data);
            } else {
                let backendMsg = '';
                try {
                    const errData = await response.json();
                    backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                } catch { }
                setError(`Erreur lors du chargement des logs d'audit (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
                showToast('error', `Erreur lors du chargement des logs d'audit (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
            }
        } catch (err) {
            setError("Erreur de connexion lors du chargement des logs d'audit.");
            showToast('error', 'Erreur de connexion lors du chargement des logs d\'audit.');
        } finally {
            setLoading(false);
        }
    };

    const exportLogs = async (format: 'csv' | 'excel' = 'csv') => {
        setExporting(true);
        try {
            // Construction de la query string avec les filtres
            const params = new URLSearchParams();
            if (filter.event_type) params.append('event_type', filter.event_type);
            if (filter.status) params.append('status', filter.status);
            if (filter.user_email) params.append('user_email', filter.user_email);
            if (filter.date_from) params.append('start_date', filter.date_from);
            if (filter.date_to) params.append('end_date', filter.date_to);
            params.append('format', format);
            const url = `/depannage/api/admin/audit-logs/export/?${params.toString()}`;
            const response = await fetchWithAuth(url, { method: 'GET' });
            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.${format === 'excel' ? 'xlsx' : 'csv'}`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('success', 'Export des logs réussi');
            } else {
                showToast('error', 'Erreur lors de l\'export');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de l\'export');
        } finally {
            setExporting(false);
        }
    };

    const clearFilters = () => {
        setFilter({
            event_type: '',
            status: '',
            user_email: '',
            date_from: '',
            date_to: ''
        });
        showToast('info', 'Filtres réinitialisés');
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'success':
                return 'text-green-600 bg-green-100';
            case 'error':
                return 'text-red-600 bg-red-100';
            case 'warning':
                return 'text-yellow-600 bg-yellow-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const getEventTypeColor = (eventType: string) => {
        switch ((eventType || '').toLowerCase()) {
            case 'login':
                return 'text-blue-600 bg-blue-100';
            case 'logout':
                return 'text-purple-600 bg-purple-100';
            case 'create':
                return 'text-green-600 bg-green-100';
            case 'update':
                return 'text-orange-600 bg-orange-100';
            case 'delete':
                return 'text-red-600 bg-red-100';
            default:
                return 'text-gray-600 bg-gray-100';
        }
    };

    const filteredLogs = logs.filter(log => {
        if (filter.event_type && typeof log.event_type === 'string' && !log.event_type.toLowerCase().includes(filter.event_type.toLowerCase())) return false;
        if (filter.status && typeof log.status === 'string' && !log.status.toLowerCase().includes(filter.status.toLowerCase())) return false;
        if (filter.user_email && typeof log.user_email === 'string' && !log.user_email.toLowerCase().includes(filter.user_email.toLowerCase())) return false;
        if (filter.date_from && new Date(log.timestamp) < new Date(filter.date_from)) return false;
        if (filter.date_to && new Date(log.timestamp) > new Date(filter.date_to)) return false;
        return true;
    });

    if (loading) return (
        <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Chargement des logs d'audit...</span>
        </div>
    );

    return (
        <div className="space-y-4">
            {/* Error Toast */}
            {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}

            {/* Toast notifications */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center ${toast.type === 'success' ? 'bg-green-500 text-white' : 'bg-red-500 text-white'
                    }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 mr-2" />
                    ) : (
                        <AlertTriangle className="h-5 w-5 mr-2" />
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

            {/* Header avec actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Journal des actions admin (Audit Log)</h2>
                    <p className="text-sm text-gray-600">
                        {filteredLogs.length} entrée{filteredLogs.length !== 1 ? 's' : ''} trouvée{filteredLogs.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <Filter className="h-4 w-4 mr-2" />
                        Filtres
                    </button>
                    <button
                        onClick={fetchLogs}
                        className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualiser
                    </button>
                    <button onClick={() => exportLogs('csv')} disabled={exporting} className="flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                        {exporting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        {exporting ? 'Export...' : 'Exporter CSV'}
                    </button>
                    <button onClick={() => exportLogs('excel')} disabled={exporting} className="flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50">
                        {exporting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        {exporting ? 'Export...' : 'Exporter Excel'}
                    </button>
                </div>
            </div>

            {/* Filtres */}
            {showFilters && (
                <div className="bg-gray-50 p-4 rounded-lg border">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Type d'événement</label>
                            <input
                                type="text"
                                value={filter.event_type}
                                onChange={(e) => setFilter({ ...filter, event_type: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="Ex: login, logout, create..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Statut</label>
                            <input
                                type="text"
                                value={filter.status}
                                onChange={(e) => setFilter({ ...filter, status: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="Ex: success, error..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Utilisateur</label>
                            <input
                                type="text"
                                value={filter.user_email}
                                onChange={(e) => setFilter({ ...filter, user_email: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                                placeholder="Email utilisateur..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date de début</label>
                            <input
                                type="date"
                                value={filter.date_from}
                                onChange={(e) => setFilter({ ...filter, date_from: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Date de fin</label>
                            <input
                                type="date"
                                value={filter.date_to}
                                onChange={(e) => setFilter({ ...filter, date_to: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                            />
                        </div>
                        <div className="flex items-end">
                            <button
                                onClick={clearFilters}
                                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                            >
                                Réinitialiser
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Table des logs */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Localisation</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Détails</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredLogs.map((log) => (
                                <tr key={log.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(log.timestamp).toLocaleString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {log.user_email || "-"}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getEventTypeColor(log.event_type)}`}>
                                            {log.event_type}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(log.status)}`}>
                                            {log.status}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {log.ip_address}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {log.location || '-'}
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <details className="cursor-pointer">
                                            <summary className="text-blue-600 hover:text-blue-800">Voir détails</summary>
                                            <pre className="mt-2 text-xs bg-gray-100 p-2 rounded overflow-x-auto whitespace-pre-wrap">
                                                {JSON.stringify(log.metadata, null, 2)}
                                            </pre>
                                        </details>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredLogs.length === 0 && (
                    <div className="text-center py-12">
                        <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun log trouvé</h3>
                        <p className="text-gray-500">
                            {logs.length === 0 ? 'Aucun log d\'audit disponible.' : 'Aucun log ne correspond aux filtres appliqués.'}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default AdminAuditLogs; 