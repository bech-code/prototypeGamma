import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

const HeroSection: React.FC = () => {
  const [location, setLocation] = useState("");
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (user) {
      navigate(`/booking?location=${encodeURIComponent(location)}`);
    } else {
      navigate('/login?redirect=/booking');
    }
  };
  
  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          // In a real app, we'd convert coordinates to address with a Geocoding API
          // For demo purposes, we'll just set a placeholder
          setLocation("Current location");
        },
        (error) => {
          console.error("Error getting location:", error);
          alert("Unable to retrieve your location. Please enter it manually.");
        }
      );
    } else {
      alert("Geolocation is not supported by your browser");
    }
  };
  
  return (
    <div className="relative min-h-[90vh] flex items-center">
      {/* Background Image */}
      <div className="absolute inset-0 z-0">
        <img 
          src="src\assets\image\depanneur6.jpg" 
          alt="Professional repairman at work" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-blue-900/80 to-black/70"></div>
      </div>
      
      <div className="container mx-auto px-4 z-10 py-16">
        <div className="max-w-3xl">
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white leading-tight mb-4">
            Réparations Expertes & <span className="text-orange-500">Services Professionnels</span> À Votre Porte
          </h1>
          <p className="text-xl text-blue-100 mb-8">
            Disponibles 24/7 pour les urgences. Nos techniciens certifiés fournissent un service rapide et fiable pour tous vos besoins de réparation.
          </p>
          
          <div className="bg-white p-4 rounded-lg shadow-lg mb-8">
            <form onSubmit={handleSearch} className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Entrez votre adresse ou code postal"
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="text-blue-700 border border-blue-700 py-3 px-6 rounded-md hover:bg-blue-50 transition-colors"
                >
                  Utiliser Ma Position
                </button>
                <button
                  type="submit"
                  className="bg-orange-500 hover:bg-orange-600 text-white py-3 px-6 rounded-md font-medium transition-colors"
                >
                  Trouver des Services
                </button>
              </div>
            </form>
          </div>
          
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-white">
            <div className="flex items-center">
              <div className="h-4 w-4 bg-green-500 rounded-full mr-2"></div>
              <span>Disponible 24/7</span>
            </div>
            <div className="flex items-center">
              <div className="h-4 w-4 bg-blue-500 rounded-full mr-2"></div>
              <span>Professionnels Certifiés</span>
            </div>
            <div className="flex items-center">
              <div className="h-4 w-4 bg-orange-500 rounded-full mr-2"></div>
              <span>Garantie de 90 Jours</span>
            </div>
            <div className="flex items-center">
              <div className="h-4 w-4 bg-purple-500 rounded-full mr-2"></div>
              <span>Prix Transparents</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;