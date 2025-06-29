import React from 'react';
import { Link } from 'react-router-dom';
import { PhoneCall, Mail, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import Logo from './Logo';

const Footer: React.FC = () => {
  return (
    <footer className="bg-blue-900 text-white">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div>
            <div className="mb-4">
              <Logo className="text-white" />
            </div>
            <p className="mb-4 text-blue-200">
              Services de réparation professionnels disponibles 24/7. Nos techniciens experts sont prêts à vous aider pour toute urgence.
            </p>
            <div className="flex space-x-4">
              <a href="https://facebook.com" className="text-blue-200 hover:text-white transition-colors">
                <Facebook size={20} />
              </a>
              <a href="https://twitter.com" className="text-blue-200 hover:text-white transition-colors">
                <Twitter size={20} />
              </a>
              <a href="https://instagram.com" className="text-blue-200 hover:text-white transition-colors">
                <Instagram size={20} />
              </a>
              <a href="https://linkedin.com" className="text-blue-200 hover:text-white transition-colors">
                <Linkedin size={20} />
              </a>
            </div>
          </div>
          
          {/* Services */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Nos Services</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/service/plumbing" className="text-blue-200 hover:text-white transition-colors">
                  Services de Plomberie
                </Link>
              </li>
              <li>
                <Link to="/service/electrical" className="text-blue-200 hover:text-white transition-colors">
                  Réparations Électriques
                </Link>
              </li>
              <li>
                <Link to="/service/locksmith" className="text-blue-200 hover:text-white transition-colors">
                  Services de Serrurerie
                </Link>
              </li>
              <li>
                <Link to="/service/it-support" className="text-blue-200 hover:text-white transition-colors">
                  Support Informatique
                </Link>
              </li>
              <li>
                <Link to="/service/heating" className="text-blue-200 hover:text-white transition-colors">
                  Chauffage & Climatisation
                </Link>
              </li>
              <li>
                <Link to="/service/appliances" className="text-blue-200 hover:text-white transition-colors">
                  Réparation d'Électroménagers
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Liens Rapides</h3>
            <ul className="space-y-2">
              <li>
                <Link to="/about" className="text-blue-200 hover:text-white transition-colors">
                  À Propos
                </Link>
              </li>
              <li>
                <Link to="/booking" className="text-blue-200 hover:text-white transition-colors">
                  Réserver un Service
                </Link>
              </li>
              <li>
                <Link to="/pricing" className="text-blue-200 hover:text-white transition-colors">
                  Tarifs
                </Link>
              </li>
              <li>
                <Link to="/blog" className="text-blue-200 hover:text-white transition-colors">
                  Blog
                </Link>
              </li>
              <li>
                <Link to="/careers" className="text-blue-200 hover:text-white transition-colors">
                  Carrières
                </Link>
              </li>
              <li>
                <Link to="/contact" className="text-blue-200 hover:text-white transition-colors">
                  Contactez-Nous
                </Link>
              </li>
            </ul>
          </div>
          
          {/* Contact Info */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Contactez-Nous</h3>
            <ul className="space-y-4">
              <li className="flex items-start">
                <PhoneCall className="w-5 h-5 mr-3 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Appelez-nous 24/7</p>
                  <a href="tel:+33123456789" className="text-blue-200 hover:text-white transition-colors">
                  +223 20 23 33 43
                  </a>
                </div>
              </li>
              <li className="flex items-start">
                <Mail className="w-5 h-5 mr-3 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Écrivez-nous</p>
                  <a href="mailto:contact@repairpro.com" className="text-blue-200 hover:text-white transition-colors">
                    contact@DepanneTeliman.com
                  </a>
                </div>
              </li>
              <li className="flex items-start">
                <MapPin className="w-5 h-5 mr-3 text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium">Notre bureau</p>
                  <address className="not-italic text-blue-200">
                    Hamdallaye Aci 2000<br />
                    Bamako, Mali
                  </address>
                </div>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-blue-800 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center">
          <p className="text-blue-300 text-sm mb-4 md:mb-0">
            &copy; {new Date().getFullYear()} DepanneTeliman. Tous droits réservés.
          </p>
          <div className="flex space-x-6">
            <Link to="/privacy" className="text-blue-300 hover:text-white text-sm transition-colors">
              Politique de Confidentialité
            </Link>
            <Link to="/terms" className="text-blue-300 hover:text-white text-sm transition-colors">
              Conditions d'Utilisation
            </Link>
            <Link to="/sitemap" className="text-blue-300 hover:text-white text-sm transition-colors">
              Plan du Site
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;