import React from 'react';
import { Link } from 'react-router-dom';
import { Wrench, Zap, Key, Monitor, Thermometer, Fan } from 'lucide-react';
import HeroSection from '../components/HeroSection';
import ServiceCard from '../components/ServiceCard';
import { Service } from '../types/service';

// Import des images locales
import plombierImage from '../assets/image/plombier.jpg';
import depanneurImage from '../assets/image/depanneur.jpg';
import serrurierImage from '../assets/image/serrurier.jpg';
import solarPanelImage from '../assets/image/solar-panel.jpg';
import nettoyeurImage from '../assets/image/nettoyeur.jpg';
import climatisationImage from '../assets/image/Climatisation.webp';

const Home: React.FC = () => {
  // Mock service data
  const services: Service[] = [
    {
      id: 'plumbing',
      name: 'Plomberie',
      icon: <Wrench className="text-blue-600" />,
      shortDescription: 'Réparations de plomberie expertes pour les fuites, les bouchons et les installations.',
      description: 'Nos plombiers professionnels s\'occupent de tout, des réparations d\'urgence aux nouvelles installations.',
      startingPrice: 80000,
      imageUrl: plombierImage,
    },
    {
      id: 'electrical',
      name: 'Électricité',
      icon: <Zap className="text-yellow-500" />,
      shortDescription: 'Électriciens certifiés pour tous vos besoins électriques.',
      description: 'Du câblage à l\'installation d\'appareils, nos électriciens agréés garantissent sécurité et qualité.',
      startingPrice: 90000,
      imageUrl: 'https://images.pexels.com/photos/8005368/pexels-photo-8005368.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
    {
      id: 'locksmith',
      name: 'Serrurier',
      icon: <Key className="text-gray-700" />,
      shortDescription: 'Service rapide de dépannage et solutions de sécurité.',
      description: 'Enfermé dehors ? Besoin de nouvelles serrures ? Nos serruriers fournissent un service rapide et fiable 24/7.',
      startingPrice: 70000,
      imageUrl: serrurierImage,
    },
    {
      id: 'it-support',
      name: 'Support Informatique',
      icon: <Monitor className="text-purple-600" />,
      shortDescription: 'Support technique pour ordinateurs et réseaux.',
      description: 'Nos techniciens informatiques résolvent vos problèmes informatiques, configurent les réseaux et fournissent un support continu.',
      startingPrice: 75000,
      imageUrl: 'https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
    {
      id: 'heating',
      name: 'Chauffage & Climatisation',
      icon: <Thermometer className="text-red-500" />,
      shortDescription: 'Réparations et maintenance des systèmes de chauffage et de climatisation.',
      description: 'Gardez votre maison confortable toute l\'année avec nos services de réparation et de maintenance CVC.',
      startingPrice: 95000,
      imageUrl: climatisationImage,
    },
    {
      id: 'appliances',
      name: 'Réparation d\'Électroménagers',
      icon: <Fan className="text-blue-400" />,
      shortDescription: 'Réparations pour réfrigérateurs, lave-linges, sèche-linges et plus.',
      description: 'Nos techniciens réparent tous les appareils électroménagers rapidement et à prix abordable.',
      startingPrice: 85000,
      imageUrl: 'https://images.pexels.com/photos/4108807/pexels-photo-4108807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2',
    },
  ];

  return (
    <>
      <HeroSection />
      
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
            {services.map(service => (
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
          
          <div className="text-center mt-12">
            <Link 
              to="/booking" 
              className="bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 px-8 rounded-md transition-colors inline-block"
            >
              Réserver un Service
            </Link>
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