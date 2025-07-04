import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Upload, Calendar, Clock, Info } from 'lucide-react';
import { Service } from '../types/service';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { useAuth } from '../contexts/AuthContext';

interface RepairRequest {
  id: number;
  title: string;
  description: string;
  status: string;
  estimated_price: number;
  created_at: string;
}

// Données des services (dans une vraie application, cela viendrait d'une API)
const services: Service[] = [
  {
    id: 'plumber',
    name: 'Plomberie',
    shortDescription: 'Réparations de plomberie expertes pour fuites, bouchons et installations.',
    description: 'Nos plombiers professionnels gèrent tout, des réparations d\'urgence aux nouvelles installations.',
    startingPrice: 50000,
    imageUrl: 'https://images.pexels.com/photos/4116186/pexels-photo-4116186.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'electrician',
    name: 'Électricité',
    shortDescription: 'Électriciens certifiés pour tous vos besoins électriques.',
    description: 'Du câblage à l\'installation d\'appareils, nos électriciens agréés garantissent sécurité et qualité.',
    startingPrice: 60000,
    imageUrl: 'https://images.pexels.com/photos/8005368/pexels-photo-8005368.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'locksmith',
    name: 'Serrurerie',
    shortDescription: 'Service de dépannage rapide et solutions de sécurité.',
    description: 'Enfermé dehors ? Besoin de nouvelles serrures ? Nos serruriers fournissent un service rapide et fiable 24h/24.',
    startingPrice: 45000,
    imageUrl: 'https://images.pexels.com/photos/4219054/pexels-photo-4219054.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'it',
    name: 'Support Informatique',
    shortDescription: 'Support technique pour ordinateurs et réseaux.',
    description: 'Nos techniciens informatiques résolvent vos problèmes informatiques, configurent les réseaux et fournissent un support continu.',
    startingPrice: 40000,
    imageUrl: 'https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'air_conditioning',
    name: 'Chauffage & Climatisation',
    shortDescription: 'Réparations et maintenance des systèmes de chauffage et de refroidissement.',
    description: 'Gardez votre maison confortable toute l\'année avec nos services de réparation et maintenance HVAC.',
    startingPrice: 70000,
    imageUrl: 'https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'appliance_repair',
    name: 'Réparation d\'Électroménagers',
    shortDescription: 'Réparations pour réfrigérateurs, machines à laver, sèche-linge et plus.',
    description: 'Nos techniciens réparent tous les appareils électroménagers principaux rapidement et à prix abordable.',
    startingPrice: 55000,
    imageUrl: 'https://images.pexels.com/photos/4108807/pexels-photo-4108807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'mechanic',
    name: 'Maçonnerie',
    shortDescription: 'Prise en charge de votre chantier par nos maçons qualifiés.',
    description: 'Nos maçons expérimentés réalisent tous types de travaux de construction, rénovation et réparation de maçonnerie.',
    startingPrice: 80000,
    imageUrl: 'https://images.pexels.com/photos/323705/pexels-photo-323705.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'other',
    name: 'Autre',
    shortDescription: 'Service personnalisé selon vos besoins.',
    description: 'Contactez-nous pour toute demande spécifique ou autre service.',
    startingPrice: 35000,
    imageUrl: 'https://images.pexels.com/photos/4108807/pexels-photo-4108807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
];

// Liste des villes, communes et quartiers de Bamako et alentours (exemple enrichi)
const bamakoCities = [
  // Communes urbaines
  "Bamako", "Commune I", "Commune II", "Commune III", "Commune IV", "Commune V", "Commune VI",
  // Communes rurales proches
  "Kalabancoro", "Kati", "Samaya", "Moribabougou", "Baguineda", "Siby",
  // Quartiers majeurs par commune
  "Sotuba", "Magnambougou", "Yirimadio", "Sabalibougou", "Lafiabougou", "Badalabougou", "Hamdallaye", "Missira", "Niamakoro", "Banankabougou", "Daoudabougou", "Djicoroni", "Sogoniko", "Faladié", "Niaréla", "Quinzambougou", "Medina Coura", "Bacodjicoroni", "Torokorobougou", "Sebenicoro", "N'Tomikorobougou", "Kalaban Coura", "Kalabanbougou", "Boulkassoumbougou", "Dialakorodji", "Niamana", "Sirakoro Meguetana", "Sangarebougou", "Zerny", "N'Tabacoro", "Niamakoro Koko", "Sikoroni", "Sabalibougou", "Sogonafing", "Djélibougou", "Banconi", "Lassa", "Sébenikoro", "N'Tomikorobougou", "Niaréla", "Bolibana", "Korofina", "Hippodrome", "Point G", "Badialan", "Bamako Coura", "Bagadadji", "Fadjiguila", "Doumanzana", "Missabougou", "N'Tomikorobougou", "Sokorodji", "Koulouba", "Kouloubléni", "Koulouba Plateau", "Koulouba Marché", "Koulouba Gare", "Koulouba Cité", "Koulouba Extension"
];

const BookingForm: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [step, setStep] = useState(1);

  // État du formulaire
  const [formData, setFormData] = useState({
    serviceId: '',
    address: '',
    city: '',
    postalCode: '',
    description: '',
    date: '',
    time: '',
    isUrgent: false,
    phone: '',
    photos: [] as File[],
    photosPreviews: [] as string[],
    quartier: '',
    commune: '',
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  // Ajout état pour suggestions d'adresse
  const [addressSuggestions, setAddressSuggestions] = useState<any[]>([]);
  const [showAddressSuggestions, setShowAddressSuggestions] = useState(false);
  const addressSuggestionsRef = useRef<HTMLDivElement>(null);

  // Liste des villes/quartiers de Bamako et alentours (exemple, à compléter selon besoin)
  const [citySuggestions, setCitySuggestions] = useState<string[]>([]);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const citySuggestionsRef = useRef<HTMLDivElement>(null);

  // Ajout d'un état pour l'erreur téléphone
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Ajout d'un état pour l'erreur ville
  const [cityError, setCityError] = useState<string | null>(null);

  // Ajout d'un état pour le modal de géolocalisation
  const [showGeoModal, setShowGeoModal] = useState(false);

  const { user, profile } = useAuth();

  // Obtenir la localisation depuis les paramètres URL si disponible
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const locationParam = params.get('location');
    if (locationParam) {
      setFormData(prev => ({ ...prev, address: locationParam }));
    }
  }, [location.search]);

  useEffect(() => {
    // Vérification du token JWT
    const token = localStorage.getItem('token');
    if (!token) {
      setError("Vous devez être connecté pour réserver un service. Redirection vers la page de connexion...");
      setTimeout(() => {
        navigate('/login');
      }, 2000);
      return;
    }
    const fetchRepairRequests = async () => {
      try {
        const response = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/repair-requests/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
        });
        if (!response.ok) {
          throw new Error('Erreur lors de la récupération des demandes');
        }
        const data = await response.json();
        setRepairRequests(data);
      } catch (error) {
        console.error('Erreur:', error);
        setError(error instanceof Error ? error.message : 'Erreur lors de la récupération des demandes');
      }
    };
    fetchRepairRequests();
  }, [navigate]);

  useEffect(() => {
    if (location.state && location.state.userLocation) {
      setUserLocation(location.state.userLocation);
    }
    // Pré-remplissage à partir des infos structurées transmises
    if (location.state && location.state.addressDetails) {
      const details = location.state.addressDetails;
      setFormData(prev => ({
        ...prev,
        address: [details.road, details.house_number].filter(Boolean).join(' '),
        city: details.city || details.town || details.village || '',
        postalCode: details.postcode || '',
        quartier: details.suburb || details.neighbourhood || details.quarter || '',
        commune: details.municipality || details.county || details.state_district || '',
      }));
    } else if (location.state && location.state.address) {
      setFormData(prev => ({
        ...prev,
        address: location.state.address
      }));
    }
  }, [location.state]);

  // Auto-complétion Nominatim pour le champ adresse
  const handleAddressChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, address: value }));
    if (value.length < 3) {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
      return;
    }
    try {
      const resp = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(value)}&addressdetails=1&limit=5`);
      const data = await resp.json();
      setAddressSuggestions(data);
      setShowAddressSuggestions(true);
    } catch {
      setAddressSuggestions([]);
      setShowAddressSuggestions(false);
    }
  };

  // Sélection d'une suggestion d'adresse
  const handleAddressSuggestionClick = (suggestion: any) => {
    setFormData(prev => ({
      ...prev,
      address: suggestion.display_name,
      city: suggestion.address?.city || suggestion.address?.town || suggestion.address?.village || '',
      postalCode: suggestion.address?.postcode || '',
    }));
    setUserLocation({ lat: parseFloat(suggestion.lat), lng: parseFloat(suggestion.lon) });
    setAddressSuggestions([]);
    setShowAddressSuggestions(false);
  };

  // Fermer la liste si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addressSuggestionsRef.current && !addressSuggestionsRef.current.contains(event.target as Node)) {
        setShowAddressSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleCityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFormData(prev => ({ ...prev, city: value }));
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
    setFormData(prev => ({ ...prev, city }));
    setCitySuggestions([]);
    setShowCitySuggestions(false);
  };

  // Fermer la liste si clic en dehors
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (citySuggestionsRef.current && !citySuggestionsRef.current.contains(event.target as Node)) {
        setShowCitySuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleServiceSelect = (serviceId: string) => {
    setFormData(prev => ({ ...prev, serviceId }));
    setStep(2);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target as HTMLInputElement;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      const newPreviews = newPhotos.map(file => URL.createObjectURL(file));

      setFormData(prev => ({
        ...prev,
        photos: [...prev.photos, ...newPhotos],
        photosPreviews: [...prev.photosPreviews, ...newPreviews],
      }));
    }
  };

  const removePhoto = (index: number) => {
    setFormData(prev => {
      const photos = [...prev.photos];
      const photosPreviews = [...prev.photosPreviews];

      photos.splice(index, 1);
      photosPreviews.splice(index, 1);

      return {
        ...prev,
        photos,
        photosPreviews,
      };
    });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setError('La géolocalisation n\'est pas supportée par votre navigateur.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setError(null);
      },
      (error) => {
        setError('Impossible de récupérer votre position.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('[DEBUG] handleSubmit appelé');
    setIsSubmitting(true);
    setError(null);

    if (!userLocation || typeof userLocation.lat !== 'number' || typeof userLocation.lng !== 'number' || isNaN(userLocation.lat) || isNaN(userLocation.lng)) {
      setIsSubmitting(false);
      setShowGeoModal(true);
      console.log('[DEBUG] Blocage: géolocalisation absente ou invalide', userLocation);
      const geoBtn = document.getElementById('get-location-btn');
      if (geoBtn) geoBtn.focus();
      return;
    }

    const rawPhone = formData.phone;
    const cleanedPhone = rawPhone.replace(/\s+/g, '');
    // Validation téléphone Mali (accepte espaces, mais exige 8 chiffres après +223)
    const phoneRegex = /^\+223\d{8}$/;
    if (!phoneRegex.test(cleanedPhone)) {
      setPhoneError('Le numéro doit commencer par +223 et contenir 8 chiffres après (espaces autorisés).');
      setError('Le numéro doit commencer par +223 et contenir 8 chiffres après (espaces autorisés).');
      setIsSubmitting(false);
      console.log('[DEBUG] Blocage: téléphone invalide', rawPhone);
      const phoneInput = document.getElementById('phone-input');
      if (phoneInput) phoneInput.focus();
      return;
    }

    if (!formData.city) {
      setCityError('La ville est requise.');
      setError('La ville est requise.');
      setIsSubmitting(false);
      console.log('[DEBUG] Blocage: ville absente');
      // Focus sur le champ ville
      const cityInput = document.getElementById('city-input');
      if (cityInput) cityInput.focus();
      return;
    }

    try {
      // Formater la date et l'heure
      const preferredDate = formData.date && formData.time
        ? new Date(`${formData.date}T${formData.time === 'morning' ? '10:00' : formData.time === 'afternoon' ? '14:00' : '18:00'}`).toISOString()
        : null;

      // Créer la demande de réparation
      const repairRequestData = {
        title: `Demande de ${services.find(s => s.id === formData.serviceId)?.name}`,
        description: formData.description,
        specialty_needed: formData.serviceId,
        address: `${formData.address}, ${formData.city} ${formData.postalCode}`,
        preferred_date: preferredDate,
        is_urgent: formData.isUrgent,
        priority: formData.isUrgent ? 'urgent' : 'medium',
        estimated_price: services.find(s => s.id === formData.serviceId)?.startingPrice || 0,
        latitude: userLocation.lat,
        longitude: userLocation.lng,
        phone: cleanedPhone,
      };

      console.log('Body envoyé au backend:', repairRequestData);

      // Envoyer la demande au backend
      const response = await fetchWithAuth('http://127.0.0.1:8000/depannage/api/repair-requests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(repairRequestData),
      });

      const rawText = await response.clone().text();
      const data = await response.json().catch(() => ({}));
      console.log('Réponse backend création demande:', response.status, data, 'Réponse brute:', rawText);

      if (!response.ok) {
        let errorMsg = '';
        if (data && typeof data === 'object' && !Array.isArray(data)) {
          // Si le backend retourne un objet d'erreurs par champ
          errorMsg = Object.entries(data).map(([field, msg]) => `${field}: ${Array.isArray(msg) ? msg.join(', ') : msg}`).join(' | ');
        } else {
          errorMsg = data.detail || data.message || rawText || 'Erreur lors de la création de la demande';
        }
        setError(errorMsg);
        alert('Erreur lors de la création de la demande: ' + errorMsg);
        throw new Error(errorMsg);
      }

      // Calculer le montant total
      let totalAmount = data.estimated_price || services.find(s => s.id === formData.serviceId)?.startingPrice || 0;
      if (formData.isUrgent) {
        totalAmount += 25000; // Frais d'urgence
      }

      // Arrondir au multiple de 5 le plus proche pour CinetPay
      totalAmount = Math.ceil(totalAmount / 5) * 5;

      // Préparer les données de paiement
      const paymentData = {
        request_id: data.id,
        amount: totalAmount,
        description: `Paiement pour ${services.find(s => s.id === formData.serviceId)?.name} - Demande #${data.id}`,
        service_name: services.find(s => s.id === formData.serviceId)?.name || '',
        address: `${formData.address}, ${formData.city} ${formData.postalCode}`,
        date: formData.date,
        time: formData.time,
        is_urgent: formData.isUrgent,
        phone: cleanedPhone,
      };

      console.log('[DEBUG] Redirection vers /payment avec paymentData:', paymentData);
      navigate('/payment', { state: { paymentData } });

    } catch (error: unknown) {
      console.error('Erreur lors de la soumission:', error);
      if (error instanceof Error) {
        setError(error.message);
      } else {
        setError('Erreur lors de la création de la demande');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Synchronisation du numéro de téléphone du profil utilisateur (client)
  useEffect(() => {
    if (profile && profile.type === 'client' && profile.phone) {
      setFormData(prev => ({ ...prev, phone: profile.phone ?? '' }));
    }
  }, [profile]);

  const getStepContent = () => {
    switch (step) {
      case 1:
        return (
          <div>
            <h3 className="text-xl font-semibold mb-4">Sélectionnez un service</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {services.map(service => (
                <div
                  key={service.id}
                  onClick={() => handleServiceSelect(service.id)}
                  className="border border-gray-200 rounded-lg p-4 cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-colors"
                >
                  <div className="h-32 mb-3 overflow-hidden rounded-md">
                    <img
                      src={service.imageUrl}
                      alt={service.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <h4 className="font-semibold">{service.name}</h4>
                  <p className="text-sm text-gray-600 mt-1">{service.shortDescription}</p>
                  <p className="text-blue-700 font-medium mt-2">À partir de {service.startingPrice.toLocaleString()} FCFA</p>
                </div>
              ))}
            </div>
          </div>
        );

      case 2: {
        const selectedService = services.find(s => s.id === formData.serviceId);

        return (
          <form onSubmit={(e) => { e.preventDefault(); setStep(3); }}>
            <h3 className="text-xl font-semibold mb-4">Détails du Service</h3>

            {selectedService && (
              <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                <h4 className="font-semibold text-lg">{selectedService.name}</h4>
                <p className="text-gray-700">{selectedService.description}</p>
                <p className="text-blue-700 font-medium mt-2">Prix de départ: {selectedService.startingPrice.toLocaleString()} FCFA</p>
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    id="address"
                    name="address"
                    value={formData.address}
                    onChange={handleAddressChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Adresse de rue"
                    required
                  />
                  {/* Suggestions d'adresse */}
                  {showAddressSuggestions && addressSuggestions.length > 0 && (
                    <div ref={addressSuggestionsRef} className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-60 overflow-y-auto">
                      {addressSuggestions.map((s, idx) => (
                        <div
                          key={s.place_id}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          onClick={() => handleAddressSuggestionClick(s)}
                        >
                          {s.display_name}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">
                    Ville
                  </label>
                  <input
                    type="text"
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleCityChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ville"
                    required
                  />
                  {/* Suggestions de ville (Bamako et alentours) */}
                  {showCitySuggestions && citySuggestions.length > 0 && (
                    <div ref={citySuggestionsRef} className="absolute z-10 left-0 right-0 bg-white border border-gray-200 rounded-b shadow-lg max-h-60 overflow-y-auto">
                      {Array.from(new Set(citySuggestions)).map((city, idx) => (
                        <div
                          key={city}
                          className="px-4 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                          onClick={() => handleCitySuggestionClick(city)}
                        >
                          {city}
                        </div>
                      ))}
                    </div>
                  )}
                  {cityError && (
                    <p className="text-red-600 text-sm mt-1">{cityError}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="postalCode" className="block text-sm font-medium text-gray-700 mb-1">
                    Code Postal
                  </label>
                  <input
                    type="text"
                    id="postalCode"
                    name="postalCode"
                    value={formData.postalCode}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Code postal"
                    required
                  />
                </div>
              </div>

              {/* Ajout Quartier et Commune */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="quartier" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Quartier
                    {formData.quartier && (
                      <span
                        className="ml-2 inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-semibold cursor-help"
                        title={"Ce champ a été automatiquement rempli grâce à la géolocalisation ou à l'auto-complétion.\n- Si vous avez utilisé 'Obtenir ma position', la valeur provient de votre position GPS et des données cartographiques.\n- Si vous avez choisi une suggestion d'adresse, la valeur provient de la base de données d'adresses.\n\nVérifiez que l'information est correcte : vous pouvez la modifier si besoin avant de valider votre demande."}
                      >
                        Pré-rempli
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="quartier"
                    name="quartier"
                    value={formData.quartier}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Quartier"
                  />
                </div>
                <div>
                  <label htmlFor="commune" className="block text-sm font-medium text-gray-700 mb-1 flex items-center">
                    Commune
                    {formData.commune && (
                      <span
                        className="ml-2 inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-semibold cursor-help"
                        title={"Ce champ a été automatiquement rempli grâce à la géolocalisation ou à l'auto-complétion.\n- Si vous avez utilisé 'Obtenir ma position', la valeur provient de votre position GPS et des données cartographiques.\n- Si vous avez choisi une suggestion d'adresse, la valeur provient de la base de données d'adresses.\n\nVérifiez que l'information est correcte : vous pouvez la modifier si besoin avant de valider votre demande."}
                      >
                        Pré-rempli
                      </span>
                    )}
                  </label>
                  <input
                    type="text"
                    id="commune"
                    name="commune"
                    value={formData.commune}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Commune"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="phone-input" className="block text-sm font-medium text-gray-700">
                  Numéro de téléphone (format Mali)
                </label>
                <input
                  id="phone-input"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  required
                  pattern="\+223 ?\d{2} ?\d{2} ?\d{2} ?\d{2}"
                  placeholder="+223 XX XX XX XX"
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-orange-500 focus:ring-orange-500 sm:text-sm"
                  value={formData.phone}
                  onChange={handleInputChange}
                  readOnly={!!(profile && profile.type === 'client')}
                />
                {profile && profile.type === 'client' && (
                  <p className="text-blue-600 text-xs mt-1">
                    Ce numéro est celui de votre profil et sera utilisé pour la demande et le paiement.<br />
                    Pour le modifier, rendez-vous sur <a href="/profile" className="underline text-blue-700">votre profil</a>.
                  </p>
                )}
                {phoneError && <p className="text-red-600 text-xs mt-1">{phoneError}</p>}
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description du Problème
                </label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Veuillez décrire le problème en détail"
                  rows={4}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Photos (Optionnel)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-md p-4 text-center">
                  <input
                    type="file"
                    id="photos"
                    name="photos"
                    onChange={handlePhotoUpload}
                    multiple
                    accept="image/*"
                    className="hidden"
                  />
                  <label htmlFor="photos" className="cursor-pointer">
                    <Upload className="mx-auto h-10 w-10 text-gray-400" />
                    <p className="mt-1 text-sm text-gray-500">Cliquez pour télécharger des photos du problème</p>
                  </label>
                </div>

                {formData.photosPreviews.length > 0 && (
                  <div className="mt-3 grid grid-cols-3 gap-3">
                    {formData.photosPreviews.map((preview, index) => (
                      <div key={index} className="relative">
                        <img
                          src={preview}
                          alt={`Aperçu ${index}`}
                          className="h-24 w-full object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={() => removePhoto(index)}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 h-5 w-5 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isUrgent"
                    name="isUrgent"
                    checked={formData.isUrgent}
                    onChange={handleInputChange}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <label htmlFor="isUrgent" className="ml-2 text-sm text-gray-700">
                    C\'est une urgence (des frais d\'urgence supplémentaires peuvent s\'appliquer)
                  </label>
                </div>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Retour
              </button>
              <button
                type="submit"
                className="py-2 px-6 bg-blue-700 text-white rounded-md hover:bg-blue-800"
              >
                Continuer
              </button>
            </div>
          </form>
        );
      }

      case 3:
        return (
          <form onSubmit={handleSubmit}>
            <h3 className="text-xl font-semibold mb-4">Planifier le Rendez-vous</h3>

            <div className="space-y-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">
                  Date Préférée
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    type="date"
                    id="date"
                    name="date"
                    value={formData.date}
                    onChange={handleInputChange}
                    min={new Date().toISOString().split('T')[0]}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-1">
                  Heure Préférée
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    id="time"
                    name="time"
                    value={formData.time}
                    onChange={handleInputChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="">Sélectionnez un créneau horaire</option>
                    <option value="morning">Matin (8:00 - 12:00)</option>
                    <option value="afternoon">Après-midi (12:00 - 16:00)</option>
                    <option value="evening">Soirée (16:00 - 20:00)</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Résumé de la réservation */}
            <div className="mt-6 p-4 bg-gray-50 rounded-lg">
              <h4 className="font-medium text-lg mb-2">Résumé de la Réservation</h4>
              <ul className="space-y-2">
                <li className="flex">
                  <span className="font-medium w-1/3">Service:</span>
                  <span>{services.find(s => s.id === formData.serviceId)?.name}</span>
                </li>
                <li className="flex">
                  <span className="font-medium w-1/3">Adresse:</span>
                  <span>{formData.address}, {formData.city}, {formData.postalCode}</span>
                </li>
                <li className="flex">
                  <span className="font-medium w-1/3">Date:</span>
                  <span>{formData.date} ({formData.time})</span>
                </li>
                <li className="flex">
                  <span className="font-medium w-1/3">Urgence:</span>
                  <span>{formData.isUrgent ? 'Oui' : 'Non'}</span>
                </li>
              </ul>

              <div className="mt-4 border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-medium">Prix Estimé:</span>
                  <span className="text-blue-700 font-semibold">
                    {((services.find(s => s.id === formData.serviceId)?.startingPrice || 0) +
                      (formData.isUrgent ? 25000 : 0)).toLocaleString()} FCFA
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Le prix final peut varier selon la complexité de la réparation
                </p>
              </div>
            </div>

            <div className="mt-6 p-4 bg-orange-50 border border-orange-200 rounded-lg flex">
              <Info className="text-orange-500 h-5 w-5 mr-2 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-orange-800">
                En complétant cette réservation, vous acceptez nos conditions de service et notre politique d'annulation.
                Un technicien sera assigné à votre demande et vous recevrez une confirmation sous peu.
              </p>
            </div>

            {error && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 text-sm">{error}</p>
              </div>
            )}

            <div className="mt-6 flex justify-between">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="py-2 px-4 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Retour
              </button>
              <button
                type="submit"
                className="py-2 px-6 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed flex items-center"
                disabled={isSubmitting}
                onClick={() => console.log('[DEBUG] Bouton Finaliser la Réservation cliqué')}
              >
                {isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Traitement...
                  </>
                ) : 'Finaliser la Réservation'}
              </button>
            </div>
          </form>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Affichage d'erreur global */}
      {error && (
        <div className="bg-red-600 text-white text-center py-3 px-4 font-bold text-lg mb-4">
          {error}
        </div>
      )}
      {/* Section Hero */}
      <div className="relative h-[400px] bg-cover bg-center" style={{ backgroundImage: 'url("https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2")' }}>
        <div className="absolute inset-0 bg-black bg-opacity-50"></div>
        <div className="relative container mx-auto px-4 h-full flex flex-col justify-center">
          <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
            Besoin d'un service à domicile ?
          </h1>
          <p className="text-xl text-white mb-6 max-w-2xl">
            Nos experts qualifiés sont à votre disposition pour tous vos besoins en réparation et maintenance.
          </p>
          <div className="flex gap-4">
            <button
              onClick={() => document.getElementById('booking-form')?.scrollIntoView({ behavior: 'smooth' })}
              className="bg-orange-500 text-white px-6 py-3 rounded-md hover:bg-orange-600 transition-colors"
            >
              Réserver maintenant
            </button>
            <button
              onClick={() => window.location.href = '/services'}
              className="bg-white text-gray-900 px-6 py-3 rounded-md hover:bg-gray-100 transition-colors"
            >
              Découvrir nos services
            </button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 -mt-16 relative z-10">
        {/* Liste des demandes de réparation */}
        {repairRequests.length > 0 && (
          <div className="mb-8">
            <h3 className="text-xl font-semibold mb-4">Vos demandes de réparation</h3>
            <div className="grid gap-4">
              {repairRequests.map((request: RepairRequest) => (
                <div key={request.id} className="bg-white p-4 rounded-lg shadow">
                  <div className="flex justify-between items-start">
                    <div>
                      <h4 className="font-medium">{request.title}</h4>
                      <p className="text-sm text-gray-600">{request.description}</p>
                      <p className="text-sm text-gray-600">Status: {request.status}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{request.estimated_price} FCFA</p>
                      <p className="text-sm text-gray-600">{new Date(request.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div id="booking-form" className="max-w-3xl mx-auto bg-white rounded-lg shadow-md overflow-hidden">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Réserver un Service</h2>

            {/* Indicateurs d'étapes */}
            <div className="flex mb-8">
              <div className={`flex-1 border-b-2 pb-2 ${step >= 1 ? 'border-blue-700 text-blue-700' : 'border-gray-300 text-gray-500'}`}>
                <span className={`rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm ${step >= 1 ? 'bg-blue-700 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>1</span>
                Service
              </div>
              <div className={`flex-1 border-b-2 pb-2 text-center ${step >= 2 ? 'border-blue-700 text-blue-700' : 'border-gray-300 text-gray-500'}`}>
                <span className={`rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm ${step >= 2 ? 'bg-blue-700 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>2</span>
                Détails
              </div>
              <div className={`flex-1 border-b-2 pb-2 text-right ${step >= 3 ? 'border-blue-700 text-blue-700' : 'border-gray-300 text-gray-500'}`}>
                <span className={`rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm ${step >= 3 ? 'bg-blue-700 text-white' : 'bg-gray-300 text-gray-700'
                  }`}>3</span>
                Planification
              </div>
            </div>

            {getStepContent()}
          </div>
        </div>
      </div>

      {/* Modal de géolocalisation */}
      {showGeoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
          <div className="bg-white rounded-lg shadow-lg p-6 max-w-sm w-full text-center">
            <h2 className="text-lg font-semibold mb-4 text-red-600">Géolocalisation requise</h2>
            <p className="mb-6">Vous devez autoriser la géolocalisation et cliquer sur <b>"Obtenir ma position"</b> avant de réserver.</p>
            <button
              className="px-6 py-2 bg-orange-500 text-white rounded hover:bg-orange-600 focus:outline-none"
              onClick={() => setShowGeoModal(false)}
            >
              OK
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingForm;