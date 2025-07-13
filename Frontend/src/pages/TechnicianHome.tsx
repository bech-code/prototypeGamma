import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { Wrench, Calendar, Star, MapPin, TrendingUp, Users, Clock, AlertCircle, CheckCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface DashboardStats {
  assigned_requests: number;
  completed_requests: number;
  pending_requests: number;
  specialty: string;
  today_requests: number;
  weekly_earnings: number;
  average_rating: number;
  total_reviews: number;
}

const TechnicianHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [recentRequests, setRecentRequests] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Récupérer les statistiques du tableau de bord
      const statsResponse = await fetchWithAuth('/depannage/api/technicians/dashboard/');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Récupérer les demandes récentes
      const requestsResponse = await fetchWithAuth('/depannage/api/repair-requests/?status=assigned&limit=5');
      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setRecentRequests(requestsData.results || []);
      }

      // Récupérer les notifications
      const notificationsResponse = await fetchWithAuth('/depannage/api/notifications/');
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.results || []);
      }

    } catch (err) {
      console.error('Erreur lors du chargement des données:', err);
      setError('Erreur lors du chargement des données');
    } finally {
      setLoading(false);
    }
  };

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'assigned': return 'Assignée';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
      default: return status;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur de chargement</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="bg-orange-600 text-white px-4 py-2 rounded-lg hover:bg-orange-700 transition-colors"
          >
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-orange-600 to-orange-800 text-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Bienvenue sur la page Technicien
            </h1>
            <p className="text-xl text-orange-100 mb-8">
              Gérez vos interventions, consultez votre planning et suivez vos performances.
            </p>

            {/* Statistiques en temps réel */}
            {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-orange-700/50 p-6 rounded-lg">
                  <Wrench className="w-8 h-8 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Demandes assignées</h3>
                  <p className="text-2xl font-bold">{stats.assigned_requests}</p>
                </div>
                <div className="bg-orange-700/50 p-6 rounded-lg">
                  <Calendar className="w-8 h-8 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Aujourd'hui</h3>
                  <p className="text-2xl font-bold">{stats.today_requests}</p>
                </div>
                <div className="bg-orange-700/50 p-6 rounded-lg">
                  <Star className="w-8 h-8 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Note moyenne</h3>
                  <p className="text-2xl font-bold">{stats.average_rating}/5</p>
                </div>
                <div className="bg-orange-700/50 p-6 rounded-lg">
                  <TrendingUp className="w-8 h-8 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Gains hebdo</h3>
                  <p className="text-2xl font-bold">{stats.weekly_earnings} FCFA</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Actions Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">
              Actions Rapides
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Interventions du Jour</h3>
                <p className="text-gray-600 mb-4">
                  Consultez et gérez vos interventions prévues pour aujourd'hui.
                </p>
                <button
                  onClick={() => handleNavigation('/technician/dashboard')}
                  className="text-orange-600 font-medium hover:text-orange-700 flex items-center"
                >
                  Voir le Planning →
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Rapports d'Intervention</h3>
                <p className="text-gray-600 mb-4">
                  Remplissez vos rapports d'intervention et mettez à jour le statut des missions.
                </p>
                <button
                  onClick={() => handleNavigation('/technician/dashboard?tab=requests')}
                  className="text-orange-600 font-medium hover:text-orange-700 flex items-center"
                >
                  Gérer les Rapports →
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Profil et Disponibilités</h3>
                <p className="text-gray-600 mb-4">
                  Gérez votre profil, vos compétences et vos disponibilités.
                </p>
                <button
                  onClick={() => handleNavigation('/technician/dashboard?tab=profile')}
                  className="text-orange-600 font-medium hover:text-orange-700 flex items-center"
                >
                  Modifier le Profil →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Demandes récentes */}
      {recentRequests.length > 0 && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Demandes Récentes</h2>
              <div className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Client
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Service
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Statut
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Date
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {recentRequests.map((request) => (
                        <tr key={request.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Users className="h-5 w-5 text-gray-400 mr-2" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">
                                  {request.client?.user?.username || 'Client inconnu'}
                                </div>
                                <div className="text-sm text-gray-500">
                                  {request.client?.phone || 'Téléphone non disponible'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">{request.title}</div>
                            <div className="text-sm text-gray-500">{request.specialty_needed}</div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(request.status)}`}>
                              {getStatusText(request.status)}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {formatDate(request.created_at)}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <button
                              onClick={() => handleNavigation(`/technician/dashboard?tab=requests&request=${request.id}`)}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              Voir détails
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Notifications */}
      {notifications.length > 0 && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Notifications Récentes</h2>
              <div className="space-y-4">
                {notifications.slice(0, 5).map((notification) => (
                  <div key={notification.id} className="bg-white rounded-lg shadow-md p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start">
                        <AlertCircle className="h-5 w-5 text-orange-500 mr-3 mt-1" />
                        <div>
                          <h3 className="text-sm font-medium text-gray-900">{notification.title}</h3>
                          <p className="text-sm text-gray-600 mt-1">{notification.message}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            {formatDate(notification.created_at)}
                          </p>
                        </div>
                      </div>
                      {!notification.is_read && (
                        <span className="inline-flex items-center px-2 py-1 text-xs font-medium bg-orange-100 text-orange-800 rounded-full">
                          Nouveau
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Statistiques détaillées */}
      {stats && (
        <section className="py-8">
          <div className="container mx-auto px-4">
            <div className="max-w-6xl mx-auto">
              <h2 className="text-2xl font-bold text-gray-900 mb-6">Vos Performances</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <CheckCircle className="h-8 w-8 text-green-500 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Missions terminées</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.completed_requests}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <Clock className="h-8 w-8 text-blue-500 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">En attente</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <Star className="h-8 w-8 text-yellow-500 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Avis reçus</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.total_reviews}</p>
                    </div>
                  </div>
                </div>
                <div className="bg-white rounded-lg shadow-md p-6">
                  <div className="flex items-center">
                    <TrendingUp className="h-8 w-8 text-purple-500 mr-4" />
                    <div>
                      <p className="text-sm font-medium text-gray-600">Spécialité</p>
                      <p className="text-2xl font-bold text-gray-900">{stats.specialty}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default TechnicianHome; 