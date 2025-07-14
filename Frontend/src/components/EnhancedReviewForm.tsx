import React, { useState, useEffect } from 'react';
import { Star, Clock, Award, MessageSquare, Shield, Zap, CheckCircle, AlertCircle, ThumbsUp, Users, Tag, Edit3, Flag } from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface ReviewFormData {
    rating: number;
    punctuality_rating: number;
    quality_rating: number;
    communication_rating: number;
    professionalism_rating: number;
    problem_solving_rating: number;
    cleanliness_rating: number;
    price_fairness_rating: number;
    comment: string;
    would_recommend: boolean;
    would_use_again: boolean;
    would_recommend_to_friends: boolean;
    positive_aspects: string;
    improvement_suggestions: string;
    intervention_duration_minutes: number;
    was_urgent: boolean;
    problem_complexity: string;
    parts_used: boolean;
    warranty_offered: boolean;
    warranty_duration_days: number;
    tags: string[];
}

interface EnhancedReviewFormProps {
    requestId: number;
    technicianId: number;
    onSuccess: () => void;
    onCancel: () => void;
}

const EnhancedReviewForm: React.FC<EnhancedReviewFormProps> = ({
    requestId,
    technicianId,
    onSuccess,
    onCancel
}) => {
    const [formData, setFormData] = useState<ReviewFormData>({
        rating: 0,
        punctuality_rating: 0,
        quality_rating: 0,
        communication_rating: 0,
        professionalism_rating: 0,
        problem_solving_rating: 0,
        cleanliness_rating: 0,
        price_fairness_rating: 0,
        comment: '',
        would_recommend: true,
        would_use_again: true,
        would_recommend_to_friends: true,
        positive_aspects: '',
        improvement_suggestions: '',
        intervention_duration_minutes: 0,
        was_urgent: false,
        problem_complexity: 'simple',
        parts_used: false,
        warranty_offered: false,
        warranty_duration_days: 0,
        tags: []
    });

    const [currentStep, setCurrentStep] = useState(1);
    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [hoveredRatings, setHoveredRatings] = useState<Record<string, number>>({});

    const totalSteps = 4;

    const ratingCriteria = [
        {
            key: 'rating',
            label: 'Note globale',
            description: 'Votre satisfaction générale',
            icon: Star,
            required: true
        },
        {
            key: 'punctuality_rating',
            label: 'Ponctualité',
            description: 'Respect des horaires',
            icon: Clock,
            required: true
        },
        {
            key: 'quality_rating',
            label: 'Qualité du travail',
            description: 'Qualité de l\'intervention',
            icon: Award,
            required: true
        },
        {
            key: 'communication_rating',
            label: 'Communication',
            description: 'Clarté et disponibilité',
            icon: MessageSquare,
            required: true
        },
        {
            key: 'professionalism_rating',
            label: 'Professionnalisme',
            description: 'Attitude et respect',
            icon: Shield,
            required: false
        },
        {
            key: 'problem_solving_rating',
            label: 'Résolution de problème',
            description: 'Diagnostic et solution',
            icon: Zap,
            required: false
        },
        {
            key: 'cleanliness_rating',
            label: 'Propreté',
            description: 'Nettoyage et ordre',
            icon: CheckCircle,
            required: false
        },
        {
            key: 'price_fairness_rating',
            label: 'Justesse du prix',
            description: 'Prix justifié',
            icon: AlertCircle,
            required: false
        }
    ];

    const complexityOptions = [
        { value: 'simple', label: 'Simple', description: 'Problème basique' },
        { value: 'moderate', label: 'Modérée', description: 'Problème standard' },
        { value: 'complex', label: 'Complexe', description: 'Problème avancé' },
        { value: 'very_complex', label: 'Très complexe', description: 'Problème majeur' }
    ];

    const suggestedTags = [
        'professionnel', 'rapide', 'efficace', 'ponctuel', 'compétent',
        'cher', 'abordable', 'bien expliqué', 'propre', 'garantie',
        'urgent', 'disponible', 'réactif', 'expérimenté', 'courtois'
    ];

    const handleRatingChange = (key: string, rating: number) => {
        setFormData(prev => ({ ...prev, [key]: rating }));
    };

    const handleHoverRating = (key: string, rating: number) => {
        setHoveredRatings(prev => ({ ...prev, [key]: rating }));
    };

    const handleInputChange = (key: string, value: any) => {
        setFormData(prev => ({ ...prev, [key]: value }));
    };

    const handleTagToggle = (tag: string) => {
        setFormData(prev => ({
            ...prev,
            tags: prev.tags.includes(tag)
                ? prev.tags.filter(t => t !== tag)
                : [...prev.tags, tag]
        }));
    };

    const renderStars = (key: string, rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
        const starSize = size === 'sm' ? 'h-4 w-4' : size === 'lg' ? 'h-6 w-6' : 'h-5 w-5';
        const displayRating = hoveredRatings[key] || rating;

        return (
            <div className="flex items-center space-x-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleRatingChange(key, star)}
                        onMouseEnter={() => handleHoverRating(key, star)}
                        onMouseLeave={() => handleHoverRating(key, 0)}
                        className={`transition-all duration-200 transform hover:scale-110 ${star <= displayRating ? 'text-yellow-400' : 'text-gray-300'
                            } ${starSize}`}
                    >
                        <Star className="fill-current" />
                    </button>
                ))}
            </div>
        );
    };

    const getRatingDescription = (rating: number) => {
        if (rating === 5) return "Excellent !";
        if (rating === 4) return "Très bien !";
        if (rating === 3) return "Bien";
        if (rating === 2) return "Moyen";
        if (rating === 1) return "À améliorer";
        return "";
    };

    const validateStep = (step: number) => {
        if (step === 1) {
            if (!formData.rating) return "Veuillez donner une note globale.";
            if (!formData.punctuality_rating) return "Veuillez évaluer la ponctualité.";
            if (!formData.quality_rating) return "Veuillez évaluer la qualité du travail.";
            if (!formData.communication_rating) return "Veuillez évaluer la communication.";
        }
        if (step === 2) {
            if (!formData.comment.trim()) return "Veuillez ajouter un commentaire.";
        }
        return null;
    };

    const handleNextStep = () => {
        const validationError = validateStep(currentStep);
        if (validationError) {
            setError(validationError);
            return;
        }
        setError(null);
        if (currentStep < totalSteps) {
            setCurrentStep(currentStep + 1);
        }
    };

    const handlePreviousStep = () => {
        setError(null);
        if (currentStep > 1) {
            setCurrentStep(currentStep - 1);
        }
    };

    const handleSubmit = async () => {
        const validationError = validateStep(currentStep);
        if (validationError) {
            setError(validationError);
            return;
        }

        setSubmitting(true);
        setError(null);

        try {
            const payload = {
                request: requestId,
                technician: technicianId,
                ...formData
            };

            const response = await fetchWithAuth('/depannage/api/reviews/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (response.ok) {
                onSuccess();
            } else {
                const data = await response.json();
                setError(data?.detail || 'Erreur lors de l\'envoi de l\'avis.');
            }
        } catch (err) {
            setError('Erreur réseau.');
        } finally {
            setSubmitting(false);
        }
    };

    const renderStep1 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Évaluation générale</h3>
                <p className="text-gray-600">Donnez votre avis sur l'intervention</p>
            </div>

            {/* Note globale */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <div className="text-center mb-4">
                    <Star className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                    <h4 className="font-semibold text-gray-800">Note globale</h4>
                    <p className="text-sm text-gray-500">Votre satisfaction générale</p>
                </div>
                <div className="flex justify-center mb-3">
                    {renderStars('rating', formData.rating, 'lg')}
                </div>
                {formData.rating > 0 && (
                    <p className="text-center text-sm text-gray-600">
                        {getRatingDescription(formData.rating)}
                    </p>
                )}
            </div>

            {/* Critères détaillés */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {ratingCriteria.slice(1).map((criterion) => (
                    <div key={criterion.key} className="bg-white rounded-xl p-4 border border-gray-200">
                        <div className="text-center mb-3">
                            <criterion.icon className="h-6 w-6 text-blue-500 mx-auto mb-1" />
                            <h5 className="font-medium text-gray-800 text-sm">{criterion.label}</h5>
                            <p className="text-xs text-gray-500">{criterion.description}</p>
                        </div>
                        <div className="flex justify-center mb-2">
                            {renderStars(criterion.key, formData[criterion.key as keyof ReviewFormData] as number, 'sm')}
                        </div>
                        {formData[criterion.key as keyof ReviewFormData] > 0 && (
                            <p className="text-center text-xs text-gray-600">
                                {getRatingDescription(formData[criterion.key as keyof ReviewFormData] as number)}
                            </p>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );

    const renderStep2 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Détails de l'intervention</h3>
                <p className="text-gray-600">Informations complémentaires</p>
            </div>

            {/* Commentaire principal */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Votre commentaire</h4>
                <textarea
                    value={formData.comment}
                    onChange={(e) => handleInputChange('comment', e.target.value)}
                    placeholder="Décrivez votre expérience avec ce technicien..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={4}
                />
            </div>

            {/* Informations supplémentaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <h5 className="font-medium text-gray-800 mb-3">Durée de l'intervention</h5>
                    <input
                        type="number"
                        value={formData.intervention_duration_minutes}
                        onChange={(e) => handleInputChange('intervention_duration_minutes', parseInt(e.target.value) || 0)}
                        placeholder="Minutes"
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <h5 className="font-medium text-gray-800 mb-3">Complexité du problème</h5>
                    <select
                        value={formData.problem_complexity}
                        onChange={(e) => handleInputChange('problem_complexity', e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                        {complexityOptions.map(option => (
                            <option key={option.value} value={option.value}>
                                {option.label} - {option.description}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            {/* Options binaires */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="font-medium text-gray-800">Intervention urgente</h5>
                            <p className="text-sm text-gray-500">L'intervention était-elle urgente ?</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.was_urgent}
                            onChange={(e) => handleInputChange('was_urgent', e.target.checked)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="font-medium text-gray-800">Pièces utilisées</h5>
                            <p className="text-sm text-gray-500">Des pièces ont-elles été utilisées ?</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.parts_used}
                            onChange={(e) => handleInputChange('parts_used', e.target.checked)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                    </div>
                </div>
            </div>

            {/* Garantie */}
            <div className="bg-white rounded-xl p-4 border border-gray-200">
                <div className="flex items-center justify-between mb-3">
                    <div>
                        <h5 className="font-medium text-gray-800">Garantie offerte</h5>
                        <p className="text-sm text-gray-500">Une garantie a-t-elle été offerte ?</p>
                    </div>
                    <input
                        type="checkbox"
                        checked={formData.warranty_offered}
                        onChange={(e) => handleInputChange('warranty_offered', e.target.checked)}
                        className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                </div>
                {formData.warranty_offered && (
                    <div className="mt-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Durée de garantie (jours)
                        </label>
                        <input
                            type="number"
                            value={formData.warranty_duration_days}
                            onChange={(e) => handleInputChange('warranty_duration_days', parseInt(e.target.value) || 0)}
                            className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        />
                    </div>
                )}
            </div>
        </div>
    );

    const renderStep3 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Feedback détaillé</h3>
                <p className="text-gray-600">Partagez vos impressions</p>
            </div>

            {/* Points positifs */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <ThumbsUp className="h-5 w-5 text-green-500 mr-2" />
                    Points positifs
                </h4>
                <textarea
                    value={formData.positive_aspects}
                    onChange={(e) => handleInputChange('positive_aspects', e.target.value)}
                    placeholder="Ce qui s'est bien passé..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                />
            </div>

            {/* Suggestions d'amélioration */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Edit3 className="h-5 w-5 text-orange-500 mr-2" />
                    Suggestions d'amélioration
                </h4>
                <textarea
                    value={formData.improvement_suggestions}
                    onChange={(e) => handleInputChange('improvement_suggestions', e.target.value)}
                    placeholder="Ce qui pourrait être amélioré..."
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                    rows={3}
                />
            </div>

            {/* Recommandations */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="font-medium text-gray-800">Recommanderait</h5>
                            <p className="text-sm text-gray-500">Recommandation générale</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.would_recommend}
                            onChange={(e) => handleInputChange('would_recommend', e.target.checked)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="font-medium text-gray-800">Utiliserait à nouveau</h5>
                            <p className="text-sm text-gray-500">Service futur</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.would_use_again}
                            onChange={(e) => handleInputChange('would_use_again', e.target.checked)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                    </div>
                </div>

                <div className="bg-white rounded-xl p-4 border border-gray-200">
                    <div className="flex items-center justify-between">
                        <div>
                            <h5 className="font-medium text-gray-800">Recommanderait aux amis</h5>
                            <p className="text-sm text-gray-500">Recommandation sociale</p>
                        </div>
                        <input
                            type="checkbox"
                            checked={formData.would_recommend_to_friends}
                            onChange={(e) => handleInputChange('would_recommend_to_friends', e.target.checked)}
                            className="h-5 w-5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                    </div>
                </div>
            </div>

            {/* Tags */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3 flex items-center">
                    <Tag className="h-5 w-5 text-purple-500 mr-2" />
                    Tags descriptifs
                </h4>
                <div className="flex flex-wrap gap-2">
                    {suggestedTags.map(tag => (
                        <button
                            key={tag}
                            type="button"
                            onClick={() => handleTagToggle(tag)}
                            className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${formData.tags.includes(tag)
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
                                }`}
                        >
                            {tag}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );

    const renderStep4 = () => (
        <div className="space-y-6">
            <div className="text-center mb-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Récapitulatif</h3>
                <p className="text-gray-600">Vérifiez vos réponses avant envoi</p>
            </div>

            {/* Résumé des notes */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-4">Notes attribuées</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {ratingCriteria.map(criterion => {
                        const rating = formData[criterion.key as keyof ReviewFormData] as number;
                        if (rating > 0) {
                            return (
                                <div key={criterion.key} className="text-center">
                                    <div className="flex justify-center mb-1">
                                        {renderStars(criterion.key, rating, 'sm')}
                                    </div>
                                    <p className="text-xs text-gray-600">{criterion.label}</p>
                                </div>
                            );
                        }
                        return null;
                    })}
                </div>
            </div>

            {/* Commentaire */}
            {formData.comment && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">Votre commentaire</h4>
                    <p className="text-gray-700">{formData.comment}</p>
                </div>
            )}

            {/* Recommandations */}
            <div className="bg-white rounded-xl p-6 border border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Recommandations</h4>
                <div className="space-y-2">
                    <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">
                            Recommandation générale: {formData.would_recommend ? 'Oui' : 'Non'}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">
                            Utiliserait à nouveau: {formData.would_use_again ? 'Oui' : 'Non'}
                        </span>
                    </div>
                    <div className="flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                        <span className="text-sm text-gray-700">
                            Recommanderait aux amis: {formData.would_recommend_to_friends ? 'Oui' : 'Non'}
                        </span>
                    </div>
                </div>
            </div>

            {/* Tags sélectionnés */}
            {formData.tags.length > 0 && (
                <div className="bg-white rounded-xl p-6 border border-gray-200">
                    <h4 className="font-semibold text-gray-800 mb-3">Tags sélectionnés</h4>
                    <div className="flex flex-wrap gap-2">
                        {formData.tags.map(tag => (
                            <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {tag}
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );

    const renderStep = () => {
        switch (currentStep) {
            case 1: return renderStep1();
            case 2: return renderStep2();
            case 3: return renderStep3();
            case 4: return renderStep4();
            default: return renderStep1();
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white border-b border-gray-200 p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-2xl font-bold text-gray-900">Avis détaillé</h2>
                        <button
                            onClick={onCancel}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Progress bar */}
                    <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-gray-700">
                                Étape {currentStep} sur {totalSteps}
                            </span>
                            <span className="text-sm text-gray-500">
                                {Math.round((currentStep / totalSteps) * 100)}% terminé
                            </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                            <div
                                className="bg-gradient-to-r from-blue-500 to-purple-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(currentStep / totalSteps) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Step indicators */}
                    <div className="flex justify-between">
                        {[1, 2, 3, 4].map((step) => (
                            <div
                                key={step}
                                className={`flex items-center ${step <= currentStep ? 'text-blue-600' : 'text-gray-400'
                                    }`}
                            >
                                <div
                                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step <= currentStep
                                            ? 'bg-blue-600 text-white'
                                            : 'bg-gray-200 text-gray-500'
                                        }`}
                                >
                                    {step}
                                </div>
                                {step < 4 && (
                                    <div
                                        className={`w-8 h-0.5 mx-2 ${step < currentStep ? 'bg-blue-600' : 'bg-gray-200'
                                            }`}
                                    />
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {error && (
                        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                            <div className="flex items-center">
                                <AlertCircle className="h-5 w-5 text-red-500 mr-2" />
                                <span className="text-red-700">{error}</span>
                            </div>
                        </div>
                    )}

                    {renderStep()}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-gray-200 p-6 rounded-b-2xl">
                    <div className="flex justify-between items-center">
                        <button
                            onClick={handlePreviousStep}
                            disabled={currentStep === 1}
                            className={`px-6 py-2 rounded-lg font-medium transition-colors ${currentStep === 1
                                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                                }`}
                        >
                            Précédent
                        </button>

                        <div className="flex space-x-3">
                            <button
                                onClick={onCancel}
                                className="px-6 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                            >
                                Annuler
                            </button>

                            {currentStep < totalSteps ? (
                                <button
                                    onClick={handleNextStep}
                                    className="px-6 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
                                >
                                    Suivant
                                </button>
                            ) : (
                                <button
                                    onClick={handleSubmit}
                                    disabled={submitting}
                                    className="px-6 py-2 bg-green-600 text-white rounded-lg font-medium hover:bg-green-700 transition-colors disabled:opacity-50"
                                >
                                    {submitting ? 'Envoi...' : 'Envoyer l\'avis'}
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default EnhancedReviewForm; 