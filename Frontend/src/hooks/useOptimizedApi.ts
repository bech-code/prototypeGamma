import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';

/**
 * Hook optimisé pour les appels API avec cache, debounce et gestion d'état intelligent
 */

// =============================================================================
// TYPES ET INTERFACES
// =============================================================================

interface UseApiOptions<T> {
  initialData?: T;
  cacheKey?: string;
  cacheTimeout?: number;
  debounceMs?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enabled?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: any) => void;
  dependencies?: any[];
}

interface ApiState<T> {
  data: T | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

interface PaginatedResponse<T> {
  results: T[];
  count: number;
  next: string | null;
  previous: string | null;
  page_size: number;
  current_page: number;
}

// =============================================================================
// CACHE MANAGER
// =============================================================================

class ApiCacheManager {
  private cache = new Map<string, CacheEntry<any>>();
  private maxSize = 100;

  set<T>(key: string, data: T, timeout: number = 300000): void {
    // Nettoyer le cache si trop plein
    if (this.cache.size >= this.maxSize) {
      this.cleanup();
    }

    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      expiresAt: Date.now() + timeout,
    });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) return null;
    
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear();
      return;
    }

    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }

  private cleanup(): void {
    const now = Date.now();
    const toDelete: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        toDelete.push(key);
      }
    }

    // Supprimer les plus anciens si nécessaire
    if (toDelete.length === 0 && this.cache.size >= this.maxSize) {
      const entries = Array.from(this.cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      toDelete.push(...entries.slice(0, 10).map(([key]) => key));
    }

    toDelete.forEach(key => this.cache.delete(key));
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        timestamp: entry.timestamp,
        expiresAt: entry.expiresAt,
        expired: Date.now() > entry.expiresAt,
      })),
    };
  }
}

const apiCache = new ApiCacheManager();

