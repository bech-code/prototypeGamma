import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { Users, Settings, BarChart, Shield, AlertTriangle, CheckCircle, Clock, TrendingUp, Eye, Wrench, MessageSquare, Star, CreditCard, RefreshCw, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ErrorToast from '../components/ErrorToast';

interface DashboardStats {
  total_users: number;
  total_technicians: number;
  total_clients: number;
  total_requests: number;
  pending_requests: number;
  completed_requests: number;
  total_revenue: number;
  average_rating: number;
  recent_alerts: number;
  active_subscriptions: number;
}

// Card composant pour stats
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  bg: string;
}
const StatCard: React.FC<StatCardProps> = ({ icon, label, value, color, bg }) => (
  <div className={`flex flex-col items-center justify-center p-6 rounded-xl shadow-md transition-transform hover:scale-105 ${bg}`}>
    <div className={`mb-2`}>{icon}</div>
    <div className="text-2xl font-bold mb-1">{value}</div>
    <div className={`text-sm font-medium ${color}`}>{label}</div>
  </div>
);

// Card composant pour actions
interface ActionCardProps {
  icon: React.ReactNode;
  title: string;
  desc: string;
  onClick: () => void;
  color: string;
}
const ActionCard: React.FC<ActionCardProps> = ({ icon, title, desc, onClick, color }) => (
  <div className="bg-white rounded-xl shadow-md p-6 hover:shadow-lg transition group cursor-pointer flex flex-col justify-between h-full" onClick={onClick}>
    <div className="flex items-center mb-4">
      <div className={`w-10 h-10 flex items-center justify-center rounded-lg bg-gray-100 group-hover:bg-opacity-80 transition mr-3 ${color}`}>{icon}</div>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
    </div>
    <p className="text-gray-600 mb-4 text-sm flex-1">{desc}</p>
    <span className={`text-xs font-medium group-hover:underline ${color}`}>Accéder →</span>
  </div>
);

