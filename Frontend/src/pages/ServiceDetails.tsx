import React from "react";
import { useParams, Link } from "react-router-dom";
import {
  Wrench,
  Zap,
  Key,
  Monitor,
  Thermometer,
  Fan,
} from "lucide-react";
import { Service } from "../types/service";

// Données des services (dans une vraie application, cela viendrait d'une API)
const services: Record<string, Service> = {
  plumbing: {
    id: "plumbing",
    name: "Plomberie",
    shortDescription:
      "Réparations de plomberie par des experts pour fuites, bouchons et installations.",
    description:
      "Nos plombiers professionnels s'occupent de tout, des réparations d'urgence aux rénovations complètes de salle de bain. Nous réparons les fuites, débouchons les canalisations, réparons ou remplaçons les chauffe-eau, installons les équipements, et plus encore.",
    startingPrice: 80,
    imageUrl:
      "https://images.pexels.com/photos/4116186/pexels-photo-4116186.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  electrical: {
    id: "electrical",
    name: "Électricité",
    shortDescription:
      "Électriciens certifiés pour tous vos besoins électriques.",
    description:
      "Nos électriciens agréés proposent une large gamme de services incluant le recâblage, l'installation d'appareils, la mise à niveau des tableaux électriques, l'installation de prises, le remplacement de disjoncteurs, et plus encore. Tous les travaux sont réalisés selon les normes de sécurité les plus strictes.",
    startingPrice: 90,
    imageUrl:
      "https://images.pexels.com/photos/8005368/pexels-photo-8005368.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  locksmith: {
    id: "locksmith",
    name: "Serrurerie",
    shortDescription: "Service rapide de dépannage et solutions de sécurité.",
    description:
      "Que vous soyez enfermé à l'extérieur ou que vous ayez besoin d'améliorer votre sécurité, nos serruriers sont là pour vous aider. Nous proposons un service d'urgence, le changement de serrures, l'installation de serrures, la duplication de clés et des conseils en sécurité.",
    startingPrice: 70,
    imageUrl:
      "https://images.pexels.com/photos/4219054/pexels-photo-4219054.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  "it-support": {
    id: "it-support",
    name: "Support Informatique",
    shortDescription: "Support technique pour ordinateurs et réseaux.",
    description:
      "Nos techniciens informatiques peuvent résoudre une large gamme de problèmes informatiques et réseau. Les services incluent la suppression de virus, la récupération de données, la configuration d'ordinateurs, la configuration réseau, l'installation de logiciels et la formation pour particuliers et petites entreprises.",
    startingPrice: 75,
    imageUrl:
      "https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  heating: {
    id: "heating",
    name: "Chauffage & Climatisation",
    shortDescription:
      "Réparation et maintenance des systèmes de chauffage et climatisation.",
    description:
      "Gardez votre maison confortable toute l'année avec nos services de CVC. Nous réparons et entretenons les chaudières, climatiseurs, pompes à chaleur et systèmes de ventilation. Nous proposons également des mises au point saisonnières et des consultations sur l'efficacité énergétique.",
    startingPrice: 95,
    imageUrl:
      "https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  appliances: {
    id: "appliances",
    name: "Réparation d'Électroménager",
    shortDescription:
      "Réparations de réfrigérateurs, lave-linge, sèche-linge et plus.",
    description:
      "Nos techniciens sont spécialisés dans la réparation de tous les appareils électroménagers, y compris les réfrigérateurs, lave-linge, sèche-linge, lave-vaisselle, fours et micro-ondes. Nous travaillons avec toutes les grandes marques et proposons un service le jour même quand c'est possible.",
    startingPrice: 85,
    imageUrl:
      "https://images.pexels.com/photos/4108807/pexels-photo-4108807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
};

// Exemples détaillés pour chaque service
const serviceExamples = {
  plumbing: {
    title: "Plomberie",
    icon: <Wrench className="text-blue-600" />,
    examples: [
      {
        title: "Réparation de Fuite d'Eau",
        description:
          "Détection et réparation rapide des fuites d'eau dans les tuyaux, robinets et installations sanitaires. Intervention d'urgence disponible 24/7.",
        price: "25000 - 75000 FCFA",
        duration: "1-3 heures",
      },
      {
        title: "Débouchage de Canalisations",
        description:
          "Débouchage professionnel des éviers, toilettes et canalisations bouchées. Utilisation d'équipements spécialisés pour un résultat durable.",
        price: "35000 - 85000 FCFA",
        duration: "1-2 heures",
      },
      {
        title: "Installation Sanitaire",
        description:
          "Installation complète de sanitaires : lavabos, douches, baignoires, WC. Conseil personnalisé et garantie sur l'installation.",
        price: "150000 - 450000 FCFA",
        duration: "1-3 jours",
      },
    ],
  },
  electrical: {
    title: "Électricité",
    icon: <Zap className="text-yellow-500" />,
    examples: [
      {
        title: "Installation Électrique",
        description:
          "Installation complète ou mise aux normes de votre installation électrique. Pose de prises, interrupteurs et tableau électrique.",
        price: "75000 - 250000 FCFA",
        duration: "1-3 jours",
      },
      {
        title: "Dépannage Électrique",
        description:
          "Intervention rapide pour tout problème électrique : court-circuit, panne de courant, disjoncteur qui saute.",
        price: "35000 - 85000 FCFA",
        duration: "1-4 heures",
      },
      {
        title: "Installation d'Éclairage",
        description:
          "Installation et remplacement de systèmes d'éclairage, pose de luminaires, installation de détecteurs de mouvement.",
        price: "45000 - 150000 FCFA",
        duration: "2-6 heures",
      },
    ],
  },
  locksmith: {
    title: "Serrurier",
    icon: <Key className="text-gray-700" />,
    examples: [
      {
        title: "Ouverture de Porte",
        description:
          "Ouverture de porte sans dégâts en cas de perte de clés ou de serrure bloquée. Service d'urgence 24/7.",
        price: "25000 - 65000 FCFA",
        duration: "30 min - 1 heure",
      },
      {
        title: "Changement de Serrure",
        description:
          "Remplacement complet de serrure pour plus de sécurité. Installation de serrures de haute sécurité.",
        price: "45000 - 125000 FCFA",
        duration: "1-2 heures",
      },
      {
        title: "Installation de Système de Sécurité",
        description:
          "Installation de systèmes de sécurité complets : serrures multipoints, verrous, blindage de porte.",
        price: "150000 - 450000 FCFA",
        duration: "1-2 jours",
      },
    ],
  },
  "it-support": {
    title: "Support Informatique",
    icon: <Monitor className="text-purple-600" />,
    examples: [
      {
        title: "Dépannage PC/Mac",
        description:
          "Résolution des problèmes logiciels et matériels, suppression de virus, récupération de données.",
        price: "35000 - 85000 FCFA",
        duration: "1-3 heures",
      },
      {
        title: "Installation Réseau",
        description:
          "Configuration de réseaux domestiques ou professionnels, installation WiFi, sécurisation réseau.",
        price: "75000 - 250000 FCFA",
        duration: "1-2 jours",
      },
      {
        title: "Maintenance Préventive",
        description:
          "Nettoyage, mise à jour, optimisation des performances de vos appareils informatiques.",
        price: "45000 - 95000 FCFA",
        duration: "2-4 heures",
      },
    ],
  },
  heating: {
    title: "Chauffage & Climatisation",
    icon: <Thermometer className="text-red-500" />,
    examples: [
      {
        title: "Installation Climatisation",
        description:
          "Installation complète de systèmes de climatisation, incluant le montage et la mise en service.",
        price: "450000 - 950000 FCFA",
        duration: "1-2 jours",
      },
      {
        title: "Maintenance Climatisation",
        description:
          "Entretien régulier, nettoyage des filtres, recharge en gaz, vérification du système.",
        price: "65000 - 125000 FCFA",
        duration: "2-3 heures",
      },
      {
        title: "Réparation Chauffage",
        description:
          "Diagnostic et réparation de systèmes de chauffage, remplacement de pièces défectueuses.",
        price: "75000 - 250000 FCFA",
        duration: "2-6 heures",
      },
    ],
  },
  appliances: {
    title: "Réparation d'Électroménagers",
    icon: <Fan className="text-blue-400" />,
    examples: [
      {
        title: "Réparation Réfrigérateur",
        description:
          "Diagnostic et réparation de pannes de réfrigérateur : problèmes de froid, fuites, bruits anormaux.",
        price: "45000 - 150000 FCFA",
        duration: "1-3 heures",
      },
      {
        title: "Réparation Lave-linge",
        description:
          "Réparation de tous types de pannes : problèmes de tambour, fuites, pannes électroniques.",
        price: "35000 - 125000 FCFA",
        duration: "1-4 heures",
      },
      {
        title: "Réparation Four/Cuisinière",
        description:
          "Intervention sur fours et cuisinières : problèmes d'allumage, thermostats, éléments chauffants.",
        price: "40000 - 95000 FCFA",
        duration: "1-3 heures",
      },
    ],
  },
};

const ServiceDetails: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const serviceData =
    serviceExamples[serviceId as keyof typeof serviceExamples];

  if (!serviceData) {
    return (
      <div className="container mx-auto px-4 py-16">
        <h1 className="text-3xl font-bold text-red-600">Service non trouvé</h1>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
        <div className="mb-12 text-center">
          <div className="flex items-center justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center mr-4">
              {serviceData.icon}
            </div>
            <h1 className="text-4xl font-bold text-gray-900">
              {serviceData.title}
            </h1>
          </div>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto">
            Découvrez nos prestations détaillées pour ce service
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {serviceData.examples.map((example, index) => (
            <div
              key={index}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow p-6"
            >
              <h3 className="text-xl font-semibold text-gray-800 mb-4">
                {example.title}
              </h3>
              <p className="text-gray-600 mb-6">{example.description}</p>
              <div className="space-y-2">
                <div className="flex items-center text-blue-800">
                  <span className="font-semibold mr-2">Prix estimé:</span>
                  <span>{example.price}</span>
                </div>
                <div className="flex items-center text-gray-600">
                  <span className="font-semibold mr-2">Durée moyenne:</span>
                  <span>{example.duration}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <button
            onClick={() => window.history.back()}
            className="bg-blue-700 hover:bg-blue-800 text-white font-medium py-3 px-8 rounded-md transition-colors inline-block"
          >
            Retour aux services
          </button>
        </div>
      </div>
    </div>
  );
};

export default ServiceDetails; 