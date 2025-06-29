import React, { useState, useEffect } from 'react';
import { Users, Wrench, Clock, CheckCircle, AlertCircle, TrendingUp, MapPin, Phone, Star, MessageSquare } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface RepairRequest {
  id: number;
  title: string;
  description: string;
  specialty_needed: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_cost: number;
  created_at: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  client: {
    id: number;
    user: {
      username: string;
      email: string;
    };
    phone: string;
    address: string;
  };
  technician?: {
    id: number;
    user: {
      username: string;
      email: string;
    };
    phone: string;
    hourly_rate: number;
    average_rating: number;
  };
  conversation?: {
    id: number;
    unread_count: number;
  };
}

interface Technician {
  id: number;
  user: {
    username: string;
    email: string;
  };
  phone: string;
  specialty: string;
  years_experience: number;
  hourly_rate: number;
  average_rating: number;
  total_jobs: number;
  is_available: boolean;
  is_verified: boolean;
}

interface DashboardStats {
  total_requests: number;
  pending_requests: number;
  in_progress_requests: number;
  completed_requests: number;
  specialty_stats: Array<{
    specialty_needed: string;
    count: number;
  }>;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<Technician[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'technicians' | 'notifications'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Récupérer les demandes de réparation
      const requestsResponse = await fetch('http://127.0.0.1:8000/depannage/api/repair-requests/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        setRepairRequests(data.results || data || []);
      }
      
      // Récupérer les statistiques
      const statsResponse = await fetch('http://127.0.0.1:8000/depannage/api/repair-requests/dashboard_stats/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
      
      // Récupérer les notifications
      const notificationsResponse = await fetch('http://127.0.0.1:8000/depannage/api/notifications/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.results || notificationsData || []);
      }
      
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchAvailableTechnicians = async (specialty: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/depannage/api/repair-requests/available_technicians/?specialty=${specialty}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      
      if (response.ok) {
        const techniciansData = await response.json();
        setAvailableTechnicians(techniciansData);
      }
    } catch (error) {
      console.error('Erreur lors du chargement des techniciens:', error);
    }
  };

  const assignTechnician = async (requestId: number, technicianId: number) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/depannage/api/repair-requests/${requestId}/assign_technician/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ technician_id: technicianId }),
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedRequest(null);
        fetchDashboardData();
      } else {
        console.error('Erreur lors de l\'assignation');
      }
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
    }
  };

  const openAssignModal = (request: RepairRequest) => {
    setSelectedRequest(request);
    fetchAvailableTechnicians(request.specialty_needed);
    setShowAssignModal(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'assigned': return 'bg-blue-100 text-blue-800';
      case 'in_progress': return 'bg-orange-100 text-orange-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return 'En attente';
      case 'assigned': return 'Technicien assigné';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminé';
      case 'cancelled': return 'Annulé';
      default: return status;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
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

  const filteredRequests = repairRequests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Tableau de bord administrateur
            </h1>
              <p className="mt-1 text-sm text-gray-500">
                Bienvenue, {user?.username}
            </p>
              </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/admin/users'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Gérer les utilisateurs
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Statistiques */}
        {stats && (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Wrench className="h-6 w-6 text-blue-600" />
                    </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total des demandes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total_requests}</p>
                </div>
                </div>
              </div>
              
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                    </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">En attente</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
                </div>
                </div>
              </div>
              
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-orange-600" />
                    </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">En cours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.in_progress_requests}</p>
                </div>
                </div>
              </div>
              
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Terminées</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completed_requests}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistiques par spécialité */}
        {stats?.specialty_stats && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Demandes par spécialité</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {stats.specialty_stats.map((specialty) => (
                <div key={specialty.specialty_needed} className="text-center">
                  <p className="text-2xl font-bold text-blue-600">{specialty.count}</p>
                  <p className="text-sm text-gray-500">{specialty.specialty_needed}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'requests'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Demandes ({repairRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('technicians')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'technicians'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Techniciens
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === 'notifications'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Notifications ({notifications.filter(n => !n.is_read).length})
              </button>
            </nav>
          </div>

                <div className="p-6">
            {activeTab === 'requests' && (
              <div>
                {/* Filtres */}
                <div className="mb-6">
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filterStatus === 'all'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Toutes
                    </button>
                    <button
                      onClick={() => setFilterStatus('pending')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filterStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      En attente
                    </button>
                    <button
                      onClick={() => setFilterStatus('assigned')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filterStatus === 'assigned'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Assignées
                    </button>
                    <button
                      onClick={() => setFilterStatus('in_progress')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filterStatus === 'in_progress'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      En cours
                    </button>
                    <button
                      onClick={() => setFilterStatus('completed')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${
                        filterStatus === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Terminées
                    </button>
                </div>
              </div>

                {/* Liste des demandes */}
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune demande</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filterStatus === 'all' 
                        ? 'Aucune demande de réparation.'
                        : 'Aucune demande avec ce statut.'
                      }
                    </p>
                </div>
                ) : (
                  <div className="space-y-4">
                    {filteredRequests.map((request) => (
                      <div key={request.id} className="border border-gray-200 rounded-lg p-6 hover:shadow-md transition-shadow">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3 mb-2">
                              <h3 className="text-lg font-medium text-gray-900">{request.title}</h3>
                              <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(request.status)}`}>
                                {getStatusText(request.status)}
                              </span>
                              <div className={`w-3 h-3 rounded-full ${getPriorityColor(request.priority)}`}></div>
                            </div>
                            
                            <p className="text-gray-600 mb-3">{request.description}</p>
                            
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-500 mb-4">
                              <div>
                                <span className="font-medium">Spécialité:</span> {request.specialty_needed}
                              </div>
                              <div>
                                <span className="font-medium">Coût estimé:</span> {request.estimated_cost.toLocaleString()} FCFA
                        </div>
                        <div>
                                <span className="font-medium">Créée le:</span> {formatDate(request.created_at)}
                          </div>
                              <div>
                                <span className="font-medium">Client:</span> {request.client.user.username}
                        </div>
                      </div>

                            {/* Informations du client */}
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                              <h4 className="font-medium text-gray-900 mb-2">Informations client</h4>
                              <div className="flex items-center space-x-4">
                                <div className="flex items-center space-x-2">
                                  <MapPin className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{request.client.address}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Phone className="h-4 w-4 text-gray-400" />
                                  <span className="text-sm text-gray-600">{request.client.phone}</span>
                  </div>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-gray-600">{request.client.user.email}</span>
                </div>
              </div>
            </div>

                            {/* Informations du technicien assigné */}
                            {request.technician && (
                              <div className="mt-4 p-4 bg-blue-50 rounded-lg">
                                <h4 className="font-medium text-gray-900 mb-2">Technicien assigné</h4>
                                <div className="flex items-center space-x-4">
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">{request.technician.user.username}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Phone className="h-4 w-4 text-gray-400" />
                                    <span className="text-sm text-gray-600">{request.technician.phone}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Star className="h-4 w-4 text-yellow-400" />
                                    <span className="text-sm text-gray-600">{request.technician.average_rating}/5</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-sm text-gray-600">{request.technician.hourly_rate} FCFA/h</span>
                                  </div>
                                </div>
                </div>
                            )}

                            {request.conversation && (
                              <button
                                onClick={() => window.location.href = `/chat/${request.conversation.id}`}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Messages
                                {request.conversation.unread_count > 0 && (
                                  <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                    {request.conversation.unread_count}
                                  </span>
                                )}
                              </button>
                            )}
                            </div>
                          
                          <div className="flex flex-col space-y-2 ml-4">
                            {request.status === 'pending' && (
                              <button
                                onClick={() => openAssignModal(request)}
                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                              >
                                Assigner un technicien
                              </button>
                            )}
                            
                            {request.status === 'assigned' && (
                              <button
                                onClick={() => openAssignModal(request)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm leading-4 font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                              >
                                Réassigner
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'technicians' && (
              <div>
                <div className="text-center py-12">
                  <Users className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">Gestion des techniciens</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Interface de gestion des techniciens à venir.
                  </p>
                </div>
              </div>
            )}

            {activeTab === 'notifications' && (
              <div>
                {notifications.length === 0 ? (
                  <div className="text-center py-12">
                    <AlertCircle className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune notification</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      Vous n'avez pas encore de notifications.
                    </p>
                </div>
                ) : (
                  <div className="space-y-4">
                    {notifications.map((notification) => (
                      <div
                        key={notification.id}
                        className={`p-4 rounded-lg border ${
                          notification.is_read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h4 className={`font-medium ${notification.is_read ? 'text-gray-900' : 'text-blue-900'}`}>
                              {notification.title}
                            </h4>
                            <p className={`mt-1 text-sm ${notification.is_read ? 'text-gray-600' : 'text-blue-700'}`}>
                              {notification.message}
                            </p>
                            <p className="mt-2 text-xs text-gray-500">
                              {formatDate(notification.created_at)}
                            </p>
                          </div>
                          {!notification.is_read && (
                            <div className="ml-4">
                              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                        </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal d'assignation */}
      {showAssignModal && selectedRequest && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Assigner un technicien à la demande #{selectedRequest.id}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Spécialité requise: {selectedRequest.specialty_needed}
              </p>
              
              {availableTechnicians.length === 0 ? (
                <p className="text-sm text-gray-500">Aucun technicien disponible pour cette spécialité.</p>
              ) : (
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {availableTechnicians.map((technician) => (
                    <div
                      key={technician.id}
                      className="p-3 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer"
                      onClick={() => assignTechnician(selectedRequest.id, technician.id)}
                    >
                      <div className="flex justify-between items-center">
                          <div>
                          <p className="font-medium text-gray-900">{technician.user.username}</p>
                          <p className="text-sm text-gray-500">{technician.specialty}</p>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 text-yellow-400" />
                            <span className="text-sm">{technician.average_rating}/5</span>
                          </div>
                          <p className="text-sm text-gray-500">{technician.hourly_rate} FCFA/h</p>
                        </div>
                      </div>
                      </div>
                    ))}
                </div>
              )}
              
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                >
                  Annuler
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;