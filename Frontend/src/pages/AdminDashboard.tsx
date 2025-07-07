import React, { useState, useEffect } from 'react';
import { Users, Wrench, Clock, CheckCircle, AlertCircle, TrendingUp, MapPin, Phone, Star, MessageSquare, BarChart2, Shield, Globe, AlertTriangle, UserCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import AdminRequestsMap from '../components/AdminRequestsMap';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Bar, BarChart } from 'recharts';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

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

// Listes pour auto-complétion (mêmes que BookingForm)
const bamakoCities = [
  "Bamako", "Commune I", "Commune II", "Commune III", "Commune IV", "Commune V", "Commune VI",
  "Kalabancoro", "Kati", "Samaya", "Moribabougou", "Baguineda", "Siby",
  "Sotuba", "Magnambougou", "Yirimadio", "Sabalibougou", "Lafiabougou", "Badalabougou", "Hamdallaye", "Missira", "Niamakoro", "Banankabougou", "Daoudabougou", "Djicoroni", "Sogoniko", "Faladié", "Niaréla", "Quinzambougou", "Medina Coura", "Bacodjicoroni", "Torokorobougou", "Sebenicoro", "N'Tomikorobougou", "Kalaban Coura", "Kalabanbougou", "Boulkassoumbougou", "Dialakorodji", "Niamana", "Sirakoro Meguetana", "Sangarebougou", "Zerny", "N'Tabacoro", "Niamakoro Koko", "Sikoroni", "Sabalibougou", "Sogonafing", "Djélibougou", "Banconi", "Lassa", "Sébenikoro", "N'Tomikorobougou", "Niaréla", "Bolibana", "Korofina", "Hippodrome", "Point G", "Badialan", "Bamako Coura", "Bagadadji", "Fadjiguila", "Doumanzana", "Missabougou", "N'Tomikorobougou", "Sokorodji", "Koulouba", "Kouloubléni", "Koulouba Plateau", "Koulouba Marché", "Koulouba Gare", "Koulouba Cité", "Koulouba Extension"
];

// Mapping quartiers -> communes (doit être le même que dans AdminRequestsMap)
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

// Helpers pour extraire quartier et commune depuis l'adresse (ex: 'Sotuba, Commune I, Bamako')
function extractQuartier(address: string) {
  if (!address) return '';
  const parts = address.split(',');
  return parts[0]?.trim() || '';
}
function extractCommune(address: string) {
  if (!address) return '';
  const parts = address.split(',');
  // On suppose que la commune est en 2e position
  return parts[1]?.trim() || '';
}

