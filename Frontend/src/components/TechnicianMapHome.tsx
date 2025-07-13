import React, { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Star, Clock, Phone, Calendar } from 'lucide-react';
import 'leaflet/dist/leaflet.css';

// Fix pour les icônes Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface Technician {
  id: number;
  user: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
    username: string;
  };
  specialty: string;
  years_experience: number;
  hourly_rate: number;
  is_available: boolean;
  is_verified: boolean;
  distance: number;
  average_rating: number;
  city: string;
}

interface TechnicianMapHomeProps {
  userLat?: number;
  userLng?: number;
  onTechnicianSelect?: (technician: Technician) => void;
}

// Composant pour centrer la carte sur la position de l'utilisateur
function MapCenter({ lat, lng }: { lat: number; lng: number }) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;
    if (typeof lat === 'number' && typeof lng === 'number' && !isNaN(lat) && !isNaN(lng)) {
      try {
        map.setView([lat, lng], 13);
      } catch (e) {
        // Ignore Leaflet errors
      }
    }
  }, [lat, lng, map]);

  return null;
}

const TechnicianMapHome: React.FC<TechnicianMapHomeProps> = ({
  userLat,
  userLng,
  onTechnicianSelect
}) => {
  const { token } = useAuth();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedService, setSelectedService] = useState<string>('');
  const [urgence, setUrgence] = useState<string>('normal');
  const [showList, setShowList] = useState(false);

  // Position par défaut (Abidjan)
  const defaultLat = 5.3600;
  const defaultLng = -4.0083;

  const currentLat = userLat || defaultLat;
  const currentLng = userLng || defaultLng;

  const fetchNearbyTechnicians = async (lat: number, lng: number) => {
    if (!token) {
      setError('Vous devez être connecté pour utiliser cette fonctionnalité');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        lat: lat.toString(),
        lng: lng.toString(),
      });

      if (selectedService) {
        params.append('service', selectedService);
      }

      if (urgence !== 'normal') {
        params.append('urgence', urgence);
      }

      // Log du token pour debug
      console.log('Token JWT utilisé pour la requête techniciens-proches:', token);

      const response = await fetch(
        `http://127.0.0.1:8000/depannage/api/techniciens-proches/?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.status === 401) {
        setError('Session expirée, veuillez vous reconnecter.');
        // Optionnel : rediriger vers /login
        // window.location.href = '/login';
        return;
      }

      if (!response.ok) {
        throw new Error('Erreur lors de la récupération des techniciens');
      }

      const data = await response.json();
      setTechnicians(data.technicians || []);
    } catch (err) {
      console.error('Erreur:', err);
      setError('Erreur lors de la recherche de techniciens');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (userLat && userLng) {
      fetchNearbyTechnicians(userLat, userLng);
    }
  }, [userLat, userLng, selectedService, urgence]);

  const handleServiceChange = (service: string) => {
    setSelectedService(service);
  };

  const handleUrgenceChange = (urgence: string) => {
    setUrgence(urgence);
  };

  const handleTechnicianSelect = (technician: Technician) => {
    if (onTechnicianSelect) {
      onTechnicianSelect(technician);
    }
  };

  const getSpecialtyLabel = (specialty: string) => {
    const labels: { [key: string]: string } = {
      'plumber': 'Plombier',
      'electrician': 'Électricien',
      'mechanic': 'Mécanicien',
      'it': 'Informatique',
      'air_conditioning': 'Climatisation',
      'appliance_repair': 'Électroménager',
      'locksmith': 'Serrurier',
      'other': 'Autre'
    };
    return labels[specialty] || specialty;
  };

  const getUrgenceLabel = (urgence: string) => {
    const labels: { [key: string]: string } = {
      'normal': 'Normal',
      'urgent': 'Urgent',
      'emergency': 'Urgence'
    };
    return labels[urgence] || urgence;
  };

  return (
    <div className="w-full">
      {/* Filtres */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm border">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Filtre par service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Type de Service
            </label>
            <select
              value={selectedService}
              onChange={(e) => handleServiceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Tous les services</option>
              <option value="plumber">Plomberie</option>
              <option value="electrician">Électricité</option>
              <option value="locksmith">Serrurerie</option>
              <option value="it">Informatique</option>
              <option value="air_conditioning">Climatisation</option>
              <option value="appliance_repair">Électroménager</option>
              <option value="mechanic">Mécanique</option>
            </select>
          </div>

          {/* Filtre par urgence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Niveau d'Urgence
            </label>
            <select
              value={urgence}
              onChange={(e) => handleUrgenceChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="normal">Normal</option>
              <option value="urgent">Urgent</option>
              <option value="emergency">Urgence</option>
            </select>
          </div>

          {/* Bouton pour afficher/masquer la liste */}
          <div className="flex items-end">
            <button
              onClick={() => setShowList(!showList)}
              className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
            >
              {showList ? 'Masquer la liste' : 'Afficher la liste'}
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Carte */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
            <div className="h-[500px] w-full">
              <MapContainer
                center={[currentLat, currentLng]}
                zoom={13}
                style={{ height: '100%', width: '100%' }}
              >
                <MapCenter lat={currentLat} lng={currentLng} />
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                />

                {/* Marqueur de la position de l'utilisateur */}
                {userLat && userLng && (
                  <Marker position={[userLat, userLng]}>
                    <Popup>
                      <div className="text-center">
                        <div className="font-semibold text-blue-600">Votre position</div>
                        <div className="text-sm text-gray-600">
                          {userLat.toFixed(4)}, {userLng.toFixed(4)}
                        </div>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* Marqueurs des techniciens */}
                {technicians.map((technician) => (
                  <Marker
                    key={technician.id}
                    position={[currentLat + (Math.random() - 0.5) * 0.01, currentLng + (Math.random() - 0.5) * 0.01]}
                  >
                    <Popup>
                      <div className="min-w-[200px]">
                        <div className="font-semibold text-gray-800">
                          {technician.user?.first_name || 'Prénom'} {technician.user?.last_name || 'Nom'}
                        </div>
                        <div className="text-sm text-gray-600 mb-2">
                          {getSpecialtyLabel(technician.specialty)}
                        </div>
                        <div className="flex items-center text-sm text-gray-500 mb-2">
                          <Star className="w-4 h-4 text-yellow-500 mr-1" />
                          {technician.average_rating} ({technician.years_experience} ans d'expérience)
                        </div>
                        <div className="text-sm text-gray-500 mb-2">
                          <MapPin className="w-4 h-4 inline mr-1" />
                          {technician.distance} km
                        </div>
                        <div className="text-sm font-semibold text-green-600 mb-2">
                          {technician.hourly_rate} FCFA/h
                        </div>
                        <button
                          onClick={() => handleTechnicianSelect(technician)}
                          className="w-full bg-blue-600 text-white py-1 px-3 rounded text-sm hover:bg-blue-700 transition-colors"
                        >
                          Réserver
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            </div>
          </div>
        </div>

        {/* Liste des techniciens */}
        {showList && (
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border p-4">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">
                Techniciens Proches ({technicians.length})
              </h3>

              {loading && (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="text-gray-600 mt-2">Recherche en cours...</p>
                </div>
              )}

              {error && error.includes('connecté') && (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">⚠️</div>
                  <p className="text-red-600">{error}</p>
                  <a href="/login" className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Se connecter</a>
                </div>
              )}

              {error && error.includes('Session expirée') && (
                <div className="text-center py-8">
                  <div className="text-red-600 mb-2">⚠️</div>
                  <p className="text-red-600">{error}</p>
                  <a href="/login" className="mt-2 inline-block bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition-colors">Se reconnecter</a>
                </div>
              )}

              {!loading && !error && technicians.length === 0 && (
                <div className="text-center py-8">
                  <div className="text-gray-400 mb-2">🔍</div>
                  <p className="text-gray-600">Aucun technicien trouvé dans votre zone</p>
                  <p className="text-sm text-gray-500 mt-1">
                    Essayez d'élargir votre recherche ou changez de service
                  </p>
                </div>
              )}

              {!loading && !error && technicians.length > 0 && (
                <div className="space-y-4 max-h-[400px] overflow-y-auto">
                  {technicians.map((technician) => (
                    <div
                      key={technician.id}
                      className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
                      onClick={() => handleTechnicianSelect(technician)}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold text-gray-800">
                          {technician.user?.first_name || 'Prénom'} {technician.user?.last_name || 'Nom'}
                        </h4>
                        <span className="text-sm text-green-600 font-medium">
                          {technician.distance} km
                        </span>
                      </div>

                      <div className="text-sm text-gray-600 mb-2">
                        {getSpecialtyLabel(technician.specialty)}
                      </div>

                      <div className="flex items-center text-sm text-gray-500 mb-2">
                        <Star className="w-4 h-4 text-yellow-500 mr-1" />
                        {technician.average_rating} ({technician.years_experience} ans)
                      </div>

                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-green-600">
                          {technician.hourly_rate} FCFA/h
                        </span>
                        <div className="flex items-center space-x-2">
                          {technician.is_verified && (
                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                              Vérifié
                            </span>
                          )}
                          <button className="text-xs bg-blue-600 text-white px-3 py-1 rounded hover:bg-blue-700 transition-colors">
                            Réserver
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TechnicianMapHome;