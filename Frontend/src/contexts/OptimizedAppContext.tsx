import React, { 
  createContext, 
  useContext, 
  useReducer, 
  useMemo, 
  useCallback,
  useEffect,
  useRef,
  ReactNode
} from 'react';
import { useOptimizedApi, useMutation } from '../hooks/useOptimizedApi';
import { apiCache } from '../hooks/useOptimizedApi';

/**
 * Contexte d'application optimisé avec gestion d'état moderne et cache intelligent
 */

// =============================================================================
// TYPES ET INTERFACES
// =============================================================================

interface User {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  user_type: 'client' | 'technician' | 'admin';
  is_active: boolean;
  phone?: string;
  technician?: any;
  client?: any;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  type: string;
  created_at: string;
  is_read: boolean;
}

interface AppSettings {
  theme: 'light' | 'dark' | 'system';
  language: 'fr' | 'en';
  notifications: {
    push: boolean;
    email: boolean;
    sms: boolean;
  };
  geolocation: {
    enabled: boolean;
    precision: 'high' | 'medium' | 'low';
  };
  performance: {
    enableCache: boolean;
    preloadData: boolean;
    reducedMotion: boolean;
  };
}

interface AppState {
  // État utilisateur
  user: User | null;
  isAuthenticated: boolean;
  
  // État de l'application
  loading: boolean;
  error: string | null;
  
  // Notifications
  notifications: Notification[];
  unreadCount: number;
  
  // Paramètres
  settings: AppSettings;
  
  // Cache et performance
  cacheStats: {
    size: number;
    hits: number;
    misses: number;
  };
  
  // État UI
  ui: {
    sidebarOpen: boolean;
    theme: string;
    isMobile: boolean;
  };
}

// =============================================================================
// ACTIONS
// =============================================================================

type AppAction =
  | { type: 'SET_USER'; payload: User | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: string | null }
  | { type: 'ADD_NOTIFICATION'; payload: Notification }
  | { type: 'MARK_NOTIFICATION_READ'; payload: number }
  | { type: 'MARK_ALL_NOTIFICATIONS_READ' }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<AppSettings> }
  | { type: 'UPDATE_CACHE_STATS'; payload: Partial<AppState['cacheStats']> }
  | { type: 'TOGGLE_SIDEBAR' }
  | { type: 'SET_THEME'; payload: string }
  | { type: 'SET_IS_MOBILE'; payload: boolean }
  | { type: 'RESET_STATE' };

// =============================================================================
// REDUCER
// =============================================================================

const initialState: AppState = {
  user: null,
  isAuthenticated: false,
  loading: false,
  error: null,
  notifications: [],
  unreadCount: 0,
  settings: {
    theme: 'system',
    language: 'fr',
    notifications: {
      push: true,
      email: true,
      sms: false,
    },
    geolocation: {
      enabled: true,
      precision: 'medium',
    },
    performance: {
      enableCache: true,
      preloadData: true,
      reducedMotion: false,
    },
  },
  cacheStats: {
    size: 0,
    hits: 0,
    misses: 0,
  },
  ui: {
    sidebarOpen: false,
    theme: 'light',
    isMobile: false,
  },
};

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'SET_USER':
      return {
        ...state,
        user: action.payload,
        isAuthenticated: Boolean(action.payload),
      };

    case 'SET_LOADING':
      return {
        ...state,
        loading: action.payload,
      };

    case 'SET_ERROR':
      return {
        ...state,
        error: action.payload,
      };

    case 'ADD_NOTIFICATION':
      return {
        ...state,
        notifications: [action.payload, ...state.notifications],
        unreadCount: action.payload.is_read ? state.unreadCount : state.unreadCount + 1,
      };

    case 'MARK_NOTIFICATION_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif =>
          notif.id === action.payload ? { ...notif, is_read: true } : notif
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      };

    case 'MARK_ALL_NOTIFICATIONS_READ':
      return {
        ...state,
        notifications: state.notifications.map(notif => ({ ...notif, is_read: true })),
        unreadCount: 0,
      };

    case 'UPDATE_SETTINGS':
      return {
        ...state,
        settings: {
          ...state.settings,
          ...action.payload,
        },
      };

    case 'UPDATE_CACHE_STATS':
      return {
        ...state,
        cacheStats: {
          ...state.cacheStats,
          ...action.payload,
        },
      };

    case 'TOGGLE_SIDEBAR':
      return {
        ...state,
        ui: {
          ...state.ui,
          sidebarOpen: !state.ui.sidebarOpen,
        },
      };

    case 'SET_THEME':
      return {
        ...state,
        ui: {
          ...state.ui,
          theme: action.payload,
        },
      };

    case 'SET_IS_MOBILE':
      return {
        ...state,
        ui: {
          ...state.ui,
          isMobile: action.payload,
        },
      };

    case 'RESET_STATE':
      return {
        ...initialState,
        settings: state.settings, // Conserver les paramètres
      };

    default:
      return state;
  }
}

