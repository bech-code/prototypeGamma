import React, { useState, useEffect } from 'react';
import { Calendar, Star, Clock, FileText, CreditCard, MessageSquare, Phone, AlertCircle, CheckCircle, MapPin } from 'lucide-react';
import TechnicianMap from '../components/TechnicianMap';
import { useAuth } from '../contexts/AuthContext';
// import { Link } from 'react-router-dom'; // Removed for artifact compatibility
import AnimatedBackground from '../components/AnimatedBackground';
import customerVideo from '../assets/video/customer1-bg.mp4';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

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
  technician?: {
    id: number;
    user: {
      first_name: string;
      last_name: string;
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
  client: {
    address: string;
  };
  payment_status: string;
  estimated_price: number;
}

interface DashboardStats {
  total_requests: number;
  active_requests: number;
  completed_requests: number;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  is_read: boolean;
  created_at: string;
}

const CustomerDashboard = () => {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('requests');
  const [filterStatus, setFilterStatus] = useState('all');
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showOnlyIncoherent, setShowOnlyIncoherent] = useState(false);

  // Mapping quartiers -> communes (doit être le même que côté admin/technicien)
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

  const [suggestingRequestId, setSuggestingRequestId] = useState<number | null>(null);
  const [suggestQuartier, setSuggestQuartier] = useState('');
  const [suggestCommune, setSuggestCommune] = useState('');
  const [suggestionsList, setSuggestionsList] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const suggestionsListRef = React.useRef<HTMLDivElement>(null);
  const [suggestionSent, setSuggestionSent] = useState(false);

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
  useEffect(() => {
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

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      };

      // Fetch repair requests
      const requestsResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/repair-requests/', { headers });
      const requestsData = await requestsResponse.json();

      if (requestsResponse.ok) {
        setRepairRequests(requestsData.results || requestsData);
      }

      // Fetch notifications
      const notificationsResponse = await fetchWithAuth('http://localhost:8000/depannage/api/notifications/', { headers });
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.results || notificationsData || []);
      }

      // Fetch stats
      const statsResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/repair-requests/dashboard_stats/', { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = repairRequests.filter(request => {
    if (filterStatus === 'all') return true;
    return request.status === filterStatus;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'En attente' },
      'assigned': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'Assignée' },
      'in_progress': { bg: 'bg-orange-100', text: 'text-orange-800', label: 'En cours' },
      'completed': { bg: 'bg-green-100', text: 'text-green-800', label: 'Terminée' },
      'cancelled': { bg: 'bg-red-100', text: 'text-red-800', label: 'Annulée' }
    };

    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return (
      <span className={`px-2 py-1 ${config.bg} ${config.text} rounded-full text-xs font-medium`}>
        {config.label}
      </span>
    );
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
      year: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative text-white py-24 overflow-hidden">
        <AnimatedBackground
          videoSrc={customerVideo}
          overlayColor="rgba(0, 0, 0, 0.3)"
        />
        <div className="container mx-auto px-4 relative z-10">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Bienvenue, {user && user.first_name ? user.first_name : 'Utilisateurs'} !
            </h1>
            <p className="text-lg text-white mb-6">
              Gérez vos demandes de réparation et suivez leur progression.
            </p>
            <button
              className="inline-flex items-center px-6 py-3 bg-white text-blue-700 rounded-full font-medium hover:bg-blue-50 transition-colors duration-200 shadow-sm"
              onClick={() => window.location.href = '/booking'}
            >
              Nouvelle demande
            </button>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
        <div className="max-w-7xl mx-auto">
          {/* Carte de recherche de technicien */}
          <div className="relative rounded-2xl mb-10 p-0 overflow-hidden shadow-xl group border border-blue-100 bg-gradient-to-br from-blue-50 via-white to-blue-100 transition-all duration-300 hover:shadow-2xl">
            <div className="flex flex-col md:flex-row items-center md:items-start gap-6 p-8">
              <div className="flex-shrink-0 flex flex-col items-center justify-center w-full md:w-auto">
                <div className="w-20 h-20 rounded-full bg-blue-100 flex items-center justify-center shadow-lg mb-4">
                  <MapPin className="h-10 w-10 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-blue-900 mb-2 text-center">Trouver un technicien proche</h2>
                <p className="text-blue-700 text-center text-base mb-2">Visualisez les techniciens disponibles autour de vous et contactez-les en un clic.</p>
              </div>
              <div className="flex-1 w-full">
                <div className="rounded-xl overflow-hidden border border-blue-100 bg-white shadow-sm p-2 md:p-4">
                  <TechnicianMap />
                </div>
              </div>
            </div>
          </div>

          {/* Stats Cards */}
          {stats && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
              <div className="bg-white text-gray-800 rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Demandes actives</h3>
                  <Clock className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-3xl font-bold mb-2 text-blue-600">
                  {stats.active_requests}
                </p>
                <p className="text-gray-500">En cours de traitement</p>
              </div>

              <div className="bg-white text-gray-800 rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Demandes terminées</h3>
                  <CheckCircle className="h-6 w-6 text-green-500" />
                </div>
                <p className="text-3xl font-bold mb-2 text-green-500">
                  {stats.completed_requests}
                </p>
                <p className="text-gray-500">Services complétés</p>
              </div>

              <div className="bg-white text-gray-800 rounded-xl shadow-sm p-6 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold">Total des demandes</h3>
                  <MessageSquare className="h-6 w-6 text-purple-600" />
                </div>
                <p className="text-3xl font-bold mb-2 text-purple-600">
                  {stats.total_requests}
                </p>
                <p className="text-gray-500">Toutes vos demandes</p>
              </div>
            </div>
          )}

          {/* Main Content Section */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-10 border border-gray-100">
            <div className="border-b border-gray-100">
              <nav className="flex overflow-x-auto">
                <button
                  onClick={() => setActiveTab('requests')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === 'requests'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  Mes demandes ({repairRequests.length})
                </button>
                <button
                  onClick={() => setActiveTab('notifications')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === 'notifications'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
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
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterStatus === 'all'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        Toutes
                      </button>
                      <button
                        onClick={() => setFilterStatus('pending')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterStatus === 'pending'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        En attente
                      </button>
                      <button
                        onClick={() => setFilterStatus('assigned')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterStatus === 'assigned'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        Assignées
                      </button>
                      <button
                        onClick={() => setFilterStatus('in_progress')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterStatus === 'in_progress'
                          ? 'bg-orange-100 text-orange-800'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        En cours
                      </button>
                      <button
                        onClick={() => setFilterStatus('completed')}
                        className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${filterStatus === 'completed'
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
                      <MessageSquare className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">Aucune demande</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        {filterStatus === 'all'
                          ? 'Vous n\'avez pas encore créé de demande de réparation.'
                          : 'Aucune demande avec ce statut.'
                        }
                      </p>
                      {filterStatus === 'all' && (
                        <div className="mt-6">
                          <button
                            className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                            onClick={() => window.location.href = '/booking'}
                          >
                            Créer une demande
                          </button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {filteredRequests.map((request) => (
                        <div key={request.id} className="relative bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-2xl transition-all duration-200 group">
                          {/* Badge statut */}
                          <div className="absolute top-4 right-4 z-10">
                            {getStatusBadge(request.status)}
                          </div>
                          {/* Avatar ou icône */}
                          <div className="flex-shrink-0 flex flex-col items-center justify-center">
                            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl shadow-md">
                              {request.specialty_needed?.substring(0, 2) || 'RE'}
                            </div>
                            <div className={`w-3 h-3 rounded-full mt-2 ${getPriorityColor(request.priority)}`}></div>
                          </div>
                          {/* Contenu principal */}
                          <div className="flex-1 flex flex-col justify-between">
                            <div>
                              <h4 className="font-semibold text-lg text-gray-800 mb-1">{request.title}</h4>
                              <p className="text-gray-600 mb-3 line-clamp-2">{request.description}</p>
                              <div className="flex flex-wrap gap-3 mb-3">
                                <span className="inline-flex items-center px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                                  <Calendar className="h-4 w-4 mr-1" /> {formatDate(request.created_at)}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 bg-green-50 text-green-700 rounded-full text-xs font-medium">
                                  {request.specialty_needed}
                                </span>
                                <span className="inline-flex items-center px-3 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-medium">
                                  {request.estimated_cost?.toLocaleString()} FCFA
                                </span>
                              </div>
                              {/* Adresse et incohérence */}
                              <div className="flex items-center flex-wrap gap-2 text-gray-700 text-sm mb-2">
                                <MapPin className="h-4 w-4 mr-1 text-blue-400" />
                                {request.client.address}
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
                              </div>
                              {/* Technicien assigné */}
                              {request.technician && (
                                <div className="mt-3 p-4 bg-blue-50 rounded-lg flex flex-col md:flex-row items-center gap-4 shadow-inner">
                                  <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-200 flex items-center justify-center text-blue-700 font-bold text-lg">
                                    {request.technician.user.first_name?.charAt(0)}{request.technician.user.last_name?.charAt(0)}
                                  </div>
                                  <div className="flex-1">
                                    <div className="font-medium text-gray-900">{request.technician.user.first_name} {request.technician.user.last_name}</div>
                                    <div className="flex flex-wrap gap-3 text-xs text-gray-600 mt-1">
                                      <span><Phone className="inline h-4 w-4 mr-1 text-blue-400" />{request.technician.phone}</span>
                                      <span><Star className="inline h-4 w-4 mr-1 text-yellow-400" />{request.technician.average_rating}/5</span>
                                      <span>{request.technician.hourly_rate} FCFA/h</span>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                            {/* Actions */}
                            <div className="mt-4 flex flex-col md:flex-row gap-2 md:items-end md:justify-end">
                              {request.conversation && (
                                <button
                                  className="inline-flex items-center px-4 py-2 border border-blue-600 text-blue-600 rounded-full hover:bg-blue-50 transition-colors text-sm font-semibold shadow"
                                  onClick={() => window.location.href = `/chat/${request.conversation?.id}`}
                                >
                                  <MessageSquare className="h-4 w-4 mr-2" /> Messages
                                  {request.conversation.unread_count > 0 && (
                                    <span className="ml-2 bg-red-100 text-red-800 text-xs px-2 py-1 rounded-full">
                                      {request.conversation.unread_count}
                                    </span>
                                  )}
                                </button>
                              )}
                              {request.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    if (confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) {
                                      try {
                                        const token = localStorage.getItem('token');
                                        const response = await fetch(`http://127.0.0.1:8000/depannage/api/repair-requests/${request.id}/`, {
                                          method: 'PATCH',
                                          headers: {
                                            'Authorization': `Bearer ${token}`,
                                            'Content-Type': 'application/json',
                                          },
                                          body: JSON.stringify({ status: 'cancelled' }),
                                        });
                                        if (response.ok) {
                                          fetchData();
                                        } else {
                                          alert('Erreur lors de l\'annulation');
                                        }
                                      } catch (e) {
                                        alert('Erreur lors de l\'annulation');
                                      }
                                    }
                                  }}
                                  className="inline-flex items-center px-4 py-2 border border-red-600 text-red-600 rounded-full hover:bg-red-50 transition-colors text-sm font-semibold shadow"
                                >
                                  Annuler
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
                          className={`p-4 rounded-lg border transition-all duration-200 ${notification.is_read
                            ? 'bg-gray-50 border-gray-200'
                            : 'bg-blue-50 border-blue-200 shadow-sm'
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

          {/* Quick Actions Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center mb-6">
                <FileText className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Actions rapides</h3>
              </div>
              <div className="space-y-3">
                <button
                  className="block p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  onClick={() => window.location.href = '/booking'}
                >
                  <span className="text-sm font-medium text-gray-700">Nouvelle demande</span>
                </button>
                <button
                  className="block p-3 border border-gray-100 rounded-lg hover:bg-gray-50 transition-colors text-center"
                  onClick={() => window.location.href = '/profile'}
                >
                  <span className="text-sm font-medium text-gray-700">Mon profil</span>
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center mb-6">
                <CreditCard className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Support</h3>
              </div>
              <div className="space-y-3">
                <div className="p-3 border border-gray-100 rounded-lg">
                  <div className="text-sm font-medium text-gray-700">Besoin d'aide ?</div>
                  <div className="text-xs text-gray-500 mt-1">Contactez notre équipe</div>
                </div>
                <button className="w-full text-blue-600 text-sm font-medium hover:text-blue-700 transition-colors">
                  Contacter le support
                </button>
              </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <div className="flex items-center mb-6">
                <MessageSquare className="h-5 w-5 text-blue-600 mr-2" />
                <h3 className="text-lg font-semibold text-gray-800">Activité récente</h3>
              </div>
              <div className="space-y-3">
                {repairRequests.slice(0, 2).map((request) => (
                  <div key={request.id} className="p-3 border border-gray-100 rounded-lg">
                    <div className="text-sm font-medium text-gray-700 truncate">{request.title}</div>
                    <div className="text-xs text-gray-500 mt-1">{formatDate(request.created_at)}</div>
                  </div>
                ))}
                {repairRequests.length === 0 && (
                  <div className="p-3 border border-gray-100 rounded-lg text-center">
                    <div className="text-sm text-gray-500">Aucune activité récente</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDashboard;