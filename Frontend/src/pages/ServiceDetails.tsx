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

// Données des services (dans une vraie application, cela viendrait d'une API)
const services: Record<string, Service> = {
  plumber: {
    id: "plumber",
    name: "Plomberie",
    shortDescription:
      "Réparations de plomberie par des experts pour fuites, bouchons et installations.",
    description:
      "Nos plombiers professionnels s'occupent de tout, des réparations d'urgence aux rénovations complètes de salle de bain. Nous réparons les fuites, débouchons les canalisations, réparons ou remplaçons les chauffe-eau, installons les équipements, et plus encore.",
    startingPrice: 80,
    imageUrl:
      "https://images.pexels.com/photos/4116186/pexels-photo-4116186.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  electrician: {
    id: "electrician",
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
  it: {
    id: "it",
    name: "Support Informatique",
    shortDescription: "Support technique pour ordinateurs et réseaux.",
    description:
      "Nos techniciens informatiques peuvent résoudre une large gamme de problèmes informatiques et réseau. Les services incluent la suppression de virus, la récupération de données, la configuration d'ordinateurs, la configuration réseau, l'installation de logiciels et la formation pour particuliers et petites entreprises.",
    startingPrice: 75,
    imageUrl:
      "https://images.pexels.com/photos/3568520/pexels-photo-3568520.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  air_conditioning: {
    id: "air_conditioning",
    name: "Chauffage & Climatisation",
    shortDescription:
      "Réparation et maintenance des systèmes de chauffage et climatisation.",
    description:
      "Gardez votre maison confortable toute l'année avec nos services de CVC. Nous réparons et entretenons les chaudières, climatiseurs, pompes à chaleur et systèmes de ventilation. Nous proposons également des mises au point saisonnières et des consultations sur l'efficacité énergétique.",
    startingPrice: 95,
    imageUrl:
      "https://images.pexels.com/photos/4489732/pexels-photo-4489732.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  appliance_repair: {
    id: "appliance_repair",
    name: "Réparation d'Électroménager",
    shortDescription:
      "Réparations de réfrigérateurs, lave-linge, sèche-linge et plus.",
    description:
      "Nos techniciens sont spécialisés dans la réparation de tous les appareils électroménagers, y compris les réfrigérateurs, lave-linge, sèche-linge, lave-vaisselle, fours et micro-ondes. Nous travaillons avec toutes les grandes marques et proposons un service le jour même quand c'est possible.",
    startingPrice: 85,
    imageUrl:
      "https://images.pexels.com/photos/4108807/pexels-photo-4108807.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=2",
  },
  panneauxolaires: {
    id: "panneauxolaires",
    name: "Panneaux Solaires",
    shortDescription: "Installation et maintenance de panneaux solaires.",
    description: "Nos experts installent et entretiennent vos panneaux solaires pour une énergie propre et durable.",
    startingPrice: 100,
    imageUrl: "https://cdn-icons-png.flaticon.com/512/169/169367.png", // à remplacer si besoin
  },
  maconnerie: {
    id: "maconnerie",
    name: "Maçonnerie",
    shortDescription: "Travaux de maçonnerie et rénovation.",
    description: "Construction, rénovation, réparation de murs, dalles, escaliers, etc.",
    startingPrice: 120,
    imageUrl: "https://cdn-icons-png.flaticon.com/512/3062/3062634.png",
  },
  decoration: {
    id: "decoration",
    name: "Décoration",
    shortDescription: "Décoration intérieure et extérieure.",
    description: "Conseils et réalisation de projets de décoration personnalisés.",
    startingPrice: 80,
    imageUrl: "https://cdn-icons-png.flaticon.com/512/1829/1829586.png",
  },
  soudure: {
    id: "soudure",
    name: "Soudure",
    shortDescription: "Travaux de soudure sur mesure.",
    description: "Soudure de structures métalliques, portails, grilles, etc.",
    startingPrice: 90,
    imageUrl: "https://cdn-icons-png.flaticon.com/512/2933/2933825.png",
  },
  groupeelectrogene: {
    id: "groupeelectrogene",
    name: "Groupe électrogène",
    shortDescription: "Installation et dépannage de groupes électrogènes.",
    description: "Mise en service, entretien et réparation de groupes électrogènes.",
    startingPrice: 150,
    imageUrl: "https://cdn-icons-png.flaticon.com/512/1046/1046857.png",
  },
  pneumatique: {
    id: "pneumatique",
    name: "Pneumatique",
    shortDescription: "Changement et réparation de pneus.",
    description: "Service rapide pour vos pneus : montage, équilibrage, réparation.",
    startingPrice: 50,
    imageUrl: "https://cdn-icons-png.flaticon.com/512/809/809957.png",
  },
  coiffeur: {
    id: "coiffeur",
    name: "Coiffeur",
    shortDescription: "Coiffure à domicile pour hommes et femmes.",
    description: "Coupes, soins, coiffures tendance à domicile.",
    startingPrice: 40,
    imageUrl: CoiffeurImage,
  },
  pressing: {
    id: "pressing",
    name: "Pressing",
    shortDescription: "Nettoyage et repassage de vêtements.",
    description: "Service de pressing professionnel à domicile.",
    startingPrice: 30,
    imageUrl: PressingImage,
  },
  tele: {
    id: "tele",
    name: "Télé",
    shortDescription: "Installation et réparation de téléviseurs.",
    description: "Dépannage, installation murale, réglages TV.",
    startingPrice: 60,
    imageUrl: TeleImage,
  },
  esthetique: {
    id: "esthetique",
    name: "Esthétique et Beauté",
    shortDescription: "Soins de beauté à domicile.",
    description: "Maquillage, soins du visage, manucure, etc.",
    startingPrice: 50,
    imageUrl: EsthetiquesetbeauteImage,
  },
  lessive: {
    id: "lessive",
    name: "Lessive à Domicile",
    shortDescription: "Service de lessive et repassage à domicile.",
    description: "Collecte, lavage, repassage et livraison de linge.",
    startingPrice: 25,
    imageUrl: LessiveImage,
  },
  aideMenagere: {
    id: "aidemenagere",
    name: "Aide Ménagère",
    shortDescription: "Aide ménagère à domicile.",
    description: "Nettoyage, rangement, entretien de la maison.",
    startingPrice: 35,
    imageUrl: AideMenagereImage,
  },
  vidange: {
    id: "vidange",
    name: "Vidange",
    shortDescription: "Vidange de fosses et entretien.",
    description: "Service de vidange rapide et efficace.",
    startingPrice: 100,
    imageUrl: VidangeImage,
  },
  livraison: {
    id: "livraison",
    name: "Livraison",
    shortDescription: "Livraison express de colis et repas.",
    description: "Livraison rapide à domicile ou au bureau.",
    startingPrice: 20,
    imageUrl: LivraisonImage,
  },
  livraisongaz: {
    id: "livraisongaz",
    name: "Livraison Gaz",
    shortDescription: "Livraison de bouteilles de gaz à domicile.",
    description: "Commande et livraison de gaz en toute sécurité.",
    startingPrice: 30,
    imageUrl: LivraisonGazImage,
  },
  froid: {
    id: "froid",
    name: "Froid",
    shortDescription: "Installation et réparation de systèmes de froid.",
    description: "Climatisation, réfrigération, chambres froides.",
    startingPrice: 90,
    imageUrl: FroidImage,
  },
  telephone: {
    id: "telephone",
    name: "Téléphone",
    shortDescription: "Réparation et configuration de téléphones.",
    description: "Dépannage, déblocage, configuration smartphones.",
    startingPrice: 40,
    imageUrl: TelephoneImage,
  },
  menuisiers: {
    id: "menuisiers",
    name: "Menuisiers",
    shortDescription: "Travaux de menuiserie bois et alu.",
    description: "Fabrication, réparation, pose de meubles, portes, fenêtres.",
    startingPrice: 80,
    imageUrl: MenuisierImage,
  },
  mecanique: {
    id: "mecanique",
    name: "Mécanique",
    shortDescription: "Réparation et entretien automobile.",
    description: "Diagnostic, réparation, entretien de véhicules.",
    startingPrice: 100,
    imageUrl: MecaniqueImage,
  },
  antennes: {
    id: "antennes",
    name: "Antennes",
    shortDescription: "Installation et réglage d'antennes TV.",
    description: "Pose, réglage, dépannage d'antennes et paraboles.",
    startingPrice: 60,
    imageUrl: AntenneImage,
  },
  lavage: {
    id: "lavage",
    name: "Lavage",
    shortDescription: "Lavage auto, moto, tapis, etc.",
    description: "Nettoyage professionnel de véhicules et textiles.",
    startingPrice: 30,
    imageUrl: LavageImage,
  },
  demenagement: {
    id: "demenagement",
    name: "Déménagement",
    shortDescription: "Service de déménagement clé en main.",
    description: "Emballage, transport, installation à votre nouveau domicile.",
    startingPrice: 200,
    imageUrl: DemenagementImage,
  },
  nettoyage: {
    id: "nettoyage",
    name: "Nettoyage",
    shortDescription: "Nettoyage professionnel de locaux et maisons.",
    description: "Entretien, ménage, nettoyage après travaux.",
    startingPrice: 40,
    imageUrl: NettoyageImage,
  },
  peinture: {
    id: "peinture",
    name: "Peinture",
    shortDescription: "Travaux de peinture intérieure et extérieure.",
    description: "Rafraîchissement, décoration, peinture sur mesure.",
    startingPrice: 60,
    imageUrl: PeintureImage,
  },
  remorquage: {
    id: "remorquage",
    name: "Remorquage Auto",
    shortDescription: "Remorquage de véhicules en panne ou accidentés.",
    description: "Service de remorquage rapide et sécurisé pour tout type de véhicule, 24h/24 et 7j/7.",
    startingPrice: 80,
    imageUrl: RemorquageAutoImage,
  },
  depannageauto: {
    id: "depannageauto",
    name: "Dépannage de Voiture",
    shortDescription: "Dépannage sur place pour pannes mécaniques ou électriques.",
    description: "Intervention rapide pour redémarrer, réparer ou diagnostiquer votre voiture en panne, où que vous soyez.",
    startingPrice: 70,
    imageUrl: DepannageVoitureImage,
  },
};

// Exemples détaillés pour chaque service
const serviceExamples = {
  plumber: {
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
  electrician: {
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
  it: {
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
  air_conditioning: {
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
  appliance_repair: {
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
  panneauxolaires: {
    title: "Panneaux Solaires",
    icon: <Zap className="text-yellow-500" />,
    examples: [
      {
        title: "Installation de panneaux solaires",
        description: "Pose et raccordement de panneaux solaires pour l'autonomie énergétique.",
        price: "Sur devis",
        duration: "1-3 jours",
      },
    ],
  },
  maconnerie: {
    title: "Maçonnerie",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Construction de mur",
        description: "Montage de murs en briques, parpaings, etc.",
        price: "Sur devis",
        duration: "1-5 jours",
      },
    ],
  },
  decoration: {
    title: "Décoration",
    icon: <Key className="text-pink-500" />,
    examples: [
      {
        title: "Décoration intérieure",
        description: "Conseil et réalisation de décoration personnalisée.",
        price: "Sur devis",
        duration: "1-3 jours",
      },
    ],
  },
  soudure: {
    title: "Soudure",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Soudure de portail",
        description: "Fabrication et réparation de portails métalliques.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  groupeelectrogene: {
    title: "Groupe électrogène",
    icon: <Zap className="text-yellow-500" />,
    examples: [
      {
        title: "Installation de groupe électrogène",
        description: "Mise en service et entretien de groupes électrogènes.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  pneumatique: {
    title: "Pneumatique",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Changement de pneus",
        description: "Montage, équilibrage et réparation de pneus.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  coiffeur: {
    title: "Coiffeur",
    icon: <Key className="text-pink-500" />,
    examples: [
      {
        title: "Coupe à domicile",
        description: "Coupes et soins capillaires à domicile.",
        price: "Sur devis",
        duration: "30 min - 2h",
      },
    ],
  },
  pressing: {
    title: "Pressing",
    icon: <Zap className="text-blue-500" />,
    examples: [
      {
        title: "Nettoyage de vêtements",
        description: "Pressing et repassage à domicile.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  tele: {
    title: "Télé",
    icon: <Monitor className="text-gray-700" />,
    examples: [
      {
        title: "Installation TV",
        description: "Installation murale et réglage de téléviseurs.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  esthetique: {
    title: "Esthétique et Beauté",
    icon: <Key className="text-pink-500" />,
    examples: [
      {
        title: "Maquillage à domicile",
        description: "Maquillage et soins beauté à domicile.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  lessive: {
    title: "Lessive à Domicile",
    icon: <Zap className="text-blue-500" />,
    examples: [
      {
        title: "Lavage et repassage",
        description: "Collecte, lavage, repassage et livraison de linge.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  aideMenagere: {
    title: "Aide Ménagère",
    icon: <Key className="text-pink-500" />,
    examples: [
      {
        title: "Entretien de la maison",
        description: "Nettoyage, rangement, entretien à domicile.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  vidange: {
    title: "Vidange",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Vidange de fosse",
        description: "Vidange et entretien de fosses septiques.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  livraison: {
    title: "Livraison",
    icon: <Zap className="text-blue-500" />,
    examples: [
      {
        title: "Livraison express",
        description: "Livraison rapide de colis et repas.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  livraisongaz: {
    title: "Livraison Gaz",
    icon: <Zap className="text-yellow-500" />,
    examples: [
      {
        title: "Livraison de gaz",
        description: "Commande et livraison de bouteilles de gaz.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  froid: {
    title: "Froid",
    icon: <Thermometer className="text-blue-500" />,
    examples: [
      {
        title: "Installation climatisation",
        description: "Pose et entretien de systèmes de froid.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  telephone: {
    title: "Téléphone",
    icon: <Monitor className="text-blue-500" />,
    examples: [
      {
        title: "Réparation smartphone",
        description: "Dépannage et configuration de téléphones.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  menuisiers: {
    title: "Menuisiers",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Fabrication de meubles",
        description: "Création et réparation de meubles sur mesure.",
        price: "Sur devis",
        duration: "1-3 jours",
      },
    ],
  },
  mecanique: {
    title: "Mécanique",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Réparation auto",
        description: "Diagnostic et réparation de véhicules.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  antennes: {
    title: "Antennes",
    icon: <Monitor className="text-blue-500" />,
    examples: [
      {
        title: "Installation d'antennes",
        description: "Pose et réglage d'antennes TV et paraboles.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  lavage: {
    title: "Lavage",
    icon: <Zap className="text-blue-500" />,
    examples: [
      {
        title: "Lavage auto",
        description: "Nettoyage intérieur et extérieur de véhicules.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  demenagement: {
    title: "Déménagement",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Déménagement clé en main",
        description: "Emballage, transport, installation.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  nettoyage: {
    title: "Nettoyage",
    icon: <Zap className="text-blue-500" />,
    examples: [
      {
        title: "Nettoyage de locaux",
        description: "Entretien et nettoyage professionnel.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  peinture: {
    title: "Peinture",
    icon: <Wrench className="text-pink-500" />,
    examples: [
      {
        title: "Peinture intérieure",
        description: "Travaux de peinture et décoration.",
        price: "Sur devis",
        duration: "1-2 jours",
      },
    ],
  },
  remorquage: {
    title: "Remorquage Auto",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Remorquage de véhicule",
        description: "Remorquage de véhicule en panne ou accidenté.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
  depannageauto: {
    title: "Dépannage de Voiture",
    icon: <Wrench className="text-gray-700" />,
    examples: [
      {
        title: "Dépannage de voiture",
        description: "Intervention rapide pour redémarrer, réparer ou diagnostiquer votre voiture en panne.",
        price: "Sur devis",
        duration: "1-2 heures",
      },
    ],
  },
};

const ServiceDetails: React.FC = () => {
  const { serviceId } = useParams<{ serviceId: string }>();
  const serviceData =
    serviceExamples[serviceId as keyof typeof serviceExamples];
  const serviceInfo = services[serviceId as keyof typeof services];

  if (!serviceData || !serviceInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-12 h-12 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">Service non trouvé</h1>
          <p className="text-gray-600 mb-8">Le service que vous recherchez n'existe pas ou a été supprimé.</p>
          <Link
            to="/"
            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
            </svg>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.1'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}></div>
        </div>
        
        <div className="relative container mx-auto px-4 py-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="text-white">
              <div className="inline-flex items-center px-4 py-2 bg-white/20 backdrop-blur-sm rounded-full text-sm font-medium mb-6">
                <div className="w-8 h-8 rounded-full bg-white/30 flex items-center justify-center mr-3">
              {serviceData.icon}
            </div>
                Service Professionnel
              </div>
              
              <h1 className="text-5xl lg:text-6xl font-bold mb-6 leading-tight">
              {serviceData.title}
            </h1>
              
              <p className="text-xl text-blue-100 mb-8 leading-relaxed">
                {serviceInfo.shortDescription}
              </p>
              
              <div className="flex flex-wrap gap-4">
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
                  <div className="text-2xl font-bold">{serviceInfo.startingPrice} FCFA</div>
                  <div className="text-blue-100 text-sm">Prix de départ</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
                  <div className="text-2xl font-bold">24/7</div>
                  <div className="text-blue-100 text-sm">Disponibilité</div>
                </div>
                <div className="bg-white/20 backdrop-blur-sm rounded-lg px-6 py-4">
                  <div className="text-2xl font-bold">100%</div>
                  <div className="text-blue-100 text-sm">Garantie</div>
                </div>
              </div>
            </div>
            
            <div className="relative">
              <div className="relative z-10 bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20">
                <div className="text-center">
                  <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                    {serviceData.icon}
                  </div>
                  <h3 className="text-2xl font-bold text-white mb-4">Réservez maintenant</h3>
                  <p className="text-blue-100 mb-6">Obtenez un devis personnalisé et réservez votre intervention</p>
                  <Link
                    to="/booking"
                    className="inline-flex items-center px-8 py-4 bg-white text-blue-600 font-bold rounded-lg hover:bg-blue-50 transform hover:scale-105 transition-all duration-300 shadow-lg"
                  >
                    <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                    </svg>
                    Réserver ce service
                  </Link>
                </div>
              </div>
              
              {/* Floating Elements */}
              <div className="absolute -top-4 -right-4 w-8 h-8 bg-yellow-400 rounded-full animate-bounce"></div>
              <div className="absolute -bottom-4 -left-4 w-6 h-6 bg-orange-400 rounded-full animate-pulse"></div>
            </div>
          </div>
        </div>
      </div>

      {/* Description Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-6">À propos de ce service</h2>
            <p className="text-xl text-gray-600 leading-relaxed">
              {serviceInfo.description}
            </p>
          </div>
        </div>
      </section>

      {/* Services Examples Section */}
      <section className="py-16 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Nos prestations</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Découvrez nos services détaillés et obtenez un devis personnalisé selon vos besoins
          </p>
        </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 max-w-7xl mx-auto">
          {serviceData.examples.map((example, index) => (
            <div
              key={index}
                className="group relative bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-2xl transform hover:-translate-y-2 transition-all duration-300"
              >
                {/* Gradient Overlay */}
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-indigo-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                
                <div className="relative p-8">
                  {/* Icon */}
                  <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform duration-300">
                    <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
                    </svg>
                  </div>
                  
                  <h3 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-blue-600 transition-colors">
                {example.title}
              </h3>
                  
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    {example.description}
                  </p>
                  
                  <div className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <span className="font-semibold text-blue-900">Prix estimé</span>
                      <span className="text-lg font-bold text-blue-600">{example.price}</span>
                    </div>
                    
                    <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <span className="font-semibold text-gray-700">Durée moyenne</span>
                      <span className="text-lg font-bold text-gray-900">{example.duration}</span>
                    </div>
                  </div>
                  
                  {/* Action Button */}
                  <div className="mt-6">
                    <Link
                      to="/booking"
                      className="w-full inline-flex items-center justify-center px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-blue-800 transform hover:scale-105 transition-all duration-300 shadow-lg"
                    >
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
                      </svg>
                      Réserver cette prestation
                    </Link>
                </div>
                </div>
              </div>
            ))}
            </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-r from-orange-500 to-orange-600">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-white mb-6">Besoin d'une intervention urgente ?</h2>
          <p className="text-xl text-orange-100 mb-8 max-w-2xl mx-auto">
            Nos techniciens qualifiés sont disponibles 24h/24 pour vous aider. Contactez-nous dès maintenant !
          </p>
          <div className="flex flex-col sm:flex-row justify-center gap-4">
            <Link
              to="/booking"
              className="inline-flex items-center px-8 py-4 bg-white text-orange-600 font-bold rounded-lg hover:bg-orange-50 transform hover:scale-105 transition-all duration-300 shadow-lg"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
              </svg>
              Réserver maintenant
            </Link>
            <a
              href="tel:+22300000000"
              className="inline-flex items-center px-8 py-4 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-orange-600 transform hover:scale-105 transition-all duration-300"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path>
              </svg>
              Appeler maintenant
            </a>
          </div>
        </div>
      </section>

      {/* Navigation */}
      <section className="py-8 bg-gray-900">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row justify-between items-center">
            <Link
              to="/"
              className="inline-flex items-center text-white hover:text-blue-300 transition-colors mb-4 sm:mb-0"
            >
              <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path>
              </svg>
              Retour à l'accueil
            </Link>
            
            <div className="flex space-x-4">
              <Link
                to="/booking"
                className="inline-flex items-center px-6 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                Réserver un service
              </Link>
              <Link
                to="/services"
                className="inline-flex items-center px-6 py-2 border border-gray-600 text-gray-300 font-medium rounded-lg hover:bg-gray-700 transition-colors"
              >
                Voir tous les services
              </Link>
            </div>
        </div>
      </div>
      </section>
    </div>
  );
};

export default ServiceDetails; 