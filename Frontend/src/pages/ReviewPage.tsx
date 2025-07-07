import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { Star, Clock, Award, MessageSquare, CheckCircle, ArrowLeft, Send, Heart, ThumbsUp, ThumbsDown } from 'lucide-react';

interface RepairRequest {
    id: number;
    title: string;
    description: string;
    status: string;
    completed_at: string;
    technician: {
        id: number;
        user: {
            first_name: string;
            last_name: string;
            email: string;
        };
        specialty: string;
        years_experience: number;
        average_rating: number;
        total_jobs_completed: number;
    };
    client: {
        id: number;
        user: {
            first_name: string;
            last_name: string;
        };
    };
}

interface ReviewForm {
    rating: number;
    punctuality_rating: number;
    quality_rating: number;
    communication_rating: number;
    comment: string;
    would_recommend: boolean;
}

const ReviewPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();

    const [request, setRequest] = useState<RepairRequest | null>(null);
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    const [form, setForm] = useState<ReviewForm>({
        rating: 0,
        punctuality_rating: 0,
        quality_rating: 0,
        communication_rating: 0,
        comment: '',
        would_recommend: true
    });

    const [hoveredRating, setHoveredRating] = useState(0);
    const [hoveredPunctuality, setHoveredPunctuality] = useState(0);
    const [hoveredQuality, setHoveredQuality] = useState(0);
    const [hoveredCommunication, setHoveredCommunication] = useState(0);

    useEffect(() => {
        if (requestId) {
            fetchRequestDetails();
        }
    }, [requestId]);

    const fetchRequestDetails = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/repair-requests/${requestId}/`);
            if (response.ok) {
                const data = await response.json();
                setRequest(data);
            } else {
                setError('Demande non trouvée ou accès refusé.');
            }
        } catch (err) {
            setError('Erreur lors du chargement de la demande.');
        } finally {
            setLoading(false);
        }
    };

    const handleRatingChange = (rating: number, field: keyof ReviewForm) => {
        setForm(prev => ({ ...prev, [field]: rating }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!form.rating) {
            setError('Veuillez donner une note globale.');
            return;
        }

        if (!form.punctuality_rating || !form.quality_rating || !form.communication_rating) {
            setError('Veuillez évaluer tous les critères.');
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                request: parseInt(requestId!),
                technician: request?.technician.id,
                rating: form.rating,
                punctuality_rating: form.punctuality_rating,
                quality_rating: form.quality_rating,
                communication_rating: form.communication_rating,
                comment: form.comment,
                would_recommend: form.would_recommend,
            };

            const response = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/reviews/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/customer-dashboard');
                }, 3000);
            } else {
                const data = await response.json();
                setError(data?.detail || 'Erreur lors de l\'envoi de l\'avis.');
            }
        } catch (err) {
            setError('Erreur réseau lors de l\'envoi de l\'avis.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStars = (
        rating: number,
        hoveredRating: number,
        onRatingChange: (rating: number) => void,
        onHover: (rating: number) => void,
        onLeave: () => void,
        size: 'sm' | 'md' | 'lg' = 'md'
    ) => {
        const starSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-8 w-8' : 'h-6 w-6';
        const displayRating = hoveredRating || rating;

        return (
            <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onRatingChange(star)}
                        onMouseEnter={() => onHover(star)}
                        onMouseLeave={onLeave}
                        className={`transition-all duration-200 transform hover:scale-110 ${star <= displayRating ? 'text-yellow-400' : 'text-gray-300'
                            } ${starSize}`}
                    >
                        <Star className="fill-current" />
                    </button>
                ))}
            </div>
        );
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Chargement de la demande...</p>
                </div>
            </div>
        );
    }

    if (error && !request) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-red-100 rounded-full p-4 mx-auto mb-4">
                        <ThumbsDown className="h-8 w-8 text-red-600 mx-auto" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Erreur</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/customer-dashboard')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour au tableau de bord
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-green-100 rounded-full p-4 mx-auto mb-4 animate-bounce">
                        <CheckCircle className="h-8 w-8 text-green-600 mx-auto" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Avis envoyé !</h2>
                    <p className="text-gray-600 mb-4">Merci pour votre évaluation. Elle aide à améliorer nos services.</p>
                    <div className="animate-pulse">
                        <p className="text-sm text-gray-500">Redirection vers le tableau de bord...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!request || request.status !== 'completed') {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="text-center">
                    <div className="bg-yellow-100 rounded-full p-4 mx-auto mb-4">
                        <Clock className="h-8 w-8 text-yellow-600 mx-auto" />
                    </div>
                    <h2 className="text-xl font-semibold text-gray-800 mb-2">Demande non terminée</h2>
                    <p className="text-gray-600 mb-4">Vous ne pouvez noter que les demandes terminées.</p>
                    <button
                        onClick={() => navigate('/customer-dashboard')}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour au tableau de bord
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
            <div className="container mx-auto px-4 py-8">
                {/* Header */}
                <div className="mb-8">
                    <button
                        onClick={() => navigate('/customer-dashboard')}
                        className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4 transition-colors"
                    >
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Retour au tableau de bord
                    </button>

                    <div className="bg-white rounded-2xl shadow-lg p-8">
                        <div className="text-center mb-8">
                            <div className="bg-blue-100 rounded-full p-4 mx-auto mb-4 w-16 h-16 flex items-center justify-center">
                                <Award className="h-8 w-8 text-blue-600" />
                            </div>
                            <h1 className="text-3xl font-bold text-gray-800 mb-2">Évaluez votre technicien</h1>
                            <p className="text-gray-600">Partagez votre expérience pour aider d'autres clients</p>
                        </div>

                        {/* Informations du technicien */}
                        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 mb-8">
                            <div className="flex items-center justify-between">
                                <div>
                                    <h2 className="text-xl font-semibold text-gray-800 mb-2">
                                        {request.technician.user.first_name} {request.technician.user.last_name}
                                    </h2>
                                    <p className="text-gray-600 mb-2">{request.technician.specialty}</p>
                                    <div className="flex items-center space-x-4 text-sm text-gray-500">
                                        <span className="flex items-center">
                                            <Clock className="h-4 w-4 mr-1" />
                                            {request.technician.years_experience} ans d'expérience
                                        </span>
                                        <span className="flex items-center">
                                            <Star className="h-4 w-4 mr-1 text-yellow-400" />
                                            {request.technician.average_rating}/5 ({request.technician.total_jobs_completed} missions)
                                        </span>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <p className="text-sm text-gray-500">Mission terminée le</p>
                                    <p className="font-semibold text-gray-800">
                                        {new Date(request.completed_at).toLocaleDateString('fr-FR')}
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Formulaire d'évaluation */}
                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Note globale */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-lg font-semibold text-gray-800">Note globale</h3>
                                    <span className="text-sm text-gray-500">Cliquez sur les étoiles</span>
                                </div>
                                <div className="flex justify-center">
                                    {renderStars(
                                        form.rating,
                                        hoveredRating,
                                        (rating) => handleRatingChange(rating, 'rating'),
                                        setHoveredRating,
                                        () => setHoveredRating(0),
                                        'lg'
                                    )}
                                </div>
                                {form.rating > 0 && (
                                    <p className="text-center text-sm text-gray-600">
                                        {form.rating === 5 && "Excellent !"}
                                        {form.rating === 4 && "Très bien !"}
                                        {form.rating === 3 && "Bien"}
                                        {form.rating === 2 && "Moyen"}
                                        {form.rating === 1 && "À améliorer"}
                                    </p>
                                )}
                            </div>

                            {/* Critères détaillés */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                {/* Ponctualité */}
                                <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="text-center mb-4">
                                        <Clock className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                                        <h4 className="font-semibold text-gray-800">Ponctualité</h4>
                                        <p className="text-xs text-gray-500">Le technicien est-il arrivé à l'heure ?</p>
                                    </div>
                                    <div className="flex justify-center mb-2">
                                        {renderStars(
                                            form.punctuality_rating,
                                            hoveredPunctuality,
                                            (rating) => handleRatingChange(rating, 'punctuality_rating'),
                                            setHoveredPunctuality,
                                            () => setHoveredPunctuality(0),
                                            'sm'
                                        )}
                                    </div>
                                    {form.punctuality_rating > 0 && (
                                        <p className="text-center text-xs text-gray-600">
                                            {form.punctuality_rating === 5 && "Parfaitement ponctuel"}
                                            {form.punctuality_rating === 4 && "Très ponctuel"}
                                            {form.punctuality_rating === 3 && "Ponctuel"}
                                            {form.punctuality_rating === 2 && "Un peu en retard"}
                                            {form.punctuality_rating === 1 && "Très en retard"}
                                        </p>
                                    )}
                                </div>

                                {/* Qualité du travail */}
                                <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="text-center mb-4">
                                        <Award className="h-8 w-8 text-green-500 mx-auto mb-2" />
                                        <h4 className="font-semibold text-gray-800">Qualité du travail</h4>
                                        <p className="text-xs text-gray-500">Le travail a-t-il été bien fait ?</p>
                                    </div>
                                    <div className="flex justify-center mb-2">
                                        {renderStars(
                                            form.quality_rating,
                                            hoveredQuality,
                                            (rating) => handleRatingChange(rating, 'quality_rating'),
                                            setHoveredQuality,
                                            () => setHoveredQuality(0),
                                            'sm'
                                        )}
                                    </div>
                                    {form.quality_rating > 0 && (
                                        <p className="text-center text-xs text-gray-600">
                                            {form.quality_rating === 5 && "Travail parfait"}
                                            {form.quality_rating === 4 && "Très bon travail"}
                                            {form.quality_rating === 3 && "Bon travail"}
                                            {form.quality_rating === 2 && "Travail moyen"}
                                            {form.quality_rating === 1 && "Travail insuffisant"}
                                        </p>
                                    )}
                                </div>

                                {/* Communication */}
                                <div className="bg-white rounded-xl p-6 border border-gray-200 hover:shadow-md transition-shadow">
                                    <div className="text-center mb-4">
                                        <MessageSquare className="h-8 w-8 text-purple-500 mx-auto mb-2" />
                                        <h4 className="font-semibold text-gray-800">Communication</h4>
                                        <p className="text-xs text-gray-500">Le technicien a-t-il bien communiqué ?</p>
                                    </div>
                                    <div className="flex justify-center mb-2">
                                        {renderStars(
                                            form.communication_rating,
                                            hoveredCommunication,
                                            (rating) => handleRatingChange(rating, 'communication_rating'),
                                            setHoveredCommunication,
                                            () => setHoveredCommunication(0),
                                            'sm'
                                        )}
                                    </div>
                                    {form.communication_rating > 0 && (
                                        <p className="text-center text-xs text-gray-600">
                                            {form.communication_rating === 5 && "Communication excellente"}
                                            {form.communication_rating === 4 && "Très bonne communication"}
                                            {form.communication_rating === 3 && "Bonne communication"}
                                            {form.communication_rating === 2 && "Communication moyenne"}
                                            {form.communication_rating === 1 && "Communication insuffisante"}
                                        </p>
                                    )}
                                </div>
                            </div>

                            {/* Recommandation */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <div className="flex items-center justify-between mb-4">
                                    <h3 className="text-lg font-semibold text-gray-800">Recommandation</h3>
                                    <div className="flex items-center space-x-4">
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, would_recommend: true }))}
                                            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${form.would_recommend
                                                    ? 'bg-green-100 text-green-700 border-2 border-green-300'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            <ThumbsUp className="h-4 w-4 mr-2" />
                                            Recommander
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, would_recommend: false }))}
                                            className={`flex items-center px-4 py-2 rounded-lg transition-colors ${!form.would_recommend
                                                    ? 'bg-red-100 text-red-700 border-2 border-red-300'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            <ThumbsDown className="h-4 w-4 mr-2" />
                                            Ne pas recommander
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Commentaire */}
                            <div className="bg-white rounded-xl p-6 border border-gray-200">
                                <h3 className="text-lg font-semibold text-gray-800 mb-4">Commentaire (optionnel)</h3>
                                <textarea
                                    value={form.comment}
                                    onChange={(e) => setForm(prev => ({ ...prev, comment: e.target.value }))}
                                    placeholder="Partagez votre expérience avec ce technicien... (minimum 10 caractères)"
                                    className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                                    maxLength={500}
                                />
                                <div className="flex justify-between items-center mt-2">
                                    <span className="text-sm text-gray-500">
                                        {form.comment.length}/500 caractères
                                    </span>
                                    {form.comment.length > 0 && form.comment.length < 10 && (
                                        <span className="text-sm text-red-500">
                                            Minimum 10 caractères
                                        </span>
                                    )}
                                </div>
                            </div>

                            {/* Erreur */}
                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                                    <p className="text-red-700">{error}</p>
                                </div>
                            )}

                            {/* Bouton de soumission */}
                            <div className="flex justify-center">
                                <button
                                    type="submit"
                                    disabled={submitting || !form.rating || !form.punctuality_rating || !form.quality_rating || !form.communication_rating}
                                    className={`inline-flex items-center px-8 py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-105 ${submitting || !form.rating || !form.punctuality_rating || !form.quality_rating || !form.communication_rating
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-700 hover:to-indigo-700 shadow-lg'
                                        }`}
                                >
                                    {submitting ? (
                                        <>
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-3"></div>
                                            Envoi en cours...
                                        </>
                                    ) : (
                                        <>
                                            <Send className="h-5 w-5 mr-3" />
                                            Envoyer mon avis
                                        </>
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewPage; 