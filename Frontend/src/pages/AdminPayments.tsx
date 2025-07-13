import React from "react";
import { CreditCard, Info, AlertTriangle } from "lucide-react";

const AdminPayments: React.FC = () => {
    return (
        <div className="min-h-screen bg-gray-50 py-8">
            <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
                {/* Header */}
                <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
                            <p className="text-gray-600 mt-2">
                                Système de paiement désactivé - Plateforme gratuite
                            </p>
                        </div>
                        <div className="flex items-center">
                            <CreditCard className="h-8 w-8 text-gray-400" />
                        </div>
                    </div>
                </div>

                {/* Message principal */}
                <div className="bg-white rounded-lg shadow-sm p-8 text-center">
                    <div className="mb-6">
                        <AlertTriangle className="h-16 w-16 text-yellow-500 mx-auto mb-4" />
                        <h2 className="text-2xl font-bold text-gray-900 mb-4">
                            Système de Paiement Désactivé
                    </h2>
                        <p className="text-lg text-gray-600 mb-6">
                            La plateforme est maintenant entièrement gratuite pour tous les techniciens.
                        </p>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-6">
                        <div className="flex items-start">
                            <Info className="h-6 w-6 text-blue-600 mr-3 mt-0.5" />
                            <div className="text-left">
                                <h3 className="font-semibold text-blue-900 mb-2">
                                    Changement de modèle économique
                                </h3>
                                <p className="text-blue-800 text-sm leading-relaxed">
                                    Notre plateforme a évolué vers un modèle gratuit pour tous les techniciens.
                                    Les fonctionnalités de paiement et d'abonnement ont été supprimées pour offrir
                                    un accès libre et sans restriction à tous les services.
                                </p>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
                        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                            <h4 className="font-semibold text-green-900 mb-2">✅ Accès Gratuit</h4>
                            <p className="text-green-800 text-sm">
                                Tous les techniciens ont un accès illimité à la plateforme
                            </p>
                        </div>
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <h4 className="font-semibold text-blue-900 mb-2">🔧 Services Complets</h4>
                            <p className="text-blue-800 text-sm">
                                Toutes les fonctionnalités sont disponibles sans restriction
                                        </p>
                                    </div>
                        <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                            <h4 className="font-semibold text-purple-900 mb-2">📊 Statistiques</h4>
                            <p className="text-purple-800 text-sm">
                                Les statistiques générales restent disponibles
                                            </p>
                                        </div>
                                    </div>

                    <div className="mt-8 p-4 bg-gray-50 rounded-lg">
                        <p className="text-gray-600 text-sm">
                            <strong>Note :</strong> Cette page a été mise à jour pour refléter le nouveau modèle économique.
                            Les anciennes fonctionnalités de paiement ne sont plus disponibles.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminPayments; 