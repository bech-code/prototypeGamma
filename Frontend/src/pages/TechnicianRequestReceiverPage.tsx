import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Settings, BarChart3, Map, Bell } from 'lucide-react';
import TechnicianRequestReceiver from '../components/TechnicianRequestReceiver';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface TechnicianStats {
    total_requests: number;
    completed_requests: number;
    pending_requests: number;
    average_rating: number;
    total_earnings: number;
    this_month_earnings: number;
}

const TechnicianRequestReceiverPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState<TechnicianStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [activeView, setActiveView] = useState<'requests' | 'stats' | 'settings'>('requests');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/depannage/api/repair-requests/dashboard_stats/');
            if (response.ok) {
                const data = await response.json();
                setStats(data);
            }
        } catch (error) {
            console.error('Erreur lors du chargement des statistiques:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600 mx-auto mb-4"></div>
                    <p className="text-lg text-gray-600">Chargement...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-orange-50">
            {/* Header avec navigation */}
            <div className="bg-white shadow-lg border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center py-4">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate('/technician/dashboard')}
                                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                            <div>
                                <h1 className="text-2xl font-bold text-gray-900">Réception des Demandes</h1>
                                <p className="text-gray-600">Gérez vos demandes en temps réel</p>
                            </div>
                        </div>

                        {/* Navigation des vues */}
                        <div className="flex space-x-2">
                            <button
                                onClick={() => setActiveView('requests')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeView === 'requests'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Bell className="h-4 w-4 inline mr-2" />
                                Demandes
                            </button>
                            <button
                                onClick={() => setActiveView('stats')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeView === 'stats'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <BarChart3 className="h-4 w-4 inline mr-2" />
                                Statistiques
                            </button>
                            <button
                                onClick={() => setActiveView('settings')}
                                className={`px-4 py-2 rounded-lg font-medium transition-colors ${activeView === 'settings'
                                    ? 'bg-orange-600 text-white'
                                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                                    }`}
                            >
                                <Settings className="h-4 w-4 inline mr-2" />
                                Paramètres
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Contenu selon la vue active */}
            {activeView === 'requests' && (
                <TechnicianRequestReceiver />
            )}

            {activeView === 'stats' && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Statistiques</h2>

                        {stats ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                                    <div className="bg-blue-50 rounded-lg p-6">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-blue-100 rounded-lg">
                                                <BarChart3 className="h-6 w-6 text-blue-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-blue-600">Total Demandes</p>
                                                <p className="text-2xl font-bold text-blue-900">{stats.total_requests}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-green-50 rounded-lg p-6">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-green-100 rounded-lg">
                                                <BarChart3 className="h-6 w-6 text-green-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-green-600">Terminées</p>
                                                <p className="text-2xl font-bold text-green-900">{stats.completed_requests}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-orange-50 rounded-lg p-6">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-orange-100 rounded-lg">
                                                <BarChart3 className="h-6 w-6 text-orange-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-orange-600">En Attente</p>
                                                <p className="text-2xl font-bold text-orange-900">{stats.pending_requests}</p>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="bg-purple-50 rounded-lg p-6">
                                        <div className="flex items-center">
                                            <div className="p-2 bg-purple-100 rounded-lg">
                                                <BarChart3 className="h-6 w-6 text-purple-600" />
                                            </div>
                                            <div className="ml-4">
                                                <p className="text-sm font-medium text-purple-600">Note Moyenne</p>
                                                <p className="text-2xl font-bold text-purple-900">{stats.average_rating}/5</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Revenus */}
                                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-lg p-6 text-white">
                                        <h3 className="text-lg font-semibold mb-2">Revenus Totaux</h3>
                                        <p className="text-3xl font-bold">{stats.total_earnings?.toLocaleString() || 0} FCFA</p>
                                    </div>

                                    <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg p-6 text-white">
                                        <h3 className="text-lg font-semibold mb-2">Ce Mois</h3>
                                        <p className="text-3xl font-bold">{stats.this_month_earnings?.toLocaleString() || 0} FCFA</p>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-12">
                                <BarChart3 className="mx-auto h-12 w-12 text-gray-400" />
                                <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune statistique disponible</h3>
                                <p className="mt-1 text-sm text-gray-500">
                                    Les statistiques apparaîtront ici une fois que vous aurez traité des demandes.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {activeView === 'settings' && (
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="bg-white rounded-xl shadow-lg p-6">
                        <h2 className="text-2xl font-bold text-gray-900 mb-6">Paramètres</h2>

                        <div className="space-y-6">
                            {/* Disponibilité */}
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Disponibilité</h3>
                                <div className="flex items-center space-x-4">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                            defaultChecked
                                        />
                                        <span className="ml-2 text-gray-700">Recevoir de nouvelles demandes</span>
                                    </label>
                                </div>
                            </div>

                            {/* Notifications */}
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                            defaultChecked
                                        />
                                        <span className="ml-2 text-gray-700">Nouvelles demandes</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                            defaultChecked
                                        />
                                        <span className="ml-2 text-gray-700">Messages clients</span>
                                    </label>
                                    <label className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                                            defaultChecked
                                        />
                                        <span className="ml-2 text-gray-700">Avis clients</span>
                                    </label>
                                </div>
                            </div>

                            {/* Zone de service */}
                            <div className="border border-gray-200 rounded-lg p-6">
                                <h3 className="text-lg font-semibold text-gray-900 mb-4">Zone de Service</h3>
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">
                                            Rayon de service (km)
                                        </label>
                                        <input
                                            type="number"
                                            min="1"
                                            max="100"
                                            defaultValue="30"
                                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                                        />
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        <Map className="h-4 w-4 text-gray-500" />
                                        <span className="text-sm text-gray-600">
                                            Votre position actuelle sera utilisée pour calculer les distances
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Boutons d'action */}
                            <div className="flex space-x-4 pt-6 border-t border-gray-200">
                                <button className="px-6 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition-colors">
                                    Sauvegarder
                                </button>
                                <button className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors">
                                    Réinitialiser
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TechnicianRequestReceiverPage; 