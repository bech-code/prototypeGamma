import React, { 
  lazy, 
  Suspense, 
  memo, 
  useMemo, 
  useCallback, 
  useState, 
  useEffect,
  forwardRef,
  ComponentType
} from 'react';
import { ErrorBoundary } from 'react-error-boundary';

/**
 * Composants React optimisés avec lazy loading et mémérisation
 */

// =============================================================================
// TYPES ET INTERFACES
// =============================================================================

interface LazyComponentProps {
  fallback?: React.ComponentType;
  errorFallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  retryOnError?: boolean;
  preload?: boolean;
}

interface VirtualListProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
  onScroll?: (scrollTop: number) => void;
}

interface InfiniteScrollProps {
  hasMore: boolean;
  loadMore: () => void;
  loading: boolean;
  threshold?: number;
  children: React.ReactNode;
}

// =============================================================================
// COMPOSANTS DE FALLBACK
// =============================================================================

const DefaultLoadingFallback = memo(() => (
  <div className="flex items-center justify-center min-h-[200px]">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
));

const DefaultErrorFallback = memo<{ error: Error; resetError: () => void }>(
  ({ error, resetError }) => (
    <div className="flex flex-col items-center justify-center min-h-[200px] p-6">
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 max-w-md w-full">
        <h3 className="text-red-800 font-semibold mb-2">
          Erreur de chargement
        </h3>
        <p className="text-red-600 text-sm mb-4">
          {error.message || 'Une erreur inattendue s\'est produite'}
        </p>
        <button
          onClick={resetError}
          className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
        >
          Réessayer
        </button>
      </div>
    </div>
  )
);

// =============================================================================
// FACTORY POUR COMPOSANTS LAZY
// =============================================================================

export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: LazyComponentProps = {}
): React.FC<React.ComponentProps<T>> {
  const {
    fallback: FallbackComponent = DefaultLoadingFallback,
    errorFallback: ErrorFallbackComponent = DefaultErrorFallback,
    retryOnError = true,
    preload = false,
  } = options;

  // Créer le composant lazy
  const LazyComponent = lazy(importFn);

  // Précharger si demandé
  if (preload) {
    // Précharger après un délai pour ne pas bloquer le rendu initial
    setTimeout(importFn, 100);
  }

  // Composant wrapper optimisé
  const OptimizedLazyComponent = memo<React.ComponentProps<T>>((props) => {
    const [retryCount, setRetryCount] = useState(0);

    const handleError = useCallback((error: Error, errorInfo: any) => {
      console.error('Lazy component error:', error, errorInfo);
    }, []);

    const handleReset = useCallback(() => {
      if (retryOnError) {
        setRetryCount(prev => prev + 1);
      }
    }, [retryOnError]);

    return (
      <ErrorBoundary
        FallbackComponent={ErrorFallbackComponent}
        onError={handleError}
        onReset={handleReset}
        resetKeys={[retryCount]}
      >
        <Suspense fallback={<FallbackComponent />}>
          <LazyComponent {...props} />
        </Suspense>
      </ErrorBoundary>
    );
  });

  OptimizedLazyComponent.displayName = `LazyComponent(${LazyComponent.displayName || 'Component'})`;

  return OptimizedLazyComponent;
}

// =============================================================================
// COMPOSANT DE LISTE VIRTUALISÉE
// =============================================================================

