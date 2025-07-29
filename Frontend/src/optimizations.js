
// Optimisations Frontend pour DepanneTeliman

// 1. Code Splitting
import React, { lazy, Suspense } from 'react';

const TechnicianDashboard = lazy(() => import('./pages/TechnicianDashboard'));
const AdminDashboard = lazy(() => import('./pages/AdminDashboard'));
const ChatPage = lazy(() => import('./pages/ChatPage'));

// 2. Lazy Loading des composants
function App() {
  return (
    <Suspense fallback={<div>Chargement...</div>}>
      <Routes>
        <Route path="/technician/dashboard" element={<TechnicianDashboard />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
        <Route path="/chat/:id" element={<ChatPage />} />
      </Routes>
    </Suspense>
  );
}

// 3. Cache des données API
const apiCache = new Map();

export const cachedApiCall = async (url, options = {}) => {
  const cacheKey = `${url}_${JSON.stringify(options)}`;
  
  if (apiCache.has(cacheKey)) {
    const cached = apiCache.get(cacheKey);
    if (Date.now() - cached.timestamp < 5 * 60 * 1000) { // 5 minutes
      return cached.data;
    }
  }
  
  const response = await fetch(url, options);
  const data = await response.json();
  
  apiCache.set(cacheKey, {
    data,
    timestamp: Date.now()
  });
  
  return data;
};

// 4. Optimisation des images
export const optimizeImage = (src, width = 800) => {
  // Utiliser un service d'optimisation d'images
  return src.includes('?') ? `${src}&w=${width}` : `${src}?w=${width}`;
};

// 5. Debounce pour les recherches
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};