// =============================================================================
// UTILITAIRES
// =============================================================================

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): T => {
  let timeout: NodeJS.Timeout;
  
  return ((...args: any[]) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// =============================================================================
// HOOK PRINCIPAL D'API
// =============================================================================

export function useOptimizedApi<T>(
  url: string | null,
  options: UseApiOptions<T> = {}
) {
  const {
    initialData = null,
    cacheKey,
    cacheTimeout = 300000, // 5 minutes
    debounceMs = 0,
    retryAttempts = 3,
    retryDelay = 1000,
    enabled = true,
    onSuccess,
    onError,
    dependencies = [],
  } = options;

  const [state, setState] = useState<ApiState<T>>({
    data: initialData,
    loading: false,
    error: null,
    lastFetch: null,
  });

  const abortControllerRef = useRef<AbortController | null>(null);
  const retryCountRef = useRef(0);

  // Générer une clé de cache
  const finalCacheKey = useMemo(() => {
    if (!url) return null;
    return cacheKey || `api:${url}:${JSON.stringify(dependencies)}`;
  }, [url, cacheKey, dependencies]);

  // Fonction de fetch avec retry et cache
  const fetchData = useCallback(async (signal?: AbortSignal): Promise<T | null> => {
    if (!url) return null;

    // Vérifier le cache d'abord
    if (finalCacheKey) {
      const cached = apiCache.get<T>(finalCacheKey);
      if (cached) {
        setState(prev => ({ ...prev, data: cached, loading: false, error: null }));
        return cached;
      }
    }

    let lastError: any = null;

    for (let attempt = 0; attempt <= retryAttempts; attempt++) {
      try {
        if (signal?.aborted) throw new Error('Request aborted');

        setState(prev => ({ ...prev, loading: true, error: null }));

        const response = await axios.get(url, {
          signal,
          timeout: 30000, // 30 secondes
        });

        const data = response.data;

        // Mettre en cache
        if (finalCacheKey) {
          apiCache.set(finalCacheKey, data, cacheTimeout);
        }

        setState({
          data,
          loading: false,
          error: null,
          lastFetch: new Date(),
        });

        retryCountRef.current = 0;
        onSuccess?.(data);
        return data;

      } catch (error: any) {
        lastError = error;

        if (signal?.aborted || attempt === retryAttempts) {
          break;
        }

        // Attendre avant de réessayer
        await sleep(retryDelay * Math.pow(2, attempt));
      }
    }

    const errorMessage = lastError?.response?.data?.message || 
                        lastError?.message || 
                        'Erreur de chargement';

    setState(prev => ({
      ...prev,
      loading: false,
      error: errorMessage,
    }));

    onError?.(lastError);
    return null;
  }, [url, finalCacheKey, cacheTimeout, retryAttempts, retryDelay, onSuccess, onError]);

  // Fonction de fetch avec debounce
  const debouncedFetch = useMemo(
    () => debounceMs > 0 ? debounce(fetchData, debounceMs) : fetchData,
    [fetchData, debounceMs]
  );

  // Effet pour lancer le fetch
  useEffect(() => {
    if (!enabled || !url) return;

    abortControllerRef.current?.abort();
    abortControllerRef.current = new AbortController();

    debouncedFetch(abortControllerRef.current.signal);

    return () => {
      abortControllerRef.current?.abort();
    };
  }, [url, enabled, debouncedFetch, ...dependencies]);

  // Fonctions de contrôle
  const refetch = useCallback(() => {
    if (finalCacheKey) {
      apiCache.invalidate(finalCacheKey);
    }
    return fetchData();
  }, [fetchData, finalCacheKey]);

  const mutate = useCallback((newData: T | ((prev: T | null) => T)) => {
    setState(prev => ({
      ...prev,
      data: typeof newData === 'function' ? newData(prev.data) : newData,
    }));

    // Mettre à jour le cache
    if (finalCacheKey) {
      const data = typeof newData === 'function' ? newData(state.data) : newData;
      apiCache.set(finalCacheKey, data, cacheTimeout);
    }
  }, [finalCacheKey, cacheTimeout, state.data]);

  return {
    ...state,
    refetch,
    mutate,
    isCached: Boolean(finalCacheKey && apiCache.get(finalCacheKey)),
  };
}

// =============================================================================
// HOOKS SPÉCIALISÉS
// =============================================================================

export function usePaginatedApi<T>(
  baseUrl: string,
  options: UseApiOptions<PaginatedResponse<T>> & {
    pageSize?: number;
    initialPage?: number;
  } = {}
) {
  const { pageSize = 20, initialPage = 1, ...apiOptions } = options;
  const [page, setPage] = useState(initialPage);
  const [allData, setAllData] = useState<T[]>([]);

  const url = baseUrl ? `${baseUrl}?page=${page}&page_size=${pageSize}` : null;

  const result = useOptimizedApi<PaginatedResponse<T>>(url, {
    ...apiOptions,
    dependencies: [page, pageSize, ...(apiOptions.dependencies || [])],
    onSuccess: (data) => {
      if (page === 1) {
        setAllData(data.results);
      } else {
        setAllData(prev => [...prev, ...data.results]);
      }
      apiOptions.onSuccess?.(data);
    },
  });

  const loadMore = useCallback(() => {
    if (result.data?.next && !result.loading) {
      setPage(prev => prev + 1);
    }
  }, [result.data?.next, result.loading]);

  const reset = useCallback(() => {
    setPage(1);
    setAllData([]);
    result.refetch();
  }, [result.refetch]);

  return {
    ...result,
    data: result.data ? { ...result.data, results: allData } : null,
    loadMore,
    reset,
    hasMore: Boolean(result.data?.next),
    currentPage: page,
  };
}

export function useSearch<T>(
  searchFn: (query: string) => string,
  options: UseApiOptions<T[]> & {
    minLength?: number;
    debounceMs?: number;
  } = {}
) {
  const { minLength = 2, debounceMs = 300, ...apiOptions } = options;
  const [query, setQuery] = useState('');

  const url = query.length >= minLength ? searchFn(query) : null;

  const result = useOptimizedApi<T[]>(url, {
    ...apiOptions,
    debounceMs,
    dependencies: [query, ...(apiOptions.dependencies || [])],
  });

  return {
    ...result,
    query,
    setQuery,
    clearSearch: () => setQuery(''),
    isSearching: query.length >= minLength && result.loading,
  };
}

export function useInfiniteScroll<T>(
  url: string,
  options: UseApiOptions<PaginatedResponse<T>> = {}
) {
  const [items, setItems] = useState<T[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const result = useOptimizedApi<PaginatedResponse<T>>(
    hasMore ? `${url}?page=${page}` : null,
    {
      ...options,
      dependencies: [page, ...(options.dependencies || [])],
      onSuccess: (data) => {
        if (page === 1) {
          setItems(data.results);
        } else {
          setItems(prev => [...prev, ...data.results]);
        }
        setHasMore(Boolean(data.next));
        options.onSuccess?.(data);
      },
    }
  );

  const loadMore = useCallback(() => {
    if (hasMore && !result.loading) {
      setPage(prev => prev + 1);
    }
  }, [hasMore, result.loading]);

  const reset = useCallback(() => {
    setPage(1);
    setItems([]);
    setHasMore(true);
    result.refetch();
  }, [result.refetch]);

  return {
    items,
    loading: result.loading,
    error: result.error,
    hasMore,
    loadMore,
    reset,
  };
}

// =============================================================================
// GESTIONNAIRE DE MUTATIONS
// =============================================================================

export function useMutation<TData, TVariables = any>(
  mutationFn: (variables: TVariables) => Promise<TData>,
  options: {
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: any, variables: TVariables) => void;
    invalidateCache?: string[]; // Patterns de cache à invalider
  } = {}
) {
  const [state, setState] = useState<{
    loading: boolean;
    error: string | null;
    data: TData | null;
  }>({
    loading: false,
    error: null,
    data: null,
  });

  const mutate = useCallback(async (variables: TVariables) => {
    setState({ loading: true, error: null, data: null });

    try {
      const data = await mutationFn(variables);
      
      setState({ loading: false, error: null, data });
      
      // Invalider le cache
      options.invalidateCache?.forEach(pattern => {
        apiCache.invalidate(pattern);
      });
      
      options.onSuccess?.(data, variables);
      return data;
      
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 
                          error?.message || 
                          'Erreur lors de la mutation';
      
      setState({ loading: false, error: errorMessage, data: null });
      options.onError?.(error, variables);
      throw error;
    }
  }, [mutationFn, options]);

  return {
    ...state,
    mutate,
    reset: () => setState({ loading: false, error: null, data: null }),
  };
}

// =============================================================================
// EXPORTS UTILITAIRES
// =============================================================================

export { apiCache };
export type { UseApiOptions, ApiState, PaginatedResponse };

// Fonction utilitaire pour précharger des données
export const preloadData = <T>(url: string, cacheKey?: string, timeout?: number) => {
  const key = cacheKey || `api:${url}`;
  const cached = apiCache.get<T>(key);
  
  if (!cached) {
    axios.get(url).then(response => {
      apiCache.set(key, response.data, timeout);
    }).catch(() => {
      // Ignorer les erreurs de préchargement
    });
  }
};

// Hook pour surveiller les stats du cache
export const useCacheStats = () => {
  const [stats, setStats] = useState(apiCache.getStats());

  useEffect(() => {
    const interval = setInterval(() => {
      setStats(apiCache.getStats());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return stats;
};