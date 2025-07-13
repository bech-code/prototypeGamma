import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../contexts/fetchWithAuth";
import { CheckCircle, X, AlertTriangle, Eye, RefreshCw, Download, Filter, Search, Clock, User, Shield, MessageSquare, Calendar, Info } from "lucide-react";

interface Report {
    id: number;
    reporter_name: string;
    reported_user_name: string;
    reason: string;
    description: string;
    status: 'pending' | 'resolved' | 'rejected';
    created_at: string;
    updated_at: string;
    evidence?: string;
    admin_notes?: string;
    priority?: 'low' | 'medium' | 'high';
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

function AdminReports() {
    const [reports, setReports] = useState<Report[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [updatingStatus, setUpdatingStatus] = useState<number | null>(null);
    const [selectedReport, setSelectedReport] = useState<Report | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [statusFilter, setStatusFilter] = useState<string>("all");
    const [priorityFilter, setPriorityFilter] = useState<string>("all");
    const [dateFilter, setDateFilter] = useState<string>("all");

    useEffect(() => {
        fetchReports();
    }, []);

    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchReports = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetchWithAuth("/depannage/api/reports/");
            if (response.ok) {
                const data = await response.json();
                setReports(data.results || data);
                showToast('success', 'Signalements chargés avec succès');
            } else {
                setError("Erreur lors du chargement des signalements.");
                showToast('error', 'Erreur lors du chargement des signalements');
            }
        } catch (err) {
            setError("Erreur de connexion lors du chargement des signalements.");
            showToast('error', 'Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const updateStatus = async (reportId: number, status: string, adminNotes?: string) => {
        setUpdatingStatus(reportId);
        try {
            const response = await fetchWithAuth(`/depannage/api/reports/${reportId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status,
                    admin_notes: adminNotes || undefined
                }),
            });

            if (response.ok) {
                const updatedReport = await response.json();
                setReports((prev) =>
                    prev.map((report) =>
                        report.id === reportId ? { ...report, ...updatedReport } : report
                    )
                );
                showToast('success', `Signalement ${status === 'resolved' ? 'résolu' : 'rejeté'} avec succès`);
            } else {
                const errorData = await response.json();
                showToast('error', errorData.message || 'Erreur lors de la mise à jour du statut');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de la mise à jour');
        } finally {
            setUpdatingStatus(null);
        }
    };

    const exportReports = async () => {
        setExporting(true);
        try {
            const response = await fetchWithAuth("/depannage/api/reports/export/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    status_filter: statusFilter,
                    priority_filter: priorityFilter,
                    date_filter: dateFilter,
                    search_term: searchTerm
                }),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `signalements-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('success', 'Export des signalements réussi');
            } else {
                showToast('error', 'Erreur lors de l\'export');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de l\'export');
        } finally {
            setExporting(false);
        }
    };

    const openDetailModal = (report: Report) => {
        setSelectedReport(report);
        setShowDetailModal(true);
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending':
                return 'bg-yellow-100 text-yellow-800';
            case 'resolved':
                return 'bg-green-100 text-green-800';
            case 'rejected':
                return 'bg-red-100 text-red-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getStatusText = (status: string) => {
        switch (status) {
            case 'pending':
                return 'En attente';
            case 'resolved':
                return 'Résolu';
            case 'rejected':
                return 'Rejeté';
            default:
                return status;
        }
    };

    const getPriorityColor = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'bg-red-100 text-red-800';
            case 'medium':
                return 'bg-orange-100 text-orange-800';
            case 'low':
                return 'bg-blue-100 text-blue-800';
            default:
                return 'bg-gray-100 text-gray-800';
        }
    };

    const getPriorityText = (priority: string) => {
        switch (priority) {
            case 'high':
                return 'Élevée';
            case 'medium':
                return 'Moyenne';
            case 'low':
                return 'Faible';
            default:
                return 'Non définie';
        }
    };

    const getStatusCount = (status: string) => {
        return reports.filter(report => report.status === status).length;
    };

