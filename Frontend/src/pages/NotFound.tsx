import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const NotFound: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const getDashboardPath = () => {
    if (!user) return '/';
    switch (user.user_type) {
      case 'admin': return '/admin/dashboard';
      case 'technician': return '/technician/dashboard';
      case 'client': return '/dashboard';
      default: return '/';
    }
  };
  const getDashboardLabel = () => {
    if (!user) return 'Aller à mon tableau de bord';
    const name = user?.first_name ? user?.first_name : user?.username;
    return `Tableau de bord de ${name}`;
  };
  return (
    <div className="min-h-screen bg-gray-50 pt-24 pb-16 flex items-center">
      <div className="container mx-auto px-4 text-center">
        <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-6" />
        <h1 className="text-4xl font-bold text-gray-900 mb-4">404 - Page introuvable</h1>
        <p className="text-xl text-gray-600 mb-8 max-w-md mx-auto">
          La page que vous recherchez n'existe pas ou a été déplacée.
        </p>
        <div className="flex flex-col sm:flex-row justify-center gap-4">
          <button
            onClick={() => window.history.back()}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 py-3 px-8 rounded-md font-medium transition-colors shadow"
          >
            Retour à la page précédente
          </button>
          <button
            onClick={() => navigate(getDashboardPath())}
            className="bg-blue-700 hover:bg-blue-800 text-white py-3 px-8 rounded-md font-medium transition-colors shadow"
          >
            {getDashboardLabel()}
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;