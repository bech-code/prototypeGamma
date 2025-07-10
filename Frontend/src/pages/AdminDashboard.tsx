import React, { useState, useEffect, useContext } from 'react';
import { Users, Wrench, Clock, CheckCircle, AlertCircle, TrendingUp, MapPin, Phone, Star, MessageSquare, BarChart2, Shield, Globe, AlertTriangle, UserCheck, Bell, Settings, CreditCard } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import AdminRequestsMap from '../components/AdminRequestsMap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import AdminAlerts from "../components/AdminAlerts";
import AdminReports from "./AdminReports";
import AdminAuditLogs from "./AdminAuditLogs";
import AdminReviewList from "../components/AdminReviewList";
import AdminNavBar from "../components/AdminSidebar";
import { AuthContext } from "../contexts/AuthContext";
import { useNavigate } from 'react-router-dom';
import ErrorToast from '../components/ErrorToast';

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
  latitude?: number;
  longitude?: number;
  no_show_count: number;
  service: {
    id: number;
    name: string;
    description: string;
    price: number;
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

// Listes pour auto-complétion
const bamakoCities = [
  "Bamako", "Commune I", "Commune II", "Commune III", "Commune IV", "Commune V", "Commune VI",
  "Kalabancoro", "Kati", "Samaya", "Moribabougou", "Baguineda", "Siby",
  "Sotuba", "Magnambougou", "Yirimadio", "Sabalibougou", "Lafiabougou", "Badalabougou", "Hamdallaye", "Missira", "Niamakoro", "Banankabougou", "Daoudabougou", "Djicoroni", "Sogoniko", "Faladié", "Niaréla", "Quinzambougou", "Medina Coura", "Bacodjicoroni", "Torokorobougou", "Sebenicoro", "N'Tomikorobougou", "Kalaban Coura", "Kalabanbougou", "Boulkassoumbougou", "Dialakorodji", "Niamana", "Sirakoro Meguetana", "Sangarebougou", "Zerny", "N'Tabacoro", "Niamakoro Koko", "Sikoroni", "Sabalibougou", "Sogonafing", "Djélibougou", "Banconi", "Lassa", "Sébenikoro", "N'Tomikorobougou", "Niaréla", "Bolibana", "Korofina", "Hippodrome", "Point G", "Badialan", "Bamako Coura", "Bagadadji", "Fadjiguila", "Doumanzana", "Missabougou", "N'Tomikorobougou", "Sokorodji", "Koulouba", "Kouloubléni", "Koulouba Plateau", "Koulouba Marché", "Koulouba Gare", "Koulouba Cité", "Koulouba Extension"
];

// Mapping quartiers -> communes
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
};

function isCoherent(quartier?: string, city?: string) {
  if (!quartier || !city) return true;
  const commune = quartierToCommune[quartier];
  if (!commune) return true;
  return city.toLowerCase().includes(commune.toLowerCase());
}

