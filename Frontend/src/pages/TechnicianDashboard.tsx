import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Clock, MessageSquare, MapPin, Phone, AlertCircle, CheckCircle, Wrench, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import TechnicianRequestsMap from '../components/TechnicianRequestsMap';
import ReputationBadge from '../components/ReputationBadge';
import RewardsPanel from '../components/RewardsPanel';
import SubscriptionPanel from '../components/SubscriptionPanel';
import SubscriptionStatusWidget from '../components/SubscriptionStatusWidget';
import TechnicianProfile from '../components/TechnicianProfile';
import LocationTrackingControl from '../components/LocationTrackingControl';
import LiveLocationMap from '../components/LiveLocationMap';
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
import { useNavigate } from 'react-router-dom';
import ErrorToast from '../components/ErrorToast';
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, ArcElement, PointElement, LineElement, Filler);

interface Request {
  id: number;
  latitude: number;
  longitude: number;
  address: string;
  city: string;
  quartier?: string;
  client: {
    id: number;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      username: string;
    };
    phone: string;
    address: string;
  };
  technician?: {
    id: number;
    user: {
      id: number;
      first_name: string;
      last_name: string;
      email: string;
      username: string;
    };
    phone: string;
    hourly_rate: number;
    average_rating: number;
  } | null;
  conversation: {
    id: number;
    unread_count: number;
  };
  service: {
    id: number;
    name: string;
    description: string;
    price: number;
  };
  status: string;
  is_urgent?: boolean;
  description?: string;
  started_at?: string;
  specialty_needed?: string;
  estimated_cost?: number;
  created_at?: string;
  // ... autres champs ...
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
  request?: number;
}