export const VirtualList = memo(<T,>({
  items,
  renderItem,
  itemHeight,
  containerHeight,
  overscan = 3,
  onScroll,
}: VirtualListProps<T>) => {
  const [scrollTop, setScrollTop] = useState(0);

  const visibleRange = useMemo(() => {
    const start = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const end = Math.min(
      items.length,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    );
    return { start, end };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end).map((item, index) => ({
      item,
      index: visibleRange.start + index,
    }));
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const newScrollTop = e.currentTarget.scrollTop;
    setScrollTop(newScrollTop);
    onScroll?.(newScrollTop);
  }, [onScroll]);

  return (
    <div
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      className="virtual-list-container"
    >
      <div style={{ height: totalHeight, position: 'relative' }}>
        <div style={{ transform: `translateY(${offsetY}px)` }}>
          {visibleItems.map(({ item, index }) => (
            <div key={index} style={{ height: itemHeight }}>
              {renderItem(item, index)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}) as <T>(props: VirtualListProps<T>) => JSX.Element;

// =============================================================================
// COMPOSANT INFINITE SCROLL
// =============================================================================

export const InfiniteScroll = memo<InfiniteScrollProps>(({
  hasMore,
  loadMore,
  loading,
  threshold = 200,
  children,
}) => {
  const [containerRef, setContainerRef] = useState<HTMLDivElement | null>(null);

  const handleScroll = useCallback(() => {
    if (!containerRef || loading || !hasMore) return;

    const { scrollTop, scrollHeight, clientHeight } = containerRef;
    const scrolledToBottom = scrollHeight - scrollTop - clientHeight < threshold;

    if (scrolledToBottom) {
      loadMore();
    }
  }, [containerRef, loading, hasMore, threshold, loadMore]);

  useEffect(() => {
    if (!containerRef) return;

    containerRef.addEventListener('scroll', handleScroll, { passive: true });
    return () => containerRef.removeEventListener('scroll', handleScroll);
  }, [containerRef, handleScroll]);

  return (
    <div ref={setContainerRef} className="infinite-scroll-container h-full overflow-auto">
      {children}
      {loading && (
        <div className="flex justify-center py-4">
          <DefaultLoadingFallback />
        </div>
      )}
      {!hasMore && (
        <div className="text-center py-4 text-gray-500">
          Aucun élément supplémentaire à charger
        </div>
      )}
    </div>
  );
});

// =============================================================================
// COMPOSANT IMAGE OPTIMISÉE
// =============================================================================

interface OptimizedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackSrc?: string;
  lazy?: boolean;
  placeholder?: React.ReactNode;
  onLoadStart?: () => void;
  onLoadEnd?: () => void;
}

export const OptimizedImage = memo<OptimizedImageProps>(({
  src,
  alt,
  fallbackSrc,
  lazy = true,
  placeholder,
  onLoadStart,
  onLoadEnd,
  className = '',
  ...props
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [currentSrc, setCurrentSrc] = useState(src);

  const handleLoad = useCallback(() => {
    setLoading(false);
    setError(false);
    onLoadEnd?.();
  }, [onLoadEnd]);

  const handleError = useCallback(() => {
    setLoading(false);
    if (fallbackSrc && currentSrc !== fallbackSrc) {
      setCurrentSrc(fallbackSrc);
      setError(false);
    } else {
      setError(true);
    }
  }, [fallbackSrc, currentSrc]);

  const handleLoadStart = useCallback(() => {
    setLoading(true);
    onLoadStart?.();
  }, [onLoadStart]);

  useEffect(() => {
    setCurrentSrc(src);
    setError(false);
    setLoading(true);
  }, [src]);

  if (error && !fallbackSrc) {
    return (
      <div className={`bg-gray-200 flex items-center justify-center ${className}`}>
        <span className="text-gray-500 text-sm">Image non disponible</span>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {loading && placeholder && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          {placeholder}
        </div>
      )}
      <img
        {...props}
        src={currentSrc}
        alt={alt}
        loading={lazy ? 'lazy' : 'eager'}
        onLoad={handleLoad}
        onError={handleError}
        onLoadStart={handleLoadStart}
        className={`${loading ? 'opacity-0' : 'opacity-100'} transition-opacity duration-300 ${className}`}
      />
    </div>
  );
});

// =============================================================================
// COMPOSANT DE RECHERCHE OPTIMISÉE
// =============================================================================

interface OptimizedSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
  debounceMs?: number;
  minLength?: number;
  loading?: boolean;
  className?: string;
}

export const OptimizedSearch = memo<OptimizedSearchProps>(({
  onSearch,
  placeholder = 'Rechercher...',
  debounceMs = 300,
  minLength = 2,
  loading = false,
  className = '',
}) => {
  const [query, setQuery] = useState('');

  // Debounce de la recherche
  useEffect(() => {
    if (query.length >= minLength || query.length === 0) {
      const timeoutId = setTimeout(() => {
        onSearch(query);
      }, debounceMs);

      return () => clearTimeout(timeoutId);
    }
  }, [query, onSearch, debounceMs, minLength]);

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
  }, []);

  const handleClear = useCallback(() => {
    setQuery('');
    onSearch('');
  }, [onSearch]);

  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder={placeholder}
        className="w-full px-4 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
      <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
        {loading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-2 border-blue-600 border-t-transparent"></div>
        ) : query ? (
          <button
            onClick={handleClear}
            className="text-gray-400 hover:text-gray-600 transition-colors"
            type="button"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        ) : (
          <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        )}
      </div>
    </div>
  );
});

