import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import BookingForm from './pages/BookingForm';
import CustomerDashboard from './pages/CustomerDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TechnicianHome from './pages/TechnicianHome';
import AdminHome from './pages/AdminHome';
import Login from './pages/Login';
import Register from './pages/Register';
import ServiceDetails from './pages/ServiceDetails';
import NotFound from './pages/NotFound';
import MainLayout from './layouts/MainLayout';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import DiagnosticPanel from './components/DiagnosticPanel';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccess from './pages/PaymentSuccess';

// Composant pour vérifier l'environnement de développement
const EnvironmentCheck: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  React.useEffect(() => {
    // Vérifier si l'app est accédée via file:// protocol
    if (window.location.protocol === 'file:') {
      console.warn(
        '⚠️ ATTENTION: Cette application doit être accédée via http://localhost:5173 ' +
        'et non via un fichier local. React Router nécessite un serveur HTTP.'
      );
    }

    // Vérifier si on est sur localhost
    if (!window.location.hostname.includes('localhost') && !window.location.hostname.includes('127.0.0.1')) {
      console.warn(
        '⚠️ ATTENTION: Cette application est conçue pour fonctionner sur localhost. ' +
        'Certaines fonctionnalités peuvent ne pas fonctionner correctement.'
      );
    }
  }, []);

  return <>{children}</>;
};

function App() {
  return (
    <ErrorBoundary>
      <EnvironmentCheck>
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="service/:serviceId" element={<ServiceDetails />} />
            <Route path="booking" element={<BookingForm />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
                <Route path="payment/:transactionId?" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
                <Route path="payment/success" element={<PaymentSuccess />} />
            
            {/* Routes protégées */}
            <Route path="dashboard" element={
              <PrivateRoute>
                {({ user }) => {
                  if (user.is_superuser || user.user_type === 'admin') {
                    return <Navigate to="/admin/dashboard" replace />;
                  }
                  if (user.user_type === 'technician') {
                    return <Navigate to="/technician/dashboard" replace />;
                  }
                  return <CustomerDashboard />;
                }}
              </PrivateRoute>
            } />

            {/* Routes technicien */}
            <Route path="technician" element={
              <PrivateRoute userTypeRequired="technician">
                <TechnicianHome />
              </PrivateRoute>
            } />
            <Route path="technician/dashboard" element={
              <PrivateRoute userTypeRequired="technician">
                <TechnicianDashboard />
              </PrivateRoute>
            } />

            {/* Routes admin */}
            <Route path="admin" element={
              <PrivateRoute>
                {({ user }) => {
                  if (user.is_superuser || user.user_type === 'admin') {
                    return <AdminHome />;
                  }
                  return <Navigate to="/" replace />;
                }}
              </PrivateRoute>
            } />
            <Route path="admin/dashboard" element={
              <PrivateRoute>
                {({ user }) => {
                  if (user.is_superuser || user.user_type === 'admin') {
                    return <AdminDashboard />;
                  }
                  return <Navigate to="/" replace />;
                }}
              </PrivateRoute>
            } />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </Router>

          {/* Panneau de diagnostic (visible en mode développement) */}
          {process.env.NODE_ENV === 'development' && <DiagnosticPanel />}
    </AuthProvider>
      </EnvironmentCheck>
    </ErrorBoundary>
  );
}

export default App;