const AdminDashboard: React.FC = () => {
  const { user, token } = useAuth();
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [availableTechnicians, setAvailableTechnicians] = useState<Technician[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'requests' | 'technicians' | 'notifications' | 'security'>('requests');
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
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  useEffect(() => {
    if (repairRequests.some(r => r.no_show_count > 2)) {
      setToast('Attention : certaines demandes nécessitent une intervention humaine. Merci de les traiter en priorité.');
    }
  }, [repairRequests]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Récupérer les demandes de réparation
      const requestsResponse = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/repair-requests/', {
        headers: {
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
      const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/repair-requests/available_technicians/?specialty=${specialty}`, {
        headers: {
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
      const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/repair-requests/${requestId}/assign_technician/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ technician_id: technicianId }),
      });

      if (response.ok) {
        setShowAssignModal(false);
        setSelectedRequest(null);
        fetchDashboardData();
      } else {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = null;
        }
        console.error('Erreur lors de l\'assignation', errorData);
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
    if (filterStatus === 'manual_intervention') return request.no_show_count > 2;
    return request.status === filterStatus;
  });

  // Suggestions auto-complétion ville
  const handleCityFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCityFilter(value);
    if (value.length < 1) {
      setCitySuggestions([]);
      setShowCitySuggestions(false);
      return;
    }
    const filtered = bamakoCities.filter(city => city.toLowerCase().includes(value.toLowerCase()));
    setCitySuggestions(filtered);
    setShowCitySuggestions(filtered.length > 0);
  };
  const handleCitySuggestionClick = (city: string) => {
    setCityFilter(city);
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };
  // Suggestions auto-complétion quartier (à partir des quartiers de la liste)
  const allQuartiers = bamakoCities.filter(q => !q.toLowerCase().includes('commune') && q !== 'Bamako');
  const handleQuartierFilterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuartierFilter(value);
    if (value.length < 1) {
      setQuartierSuggestions([]);
      setShowQuartierSuggestions(false);
      return;
    }
    const filtered = allQuartiers.filter(q => q.toLowerCase().includes(value.toLowerCase()));
    setQuartierSuggestions(filtered);
    setShowQuartierSuggestions(filtered.length > 0);
  };
  const handleQuartierSuggestionClick = (quartier: string) => {
    setQuartierFilter(quartier);
    setQuartierSuggestions([]);
    setShowQuartierSuggestions(false);
  };
  // Fermer suggestions si clic en dehors
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (citySuggestionsRef.current && !citySuggestionsRef.current.contains(event.target as Node)) {
        setShowCitySuggestions(false);
      }
      if (quartierSuggestionsRef.current && !quartierSuggestionsRef.current.contains(event.target as Node)) {
        setShowQuartierSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Filtrage des demandes pour la carte
  const filteredRequestsForMap = repairRequests.filter(req => {
    const cityMatch = cityFilter ? (req.client.address?.toLowerCase().includes(cityFilter.toLowerCase()) || req.client.address?.toLowerCase().includes(cityFilter.toLowerCase())) : true;
    const quartierMatch = quartierFilter ? req.client.address?.toLowerCase().includes(quartierFilter.toLowerCase()) : true;
    return cityMatch && quartierMatch && req.latitude && req.longitude;
  });

  // Suggestions auto-complétion pour correction
  const handleEditQuartierChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setEditQuartier(value);
    if (value.length < 1) {
      setEditSuggestions([]);
      setShowEditSuggestions(false);
      return;
    }
    const filtered = allQuartiers.filter(q => q.toLowerCase().includes(value.toLowerCase()));
    setEditSuggestions(filtered);
    setShowEditSuggestions(filtered.length > 0);
  };
  const handleEditSuggestionClick = (quartier: string) => {
    setEditQuartier(quartier);
    setEditSuggestions([]);
    setShowEditSuggestions(false);
    setEditCommune(quartierToCommune[quartier] || '');
  };
  // Fermer suggestions si clic en dehors
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editSuggestionsRef.current && !editSuggestionsRef.current.contains(event.target as Node)) {
        setShowEditSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  // Correction API
  const handleCorrection = async (requestId: number) => {
    try {
      await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/repair-requests/${requestId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quartier: editQuartier, commune: editCommune })
      });
      setEditingRequestId(null);
      setEditQuartier('');
      setEditCommune('');
      fetchDashboardData();
    } catch (e) {
      alert('Erreur lors de la correction');
    }
  };

  // Fetch stats sécurité quand l'onglet ou la période change
  useEffect(() => {
    if (activeTab === 'security') {
      fetchSecurityStats();
      fetchSecurityTrends();
      fetchRecentAlerts();
      fetchLoginLocations();
    }
    // eslint-disable-next-line
  }, [activeTab, securityPeriod]);

  const fetchSecurityStats = async () => {
    setSecurityLoading(true);
    setSecurityError(null);
    try {
      const resp = await fetchWithAuth('http://127.0.0.1:8000/users/admin/security-dashboard/', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error('Erreur lors de la récupération des stats sécurité');
      const data = await resp.json();
      setSecurityStats(data);
    } catch (e: any) {
      setSecurityError(e.message || 'Erreur inconnue');
    } finally {
      setSecurityLoading(false);
    }
  };

  const fetchSecurityTrends = async () => {
    try {
      const resp = await fetchWithAuth(`http://127.0.0.1:8000/users/admin/security-dashboard/?period=${securityPeriod}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error('Erreur lors de la récupération des tendances sécurité');
      const data = await resp.json();
      setSecurityTrends(data.trends || []);
    } catch (e: any) {
      setSecurityTrends([]);
    }
  };

  const fetchRecentAlerts = async () => {
    setAlertsLoading(true);
    setAlertsError(null);
    try {
      const resp = await fetchWithAuth('http://127.0.0.1:8000/users/admin/security-notifications/?limit=10', {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
      });
      if (!resp.ok) throw new Error('Erreur lors de la récupération des alertes');
      const data = await resp.json();
      setRecentAlerts(data.results || []);
    } catch (e: any) {
      setAlertsError(e.message || 'Erreur inconnue');
      setRecentAlerts([]);
    } finally {
      setAlertsLoading(false);
    }
  };

  const fetchLoginLocations = async () => {
    try {
      setLocationsLoading(true);
      setLocationsError(null);
      const response = await fetchWithAuth('/users/admin/login-locations/?limit=100');
      if (response.ok) {
        const data = await response.json();
        setLoginLocations(data);
      } else {
        setLocationsError('Erreur lors du chargement des localisations');
      }
    } catch (error) {
      setLocationsError('Erreur de connexion');
    } finally {
      setLocationsLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const interventionRequests = repairRequests.filter(r => r.no_show_count > 2);
  {
    interventionRequests.length > 0 && (
      <div className="sticky top-0 z-50 w-full bg-orange-100 text-orange-900 px-4 py-3 flex flex-col md:flex-row items-center justify-between shadow-lg border-b border-orange-300 animate-pulse">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 animate-bounce" />
          <span className="font-bold">{interventionRequests.length} demande{interventionRequests.length > 1 ? 's' : ''} nécessitant une intervention humaine</span>
          <span className="hidden md:inline">Merci de votre réactivité. Ces clients attendent une prise en charge personnalisée.</span>
        </div>
        <div className="flex gap-2 mt-2 md:mt-0">
          {interventionRequests.slice(0, 3).map(req => (
            <button key={req.id} onClick={() => setFilterStatus('manual_intervention')} className="bg-orange-500 text-white font-semibold px-3 py-1 rounded shadow hover:bg-orange-600 transition-colors">
              #{req.id}
            </button>
          ))}
          {interventionRequests.length > 3 && <span className="text-xs ml-2">(+{interventionRequests.length - 3} autres)</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-900 to-blue-700 text-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-4">
              Tableau de Bord Administrateur
            </h1>
            <p className="text-xl text-blue-100 mb-2">
              Bienvenue, Mr {user?.username || 'Administrateur'}
            </p>
            <p className="text-lg text-blue-100 mb-8">
              Gérez votre plateforme, supervisez les techniciens et suivez les performances de votre service.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-800/50 p-6 rounded-lg">
                <Wrench className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Demandes</h3>
                <p className="text-sm text-blue-100">Gérez les demandes de réparation</p>
              </div>
              <div className="bg-blue-800/50 p-6 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Techniciens</h3>
                <p className="text-sm text-blue-100">Supervisez les techniciens</p>
              </div>
              <div className="bg-blue-800/50 p-6 rounded-lg">
                <AlertCircle className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Notifications</h3>
                <p className="text-sm text-blue-100">Suivez les alertes</p>
              </div>
              <div className="bg-blue-800/50 p-6 rounded-lg">
                <Shield className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Sécurité</h3>
                <p className="text-sm text-blue-100">Dashboard sécurité avancé</p>
              </div>
            </div>
          </div>
        </div>
      </section>

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

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
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
        <div className="flex gap-4 border-b mb-6">
          <button onClick={() => setActiveTab('requests')} className={`py-2 px-4 border-b-2 ${activeTab === 'requests' ? 'border-blue-700 text-blue-700 font-bold' : 'border-transparent text-gray-600'}`}>Demandes</button>
          <button onClick={() => setActiveTab('technicians')} className={`py-2 px-4 border-b-2 ${activeTab === 'technicians' ? 'border-blue-700 text-blue-700 font-bold' : 'border-transparent text-gray-600'}`}>Techniciens</button>
          <button onClick={() => setActiveTab('notifications')} className={`py-2 px-4 border-b-2 ${activeTab === 'notifications' ? 'border-blue-700 text-blue-700 font-bold' : 'border-transparent text-gray-600'}`}>Notifications</button>
          <button onClick={() => setActiveTab('security')} className={`py-2 px-4 border-b-2 ${activeTab === 'security' ? 'border-orange-600 text-orange-600 font-bold' : 'border-transparent text-gray-600'}`}><Shield className="inline w-5 h-5 mr-1" />Sécurité</button>
        </div>

        <div className="p-6">
          {activeTab === 'requests' && (
            <div>
              <div className="mb-8">
                {/* Bouton Export CSV */}
                <div className="mb-4">
                  <button
                    className="bg-green-600 hover:bg-green-700 text-white font-semibold py-2 px-6 rounded shadow"
                    onClick={() => exportRequestsToCSV(filteredRequestsForMap.map(req => ({
                      id: req.id,
                      service: req.title,
                      client: req.client.user.email,
                      address: req.client.address,
                      quartier: quartierFilter || '',
                      city: cityFilter || '',
                      status: req.status,
                      is_urgent: req.priority === 'urgent',
                      latitude: req.latitude ?? 0,
                      longitude: req.longitude ?? 0
                    })))}
                  >
                    Exporter CSV
                  </button>
                </div>
                {/* Filtres auto-complétés */}
                <div className="flex flex-wrap gap-4 mb-4">
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Filtrer par ville/commune"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={cityFilter}
                      onChange={handleCityFilterChange}
                      onFocus={() => citySuggestions.length > 0 && setShowCitySuggestions(true)}
                    />
                    {showCitySuggestions && citySuggestions.length > 0 && (
                      <div ref={citySuggestionsRef} className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-60 overflow-y-auto">
                        {citySuggestions.map((city, idx) => (
                          <div
                            key={city + '-' + idx}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                            onClick={() => handleCitySuggestionClick(city)}
                          >
                            {city}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="relative w-64">
                    <input
                      type="text"
                      placeholder="Filtrer par quartier"
                      className="w-full p-2 border border-gray-300 rounded-md"
                      value={quartierFilter}
                      onChange={handleQuartierFilterChange}
                      onFocus={() => quartierSuggestions.length > 0 && setShowQuartierSuggestions(true)}
                    />
                    {showQuartierSuggestions && quartierSuggestions.length > 0 && (
                      <div ref={quartierSuggestionsRef} className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-60 overflow-y-auto">
                        {quartierSuggestions.map((quartier, idx) => (
                          <div
                            key={quartier + '-' + idx}
                            className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                            onClick={() => handleQuartierSuggestionClick(quartier)}
                          >
                            {quartier}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
                {/* Carte interactive des demandes */}
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
                <AdminRequestsMap
                  requests={filteredRequestsForMap
                    .filter(req => typeof req.latitude === 'number' && typeof req.longitude === 'number' && !isNaN(req.latitude) && !isNaN(req.longitude))
                    .map(req => ({
                      id: req.id,
                      latitude: req.latitude ?? 0,
                      longitude: req.longitude ?? 0,
                      address: req.client.address,
                      city: cityFilter || '',
                      quartier: quartierFilter || '',
                      client: req.client.user.email,
                      service: req.title,
                      status: req.status,
                      is_urgent: req.priority === 'urgent',
                    }))}
                />
              </div>

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
                    onClick={() => setFilterStatus('pending')}
                    className={`px-3 py-1 rounded-full text-sm font-medium ${filterStatus === 'pending'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    En attente
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
                  <button
                    onClick={() => setFilterStatus('manual_intervention')}
                    className={`px-3 py-1 rounded-full text-sm font-medium transition-colors relative ${filterStatus === 'manual_intervention'
                      ? 'bg-orange-100 text-orange-800'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                  >
                    Intervention requise
                    {repairRequests.filter(r => r.no_show_count > 2).length > 0 && (
                      <span className="absolute -top-2 -right-2 bg-orange-500 text-white text-xs font-bold rounded-full px-2 py-0.5 animate-bounce">
                        {repairRequests.filter(r => r.no_show_count > 2).length}
                      </span>
                    )}
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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {filteredRequests.map((request) => (
                    <div key={request.id} className={`relative bg-white rounded-2xl shadow-lg border border-gray-100 p-6 flex flex-col md:flex-row gap-6 hover:shadow-2xl transition-all duration-200 group ${filterStatus === 'manual_intervention' && request.no_show_count > 2 ? 'ring-4 ring-orange-400' : ''}`}>
                      {/* Header de la carte */}
                      <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-6 border-b border-blue-200">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center space-x-3">
                            {/* Avatar client */}
                            <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-lg shadow-lg">
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
                            <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
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
                                        setEditingRequestId(request.id);
                                        setEditQuartier('');
                                        setEditCommune('');
                                      }}
                                    >Corriger</button>
                                    {editingRequestId === request.id && (
                                      <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-200 max-w-xs">
                                        <label className="text-xs font-semibold text-blue-900">Quartier</label>
                                        <div className="relative">
                                          <input
                                            type="text"
                                            className="w-full p-2 border border-blue-300 rounded text-sm"
                                            value={editQuartier}
                                            onChange={handleEditQuartierChange}
                                            placeholder="Quartier correct"
                                          />
                                          {showEditSuggestions && editSuggestions.length > 0 && (
                                            <div ref={editSuggestionsRef} className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-40 overflow-y-auto">
                                              {editSuggestions.map((quartier) => (
                                                <div
                                                  key={quartier}
                                                  className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                                                  onClick={() => handleEditSuggestionClick(quartier)}
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
                                          value={editCommune}
                                          onChange={e => setEditCommune(e.target.value)}
                                          placeholder="Commune correcte"
                                        />
                                        <div className="flex space-x-2 mt-3">
                                          <button
                                            className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded transition-colors"
                                            onClick={() => handleCorrection(request.id)}
                                          >Valider</button>
                                          <button
                                            className="flex-1 text-xs text-gray-500 underline hover:text-gray-700"
                                            onClick={() => setEditingRequestId(null)}
                                          >Annuler</button>
                                        </div>
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

                        {/* Informations du technicien assigné */}
                        {request.technician && (
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 mb-4 border border-blue-200">
                            <h4 className="font-semibold text-gray-900 mb-3 flex items-center">
                              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
                              Technicien assigné
                            </h4>
                            <div className="flex items-center space-x-3">
                              {/* Avatar technicien */}
                              <div className="w-10 h-10 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-md">
                                {(request.technician.user?.username || request.technician.user?.email || 'U').charAt(0).toUpperCase()}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium text-gray-900">
                                  {request.technician.user?.username || request.technician.user?.email || 'Utilisateur inconnu'}
                                </p>
                                <div className="flex items-center space-x-4 mt-1">
                                  <div className="flex items-center space-x-1">
                                    <Phone className="h-3 w-3 text-gray-400" />
                                    <span className="text-xs text-gray-600">{request.technician.phone}</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <Star className="h-3 w-3 text-yellow-400" />
                                    <span className="text-xs text-gray-600">{request.technician.average_rating}/5</span>
                                  </div>
                                  <div className="flex items-center space-x-1">
                                    <span className="text-xs text-gray-600 font-medium">{request.technician.hourly_rate} FCFA/h</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="flex flex-wrap gap-3">
                          {request.conversation && (
                            <button
                              onClick={() => window.location.href = `/chat/${request.conversation?.id}`}
                              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                              <MessageSquare className="h-4 w-4 mr-2" />
                              Chat
                              {request.conversation?.unread_count > 0 && (
                                <span className="ml-2 bg-red-500 text-white text-xs px-2 py-1 rounded-full font-bold">
                                  {request.conversation.unread_count}
                                </span>
                              )}
                            </button>
                          )}

                          {request.status === 'pending' && (
                            <button
                              onClick={() => openAssignModal(request)}
                              className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                              <Users className="h-4 w-4 mr-2" />
                              Assigner un technicien
                            </button>
                          )}

                          {request.status === 'assigned' && (
                            <button
                              onClick={() => openAssignModal(request)}
                              className="inline-flex items-center px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
                            >
                              <Users className="h-4 w-4 mr-2" />
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

          {activeTab === 'security' && (
            <div className="py-8">
              <h2 className="text-2xl font-bold mb-6 flex items-center"><Shield className="w-7 h-7 mr-2 text-orange-600" />Dashboard Sécurité</h2>
              {/* Sélecteur de période */}
              <div className="mb-6 flex gap-4 items-center">
                <span className="font-semibold">Période :</span>
                <select value={securityPeriod} onChange={e => setSecurityPeriod(e.target.value as any)} className="border rounded px-3 py-1">
                  <option value="day">Jour</option>
                  <option value="week">Semaine</option>
                  <option value="month">Mois</option>
                </select>
              </div>
              {/* Graphiques évolution connexions/alertes */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold mb-4 flex items-center"><BarChart2 className="w-5 h-5 mr-2 text-blue-700" />Évolution des connexions</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={securityTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="logins" stroke="#2563eb" name="Connexions" />
                      <Line type="monotone" dataKey="failed" stroke="#ef4444" name="Échecs" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="font-semibold mb-4 flex items-center"><AlertTriangle className="w-5 h-5 mr-2 text-orange-600" />Évolution des alertes</h3>
                  <ResponsiveContainer width="100%" height={250}>
                    <BarChart data={securityTrends} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="label" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="alerts" fill="#f59e42" name="Alertes" />
                      <Bar dataKey="otp" fill="#22c55e" name="OTP" />
                    </BarChart>
                  </ResponsiveContainer>
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
                  <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
                    <Shield className="w-8 h-8 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold">{securityStats.high_risk_logins}</div>
                      <div className="text-gray-600">Connexions à risque</div>
                    </div>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6 flex items-center gap-4">
                    <AlertTriangle className="w-8 h-8 text-orange-600" />
                    <div>
                      <div className="text-2xl font-bold">{securityStats.alerts}</div>
                      <div className="text-gray-600">Alertes sécurité</div>
                    </div>
                  </div>
                </div>
              )}
              {/* Emplacement pour graphiques, carte, top pays, top utilisateurs à risque, alertes récentes */}
              {securityStats && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold mb-4 flex items-center"><Globe className="w-5 h-5 mr-2 text-blue-700" />Top pays connexions</h3>
                    <ul className="space-y-2">
                      {securityStats.top_countries.map((c: any, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span>{c.geo_country || 'Inconnu'}</span>
                          <span className="font-bold">{c.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-white rounded-lg shadow p-6">
                    <h3 className="font-semibold mb-4 flex items-center"><UserCheck className="w-5 h-5 mr-2 text-orange-600" />Top utilisateurs à risque</h3>
                    <ul className="space-y-2">
                      {securityStats.top_risk_users.map((u: any, idx: number) => (
                        <li key={idx} className="flex justify-between">
                          <span>{u['user__email'] || 'Inconnu'}</span>
                          <span className="font-bold">{u.count}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
              {/* Après les graphiques, afficher la liste des alertes récentes */}
              <div className="mt-10">
                <h3 className="font-semibold mb-4 flex items-center text-lg"><AlertCircle className="w-5 h-5 mr-2 text-red-600" />Alertes récentes</h3>
                {alertsLoading && <div>Chargement des alertes...</div>}
                {alertsError && <div className="text-red-600">{alertsError}</div>}
                <ul className="space-y-3">
                  {recentAlerts.map((alert, idx) => (
                    <li key={idx} className="bg-red-50 border-l-4 border-red-600 p-4 rounded shadow-sm">
                      <div className="flex justify-between items-center mb-1">
                        <span className="font-bold text-red-700">{alert.subject}</span>
                        <span className="text-xs text-gray-500">{new Date(alert.sent_at).toLocaleString()}</span>
                      </div>
                      <div className="text-gray-800 text-sm">{alert.message}</div>
                      {alert.event_type && <div className="text-xs text-gray-500 mt-1">Type: {alert.event_type}</div>}
                    </li>
                  ))}
                  {recentAlerts.length === 0 && !alertsLoading && !alertsError && (
                    <li className="text-gray-500">Aucune alerte récente.</li>
                  )}
                </ul>
              </div>
              {/* Carte interactive des connexions */}
              <div className="mt-10">
                <h3 className="font-semibold mb-4 flex items-center text-lg"><Globe className="w-5 h-5 mr-2 text-blue-700" />Carte des connexions récentes</h3>
                {locationsLoading && <div>Chargement de la carte...</div>}
                {locationsError && <div className="text-red-600">{locationsError}</div>}
                <div className="w-full h-96 rounded-lg overflow-hidden shadow">
                  <MapContainer center={[12.6392, -8.0029]} zoom={6} style={{ height: '100%', width: '100%' }}>
                    <TileLayer
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      attribution="&copy; OpenStreetMap contributors"
                    />
                    {loginLocations.map((loc, idx) =>
                      loc.latitude && loc.longitude ? (
                        <Marker key={idx} position={[loc.latitude, loc.longitude]}>
                          <Popup>
                            <div>
                              <div className="font-bold">{loc.user_email || 'Utilisateur inconnu'}</div>
                              <div className="text-xs">{loc.geo_country || 'Pays inconnu'}</div>
                              <div className="text-xs">{new Date(loc.timestamp).toLocaleString()}</div>
                              <div className="text-xs">IP: {loc.ip_address || 'N/A'}</div>
                              <div className="text-xs">Score risque: {loc.risk_score}</div>
                            </div>
                          </Popup>
                        </Marker>
                      ) : null
                    )}
                  </MapContainer>
                </div>
                {loginLocations.length === 0 && !locationsLoading && !locationsError && (
                  <div className="text-gray-500 mt-2">Aucune connexion géolocalisée récente.</div>
                )}
              </div>
            </div>
          )}
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