import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { User, Profile } from '../types/user';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
dayjs.extend(relativeTime);

export type AuthContextType = {
  user: User | null;
  token: string | null;
  profile: Profile | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refreshToken: () => Promise<boolean>;
  updateUserProfile: (data: { first_name?: string; last_name?: string; phone?: string }) => Promise<any>;
  fetchUser: () => Promise<void>;
  verifyOtp: (otp: string) => Promise<void>;
  otpRequired: boolean;
  otpToken: string | null;
  pendingEmail: string | null;
  wsNotifications: NotificationWS[];
  allNotifications: NotificationWS[];
  consumeWsNotification: () => void;
};

interface RegisterData {
  username: string;
  email: string;
  password: string;
  password2: string;
  user_type: 'technician' | 'client' | 'admin';
  phone_number: string;
  address: string;
  first_name: string;
  last_name: string;
  specialty?: string;
  years_experience?: number;
  phone?: string;
}

export const AuthContext = React.createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
axios.defaults.baseURL = 'http://127.0.0.1:8000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Variable pour éviter les boucles de refresh
let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: any) => void;
  reject: (error?: any) => void;
}> = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });

  failedQueue = [];
};

const getAccounts = () => {
  try {
    return JSON.parse(localStorage.getItem('accounts') || '[]');
  } catch {
    return [];
  }
};

const saveAccounts = (accounts: any[]) => {
  localStorage.setItem('accounts', JSON.stringify(accounts));
};

const updateAccounts = (email: string, name?: string, refreshToken?: string) => {
  let accounts = getAccounts();
  const now = Date.now();
  // Supprimer doublons
  accounts = accounts.filter((acc: any) => acc.email !== email);
  accounts.unshift({ email, name, lastUsed: now, refreshToken });
  saveAccounts(accounts);
};

const removeAccount = (email: string) => {
  let accounts = getAccounts();
  accounts = accounts.filter((acc: any) => acc.email !== email);
  saveAccounts(accounts);
};

