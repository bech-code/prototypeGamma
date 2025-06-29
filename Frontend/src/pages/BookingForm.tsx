import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { MapPin, Upload, Calendar, Clock, Info } from 'lucide-react';
import { Service } from '../types/service';

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
    id: 'plumbing',
    name: 'Plomberie',
    shortDescription: 'Réparations de plomberie expertes pour fuites, bouchons et installations.',
    description: 'Nos plombiers professionnels gèrent tout, des réparations d\'urgence aux nouvelles installations.',
    startingPrice: 50000,
    imageUrl: 'https://images.pexels.com/photos/4116186/pexels-photo-4116186.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'electrical',
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
    id: 'it-support',
    name: 'Support Informatique',
    shortDescription: 'Support technique pour ordinateurs et réseaux.',
    description: 'Nos techniciens informatiques résolvent vos problèmes informatiques, configurent les réseaux et fournissent un support continu.',
    startingPrice: 40000,
    imageUrl: 'https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'heating',
    name: 'Chauffage & Climatisation',
    shortDescription: 'Réparations et maintenance des systèmes de chauffage et de refroidissement.',
    description: 'Gardez votre maison confortable toute l\'année avec nos services de réparation et maintenance HVAC.',
    startingPrice: 70000,
    imageUrl: 'https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'appliances',
    name: 'Réparation d\'Électroménagers',
    shortDescription: 'Réparations pour réfrigérateurs, machines à laver, sèche-linge et plus.',
    description: 'Nos techniciens réparent tous les appareils électroménagers principaux rapidement et à prix abordable.',
    startingPrice: 55000,
    imageUrl: 'https://images.pexels.com/photos/4108807/pexels-photo-4108807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'masonry',
    name: 'Maçonnerie',
    shortDescription: 'Prise en charge de votre chantier par nos maçons qualifiés.',
    description: 'Nos maçons expérimentés réalisent tous types de travaux de construction, rénovation et réparation de maçonnerie.',
    startingPrice: 80000,
    imageUrl: 'https://images.pexels.com/photos/323705/pexels-photo-323705.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'solar',
    name: 'Équipement Solaire',
    shortDescription: 'Mise à disposition et installation d\'équipement solaire.',
    description: 'Installation professionnelle de panneaux solaires, onduleurs et systèmes d\'énergie renouvelable.',
    startingPrice: 150000,
    imageUrl: 'https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'cleaning',
    name: 'Nettoyage Professionnel',
    shortDescription: 'Équipe de nettoyage professionnelle.',
    description: 'Services de nettoyage résidentiel et commercial avec une équipe qualifiée et des produits professionnels.',
    startingPrice: 35000,
    imageUrl: 'https://images.pexels.com/photos/4108807/pexels-photo-4108807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
  {
    id: 'moving',
    name: 'Déménagement',
    shortDescription: 'Une équipe pour vos déménagements.',
    description: 'Service complet de déménagement avec emballage, transport et déballage par notre équipe expérimentée.',
    startingPrice: 90000,
    imageUrl: 'https://images.pexels.com/photos/323705/pexels-photo-323705.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
  },
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
    photos: [] as File[],
    photosPreviews: [] as string[],
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [repairRequests, setRepairRequests] = useState<RepairRequest[]>([]);
  
  // Obtenir la localisation depuis les paramètres URL si disponible
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const locationParam = params.get('location');
    if (locationParam) {
      setFormData(prev => ({ ...prev, address: locationParam }));
    }
  }, [location.search]);
  
  useEffect(() => {
    const fetchRepairRequests = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          throw new Error('Token d\'authentification manquant');
        }

        const response = await fetch('http://127.0.0.1:8000/depannage/api/repair-requests/', {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
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
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
  
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
      };
  
      // Envoyer la demande au backend
      const response = await fetch('http://127.0.0.1:8000/depannage/api/repair-requests/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(repairRequestData),
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Erreur lors de la création de la demande');
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
      };
      
      // Rediriger vers la page de paiement
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
                    onChange={handleInputChange}
                    className="pl-10 w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Adresse de rue"
                    required
                  />
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
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ville"
                    required
                  />
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
                disabled={isSubmitting}
                className="py-2 px-6 bg-orange-500 text-white rounded-md hover:bg-orange-600 disabled:bg-orange-300 disabled:cursor-not-allowed flex items-center"
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
                <span className={`rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm ${
                  step >= 1 ? 'bg-blue-700 text-white' : 'bg-gray-300 text-gray-700'
                }`}>1</span>
                Service
              </div>
              <div className={`flex-1 border-b-2 pb-2 text-center ${step >= 2 ? 'border-blue-700 text-blue-700' : 'border-gray-300 text-gray-500'}`}>
                <span className={`rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm ${
                  step >= 2 ? 'bg-blue-700 text-white' : 'bg-gray-300 text-gray-700'
                }`}>2</span>
                Détails
              </div>
              <div className={`flex-1 border-b-2 pb-2 text-right ${step >= 3 ? 'border-blue-700 text-blue-700' : 'border-gray-300 text-gray-500'}`}>
                <span className={`rounded-full h-6 w-6 inline-flex items-center justify-center mr-2 text-sm ${
                  step >= 3 ? 'bg-blue-700 text-white' : 'bg-gray-300 text-gray-700'
                }`}>3</span>
                Planification
              </div>
            </div>
            
            {getStepContent()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BookingForm;