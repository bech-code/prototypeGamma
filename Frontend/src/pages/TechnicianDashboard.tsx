import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, MapPin, Phone, AlertCircle, CheckCircle, Wrench, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import TechnicianRequestsMap from '../components/TechnicianRequestsMap';

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
  conversation?: {
    id: number;
    unread_count: number;
  };
  latitude?: number;
  longitude?: number;
}

interface DashboardStats {
  assigned_requests: number;
  completed_requests: number;
  pending_requests: number;
  specialty: string;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

// Mapping quartiers -> communes (doit être le même que côté admin)
const quartierToCommune: Record<string, string> = {
  'Sotuba': 'Commune I',
  'Magnambougou': 'Commune VI',
  'Yirimadio': 'Commune VI',
  'Sabalibougou': 'Commune V',
  'Lafiabougou': 'Commune IV',
  'Badalabougou': 'Commune V',
  'Hamdallaye': 'Commune IV',
  'Missira': 'Commune II',
  'Niamakoro': 'Commune VI',
  'Banankabougou': 'Commune VI',
  'Daoudabougou': 'Commune V',
  'Djicoroni': 'Commune IV',
  'Sogoniko': 'Commune VI',
  'Faladié': 'Commune V',
  'Niaréla': 'Commune II',
  'Quinzambougou': 'Commune II',
  'Medina Coura': 'Commune II',
  'Bacodjicoroni': 'Commune V',
  'Torokorobougou': 'Commune V',
  'Sebenicoro': 'Commune IV',
  'Kalaban Coura': 'Commune V',
  'Kalabanbougou': 'Commune V',
  // ... compléter selon besoin
};

function isCoherent(quartier?: string, city?: string) {
  if (!quartier || !city) return true;
  const commune = quartierToCommune[quartier];
  if (!commune) return true;
  return city.toLowerCase().includes(commune.toLowerCase());
}

function extractQuartier(address: string) {
  if (!address) return '';
  const parts = address.split(',');
  return parts[0]?.trim() || '';
}

function extractCommune(address: string) {
  if (!address) return '';
  const parts = address.split(',');
  return parts[1]?.trim() || '';
}

const TechnicianDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'notifications'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [suggestingRequestId, setSuggestingRequestId] = useState<number | null>(null);
  const [suggestQuartier, setSuggestQuartier] = useState('');
  const [suggestCommune, setSuggestCommune] = useState('');
  const [suggestionsList, setSuggestionsList] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const suggestionsListRef = React.useRef<HTMLDivElement>(null);
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [showOnlyIncoherent, setShowOnlyIncoherent] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    // Debug: afficher les données utilisateur
    console.log('TechnicianDashboard - User object:', user);
    console.log('TechnicianDashboard - User.technician:', user?.technician);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Récupérer les demandes de réparation
      const requestsResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/repair-requests/', {
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
      const statsResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/repair-requests/dashboard_stats/', {
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
      const notificationsResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/notifications/', {
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

  const updateRequestStatus = async (requestId: number, newStatus: string) => {
    try {
      const response = await fetch(`http://127.0.0.1:8000/depannage/api/repair-requests/${requestId}/update_status/`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        // Recharger les données
        fetchDashboardData();
      } else {
        console.error('Erreur lors de la mise à jour du statut');
      }
    } catch (error) {
      console.error('Erreur lors de la mise à jour du statut:', error);
    }
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
      case 'assigned': return 'Assignée';
      case 'in_progress': return 'En cours';
      case 'completed': return 'Terminée';
      case 'cancelled': return 'Annulée';
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

  // Suggestions auto-complétion pour suggestion
  const handleSuggestQuartierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setSuggestQuartier(value);
    if (value.length < 1) {
      setSuggestionsList([]);
      setShowSuggestionsList(false);
      return;
    }
    const filtered = Object.keys(quartierToCommune).filter(q => q.toLowerCase().includes(value.toLowerCase()));
    setSuggestionsList(filtered);
    setShowSuggestionsList(filtered.length > 0);
  };
  const handleSuggestListClick = (quartier: string) => {
    setSuggestQuartier(quartier);
    setSuggestionsList([]);
    setShowSuggestionsList(false);
    setSuggestCommune(quartierToCommune[quartier] || '');
  };
  // Fermer suggestions si clic en dehors
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsListRef.current && !suggestionsListRef.current.contains(event.target as Node)) {
        setShowSuggestionsList(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Envoi suggestion
  const handleSendSuggestion = async (requestId: number) => {
    try {
      await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/repair-requests/${requestId}/suggest_correction/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quartier: suggestQuartier, commune: suggestCommune })
      });
      setSuggestionSent(true);
      setTimeout(() => setSuggestionSent(false), 3000);
      setSuggestingRequestId(null);
      setSuggestQuartier('');
      setSuggestCommune('');
    } catch (e) {
      alert('Erreur lors de l\'envoi de la suggestion');
    }
  };

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
                Tableau de bord technicien
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Bienvenue, {user?.username} - {stats?.specialty}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => window.location.href = '/technician/profile'}
                className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Mon profil
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
                  <p className="text-sm font-medium text-gray-500">Demandes assignées</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.assigned_requests}</p>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">En cours</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending_requests}</p>
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

            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Taux de réussite</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.assigned_requests > 0
                      ? Math.round((stats.completed_requests / stats.assigned_requests) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onglets */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8 px-6">
              <button
                onClick={() => setActiveTab('requests')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Mes demandes ({repairRequests.length})
              </button>
              <button
                onClick={() => setActiveTab('notifications')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'notifications'
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
                      className={`px-3 py-1 rounded-full text-sm font-medium ${filterStatus === 'all'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Toutes
                    </button>
                    <button
                      onClick={() => setFilterStatus('assigned')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${filterStatus === 'assigned'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Assignées
                    </button>
                    <button
                      onClick={() => setFilterStatus('in_progress')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${filterStatus === 'in_progress'
                        ? 'bg-orange-100 text-orange-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      En cours
                    </button>
                    <button
                      onClick={() => setFilterStatus('completed')}
                      className={`px-3 py-1 rounded-full text-sm font-medium ${filterStatus === 'completed'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                    >
                      Terminées
                    </button>
                  </div>
                </div>

                {/* Carte des interventions (à placer à l'endroit où la carte est affichée) */}
                <div className="flex items-center mb-2">
                  <input
                    type="checkbox"
                    id="showOnlyIncoherent"
                    checked={showOnlyIncoherent}
                    onChange={e => setShowOnlyIncoherent(e.target.checked)}
                    className="mr-2"
                  />
                  <label htmlFor="showOnlyIncoherent" className="text-sm">Afficher uniquement les incohérences</label>
                </div>
                <TechnicianRequestsMap
                  requests={repairRequests.map(req => ({
                    id: req.id,
                    latitude: req.latitude,
                    longitude: req.longitude,
                    address: req.client.address,
                    city: extractCommune(req.client.address),
                    quartier: extractQuartier(req.client.address),
                    client: req.client.user.email,
                    service: req.title,
                    status: req.status,
                    is_urgent: req.priority === 'urgent',
                  }))}
                  showOnlyIncoherent={showOnlyIncoherent}
                />

                {/* Liste des demandes */}
                {filteredRequests.length === 0 ? (
                  <div className="text-center py-12">
                    <Wrench className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune demande</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      {filterStatus === 'all'
                        ? 'Vous n\'avez pas encore de demandes assignées.'
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
                                <span className="font-medium">Coût estimé:</span> {request.estimated_cost !== undefined && request.estimated_cost !== null ? request.estimated_cost.toLocaleString() : "N/A"} FCFA
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
                                  <span className="text-sm text-gray-600">
                                    {request.client.address}
                                    {/* Badge incohérence */}
                                    {!isCoherent(extractQuartier(request.client.address), extractCommune(request.client.address)) && (
                                      <>
                                        <span className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-1 rounded ml-2">Incohérence quartier/commune</span>
                                        <button
                                          className="ml-2 text-xs text-blue-700 underline hover:text-blue-900"
                                          onClick={() => {
                                            setSuggestingRequestId(request.id);
                                            setSuggestQuartier('');
                                            setSuggestCommune('');
                                          }}
                                        >Suggérer correction</button>
                                        {suggestingRequestId === request.id && (
                                          <div className="mt-2 flex flex-col gap-2 bg-blue-50 p-2 rounded shadow max-w-xs">
                                            <label className="text-xs font-semibold">Quartier</label>
                                            <div className="relative">
                                              <input
                                                type="text"
                                                className="w-full p-1 border border-gray-300 rounded"
                                                value={suggestQuartier}
                                                onChange={handleSuggestQuartierChange}
                                                placeholder="Quartier correct"
                                              />
                                              {showSuggestionsList && suggestionsList.length > 0 && (
                                                <div ref={suggestionsListRef} className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-40 overflow-y-auto">
                                                  {suggestionsList.map((quartier, idx) => (
                                                    <div
                                                      key={quartier}
                                                      className="px-2 py-1 hover:bg-blue-50 cursor-pointer text-xs"
                                                      onClick={() => handleSuggestListClick(quartier)}
                                                    >
                                                      {quartier}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                            <label className="text-xs font-semibold">Commune</label>
                                            <input
                                              type="text"
                                              className="w-full p-1 border border-gray-300 rounded"
                                              value={suggestCommune}
                                              onChange={e => setSuggestCommune(e.target.value)}
                                              placeholder="Commune correcte"
                                            />
                                            <button
                                              className="mt-2 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-1 rounded"
                                              onClick={() => handleSendSuggestion(request.id)}
                                            >Envoyer</button>
                                            <button
                                              className="mt-1 text-xs text-gray-500 underline"
                                              onClick={() => setSuggestingRequestId(null)}
                                            >Annuler</button>
                                            {suggestionSent && (
                                              <div className="text-green-700 text-xs mt-2">Suggestion envoyée à l'administrateur !</div>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </span>
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
                          </div>

                          <div className="flex flex-col space-y-2 ml-4">
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

                            {/* Actions selon le statut */}
                            {request.status === 'pending' && (
                              <div className="flex space-x-2">
                                <button
                                  onClick={async () => {
                                    try {
                                      // Récupérer l'ID du technicien depuis les données utilisateur
                                      const technicianId = user.technician?.id;
                                      if (!technicianId) {
                                        alert('Erreur: ID du technicien non trouvé');
                                        return;
                                      }

                                      console.log('Tentative d\'assignation avec technician_id:', technicianId);

                                      const response = await fetch(`http://127.0.0.1:8000/depannage/api/repair-requests/${request.id}/assign_technician/`, {
                                        method: 'POST',
                                        headers: {
                                          'Authorization': `Bearer ${token}`,
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify({ technician_id: technicianId }),
                                      });

                                      if (response.ok) {
                                        const result = await response.json();
                                        console.log('Assignation réussie:', result);
                                        fetchDashboardData();
                                      } else {
                                        const errorData = await response.json();
                                        console.error('Erreur lors de l\'acceptation:', errorData);
                                        alert(`Erreur lors de l'acceptation de la demande: ${errorData.error || 'Erreur inconnue'}`);
                                      }
                                    } catch (e) {
                                      console.error('Erreur lors de l\'acceptation de la demande:', e);
                                      alert('Erreur lors de l\'acceptation de la demande');
                                    }
                                  }}
                                  className="inline-flex items-center px-3 py-2 border border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 transition-colors text-sm"
                                >
                                  Accepter
                                </button>
                              </div>
                            )}

                            {request.status === 'assigned' && (
                              <button
                                onClick={() => updateRequestStatus(request.id, 'in_progress')}
                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-orange-600 hover:bg-orange-700"
                              >
                                Commencer
                              </button>
                            )}

                            {request.status === 'in_progress' && (
                              <button
                                onClick={() => updateRequestStatus(request.id, 'completed')}
                                className="inline-flex items-center px-3 py-2 border border-transparent shadow-sm text-sm leading-4 font-medium rounded-md text-white bg-green-600 hover:bg-green-700"
                              >
                                Terminer
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
                        className={`p-4 rounded-lg border ${notification.is_read ? 'bg-gray-50 border-gray-200' : 'bg-blue-50 border-blue-200'
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
    </div>
  );
};

export default TechnicianDashboard;