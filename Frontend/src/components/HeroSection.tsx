import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface HeroSectionProps {
  onGetLocation: () => void;
  loadingLocation: boolean;
}

const HeroSection: React.FC<HeroSectionProps> = ({ onGetLocation, loadingLocation }) => {
  const [location, setLocation] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [foundAddress, setFoundAddress] = useState<string | null>(null);
  const [showAddressConfirm, setShowAddressConfirm] = useState(false);
  const [foundAddressLat, setFoundAddressLat] = useState<string | null>(null);
  const [foundAddressLng, setFoundAddressLng] = useState<string | null>(null);
  const [foundAddressDetails, setFoundAddressDetails] = useState<any | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [loadingRefresh, setLoadingRefresh] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-complétion Nominatim
  const handleLocationChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setLocation(value);
    if (value.length < 3) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5`);
      const data = await resp.json();
      setSuggestions(data);
      setShowSuggestions(true);
    } catch {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Sélection d'une suggestion
  const handleSuggestionClick = (suggestion: any) => {
    setLocation(suggestion.display_name);
    setSuggestions([]);
    setShowSuggestions(false);
    // Lancer la recherche immédiatement
    handleSearchFromSuggestion(suggestion);
  };

  // Recherche directe depuis une suggestion (évite double géocodage)
  const handleSearchFromSuggestion = (suggestion: any) => {
    if (user) {
      navigate('/booking', { state: { userLocation: { lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) }, address: suggestion.display_name } });
    } else {
      navigate('/login?redirect=/booking');
    }
  };

  // Fermer la liste si clic en dehors
  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!location) return;
    if (user) {
      // Géocodage de l'adresse avec Nominatim
      try {
        const response = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`);
        const data = await response.json();
        if (data && data.length > 0) {
          const { lat, lon } = data[0];
          navigate('/booking', { state: { userLocation: { lat: parseFloat(lat), lng: parseFloat(lon) }, address: location } });
        } else {
          alert("Adresse introuvable. Veuillez vérifier l'adresse ou le code postal.");
        }
      } catch (err) {
        alert("Erreur lors de la recherche de l'adresse. Veuillez réessayer.");
      }
    } else {
      navigate('/login?redirect=/booking');
    }
  };

  const handleGetCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          const accuracy = position.coords.accuracy;
          setGpsCoords({ lat, lng, accuracy });
          // Reverse geocoding via Nominatim
          try {
            const resp = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`);
            const data = await resp.json();
            const address = data.display_name || 'Adresse inconnue';
            setFoundAddress(address);
            setFoundAddressDetails(data.address || null);
            setShowAddressConfirm(true);
            // Naviguer après confirmation
          } catch {
            setFoundAddress('Adresse inconnue');
            setFoundAddressDetails(null);
            setShowAddressConfirm(true);
          }
        },
        (error) => {
          // Gestion spécifique des erreurs de géolocalisation
          let errorMessage = "Impossible de récupérer votre position.";

          switch (error.code) {
            case 1: // PERMISSION_DENIED
              errorMessage = "Permission de géolocalisation refusée. Veuillez autoriser l'accès à votre position dans les paramètres de votre navigateur.";
              break;
            case 2: // POSITION_UNAVAILABLE
              errorMessage = "Position non disponible. Vérifiez que votre GPS est activé et que vous êtes dans une zone avec signal.";
              break;
            case 3: // TIMEOUT
              errorMessage = "Délai d'attente dépassé. Vérifiez votre connexion internet et réessayez.";
              break;
            default:
              errorMessage = "Erreur de géolocalisation. Veuillez entrer votre adresse manuellement.";
          }

          // Log informatif au lieu d'erreur console
          console.log(`Géolocalisation: ${errorMessage} (Code: ${error.code})`);

          // Afficher un toast ou une notification plus élégante
          setError(errorMessage);
          setTimeout(() => setError(null), 5000); // Effacer l'erreur après 5 secondes
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      setError("La géolocalisation n'est pas supportée par votre navigateur. Veuillez entrer votre adresse manuellement.");
      setTimeout(() => setError(null), 5000);
    }
  };

  // Confirmer l'adresse trouvée et naviguer
  const handleConfirmAddress = () => {
    setShowAddressConfirm(false);
    if (user) {
      navigate('/booking', {
        state: {
          userLocation: { lat: parseFloat(foundAddressLat!), lng: parseFloat(foundAddressLng!) },
          address: foundAddress,
          addressDetails: foundAddressDetails
        }
      });
    } else {
      navigate('/login?redirect=/booking');
    }
  };

  // Ajout d'une fonction pour rafraîchir la position
  const handleRefreshLocation = () => {
    setLoadingRefresh(true);
    setShowAddressConfirm(false);
    setTimeout(() => {
      handleGetCurrentLocation();
      setLoadingRefresh(false);
    }, 200); // Laisse le temps à la modale de se fermer
  };

  React.useEffect(() => {
    if (foundAddress && showAddressConfirm) {
      // On suppose que la dernière position GPS est toujours valide
      navigator.geolocation.getCurrentPosition((position) => {
        setFoundAddressLat(position.coords.latitude.toString());
        setFoundAddressLng(position.coords.longitude.toString());
      });
    }
  }, [foundAddress, showAddressConfirm]);

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
                  onChange={handleLocationChange}
                  onFocus={() => location.length >= 3 && suggestions.length > 0 && setShowSuggestions(true)}
                  required
                />
                {/* Suggestions d'adresse */}
                {showSuggestions && suggestions.length > 0 && (
                  <div ref={suggestionsRef} className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-60 overflow-y-auto">
                    {suggestions.map((s, idx) => (
                      <div
                        key={s.place_id}
                        className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                        onClick={() => handleSuggestionClick(s)}
                      >
                        {s.display_name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-row gap-2">
                <button
                  type="button"
                  onClick={handleGetCurrentLocation}
                  className="text-blue-700 border border-blue-700 py-3 px-6 rounded-md hover:bg-blue-50 transition-colors"
                  disabled={loadingLocation}
                >
                  {loadingLocation ? 'Localisation en cours...' : 'Obtenir ma position'}
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

          {/* Affichage des erreurs de géolocalisation */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4 animate-fade-in">
              <div className="flex items-center">
                <svg className="h-5 w-5 text-red-600 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <span className="text-red-800 font-medium">{error}</span>
              </div>
            </div>
          )}

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

          {/* Confirmation d'adresse trouvée */}
          {showAddressConfirm && foundAddress && (
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-40 z-50 transition-opacity duration-300 animate-fade-in">
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full border-t-8 border-blue-600 animate-popup-in">
                <div className="flex flex-col items-center">
                  <div className="bg-blue-100 rounded-full p-3 mb-3 animate-bounce-soft">
                    <svg xmlns='http://www.w3.org/2000/svg' className='h-8 w-8 text-blue-600' fill='none' viewBox='0 0 24 24' stroke='currentColor'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 11c1.104 0 2-.896 2-2s-.896-2-2-2-2 .896-2 2 .896 2 2 2zm0 0v6m0 0c-4.418 0-8-1.79-8-4V7a2 2 0 012-2h12a2 2 0 012 2v6c0 2.21-3.582 4-8 4z' /></svg>
                  </div>
                  <h2 className="text-xl font-bold mb-2 text-blue-800">Nous avons trouvé votre position !</h2>
                  {/* Infos GPS */}
                  {gpsCoords && (
                    <div className="w-full mb-2 text-center">
                      <div className="flex flex-wrap justify-center gap-2 text-blue-900 text-sm mb-1">
                        <span>📍 <span className="font-medium">Latitude :</span> {gpsCoords.lat.toFixed(6)}</span>
                        <span>📍 <span className="font-medium">Longitude :</span> {gpsCoords.lng.toFixed(6)}</span>
                        <span>🎯 <span className="font-medium">Précision :</span> {Math.round(gpsCoords.accuracy)} m</span>
                      </div>
                      <a
                        href={`https://www.openstreetmap.org/?mlat=${gpsCoords.lat}&mlon=${gpsCoords.lng}#map=19/${gpsCoords.lat}/${gpsCoords.lng}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-block text-blue-600 underline text-xs hover:text-blue-800 mb-1"
                      >
                        Voir sur la carte OpenStreetMap
                      </a>
                      {gpsCoords.accuracy > 30 && (
                        <div className="text-orange-600 text-xs mt-1">⚠️ Précision GPS faible&nbsp;: essayez de vous rapprocher d'une fenêtre ou d'activer le GPS pour plus de précision.</div>
                      )}
                    </div>
                  )}
                  {/* Adresse structurée */}
                  <p className="mb-2 text-gray-600 text-center">Voici l'adresse détectée à partir de votre position&nbsp;:</p>
                  <div className="w-full mb-4">
                    <div className="flex items-center gap-2 mb-1 text-blue-900">
                      <span className="text-lg">🏠</span>
                      <span className="font-medium">Maison :</span>
                      <span>{foundAddressDetails?.house_number || 'Non trouvé'}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 text-blue-900">
                      <span className="text-lg">🛣️</span>
                      <span className="font-medium">Rue :</span>
                      <span>{foundAddressDetails?.road || foundAddressDetails?.residential || foundAddressDetails?.street || 'Non trouvé'}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 text-blue-900">
                      <span className="text-lg">🏘️</span>
                      <span className="font-medium">Quartier :</span>
                      <span>{foundAddressDetails?.suburb || foundAddressDetails?.neighbourhood || foundAddressDetails?.quarter || 'Non trouvé'}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 text-blue-900">
                      <span className="text-lg">🏙️</span>
                      <span className="font-medium">Ville :</span>
                      <span>{foundAddressDetails?.city || foundAddressDetails?.town || foundAddressDetails?.village || 'Non trouvé'}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 text-blue-900">
                      <span className="text-lg">🏢</span>
                      <span className="font-medium">Commune :</span>
                      <span>{foundAddressDetails?.municipality || foundAddressDetails?.county || foundAddressDetails?.state_district || 'Non trouvé'}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1 text-blue-900">
                      <span className="text-lg">📮</span>
                      <span className="font-medium">Code postal :</span>
                      <span>{foundAddressDetails?.postcode || 'Non trouvé'}</span>
                    </div>
                  </div>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 mb-4 text-blue-900 text-center font-medium shadow-inner">
                    {foundAddress}
                  </div>
                  <p className="mb-6 text-gray-500 text-sm text-center">Si cette adresse vous convient, cliquez sur "Confirmer et réserver ici".<br />Sinon, vous pouvez annuler et saisir une autre adresse.</p>
                  <div className="flex justify-center gap-2 w-full">
                    <button
                      className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-semibold shadow transition-colors w-full"
                      onClick={handleConfirmAddress}
                    >
                      Confirmer et réserver ici
                    </button>
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors w-full flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                      onClick={handleRefreshLocation}
                      disabled={loadingRefresh || loadingLocation}
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582M20 20v-5h-.581M5.582 9A7.974 7.974 0 0112 4c2.042 0 3.899.767 5.318 2.018M18.418 15A7.974 7.974 0 0112 20a7.978 7.978 0 01-5.318-2.018" /></svg>
                      {loadingRefresh || loadingLocation ? 'Rafraîchissement...' : 'Rafraîchir la position'}
                    </button>
                    <button
                      className="bg-gray-200 hover:bg-gray-300 text-gray-700 px-6 py-2 rounded-lg font-semibold transition-colors w-full"
                      onClick={() => setShowAddressConfirm(false)}
                    >
                      Annuler
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default HeroSection;