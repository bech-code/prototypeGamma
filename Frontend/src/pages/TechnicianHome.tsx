import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Wrench, Calendar, Star, MapPin } from 'lucide-react';

const TechnicianHome: React.FC = () => {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-r from-orange-600 to-orange-800 text-white py-24">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold mb-6">
              Bienvenue sur la page Technicien
            </h1>
            <p className="text-xl text-orange-100 mb-8">
              Gérez vos interventions, consultez votre planning et suivez vos performances.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="bg-orange-700/50 p-6 rounded-lg">
                <Wrench className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Interventions</h3>
                <p className="text-sm text-orange-100">Gérez vos missions</p>
              </div>
              <div className="bg-orange-700/50 p-6 rounded-lg">
                <Calendar className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Planning</h3>
                <p className="text-sm text-orange-100">Votre agenda</p>
              </div>
              <div className="bg-orange-700/50 p-6 rounded-lg">
                <Star className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Évaluations</h3>
                <p className="text-sm text-orange-100">Vos performances</p>
              </div>
              <div className="bg-orange-700/50 p-6 rounded-lg">
                <MapPin className="w-8 h-8 mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Zones</h3>
                <p className="text-sm text-orange-100">Votre secteur</p>
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
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Interventions du Jour</h3>
                <p className="text-gray-600 mb-4">
                  Consultez et gérez vos interventions prévues pour aujourd'hui.
                </p>
                <button className="text-orange-600 font-medium hover:text-orange-700">
                  Voir le Planning →
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Rapports d'Intervention</h3>
                <p className="text-gray-600 mb-4">
                  Remplissez vos rapports d'intervention et mettez à jour le statut des missions.
                </p>
                <button className="text-orange-600 font-medium hover:text-orange-700">
                  Gérer les Rapports →
                </button>
              </div>
              <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <h3 className="text-xl font-semibold text-gray-900 mb-4">Profil et Disponibilités</h3>
                <p className="text-gray-600 mb-4">
                  Gérez votre profil, vos compétences et vos disponibilités.
                </p>
                <button className="text-orange-600 font-medium hover:text-orange-700">
                  Modifier le Profil →
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default TechnicianHome; 