// Fonction d'export CSV
function exportRequestsToCSV(requests: any[]) {
  const headers = [
    'ID', 'Service', 'Client', 'Adresse', 'Quartier', 'Ville', 'Statut', 'Urgence', 'Latitude', 'Longitude'
  ];
  const rows = requests.map(req => [
    req.id,
    req.service,
    req.client,
    req.address,
    req.quartier || '',
    req.city || '',
    req.status,
    req.is_urgent ? 'Oui' : 'Non',
    req.latitude ?? 0,
    req.longitude ?? 0
  ]);
  const csvContent = [headers, ...rows].map(e => e.map(x => `"${(x ?? '').toString().replace(/"/g, '""')}"`).join(',')).join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', 'demandes_reparation.csv');
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Helpers pour extraire quartier et commune depuis l'adresse
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

function normalizeRepairRequests(data: any): RepairRequest[] {
  if (Array.isArray(data)) return data;
  if (data && Array.isArray(data.results)) return data.results;
  return [];
}

const AdminDashboard: React.FC = () => {
  const { user, loading } = useContext(AuthContext) ?? {};
  const navigate = useNavigate();
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<Technician[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [activeTab, setActiveTab] = useState<string>('requests');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [selectedRequest, setSelectedRequest] = useState<RepairRequest | null>(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [cityFilter, setCityFilter] = useState('');
  const [quartierFilter, setQuartierFilter] = useState('');
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [quartierSuggestions, setQuartierSuggestions] = useState<string[]>([]);
  const [showQuartierSuggestions, setShowQuartierSuggestions] = useState(false);
  const citySuggestionsRef = React.useRef<HTMLDivElement>(null);
  const quartierSuggestionsRef = React.useRef<HTMLDivElement>(null);
  const [editingRequestId, setEditingRequestId] = useState<number | null>(null);
  const [editQuartier, setEditQuartier] = useState('');
  const [editCommune, setEditCommune] = useState('');
  const [editSuggestions, setEditSuggestions] = useState<string[]>([]);
  const [showEditSuggestions, setShowEditSuggestions] = useState(false);
  const editSuggestionsRef = React.useRef<HTMLDivElement>(null);
  const [showOnlyIncoherent, setShowOnlyIncoherent] = useState(false);
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [securityLoading, setSecurityLoading] = useState(false);
  const [securityError, setSecurityError] = useState<string | null>(null);
  const [securityPeriod, setSecurityPeriod] = useState<'day' | 'week' | 'month'>('week');
  const [securityTrends, setSecurityTrends] = useState<any[]>([]);
  const [recentAlerts, setRecentAlerts] = useState<any[]>([]);
  const [alertsLoading, setAlertsLoading] = useState(false);
  const [alertsError, setAlertsError] = useState<string | null>(null);
  const [loginLocations, setLoginLocations] = useState<any[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);

  // États pour les toasts et feedback
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fonction pour afficher les toasts
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    if (user?.user_type === 'admin') {
      fetchDashboardData();
      if (activeTab === 'security') {
        fetchSecurityStats();
        fetchSecurityTrends();
        fetchRecentAlerts();
        fetchLoginLocations();
      }
    }
  }, [user, activeTab]);

  const fetchDashboardData = async () => {
    try {
      const [requestsResponse, statsResponse, notificationsResponse] = await Promise.all([
        fetchWithAuth('/depannage/api/repair-requests/'),
        fetchWithAuth('/depannage/api/dashboard/stats/'),
        fetchWithAuth('/depannage/api/notifications/')
      ]);

      if (requestsResponse.ok) {
        const requestsData = await requestsResponse.json();
        setRepairRequests(normalizeRepairRequests(requestsData));
      } else {
        showToast('error', 'Erreur lors du chargement des demandes');
      }

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        let backendMsg = '';
        try {
          const errData = await statsResponse.json();
          backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
        } catch { }
        showToast('error', `Erreur lors du chargement des statistiques (code ${statsResponse.status})${backendMsg ? ': ' + backendMsg : ''}`);
      }

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData);
      } else {
        showToast('error', 'Erreur lors du chargement des notifications');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des données:', error);
      showToast('error', 'Erreur de connexion au serveur');
    }
  };

  const fetchAvailableTechnicians = async (specialty: string) => {
    try {
      const response = await fetchWithAuth(`/depannage/api/technicians/?specialty=${specialty}&available=true`);
      if (response.ok) {
        const data = await response.json();
        setAvailableTechnicians(data);
      } else {
        showToast('error', 'Erreur lors du chargement des techniciens');
      }
    } catch (error) {
      console.error('Erreur lors du chargement des techniciens:', error);
      showToast('error', 'Erreur de connexion');
    }
  };

  const assignTechnician = async (requestId: number, technicianId: number) => {
    setAssignLoading(true);
    try {
      const response = await fetchWithAuth(`/depannage/api/repair-requests/${requestId}/assign/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ technician_id: technicianId }),
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedRequest(null);
        showToast('success', 'Technicien assigné avec succès');
        fetchDashboardData(); // Recharger les données
      } else {
        const errorData = await response.json();
        showToast('error', errorData.message || 'Erreur lors de l\'assignation');
      }
    } catch (error) {
      console.error('Erreur lors de l\'assignation:', error);
      showToast('error', 'Erreur de connexion lors de l\'assignation');
    } finally {
      setAssignLoading(false);
    }
  };

  const openAssignModal = (request: RepairRequest) => {
    setSelectedRequest(request);
    fetchAvailableTechnicians(request.specialty_needed);
    setShowAssignModal(true);
  };

  // Fonction pour naviguer vers la gestion des utilisateurs
  const handleUserManagement = () => {
    navigate('/admin/user-management');
  };

  // Fonction pour naviguer vers les statistiques
  const handleStatistics = () => {
    navigate('/admin/statistics');
  };

  // Fonction pour naviguer vers la configuration
  const handleConfiguration = () => {
    navigate('/admin/configuration');
  };

  const handleSubscriptionRequests = () => {
    navigate('/admin/subscription-requests');
  };

  // Fonction pour exporter les données
  const handleExportData = () => {
    try {
      exportRequestsToCSV(filteredRequestsForMap.map(req => ({
        id: req.id,
        service: req.service,
        client: req.client?.user?.email || '',
        address: req.client?.address || '',
        quartier: quartierFilter || '',
        city: cityFilter || '',
        status: req.status,
        is_urgent: req.priority === 'urgent',
        latitude: req.latitude ?? 0,
        longitude: req.longitude ?? 0
      })));
      showToast('success', 'Export CSV réussi');
    } catch (error) {
      showToast('error', 'Erreur lors de l\'export');
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
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Filtrage des demandes
  const filteredRequests = repairRequests.filter(request => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'manual_intervention') return request.no_show_count > 2;
    return request.status === filterStatus;
  });

  const filteredRequestsForMap = filteredRequests.filter(request =>
    request.latitude && request.longitude
  );

  // Fonctions de sécurité améliorées
  const fetchSecurityStats = async () => {
    setSecurityLoading(true);
    setSecurityError(null);
    try {
      // Endpoint temporairement désactivé - à implémenter dans le backend
      setSecurityStats({
        total_alerts: 0,
        high_risk_alerts: 0,
        medium_risk_alerts: 0,
        low_risk_alerts: 0
      });
    } catch (error) {
      setSecurityError('Erreur de connexion');
      showToast('error', 'Erreur de connexion');
    } finally {
      setSecurityLoading(false);
    }
  };

  const fetchSecurityTrends = async () => {
    try {
      // Endpoint temporairement désactivé - à implémenter dans le backend
      setSecurityTrends([]);
    } catch (error) {
      console.error('Erreur lors du chargement des tendances:', error);
      showToast('error', 'Erreur de connexion');
    }
  };

  const fetchRecentAlerts = async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const response = await fetchWithAuth('/depannage/api/admin/security/alerts/recent/');
      if (response.ok) {
        const data = await response.json();
        setRecentAlerts(data);
      } else {
        setAlertsError('Erreur lors du chargement des alertes');
        showToast('error', 'Erreur lors du chargement des alertes');
      }
    } catch (error) {
      setAlertsError('Erreur de connexion');
      showToast('error', 'Erreur de connexion');
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchLoginLocations = async () => {
    setLocationsLoading(true);
    setLocationsError(null);
    try {
      const response = await fetchWithAuth('/depannage/api/admin/security/login-locations/');
      if (response.ok) {
        const data = await response.json();
        setLoginLocations(data);
      } else {
        setLocationsError('Erreur lors du chargement des localisations');
        showToast('error', 'Erreur lors du chargement des localisations');
      }
    } catch (error) {
      setLocationsError('Erreur de connexion');
      showToast('error', 'Erreur de connexion');
    } finally {
      setLocationsLoading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-screen">Chargement...</div>;
  }

  if (!user || user?.user_type !== "admin") {
    return <div className="text-red-600 p-8 text-center font-bold">Accès réservé à l'administration.</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section - structure identique à Statistiques */}
      <section className="relative bg-gradient-to-r from-blue-900 to-blue-700 text-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Tableau de bord Administrateur
            </h1>
            <p className="text-xl text-blue-100 mb-2">
              Bienvenue, {user?.username || 'Administrateur'}
            </p>
            <p className="text-lg text-blue-100 mb-8">
              Supervisez l'activité, gérez les équipes et pilotez la plateforme en toute sérénité.
            </p>
          </div>
        </div>
      </section>

      {/* Sous-menu horizontal */}
      <AdminNavBar activeTab={activeTab} onTabChange={setActiveTab} />

      {/* Contenu principal */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Toast notifications */}
        {toast && (
          <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg ${toast.type === 'success' ? 'bg-green-500 text-white' :
            toast.type === 'error' ? 'bg-red-500 text-white' :
              'bg-blue-500 text-white'
            }`}>
            {toast.message}
          </div>
        )}
        {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}

        {/* Statistiques générales */}
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

        {/* Actions rapides */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-lg font-semibold mb-4">Actions rapides</h2>
          <div className="flex flex-wrap gap-4">
            <button
              onClick={handleUserManagement}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Gérer les utilisateurs
            </button>
            <button
              onClick={handleStatistics}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Voir les statistiques
            </button>
            <button
              onClick={handleConfiguration}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Configuration
            </button>
            <button
              onClick={handleSubscriptionRequests}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
            >
              Abonnements
            </button>
            {activeTab === 'requests' && (
              <button
                onClick={handleExportData}
                className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Exporter les données
              </button>
            )}
          </div>
        </div>

        {/* Contenu des onglets */}
        <div className="bg-white rounded-lg shadow">
          {activeTab === 'requests' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Gestion des demandes</h2>
              <AdminRequestsMap requests={filteredRequestsForMap.map(req => ({
                id: req.id,
                latitude: req.latitude ?? 0,
                longitude: req.longitude ?? 0,
                address: req.client?.address || '',
                city: '',
                service: req.service ? normalizeService(req.service) : { id: 0, name: '', description: '', price: 0 },
                status: req.status,
                priority: req.priority === 'urgent' ? 'high' : req.priority, // Correction ici
                client: req.client ? {
                  ...req.client,
                  user: normalizeUser(req.client.user)
                } : {
                  id: 0,
                  user: normalizeUser(undefined),
                  phone: '',
                  address: ''
                },
                client_email: req.client?.user?.email ?? '',
                created_at: req.created_at ?? '',
                updated_at: (req as any).updated_at ?? '',
                severity: (req as any).severity ?? '',
                technician: undefined,
                conversation: normalizeConversation(req.conversation),
              }))} />
            </div>
          )}

          {activeTab === 'technicians' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Gestion des techniciens</h2>
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Gestion des techniciens</h3>
                <p className="mt-1 text-sm text-gray-500">Interface de gestion des techniciens à venir.</p>
                <button
                  onClick={handleUserManagement}
                  className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Accéder à la gestion des utilisateurs
                </button>
              </div>
            </div>
          )}

          {activeTab === 'notifications' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Notifications</h2>
              <div className="text-center py-12">
                <Bell className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Notifications</h3>
                <p className="mt-1 text-sm text-gray-500">Interface de gestion des notifications à venir.</p>
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Sécurité</h2>
              <div className="mb-6">
                <div className="flex gap-2">
                  <button
                    onClick={() => setSecurityPeriod('day')}
                    className={`px-3 py-1 rounded ${securityPeriod === 'day' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    Jour
                  </button>
                  <button
                    onClick={() => setSecurityPeriod('week')}
                    className={`px-3 py-1 rounded ${securityPeriod === 'week' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    Semaine
                  </button>
                  <button
                    onClick={() => setSecurityPeriod('month')}
                    className={`px-3 py-1 rounded ${securityPeriod === 'month' ? 'bg-blue-600 text-white' : 'bg-gray-200'}`}
                  >
                    Mois
                  </button>
                </div>
              </div>

              {securityLoading && <div>Chargement des statistiques...</div>}
              {securityError && <div className="text-red-600">{securityError}</div>}

              {securityStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
                    <BarChart2 className="w-8 h-8 text-blue-700" />
                    <div>
                      <div className="text-2xl font-bold">{securityStats.total_logins}</div>
                      <div className="text-gray-600">Connexions réussies</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
                    <AlertTriangle className="w-8 h-8 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold">{securityStats.failed_logins}</div>
                      <div className="text-gray-600">Connexions échouées</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
                    <UserCheck className="w-8 h-8 text-green-600" />
                    <div>
                      <div className="text-2xl font-bold">{securityStats.otp_sent}</div>
                      <div className="text-gray-600">OTP envoyés</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'reports' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Signalements</h2>
              <AdminReports />
            </div>
          )}

          {activeTab === 'alerts' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Alertes</h2>
              <AdminAlerts />
            </div>
          )}

          {activeTab === 'audit-logs' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Journaux d'audit</h2>
              <AdminAuditLogs />
            </div>
          )}

          {activeTab === 'reviews' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Modération des avis</h2>
              <AdminReviewList />
            </div>
          )}

          {activeTab === 'statistics' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Statistiques</h2>
              <div className="text-center py-12">
                <BarChart2 className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Statistiques avancées</h3>
                <p className="mt-1 text-sm text-gray-500">Interface de statistiques avancées à venir.</p>
                <button
                  onClick={handleStatistics}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Accéder aux statistiques
                </button>
              </div>
            </div>
          )}

          {activeTab === 'configuration' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Configuration</h2>
              <div className="text-center py-12">
                <Settings className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Configuration</h3>
                <p className="mt-1 text-sm text-gray-500">Interface de configuration à venir.</p>
                <button
                  onClick={handleConfiguration}
                  className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Accéder à la configuration
                </button>
              </div>
            </div>
          )}

          {activeTab === 'subscription-requests' && (
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-6">Demandes d'abonnement</h2>
              <div className="text-center py-12">
                <CreditCard className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Gestion des abonnements</h3>
                <p className="mt-1 text-sm text-gray-500">Interface de gestion des demandes d'abonnement.</p>
                <button
                  onClick={handleSubscriptionRequests}
                  className="mt-4 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Accéder aux demandes d'abonnement
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal d'assignation amélioré */}
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
                      onClick={() => !assignLoading && assignTechnician(selectedRequest.id, technician.id)}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="font-medium text-gray-900">
                            {technician.user?.username || technician.user?.email || 'Utilisateur inconnu'}
                          </p>
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
                  disabled={assignLoading}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Annuler
                </button>
                {assignLoading && (
                  <div className="flex items-center px-4 py-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    <span className="ml-2 text-sm text-gray-600">Assignation...</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;