const ReauthModal: React.FC<{
  show: boolean;
  onClose: () => void;
  onSuccess: (newUserEmail: string) => void;
  currentUserEmail?: string | null;
}> = ({ show, onClose, onSuccess, currentUserEmail }) => {
  const [email, setEmail] = useState(currentUserEmail || '');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);

  useEffect(() => {
    setEmail(currentUserEmail || '');
    setPassword('');
    setError(null);
    setAccounts(getAccounts());
  }, [show, currentUserEmail]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/users/login/', { email, password });
      if (!response.data) throw new Error('Empty response from server');
      const { access, refresh, user } = response.data;
      if (!access) throw new Error('Invalid login response format');
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      updateAccounts(email, user?.first_name || user?.username || undefined, refresh);
      setAccounts(getAccounts());
      setEmail('');
      setPassword('');
      setError(null);
      onSuccess(email);
    } catch (err: any) {
      if (axios.isAxiosError(err)) {
        if (err.response?.status === 401) {
          setError('Email ou mot de passe incorrect');
        } else if (err.response?.status === 400) {
          setError(err.response?.data?.detail || err.response?.data?.message || 'Données invalides');
        } else {
          setError(`Erreur serveur: ${err.response?.status || 'Inconnue'}`);
        }
      } else if (err instanceof Error) {
        setError(err.message || 'Erreur de connexion');
      } else {
        setError('Erreur de connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAccountClick = async (acc: any) => {
    setError(null);
    setPassword('');
    setEmail(acc.email);
    if (acc.refreshToken) {
      setLoading(true);
      try {
        const response = await axios.post('http://127.0.0.1:8000/users/token/refresh/', { refresh: acc.refreshToken });
        const { access } = response.data;
        if (access) {
          localStorage.setItem('token', access);
          localStorage.setItem('refreshToken', acc.refreshToken);
          axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
          updateAccounts(acc.email, acc.name, acc.refreshToken);
          setAccounts(getAccounts());
          setLoading(false);
          setEmail('');
          setPassword('');
          setError(null);
          onSuccess(acc.email);
          return;
        }
      } catch (err) {
        // Si le refresh échoue, on laisse l'utilisateur saisir le mot de passe
        setError('Session expirée pour ce compte, veuillez saisir le mot de passe.');
      } finally {
        setLoading(false);
      }
    }
  };
  const handleRemoveAccount = (acc: any) => {
    removeAccount(acc.email);
    setAccounts(getAccounts());
    if (email === acc.email) setEmail('');
  };

  const getInitials = (name: string, email: string) => {
    if (name) {
      const parts = name.trim().split(' ');
      if (parts.length === 1) return parts[0][0].toUpperCase();
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return email[0].toUpperCase();
  };

  if (!show) return null;
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'rgba(0,0,0,0.4)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: 'white', padding: '2rem', borderRadius: '8px', minWidth: '320px', boxShadow: '0 2px 16px #0002', textAlign: 'center' }}>
        <h2 style={{ color: '#ef4444', marginBottom: '1rem' }}>Session expirée</h2>
        <p style={{ marginBottom: '1rem' }}>Veuillez vous reconnecter pour continuer.<br />Vous pouvez aussi vous connecter avec un autre compte.</p>
        {accounts.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Comptes utilisés récemment :</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
              {accounts.map(acc => (
                <div key={acc.email} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#f3f4f6', borderRadius: '4px', padding: '0.25rem 0.5rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={() => handleAccountClick(acc)}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#2563eb', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: 16 }}>{getInitials(acc.name, acc.email)}</div>
                    <div style={{ textAlign: 'left' }}>
                      <div style={{ fontWeight: 'bold', fontSize: 14 }}>{acc.name || acc.email}</div>
                      <div style={{ fontSize: 12, color: '#555' }}>{acc.email}</div>
                      <div style={{ fontSize: 11, color: '#888' }}>{dayjs(acc.lastUsed).fromNow()}</div>
                    </div>
                  </div>
                  <button onClick={() => handleRemoveAccount(acc)} style={{ background: 'none', border: 'none', color: '#ef4444', fontWeight: 'bold', cursor: 'pointer', fontSize: 18 }}>×</button>
                </div>
              ))}
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit}>
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem' }} />
          <input type="password" placeholder="Mot de passe" value={password} onChange={e => setPassword(e.target.value)} required style={{ width: '100%', marginBottom: '0.5rem', padding: '0.5rem' }} />
          <button type="submit" disabled={loading} style={{ width: '100%', background: '#2563eb', color: 'white', padding: '0.5rem', border: 'none', borderRadius: '4px', fontWeight: 'bold', marginBottom: '0.5rem' }}>
            {loading ? 'Connexion...' : 'Se reconnecter'}
          </button>
        </form>
        {error && <div style={{ color: '#ef4444', marginBottom: '0.5rem' }}>{error}</div>}
        <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <button onClick={() => window.location.href = '/register'} style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '4px', padding: '0.5rem', fontWeight: 'bold', cursor: 'pointer' }}>Créer un compte</button>
          <button onClick={() => window.location.href = '/reset-password'} style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer' }}>Mot de passe oublié&nbsp;?</button>
        </div>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#2563eb', textDecoration: 'underline', cursor: 'pointer', marginTop: '1rem' }}>Annuler</button>
      </div>
    </div>
  );
};

