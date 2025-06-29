import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Users, Settings, BarChart, Shield } from 'lucide-react';

const AdminHome: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-blue-900 to-blue-700 text-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Bienvenue sur la page Administrateur
            </h1>
            <p className="text-xl text-blue-100 mb-8">
              Gérez votre plateforme, supervisez les techniciens et suivez les performances de votre service.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-blue-800/50 p-6 rounded-lg">
                <Users className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Gestion des Utilisateurs</h3>
                <p className="text-sm text-blue-100">Gérez les comptes clients et techniciens</p>
              </div>
              <div className="bg-blue-800/50 p-6 rounded-lg">
                <Settings className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Configuration</h3>
                <p className="text-sm text-blue-100">Paramètres de la plateforme</p>
              </div>
              <div className="bg-blue-800/50 p-6 rounded-lg">
                <BarChart className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Statistiques</h3>
                <p className="text-sm text-blue-100">Suivez les performances</p>
              </div>
              <div className="bg-blue-800/50 p-6 rounded-lg">
                <Shield className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Sécurité</h3>
                <p className="text-sm text-blue-100">Protection des données</p>
              </div>
            </div>
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
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Gestion des Techniciens</h3>
                <p className="text-gray-600 mb-4">
                  Ajoutez, modifiez ou supprimez des techniciens. Gérez leurs disponibilités et leurs compétences.
                </p>
                <button className="text-blue-700 font-medium hover:text-blue-800">
                  Gérer les Techniciens →
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Rapports et Analyses</h3>
                <p className="text-gray-600 mb-4">
                  Consultez les rapports de performance, les statistiques et les analyses détaillées.
                </p>
                <button className="text-blue-700 font-medium hover:text-blue-800">
                  Voir les Rapports →
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Paramètres Système</h3>
                <p className="text-gray-600 mb-4">
                  Configurez les paramètres de la plateforme, les notifications et les préférences.
                </p>
                <button className="text-blue-700 font-medium hover:text-blue-800">
                  Configurer →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default AdminHome; 