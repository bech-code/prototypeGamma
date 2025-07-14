import React, { useState, useEffect } from 'react';
import { Calendar, Star, Clock, FileText, CreditCard, MessageSquare, Phone, AlertCircle, CheckCircle, MapPin, AlertTriangle } from 'lucide-react';
import TechnicianMap from '../components/TechnicianMap';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import AnimatedBackground from '../components/AnimatedBackground';
import customerVideo from '../assets/video/customer1-bg.mp4';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import ReviewReminder from '../components/ReviewReminder';
import LocationTrackingControl from '../components/LocationTrackingControl';
import LiveLocationMap from '../components/LiveLocationMap';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import L from 'leaflet';
import html2pdf from 'html2pdf.js';
import ErrorToast from '../components/ErrorToast';

interface Review {
  id?: number;
  rating: number;
  comment?: string;
  would_recommend?: boolean;
  punctuality_rating?: number;
  quality_rating?: number;
  communication_rating?: number;
  created_at?: string;
}

interface RepairRequest {
  id: number;
  title: string;
  description: string;
  specialty_needed: string;
  status: 'pending' | 'assigned' | 'in_progress' | 'completed' | 'cancelled' | 'draft';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  estimated_cost: number;
  created_at: string;
  assigned_at?: string;
  started_at?: string;
  completed_at?: string;
  latitude?: number;
  longitude?: number;
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
  review?: Review | null;
  no_show_count: number;
  mission_validated: boolean;
  uuid?: string;
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
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

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
    const filtered = Object.keys(quartierToCommune).filter(q => typeof q === 'string' && q.toLowerCase().includes(value.toLowerCase()));
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
      await fetchWithAuth(`/depannage/api/repair-requests/${requestId}/suggest_correction/`, {
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

  const [reviewForms, setReviewForms] = useState<Record<number, Partial<Review>>>({});
  const [reviewSubmitting, setReviewSubmitting] = useState<Record<number, boolean>>({});
  const [reviewSuccess, setReviewSuccess] = useState<Record<number, boolean>>({});
  const [reviewError, setReviewError] = useState<Record<number, string>>({});

  // Ajout d'un handler pour le formulaire d'avis
  const handleReviewChange = (requestId: number, field: keyof Review, value: any) => {
    setReviewForms(prev => ({
      ...prev,
      [requestId]: {
        ...prev[requestId],
        [field]: value,
      },
    }));
  };

  const handleReviewSubmit = async (request: RepairRequest) => {
    const form = reviewForms[request.id] || {};
    if (!form.rating) {
      setReviewError(prev => ({ ...prev, [request.id]: 'Veuillez donner une note.' }));
      return;
    }
    setReviewSubmitting(prev => ({ ...prev, [request.id]: true }));
    setReviewError(prev => ({ ...prev, [request.id]: '' }));
    try {
      const token = localStorage.getItem('token');
      const payload = {
        request: request.id,
        technician: request.technician?.id,
        rating: form.rating,
        comment: form.comment,
        would_recommend: form.would_recommend,
        punctuality_rating: form.punctuality_rating,
        quality_rating: form.quality_rating,
        communication_rating: form.communication_rating,
      };
      const res = await fetchWithAuth('/depannage/api/reviews/', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setReviewSuccess(prev => ({ ...prev, [request.id]: true }));
        // Rafraîchir la liste des demandes pour afficher l'avis
        fetchData();
      } else {
        const data = await res.json();
        setReviewError(prev => ({ ...prev, [request.id]: data?.detail || 'Erreur lors de l\'envoi de l\'avis.' }));
      }
    } catch (e) {
      setReviewError(prev => ({ ...prev, [request.id]: 'Erreur réseau.' }));
    } finally {
      setReviewSubmitting(prev => ({ ...prev, [request.id]: false }));
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
      const requestsResponse = await fetchWithAuth('/depannage/api/repair-requests/', { headers });
      const requestsData = await requestsResponse.json();

      if (requestsResponse.ok) {
        setRepairRequests(requestsData.results || requestsData);
      } else {
        let backendMsg = '';
        try {
          backendMsg = requestsData?.detail || requestsData?.message || JSON.stringify(requestsData);
        } catch { }
        setError(`Erreur lors du chargement des demandes (code ${requestsResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
      }

      // Fetch notifications
      const notificationsResponse = await fetchWithAuth('/depannage/api/notifications/', { headers });
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.results || notificationsData || []);
      } else {
        let backendMsg = '';
        try {
          const notificationsData = await notificationsResponse.json();
          backendMsg = notificationsData?.detail || notificationsData?.message || JSON.stringify(notificationsData);
        } catch { }
        setError(`Erreur lors du chargement des notifications (code ${notificationsResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
      }

      // Fetch stats
      const statsResponse = await fetchWithAuth('/depannage/api/repair-requests/dashboard_stats/', { headers });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        let backendMsg = '';
        try {
          const statsData = await statsResponse.json();
          backendMsg = statsData?.detail || statsData?.message || JSON.stringify(statsData);
        } catch { }
        setError(`Erreur lors du chargement des statistiques (code ${statsResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
      }

    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      setError('Erreur lors du chargement des données');
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
      'draft': { bg: 'bg-gray-200', text: 'text-gray-700', label: 'Brouillon' },
      'pending': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'EN ATTENTE DE MISE EN RELATION' },
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

  // Chercher la demande assignée la plus récente
  const assignedRequest = repairRequests.find(r => r.status === 'assigned');

  const [technicianLocation, setTechnicianLocation] = useState<{ latitude: number; longitude: number } | null>(null);
  const [eta, setEta] = useState<string | null>(null);
  const [noShowFeedback, setNoShowFeedback] = useState<string | null>(null);
  const [noShowDisabled, setNoShowDisabled] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Fonction pour calculer la distance (Haversine)
  function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  // Effet pour rafraîchir la position du technicien si demande assignée
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (assignedRequest && assignedRequest.technician) {
      const fetchTechnicianLocation = async () => {
        try {
          const token = localStorage.getItem('token');
          const res = await fetch(`/depannage/api/locations/?technician=${assignedRequest?.technician?.id}`,
            { headers: { 'Authorization': `Bearer ${token}` } });
          const data = await res.json();
          if (Array.isArray(data) && data.length > 0) {
            setTechnicianLocation({ latitude: data[0].latitude, longitude: data[0].longitude });
            // Calcul ETA
            if (assignedRequest.client && assignedRequest.client.address && data[0].latitude && data[0].longitude) {
              // Supposons que l'adresse du client contient la latitude/longitude (à adapter si besoin)
              // Ici, on suppose que la position du client est connue (à adapter selon votre modèle)
              // Pour la démo, on prend la position du technicien comme point A et une position fictive pour le client
              const clientLat = assignedRequest.latitude || 0;
              const clientLng = assignedRequest.longitude || 0;
              const dist = haversineDistance(data[0].latitude, data[0].longitude, clientLat, clientLng);
              // Vitesse moyenne 30 km/h
              const etaMinutes = dist > 0 ? Math.round((dist / 30) * 60) : 0;
              setEta(etaMinutes > 0 ? `${etaMinutes} min` : null);
            }
          }
        } catch (e) { }
      };
      fetchTechnicianLocation();
      interval = setInterval(fetchTechnicianLocation, 5000);
    }
    return () => { if (interval) clearInterval(interval); };
  }, [assignedRequest]);

  // Icône personnalisée : emoji 🚗 dans un cercle bleu clair avec ombre et animation pulse
  const carIcon = new L.DivIcon({
    html: `<div style="display:flex;align-items:center;justify-content:center;width:40px;height:40px;background:#e0f2fe;border-radius:50%;box-shadow:0 2px 8px #60a5fa55;">
      <span class='animate-pulse text-2xl' style='font-size:2rem;line-height:1;'>🚗</span>
    </div>`,
    className: '',
    iconSize: [40, 40],
    iconAnchor: [20, 40],
  });

  const interventionRequest = repairRequests.find(r => r.no_show_count > 2);

  const [showReceiptFor, setShowReceiptFor] = useState<number | null>(null);

  // Ajout d'un état pour le reçu de mission
  const [receiptData, setReceiptData] = useState<any>(null);
  const [validatingMission, setValidatingMission] = useState(false);

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
      {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}
      {interventionRequest && (
        <div className="sticky top-0 z-50 w-full bg-orange-500 text-white px-4 py-3 flex items-center justify-between shadow-lg animate-pulse border-b border-orange-700">
          <div className="flex items-center gap-3">
            <AlertTriangle className="h-6 w-6 animate-bounce" />
            <span className="font-bold">Intervention admin requise</span>
            <span className="hidden md:inline">Nous sommes désolés pour l'attente. Après plusieurs tentatives, un administrateur va vous accompagner personnellement.</span>
          </div>
          <a href="mailto:support@votre-plateforme.com" className="bg-white text-orange-600 font-semibold px-3 py-1 rounded shadow hover:bg-orange-200 hover:scale-105 transition-all ml-4">Contacter le support</a>
        </div>
      )}

      {/* Bannière technicien en route */}
      {assignedRequest && assignedRequest.technician && (
        <div className="fixed bottom-0 left-0 w-full bg-blue-50 text-blue-900 px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-2xl animate-fade-in z-50 border-t border-blue-200 rounded-t-xl">
          <div className="flex items-center gap-3">
            <span className="text-2xl animate-bounce">🚗</span>
            <span>
              <b className="text-blue-700">{assignedRequest?.technician?.user?.first_name} {assignedRequest?.technician?.user?.last_name}</b>
              {" "}a été assigné à votre demande <b>#{assignedRequest.id}</b> et arrive bientôt chez vous !
            </span>
          </div>
          <div className="flex gap-2 mt-2 md:mt-0">
            {/* Bouton Annuler (s'il existe) */}
            {assignedRequest.status === 'pending' && (
              <button
                className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold shadow"
                onClick={async () => {
                  if (confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) {
                    try {
                      const token = localStorage.getItem('token');
                      const response = await fetch(`/depannage/api/repair-requests/${assignedRequest.id}/`, {
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
              >
                Annuler
              </button>
            )}
            {/* Bouton Suivre la demande */}
            <button
              className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold shadow"
              onClick={() => navigate(`/tracking/${assignedRequest.id}`)}
            >
              Suivre la demande
            </button>
            {/* Bouton Appeler (s'il existe) */}
            {assignedRequest?.technician?.phone && (
              <a
                href={`tel:${assignedRequest?.technician?.phone}`}
                className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold shadow"
              >
                Appeler
              </a>
            )}
          </div>
          <div className="w-full text-xs text-blue-700 mt-2 md:mt-0 md:ml-4 opacity-80">
            Vous pouvez contacter votre technicien ou suivre la progression de votre demande à tout moment.
          </div>
        </div>
      )}

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
                <button
                  onClick={() => setActiveTab('location')}
                  className={`px-6 py-4 text-sm font-medium whitespace-nowrap ${activeTab === 'location'
                    ? 'border-b-2 border-blue-600 text-blue-600'
                    : 'text-gray-500 hover:text-gray-700'
                    }`}
                >
                  📍 Géolocalisation
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
                          <div className="absolute top-4 right-4 z-10 flex flex-col items-end gap-2">
                            {getStatusBadge(request.status)}
                            {request.no_show_count > 2 && (
                              <span className="inline-flex items-center px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs font-bold mt-1 animate-pulse border border-orange-300">
                                <AlertTriangle className="w-3 h-3 mr-1" /> Intervention admin requise
                              </span>
                            )}
                            {request.no_show_count > 0 && (
                              <span className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-medium mt-1">
                                <AlertCircle className="w-3 h-3 mr-1" /> {request.no_show_count} signalement{request.no_show_count > 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          {/* Avatar ou icône */}
                          <div className="flex-shrink-0 flex flex-col items-center justify-center">
                            <div className="h-14 w-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-bold text-xl shadow-md">
                              {request.specialty_needed?.substring(0, 2) || 'RE'}
                            </div>
                            <div className={`w-3 h-3 rounded-full mt-2 ${getPriorityColor(request.priority)}`}></div>
                          </div>
                          {/* Contenu principal */}
                          <div className="flex-1">
                            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-900 mb-1">{request.title}</h4>
                                <div className="text-sm text-gray-500 mb-1">{formatDate(request.created_at)}</div>
                              </div>
                              <div className="flex gap-2">
                                {(request.status === 'assigned' || request.status === 'in_progress') && request.technician && (
                                  <button
                                    onClick={() => navigate(`/tracking/${request.id}`)}
                                    className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-full hover:bg-green-700 transition-colors text-sm font-semibold shadow"
                                  >
                                    <Navigation className="h-4 w-4 mr-2" />
                                    Suivre en temps réel
                                  </button>
                                )}
                                {request.status === 'pending' && (
                                  <button
                                    onClick={async () => {
                                      if (confirm('Êtes-vous sûr de vouloir annuler cette demande ?')) {
                                        try {
                                          const token = localStorage.getItem('token');
                                          const response = await fetch(`/depannage/api/repair-requests/${request.id}/`, {
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
                                {request.status === 'draft' && (
                                  <>
                                    <button
                                      onClick={() => navigate(`/booking?draftId=${request.id}`)}
                                      className="inline-flex items-center px-4 py-2 border border-gray-400 text-gray-700 rounded-full hover:bg-gray-100 transition-colors text-sm font-semibold shadow"
                                    >
                                      Reprendre
                                    </button>
                                    <button
                                      onClick={async () => {
                                        if (window.confirm('Voulez-vous vraiment supprimer ce brouillon ? Cette action est irréversible.')) {
                                          try {
                                            const token = localStorage.getItem('token');
                                            const response = await fetch(`/depannage/api/repair-requests/${request.id}/`, {
                                              method: 'DELETE',
                                              headers: {
                                                'Authorization': `Bearer ${token}`,
                                                'Content-Type': 'application/json',
                                              },
                                            });
                                            if (response.ok) {
                                              setToast('Brouillon supprimé avec succès.');
                                              fetchData();
                                              setTimeout(() => setToast(null), 3500);
                                            } else {
                                              alert('Erreur lors de la suppression du brouillon.');
                                            }
                                          } catch (e) {
                                            alert('Erreur lors de la suppression du brouillon.');
                                          }
                                        }
                                      }}
                                      className="inline-flex items-center px-4 py-2 border border-red-600 text-red-600 rounded-full hover:bg-red-50 transition-colors text-sm font-semibold shadow ml-2"
                                    >
                                      Supprimer
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-gray-700 text-sm mt-2 line-clamp-2">{request.description}</div>
                          </div>
                          {/* Message intervention admin */}
                          {request.no_show_count > 2 && (
                            <div className="mt-2 flex flex-col md:flex-row items-center gap-2">
                              <div className="text-sm text-orange-700 font-semibold flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 animate-bounce" />
                                Nous sommes désolés pour l'attente. Un administrateur va vous recontacter pour cette demande.
                              </div>
                              <a href="mailto:support@votre-plateforme.com" className="bg-white text-orange-600 font-semibold px-3 py-1 rounded shadow hover:bg-orange-200 hover:scale-105 transition-all ml-4">Contacter le support</a>
                            </div>
                          )}
                          {request.status === 'completed' && !request.mission_validated && (
                            <button
                              onClick={async () => {
                                setValidatingMission(true);
                                try {
                                  const token = localStorage.getItem('token');
                                  const res = await fetch(`/depannage/api/repair-requests/${request.id}/validate_mission/`, {
                                    method: 'POST',
                                    headers: { 'Authorization': `Bearer ${token}` }
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    setReceiptData(data);
                                    setToast('Mission validée ! Un reçu vous a été envoyé.');
                                    fetchData();
                                  } else {
                                    setToast(data.error || 'Erreur lors de la validation.');
                                  }
                                } catch (e) {
                                  setToast('Erreur réseau lors de la validation.');
                                } finally {
                                  setValidatingMission(false);
                                }
                              }}
                              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm mt-2 disabled:opacity-50"
                              disabled={validatingMission}
                            >
                              <CheckCircle className="h-4 w-4 mr-2" />
                              {validatingMission ? 'Validation...' : 'Valider la fin de la mission'}
                            </button>
                          )}
                          {request.status === 'completed' && request.mission_validated && (
                            <div className="flex gap-2 mt-2">
                              <button
                                onClick={() => {
                                  setShowReceiptFor(request.id); setReceiptData({
                                    date: request.completed_at,
                                    technician: request.technician?.user?.first_name + ' ' + request.technician?.user?.last_name,
                                    service: request.title,
                                    address: request.client?.address,
                                    reference: request.uuid ?? request.id,
                                    payment: 'Effectué en main propre au technicien.'
                                  });
                                }}
                                className="inline-flex items-center px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-full shadow transition-colors"
                              >
                                <CheckCircle className="h-4 w-4 mr-1 text-green-600" /> Voir le reçu
                              </button>
                              {!request.review && (
                                <button
                                  onClick={() => navigate(`/review/${request.id}`)}
                                  className="inline-flex items-center px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-semibold rounded-full shadow transition-colors"
                                >
                                  <Star className="h-4 w-4 mr-1" /> Noter le technicien
                                </button>
                              )}
                              {request.review && (
                                <div className="inline-flex items-center px-3 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                                  <Star className="h-4 w-4 mr-1 text-yellow-400" /> Noté ({request.review.rating}/5)
                                </div>
                              )}
                            </div>
                          )}
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

              {activeTab === 'location' && (
                <div>
                  <h2 className="text-xl font-semibold mb-4 text-gray-800">Suivi de Géolocalisation</h2>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Contrôle du tracking pour le client */}
                    <div>
                      <LocationTrackingControl
                        userType="client"
                        userId={user?.client?.id || 0}
                        title="Contrôle de ma position"
                        description="Activez le suivi pour partager votre position en temps réel avec les techniciens"
                        onTrackingStart={() => console.log('📍 Tracking client démarré')}
                        onTrackingStop={() => console.log('🛑 Tracking client arrêté')}
                        onLocationUpdate={(lat, lng) => console.log('📍 Position client mise à jour:', lat, lng)}
                        onError={(error) => console.error('📍 Erreur client:', error)}
                      />
                    </div>

                    {/* Carte en temps réel pour le client */}
                    <div>
                      <LiveLocationMap
                        userType="client"
                        userId={user?.client?.id || 0}
                        title="Ma position en temps réel"
                        height="400px"
                        showGoogleMapsLink={true}
                        onLocationReceived={(lat, lng) => console.log('🗺️ Position client reçue sur carte:', lat, lng)}
                      />
                    </div>
                  </div>

                  {/* Section pour suivre la position des techniciens assignés */}
                  {repairRequests.filter(req => req.status === 'assigned' || req.status === 'in_progress').length > 0 && (
                    <div className="mt-8">
                      <h3 className="text-lg font-semibold mb-4 text-gray-800">Suivi des techniciens</h3>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {repairRequests
                          .filter(req => req.status === 'assigned' || req.status === 'in_progress')
                          .map(request => (
                            <div key={request.id} className="bg-white rounded-lg shadow-md p-4">
                              <h4 className="font-semibold text-gray-900 mb-2">
                                Technicien: {request.technician?.user?.first_name} {request.technician?.user?.last_name}
                              </h4>
                              <p className="text-sm text-gray-600 mb-4">
                                Demande: {request.title}
                              </p>

                              <LiveLocationMap
                                userType="technician"
                                userId={request.technician?.id || 0}
                                title={`Position de ${request.technician?.user?.first_name} ${request.technician?.user?.last_name}`}
                                height="300px"
                                showGoogleMapsLink={true}
                                onLocationReceived={(lat, lng) => {
                                  console.log(`🗺️ Position technicien ${request.technician?.user?.first_name}:`, lat, lng);
                                }}
                              />
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Notification pour noter les techniciens */}
          {repairRequests.filter(r => r.status === 'completed' && r.mission_validated && !r.review).length > 0 && (
            <ReviewReminder
              unratedRequests={repairRequests.filter(r => r.status === 'completed' && r.mission_validated && !r.review).length}
              onReviewClick={() => {
                const unratedRequest = repairRequests.find(r => r.status === 'completed' && r.mission_validated && !r.review);
                if (unratedRequest) {
                  navigate(`/review/${unratedRequest.id}`);
                }
              }}
              onDismiss={() => {
                // Optionnel : marquer comme vue pour ne plus l'afficher
                console.log('Notification fermée');
              }}
            />
          )}

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

      {/* Dans la bannière ou la section de suivi, afficher la carte si technicianLocation */}
      {assignedRequest && assignedRequest.technician && technicianLocation &&
        typeof technicianLocation.latitude === 'number' && typeof technicianLocation.longitude === 'number' &&
        !isNaN(technicianLocation.latitude) && !isNaN(technicianLocation.longitude) && (
          <div className="w-full max-w-2xl mx-auto my-6">
            <div className="bg-white rounded-lg shadow p-4 border border-blue-100">
              <h3 className="text-lg font-semibold mb-2 text-blue-900 flex items-center gap-2">
                <span>🗺</span> Suivi du technicien en temps réel
              </h3>
              <div className="w-full h-72 rounded-lg overflow-hidden mb-2">
                <MapContainer
                  center={[technicianLocation.latitude, technicianLocation.longitude]}
                  zoom={14}
                  style={{ height: '100%', width: '100%' }}
                >
                  <TileLayer
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    attribution='&copy; OpenStreetMap contributors'
                  />
                  <Marker position={[technicianLocation.latitude, technicianLocation.longitude]} icon={carIcon}>
                    <Popup>
                      <div className="text-center">
                        <div className="font-bold text-blue-700 mb-1">Technicien</div>
                        <div className="text-sm text-gray-800 mb-1">{assignedRequest?.technician?.user?.first_name} {assignedRequest?.technician?.user?.last_name}</div>
                        {assignedRequest?.technician?.phone && (
                          <a href={`tel:${assignedRequest?.technician?.phone}`} className="text-blue-600 underline text-sm block mb-1">{assignedRequest?.technician?.phone}</a>
                        )}
                        <div className="text-xs text-blue-700 font-semibold">{eta ? `ETA : ${eta}` : 'Calcul ETA...'}</div>
                      </div>
                    </Popup>
                  </Marker>
                </MapContainer>
              </div>
            </div>
          </div>
        )}

      {receiptData && (
        <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-md w-full relative border-2 border-green-600 animate-fade-in">
            <button onClick={() => { setShowReceiptFor(null); setReceiptData(null); }} className="absolute top-2 right-2 text-gray-400 hover:text-gray-700 text-2xl">✕</button>
            <div className="flex flex-col items-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600 mb-2 animate-bounce" />
              <h3 className="text-2xl font-bold text-green-700 mb-1">Reçu de mission</h3>
              <div className="text-sm text-gray-500 mb-2">Merci pour votre confiance ! 🙏</div>
            </div>
            <div id="receipt-pdf" className="space-y-2 text-base text-gray-800 font-mono border-t border-b border-gray-200 py-4 mb-4">
              <div><span className="font-semibold">Date :</span> {receiptData.date ? new Date(receiptData.date).toLocaleString('fr-FR') : ''}</div>
              <div><span className="font-semibold">Technicien :</span> {receiptData.technician}</div>
              <div><span className="font-semibold">Service :</span> {receiptData.service}</div>
              <div><span className="font-semibold">Adresse :</span> {receiptData.address}</div>
              <div><span className="font-semibold">Référence :</span> {receiptData.reference}</div>
              <div><span className="font-semibold">Paiement :</span> {receiptData.payment}</div>
              <div className="mt-4 text-green-700 font-semibold text-center">Merci pour votre confiance et votre fidélité ! 🙏</div>
              <div className="text-xs text-gray-500 text-center mt-2">Ce reçu fait foi de la bonne exécution de la mission et du paiement en main propre.</div>
            </div>
            <div className="flex flex-col md:flex-row gap-3 justify-center mt-2">
              <button
                onClick={() => {
                  const element = document.getElementById('receipt-pdf');
                  if (element) {
                    html2pdf().from(element).set({
                      margin: 0.5,
                      filename: `recu-mission-${receiptData.reference}.pdf`,
                      html2canvas: { scale: 2 },
                      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
                    }).save();
                  }
                }}
                className="px-4 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 font-semibold flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2V9a2 2 0 012-2h16a2 2 0 012 2v7a2 2 0 01-2 2h-2m-6 0v4m0 0h4m-4 0H8" /></svg>
                Télécharger le reçu (PDF)
              </button>
              <button
                onClick={async () => {
                  const shareText = `Reçu de mission\nR\u00e9f\u00e9rence : ${receiptData.reference}\nDate : ${receiptData.date ? new Date(receiptData.date).toLocaleString('fr-FR') : ''}\nTechnicien : ${receiptData.technician}\nService : ${receiptData.service}\nAdresse : ${receiptData.address}\nPaiement : ${receiptData.payment}`;
                  if (navigator.share) {
                    try {
                      await navigator.share({
                        title: 'Reçu de mission',
                        text: shareText
                      });
                    } catch (e) {
                      setToast('Partage annulé ou non supporté.');
                    }
                  } else {
                    try {
                      await navigator.clipboard.writeText(shareText);
                      setToast('Reçu copié dans le presse-papier !');
                    } catch {
                      setToast('Impossible de copier le reçu.');
                    }
                  }
                }}
                className="px-4 py-2 bg-yellow-500 text-white rounded shadow hover:bg-yellow-600 font-semibold flex items-center gap-2"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405M19 13V7a2 2 0 00-2-2h-4a2 2 0 00-2 2v6m0 4h.01" /></svg>
                Partager
              </button>
              <button
                onClick={() => { setShowReceiptFor(null); setReceiptData(null); }}
                className="px-4 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 font-semibold"
              >
                Fermer
              </button>
            </div>
            <div className="text-xs text-gray-400 mt-4 text-center">Besoin d'aide ? Contactez le support.</div>
          </div>
        </div>
      )}
    </div>
  );
}

export default CustomerDashboard;