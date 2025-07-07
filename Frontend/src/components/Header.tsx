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

// Fonction utilitaire pour style et icône timeline
function getEventStyle(type) {
  switch (type) {
    case 'created': return { color: 'bg-gray-400', icon: <Plus size={14} /> };
    case 'request_assigned': return { color: 'bg-blue-500', icon: <UserPlus size={14} /> };
    case 'request_accepted': return { color: 'bg-green-500', icon: <Check size={14} /> };
    case 'closed': return { color: 'bg-red-500', icon: <X size={14} /> };
    default: return { color: 'bg-gray-300', icon: <Dot size={14} /> };
  }
}

const Header: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const { user, logout, wsNotifications, allNotifications, consumeWsNotification, toast, unreadMessagesCount } = useAuth();
  const [allNotifs, setAllNotifications] = useState(allNotifications);
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
    console.log('Tentative de suppression de notification:', notif);
    // Si pas d'ID, c'est une notification WebSocket - on la supprime juste localement
    if (!notif.id) {
      console.log('Notification WebSocket détectée (pas d\'ID)');
      if (!window.confirm('Supprimer cette notification ?')) return;
      setAllNotifications(prev => prev.filter(n =>
        !(n.title === notif.title && n.message === notif.message && !n.id)
      ));
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

          {user && (
            <div className="relative flex items-center space-x-4">
              {/* Badge messages non lus */}
              {unreadMessagesCount > 0 && (
                <Link
                  to="/chat"
                  className="relative flex items-center focus:outline-none hover:opacity-80 transition-opacity"
                  aria-label="Messages non lus"
                >
                  <MessageSquare className={isScrolled ? 'text-gray-800' : 'text-white'} />
                  <span className="absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] flex items-center justify-center">
                    {unreadMessagesCount}
                  </span>
                </Link>
              )}

              {/* Notifications */}
              <button
                ref={bellBtnRef}
                className={`relative flex items-center focus:outline-none group ${bellAnim ? 'animate-bounce' : ''}`}
                onClick={openNotifMenu}
                aria-label="Notifications"
                tabIndex={0}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') openNotifMenu(); }}
              >
                <span className="relative">
                  <Bell className={`${isScrolled ? 'text-gray-800' : 'text-white'} group-hover:text-orange-500 transition-colors duration-200`} size={26} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex items-center justify-center w-6 h-6 bg-gradient-to-tr from-pink-500 via-red-500 to-yellow-500 text-white text-xs font-bold rounded-full shadow-lg ring-2 ring-white animate-pulse select-none">
                      {unreadCount}
                    </span>
                  )}
                </span>
              </button>
              {notifOpen && notifMenuPos && (
                <div
                  ref={notifMenuRef}
                  className="fixed z-50 w-80 max-w-xs bg-white/80 backdrop-blur-lg rounded-2xl shadow-2xl max-h-96 overflow-y-auto animate-fade-in-up border border-gray-100 ring-1 ring-black/10"
                  style={{ top: notifMenuPos.top, left: notifMenuPos.left, minWidth: '320px' }}
                >
                  <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg rounded-t-2xl p-4 border-b font-bold text-gray-700 flex items-center justify-between shadow-sm">
                    Notifications
                    <button className="text-xs text-blue-600 hover:underline focus:outline-none" onClick={() => setNotifOpen(false)}>Fermer</button>
                  </div>
                  <div className="px-4 py-2 flex items-center gap-2 border-b justify-between bg-white/70 sticky top-[56px] z-10">
                    <label className="flex items-center text-sm cursor-pointer">
                      <input type="checkbox" checked={showUnreadOnly} onChange={e => setShowUnreadOnly(e.target.checked)} className="mr-2 focus:ring focus:ring-blue-300" />
                      Non lues seulement
                    </label>
                    <button className="text-xs text-blue-600 hover:underline ml-auto focus:outline-none" onClick={handleMarkAllAsRead} disabled={allNotifications.every(n => n.is_read)}>
                      Tout marquer comme lu
                    </button>
                  </div>
                  {sortedNotifications.length === 0 ? (
                    <div className="p-6 text-gray-500 text-sm text-center">Aucune notification</div>
                  ) : (
                    <ul className="divide-y divide-gray-100 scrollbar-thin scrollbar-thumb-blue-200 scrollbar-track-transparent">
                      {(showUnreadOnly
                        ? sortedNotifications.filter(n => !n.is_read)
                        : sortedNotifications.filter(isRecentlyRead)
                      ).map((notif: any, i) => (
                        <li
                          key={notif.id || i}
                          className={`px-5 py-4 flex gap-3 items-start transition-all duration-200 cursor-pointer group bg-white/60 hover:bg-orange-50/80 rounded-xl my-2 shadow-sm hover:shadow-lg ${!notif.is_read ? 'border-l-4 border-blue-500' : ''}`}
                          onClick={() => setSelectedNotification(notif)}
                          tabIndex={0}
                          onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setSelectedNotification(notif); }}
                          aria-label={notif.title}
                        >
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-semibold text-gray-900 text-sm line-clamp-1">{notif.title}</span>
                              {!notif.is_read && <span className="inline-block w-2.5 h-2.5 bg-blue-600 rounded-full animate-pulse shadow ring-2 ring-blue-200" title="Non lue"></span>}
                            </div>
                            <div className="text-gray-700 text-xs line-clamp-2 mb-1">{notif.message}</div>
                            <div className="text-xs text-gray-400 mt-1">{notif.created_at ? new Date(notif.created_at).toLocaleString('fr-FR') : ''}</div>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
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