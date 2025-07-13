import React, { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import axios from 'axios';
import 'leaflet/dist/leaflet.css';
import L, { Icon } from 'leaflet';

// Import marker icons
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix for default marker icons in Leaflet with React
delete (L.Icon.Default.prototype as { _getIconUrl?: () => string })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

interface Technician {
  id: number;
  name: string;
  specialty: string;
  latitude: number;
  longitude: number;
  distance: number;
  experience_level: 'junior' | 'intermediate' | 'senior' | 'expert';
  is_available_urgent: boolean;
  response_time_minutes: number;
  badge_level: number;
  average_rating: number;
  quartier?: string;
  city?: string;
}

// Mapping quartiers -> communes (doit être le même que côté admin/technicien)
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

// Icône spéciale pour incohérence
const alertIcon = new Icon({
  iconUrl: 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.5/icons/exclamation-triangle-fill.svg',
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -32],
  className: 'leaflet-alert-icon',
});

interface TechnicianMapProps {
  showOnlyIncoherent?: boolean;
}

const TechnicianMap: React.FC<TechnicianMapProps> = ({ showOnlyIncoherent }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [technician, setTechnician] = useState<Technician | null>(null);
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(false);
  const [refreshInterval, setRefreshInterval] = useState<number>(30);
  const [minExperience, setMinExperience] = useState<'junior' | 'intermediate' | 'senior' | 'expert'>('junior');
  const [minRating, setMinRating] = useState<number>(0);
  const [urgentMode, setUrgentMode] = useState<boolean>(false);
  const [refreshWarning, setRefreshWarning] = useState<string | null>(null);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [showAll, setShowAll] = useState(false);

  const findNearestTechnician = useCallback(() => {
    setLoading(true);
    setError(null);

    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur');
      setLoading(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);

        try {
          const token = localStorage.getItem('token');
          const response = await axios.get(
            '/depannage/api/techniciens-proches/',
            {
              params: {
                lat: latitude,
                lng: longitude,
                min_experience_level: minExperience,
                min_rating: minRating,
                urgence: urgentMode ? 'urgent' : 'normal',
                all: showAll ? 'true' : undefined,
              },
              headers: token ? { Authorization: `Bearer ${token}` } : {},
            }
          );
          // L'API retourne { technicians: [...], ... }
          setTechnicians(response.data.technicians || []);
          setTechnician(response.data.technicians?.[0] || null); // Pour compatibilité avec le reste du composant
        } catch (error) {
          console.error('Erreur lors de la recherche d\'un technicien:', error);
          setError('Erreur lors de la recherche d\'un technicien');
        } finally {
          setLoading(false);
        }
      },
      (err: GeolocationPositionError) => {
        setError('Erreur de géolocalisation: ' + err.message);
        setLoading(false);
      }
    );
  }, [minExperience, minRating, urgentMode, showAll]);

  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    if (autoRefresh && technician) {
      intervalId = setInterval(findNearestTechnician, refreshInterval * 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [autoRefresh, refreshInterval, findNearestTechnician, technician]);

  // Filtrage incohérences
  const incoherent = technician && !isCoherent(technician.quartier, technician.city);
  if (showOnlyIncoherent && (!technician || !incoherent)) {
    return null;
  }

  // Limite minimale sur l'intervalle d'auto-refresh
  const handleRefreshIntervalChange = (value: number) => {
    if (value < 30) {
      setRefreshInterval(30);
      setRefreshWarning('L\'intervalle minimum est de 30 secondes pour éviter le blocage du navigateur.');
    } else {
      setRefreshInterval(value);
      setRefreshWarning(null);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 p-4">
      <div className="w-full max-w-md space-y-4">
        <div className="flex flex-col gap-2">
          <label className="font-medium">Expérience minimale requise:</label>
          <select
            value={minExperience}
            onChange={(e) => setMinExperience(e.target.value as typeof minExperience)}
            className="border rounded p-2"
          >
            <option value="junior">Junior</option>
            <option value="intermediate">Intermédiaire</option>
            <option value="senior">Senior</option>
            <option value="expert">Expert</option>
          </select>
        </div>

        <div className="flex flex-col gap-2">
          <label className="font-medium">Note minimale:</label>
          <input
            type="number"
            name="minRating"
            min="0"
            max="5"
            step="0.5"
            value={minRating}
            onChange={(e) => setMinRating(Number(e.target.value))}
            className="border rounded p-2"
          />
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={urgentMode}
            onChange={(e) => setUrgentMode(e.target.checked)}
            className="h-4 w-4"
          />
          <label className="font-medium">Mode urgence</label>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={showAll}
            onChange={e => setShowAll(e.target.checked)}
            className="h-4 w-4"
          />
          <label className="font-medium">Voir tous les techniciens</label>
        </div>

        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4"
            />
            <label className="font-medium">Rafraîchissement automatique</label>
          </div>
          {/* Contrôle de l'auto-refresh */}
          <div className="flex items-center gap-2 mt-4">
            <label htmlFor="refreshInterval" className="text-sm text-gray-700">Rafraîchissement auto (secondes) :</label>
            <input
              id="refreshInterval"
              type="number"
              min={30}
              value={refreshInterval}
              onChange={e => handleRefreshIntervalChange(Number(e.target.value))}
              className="w-20 border border-gray-300 rounded px-2 py-1 text-sm"
            />
            <span className="text-xs text-gray-500">(min 30s)</span>
          </div>
          {refreshWarning && (
            <div className="text-orange-600 text-xs mt-1">{refreshWarning}</div>
          )}
        </div>
      </div>
      <button
        onClick={findNearestTechnician}
        disabled={loading}
        className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
      >
        {loading ? 'Recherche en cours...' : 'Trouver un technicien proche'}
      </button>

      {error && (
        <div className="text-red-500 text-center">{error}</div>
      )}

      {(userLocation || technicians.length > 0) && (
        <>
          <div className="w-full h-[400px] rounded-lg overflow-hidden mb-6">
            <MapContainer
              center={userLocation && typeof userLocation[0] === 'number' && typeof userLocation[1] === 'number' && !isNaN(userLocation[0]) && !isNaN(userLocation[1]) ? userLocation : [0, 0]}
              zoom={13}
              style={{ height: '100%', width: '100%' }}
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {userLocation && typeof userLocation[0] === 'number' && typeof userLocation[1] === 'number' && !isNaN(userLocation[0]) && !isNaN(userLocation[1]) && (
                <Marker position={userLocation}>
                  <Popup>Votre position</Popup>
                </Marker>
              )}

              {/* Afficher tous les techniciens proches */}
              {technicians.filter(tech => typeof tech.latitude === 'number' && typeof tech.longitude === 'number' && !isNaN(tech.latitude) && !isNaN(tech.longitude)).map(
                (tech, idx) => (
                  <Marker key={idx} position={[tech.latitude, tech.longitude]}>
                    <Popup>{tech.name || 'Technicien'}</Popup>
                  </Marker>
                )
              )}
            </MapContainer>
          </div>

          {/* Liste des techniciens proches */}
          {technicians.length > 0 && (
            <div className="w-full max-w-2xl mx-auto bg-white rounded-lg shadow p-4 mb-6">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Techniciens trouvés ({technicians.length})</h3>
              <ul className="divide-y divide-gray-200">
                {technicians.map((tech) => (
                  <li key={tech.id} className="py-3 flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                    <div>
                      <span className="font-medium text-gray-900">{tech.name}</span>
                      <span className="ml-2 text-sm text-gray-500">({tech.specialty})</span>
                      <span className="ml-2 text-xs text-gray-500">{Math.round(tech.distance * 10) / 10} km</span>
                      <span className="ml-2 text-xs text-yellow-600">Note: {tech.average_rating}/5</span>
                    </div>
                    <button
                      className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      onClick={() => {
                        // Implémenter la logique d'envoi de demande
                        console.log('Envoi demande au technicien:', tech.id);
                      }}
                    >
                      Contacter
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default TechnicianMap;