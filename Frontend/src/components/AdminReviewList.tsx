import React, { useEffect, useState } from "react";
import { fetchWithAuth } from "../contexts/fetchWithAuth";
import { CheckCircle, X, AlertTriangle, Eye, RefreshCw, Download, Star, MessageSquare } from "lucide-react";
import ErrorToast from './ErrorToast';

interface Review {
    id: number;
    technician_name: string;
    client_name: string;
    rating: number;
    comment: string;
    created_at: string;
    is_visible: boolean;
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

export default function AdminReviewList() {
    const [reviews, setReviews] = useState<Review[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [toast, setToast] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [moderating, setModerating] = useState<number | null>(null);
    const [selectedReview, setSelectedReview] = useState<Review | null>(null);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [filter, setFilter] = useState({
        rating: '',
        visibility: '',
        date_from: '',
        date_to: ''
    });

    useEffect(() => {
        fetchReviews();
    }, []);

    const showToast = (type: 'success' | 'error', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchReviews = async () => {
        setLoading(true);
        setError("");
        try {
            const response = await fetchWithAuth("/depannage/api/reviews/");
            if (response.ok) {
                const data = await response.json();
                setReviews(data);
            } else {
                let backendMsg = '';
                try {
                    const errData = await response.json();
                    backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
                } catch { }
                setError(`Erreur lors du chargement des avis (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
                showToast('error', `Erreur lors du chargement des avis (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
            }
        } catch (err) {
            setError("Erreur de connexion lors du chargement des avis.");
            showToast('error', 'Erreur de connexion lors du chargement des avis.');
        } finally {
            setLoading(false);
        }
    };

    const handleModerate = async (reviewId: number) => {
        setModerating(reviewId);
        try {
            const response = await fetchWithAuth(`/depannage/api/reviews/${reviewId}/moderate/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_visible: false }),
            });

            if (response.ok) {
                setReviews((prev) =>
                    prev.map((review) =>
                        review.id === reviewId ? { ...review, is_visible: false } : review
                    )
                );
                showToast('success', 'Avis masqué avec succès');
            } else {
                showToast('error', 'Erreur lors de la modération');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de la modération');
        } finally {
            setModerating(null);
        }
    };

    const handleRestore = async (reviewId: number) => {
        setModerating(reviewId);
        try {
            const response = await fetchWithAuth(`/depannage/api/reviews/${reviewId}/moderate/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ is_visible: true }),
            });

            if (response.ok) {
                setReviews((prev) =>
                    prev.map((review) =>
                        review.id === reviewId ? { ...review, is_visible: true } : review
                    )
                );
                showToast('success', 'Avis restauré avec succès');
            } else {
                showToast('error', 'Erreur lors de la restauration');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de la restauration');
        } finally {
            setModerating(null);
        }
    };

    const exportReviews = async () => {
        setExporting(true);
        try {
            const response = await fetchWithAuth("/depannage/api/reviews/export/", {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(filter),
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `avis-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('success', 'Export des avis réussi');
            } else {
                showToast('error', 'Erreur lors de l\'export');
            }
        } catch (err) {
            showToast('error', 'Erreur de connexion lors de l\'export');
        } finally {
            setExporting(false);
        }
    };

    const openDetailModal = (review: Review) => {
        setSelectedReview(review);
        setShowDetailModal(true);
    };

    const getRatingStars = (rating: number) => {
        return Array.from({ length: 5 }, (_, i) => (
            <Star
                key={i}
                className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
            />
        ));
    };

    const getRatingColor = (rating: number) => {
        if (rating >= 4) return 'text-green-600 bg-green-100';
        if (rating >= 3) return 'text-yellow-600 bg-yellow-100';
        return 'text-red-600 bg-red-100';
    };

    const filteredReviews = Array.isArray(reviews) ? reviews.filter(review => {
        if (filter.rating && review.rating !== parseInt(filter.rating)) return false;
        if (filter.visibility && review.is_visible !== (filter.visibility === 'visible')) return false;
        if (filter.date_from && new Date(review.created_at) < new Date(filter.date_from)) return false;
        if (filter.date_to && new Date(review.created_at) > new Date(filter.date_to)) return false;
        return true;
    }) : [];

    const getStats = () => {
        const total = Array.isArray(reviews) ? reviews.length : 0;
        const visible = Array.isArray(reviews) ? reviews.filter(r => r.is_visible).length : 0;
        const hidden = total - visible;
        const avgRating = total > 0 && Array.isArray(reviews) ? reviews.reduce((sum, r) => sum + (typeof r.rating === 'number' ? r.rating : 0), 0) / total : 0;

        return { total, visible, hidden, avgRating: avgRating.toFixed(1) };
    };

    const stats = getStats();

    if (loading) return (
        <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Chargement des avis...</span>
        </div>
    );

    if (error) return (
        <div className="text-red-600 p-4 bg-red-50 rounded-lg border border-red-200">
            <AlertTriangle className="h-5 w-5 inline mr-2" />
            {error}
        </div>
    );

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
            {error && <ErrorToast message={error} onClose={() => setError("")} type="error" />}

            {/* Header avec statistiques et actions */}
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-semibold text-gray-900">Modération des avis</h2>
                    <p className="text-sm text-gray-600">
                        {filteredReviews.length} avis trouvé{filteredReviews.length !== 1 ? 's' : ''}
                    </p>
                </div>
                <div className="flex space-x-2">
                    <button
                        onClick={fetchReviews}
                        className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Actualiser
                    </button>
                    <button
                        onClick={exportReviews}
                        disabled={exporting}
                        className="flex items-center px-3 py-2 border border-transparent rounded-md text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                    >
                        {exporting ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b border-white mr-2"></div>
                        ) : (
                            <Download className="h-4 w-4 mr-2" />
                        )}
                        {exporting ? 'Export...' : 'Exporter'}
                    </button>
                </div>
            </div>

            {/* Statistiques rapides */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-blue-100 rounded-lg">
                            <MessageSquare className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-blue-800">Total</p>
                            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-green-100 rounded-lg">
                            <CheckCircle className="h-6 w-6 text-green-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-green-800">Visibles</p>
                            <p className="text-2xl font-bold text-green-900">{stats.visible}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-red-100 rounded-lg">
                            <X className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-red-800">Masqués</p>
                            <p className="text-2xl font-bold text-red-900">{stats.hidden}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="p-2 bg-yellow-100 rounded-lg">
                            <Star className="h-6 w-6 text-yellow-600" />
                        </div>
                        <div className="ml-4">
                            <p className="text-sm font-medium text-yellow-800">Note moyenne</p>
                            <p className="text-2xl font-bold text-yellow-900">{stats.avgRating}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Table des avis */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Technicien</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Commentaire</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Statut</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {filteredReviews.map((review) => (
                                <tr key={review.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {review.technician_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {review.client_name}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center space-x-1">
                                            {getRatingStars(review.rating)}
                                            <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getRatingColor(review.rating)}`}>
                                                {review.rating}/5
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-900">
                                        <div className="max-w-xs truncate" title={review.comment}>
                                            {review.comment}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(review.created_at).toLocaleDateString('fr-FR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${review.is_visible
                                            ? 'bg-green-100 text-green-800'
                                            : 'bg-red-100 text-red-800'
                                            }`}>
                                            {review.is_visible ? 'Visible' : 'Masqué'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                                        <button
                                            onClick={() => openDetailModal(review)}
                                            className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                                            title="Voir les détails"
                                        >
                                            <Eye className="h-4 w-4" />
                                        </button>
                                        {review.is_visible ? (
                                            <button
                                                onClick={() => handleModerate(review.id)}
                                                disabled={moderating === review.id}
                                                className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50 disabled:opacity-50"
                                                title="Masquer l'avis"
                                            >
                                                {moderating === review.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b border-red-600"></div>
                                                ) : (
                                                    <X className="h-4 w-4" />
                                                )}
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => handleRestore(review.id)}
                                                disabled={moderating === review.id}
                                                className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50 disabled:opacity-50"
                                                title="Restaurer l'avis"
                                            >
                                                {moderating === review.id ? (
                                                    <div className="animate-spin rounded-full h-4 w-4 border-b border-green-600"></div>
                                                ) : (
                                                    <CheckCircle className="h-4 w-4" />
                                                )}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {filteredReviews.length === 0 && (
                    <div className="text-center py-12">
                        <MessageSquare className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun avis trouvé</h3>
                        <p className="text-gray-500">
                            {Array.isArray(reviews) && reviews.length === 0 ? 'Aucun avis disponible.' : 'Aucun avis ne correspond aux filtres appliqués.'}
                        </p>
                    </div>
                )}
            </div>

            {/* Modal de détails */}
            {showDetailModal && selectedReview && (
                <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
                    <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
                        <div className="mt-3">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Détails de l'avis #{selectedReview.id}
                                </h3>
                                <button
                                    onClick={() => setShowDetailModal(false)}
                                    className="text-gray-400 hover:text-gray-600"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Technicien</label>
                                    <p className="text-sm text-gray-900">{selectedReview.technician_name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Client</label>
                                    <p className="text-sm text-gray-900">{selectedReview.client_name}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Note</label>
                                    <div className="flex items-center space-x-1">
                                        {getRatingStars(selectedReview.rating)}
                                        <span className={`ml-2 px-2 py-1 text-xs font-semibold rounded-full ${getRatingColor(selectedReview.rating)}`}>
                                            {selectedReview.rating}/5
                                        </span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Commentaire</label>
                                    <p className="text-sm text-gray-900">{selectedReview.comment}</p>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Statut</label>
                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${selectedReview.is_visible
                                        ? 'bg-green-100 text-green-800'
                                        : 'bg-red-100 text-red-800'
                                        }`}>
                                        {selectedReview.is_visible ? 'Visible' : 'Masqué'}
                                    </span>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700">Date de création</label>
                                    <p className="text-sm text-gray-900">
                                        {new Date(selectedReview.created_at).toLocaleString('fr-FR')}
                                    </p>
                                </div>
                            </div>

                            <div className="mt-6 flex space-x-3">
                                {selectedReview.is_visible ? (
                                    <button
                                        onClick={() => {
                                            handleModerate(selectedReview.id);
                                            setShowDetailModal(false);
                                        }}
                                        disabled={moderating === selectedReview.id}
                                        className="flex-1 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                                    >
                                        Masquer
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => {
                                            handleRestore(selectedReview.id);
                                            setShowDetailModal(false);
                                        }}
                                        disabled={moderating === selectedReview.id}
                                        className="flex-1 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                                    >
                                        Restaurer
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
} 