// =============================================================================
// CONTEXTE
// =============================================================================

interface AppContextType {
  state: AppState;
  
  // Actions utilisateur
  setUser: (user: User | null) => void;
  logout: () => void;
  
  // Actions notifications
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  markNotificationRead: (id: number) => void;
  markAllNotificationsRead: () => void;
  
  // Actions paramètres
  updateSettings: (settings: Partial<AppSettings>) => void;
  
  // Actions UI
  toggleSidebar: () => void;
  setTheme: (theme: string) => void;
  
  // Actions de performance
  clearCache: () => void;
  preloadData: (urls: string[]) => void;
  
  // États calculés
  isLoading: boolean;
  hasError: boolean;
  isDarkMode: boolean;
  canUseCache: boolean;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// =============================================================================
// PROVIDER
// =============================================================================

interface AppProviderProps {
  children: ReactNode;
}

export const OptimizedAppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const performanceTimer = useRef<NodeJS.Timeout>();
  
  // Charger les paramètres depuis localStorage
  useEffect(() => {
    const savedSettings = localStorage.getItem('app-settings');
    if (savedSettings) {
      try {
        const settings = JSON.parse(savedSettings);
        dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
      } catch (error) {
        console.warn('Erreur lors du chargement des paramètres:', error);
      }
    }
  }, []);

  // Sauvegarder les paramètres
  useEffect(() => {
    localStorage.setItem('app-settings', JSON.stringify(state.settings));
  }, [state.settings]);