    const filteredReports = reports.filter(report => {
        const matchesSearch =
            (typeof report.reporter_name === 'string' && report.reporter_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof report.reported_user_name === 'string' && report.reported_user_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof report.reason === 'string' && report.reason.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof report.description === 'string' && report.description.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesStatus = statusFilter === "all" || report.status === statusFilter;
        const matchesPriority = priorityFilter === "all" || report.priority === priorityFilter;

        let matchesDate = true;
        if (dateFilter !== "all") {
            const reportDate = new Date(report.created_at);
            const now = new Date();
            const daysAgo = dateFilter === "7d" ? 7 : 30;
            const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
            matchesDate = reportDate >= cutoff;
        }

        return matchesSearch && matchesStatus && matchesPriority && matchesDate;
    });

    if (loading) return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Chargement des signalements...</span>
        </div>
    );

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
                        <Info className="h-5 w-5 mr-2" />
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

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Header avec statistiques */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Signalements et Litiges</h1>
                            <p className="text-gray-600 mt-2">
                                Gérez les signalements et litiges entre utilisateurs
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                onClick={fetchReports}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Actualiser
                            </button>
                            <button
                                onClick={exportReports}
                                disabled={exporting}
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
                            >
                                {exporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-600 mr-2"></div>
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                {exporting ? 'Export...' : 'Exporter'}
                            </button>
                        </div>
                    </div>

                    {/* Statistiques */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <Clock className="h-8 w-8 text-yellow-600 mr-3" />
                                <div>
                                    <p className="text-2xl font-bold text-yellow-900">{getStatusCount('pending')}</p>
                                    <p className="text-sm text-yellow-700">En attente</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <CheckCircle className="h-8 w-8 text-green-600 mr-3" />
                                <div>
                                    <p className="text-2xl font-bold text-green-900">{getStatusCount('resolved')}</p>
                                    <p className="text-sm text-green-700">Résolus</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <X className="h-8 w-8 text-red-600 mr-3" />
                                <div>
                                    <p className="text-2xl font-bold text-red-900">{getStatusCount('rejected')}</p>
                                    <p className="text-sm text-red-700">Rejetés</p>
                                </div>
                            </div>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-center">
                                <MessageSquare className="h-8 w-8 text-blue-600 mr-3" />
                                <div>
                                    <p className="text-2xl font-bold text-blue-900">{reports.length}</p>
                                    <p className="text-sm text-blue-700">Total</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Filtres */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                        <Filter className="h-5 w-5 mr-2" />
                        Filtres
                    </h2>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Nom, raison, description..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Statut</label>
                            <select
                                value={statusFilter}
                                onChange={(e) => setStatusFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Tous les statuts</option>
                                <option value="pending">En attente</option>
                                <option value="resolved">Résolu</option>
                                <option value="rejected">Rejeté</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Priorité</label>
                            <select
                                value={priorityFilter}
                                onChange={(e) => setPriorityFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Toutes les priorités</option>
                                <option value="high">Élevée</option>
                                <option value="medium">Moyenne</option>
                                <option value="low">Faible</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Période</label>
                            <select
                                value={dateFilter}
                                onChange={(e) => setDateFilter(e.target.value)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Toute période</option>
                                <option value="7d">7 derniers jours</option>
                                <option value="30d">30 derniers jours</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Liste des signalements */}
                <div className="bg-white rounded-lg shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Signalement</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Utilisateur signalé</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Raison</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Priorité</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                                {filteredReports.map((report) => (
                                    <tr key={report.id} className="hover:bg-gray-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-10 w-10">
                                                    <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                                                        <User className="h-6 w-6 text-blue-600" />
                                                    </div>
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-gray-900">
                                                        {report.reporter_name}
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        Signalé le {new Date(report.created_at).toLocaleDateString('fr-FR')}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm font-medium text-gray-900">
                                                {report.reported_user_name}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-gray-900">{report.reason}</div>
                                            <div className="text-sm text-gray-500 truncate max-w-xs">
                                                {report.description}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(report.status)}`}>
                                                {getStatusText(report.status)}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(report.priority || 'low')}`}>
                                                {getPriorityText(report.priority || 'low')}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                            {new Date(report.created_at).toLocaleDateString('fr-FR')}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                            <button
                                                className="text-blue-600 hover:text-blue-900"
                                                onClick={() => openDetailModal(report)}
                                                title="Voir les détails"
                                            >
                                                <Eye className="h-4 w-4" />
                                            </button>
                                            {report.status === 'pending' && (
                                                <>
                                                    <button
                                                        className="text-green-600 hover:text-green-900"
                                                        onClick={() => updateStatus(report.id, 'resolved')}
                                                        disabled={updatingStatus === report.id}
                                                        title="Marquer comme résolu"
                                                    >
                                                        {updatingStatus === report.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b border-green-600"></div>
                                                        ) : (
                                                            <CheckCircle className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        className="text-red-600 hover:text-red-900"
                                                        onClick={() => updateStatus(report.id, 'rejected')}
                                                        disabled={updatingStatus === report.id}
                                                        title="Rejeter"
                                                    >
                                                        {updatingStatus === report.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b border-red-600"></div>
                                                        ) : (
                                                            <X className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {filteredReports.length === 0 && (
                        <div className="text-center py-12">
                            <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun signalement trouvé</h3>
                            <p className="text-gray-500">
                                {reports.length === 0 ? 'Aucun signalement disponible.' : 'Aucun signalement ne correspond aux critères de recherche.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Modal de détails */}
            {showDetailModal && selectedReport && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-medium text-gray-900">Détails du Signalement</h3>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Signalé par</label>
                                        <p className="text-sm text-gray-900">{selectedReport.reporter_name}</p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Utilisateur signalé</label>
                                        <p className="text-sm text-gray-900">{selectedReport.reported_user_name}</p>
                                    </div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Raison</label>
                                    <p className="text-sm text-gray-900">{selectedReport.reason}</p>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Description</label>
                                    <p className="text-sm text-gray-900">{selectedReport.description}</p>
                                </div>

                                {selectedReport.evidence && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Preuves</label>
                                        <p className="text-sm text-gray-900">{selectedReport.evidence}</p>
                                    </div>
                                )}

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Statut</label>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedReport.status)}`}>
                                            {getStatusText(selectedReport.status)}
                                        </span>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Priorité</label>
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedReport.priority || 'low')}`}>
                                            {getPriorityText(selectedReport.priority || 'low')}
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Date de création</label>
                                        <p className="text-sm text-gray-900">
                                            {new Date(selectedReport.created_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Dernière mise à jour</label>
                                        <p className="text-sm text-gray-900">
                                            {new Date(selectedReport.updated_at).toLocaleString('fr-FR')}
                                        </p>
                                    </div>
                                </div>

                                {selectedReport.admin_notes && (
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700">Notes administrateur</label>
                                        <p className="text-sm text-gray-900">{selectedReport.admin_notes}</p>
                                    </div>
                                )}
                            </div>

                            {selectedReport.status === 'pending' && (
                                <div className="mt-6 flex space-x-3">
                                    <button
                                        onClick={() => {
                                            updateStatus(selectedReport.id, 'resolved');
                                            setShowDetailModal(false);
                                        }}
                                        disabled={updatingStatus === selectedReport.id}
                                        className="flex-1 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
                                    >
                                        {updatingStatus === selectedReport.id ? 'Traitement...' : 'Marquer comme résolu'}
                                    </button>
                                    <button
                                        onClick={() => {
                                            updateStatus(selectedReport.id, 'rejected');
                                            setShowDetailModal(false);
                                        }}
                                        disabled={updatingStatus === selectedReport.id}
                                        className="flex-1 bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 disabled:opacity-50"
                                    >
                                        {updatingStatus === selectedReport.id ? 'Traitement...' : 'Rejeter'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="fixed bottom-4 right-4 bg-red-500 text-white px-6 py-3 rounded-lg shadow-lg">
                    <AlertTriangle className="h-5 w-5 inline mr-2" />
                    {error}
                </div>
            )}
        </div>
    );
}

export default AdminReports; 