interface ReviewStats {
  avg: number;
  count: number;
  recommend: number;
  byNote: number[];
  byDate: [string, number][];
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
  return typeof city === 'string' && city.toLowerCase().includes(commune.toLowerCase());
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

// Fonction utilitaire pour normaliser un technicien partiel en technicien complet
function normalizeTechnician(technician: any) {
  return {
    id: typeof technician?.id === 'number' ? technician.id : 0,
    user: normalizeUser(technician?.user),
    phone: typeof technician?.phone === 'string' ? technician.phone : '',
    hourly_rate: typeof technician?.hourly_rate === 'number' ? technician.hourly_rate : 0,
    average_rating: typeof technician?.average_rating === 'number' ? technician.average_rating : 0,
  };
}

// Fonction utilitaire pour normaliser une conversation partielle en conversation complète
function normalizeConversation(conversation: any) {
  return {
    id: typeof conversation?.id === 'number' ? conversation.id : 0,
    unread_count: typeof conversation?.unread_count === 'number' ? conversation.unread_count : 0,
  };
}

// Fonction utilitaire pour normaliser un service partiel en service complet
function normalizeService(service: any) {
  return {
    id: typeof service?.id === 'number' ? service.id : 0,
    name: typeof service?.name === 'string' ? service.name : '',
    description: typeof service?.description === 'string' ? service.description : '',
    price: typeof service?.price === 'number' ? service.price : 0,
  };
}

const TechnicianDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [repairRequests, setRepairRequests] = useState<Request[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'notifications' | 'reviews' | 'rewards' | 'subscription' | 'profile' | 'location'>('requests');
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
  const [reviewStats, setReviewStats] = useState<ReviewStats>({
    avg: 0,
    count: 0,
    recommend: 0,
    byNote: [0, 0, 0, 0, 0],
    byDate: [],
  });
  const [avgPunctuality, setAvgPunctuality] = useState(0);
  const [avgQuality, setAvgQuality] = useState(0);
  const [avgCommunication, setAvgCommunication] = useState(0);
  const [topClients, setTopClients] = useState<[string, number][]>([]);
  const [filteredAndPeriodReviews, setFilteredAndPeriodReviews] = useState<Review[]>([]);
  const [sortedReviews, setSortedReviews] = useState<Review[]>([]);
  const [paginatedReviews, setPaginatedReviews] = useState<Review[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [subscription, setSubscription] = useState<any>(null);
  const [subLoading, setSubLoading] = useState(false);
  const [subError, setSubError] = useState<string | null>(null);
  const [subSuccess, setSubSuccess] = useState<string | null>(null);
  const [trackingRequestId, setTrackingRequestId] = useState<number | null>(null);
  const trackingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatError, setChatError] = useState<string | null>(null);
  const [subscriptionStatus, setSubscriptionStatus] = React.useState<{ status: string; can_receive_requests: boolean } | null>(null);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

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
      const requestsResponse = await fetchWithAuth('/depannage/api/repair-requests/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (requestsResponse.ok) {
        const data = await requestsResponse.json();
        setRepairRequests(data.results || data || []);
      } else {
        let backendMsg = '';
        try {
          const data = await requestsResponse.json();
          backendMsg = data?.detail || data?.message || JSON.stringify(data);
        } catch { }
        setError(`Erreur lors du chargement des demandes (code ${requestsResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
      }

      // Récupérer les statistiques
      const statsResponse = await fetchWithAuth('/depannage/api/repair-requests/dashboard_stats/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

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

      // Récupérer les notifications
      const notificationsResponse = await fetchWithAuth('/depannage/api/notifications/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

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

      // Ajouter une notification de test pour démontrer les nouvelles fonctionnalités
      if (subscription && !subscription.is_active) {
        const testNotification = {
          id: Date.now(),
          title: "Abonnement Premium Expiré",
          message: "Votre abonnement premium a expiré. Renouvelez-le pour continuer à bénéficier de tous les avantages premium.",
          type: "warning",
          is_read: false,
          created_at: new Date().toISOString()
        };
        setNotifications(prev => [testNotification, ...prev]);
      }

    } catch (error) {
      setError('Erreur lors du chargement des données');
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
    } catch {
      alert('Erreur lors de l\'envoi de la suggestion');
    }
  };

  // Charger les avis reçus au montage ou quand l'onglet est activé
  useEffect(() => {
    if (activeTab === 'reviews' && receivedReviews.length === 0 && !loadingReviews) {
      // Vérifier que l'utilisateur est un technicien
      if (!user?.technician) {
        console.warn('Utilisateur non technicien - pas d\'avis à charger');
        setReceivedReviews([]);
        setLoadingReviews(false);
        return;
      }

      setLoadingReviews(true);
      fetchWithAuth('/depannage/api/reviews/received/', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      })
        .then(res => {
          if (res.ok) {
            return res.json();
          } else {
            // Gérer les erreurs (403, 404, etc.)
            console.warn(`Erreur API avis: ${res.status} - ${res.statusText}`);
            return { results: [] }; // Retourner un tableau vide en cas d'erreur
          }
        })
        .then(data => {
          // S'assurer que data est un tableau (gestion de la pagination DRF)
          const reviews = Array.isArray(data) ? data : (data?.results || []);
          setReceivedReviews(reviews);
        })
        .catch((error) => {
          console.error('Erreur lors du chargement des avis:', error);
          setReceivedReviews([]); // Toujours initialiser avec un tableau vide
        })
        .finally(() => setLoadingReviews(false));
    }
  }, [activeTab, token, user?.technician]);

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

  const filteredReviews = useMemo(() =>
    receivedReviews.filter(r =>
      (reviewSearch === '' || (r.client_name?.toLowerCase().includes(reviewSearch.toLowerCase()) || r.comment?.toLowerCase().includes(reviewSearch.toLowerCase()))) &&
      (r.rating >= reviewMinRating) &&
      (!reviewOnlyRecommended || r.would_recommend)
    ),
    [receivedReviews, reviewSearch, reviewMinRating, reviewOnlyRecommended]
  );

  // Update filtered and period reviews
  useEffect(() => {
    const filteredAndPeriodReviews = filterByPeriod(filteredReviews, reviewPeriod);
    setFilteredAndPeriodReviews(filteredAndPeriodReviews);

    const totalPages = Math.ceil(filteredAndPeriodReviews.length / REVIEWS_PER_PAGE);
    setTotalPages(totalPages);

    const sortedReviews = [...filteredAndPeriodReviews].sort((a, b) => {
      if (reviewSort === 'date_desc') return (b.created_at || '').localeCompare(a.created_at || '');
      if (reviewSort === 'date_asc') return (a.created_at || '').localeCompare(b.created_at || '');
      if (reviewSort === 'note_desc') return b.rating - a.rating;
      if (reviewSort === 'note_asc') return a.rating - b.rating;
      return 0;
    });
    setSortedReviews(sortedReviews);

    const paginatedReviews = sortedReviews.slice((reviewPage - 1) * REVIEWS_PER_PAGE, reviewPage * REVIEWS_PER_PAGE);
    setPaginatedReviews(paginatedReviews);

    // Calculate stats
    const avgPunctuality = filteredAndPeriodReviews.length ? (filteredAndPeriodReviews.reduce((sum, r) => sum + (r.punctuality_rating || 0), 0) / filteredAndPeriodReviews.length) : 0;
    const avgQuality = filteredAndPeriodReviews.length ? (filteredAndPeriodReviews.reduce((sum, r) => sum + (r.quality_rating || 0), 0) / filteredAndPeriodReviews.length) : 0;
    const avgCommunication = filteredAndPeriodReviews.length ? (filteredAndPeriodReviews.reduce((sum, r) => sum + (r.communication_rating || 0), 0) / filteredAndPeriodReviews.length) : 0;

    setAvgPunctuality(avgPunctuality);
    setAvgQuality(avgQuality);
    setAvgCommunication(avgCommunication);

    // Calculate review stats
    const avgRating = filteredAndPeriodReviews.length ? (filteredAndPeriodReviews.reduce((sum, r) => sum + r.rating, 0) / filteredAndPeriodReviews.length) : 0;
    const recommendCount = filteredAndPeriodReviews.filter(r => r.would_recommend).length;
    const recommendRate = filteredAndPeriodReviews.length ? (recommendCount / filteredAndPeriodReviews.length) * 100 : 0;

    // Calculate rating distribution
    const byNote = [0, 0, 0, 0, 0];
    filteredAndPeriodReviews.forEach(r => {
      if (r.rating >= 1 && r.rating <= 5) {
        byNote[r.rating - 1]++;
      }
    });

    // Calculate date distribution (last 30 days)
    const byDate: [string, number][] = [];
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const count = filteredAndPeriodReviews.filter(r => {
        const reviewDate = new Date(r.created_at || '');
        return reviewDate.toISOString().split('T')[0] === dateStr;
      }).length;
      byDate.push([dateStr, count]);
    }

    setReviewStats({
      avg: Math.round(avgRating * 10) / 10,
      count: filteredAndPeriodReviews.length,
      recommend: Math.round(recommendRate * 10) / 10,
      byNote,
      byDate,
    });

    // Calculate top clients
    const clientCounts: Record<string, number> = {};
    filteredAndPeriodReviews.forEach(r => {
      const clientName = r.client_name || 'Client inconnu';
      clientCounts[clientName] = (clientCounts[clientName] || 0) + 1;
    });
    const topClientsArray = Object.entries(clientCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 5);
    setTopClients(topClientsArray);

  }, [filteredReviews, reviewPeriod, reviewSort, reviewPage]);

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
    fetch('/depannage/api/repair-requests/project_statistics/')
      .then(r => r.json())
      .then(data => setGlobalAvg(data?.overview?.avg_rating || null));
  }, []);

  // Charger l'abonnement à l'arrivée - maintenant gratuit
  useEffect(() => {
    const fetchSubscription = async () => {
      setSubLoading(true);
      setSubError(null);
      try {
        const token = localStorage.getItem('token');
        const response = await fetch('http://127.0.0.1:8000/depannage/api/technicians/subscription_status/', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        if (response.ok) {
          const data = await response.json();
          setSubscription(data.subscription);
        }
      } catch (e) {
        setSubError('Erreur lors du chargement de l\'abonnement');
      } finally {
        setSubLoading(false);
      }
    };
    fetchSubscription();
  }, []);

  // Fonction de renouvellement supprimée - plus de paiements
  const handleRenewSubscription = async () => {
    // Fonction supprimée - tous les techniciens sont maintenant gratuits
    console.log('Tous les techniciens ont maintenant un accès gratuit illimité');
  };

  // Fonction pour démarrer le tracking
  const startTracking = (requestId: number) => {
    setTrackingRequestId(requestId);
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
    // Fonction d'envoi de la position
    const sendPosition = async () => {
      if (!navigator.geolocation) {
        console.log('Géolocalisation non supportée par le navigateur');
        return;
      }
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const token = localStorage.getItem('token');
          await fetchWithAuth('/depannage/api/locations/', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              latitude,
              longitude,
              request: requestId
            })
          });
        } catch (e) {
          console.log('Erreur lors de l\'envoi de la position:', e);
        }
      }, (error) => {
        // Gestion des erreurs de géolocalisation
        let errorMessage = "Erreur de géolocalisation pour le tracking.";

        switch (error.code) {
          case 1: // PERMISSION_DENIED
            errorMessage = "Permission de géolocalisation refusée pour le tracking.";
            break;
          case 2: // POSITION_UNAVAILABLE
            errorMessage = "Position non disponible pour le tracking.";
            break;
          case 3: // TIMEOUT
            errorMessage = "Délai d'attente dépassé pour le tracking.";
            break;
          default:
            errorMessage = "Erreur de géolocalisation pour le tracking.";
        }

        console.log(`Tracking: ${errorMessage} (Code: ${error.code})`);
      });
    };
    sendPosition();
    trackingIntervalRef.current = setInterval(sendPosition, 5000);
  };
  // Fonction pour arrêter le tracking
  const stopTracking = () => {
    setTrackingRequestId(null);
    if (trackingIntervalRef.current) clearInterval(trackingIntervalRef.current);
  };

  // Calcul du nombre total de messages non lus sur toutes les conversations
  const totalUnreadMessages = repairRequests.reduce((acc, req) => acc + (req.conversation?.unread_count || 0), 0);

  React.useEffect(() => {
    // Appel API pour récupérer le statut d'abonnement
    fetch('http://127.0.0.1:8000/depannage/api/technicians/subscription_status/', {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`,
      },
    })
      .then((res) => res.json())
      .then((data) => {
        setSubscriptionStatus(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Affichage du modal si abonnement expiré ou inexistant
  const showSubscriptionModal =
    !loading && subscriptionStatus && (!subscriptionStatus.can_receive_requests || subscriptionStatus.status === 'expired');

  // Redirection automatique supprimée - plus de paiements automatiques
  useEffect(() => {
    // Tous les techniciens ont maintenant un accès gratuit illimité
    console.log('Accès gratuit activé pour tous les techniciens');
  }, [loading, subscriptionStatus]);

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
              <>
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
                {/* Statistiques de notation */}
                <div>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6">
                    <div className="bg-yellow-800/50 p-6 rounded-lg">
                      <div className="flex items-center justify-center mb-4">
                        <span className="text-2xl">⭐</span>
                      </div>
                      <h3 className="font-semibold mb-2">Note moyenne</h3>
                      <p className="text-2xl font-bold">{reviewStats.avg}/5</p>
                    </div>
                    <div className="bg-green-800/50 p-6 rounded-lg">
                      <div className="flex items-center justify-center mb-4">
                        <span className="text-2xl">👍</span>
                      </div>
                      <h3 className="font-semibold mb-2">Taux de recommandation</h3>
                      <p className="text-2xl font-bold">{reviewStats.recommend}%</p>
                    </div>
                    <div className="bg-blue-800/50 p-6 rounded-lg">
                      <div className="flex items-center justify-center mb-4">
                        <span className="text-2xl">📝</span>
                      </div>
                      <h3 className="font-semibold mb-2">Total avis</h3>
                      <p className="text-2xl font-bold">{reviewStats.count}</p>
                    </div>
                    <div className="bg-purple-800/50 p-6 rounded-lg">
                      <div className="flex items-center justify-center mb-4">
                        <span className="text-2xl">🎯</span>
                      </div>
                      <h3 className="font-semibold mb-2">Ponctualité</h3>
                      <p className="text-2xl font-bold">{avgPunctuality}/5</p>
                    </div>
                  </div>

                  {/* Badge de réputation */}
                  {reviewStats.count > 0 && (
                    <div className="mt-8">
                      <ReputationBadge
                        averageRating={Number(reviewStats.avg)}
                        totalReviews={reviewStats.count}
                        recommendationRate={reviewStats.recommend}
                        completedJobs={stats?.completed_requests || 0}
                        yearsExperience={user?.technician?.years_experience || 0}
                      />
                    </div>
                  )}

                  {/* Badges d'abonnement et notifications */}
                  <div className="mt-6 flex flex-wrap justify-center gap-4">
                    {/* Badge d'abonnement */}
                    {subscription && (
                      <div className={`inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold ${subscription.is_active
                        ? 'bg-gradient-to-r from-green-500 to-green-600 text-white shadow-lg'
                        : 'bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg'
                        }`}>
                        <span className="mr-2">
                          {subscription.is_active ? '✅' : '⚠️'}
                        </span>
                        {subscription.is_active
                          ? 'Abonnement actif – Merci pour votre confiance !'
                          : 'Abonnement Expiré'}
                        {subscription.is_active && subscription.expires_at && (
                          <span className="ml-2 text-xs opacity-90">
                            (Expire le {new Date(subscription.expires_at).toLocaleDateString('fr-FR')})
                          </span>
                        )}
                      </div>
                    )}

                    {/* Badge de nouvelles notifications */}
                    {notifications.filter(n => !n.is_read).length > 0 && (
                      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg animate-pulse">
                        <span className="mr-2">🔔</span>
                        {notifications.filter(n => !n.is_read).length} nouvelle{notifications.filter(n => !n.is_read).length > 1 ? 's' : ''} notification{notifications.filter(n => !n.is_read).length > 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Badge de nouvelles demandes */}
                    {repairRequests.filter(r => r.status === 'assigned' && !r.started_at).length > 0 && (
                      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-orange-500 to-red-600 text-white shadow-lg">
                        <span className="mr-2">🆕</span>
                        {repairRequests.filter(r => r.status === 'assigned' && !r.started_at).length} nouvelle{repairRequests.filter(r => r.status === 'assigned' && !r.started_at).length > 1 ? 's' : ''} demande{repairRequests.filter(r => r.status === 'assigned' && !r.started_at).length > 1 ? 's' : ''}
                      </div>
                    )}

                    {/* Badge de tracking actif */}
                    {trackingRequestId && (
                      <div className="inline-flex items-center px-4 py-2 rounded-full text-sm font-semibold bg-gradient-to-r from-green-500 to-blue-600 text-white shadow-lg animate-pulse">
                        <span className="mr-2">📍</span>
                        Suivi GPS actif
                      </div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </section>

      {/* Modal d'abonnement bloquant */}
      {/* Modal d'abonnement supprimé - plus de paiements */}

      {/* Si abonnement inactif, on masque la liste des demandes et la logique de réception */}
      {!showSubscriptionModal && (
        <>
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-0">
            {/* Onglets */}
            <div className="bg-white rounded-lg shadow mb-6">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6" role="tablist">
                  <button
                    onClick={() => setActiveTab('requests')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'requests'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    role="tab"
                    aria-selected={activeTab === 'requests'}
                    tabIndex={0}
                  >
                    Mes demandes ({repairRequests.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('notifications')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm relative ${activeTab === 'notifications'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    role="tab"
                    aria-selected={activeTab === 'notifications'}
                    tabIndex={0}
                    aria-label="Notifications"
                  >
                    Notifications ({notifications.filter(n => !n.is_read).length})
                    {/* Badge global nouveaux messages */}
                    {totalUnreadMessages > 0 && (
                      <span className="absolute -top-1 -right-4 bg-red-600 text-white text-xs px-2 py-0.5 rounded-full font-bold animate-pulse" title="Nouveaux messages">
                        {totalUnreadMessages}
                      </span>
                    )}
                  </button>
                  <button
                    onClick={() => setActiveTab('reviews')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'reviews'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    role="tab"
                    aria-selected={activeTab === 'reviews'}
                    tabIndex={0}
                  >
                    Avis reçus
                  </button>
                  <button
                    onClick={() => setActiveTab('rewards')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'rewards'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    role="tab"
                    aria-selected={activeTab === 'rewards'}
                    tabIndex={0}
                  >
                    Récompenses
                  </button>
                  <button
                    onClick={() => setActiveTab('subscription')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'subscription'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    role="tab"
                    aria-selected={activeTab === 'subscription'}
                    tabIndex={0}
                  >
                    Abonnement
                  </button>
                  <button
                    onClick={() => setActiveTab('location')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'location'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    role="tab"
                    aria-selected={activeTab === 'location'}
                    tabIndex={0}
                  >
                    📍 Géolocalisation
                  </button>
                  <button
                    onClick={() => setActiveTab('profile')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${activeTab === 'profile'
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    role="tab"
                    aria-selected={activeTab === 'profile'}
                    tabIndex={0}
                  >
                    Mon Profil
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
                          client: req.client ? {
                            ...req.client,
                            user: normalizeUser(req.client.user)
                          } : {
                            id: 0,
                            user: normalizeUser(undefined),
                            phone: '',
                            address: ''
                          },
                          service: normalizeService(req.service),
                          status: req.status,
                          is_urgent: !!req.is_urgent,
                        })) as any}
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
                                    {(typeof request.client.user.username === 'string' && request.client.user.username.length > 0)
                                      ? request.client.user.username.charAt(0).toUpperCase()
                                      : '?'}
                                  </div>
                                  <div>
                                    <h3 className="text-lg font-bold text-gray-900 truncate">
                                      {request.service?.name || 'Service non spécifié'}
                                    </h3>
                                    <p className="text-sm text-gray-600">Client: {request.client?.user?.username || 'Client inconnu'}</p>
                                  </div>
                                </div>
                                <div className="flex flex-col items-end space-y-2">
                                  {/* Badge statut */}
                                  <span className={`px-3 py-1 text-xs font-bold rounded-full shadow-sm ${getStatusColor(request.status)}`}>
                                    {getStatusText(request.status)}
                                  </span>
                                  {/* Badge priorité */}
                                  <div className="flex items-center space-x-1">
                                    <div className={`w-3 h-3 rounded-full ${getPriorityColor(request.is_urgent ? 'urgent' : 'normal')} shadow-sm`}></div>
                                    <span className="text-xs text-gray-500 font-medium">
                                      {request.is_urgent ? 'Urgent' : 'Normal'}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Description */}
                              <p className="text-gray-700 text-sm leading-relaxed mb-4 line-clamp-2">
                                {typeof request.description === 'string' ? request.description : ''}
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
                                  {formatDate(request.created_at || '')}
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
                                    <span className="text-sm text-gray-700">
                                      {request.client.user && typeof request.client.user.email === 'string' ? request.client.user.email : ''}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Actions */}
                              <div className="flex flex-wrap gap-3">
                                {request.conversation?.id ? (
                                  <button
                                    onClick={async () => {
                                      setChatLoading(true);
                                      try {
                                        // Simuler un délai ou une vérification d'accès
                                        // await someAsyncCheck();
                                        window.location.href = request.conversation ? `/chat/${request.conversation.id}` : '#';
                                      } catch (e) {
                                        setChatError("Impossible d'ouvrir la conversation.");
                                        setTimeout(() => setChatError(null), 3000);
                                      } finally {
                                        setChatLoading(false);
                                      }
                                    }}
                                    className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm relative"
                                    aria-label="Ouvrir la conversation de chat"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Messages
                                    {/* Badge nouveaux messages */}
                                    {request.conversation?.unread_count > 0 && (
                                      <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold animate-pulse">
                                        {request.conversation.unread_count}
                                      </span>
                                    )}
                                    {/* Spinner de chargement */}
                                    {chatLoading && (
                                      <span className="ml-2 animate-spin inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full"></span>
                                    )}
                                  </button>
                                ) : (
                                  <button
                                    disabled
                                    aria-disabled="true"
                                    tabIndex={-1}
                                    className="inline-flex items-center px-4 py-2 bg-gray-300 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed opacity-60"
                                    title="Aucune conversation disponible pour cette demande"
                                  >
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Messages
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

                                {request.status === 'assigned' && trackingRequestId !== request.id && (
                                  <button
                                    onClick={() => updateRequestStatus(request.id, 'in_progress')}
                                    className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Commencer
                                  </button>
                                )}

                                {trackingRequestId === request.id && (
                                  <span className="ml-2 text-green-600 font-semibold animate-pulse">Tracking en cours...</span>
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
                    {/* Header avec statistiques */}
                    <div className="mb-6 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">Centre de Notifications</h3>
                          <p className="text-sm text-gray-600">
                            {notifications.filter(n => !n.is_read).length} notification{notifications.filter(n => !n.is_read).length > 1 ? 's' : ''} non lue{notifications.filter(n => !n.is_read).length > 1 ? 's' : ''}
                          </p>
                        </div>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              // Marquer toutes comme lues
                              notifications.forEach(n => n.is_read = true);
                              setNotifications([...notifications]);
                            }}
                            className="px-3 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                          >
                            Tout marquer comme lu
                          </button>
                        </div>
                      </div>
                    </div>

                    {notifications.length === 0 ? (
                      <div className="text-center py-12">
                        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                          <AlertCircle className="h-8 w-8 text-blue-600" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">Aucune notification</h3>
                        <p className="text-gray-500">
                          Vous n'avez pas encore de notifications. Elles apparaîtront ici quand vous recevrez des mises à jour.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {notifications.map((notification) => (
                          <div
                            key={notification.id}
                            className={`relative p-6 rounded-xl border transition-all duration-300 hover:shadow-lg ${notification.is_read
                              ? 'bg-white border-gray-200'
                              : 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300 shadow-md'
                              }`}
                          >
                            {/* Indicateur de lecture */}
                            {!notification.is_read && (
                              <div className="absolute top-4 right-4">
                                <div className="w-3 h-3 bg-blue-600 rounded-full animate-pulse"></div>
                              </div>
                            )}

                            <div className="flex items-start space-x-4">
                              {/* Icône selon le type */}
                              <div className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center ${notification.type === 'success' ? 'bg-green-100 text-green-600' :
                                notification.type === 'warning' ? 'bg-yellow-100 text-yellow-600' :
                                  notification.type === 'error' ? 'bg-red-100 text-red-600' :
                                    'bg-blue-100 text-blue-600'
                                }`}>
                                {notification.type === 'success' ? '✓' :
                                  notification.type === 'warning' ? '⚠' :
                                    notification.type === 'error' ? '✗' : 'ℹ'}
                              </div>

                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between">
                                  <div className="flex-1">
                                    <h4 className={`font-semibold text-lg ${notification.is_read ? 'text-gray-900' : 'text-blue-900'
                                      }`}>
                                      {notification.title}
                                    </h4>
                                    <p className={`mt-2 text-sm leading-relaxed ${notification.is_read ? 'text-gray-600' : 'text-blue-700'
                                      }`}>
                                      {notification.message}
                                    </p>
                                    <div className="flex items-center mt-3 space-x-4">
                                      <span className="text-xs text-gray-500 flex items-center">
                                        <Clock className="w-3 h-3 mr-1" />
                                        {formatDate(notification.created_at)}
                                      </span>
                                      <span className={`text-xs px-2 py-1 rounded-full ${notification.type === 'success' ? 'bg-green-100 text-green-700' :
                                        notification.type === 'warning' ? 'bg-yellow-100 text-yellow-700' :
                                          notification.type === 'error' ? 'bg-red-100 text-red-700' :
                                            'bg-blue-100 text-blue-700'
                                        }`}>
                                        {notification.type === 'success' ? 'Succès' :
                                          notification.type === 'warning' ? 'Avertissement' :
                                            notification.type === 'error' ? 'Erreur' : 'Information'}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Actions */}
                            <div className="mt-4 pt-4 border-t border-gray-100 flex justify-end space-x-2">
                              {!notification.is_read && (
                                <button
                                  onClick={() => {
                                    notification.is_read = true;
                                    setNotifications([...notifications]);
                                  }}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                                >
                                  Marquer comme lu
                                </button>
                              )}
                              <button
                                onClick={() => {
                                  // Supprimer la notification
                                  setNotifications(notifications.filter(n => n.id !== notification.id));
                                }}
                                className="text-xs text-gray-500 hover:text-red-600 font-medium"
                              >
                                Supprimer
                              </button>
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
                      {/* Contrôle du tracking */}
                      <div>
                        <LocationTrackingControl
                          userType="technician"
                          userId={user?.technician?.id || 0}
                          title="Contrôle de ma position"
                          description="Activez le suivi pour partager votre position en temps réel avec les clients"
                          onTrackingStart={() => console.log('📍 Tracking démarré')}
                          onTrackingStop={() => console.log('🛑 Tracking arrêté')}
                          onLocationUpdate={(lat, lng) => console.log('📍 Position mise à jour:', lat, lng)}
                          onError={(error) => console.error('📍 Erreur:', error)}
                        />
                      </div>

                      {/* Carte en temps réel */}
                      <div>
                        <LiveLocationMap
                          userType="technician"
                          userId={user?.technician?.id || 0}
                          title="Ma position en temps réel"
                          height="400px"
                          showGoogleMapsLink={true}
                          onLocationReceived={(lat, lng) => console.log('🗺️ Position reçue sur carte:', lat, lng)}
                        />
                      </div>
                    </div>

                    {/* Section pour suivre la position d'un client spécifique */}
                    {repairRequests.filter(req => req.status === 'assigned' || req.status === 'in_progress').length > 0 && (
                      <div className="mt-8">
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Suivi des clients</h3>
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                          {repairRequests
                            .filter(req => req.status === 'assigned' || req.status === 'in_progress')
                            .map(request => (
                              <div key={request.id} className="bg-white rounded-lg shadow-md p-4">
                                <h4 className="font-semibold text-gray-900 mb-2">
                                  Client: {request.client?.user?.username || 'Client inconnu'}
                                </h4>
                                <p className="text-sm text-gray-600 mb-4">
                                  Demande: {request.service?.name || 'Service non spécifié'}
                                </p>

                                <LiveLocationMap
                                  userType="client"
                                  userId={request.client.id}
                                  title={`Position de ${request.client?.user?.username || 'Client'}`}
                                  height="300px"
                                  showGoogleMapsLink={true}
                                  onLocationReceived={(lat, lng) => {
                                    console.log(`🗺️ Position client ${request.client?.user?.username || 'Client'}:`, lat, lng);
                                  }}
                                />
                              </div>
                            ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'reviews' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Avis reçus</h2>

                    {/* Message pour les utilisateurs non-techniciens */}
                    {!user?.technician && (
                      <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-blue-800">
                              Accès limité
                            </h3>
                            <div className="mt-2 text-sm text-blue-700">
                              <p>
                                Cette section est réservée aux techniciens. Seuls les techniciens peuvent voir les avis reçus de leurs clients.
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

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
                              data: [avgPunctuality, avgQuality, avgCommunication],
                              backgroundColor: ['#fbbf24', '#a3e635', '#22d3ee']
                            }]
                          }}
                          options={{ responsive: true, plugins: { legend: { display: false } }, scales: { y: { min: 0, max: 5 } } }}
                        />
                        <div className="mt-2 text-sm text-gray-500">Ponctualité : {avgPunctuality.toFixed(2)} / Qualité : {avgQuality.toFixed(2)} / Communication : {avgCommunication.toFixed(2)}</div>
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
                              data: reviewStats.byNote,
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
                            labels: reviewStats.byDate.map(([date]) => date),
                            datasets: [{
                              label: 'Avis reçus',
                              data: reviewStats.byDate.map(([_, count]) => count),
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
                                <span className="ml-2 text-xs text-gray-500">{new Date((review.created_at ?? '') as string).toLocaleString('fr-FR')}</span>
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

                {activeTab === 'rewards' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Système de Récompenses</h2>
                    {user?.technician?.id ? (
                      <RewardsPanel technicianId={user.technician.id} />
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Récompenses non disponibles
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>Vous devez être connecté en tant que technicien pour accéder à cette fonctionnalité.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'subscription' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Gestion de l'Abonnement</h2>

                    {/* Widget de statut en temps réel */}
                    <div className="mb-6">
                      <SubscriptionStatusWidget
                        autoRefresh={true}
                        refreshInterval={30000} // 30 secondes
                        showDetails={true}
                      />
                    </div>

                    {/* Panel de gestion d'abonnement */}
                    {user?.technician?.id ? (
                      <SubscriptionPanel technicianId={user.technician.id} />
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Abonnement non disponible
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>Vous devez être connecté en tant que technicien pour accéder à cette fonctionnalité.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === 'profile' && (
                  <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800">Gestion du Profil</h2>
                    {user?.technician?.id ? (
                      <TechnicianProfile technicianId={user.technician.id} />
                    ) : (
                      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
                        <div className="flex items-center">
                          <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="ml-3">
                            <h3 className="text-sm font-medium text-yellow-800">
                              Profil technicien non disponible
                            </h3>
                            <div className="mt-2 text-sm text-yellow-700">
                              <p>Vous devez être connecté en tant que technicien pour accéder à cette fonctionnalité.</p>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {chatError && (
            <div
              className="fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in-out"
              role="alert"
              tabIndex={-1}
              ref={el => el && el.focus()}
              style={{ outline: 'none' }}
            >
              {chatError}
            </div>
          )}
          {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}
        </>
      )}
    </div>
  );
};

export default TechnicianDashboard;