import React, { useState, useEffect } from 'react';
import { Star, Heart, MessageSquare, Award, X } from 'lucide-react';

interface ReviewReminderProps {
    unratedRequests: number;
    onReviewClick: () => void;
    onDismiss: () => void;
}

const ReviewReminder: React.FC<ReviewReminderProps> = ({
    unratedRequests,
    onReviewClick,
    onDismiss
}) => {
    const [isVisible, setIsVisible] = useState(true);
    const [showConfetti, setShowConfetti] = useState(false);

    useEffect(() => {
        // Animation d'entrée
        const timer = setTimeout(() => {
            setIsVisible(true);
        }, 1000);

        return () => clearTimeout(timer);
    }, []);

    const handleReviewClick = () => {
        setShowConfetti(true);
        setTimeout(() => {
            onReviewClick();
        }, 500);
    };

    const handleDismiss = () => {
        setIsVisible(false);
        setTimeout(() => {
            onDismiss();
        }, 300);
    };

    if (!isVisible) return null;

    return (
        <div className="relative">
            {/* Confetti animation */}
            {showConfetti && (
                <div className="fixed inset-0 pointer-events-none z-50">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute animate-bounce"
                            style={{
                                left: `${Math.random() * 100}%`,
                                top: `${Math.random() * 100}%`,
                                animationDelay: `${Math.random() * 2}s`,
                                animationDuration: `${2 + Math.random() * 2}s`
                            }}
                        >
                            <span className="text-2xl">
                                {['⭐', '💫', '✨', '🎉', '🏆'][Math.floor(Math.random() * 5)]}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Notification principale */}
            <div className="bg-gradient-to-r from-yellow-50 via-orange-50 to-red-50 border border-yellow-200 rounded-xl p-6 mb-6 shadow-lg animate-pulse">
                <div className="flex items-center justify-between">
                    <div className="flex items-center">
                        <div className="relative">
                            <div className="absolute -inset-1 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full blur opacity-75 animate-ping"></div>
                            <Star className="h-8 w-8 text-yellow-500 mr-4 relative z-10 animate-bounce" />
                        </div>
                        <div>
                            <h3 className="text-lg font-semibold text-yellow-800 mb-1 flex items-center">
                                Aidez d'autres clients !
                                <span className="ml-2 bg-red-500 text-white text-xs rounded-full px-2 py-1 animate-pulse">
                                    {unratedRequests}
                                </span>
                            </h3>
                            <p className="text-yellow-700 text-sm">
                                Vous avez {unratedRequests} mission{unratedRequests > 1 ? 's' : ''} terminée{unratedRequests > 1 ? 's' : ''} sans avis.
                                Partagez votre expérience pour aider d'autres clients à choisir le bon technicien.
                            </p>
                            <div className="mt-2 flex items-center space-x-4 text-xs text-yellow-600">
                                <div className="flex items-center">
                                    <Heart className="h-3 w-3 mr-1" />
                                    Aidez la communauté
                                </div>
                                <div className="flex items-center">
                                    <MessageSquare className="h-3 w-3 mr-1" />
                                    Partagez votre expérience
                                </div>
                                <div className="flex items-center">
                                    <Award className="h-3 w-3 mr-1" />
                                    Gagnez des points
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className="flex items-center space-x-2">
                        <button
                            onClick={handleReviewClick}
                            className="inline-flex items-center px-4 py-2 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white font-semibold rounded-lg transition-all duration-300 shadow-lg hover:scale-105 transform hover:shadow-xl"
                        >
                            <Star className="h-4 w-4 mr-2" />
                            Noter maintenant
                        </button>
                        <button
                            onClick={handleDismiss}
                            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                </div>

                {/* Barre de progression */}
                <div className="mt-4">
                    <div className="flex justify-between text-xs text-yellow-600 mb-1">
                        <span>Progression des avis</span>
                        <span>{unratedRequests} en attente</span>
                    </div>
                    <div className="w-full bg-yellow-200 rounded-full h-2">
                        <div
                            className="bg-gradient-to-r from-yellow-400 to-orange-400 h-2 rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(10, 100 - (unratedRequests * 20))}%` }}
                        ></div>
                    </div>
                </div>

                {/* Avantages */}
                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="text-lg mb-1">🎯</div>
                        <div className="text-xs font-semibold text-yellow-800">Aide les autres</div>
                        <div className="text-xs text-yellow-600">Choisir le bon technicien</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="text-lg mb-1">⭐</div>
                        <div className="text-xs font-semibold text-yellow-800">Améliore la qualité</div>
                        <div className="text-xs text-yellow-600">Des services plus performants</div>
                    </div>
                    <div className="bg-white/50 rounded-lg p-3 text-center">
                        <div className="text-lg mb-1">🏆</div>
                        <div className="text-xs font-semibold text-yellow-800">Gagnez des points</div>
                        <div className="text-xs text-yellow-600">Accès aux meilleurs techniciens</div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReviewReminder; 