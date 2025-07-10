import { useEffect, useState } from "react";
import { fetchWithAuth } from "../contexts/fetchWithAuth";
import { CheckCircle, AlertTriangle, Info, X } from "lucide-react";

interface Alert {
    id: number;
    title: string;
    message: string;
    severity: 'critical' | 'warning' | 'info';
    is_read: boolean;
    created_at: string;
    event_type?: string;
}

export default function AdminAlerts() {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [markingAsRead, setMarkingAsRead] = useState<number | null>(null);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchAlerts = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetchWithAuth("/depannage/api/admin-notifications/");
            if (response.ok) {
                const data = await response.json();
                if (Array.isArray(data)) {
                setAlerts(data);
                } else if (Array.isArray(data.results)) {
                    setAlerts(data.results);
                } else {
                    setAlerts([]);
                    setError("Format inattendu des données reçues.");
                }
            } else {
                setError("Erreur lors du chargement des alertes admin.");
                showToast('error', 'Erreur lors du chargement des alertes');
            }
        } catch (err) {
            setError("Erreur de connexion lors du chargement des alertes admin.");
            showToast('error', 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const markAsRead = async (id: number) => {
        setMarkingAsRead(id);
        try {
            const response = await fetchWithAuth(
                `/depannage/api/admin-notifications/${id}/`,
                {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ is_read: true }),
                }
            );

            if (response.ok) {
                setAlerts((prev) =>
                    prev.map((alert) =>
                        alert.id === id ? { ...alert, is_read: true } : alert
                    )
                );
                showToast('success', 'Alerte marquée comme lue');
            } else {
                showToast('error', 'Erreur lors de la mise à jour de l\'alerte');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de la mise à jour');
        } finally {
            setMarkingAsRead(null);
        }
    };

    const markAllAsRead = async () => {
        try {
            const response = await fetchWithAuth("/depannage/api/admin-notifications/mark-all-read/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
            });

            if (response.ok) {
                setAlerts((prev) => prev.map((alert) => ({ ...alert, is_read: true })));
                showToast('success', 'Toutes les alertes marquées comme lues');
            } else {
                showToast('error', 'Erreur lors de la mise à jour des alertes');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion');
        }
    };

    const deleteAlert = async (id: number) => {
        if (!confirm('Êtes-vous sûr de vouloir supprimer cette alerte ?')) {
            return;
        }

        try {
            const response = await fetchWithAuth(`/depannage/api/admin-notifications/${id}/`, {
                method: 'DELETE',
            });

            if (response.ok) {
                setAlerts((prev) => prev.filter((alert) => alert.id !== id));
                showToast('success', 'Alerte supprimée avec succès');
            } else {
                showToast('error', 'Erreur lors de la suppression de l\'alerte');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de la suppression');
        }
    };

    const getSeverityIcon = (severity: string) => {
        switch (severity) {
            case 'critical':
                return <AlertTriangle className="h-5 w-5 text-red-500" />;
            case 'warning':
                return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
            default:
                return <Info className="h-5 w-5 text-blue-500" />;
        }
    };

    const getSeverityColor = (severity: string) => {
        switch (severity) {
            case 'critical':
                return 'bg-red-50 border-red-400 text-red-800';
            case 'warning':
                return 'bg-yellow-50 border-yellow-400 text-yellow-800';
            default:
                return 'bg-blue-50 border-blue-300 text-blue-800';
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Chargement des alertes...</span>
        </div>
    );

    if (error) return (
        <div className="text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 inline mr-2" />
            {error}
        </div>
    );

    const unreadCount = alerts.filter(alert => !alert.is_read).length;

    return (
        <div className="space-y-4">
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
                    <h2 className="text-xl font-semibold text-gray-900">Alertes Administrateur</h2>
                    <p className="text-sm text-gray-600">
                        {unreadCount} alerte{unreadCount !== 1 ? 's' : ''} non lue{unreadCount !== 1 ? 's' : ''}
                    </p>
                </div>
                {unreadCount > 0 && (
                    <button
                        onClick={markAllAsRead}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors text-sm"
                    >
                        Tout marquer comme lu
                    </button>
                )}
            </div>

            {/* Liste des alertes */}
            <div className="space-y-3">
                {alerts.map((alert) => (
                    <div
                        key={alert.id}
                        className={`border rounded-lg p-4 shadow-sm transition-all duration-200 ${alert.is_read ? 'opacity-75' : 'ring-2 ring-blue-200'
                            } ${getSeverityColor(alert.severity)}`}
                    >
                        <div className="flex items-start justify-between">
                            <div className="flex items-start space-x-3 flex-1">
                                {getSeverityIcon(alert.severity)}
                                <div className="flex-1">
                                    <div className="flex items-center space-x-2 mb-2">
                                        <h4 className="font-semibold">{alert.title}</h4>
                                        {!alert.is_read && (
                                            <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full">
                                                Nouveau
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-sm mb-2">{alert.message}</p>
                                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                                        <span>{new Date(alert.created_at).toLocaleString('fr-FR')}</span>
                                        {alert.event_type && (
                                            <span className="bg-gray-200 px-2 py-1 rounded">
                                                {alert.event_type}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center space-x-2 ml-4">
                                {!alert.is_read && (
                                    <button
                                        onClick={() => markAsRead(alert.id)}
                                        disabled={markingAsRead === alert.id}
                                        className="text-sm text-blue-600 hover:text-blue-800 underline disabled:opacity-50"
                                    >
                                        {markingAsRead === alert.id ? (
                                            <div className="flex items-center">
                                                <div className="animate-spin rounded-full h-3 w-3 border-b border-blue-600 mr-1"></div>
                                                Marquant...
                                            </div>
                                        ) : (
                                            'Marquer comme lu'
                                        )}
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteAlert(alert.id)}
                                    className="text-red-600 hover:text-red-800 p-1 rounded hover:bg-red-50"
                                    title="Supprimer l'alerte"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}

                {alerts.length === 0 && (
                    <div className="text-center py-12">
                        <CheckCircle className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune alerte</h3>
                        <p className="text-gray-500">Toutes les alertes ont été traitées.</p>
                    </div>
                )}
            </div>
        </div>
    );
} 