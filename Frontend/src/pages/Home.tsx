import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Wrench, Zap, Key, Monitor, Thermometer, Fan, MapPin, Loader2 } from 'lucide-react';
import HeroSection from '../components/HeroSection';
import ServiceCard from '../components/ServiceCard';
import TechnicianMapHome from '../components/TechnicianMapHome';
import { useAuth } from '../contexts/AuthContext';
import { Service } from '../types/service';

// Import des images locales
import plombierImage from '../assets/image/plombier.jpg';
import depanneurImage from '../assets/image/depanneur.jpg';
import serrurierImage from '../assets/image/serrurier.jpg';
import solarPanelImage from '../assets/image/solar-panel.jpg';
import nettoyeurImage from '../assets/image/nettoyeur.jpg';
import climatisationImage from '../assets/image/Climatisation.webp';
import AideMenagereImage from '../assets/image/AideMenagere.jpg';
import CoiffeurImage from '../assets/image/Coiffeur.jpg';
import DecorationImage from '../assets/image/decoration.jpg';
import DemenagementImage from '../assets/image/Déménagement.jpg';
import DepannageVoitureImage from '../assets/image/depannageVoiture.jpg';
import EsthetiquesetbeauteImage from '../assets/image/Esthétiquesetbeaute.jpg';
import FroidImage from '../assets/image/Froid.jpg';
import GroupeElectrogeneImage from '../assets/image/groupeElectrogene.jpg';
import LavageImage from '../assets/image/Lavage.jpg';
import LessiveImage from '../assets/image/lessive.jpg';
import LivraisonImage from '../assets/image/Livraison.jpg';
import LivraisonGazImage from '../assets/image/LivraisonGaz.jpg';
import MaconnerieImage from '../assets/image/maçonnerie.jpg';
import MecaniqueImage from '../assets/image/Mécanique.jpg';
import MenuisierImage from '../assets/image/menuisier.jpg';
import NettoyageImage from '../assets/image/Nettoyage.jpg';
import PeintureImage from '../assets/image/Peinture.jpg';
import PneumatiqueImage from '../assets/image/Pneumatique.jpg';
import PressingImage from '../assets/image/pressing.jpg';
import RemorquageAutoImage from '../assets/image/RemorquageAuto.jpg';
import SoudureImage from '../assets/image/soudure.jpg';
import TelephoneImage from '../assets/image/telephone.jpg';
import VidangeImage from '../assets/image/Vidange.jpg';
import AntenneImage from '../assets/image/Antenne.jpg';
import TeleImage from '../assets/image/télé.jpg';

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

