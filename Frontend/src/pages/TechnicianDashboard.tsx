import React, { useState, useEffect } from 'react';
import { Clock, MessageSquare, MapPin, Phone, AlertCircle, CheckCircle, Wrench, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import TechnicianRequestsMap from '../components/TechnicianRequestsMap';
import * as XLSX from 'xlsx';
import { Bar, Pie, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  PointElement,
  LineElement,
  Filler
} from 'chart.js';
import jsPDF from 'jspdf';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

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

interface Review {
  id: number;
  rating: number;
  comment?: string;
  would_recommend?: boolean;
  punctuality_rating?: number;
  quality_rating?: number;
  communication_rating?: number;
  client_name?: string;
  created_at?: string;
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
  const [activeTab, setActiveTab] = useState<'requests' | 'notifications' | 'reviews'>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [suggestingRequestId, setSuggestingRequestId] = useState<number | null>(null);
  const [suggestQuartier, setSuggestQuartier] = useState('');
  const [suggestCommune, setSuggestCommune] = useState('');
  const [suggestionsList, setSuggestionsList] = useState<string[]>([]);
  const [showSuggestionsList, setShowSuggestionsList] = useState(false);
  const suggestionsListRef = React.useRef<HTMLDivElement>(null);
  const [suggestionSent, setSuggestionSent] = useState(false);
  const [showOnlyIncoherent, setShowOnlyIncoherent] = useState(false);
  const [receivedReviews, setReceivedReviews] = useState<Review[]>([]);
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [reviewSearch, setReviewSearch] = useState('');
  const [reviewMinRating, setReviewMinRating] = useState(1);
  const [reviewOnlyRecommended, setReviewOnlyRecommended] = useState(false);
  const [reviewPage, setReviewPage] = useState(1);
  const [reviewSort, setReviewSort] = useState<'date_desc' | 'date_asc' | 'note_desc' | 'note_asc'>('date_desc');
  const [reviewPeriod, setReviewPeriod] = useState<'all' | '7d' | '30d'>('all');
  const REVIEWS_PER_PAGE = 10;
  const [globalAvg, setGlobalAvg] = useState<number | null>(null);

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
    } catch {
      alert('Erreur lors de l\'envoi de la suggestion');
    }
  };

  // Charger les avis reçus au montage ou quand l'onglet est activé
  useEffect(() => {
    if (activeTab === 'reviews' && receivedReviews.length === 0 && !loadingReviews) {
      setLoadingReviews(true);
      fetchWithAuth('http://127.0.0.1:8000/depannage/api/reviews/received/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then(res => res.json())
        .then(data => setReceivedReviews(data))
        .catch(() => setReceivedReviews([]))
        .finally(() => setLoadingReviews(false));
    }
  }, [activeTab, token]);

  // Filtrage période + note (comme admin)
  function filterByPeriod<T extends { created_at?: string }>(arr: T[], period: 'all' | '7d' | '30d') {
    if (period === 'all') return arr;
    const now = new Date();
    const days = period === '7d' ? 7 : 30;
    return arr.filter(item => {
      const d = new Date(item.created_at || '');
      return !isNaN(d.getTime()) && (now.getTime() - d.getTime()) <= days * 24 * 60 * 60 * 1000;
    });
  }
  const filteredReviews = receivedReviews
    .filter(r => (reviewSearch === '' || (r.client_name?.toLowerCase().includes(reviewSearch.toLowerCase()) || r.comment?.toLowerCase().includes(reviewSearch.toLowerCase())))
      && (r.rating >= reviewMinRating)
      && (!reviewOnlyRecommended || r.would_recommend))
    ;
  const filteredAndPeriodReviews = filterByPeriod(filteredReviews, reviewPeriod);
  const totalPages = Math.ceil(filteredAndPeriodReviews.length / REVIEWS_PER_PAGE);
  const sortedReviews = [...filteredAndPeriodReviews].sort((a, b) => {
    if (reviewSort === 'date_desc') return (b.created_at || '').localeCompare(a.created_at || '');
    if (reviewSort === 'date_asc') return (a.created_at || '').localeCompare(b.created_at || '');
    if (reviewSort === 'note_desc') return b.rating - a.rating;
    if (reviewSort === 'note_asc') return a.rating - b.rating;
    return 0;
  });
  const paginatedReviews = sortedReviews.slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE);

  // Fonction d'export Excel
  function exportReviewsToExcel() {
    const headers = ['Client', 'Date', 'Note', 'Recommandé', 'Ponctualité', 'Qualité', 'Communication', 'Commentaire'];
    const rows = filteredAndPeriodReviews.map(r => [
      r.client_name || '',
      r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : '',
      r.rating,
      r.would_recommend ? 'Oui' : 'Non',
      r.punctuality_rating || '',
      r.quality_rating || '',
      r.communication_rating || '',
      r.comment || ''
    ]);
    const ws = XLSX.utils.aoa_to_sheet([headers, ...rows]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Avis reçus');
    XLSX.writeFile(wb, 'avis-recus.xlsx');
  }

  // Fonction d'export PDF (comme admin)
  function exportReviewsToPDF() {
    const doc = new jsPDF();
    doc.text('Avis reçus', 10, 10);
    let y = 20;
    filteredAndPeriodReviews.forEach((r, i) => {
      doc.text(`${i + 1}. ${r.client_name || ''} - ${r.rating}/5 - ${r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : ''}`, 10, y);
      y += 7;
      if (r.comment) {
        doc.text(r.comment, 12, y);
        y += 7;
      }
      if (y > 270) { doc.addPage(); y = 20; }
    });
    doc.save('avis-recus.pdf');
  }

  // Export CSV
  function exportReviewsToCSV() {
    const headers = ['Client', 'Date', 'Note', 'Recommandé', 'Ponctualité', 'Qualité', 'Communication', 'Commentaire'];
    const rows = filteredAndPeriodReviews.map(r => [
      r.client_name || '',
      r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : '',
      r.rating,
      r.would_recommend ? 'Oui' : 'Non',
      r.punctuality_rating || '',
      r.quality_rating || '',
      r.communication_rating || '',
      r.comment ? '"' + r.comment.replace(/"/g, '""') + '"' : ''
    ]);
    const csv = [headers, ...rows].map(row => row.join(';')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'avis-recus.csv';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Export JSON
  function exportReviewsToJSON() {
    const blob = new Blob([JSON.stringify(filteredAndPeriodReviews, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'avis-recus.json';
    a.click();
    URL.revokeObjectURL(url);
  }

  // Comparatif moyenne plateforme
  useEffect(() => {
    fetch('http://127.0.0.1:8000/depannage/api/repair-requests/project_statistics/')
      .then(r => r.json())
      .then(data => setGlobalAvg(data?.overview?.avg_rating || null));
  }, []);

  // Stats par critère
  const avgPunctuality = filteredAndPeriodReviews.length ? (filteredAndPeriodReviews.reduce((sum, r) => sum + (r.punctuality_rating || 0), 0) / filteredAndPeriodReviews.length).toFixed(2) : '-';
  const avgQuality = filteredAndPeriodReviews.length ? (filteredAndPeriodReviews.reduce((sum, r) => sum + (r.quality_rating || 0), 0) / filteredAndPeriodReviews.length).toFixed(2) : '-';
  const avgCommunication = filteredAndPeriodReviews.length ? (filteredAndPeriodReviews.reduce((sum, r) => sum + (r.communication_rating || 0), 0) / filteredAndPeriodReviews.length).toFixed(2) : '-';

  // Top clients
  const topClients = (() => {
    const map = new Map<string, number>();
    filteredAndPeriodReviews.forEach(r => {
      if (r.client_name) map.set(r.client_name, (map.get(r.client_name) || 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  })();

  // Statistiques sur les avis filtrés
  const reviewStats = {
    count: filteredAndPeriodReviews.length,
    avg: filteredAndPeriodReviews.length ? (filteredAndPeriodReviews.reduce((sum, r) => sum + r.rating, 0) / filteredAndPeriodReviews.length).toFixed(2) : '-',
    recommend: filteredAndPeriodReviews.length ? Math.round(filteredAndPeriodReviews.filter(r => r.would_recommend).length * 100 / filteredAndPeriodReviews.length) : 0,
    byNote: [1, 2, 3, 4, 5].map(n => filteredAndPeriodReviews.filter(r => r.rating === n).length),
    byDate: (() => {
      const map = new Map();
      filteredAndPeriodReviews.forEach(r => {
        if (r.created_at) {
          const d = new Date(r.created_at).toLocaleDateString('fr-FR');
          map.set(d, (map.get(d) || 0) + 1);
        }
      });
      return Array.from(map.entries()).sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime());
    })()
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section orange */}
      <section className="relative bg-gradient-to-r from-orange-600 to-orange-800 text-white py-20 mb-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Tableau de bord technicien</h1>
            <p className="text-lg md:text-xl mb-4 text-orange-100">
              Bienvenue, {user?.username} {stats?.specialty && <span className="font-semibold">- {stats.specialty}</span>}
            </p>
        {stats && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
                <div className="bg-orange-800/50 p-6 rounded-lg">
                  <Wrench className="w-8 h-8 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Demandes assignées</h3>
                  <p className="text-2xl font-bold">{stats.assigned_requests}</p>
                </div>
                <div className="bg-orange-800/50 p-6 rounded-lg">
                  <Clock className="w-8 h-8 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">En cours</h3>
                  <p className="text-2xl font-bold">{stats.pending_requests}</p>
                </div>
                <div className="bg-orange-800/50 p-6 rounded-lg">
                  <CheckCircle className="w-8 h-8 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Terminées</h3>
                  <p className="text-2xl font-bold">{stats.completed_requests}</p>
                </div>
                <div className="bg-orange-800/50 p-6 rounded-lg">
                  <TrendingUp className="w-8 h-8 mx-auto mb-4" />
                  <h3 className="font-semibold mb-2">Taux de réussite</h3>
                  <p className="text-2xl font-bold">
                    {stats.assigned_requests > 0
                      ? Math.round((stats.completed_requests / stats.assigned_requests) * 100)
                      : 0}%
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-0">
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
              <button
                onClick={() => setActiveTab('reviews')}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reviews'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                Avis reçus
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
                  requests={repairRequests
                    .filter(req => req.latitude !== undefined && req.longitude !== undefined)
                    .map(req => ({
                    id: req.id,
                      latitude: req.latitude!,
                      longitude: req.longitude!,
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

                {/* Espacement entre la carte et la liste */}
                <div className="mb-8"></div>

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
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {filteredRequests.map((request) => (
                      <div key={request.id} className="bg-white rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 border border-gray-100 overflow-hidden">
                        {/* Header de la carte */}
                        <div className="bg-gradient-to-r from-orange-50 to-orange-100 p-6 border-b border-orange-200">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-3">
                              {/* Avatar client */}
                              <div className="w-12 h-12 bg-gradient-to-br from-orange-400 to-orange-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
                                {request.client.user.username.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <h3 className="text-lg font-bold text-gray-900 truncate">{request.title}</h3>
                                <p className="text-sm text-gray-600">Client: {request.client.user.username}</p>
                              </div>
                              </div>
                            <div className="flex flex-col items-end space-y-2">
                              {/* Badge statut */}
                              <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${getStatusColor(request.status)}`}>
                                {getStatusText(request.status)}
                              </span>
                              {/* Badge priorité */}
                              <div className="flex items-center space-x-1">
                                <div className={`w-3 h-3 rounded-full ${getPriorityColor(request.priority)} shadow-sm`}></div>
                                <span className="text-xs text-gray-500 font-medium">
                                  {request.priority === 'urgent' ? 'Urgent' : 
                                   request.priority === 'high' ? 'Élevée' : 
                                   request.priority === 'medium' ? 'Moyenne' : 'Faible'}
                                </span>
                              </div>
                              </div>
                            </div>

                          {/* Description */}
                          <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-2">
                            {request.description}
                          </p>
                        </div>

                        {/* Corps de la carte */}
                        <div className="p-6">
                          {/* Tags d'informations clés */}
                          <div className="flex flex-wrap gap-2 mb-4">
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              <Wrench className="w-3 h-3 mr-1" />
                              {request.specialty_needed}
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              <span className="font-bold">{request.estimated_cost !== undefined && request.estimated_cost !== null ? request.estimated_cost.toLocaleString() : "N/A"} FCFA</span>
                            </span>
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              <Clock className="w-3 h-3 mr-1" />
                              {formatDate(request.created_at)}
                            </span>
                          </div>

                          {/* Informations client stylées */}
                          <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg p-4 mb-4 border border-gray-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                              <span className="w-2 h-2 bg-orange-500 rounded-full mr-2"></span>
                              Informations client
                            </h4>
                            <div className="space-y-2">
                                <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700 flex-1">
                                    {request.client.address}
                                    {/* Badge incohérence */}
                                    {!isCoherent(extractQuartier(request.client.address), extractCommune(request.client.address)) && (
                                      <>
                                        <span className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-1 rounded ml-2">Incohérence quartier/commune</span>
                                        <button
                                        className="ml-2 text-xs text-blue-700 underline hover:text-blue-900 font-medium"
                                          onClick={() => {
                                            setSuggestingRequestId(request.id);
                                            setSuggestQuartier('');
                                            setSuggestCommune('');
                                          }}
                                        >Suggérer correction</button>
                                        {suggestingRequestId === request.id && (
                                        <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200 max-w-xs">
                                          <label className="text-xs font-semibold text-blue-900">Quartier</label>
                                            <div className="relative">
                                              <input
                                                type="text"
                                              className="w-full p-2 border border-blue-300 rounded text-sm"
                                                value={suggestQuartier}
                                                onChange={handleSuggestQuartierChange}
                                                placeholder="Quartier correct"
                                              />
                                              {showSuggestionsList && suggestionsList.length > 0 && (
                                                <div ref={suggestionsListRef} className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-40 overflow-y-auto">
                                                {suggestionsList.map((quartier) => (
                                                    <div
                                                      key={quartier}
                                                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                                      onClick={() => handleSuggestListClick(quartier)}
                                                    >
                                                      {quartier}
                                                    </div>
                                                  ))}
                                                </div>
                                              )}
                                            </div>
                                          <label className="text-xs font-semibold text-blue-900 mt-2">Commune</label>
                                            <input
                                              type="text"
                                            className="w-full p-2 border border-blue-300 rounded text-sm"
                                              value={suggestCommune}
                                              onChange={e => setSuggestCommune(e.target.value)}
                                              placeholder="Commune correcte"
                                            />
                                          <div className="flex space-x-2 mt-3">
                                            <button
                                              className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded transition-colors"
                                              onClick={() => handleSendSuggestion(request.id)}
                                            >Envoyer</button>
                                            <button
                                              className="flex-1 text-xs text-gray-500 underline hover:text-gray-700"
                                              onClick={() => setSuggestingRequestId(null)}
                                            >Annuler</button>
                                          </div>
                                            {suggestionSent && (
                                            <div className="text-green-700 text-xs mt-2 text-center">✓ Suggestion envoyée !</div>
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </span>
                                </div>
                                <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-gray-400 flex-shrink-0" />
                                <span className="text-sm text-gray-700">{request.client.phone}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                <span className="text-sm text-gray-700">{request.client.user.email}</span>
                              </div>
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-wrap gap-3">
                            {request.conversation && (
                              <button
                                onClick={() => window.location.href = `/chat/${request.conversation?.id}`}
                                className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                              >
                                <MessageSquare className="h-4 w-4 mr-2" />
                                Messages
                                {request.conversation?.unread_count > 0 && (
                                  <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                    {request.conversation.unread_count}
                                  </span>
                                )}
                              </button>
                            )}

                            {/* Actions selon le statut */}
                            {request.status === 'pending' && (
                                <button
                                  onClick={async () => {
                                    try {
                                    const technicianId = user?.technician?.id;
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
                                        let errorData;
                                        try {
                                          errorData = await response.json();
                                      } catch {
                                          errorData = null;
                                        }
                                        console.error('Erreur lors de l\'acceptation:', errorData);
                                        alert(`Erreur lors de l'acceptation de la demande: ${errorData && errorData.error ? errorData.error : 'Erreur inconnue'}`);
                                      }
                                  } catch {
                                    console.error('Erreur lors de l\'acceptation de la demande');
                                      alert('Erreur lors de l\'acceptation de la demande');
                                    }
                                  }}
                                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                  Accepter
                                </button>
                            )}

                            {request.status === 'assigned' && (
                              <button
                                onClick={() => updateRequestStatus(request.id, 'in_progress')}
                                className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                              >
                                <Wrench className="h-4 w-4 mr-2" />
                                Commencer
                              </button>
                            )}

                            {request.status === 'in_progress' && (
                              <button
                                onClick={() => updateRequestStatus(request.id, 'completed')}
                                className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
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

            {activeTab === 'reviews' && (
              <div>
                <h2 className="text-xl font-semibold mb-4 text-gray-800">Avis reçus</h2>
                {/* Filtres synchronisés admin/statistiques */}
                <div className="flex flex-wrap gap-4 mb-4 items-end">
                  <input
                    type="text"
                    placeholder="Recherche client ou commentaire..."
                    value={reviewSearch}
                    onChange={e => { setReviewSearch(e.target.value); setReviewPage(1); }}
                    className="border rounded px-2 py-1 text-sm"
                  />
                  <label className="text-sm">Période
                    <select
                      value={reviewPeriod}
                      onChange={e => { setReviewPeriod(e.target.value as any); setReviewPage(1); }}
                      className="ml-2 border rounded px-2 py-1 text-sm"
                    >
                      <option value="all">Tout</option>
                      <option value="7d">7 derniers jours</option>
                      <option value="30d">30 derniers jours</option>
                    </select>
                  </label>
                  <label className="text-sm">Note min.
                    <select
                      value={reviewMinRating}
                      onChange={e => { setReviewMinRating(Number(e.target.value)); setReviewPage(1); }}
                      className="ml-2 border rounded px-2 py-1 text-sm"
                    >
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={reviewOnlyRecommended}
                      onChange={e => { setReviewOnlyRecommended(e.target.checked); setReviewPage(1); }}
                    />
                    Recommandé uniquement
                  </label>
                  <label className="text-sm">Trier par
                    <select
                      value={reviewSort}
                      onChange={e => { setReviewSort(e.target.value as any); setReviewPage(1); }}
                      className="ml-2 border rounded px-2 py-1 text-sm"
                    >
                      <option value="date_desc">Date (plus récent)</option>
                      <option value="date_asc">Date (plus ancien)</option>
                      <option value="note_desc">Note (plus haute)</option>
                      <option value="note_asc">Note (plus basse)</option>
                    </select>
                  </label>
                  <button
                    onClick={exportReviewsToExcel}
                    className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                  >
                    Exporter Excel
                  </button>
                  <button
                    onClick={exportReviewsToPDF}
                    className="bg-red-600 text-white px-3 py-1 rounded text-sm hover:bg-red-700"
                  >
                    Exporter PDF
                  </button>
                  <button
                    onClick={exportReviewsToCSV}
                    className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
                  >
                    Exporter CSV
                  </button>
                  <button
                    onClick={exportReviewsToJSON}
                    className="bg-gray-700 text-white px-3 py-1 rounded text-sm hover:bg-gray-900"
                  >
                    Exporter JSON
                  </button>
                </div>
                {/* Comparatif avec la moyenne plateforme */}
                <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-white rounded shadow p-4">
                    <h3 className="font-bold mb-2">Moyenne des notes</h3>
                    <div className="text-3xl font-bold text-yellow-600">{reviewStats.avg} / 5</div>
                    {globalAvg && (
                      <div className="mt-2 text-sm text-gray-500">Plateforme : {globalAvg}/5 ({(Number(reviewStats.avg) - globalAvg >= 0 ? '+' : '') + (Number(reviewStats.avg) - globalAvg).toFixed(2)} vs plateforme)</div>
                    )}
                    <div className="mt-2 text-sm text-gray-500">{reviewStats.count} avis</div>
                  </div>
                  <div className="bg-white rounded shadow p-4">
                    <h3 className="font-bold mb-2">Taux de recommandation</h3>
                    <div className="text-3xl font-bold text-green-600">{reviewStats.recommend} %</div>
                    <div className="mt-2 text-sm text-gray-500">{reviewStats.count} avis</div>
                  </div>
                  {/* Graphique radar par critère */}
                  <div className="bg-white rounded shadow p-4 col-span-1 md:col-span-2">
                    <h3 className="font-bold mb-2">Moyenne par critère</h3>
                    <Bar
                      data={{
                        labels: ['Ponctualité', 'Qualité', 'Communication'],
                        datasets: [{
                          label: 'Moyenne',
                          data: [Number(avgPunctuality), Number(avgQuality), Number(avgCommunication)],
                          backgroundColor: ['#fbbf24', '#a3e635', '#22d3ee']
                        }]
                      }}
                      options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 5 } } }}
                    />
                    <div className="mt-2 text-sm text-gray-500">Ponctualité : {avgPunctuality} / Qualité : {avgQuality} / Communication : {avgCommunication}</div>
                  </div>
                  {/* Top clients */}
                  <div className="bg-white rounded shadow p-4 col-span-1 md:col-span-2">
                    <h3 className="font-bold mb-2">Top clients (par nombre d'avis)</h3>
                    <ul className="list-disc ml-6">
                      {topClients.length === 0 ? <li className="text-gray-500">Aucun client</li> : topClients.map(([name, count]) => <li key={name}>{name} ({count} avis)</li>)}
                    </ul>
                  </div>
                  {/* Répartition des notes et évolution temporelle : inchangé */}
                  <div className="bg-white rounded shadow p-4 col-span-1 md:col-span-2">
                    <h3 className="font-bold mb-2">Répartition des notes</h3>
                    <Bar
                      data={{
                        labels: ['1', '2', '3', '4', '5'],
                        datasets: [{
                          label: 'Nombre d\'avis',
                          data: [1, 2, 3, 4, 5].map(n => filteredAndPeriodReviews.filter(r => r.rating === n).length),
                          backgroundColor: ['#fbbf24', '#f59e42', '#facc15', '#a3e635', '#22d3ee']
                        }]
                      }}
                      options={{ responsive: true, plugins: { legend: { display: false } } }}
                    />
                  </div>
                  <div className="bg-white rounded shadow p-4 col-span-1 md:col-span-2">
                    <h3 className="font-bold mb-2">Évolution des avis dans le temps</h3>
                    <Line
                      data={{
                        labels: (() => {
                          const map = new Map();
                          filteredAndPeriodReviews.forEach(r => {
                            if (r.created_at) {
                              const d = new Date(r.created_at).toLocaleDateString('fr-FR');
                              map.set(d, (map.get(d) || 0) + 1);
                            }
                          });
                          return Array.from(map.keys());
                        })(),
                        datasets: [{
                          label: 'Avis reçus',
                          data: (() => {
                            const map = new Map();
                            filteredAndPeriodReviews.forEach(r => {
                              if (r.created_at) {
                                const d = new Date(r.created_at).toLocaleDateString('fr-FR');
                                map.set(d, (map.get(d) || 0) + 1);
                              }
                            });
                            return Array.from(map.values());
                          })(),
                          borderColor: '#2563eb',
                          backgroundColor: '#93c5fd',
                          fill: true
                        }]
                      }}
                      options={{ responsive: true, plugins: { legend: { display: false } } }}
                    />
                  </div>
                </div>
                {/* Liste paginée des avis reçus (inchangée) */}
                {loadingReviews ? (
                  <div className="text-center py-8">Chargement des avis...</div>
                ) : sortedReviews.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">Aucun avis trouvé avec ces critères.</div>
                ) : (
                  <>
                    <ul className="divide-y divide-gray-200">
                      {paginatedReviews.map((review) => (
                        <li key={review.id} className="py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                          <div>
                            <span className="font-medium text-gray-900">{review.client_name || 'Client inconnu'}</span>
                            <span className="ml-2 text-xs text-gray-500">{review.created_at ? new Date(review.created_at).toLocaleString('fr-FR') : ''}</span>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-yellow-600 font-bold">{review.rating}/5</span>
                              {review.would_recommend && <span className="text-green-600 text-xs ml-2">Recommandé</span>}
                            </div>
                            <div className="flex gap-4 text-xs mt-1">
                              {review.punctuality_rating && <span>Ponctualité: {review.punctuality_rating}/5</span>}
                              {review.quality_rating && <span>Qualité: {review.quality_rating}/5</span>}
                              {review.communication_rating && <span>Communication: {review.communication_rating}/5</span>}
                            </div>
                            {review.comment && <div className="mt-2 text-gray-700 text-sm">"{review.comment}"</div>}
                          </div>
                          <div className="mt-2 md:mt-0">
                            <a
                              href={review.request ? `/admin/requests/${review.request}` : '#'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 underline text-xs"
                            >
                              Voir la demande
                            </a>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {/* Pagination */}
                    {totalPages > 1 && (
                      <div className="flex justify-center items-center gap-2 mt-4">
                        <button
                          onClick={() => setReviewPage(p => Math.max(1, p - 1))}
                          disabled={reviewPage === 1}
                          className="px-2 py-1 border rounded disabled:opacity-50"
                        >
                          Précédent
                        </button>
                        <span className="text-sm">Page {reviewPage} / {totalPages}</span>
                        <button
                          onClick={() => setReviewPage(p => Math.min(totalPages, p + 1))}
                          disabled={reviewPage === totalPages}
                          className="px-2 py-1 border rounded disabled:opacity-50"
                        >
                          Suivant
                        </button>
                      </div>
                    )}
                  </>
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