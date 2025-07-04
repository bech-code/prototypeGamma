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
  }, [minExperience, minRating, urgentMode]);

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

      {(userLocation || technician) && (
        <div className="w-full h-[400px] rounded-lg overflow-hidden">
          <MapContainer
            center={userLocation || [0, 0]}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            />

            {userLocation && (
              <Marker position={userLocation}>
                <Popup>Votre position</Popup>
              </Marker>
            )}

            {technician && (
              <Marker position={[technician.latitude, technician.longitude]} icon={!isCoherent(technician.quartier, technician.city) ? alertIcon : undefined}>
                <Popup>
                  <div>
                    <h3 className="font-bold">{technician.name}</h3>
                    <p>{technician.specialty}</p>
                    <p>Distance: {Math.round(technician.distance * 10) / 10} km</p>
                    <p>Expérience: {technician.experience_level}</p>
                    <p>Note: {technician.average_rating.toFixed(1)}/5</p>
                    <p>Temps de réponse: {technician.response_time_minutes} min</p>
                    <p>Badge: Niveau {technician.badge_level}</p>
                    {technician.is_available_urgent && (
                      <p className="text-red-500 font-bold">Disponible en urgence</p>
                    )}
                    {/* Badge incohérence */}
                    {!isCoherent(technician.quartier, technician.city) && (
                      <div className="inline-block bg-red-600 text-white text-xs font-bold px-2 py-1 rounded mt-2">Incohérence quartier/commune</div>
                    )}
                    <button
                      className="mt-2 bg-green-500 hover:bg-green-700 text-white font-bold py-1 px-2 rounded text-sm"
                      onClick={() => {
                        // Implémenter la logique d'envoi de demande
                        console.log('Envoi demande au technicien:', technician.id);
                      }}
                    >
                      Envoyer une demande
                    </button>
                  </div>
                </Popup>
              </Marker>
            )}
          </MapContainer>
        </div>
      )}
    </div>
  );
};

export default TechnicianMap;