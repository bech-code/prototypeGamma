import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X, User, Phone, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import Logo from './Logo';

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();

  // Handle scroll for transparent header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  return (
    <header className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-white shadow-md py-2' : 'bg-transparent py-4'
      }`}>
      <div className="container mx-auto px-4 flex justify-between items-center">
        <Link to="/" className="flex items-center">
          <Logo className={isScrolled ? 'text-primary-700' : 'text-white'} />
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-8">
          {(!user || (user.user_type !== 'admin' && user.user_type !== 'technician')) && (
            <Link
              to="/"
              className={`font-medium transition-colors ${location.pathname === '/'
                ? 'text-orange-500'
                : isScrolled ? 'text-gray-800 hover:text-orange-500' : 'text-white hover:text-orange-300'
                }`}
            >
              Accueil
            </Link>
          )}
          {user && (
            <>
              <Link
                to={user.user_type === 'technician' ? '/technician/dashboard' : user.user_type === 'admin' ? '/admin/dashboard' : '/dashboard'}
                className={`font-medium transition-colors ${location.pathname === '/dashboard' || location.pathname === '/technician/dashboard' || location.pathname === '/admin/dashboard'
                  ? 'text-orange-500'
                  : isScrolled ? 'text-gray-800 hover:text-orange-500' : 'text-white hover:text-orange-300'
                  }`}
              >
                Dashboard
              </Link>
              {user.user_type === 'client' && (
                <Link
                  to="/booking"
                  className={`font-medium transition-colors ${location.pathname === '/booking'
                    ? 'text-orange-500'
                    : isScrolled ? 'text-gray-800 hover:text-orange-500' : 'text-white hover:text-orange-300'
                    }`}
                >
                  Réserver un service
                </Link>
              )}
              {user.user_type === 'technician' && (
                <Link
                  to="/technician"
                  className={`font-medium transition-colors ${location.pathname === '/technician'
                    ? 'text-orange-500'
                    : isScrolled ? 'text-gray-800 hover:text-orange-500' : 'text-white hover:text-orange-300'
                    }`}
                >
                  Portail Technicien
                </Link>
              )}
              {user.user_type === 'admin' && (
                <Link
                  to="/admin"
                  className={`font-medium transition-colors ${location.pathname === '/admin'
                    ? 'text-orange-500'
                    : isScrolled ? 'text-gray-800 hover:text-orange-500' : 'text-white hover:text-orange-300'
                    }`}
                >
                  Portail Admin
                </Link>
              )}
              {user.user_type === 'admin' && (
                <Link
                  to="/admin/statistics"
                  className={`font-medium transition-colors ${location.pathname === '/admin/statistics'
                    ? 'text-orange-500'
                    : isScrolled ? 'text-gray-800 hover:text-orange-500' : 'text-white hover:text-orange-300'
                    }`}
                >
                  Voir les statistiques
                </Link>
              )}
            </>
          )}

          {user ? (
            <div className="relative group">
              <button className={`flex items-center font-medium transition-colors ${isScrolled ? 'text-gray-800' : 'text-white'
                }`}>
                <User className="w-4 h-4 mr-1" />
                {user.username || 'Compte'}
              </button>
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-md shadow-lg overflow-hidden scale-0 group-hover:scale-100 transition-transform origin-top-right z-50">
                <Link to={user.user_type === 'technician' ? '/technician/dashboard' : user.user_type === 'admin' ? '/admin/dashboard' : '/dashboard'} className="block px-4 py-2 text-gray-800 hover:bg-gray-100">Tableau de Bord</Link>
                <Link to="/profile" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">Profil</Link>
                {user.user_type === 'technician' &&
                  <Link to="/technician" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">Portail Technicien</Link>
                }
                {user.user_type === 'admin' &&
                  <Link to="/admin" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">Portail Admin</Link>
                }
                {user.user_type === 'admin' &&
                  <Link to="/admin/statistics" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">Voir les statistiques</Link>
                }
                <button
                  onClick={logout}
                  className="w-full text-left block px-4 py-2 text-red-600 hover:bg-gray-100"
                >
                  Déconnexion
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-4">
              <Link
                to="/login"
                className={`font-medium transition-colors ${isScrolled ? 'text-gray-800 hover:text-orange-500' : 'text-white hover:text-orange-300'
                  }`}
              >
                Connexion
              </Link>
              <Link
                to="/register"
                className="bg-orange-500 hover:bg-orange-600 text-white px-4 py-2 rounded-md font-medium transition-colors"
              >
                Inscription
              </Link>
            </div>
          )}

          <a
            href="tel:+223 20 23 33 43"
            className={`flex items-center font-medium ${isScrolled ? 'text-blue-700' : 'text-white'
              }`}
          >
            <Phone className="w-4 h-4 mr-2" />
            +223 20 23 33 43
          </a>
        </nav>

        {/* Mobile menu button */}
        <button
          className="md:hidden text-gray-800"
          onClick={toggleMenu}
          aria-label={isOpen ? "Fermer le menu" : "Ouvrir le menu"}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} className={isScrolled ? 'text-gray-800' : 'text-white'} />}
        </button>
      </div>

      {/* Mobile Navigation */}
      {isOpen && (
        <div className="md:hidden bg-white absolute top-full left-0 w-full shadow-lg">
          <div className="container mx-auto px-4 py-3 flex flex-col space-y-4">
            {(!user || (user.user_type !== 'admin' && user.user_type !== 'technician')) && (
              <Link to="/" className="py-2 font-medium" onClick={closeMenu}>Accueil</Link>
            )}
            {user && (
              <>
                <Link to={user.user_type === 'technician' ? '/technician/dashboard' : user.user_type === 'admin' ? '/admin/dashboard' : '/dashboard'} className="py-2 font-medium" onClick={closeMenu}>
                  Tableau de Bord
                </Link>
                <Link to="/profile" className="py-2 font-medium" onClick={closeMenu}>
                  Profil
                </Link>
                {user.user_type === 'client' && (
                  <Link to="/booking" className="py-2 font-medium" onClick={closeMenu}>
                    Réserver un service
                  </Link>
                )}
                {user.user_type === 'technician' && (
                  <Link to="/technician" className="py-2 font-medium" onClick={closeMenu}>
                    Portail Technicien
                  </Link>
                )}
                {user.user_type === 'admin' && (
                  <Link to="/admin" className="py-2 font-medium" onClick={closeMenu}>
                    Portail Admin
                  </Link>
                )}
                {user.user_type === 'admin' && (
                  <Link to="/admin/statistics" className="py-2 font-medium" onClick={closeMenu}>Voir les statistiques</Link>
                )}
                <button
                  onClick={() => {
                    logout();
                    closeMenu();
                  }}
                  className="flex items-center py-2 font-medium text-red-600"
                >
                  <LogOut className="w-4 h-4 mr-2" /> Déconnexion
                </button>
              </>
            )}

            <a href="tel:+33123456789" className="flex items-center py-2 font-medium text-blue-700">
              <Phone className="w-4 h-4 mr-2" /> +223 20 23 33 43
            </a>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;