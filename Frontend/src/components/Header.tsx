import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Menu, X, User, Phone, LogOut, Bell, Check, UserPlus, Plus, Dot, MessageSquare } from 'lucide-react';
import { useAuth, NotificationWS } from '../contexts/AuthContext';
import Logo from './Logo';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

function isRecentlyRead(notif: any) {
  if (!notif.is_read || !notif.read_at) return true;
  const now = new Date();
  const readAt = new Date(notif.read_at);
  const diffMs = now.getTime() - readAt.getTime();
  return diffMs < 5 * 60 * 1000; // 5 minutes en ms
}

function getEventStyle(type: string) {
  const styles: { [key: string]: string } = {
    'request_accepted': 'bg-green-100 text-green-800 border-green-200',
    'request_assigned': 'bg-blue-100 text-blue-800 border-blue-200',
    'technician_assigned': 'bg-blue-100 text-blue-800 border-blue-200',
    'new_request': 'bg-orange-100 text-orange-800 border-orange-200',
    'payment_received': 'bg-green-100 text-green-800 border-green-200',
    'review_received': 'bg-purple-100 text-purple-800 border-purple-200',
    'system': 'bg-gray-100 text-gray-800 border-gray-200',
  };
  return styles[type] || 'bg-gray-100 text-gray-800 border-gray-200';
}

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout, wsNotifications, allNotifications, consumeWsNotification, toast: authToast, unreadMessagesCount } = useAuth();
  const [allNotifs, setAllNotifications] = useState(allNotifications);
  const [toast, setToast] = useState<string | null>(null); // Ajout du state toast local
  const location = useLocation();
  const [notifOpen, setNotifOpen] = useState(false);
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);
  const [deletingNotifications, setDeletingNotifications] = useState<Set<number>>(new Set());
  const [selectedNotification, setSelectedNotification] = useState<any | null>(null);
  const [notificationDetails, setNotificationDetails] = useState<any | null>(null);
  const [senderDetails, setSenderDetails] = useState<any | null>(null);
  const [geoCoords, setGeoCoords] = useState<{ lat: number, lon: number } | null>(null);
  const navigate = useNavigate();
  const [bellAnim, setBellAnim] = useState(false);
  const notifMenuRef = useRef<HTMLDivElement>(null);
  const bellBtnRef = useRef<HTMLButtonElement>(null);
  const [notifMenuPos, setNotifMenuPos] = useState<{ top: number; left: number } | null>(null);
  const unreadCount = allNotifications.filter(n => !n.is_read).length;

  // Handle scroll for transparent header
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Effet pour charger les détails complémentaires si besoin
  useEffect(() => {
    setSenderDetails(null);
    setGeoCoords(null);
    if (selectedNotification && selectedNotification.request) {
      const token = localStorage.getItem('token');
      fetch(`/depannage/api/repair-requests/${selectedNotification.request}/`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          setNotificationDetails(data);
          // Si la demande a un technicien, charger ses infos
          if (data && data.technician) {
            fetch(`/users/api/users/${data.technician}/`, {
              headers: { 'Authorization': `Bearer ${token}` }
            })
              .then(res2 => res2.ok ? res2.json() : null)
              .then(setSenderDetails)
              .catch(() => setSenderDetails(null));
          }
          // Géocodage si pas de coordonnées mais adresse
          if (data && data.address && (!data.latitude || !data.longitude)) {
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(data.address + (data.city ? ', ' + data.city : ''))}`)
              .then(res => res.json())
              .then(results => {
                if (results && results.length > 0) {
                  setGeoCoords({ lat: parseFloat(results[0].lat), lon: parseFloat(results[0].lon) });
                }
              });
          }
        })
        .catch(() => setNotificationDetails(null));
    } else {
      setNotificationDetails(null);
    }
  }, [selectedNotification]);

  // Animation de la cloche à l'arrivée d'une nouvelle notif non lue
  useEffect(() => {
    if (unreadCount > 0) {
      setBellAnim(true);
      const timeout = setTimeout(() => setBellAnim(false), 1200);
      return () => clearTimeout(timeout);
    }
  }, [unreadCount]);

  // Calcul dynamique de la position du menu notifications
  const openNotifMenu = () => {
    if (bellBtnRef.current) {
      const rect = bellBtnRef.current.getBoundingClientRect();
      // Place le menu sous la navbar (top = rect.bottom + 8px), left = aligné avec la cloche
      setNotifMenuPos({
        top: rect.bottom + 8 + window.scrollY, // 8px d'espace
        left: rect.left + window.scrollX,
      });
    }
    setNotifOpen(true);
  };

  // Fermer le menu notifications si on clique en dehors
  useEffect(() => {
    if (!notifOpen) return;
    function handleClickOutside(event: MouseEvent) {
      if (
        notifMenuRef.current &&
        !notifMenuRef.current.contains(event.target as Node) &&
        bellBtnRef.current &&
        !bellBtnRef.current.contains(event.target as Node)
      ) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [notifOpen]);

  const toggleMenu = () => setIsOpen(!isOpen);
  const closeMenu = () => setIsOpen(false);

  const handleMarkAsRead = async (notif: any) => {
    if (notif.is_read) return;
    try {
      // Appel API pour marquer comme lue (seulement si notif.id existe)
      if (notif.id) {
        const token = localStorage.getItem('token');
        await axios.post(`/depannage/api/notifications/${notif.id}/mark_as_read/`, {}, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          }
        });
      }
      // Mise à jour locale (pour toutes les notifications, avec ou sans ID)
      setAllNotifications(prev => prev.map(n =>
        (n.id === notif.id || (!n.id && n.title === notif.title && n.message === notif.message))
          ? { ...n, is_read: true }
          : n
      ));
      setShowUnreadOnly(false); // Optionnel : pour voir la notif disparaître si filtrée
      setToast('Notification marquée comme lue.');
      setTimeout(() => setToast(null), 2000);
    } catch (e) {
      setToast('Erreur lors du marquage.');
      setTimeout(() => setToast(null), 2000);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post('/depannage/api/notifications/mark_all_as_read/', {}, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      // Mettre à jour l'état local
      setAllNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setShowUnreadOnly(false);
      setToast('Toutes les notifications ont été marquées comme lues.');
      setTimeout(() => setToast(null), 2500);
    } catch (e) {
      setToast('Erreur lors du marquage.');
      setTimeout(() => setToast(null), 2500);
    }
  };

  const handleDeleteNotification = async (notif: any) => {
    if (!notif.id) {
      console.log('Notification sans ID, suppression locale uniquement');
      setAllNotifications(prev => prev.filter(n => !(n.title === notif.title && n.message === notif.message)));
      setToast('Notification supprimée.');
      setTimeout(() => setToast(null), 2000);
      return;
    }

    if (deletingNotifications.has(notif.id)) {
      console.log('Suppression déjà en cours pour cette notification');
      return; // Already deleting this notification
    }
    if (!window.confirm('Supprimer cette notification ?')) return;

    console.log('Début de la suppression de la notification ID:', notif.id);
    setDeletingNotifications(prev => new Set(prev).add(notif.id));

    try {
      const token = localStorage.getItem('token');
      console.log('Envoi de la requête DELETE pour ID:', notif.id);
      await axios.delete(`/depannage/api/notifications/${notif.id}/`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        }
      });
      console.log('Suppression réussie pour ID:', notif.id);
      // Supprimer de la liste locale
      setAllNotifications(prev => prev.filter(n => n.id !== notif.id));
      setToast('Notification supprimée.');
      setTimeout(() => setToast(null), 2000);
    } catch (e: any) {
      console.error('Erreur lors de la suppression:', e);
      let msg = 'Erreur lors de la suppression.';
      if (e.response && e.response.data && e.response.data.detail) {
        msg += ' ' + e.response.data.detail;
      }
      setToast(msg);
      setTimeout(() => setToast(null), 4000);
      console.error('Erreur suppression notification:', e);
    } finally {
      setDeletingNotifications(prev => {
        const newSet = new Set(prev);
        newSet.delete(notif.id);
        return newSet;
      });
    }
  };

  // Trie notifications par date décroissante
  const sortedNotifications = [...allNotifications].sort((a, b) => {
    const da = new Date(a.created_at || 0).getTime();
    const db = new Date(b.created_at || 0).getTime();
    return db - da;
  });

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
              {user.user_type === 'admin' && location.pathname !== '/admin/dashboard' && (
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
            <div className="flex items-center space-x-4">
              {/* Cloche de notifications */}
              <div className="relative">
                <button
                  ref={bellBtnRef}
                  onClick={openNotifMenu}
                  className={`relative p-2 rounded-full transition-all duration-200 ${isScrolled ? 'text-gray-800 hover:bg-gray-100' : 'text-white hover:bg-white/20'} ${bellAnim ? 'animate-bounce' : ''}`}
                  title="Notifications"
                >
                  <Bell className="h-5 w-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center font-bold">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Menu des notifications */}
                {notifOpen && notifMenuPos && (
                  <div
                    ref={notifMenuRef}
                    className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-hidden"
                    style={{
                      top: `${notifMenuPos.top}px`,
                      left: `${notifMenuPos.left}px`,
                    }}
                  >
                    <div className="p-4 border-b border-gray-200">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900">Notifications</h3>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => setShowUnreadOnly(!showUnreadOnly)}
                            className={`text-xs px-2 py-1 rounded ${showUnreadOnly ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}
                          >
                            {showUnreadOnly ? 'Tout voir' : 'Non lues'}
                          </button>
                          {unreadCount > 0 && (
                            <button
                              onClick={handleMarkAllAsRead}
                              className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded hover:bg-green-200"
                            >
                              Tout marquer lu
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="max-h-64 overflow-y-auto">
                      {sortedNotifications
                        .filter(notif => !showUnreadOnly || !notif.is_read)
                        .slice(0, 10)
                        .map((notif, index) => (
                          <div
                            key={notif.id || index}
                            className={`p-3 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${!notif.is_read ? 'bg-blue-50' : ''}`}
                            onClick={() => setSelectedNotification(notif)}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center space-x-2 mb-1">
                                  <div className={`w-2 h-2 rounded-full ${notif.is_read ? 'bg-gray-300' : 'bg-blue-500'}`}></div>
                                  <span className="text-sm font-medium text-gray-900 truncate">
                                    {notif.title}
                                  </span>
                                </div>
                                <p className="text-xs text-gray-600 line-clamp-2">{notif.message}</p>
                                <div className="flex items-center justify-between mt-2">
                                  <span className="text-xs text-gray-400">
                                    {notif.created_at ? new Date(notif.created_at).toLocaleString('fr-FR', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    }) : ''}
                                  </span>
                                  <div className="flex items-center space-x-1">
                                    {!notif.is_read && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleMarkAsRead(notif);
                                        }}
                                        className="text-xs text-blue-600 hover:text-blue-800"
                                      >
                                        Marquer lu
                                      </button>
                                    )}
                                    {notif.id && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteNotification(notif);
                                        }}
                                        className="text-xs text-red-600 hover:text-red-800"
                                        disabled={deletingNotifications.has(notif.id)}
                                      >
                                        {deletingNotifications.has(notif.id) ? '...' : 'Supprimer'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                    </div>

                    {sortedNotifications.length === 0 && (
                      <div className="p-4 text-center text-gray-500">
                        Aucune notification
                      </div>
                    )}

                    {sortedNotifications.length > 10 && (
                      <div className="p-3 border-t border-gray-200 text-center">
                        <button
                          onClick={() => setNotifOpen(false)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Voir toutes les notifications
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Menu utilisateur */}
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

      {toast && (
        <div className="fixed top-4 right-4 bg-green-600 text-white px-4 py-2 rounded shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      {/* Modale de détail notification */}
      {selectedNotification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40" onClick={() => setSelectedNotification(null)}>
          <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md relative" onClick={e => e.stopPropagation()}>
            <button className="absolute top-2 right-2 text-gray-500 hover:text-gray-800" onClick={() => setSelectedNotification(null)}>✕</button>

            {/* Badge type notification */}
            <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mb-3
              ${selectedNotification.type === 'request_accepted' ? 'bg-green-100 text-green-700' :
                selectedNotification.type === 'request_assigned' || selectedNotification.type === 'technician_assigned' ? 'bg-blue-100 text-blue-700 border border-blue-400' :
                  selectedNotification.type === 'new_request' ? 'bg-orange-100 text-orange-700' :
                    'bg-gray-200 text-gray-700'
              }`}>
              {selectedNotification.type.replace(/_/g, ' ')}
              {['technician_assigned', 'request_assigned'].includes(selectedNotification.type) && (
                <span className="ml-2 inline-block bg-blue-600 text-white px-2 py-0.5 rounded-full text-[10px] align-middle">Important</span>
              )}
            </div>

            <h2 className="text-lg font-bold mb-2">{selectedNotification.title}</h2>
            <div className="text-sm text-gray-700 mb-2">{selectedNotification.message}</div>
            <div className="text-xs text-gray-400 mb-2">{selectedNotification.created_at ? new Date(selectedNotification.created_at).toLocaleString('fr-FR') : ''}</div>

            {/* Actions rapides */}
            <div className="flex gap-2 mb-4">
              {/* Voir la demande */}
              {notificationDetails && notificationDetails.id &&
                (['technician_assigned', 'request_assigned'].includes(selectedNotification.type)) && (
                  <button
                    className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                    onClick={() => {
                      setSelectedNotification(null);
                      navigate(`/requests/${notificationDetails.id}`);
                    }}
                  >
                    Voir la demande
                  </button>
                )}
              {/* Contacter (téléphone ou email) */}
              {user && user.user_type === 'technician' && notificationDetails && notificationDetails.client_phone && (
                <a
                  href={`tel:${notificationDetails.client_phone}`}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                >
                  Appeler le client
                </a>
              )}
              {user && user.user_type === 'client' && senderDetails && senderDetails.phone_number && (
                <a
                  href={`tel:${senderDetails.phone_number}`}
                  className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                >
                  Appeler le technicien
                </a>
              )}
              {user && user.user_type === 'admin' && senderDetails && senderDetails.email && (
                <a
                  href={`mailto:${senderDetails.email}`}
                  className="px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                >
                  Envoyer un mail
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;