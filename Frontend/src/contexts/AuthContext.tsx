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
          
          // Check if response is valid
          if (response.data && response.status === 200) {
            // La réponse contient { user: {...}, profile: {...} }
            setUser(response.data.user);
            setProfile(response.data.profile);
          } else {
            throw new Error('Invalid response from server');
          }
        } catch (error) {
          console.error('Auth initialization failed:', error);
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setProfile(null);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, [token]);

  const login = async (email: string, password: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await axios.post('/users/login/', {
        email,
        password
      });

      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response from server');
      }

      const { access, user: userData, profile: profileData } = response.data;
      
      if (!access || !userData) {
        throw new Error('Invalid login response format');
      }

      localStorage.setItem('token', access);
      setToken(access);
      setUser(userData);
      setProfile(profileData);
    } catch (error: unknown) {
      console.error('Login error:', error);
      
      // Handle different error types
      if (axios.isAxiosError(error)) {
        // Server responded with error status
        const message = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       `Server error: ${error.response?.status}`;
        setError(message);
      } else if (error instanceof Error) {
        // Other errors
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
      
      // Validate response structure
      if (!response.data) {
        throw new Error('Empty response from server');
      }

      const { access, user: newUser, profile: profileData } = response.data;
      
      if (!access || !newUser) {
        throw new Error('Invalid registration response format');
      }

      localStorage.setItem('token', access);
      setToken(access);
      setUser(newUser);
      setProfile(profileData);
    } catch (error: unknown) {
      console.error('Registration error:', error);
      
      // Handle different error types
      if (axios.isAxiosError(error)) {
        const message = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       `Server error: ${error.response?.status}`;
        setError(message);
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
      clearError
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