const Home: React.FC = () => {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [showMap, setShowMap] = useState(false);
  const [loadingLocation, setLoadingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [showAllServices, setShowAllServices] = useState(false);

  // Nouvelle liste complète des services
  const services: Service[] = [
    {
      id: 'plumber',
      name: 'Plomberie',
      icon: <Wrench className="text-blue-600" />,
      shortDescription: 'Réparations de plomberie expertes pour fuites, bouchons et installations.',
      description: 'Nos plombiers professionnels gèrent tout, des réparations d\'urgence aux nouvelles installations.',
      startingPrice: 50000,
      imageUrl: plombierImage,
    },
    {
      id: 'electrician',
      name: 'Électricité',
      icon: <Zap className="text-yellow-500" />,
      shortDescription: 'Électriciens certifiés pour tous vos besoins électriques.',
      description: 'Du câblage à l\'installation d\'appareils, nos électriciens agréés garantissent sécurité et qualité.',
      startingPrice: 60000,
      imageUrl: 'https://images.pexels.com/photos/8005368/pexels-photo-8005368.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
    {
      id: 'locksmith',
      name: 'Serrurerie',
      icon: <Key className="text-gray-700" />,
      shortDescription: 'Service de dépannage rapide et solutions de sécurité.',
      description: 'Enfermé dehors ? Besoin de nouvelles serrures ? Nos serruriers fournissent un service rapide et fiable 24h/24.',
      startingPrice: 45000,
      imageUrl: serrurierImage,
    },
    {
      id: 'it',
      name: 'Support Informatique',
      icon: <Monitor className="text-purple-600" />,
      shortDescription: 'Support technique pour ordinateurs et réseaux.',
      description: 'Nos techniciens informatiques résolvent vos problèmes informatiques, configurent les réseaux et fournissent un support continu.',
      startingPrice: 40000,
      imageUrl: 'https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
    {
      id: 'air_conditioning',
      name: 'Chauffage & Climatisation',
      icon: <Thermometer className="text-red-500" />,
      shortDescription: 'Réparations et maintenance des systèmes de chauffage et de refroidissement.',
      description: 'Gardez votre maison confortable toute l\'année avec nos services de réparation et maintenance HVAC.',
      startingPrice: 70000,
      imageUrl: climatisationImage,
    },
    {
      id: 'appliance_repair',
      name: 'Réparation d\'Électroménagers',
      icon: <Fan className="text-blue-400" />,
      shortDescription: 'Réparations pour réfrigérateurs, machines à laver, sèche-linge et plus.',
      description: 'Nos techniciens réparent tous les appareils électroménagers principaux rapidement et à prix abordable.',
      startingPrice: 55000,
      imageUrl: 'https://images.pexels.com/photos/4108807/pexels-photo-4108807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
    // Ajout des nouveaux services (extraits de BookingForm/ServiceDetails)
    {
      id: 'panneauxolaires',
      name: 'Panneaux Solaires',
      icon: <Zap className="text-yellow-500" />,
      shortDescription: 'Installation et maintenance de panneaux solaires.',
      description: 'Nos experts installent et entretiennent vos panneaux solaires pour une énergie propre et durable.',
      startingPrice: 100000,
      imageUrl: solarPanelImage,
    },
    {
      id: 'maconnerie',
      name: 'Maçonnerie',
      icon: <Wrench className="text-gray-700" />,
      shortDescription: 'Travaux de maçonnerie et rénovation.',
      description: 'Construction, rénovation, réparation de murs, dalles, escaliers, etc.',
      startingPrice: 80000,
      imageUrl: MaconnerieImage,
    },
    {
      id: 'decoration',
      name: 'Décoration',
      icon: <Key className="text-pink-500" />,
      shortDescription: 'Décoration intérieure et extérieure.',
      description: 'Conseils et réalisation de projets de décoration personnalisés.',
      startingPrice: 60000,
      imageUrl: DecorationImage,
    },
    {
      id: 'soudure',
      name: 'Soudure',
      icon: <Wrench className="text-gray-700" />,
      shortDescription: 'Travaux de soudure sur mesure.',
      description: 'Soudure de structures métalliques, portails, grilles, etc.',
      startingPrice: 90000,
      imageUrl: SoudureImage,
    },
    {
      id: 'groupeelectrogene',
      name: 'Groupe électrogène',
      icon: <Zap className="text-yellow-500" />,
      shortDescription: 'Installation et dépannage de groupes électrogènes.',
      description: 'Mise en service, entretien et réparation de groupes électrogènes.',
      startingPrice: 150000,
      imageUrl: GroupeElectrogeneImage,
    },
    {
      id: 'pneumatique',
      name: 'Pneumatique',
      icon: <Wrench className="text-gray-700" />,
      shortDescription: 'Changement et réparation de pneus.',
      description: 'Service rapide pour vos pneus : montage, équilibrage, réparation.',
      startingPrice: 50000,
      imageUrl: PneumatiqueImage,
    },
    {
      id: 'coiffeur',
      name: 'Coiffeur',
      icon: <Key className="text-pink-500" />,
      shortDescription: 'Coiffure à domicile pour hommes et femmes.',
      description: 'Coupes, soins, coiffures tendance à domicile.',
      startingPrice: 40000,
      imageUrl: CoiffeurImage,
    },
    {
      id: 'pressing',
      name: 'Pressing',
      icon: <Zap className="text-blue-500" />,
      shortDescription: 'Nettoyage et repassage de vêtements.',
      description: 'Service de pressing professionnel à domicile.',
      startingPrice: 30000,
      imageUrl: PressingImage,
    },
    {
      id: 'tele',
      name: 'Télé',
      icon: <Monitor className="text-gray-700" />,
      shortDescription: 'Installation et réparation de téléviseurs.',
      description: 'Dépannage, installation murale, réglages TV.',
      startingPrice: 60000,
      imageUrl: TeleImage,
    },
    {
      id: 'esthetique',
      name: 'Esthétique et Beauté',
      icon: <Key className="text-pink-500" />,
      shortDescription: 'Soins de beauté à domicile.',
      description: 'Maquillage, soins du visage, manucure, etc.',
      startingPrice: 50000,
      imageUrl: EsthetiquesetbeauteImage,
    },
    {
      id: 'lessive',
      name: 'Lessive à Domicile',
      icon: <Zap className="text-blue-500" />,
      shortDescription: 'Service de lessive et repassage à domicile.',
      description: 'Collecte, lavage, repassage et livraison de linge.',
      startingPrice: 25000,
      imageUrl: LessiveImage,
    },
    {
      id: 'aidemenagere',
      name: 'Aide Ménagère',
      icon: <Key className="text-pink-500" />,
      shortDescription: 'Aide ménagère à domicile.',
      description: 'Nettoyage, rangement, entretien de la maison.',
      startingPrice: 35000,
      imageUrl: AideMenagereImage,
    },
    {
      id: 'vidange',
      name: 'Vidange',
      icon: <Wrench className="text-gray-700" />,
      shortDescription: 'Vidange de fosses et entretien.',
      description: 'Service de vidange rapide et efficace.',
      startingPrice: 100000,
      imageUrl: VidangeImage,
    },
    {
      id: 'livraison',
      name: 'Livraison',
      icon: <Zap className="text-blue-500" />,
      shortDescription: 'Livraison express de colis et repas.',
      description: 'Livraison rapide à domicile ou au bureau.',
      startingPrice: 20000,
      imageUrl: LivraisonImage,
    },
    {
      id: 'livraisongaz',
      name: 'Livraison Gaz',
      icon: <Zap className="text-yellow-500" />,
      shortDescription: 'Livraison de bouteilles de gaz à domicile.',
      description: 'Commande et livraison de gaz en toute sécurité.',
      startingPrice: 30000,
      imageUrl: LivraisonGazImage,
    },
    {
      id: 'froid',
      name: 'Froid',
      icon: <Thermometer className="text-blue-500" />,
      shortDescription: 'Installation et réparation de systèmes de froid.',
      description: 'Climatisation, réfrigération, chambres froides.',
      startingPrice: 90000,
      imageUrl: FroidImage,
    },
    {
      id: 'telephone',
      name: 'Téléphone',
      icon: <Monitor className="text-blue-500" />,
      shortDescription: 'Réparation et configuration de téléphones.',
      description: 'Dépannage, déblocage, configuration smartphones.',
      startingPrice: 40000,
      imageUrl: TelephoneImage,
    },
    {
      id: 'menuisiers',
      name: 'Menuisiers',
      icon: <Wrench className="text-gray-700" />,
      shortDescription: 'Travaux de menuiserie bois et alu.',
      description: 'Fabrication, réparation, pose de meubles, portes, fenêtres.',
      startingPrice: 80000,
      imageUrl: MenuisierImage,
    },
    {
      id: 'mecanique',
      name: 'Mécanique',
      icon: <Wrench className="text-gray-700" />,
      shortDescription: 'Réparation et entretien automobile.',
      description: 'Diagnostic, réparation, entretien de véhicules.',
      startingPrice: 100000,
      imageUrl: MecaniqueImage,
    },
    {
      id: 'antennes',
      name: 'Antennes',
      icon: <Monitor className="text-blue-500" />,
      shortDescription: 'Installation et réglage d\'antennes TV.',
      description: 'Pose, réglage, dépannage d\'antennes et paraboles.',
      startingPrice: 60000,
      imageUrl: AntenneImage,
    },
    {
      id: 'lavage',
      name: 'Lavage',
      icon: <Zap className="text-blue-500" />,
      shortDescription: 'Lavage auto, moto, tapis, etc.',
      description: 'Nettoyage professionnel de véhicules et textiles.',
      startingPrice: 30000,
      imageUrl: LavageImage,
    },
    {
      id: 'demenagement',
      name: 'Déménagement',
      icon: <Wrench className="text-gray-700" />,
      shortDescription: 'Service de déménagement clé en main.',
      description: 'Emballage, transport, installation à votre nouveau domicile.',
      startingPrice: 200000,
      imageUrl: DemenagementImage,
    },
    {
      id: 'nettoyage',
      name: 'Nettoyage',
      icon: <Zap className="text-blue-500" />,
      shortDescription: 'Nettoyage professionnel de locaux et maisons.',
      description: 'Entretien, ménage, nettoyage après travaux.',
      startingPrice: 40000,
      imageUrl: NettoyageImage,
    },
    {
      id: 'peinture',
      name: 'Peinture',
      icon: <Wrench className="text-pink-500" />,
      shortDescription: 'Travaux de peinture intérieure et extérieure.',
      description: 'Rafraîchissement, décoration, peinture sur mesure.',
      startingPrice: 60000,
      imageUrl: PeintureImage,
    },
    {
      id: 'remorquage',
      name: 'Remorquage Auto',
      icon: <Wrench className="text-blue-600" />,
      shortDescription: 'Remorquage de véhicules en panne ou accidentés.',
      description: 'Service de remorquage rapide et sécurisé pour tout type de véhicule, 24h/24 et 7j/7.',
      startingPrice: 80000,
      imageUrl: RemorquageAutoImage,
    },
    {
      id: 'depannageauto',
      name: 'Dépannage de Voiture',
      icon: <Zap className="text-yellow-500" />,
      shortDescription: 'Dépannage sur place pour pannes mécaniques ou électriques.',
      description: 'Intervention rapide pour redémarrer, réparer ou diagnostiquer votre voiture en panne, où que vous soyez.',
      startingPrice: 70000,
      imageUrl: DepannageVoitureImage,
    },
  ];

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('La géolocalisation n\'est pas supportée par votre navigateur');
      setLoadingLocation(false);
      return;
    }
    setLoadingLocation(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
        setShowMap(true);
        setLoadingLocation(false);
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
        console.log(`Géolocalisation (Home): ${errorMessage} (Code: ${error.code})`);

        setLocationError(errorMessage);
        setLoadingLocation(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 300000 }
    );
  };

  const handleBookingClick = () => {
    if (!userLocation) {
      setLocationError('Veuillez d\'abord utiliser votre position');
      return;
    }
    navigate('/booking', { state: { userLocation } });
  };

  const handleTechnicianSelect = (technician: Technician) => {
    if (!user) {
      navigate('/login?redirect=/booking');
      return;
    }

    // Rediriger vers le formulaire de réservation avec les infos du technicien
    navigate('/booking', {
      state: {
        selectedTechnician: technician,
        userLocation: userLocation
      }
    });
  };

  useEffect(() => {
    if (location.state && location.state.userLocation) {
      setUserLocation(location.state.userLocation);
      setShowMap(true);
    }
  }, [location.state]);

  return (
    <>
      <HeroSection onGetLocation={handleGetLocation} loadingLocation={loadingLocation} />

      {/* Section Carte des Techniciens */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-orange-500 font-medium">Service Rapide</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">Trouvez un Technicien à Proximité</h2>
            <p className="max-w-2xl mx-auto text-gray-600 mb-8">
              Besoin d'une intervention urgente ? Localisez rapidement un technicien qualifié dans votre zone et obtenez une assistance immédiate.
            </p>

            {/* Bouton de géolocalisation */}
            <div className="flex justify-center mb-8">
              <button
                onClick={handleGetLocation}
                disabled={loadingLocation}
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-8 rounded-md transition-colors inline-flex items-center space-x-2 disabled:opacity-50"
              >
                {loadingLocation ? (
                  <>
                    <Loader2 className="animate-spin h-5 w-5" />
                    <span>Localisation en cours...</span>
                  </>
                ) : (
                  <>
                    <MapPin className="h-5 w-5" />
                    <span>Utiliser Ma Position</span>
                  </>
                )}
              </button>
            </div>

            {/* Message d'erreur */}
            {locationError && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6 max-w-2xl mx-auto">
                <div className="flex items-center">
                  <div className="text-red-600 mr-2">⚠️</div>
                  <span>{locationError}</span>
                </div>
              </div>
            )}

            {/* Carte conditionnelle */}
            {showMap && userLocation && (
              <div className="mt-8">
                <TechnicianMapHome
                  userLat={userLocation.lat}
                  userLng={userLocation.lng}
                  onTechnicianSelect={handleTechnicianSelect}
                />
              </div>
            )}

            {/* Message si pas connecté */}
            {!user && (
              <div className="bg-blue-50 border border-blue-200 text-blue-700 px-4 py-3 rounded-md mt-6 max-w-2xl mx-auto">
                <div className="flex items-center justify-center">
                  <div className="text-blue-600 mr-2">ℹ️</div>
                  <span>Connectez-vous pour utiliser la géolocalisation et voir les techniciens proches</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Qui Sommes-Nous Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <span className="text-orange-500 font-medium">Notre Histoire</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">Qui Sommes-Nous</h2>
              <div className="space-y-6">
                <p className="text-gray-600 leading-relaxed">
                  DepanneTeliman est votre spécialiste du dépannage en urgence ou sur rendez-vous à travers tout le Mali. Avec des milliers d'interventions mensuelles, nous révolutionnons le secteur du dépannage en vous garantissant des prix fixes et transparents.
                </p>
                <p className="text-gray-600 leading-relaxed">
                  Notre vaste réseau de professionnels qualifiés couvre tous vos besoins : serrurerie, plomberie, électricité, chauffage, climatisation, travaux, vitrerie et assainissement. Nos experts analysent votre besoin et vous proposent une solution rapide au meilleur tarif.
                </p>
                <div className="bg-orange-50 p-6 rounded-lg">
                  <h3 className="text-xl font-semibold text-orange-700 mb-3">Disponibilité 24/7</h3>
                  <p className="text-gray-600">
                    Plus de 400 prestations proposées, avec des artisans de confiance disponibles 24h/24 et 7j/7 à travers tout le Mali. Service disponible en français et en anglais pour les touristes et expatriés.
                  </p>
                </div>
              </div>
            </div>
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-xl">
              <img
                src={depanneurImage}
                alt="Équipe DepanneTeliman"
                className="w-full h-full object-contain bg-gray-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-8 text-white">
                <h3 className="text-2xl font-bold mb-2">Votre Partenaire de Confiance</h3>
                <p className="text-white/90">Plus de 1000 interventions réussies chaque mois</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-orange-500 font-medium">Nos Services</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">Services de Réparation Professionnels</h2>
            <p className="max-w-2xl mx-auto text-gray-600">
              Nos techniciens certifiés fournissent des réparations et une maintenance fiables pour les maisons et les entreprises dans toutes les catégories de services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {services.slice(0, showAllServices ? services.length : 6).map(service => (
              <div key={service.id} className="relative">
                <ServiceCard service={service} />
                <div className="mt-4 text-center">
                  <Link
                    to={`/service/${service.id}`}
                    className="text-blue-700 hover:underline font-medium"
                  >
                    Voir les détails
                  </Link>
                </div>
              </div>
            ))}
          </div>

          <div className="text-center mt-12 space-y-6">
            {!showAllServices && services.length > 6 && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAllServices(true)}
                  className="group relative inline-flex items-center justify-center px-8 py-4 overflow-hidden font-medium text-white bg-gradient-to-r from-orange-500 to-orange-600 rounded-lg shadow-lg hover:from-orange-600 hover:to-orange-700 transform hover:scale-105 transition-all duration-300 ease-out"
                >
                  <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-white opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
                  <span className="relative flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path>
                    </svg>
                    <span>Afficher plus de services</span>
                  </span>
                </button>
              </div>
            )}

            {showAllServices && services.length > 6 && (
              <div className="flex justify-center">
                <button
                  onClick={() => setShowAllServices(false)}
                  className="group relative inline-flex items-center justify-center px-8 py-4 overflow-hidden font-medium text-orange-600 bg-white border-2 border-orange-500 rounded-lg shadow-lg hover:bg-orange-50 transform hover:scale-105 transition-all duration-300 ease-out"
                >
                  <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-orange-200 opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
                  <span className="relative flex items-center space-x-2">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 15l7-7 7 7"></path>
                    </svg>
                    <span>Afficher moins</span>
                  </span>
                </button>
              </div>
            )}

            <div className="flex justify-center">
              <Link
                to="/booking"
                className="group relative inline-flex items-center justify-center px-8 py-4 overflow-hidden font-medium text-white bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-300 ease-out"
              >
                <span className="absolute right-0 w-8 h-32 -mt-12 transition-all duration-1000 transform translate-x-12 bg-white opacity-10 rotate-12 group-hover:-translate-x-40 ease"></span>
                <span className="relative flex items-center space-x-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                  </svg>
                  <span>Réserver un Service</span>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-orange-500 font-medium">Processus Simple</span>
            <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-4">Comment Ça Marche</h2>
            <p className="max-w-2xl mx-auto text-gray-600">
              Obtenir de l'aide experte est facile avec notre processus de réservation simple.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-700 text-2xl font-bold">1</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Réservez un Service</h3>
              <p className="text-gray-600">
                Entrez votre localisation et sélectionnez le service dont vous avez besoin. Choisissez un créneau horaire qui vous convient.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-700 text-2xl font-bold">2</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Obtenez un Technicien</h3>
              <p className="text-gray-600">
                Nous vous assignerons un technicien certifié spécialisé dans vos besoins spécifiques.
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-blue-700 text-2xl font-bold">3</span>
              </div>
              <h3 className="text-xl font-semibold mb-3">Problème Résolu</h3>
              <p className="text-gray-600">
                Votre technicien arrive à l'heure, diagnostique le problème et effectue la réparation.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-blue-900 text-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <span className="text-orange-400 font-medium">Témoignages</span>
            <h2 className="text-3xl font-bold mt-2 mb-4">Ce que Disent Nos Clients</h2>
            <p className="max-w-2xl mx-auto text-blue-200">
              Ne nous croyez pas sur parole. Voici ce que nos clients disent de nos services.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white rounded-lg p-6 text-gray-800 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="mr-3">
                  <img
                    src=""
                    alt="Client"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-semibold">Adama SANGARE</h4>
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Le plombier est arrivé rapidement et a réparé notre robinet qui fuyait en un rien de temps. Très professionnel et à prix raisonnable. Je recommande vivement !"
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 text-gray-800 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="mr-3">
                  <img
                    src=""
                    alt="Client"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-semibold">Mohamed DIARRA</h4>
                  <div className="flex text-yellow-500">
                    {[...Array(5)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "J'ai eu un problème électrique pendant le week-end. Le technicien est venu en moins d'une heure et a tout remis en état. Excellent service d'urgence !"
              </p>
            </div>

            <div className="bg-white rounded-lg p-6 text-gray-800 shadow-lg">
              <div className="flex items-center mb-4">
                <div className="mr-3">
                  <img
                    src=""
                    alt="Client"
                    className="w-12 h-12 rounded-full object-cover"
                  />
                </div>
                <div>
                  <h4 className="font-semibold">Ibrahim SINAYOKO</h4>
                  <div className="flex text-yellow-500">
                    {[...Array(4)].map((_, i) => (
                      <svg key={i} xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118l-2.8-2.034c-.783-.57-.38-1.81.588-1.81h3.462a1 1 0 00.95-.69l1.07-3.292z" />
                      </svg>
                    ))}
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                    </svg>
                  </div>
                </div>
              </div>
              <p className="text-gray-600">
                "Le technicien informatique a aidé à résoudre un problème de réseau persistant qui affectait notre bureau à domicile. Service professionnel et compétent."
              </p>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              to="/reviews"
              className="text-white border border-white py-3 px-8 rounded-md hover:bg-white hover:text-blue-900 transition-colors inline-block"
            >
              Lire Plus de Témoignages
            </Link>
          </div>
        </div>
      </section>

      {/* Maçons Qualifiés Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-xl">
              <img
                src="https://images.pexels.com/photos/159358/construction-site-build-construction-work-159358.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2"
                alt="Maçons au travail"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            <div>
              <span className="text-orange-500 font-medium">Expertise Professionnelle</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">Prise en Charge de Votre Chantier par nos Maçons Qualifiés</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Expertise Technique</h3>
                    <p className="text-gray-600">Nos maçons qualifiés possèdent une expertise approfondie dans tous les aspects de la construction et de la rénovation.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Respect des Délais</h3>
                    <p className="text-gray-600">Nous nous engageons à respecter les délais convenus et à maintenir une communication transparente tout au long du projet.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Qualité Garantie</h3>
                    <p className="text-gray-600">Chaque projet est réalisé selon les normes les plus strictes avec des matériaux de haute qualité.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Équipement Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="order-2 lg:order-1">
              <span className="text-orange-500 font-medium">Énergie Solaire</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">Mise à Disposition et Installation d'Équipement Solaire</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Solutions Solaires Complètes</h3>
                    <p className="text-gray-600">Installation de panneaux solaires, systèmes de stockage et solutions d'énergie renouvelable pour votre maison ou entreprise.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Économies d'Énergie</h3>
                    <p className="text-gray-600">Réduisez significativement vos factures d'électricité grâce à nos solutions solaires optimisées et nos conseils personnalisés.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Installation Professionnelle</h3>
                    <p className="text-gray-600">Nos techniciens certifiés assurent une installation sécurisée et conforme aux normes en vigueur.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-xl order-1 lg:order-2">
              <img
                src={solarPanelImage}
                alt="Installation de panneaux solaires"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
          </div>
        </div>
      </section>

      {/* Équipe de Nettoyage Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="relative h-[500px] rounded-2xl overflow-hidden shadow-xl">
              <img
                src={nettoyeurImage}
                alt="Équipe de nettoyage"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            </div>
            <div>
              <span className="text-orange-500 font-medium">Service de Nettoyage</span>
              <h2 className="text-3xl font-bold text-gray-900 mt-2 mb-6">Équipe de Nettoyage Professionnelle</h2>
              <div className="space-y-4">
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Nettoyage Complet</h3>
                    <p className="text-gray-600">Notre équipe assure un nettoyage approfondi de tous vos espaces avec des produits écologiques.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Flexibilité Horaire</h3>
                    <p className="text-gray-600">Nous nous adaptons à votre emploi du temps pour assurer un service de nettoyage régulier.</p>
                  </div>
                </div>
                <div className="flex items-start">
                  <div className="flex-shrink-0 w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mr-4">
                    <svg className="w-6 h-6 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl font-semibold mb-2">Personnel Formé</h3>
                    <p className="text-gray-600">Notre équipe est formée aux dernières techniques et normes de nettoyage professionnel.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-orange-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-6">Prêt à faire réparer vos appareils correctement ?</h2>
          <p className="text-xl mb-8 max-w-2xl mx-auto">
            Nos professionnels sont disponibles 24/7 pour vous aider avec toute réparation d'urgence ou maintenance planifiée.
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/booking"
              className="bg-white text-orange-600 font-bold py-3 px-8 rounded-md hover:bg-blue-900 hover:text-white transition-colors inline-block"
            >
              Réserver Maintenant
            </Link>
            <a
              href="tel:+33123456789"
              className="border-2 border-white text-white font-bold py-3 px-8 rounded-md hover:bg-white hover:text-orange-600 transition-colors inline-block"
            >
              Appelez-Nous
            </a>
          </div>
        </div>
      </section>
    </>
  );
};

export default Home;