export type NotificationWS = {
  id?: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read?: boolean;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const inactivityTimeout = useRef<NodeJS.Timeout | null>(null);
  const warningTimeout = useRef<NodeJS.Timeout | null>(null);
  const [showWarning, setShowWarning] = useState(false);
  const isInitialized = useRef(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [showReauthModal, setShowReauthModal] = useState(false);
  const [otpRequired, setOtpRequired] = useState(false);
  const [otpToken, setOtpToken] = useState<string | null>(null);
  const [pendingEmail, setPendingEmail] = useState<string | null>(null);
  const [wsNotifications, setWsNotifications] = useState<NotificationWS[]>([]);
  const [allNotifications, setAllNotifications] = useState<NotificationWS[]>([]);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize token from localStorage
  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    if (storedToken) {
      setToken(storedToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${storedToken}`;
    }
  }, []);

  // Initialize auth when token changes
  useEffect(() => {
    const initializeAuth = async () => {
      if (token && !isInitialized.current) {
        try {
          const response = await axios.get('/users/me/', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data && response.status === 200) {
            let userData = response.data.user;
            if (userData.user_type === 'technician' && response.data.user.technician) {
              userData = { ...userData, technician: response.data.user.technician };
            }
            setUser(userData);
            setProfile(response.data.profile);
            isInitialized.current = true;
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);

          // Essayer de rafraîchir le token
          const refreshSuccess = await refreshToken();
          if (!refreshSuccess) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            setToken(null);
            setUser(null);
            setProfile(null);
            isInitialized.current = false;
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  useEffect(() => {
    // Intercepteur pour refresh automatique des tokens (doit être dans le scope du provider pour accéder à setSessionExpired)
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          console.log('Token expiré détecté, tentative de refresh...');

          if (isRefreshing) {
            console.log('Refresh déjà en cours, ajout à la queue...');
            return new Promise((resolve, reject) => {
              failedQueue.push({ resolve, reject });
            }).then(token => {
              originalRequest.headers['Authorization'] = `Bearer ${token}`;
              return axios(originalRequest);
            }).catch(err => {
              console.error('Erreur dans la queue de refresh:', err);
              return Promise.reject(err);
            });
          }

          originalRequest._retry = true;
          isRefreshing = true;

          try {
            const refreshToken = localStorage.getItem('refreshToken');
            if (!refreshToken) {
              console.error('Aucun refresh token disponible');
              throw new Error('No refresh token available');
            }

            console.log('Tentative de refresh du token...');
            const response = await axios.post('/users/token/refresh/', {
              refresh: refreshToken
            });

            const { access } = response.data;
            console.log('Token refresh réussi');
            localStorage.setItem('token', access);
            axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

            processQueue(null, access);
            originalRequest.headers['Authorization'] = `Bearer ${access}`;

            return axios(originalRequest);
          } catch (refreshError) {
            console.error('Échec du refresh token:', refreshError);
            processQueue(refreshError, null);

            // Refresh token expiré, déconnexion propre
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            delete axios.defaults.headers.common['Authorization'];

            // Afficher un message d'expiration de session
            setSessionExpired(true);
            // Redirection après 2 secondes
            setTimeout(() => {
              setSessionExpired(false);
              if (window.location.pathname !== '/login') {
                window.location.href = '/login';
              }
            }, 2000);

            setShowReauthModal(true);
            return Promise.reject(refreshError);
          } finally {
            isRefreshing = false;
          }
        }
        // Log des autres erreurs pour debugging
        if (error.response?.status >= 400) {
          console.error('Erreur API:', {
            status: error.response.status,
            url: error.config?.url,
            method: error.config?.method,
            data: error.response.data
          });

          // Centraliser l'affichage des erreurs d'authentification
          if (error.response?.data?.detail) {
            setError(error.response.data.detail);
          } else if (error.response?.data?.message) {
            setError(error.response.data.message);
          }
        }
        return Promise.reject(error);
      }
    );
    return () => { axios.interceptors.response.eject(interceptor); };
  }, []);

  const refreshToken = async (): Promise<boolean> => {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) {
        return false;
      }

      const response = await axios.post('/users/token/refresh/', {
        refresh: refreshToken
      });

      const { access } = response.data;
      localStorage.setItem('token', access);
      setToken(access);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      return true;
    } catch (error) {
      console.error('Token refresh failed:', error);
      return false;
    }
  };

  const verifyOtp = async (otp: string) => {
    setLoading(true);
    setError(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/users/verify_otp/', {
        email: pendingEmail,
        otp,
        otp_token: otpToken,
      });
      const { access, refresh } = response.data;
      if (!access) throw new Error('OTP: Réponse invalide du serveur');
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      const meResponse = await axios.get('http://127.0.0.1:8000/users/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });
      if (meResponse.data && meResponse.status === 200) {
        const { user: userData, profile: profileData } = meResponse.data;
        setToken(access);
        setUser(userData);
        setProfile(profileData);
        isInitialized.current = true;
        setOtpRequired(false);
        setOtpToken(null);
        setPendingEmail(null);
        if (
          (!userData.client || !userData.client.phone) &&
          (!userData.technician || !userData.technician.phone)
        ) {
          window.location.href = '/profile';
        }
      } else {
        throw new Error('Impossible de récupérer les données utilisateur après OTP');
      }
    } catch (error: unknown) {
      setError('Code OTP invalide ou expiré');
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    setOtpRequired(false);
    setOtpToken(null);
    setPendingEmail(null);
    try {
      const response = await axios.post('http://127.0.0.1:8000/users/login/', {
        email,
        password
      });
      if (!response.data) {
        throw new Error('Empty response from server');
      }
      if (response.data.otp_required) {
        setOtpRequired(true);
        setOtpToken(response.data.otp_token);
        setPendingEmail(email);
        return; // Arrêter ici, attendre la saisie OTP côté UI
      }
      const { access, refresh } = response.data;
      if (!access) {
        throw new Error('Invalid login response format');
      }
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
      const meResponse = await axios.get('http://127.0.0.1:8000/users/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });
      if (meResponse.data && meResponse.status === 200) {
        const { user: userData, profile: profileData } = meResponse.data;
        setToken(access);
        setUser(userData);
        setProfile(profileData);
        isInitialized.current = true;
        if (
          (!userData.client || !userData.client.phone) &&
          (!userData.technician || !userData.technician.phone)
        ) {
          window.location.href = '/profile';
        }
        console.log('Login réussi avec données utilisateur:', userData);
      } else {
        throw new Error('Impossible de récupérer les données utilisateur');
      }
    } catch (error: unknown) {
      console.error('Login error:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          setError('Email ou mot de passe incorrect');
        } else if (error.response?.status === 400) {
          const message = error.response?.data?.detail ||
            error.response?.data?.message ||
            'Données invalides';
          setError(message);
        } else {
          setError(`Erreur serveur: ${error.response?.status || 'Inconnue'}`);
        }
      } else if (error instanceof Error) {
        setError(error.message || 'Échec de la connexion');
      } else {
        setError('Échec de la connexion');
      }
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData: RegisterData) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/users/register/', userData);

      if (!response.data) {
        throw new Error('Empty response from server');
      }

      const { access, refresh } = response.data;

      if (!access) {
        throw new Error('Invalid registration response format');
      }

      // Stocker les tokens
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);

      // Configurer axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

      // Récupérer les données utilisateur complètes via /users/me/
      const meResponse = await axios.get('http://127.0.0.1:8000/users/me/', {
        headers: { Authorization: `Bearer ${access}` }
      });

      if (meResponse.data && meResponse.status === 200) {
        const { user: newUser, profile: profileData } = meResponse.data;

        // Mettre à jour l'état avec les données complètes
        setToken(access);
        setUser(newUser);
        setProfile(profileData);
        isInitialized.current = true;

        console.log('Inscription réussie avec données utilisateur:', newUser);
      } else {
        throw new Error('Impossible de récupérer les données utilisateur');
      }
    } catch (error: unknown) {
      console.error('Registration error:', error);

      if (axios.isAxiosError(error)) {
        if (error.response?.status === 400) {
          const details = error.response?.data?.details;
          if (details) {
            const errorMessages = Object.values(details).filter(Boolean);
            setError(errorMessages.join(', '));
          } else {
            const message = error.response?.data?.detail ||
              error.response?.data?.message ||
              'Données invalides';
            setError(message);
          }
        } else {
          setError(`Erreur serveur: ${error.response?.status || 'Inconnue'}`);
        }
      } else if (error instanceof Error) {
        setError(error.message || 'Échec de l\'inscription');
      } else {
        setError('Échec de l\'inscription');
      }

      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    delete axios.defaults.headers.common['Authorization'];
    setToken(null);
    setUser(null);
    setProfile(null);
    setError(null);
    isInitialized.current = false;

    // Nettoyer les timers
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    if (warningTimeout.current) {
      clearTimeout(warningTimeout.current);
    }
    setShowWarning(false);
  };

  const clearError = () => {
    setError(null);
  };

  // Fonction pour déconnecter après inactivité (20 minutes)
  const startInactivityTimer = () => {
    if (inactivityTimeout.current) {
      clearTimeout(inactivityTimeout.current);
    }
    if (warningTimeout.current) {
      clearTimeout(warningTimeout.current);
    }
    setShowWarning(false);
    // Timer d'avertissement à 19min30 (1 170 000 ms)
    warningTimeout.current = setTimeout(() => {
      setShowWarning(true);
    }, 19.5 * 60 * 1000); // 19min30
    // Timer de déconnexion à 20min (1 200 000 ms)
    inactivityTimeout.current = setTimeout(() => {
      logout();
      setShowWarning(false);
      // Utiliser un délai pour éviter les conflits
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }, 20 * 60 * 1000); // 20 minutes
  };

  useEffect(() => {
    // Réinitialise le timer à chaque interaction
    const resetTimer = () => {
      startInactivityTimer();
    };

    // Écoute les événements d'activité utilisateur
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('mousedown', resetTimer);
    window.addEventListener('keypress', resetTimer);
    window.addEventListener('touchstart', resetTimer);
    window.addEventListener('scroll', resetTimer);

    // Démarre le timer au montage
    startInactivityTimer();

    // Nettoyage
    return () => {
      if (inactivityTimeout.current) {
        clearTimeout(inactivityTimeout.current);
      }
      if (warningTimeout.current) {
        clearTimeout(warningTimeout.current);
      }
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('mousedown', resetTimer);
      window.removeEventListener('keypress', resetTimer);
      window.removeEventListener('touchstart', resetTimer);
      window.removeEventListener('scroll', resetTimer);
    };
  }, [token]); // Redémarre le timer à chaque login/logout

  // Affichage de la popup d'avertissement (design moderne)
  const warningPopup = showWarning ? (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      background: 'rgba(30, 41, 59, 0.45)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      animation: 'fadeIn 0.3s',
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
      <div style={{
        background: 'linear-gradient(135deg, #fff 70%, #e0e7ef 100%)',
        padding: '2.5rem 2rem 2rem 2rem',
        borderRadius: '18px',
        boxShadow: '0 8px 32px rgba(30,41,59,0.18)',
        textAlign: 'center',
        minWidth: 320,
        maxWidth: '90vw',
        border: '1.5px solid #e0e7ef',
        position: 'relative',
      }}>
        <div style={{ marginBottom: 16 }}>
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" style={{ display: 'block', margin: '0 auto' }}><circle cx="12" cy="12" r="12" fill="#fbbf24" /><path d="M12 7v4" stroke="#fff" strokeWidth="2" strokeLinecap="round" /><circle cx="12" cy="16" r="1.2" fill="#fff" /></svg>
        </div>
        <div style={{ fontWeight: 600, fontSize: '1.15rem', color: '#1e293b', marginBottom: 8 }}>
          Votre session va expirer dans <span style={{ color: '#f59e42' }}>30 secondes</span> pour cause d'inactivité.
        </div>
        <div style={{ color: '#475569', fontSize: '1rem', marginBottom: 20 }}>
          Déplacez la souris, cliquez ou appuyez sur une touche pour rester connecté.
        </div>
        <button
          onClick={() => { setShowWarning(false); startInactivityTimer(); }}
          style={{
            background: 'linear-gradient(90deg, #38bdf8 0%, #6366f1 100%)',
            color: 'white',
            border: 'none',
            borderRadius: 8,
            padding: '0.7rem 1.5rem',
            fontWeight: 600,
            fontSize: '1rem',
            cursor: 'pointer',
            boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
            transition: 'background 0.2s',
          }}
        >
          Rester connecté
        </button>
      </div>
    </div>
  ) : null;

  // Mettre à jour le profil utilisateur
  const updateUserProfile = async (data: { first_name?: string; last_name?: string; phone?: string }) => {
    if (!token) throw new Error('Non authentifié');
    const response = await axios.patch('/users/update_profile/', data, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.data && response.data.success) {
      await fetchUser();
      return response.data;
    } else {
      throw new Error('Erreur lors de la mise à jour du profil');
    }
  };

  // Rafraîchir les infos utilisateur
  const fetchUser = async () => {
    if (!token) return;
    const response = await axios.get('/users/me/', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (response.data && response.status === 200) {
      let userData = response.data.user;
      if (userData.user_type === 'technician' && response.data.user.technician) {
        userData = { ...userData, technician: response.data.user.technician };
      }
      setUser(userData);
      setProfile(response.data.profile);
    }
  };

  // Charger l'historique des notifications à l'authentification
  useEffect(() => {
    if (!user || !token) return;
    const fetchNotifications = async () => {
      try {
        const response = await axios.get('/depannage/api/notifications/', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.data && response.status === 200) {
          const notifs = response.data.results || response.data || [];
          setAllNotifications(notifs.map((n: any) => ({
            id: n.id,
            title: n.title,
            message: n.message,
            type: n.type,
            created_at: n.created_at,
            is_read: n.is_read,
          })));
        }
      } catch (e) {
        // ignore
      }
    };
    fetchNotifications();
  }, [user, token]);

  useEffect(() => {
    if (!user || !token) return;
    let ws: WebSocket | null = null;
    let reconnectTimeout: NodeJS.Timeout | null = null;
    const connect = () => {
      const wsProtocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const wsUrl = `${wsProtocol}://${window.location.hostname}:8000/ws/notifications/?token=${token}`;
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;
      ws.onopen = () => { };
      ws.onmessage = (event) => {
        try {
          const notif = JSON.parse(event.data);
          // Les notifications WebSocket n'ont pas d'ID car elles ne sont pas dans la DB
          const wsNotif = {
            title: notif.title,
            message: notif.message,
            type: notif.type,
            created_at: notif.created_at,
            is_read: false,
          };
          setWsNotifications(prev => [wsNotif, ...prev]);
          setAllNotifications(prev => [wsNotif, ...prev]);
        } catch { }
      };
      ws.onerror = (e) => { };
      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 2000);
      };
    };
    connect();
    return () => {
      if (ws) ws.close();
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
    };
  }, [user, token]);

  // Méthode pour consommer une notification (ex: marquer comme lue)
  const consumeWsNotification = () => {
    setWsNotifications(prev => prev.slice(0, prev.length - 1));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        token,
        isAuthenticated: !!user && !!token,
        login,
        register,
        logout,
        loading,
        error,
        clearError,
        refreshToken,
        updateUserProfile,
        fetchUser,
        verifyOtp,
        otpRequired,
        otpToken,
        pendingEmail,
        wsNotifications,
        allNotifications,
        consumeWsNotification,
      }}
    >
      <ReauthModal
        show={showReauthModal}
        currentUserEmail={user?.email}
        onClose={() => setShowReauthModal(false)}
        onSuccess={(newUserEmail) => {
          setShowReauthModal(false);
          // Si l'utilisateur change de compte, on recharge tout
          if (newUserEmail !== user?.email) {
            setUser(null);
            setProfile(null);
            setToken(null);
            window.location.reload();
          } else {
            // Sinon, juste recharger l'utilisateur courant
            window.location.reload();
          }
        }}
      />
      {sessionExpired && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', zIndex: 9999, background: '#f87171', color: 'white', textAlign: 'center', padding: '1rem', fontWeight: 'bold' }}>
          Votre session a expiré. Veuillez vous reconnecter.
        </div>
      )}
      {warningPopup}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  return context;
};