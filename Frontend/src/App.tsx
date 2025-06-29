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
import PaymentPage from './pages/PaymentPage';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Home />} />
            <Route path="service/:serviceId" element={<ServiceDetails />} />
            <Route path="booking" element={<BookingForm />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="payment" element={<PrivateRoute><PaymentPage /></PrivateRoute>} />
            
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
    </AuthProvider>
  );
}

export default App;