// =============================================================================
// HOC POUR L'OPTIMISATION DES COMPOSANTS
// =============================================================================

interface WithPerformanceProps {
  debug?: boolean;
  name?: string;
}

export function withPerformance<P extends object>(
  Component: ComponentType<P>,
  options: WithPerformanceProps = {}
) {
  const { debug = false, name } = options;

  const PerformanceWrapper = memo<P>((props) => {
    const startTime = useMemo(() => performance.now(), []);
    
    useEffect(() => {
      if (debug) {
        const endTime = performance.now();
        console.log(`[Performance] ${name || Component.displayName || 'Component'} rendered in ${endTime - startTime}ms`);
      }
    });

    return <Component {...props} />;
  });

  PerformanceWrapper.displayName = `withPerformance(${Component.displayName || Component.name})`;

  return PerformanceWrapper;
}

// =============================================================================
// HOOK POUR L'INTERSECTION OBSERVER
// =============================================================================

export function useIntersectionObserver(
  callback: (isIntersecting: boolean) => void,
  options: IntersectionObserverInit = {}
) {
  const [element, setElement] = useState<Element | null>(null);

  useEffect(() => {
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        callback(entry.isIntersecting);
      },
      {
        threshold: 0.1,
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.disconnect();
    };
  }, [element, callback, options]);

  return setElement;
}

// =============================================================================
// COMPOSANT LAZY LOADING AVEC INTERSECTION OBSERVER
// =============================================================================

interface LazyLoadProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

export const LazyLoad = memo<LazyLoadProps>(({
  children,
  fallback = null,
  threshold = 0.1,
  rootMargin = '50px',
  triggerOnce = true,
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [hasBeenVisible, setHasBeenVisible] = useState(false);

  const setElement = useIntersectionObserver(
    useCallback((isIntersecting: boolean) => {
      setIsVisible(isIntersecting);
      if (isIntersecting) {
        setHasBeenVisible(true);
      }
    }, []),
    { threshold, rootMargin }
  );

  const shouldRender = triggerOnce ? hasBeenVisible : isVisible;

  return (
    <div ref={setElement}>
      {shouldRender ? children : fallback}
    </div>
  );
});

// =============================================================================
// EXPORTS
// =============================================================================

export {
  DefaultLoadingFallback,
  DefaultErrorFallback,
};

// Composants pré-configurés pour les cas d'usage courants
export const LazyDashboard = createLazyComponent(
  () => import('../pages/CustomerDashboard'),
  { preload: true }
);

export const LazyTechnicianDashboard = createLazyComponent(
  () => import('../pages/TechnicianDashboard'),
  { preload: false }
);

export const LazyAdminDashboard = createLazyComponent(
  () => import('../pages/AdminDashboard'),
  { preload: false }
);

export const LazyBookingForm = createLazyComponent(
  () => import('../pages/BookingForm'),
  { preload: true }
);

export const LazyStatistics = createLazyComponent(
  () => import('../pages/Statistics'),
  { preload: false }
);