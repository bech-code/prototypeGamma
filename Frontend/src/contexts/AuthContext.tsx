import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import { User, Profile } from '../types/user';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  error: string | null;
  clearError: () => void;
  refreshToken: () => Promise<boolean>;
}

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

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Configure axios defaults
axios.defaults.baseURL = 'http://127.0.0.1:8000';
axios.defaults.headers.common['Content-Type'] = 'application/json';

// Intercepteur pour refresh automatique des tokens
axios.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refreshToken');
        if (!refreshToken) {
          throw new Error('No refresh token available');
        }

        const response = await axios.post('/users/token/refresh/', {
          refresh: refreshToken
        });

        const { access } = response.data;
        localStorage.setItem('token', access);
        axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;

        return axios(originalRequest);
      } catch (refreshError) {
        // Refresh token expiré, déconnexion
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      if (token) {
        try {
          const response = await axios.get('/users/me/', {
            headers: { Authorization: `Bearer ${token}` }
          });

          if (response.data && response.status === 200) {
            setUser(response.data.user);
            setProfile(response.data.profile);
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
          }
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

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

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);

    try {
      const response = await axios.post('/users/login/', {
        email,
        password
      });

      if (!response.data) {
        throw new Error('Empty response from server');
      }

      const { access, refresh, user: userData, profile: profileData } = response.data;

      if (!access || !userData) {
        throw new Error('Invalid login response format');
      }

      // Stocker les tokens
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);

      // Mettre à jour l'état
      setToken(access);
      setUser(userData);
      setProfile(profileData);

      // Configurer axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
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

      throw error;
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

      const { access, refresh, user: newUser, profile: profileData } = response.data;

      if (!access || !newUser) {
        throw new Error('Invalid registration response format');
      }

      // Stocker les tokens
      localStorage.setItem('token', access);
      localStorage.setItem('refreshToken', refresh);

      // Mettre à jour l'état
      setToken(access);
      setUser(newUser);
      setProfile(profileData);

      // Configurer axios
      axios.defaults.headers.common['Authorization'] = `Bearer ${access}`;
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
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      profile,
      token,
      isAuthenticated: !!token && !!user,
      login,
      register,
      logout,
      loading,
      error,
      clearError,
      refreshToken
    }}>
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