  // Détecter si on est sur mobile
  useEffect(() => {
    const checkMobile = () => {
      dispatch({ type: 'SET_IS_MOBILE', payload: window.innerWidth < 768 });
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Appliquer le thème
  useEffect(() => {
    const applyTheme = () => {
      const { theme } = state.settings;
      let effectiveTheme = theme;

      if (theme === 'system') {
        effectiveTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }

      dispatch({ type: 'SET_THEME', payload: effectiveTheme });
      
      if (effectiveTheme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    mediaQuery.addEventListener('change', applyTheme);
    
    return () => mediaQuery.removeEventListener('change', applyTheme);
  }, [state.settings.theme]);

  // Surveiller les statistiques du cache
  useEffect(() => {
    if (!state.settings.performance.enableCache) return;

    const updateCacheStats = () => {
      const stats = apiCache.getStats();
      dispatch({ 
        type: 'UPDATE_CACHE_STATS', 
        payload: { 
          size: stats.size,
          hits: stats.entries.filter(e => !e.expired).length,
          misses: stats.entries.filter(e => e.expired).length,
        }
      });
    };

    // Mettre à jour immédiatement puis toutes les 10 secondes
    updateCacheStats();
    const interval = setInterval(updateCacheStats, 10000);

    return () => clearInterval(interval);
  }, [state.settings.performance.enableCache]);

  // Actions mémemorisées
  const setUser = useCallback((user: User | null) => {
    dispatch({ type: 'SET_USER', payload: user });
  }, []);

  const logout = useCallback(() => {
    dispatch({ type: 'RESET_STATE' });
    apiCache.invalidate();
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
  }, []);

  const addNotification = useCallback((notification: Omit<Notification, 'id'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now() + Math.random(),
    };
    dispatch({ type: 'ADD_NOTIFICATION', payload: newNotification });

    // Auto-remove après 5 secondes si ce n'est pas une erreur
    if (notification.type !== 'error') {
      setTimeout(() => {
        dispatch({ type: 'MARK_NOTIFICATION_READ', payload: newNotification.id });
      }, 5000);
    }
  }, []);

  const markNotificationRead = useCallback((id: number) => {
    dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
  }, []);

  const markAllNotificationsRead = useCallback(() => {
    dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
  }, []);

  const updateSettings = useCallback((settings: Partial<AppSettings>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const toggleSidebar = useCallback(() => {
    dispatch({ type: 'TOGGLE_SIDEBAR' });
  }, []);

  const setTheme = useCallback((theme: string) => {
    updateSettings({ theme: theme as AppSettings['theme'] });
  }, [updateSettings]);

  const clearCache = useCallback(() => {
    apiCache.invalidate();
    addNotification({
      title: 'Cache vidé',
      message: 'Le cache de l\'application a été vidé avec succès',
      type: 'success',
      created_at: new Date().toISOString(),
      is_read: false,
    });
  }, [addNotification]);

  const preloadData = useCallback((urls: string[]) => {
    if (!state.settings.performance.preloadData) return;

    urls.forEach(url => {
      // Précharger les données de manière asynchrone
      fetch(url)
        .then(response => response.json())
        .then(data => {
          apiCache.set(`preload:${url}`, data, 300000); // 5 minutes
        })
        .catch(() => {
          // Ignorer les erreurs de préchargement
        });
    });
  }, [state.settings.performance.preloadData]);

  // États calculés mémemorisés
  const contextValue = useMemo<AppContextType>(() => ({
    state,
    
    // Actions
    setUser,
    logout,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    updateSettings,
    toggleSidebar,
    setTheme,
    clearCache,
    preloadData,
    
    // États calculés
    isLoading: state.loading,
    hasError: Boolean(state.error),
    isDarkMode: state.ui.theme === 'dark',
    canUseCache: state.settings.performance.enableCache,
  }), [
    state,
    setUser,
    logout,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    updateSettings,
    toggleSidebar,
    setTheme,
    clearCache,
    preloadData,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
};

// =============================================================================
// HOOKS
// =============================================================================

export const useOptimizedApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useOptimizedApp doit être utilisé dans un OptimizedAppProvider');
  }
  return context;
};

// Hook pour les notifications optimisées
export const useNotifications = () => {
  const { state, addNotification, markNotificationRead, markAllNotificationsRead } = useOptimizedApp();
  
  return useMemo(() => ({
    notifications: state.notifications,
    unreadCount: state.unreadCount,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
    
    // Méthodes utilitaires
    addSuccess: (message: string) => addNotification({
      title: 'Succès',
      message,
      type: 'success',
      created_at: new Date().toISOString(),
      is_read: false,
    }),
    
    addError: (message: string) => addNotification({
      title: 'Erreur',
      message,
      type: 'error',
      created_at: new Date().toISOString(),
      is_read: false,
    }),
    
    addInfo: (message: string) => addNotification({
      title: 'Information',
      message,
      type: 'info',
      created_at: new Date().toISOString(),
      is_read: false,
    }),
  }), [
    state.notifications,
    state.unreadCount,
    addNotification,
    markNotificationRead,
    markAllNotificationsRead,
  ]);
};

// Hook pour les paramètres de performance
export const usePerformanceSettings = () => {
  const { state, updateSettings } = useOptimizedApp();
  
  return useMemo(() => ({
    settings: state.settings.performance,
    cacheStats: state.cacheStats,
    
    updatePerformanceSettings: (settings: Partial<AppSettings['performance']>) => {
      updateSettings({ performance: { ...state.settings.performance, ...settings } });
    },
    
    toggleCache: () => {
      updateSettings({ 
        performance: { 
          ...state.settings.performance, 
          enableCache: !state.settings.performance.enableCache 
        } 
      });
    },
    
    togglePreload: () => {
      updateSettings({ 
        performance: { 
          ...state.settings.performance, 
          preloadData: !state.settings.performance.preloadData 
        } 
      });
    },
  }), [state.settings.performance, state.cacheStats, updateSettings]);
};

// Hook pour la gestion des thèmes
export const useTheme = () => {
  const { state, setTheme } = useOptimizedApp();
  
  return useMemo(() => ({
    theme: state.settings.theme,
    effectiveTheme: state.ui.theme,
    isDarkMode: state.ui.theme === 'dark',
    setTheme,
    
    toggleTheme: () => {
      const newTheme = state.ui.theme === 'dark' ? 'light' : 'dark';
      setTheme(newTheme);
    },
  }), [state.settings.theme, state.ui.theme, setTheme]);
};

// Hook pour l'état UI
export const useUI = () => {
  const { state, toggleSidebar } = useOptimizedApp();
  
  return useMemo(() => ({
    ...state.ui,
    toggleSidebar,
  }), [state.ui, toggleSidebar]);
};

export default OptimizedAppProvider;