const AdminHome: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  // Toast
  const showToast = (type: 'success' | 'error' | 'info', message: string) => {
    setToast({ type, message });
    setTimeout(() => setToast(null), 5000);
  };

  useEffect(() => {
    loadDashboardStats();
  }, []);

  const loadDashboardStats = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetchWithAuth('/depannage/api/dashboard/stats/');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        showToast('success', 'Statistiques mises à jour');
      } else {
        let backendMsg = '';
        try {
          const errData = await response.json();
          backendMsg = errData?.detail || errData?.message || JSON.stringify(errData);
        } catch { }
        setError(`Erreur lors du chargement des statistiques (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
        showToast('error', `Erreur lors du chargement des statistiques (code ${response.status})${backendMsg ? ': ' + backendMsg : ''}`);
      }
    } catch (err) {
      setError('Erreur de connexion');
      showToast('error', 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };

  const refreshStats = async () => {
    setRefreshing(true);
    await loadDashboardStats();
    setRefreshing(false);
  };

  const handleQuickAction = (action: string, path: string) => {
    showToast('info', `Navigation vers ${action}`);
    navigate(path);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Chargement du tableau de bord...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white">
      {/* Toast notifications */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center ${toast.type === 'success' ? 'bg-green-500 text-white' : toast.type === 'error' ? 'bg-red-500 text-white' : 'bg-blue-500 text-white'}`}>
          {toast.type === 'success' ? (
            <CheckCircle className="h-5 w-5 mr-2" />
          ) : toast.type === 'error' ? (
            <AlertTriangle className="h-5 w-5 mr-2" />
          ) : (
            <Clock className="h-5 w-5 mr-2" />
          )}
          {toast.message}
          <button onClick={() => setToast(null)} className="ml-4 hover:opacity-75"><X className="h-4 w-4" /></button>
        </div>
      )}

      {/* Header */}
      <header className="bg-gradient-to-r from-blue-900 to-blue-700 text-white py-12 shadow-md mb-8">
        <div className="container mx-auto px-4 flex flex-col md:flex-row items-center justify-between">
          <div>
            <h1 className="text-4xl md:text-5xl font-bold mb-2">Bienvenue, {user?.username || 'Administrateur'}</h1>
            <p className="text-lg text-blue-100">Supervisez la plateforme, les techniciens et les performances.</p>
          </div>
          <button onClick={refreshStats} disabled={refreshing} className="mt-6 md:mt-0 bg-blue-800/70 hover:bg-blue-900 p-3 rounded-lg transition-colors disabled:opacity-50 flex items-center gap-2" title="Actualiser les statistiques">
            {refreshing ? <div className="animate-spin rounded-full h-5 w-5 border-b border-white"></div> : <RefreshCw className="h-5 w-5" />}
            <span>Actualiser</span>
          </button>
        </div>
      </header>

      {/* Statistiques clés */}
      {stats && (
        <section className="container mx-auto px-4 mb-12">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatCard icon={<Users className="h-8 w-8 text-blue-600" />} label="Utilisateurs" value={stats.total_users} color="text-blue-700" bg="bg-white" />
            <StatCard icon={<Wrench className="h-8 w-8 text-green-600" />} label="Techniciens" value={stats.total_technicians} color="text-green-700" bg="bg-white" />
            <StatCard icon={<BarChart className="h-8 w-8 text-yellow-600" />} label="Demandes" value={stats.total_requests} color="text-yellow-700" bg="bg-white" />
            <StatCard icon={<CreditCard className="h-8 w-8 text-purple-600" />} label="Revenus" value={stats.total_revenue.toLocaleString() + ' FCFA'} color="text-purple-700" bg="bg-white" />
          </div>
        </section>
      )}

      {/* Actions rapides */}
      <section className="container mx-auto px-4 mb-12">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Actions Rapides</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <ActionCard icon={<Users className="h-7 w-7 text-blue-600" />} title="Gestion des Utilisateurs" desc="Gérez les comptes clients et techniciens." onClick={() => handleQuickAction('Gestion des Utilisateurs', '/admin/user-management')} color="text-blue-600" />
          <ActionCard icon={<Settings className="h-7 w-7 text-gray-600" />} title="Configuration" desc="Paramètres de la plateforme." onClick={() => handleQuickAction('Configuration', '/admin/configuration')} color="text-gray-600" />
          <ActionCard icon={<BarChart className="h-7 w-7 text-green-600" />} title="Statistiques" desc="Suivez les performances et analyses." onClick={() => handleQuickAction('Statistiques', '/admin/statistics')} color="text-green-600" />
          <ActionCard icon={<Shield className="h-7 w-7 text-orange-600" />} title="Sécurité" desc="Dashboard sécurité, alertes, graphiques." onClick={() => handleQuickAction('Sécurité', '/admin/dashboard?tab=security')} color="text-orange-600" />
        </div>
      </section>

      {/* Alertes récentes */}
      {stats && stats.recent_alerts > 0 && (
        <section className="container mx-auto px-4 mb-12">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 rounded-lg p-6 flex items-center gap-4 shadow">
            <AlertTriangle className="h-8 w-8 text-yellow-600" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-900 mb-1">{stats.recent_alerts} alerte{stats.recent_alerts !== 1 ? 's' : ''} récente{stats.recent_alerts !== 1 ? 's' : ''}</h3>
              <p className="text-yellow-800">Consultez le dashboard sécurité pour plus de détails.</p>
            </div>
            <button className="ml-auto bg-orange-500 text-white px-4 py-2 rounded hover:bg-orange-600 font-semibold transition-colors" onClick={() => handleQuickAction('Sécurité', '/admin/dashboard?tab=security')}>Voir les alertes</button>
          </div>
        </section>
      )}

      {/* État du système */}
      {stats && (
        <section className="container mx-auto px-4 mb-16">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">État du Système</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <StatCard icon={<CheckCircle className="h-8 w-8 text-green-600" />} label="Demandes en cours" value={stats.pending_requests} color="text-green-700" bg="bg-green-50" />
            <StatCard icon={<TrendingUp className="h-8 w-8 text-blue-600" />} label="Abonnements actifs" value={stats.active_subscriptions} color="text-blue-700" bg="bg-blue-50" />
            <StatCard icon={<AlertTriangle className="h-8 w-8 text-yellow-600" />} label="Alertes récentes" value={stats.recent_alerts} color="text-yellow-700" bg="bg-yellow-50" />
          </div>
        </section>
      )}

      {error && <ErrorToast message={error} onClose={() => setError(null)} type="error" />}
    </div>
  );
};

export default AdminHome; 