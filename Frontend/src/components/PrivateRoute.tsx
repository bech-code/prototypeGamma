import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PrivateRouteProps {
  children: React.ReactNode | ((props: { user: any }) => React.ReactNode);
  userTypeRequired?: 'technician' | 'client' | 'admin';
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, userTypeRequired }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Si l'utilisateur est un superuser, il a accès à tout
  if (user?.is_superuser) {
    if (typeof children === 'function') {
      return <>{children({ user })}</>;
    }
    return <>{children}</>;
  }

  // Sinon, vérifier le type d'utilisateur requis
  if (userTypeRequired && user?.user_type !== userTypeRequired) {
    return <Navigate to="/" replace />;
  }

  if (typeof children === 'function') {
    return <>{children({ user })}</>;
  }

  return <>{children}</>;
};

export default PrivateRoute;