import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Home from './pages/Home';
import BookingForm from './pages/BookingForm';
import CustomerDashboard from './pages/CustomerDashboard';
import TechnicianDashboard from './pages/TechnicianDashboard';
import AdminDashboard from './pages/AdminDashboard';
import TechnicianHome from './pages/TechnicianHome';
import AdminHome from './pages/AdminHome';
import Statistics from './pages/Statistics';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import ServiceDetails from './pages/ServiceDetails';
import NotFound from './pages/NotFound';
import MainLayout from './layouts/MainLayout';
import { AuthProvider, AuthContext, useAuth } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import ErrorBoundary from './components/ErrorBoundary';
import DiagnosticPanel from './components/DiagnosticPanel';
import PaymentPage from './pages/PaymentPage';
import PaymentSuccess from './pages/PaymentSuccess';
import Profile from './pages/Profile';
import UserManagement from './pages/UserManagement';
import AdminConfiguration from './pages/AdminConfiguration';
import AdminSubscriptionRequests from './pages/AdminSubscriptionRequests';
import ManualPaymentPage from './pages/ManualPaymentPage';
import ReviewPage from './pages/ReviewPage';
import ChatPage from './pages/ChatPage';
import ChatListPage from './pages/ChatListPage';
import RequestDetailsPage from './pages/RequestDetailsPage';
import { useContext } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import EnhancedStatistics from './pages/EnhancedStatistics';
import ContactSupportForm from './pages/ContactSupportForm';
import FAQPage from './pages/FAQPage';

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

function ProtectedAdminRoute({ children }: { children: JSX.Element }) {
    const context = useContext(AuthContext);
    const { user } = context || {};
    if (!user || !('user_type' in user) || user.user_type !== 'admin') {
        window.location.href = '/?error=Accès%20réservé%20à%20l%27administrateur.';
        return null;
    }
    return children;
}

function App() {
    const { unreadMessagesCount } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <ErrorBoundary>
            <EnvironmentCheck>
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
                        <Route path="admin/statistics" element={
                            <PrivateRoute>
                                {({ user }) => {
                                    if (user.is_superuser || user.user_type === 'admin') {
                                        return <Statistics />;
                                    }
                                    return <Navigate to="/" replace />;
                                }}
                            </PrivateRoute>
                        } />
                        <Route path="admin/enhanced-statistics" element={
                            <PrivateRoute>
                                {({ user }) => (user.is_superuser || user.user_type === 'admin') ? <EnhancedStatistics /> : <Navigate to="/" replace />}
                            </PrivateRoute>
                        } />
                        <Route path="admin/user-management" element={
                            <PrivateRoute>
                                {({ user }) => {
                                    if (user.is_superuser || user.user_type === 'admin') {
                                        return <UserManagement />;
                                    }
                                    return <Navigate to="/" replace />;
                                }}
                            </PrivateRoute>
                        } />
                        <Route path="admin/configuration" element={
                            <PrivateRoute>
                                {({ user }) => {
                                    if (user.is_superuser || user.user_type === 'admin') {
                                        return <AdminConfiguration />;
                                    }
                                    return <Navigate to="/" replace />;
                                }}
                            </PrivateRoute>
                        } />
                        <Route path="admin/subscription-requests" element={
                            <PrivateRoute>
                                {({ user }) => {
                                    if (user.is_superuser || user.user_type === 'admin') {
                                        return <AdminSubscriptionRequests />;
                                    }
                                    return <Navigate to="/" replace />;
                                }}
                            </PrivateRoute>
                        } />
                        <Route path="admin/config" element={<ProtectedAdminRoute><AdminConfiguration /></ProtectedAdminRoute>} />

                        <Route path="profile" element={<PrivateRoute><Profile /></PrivateRoute>} />
                        <Route path="review/:requestId" element={<PrivateRoute><ReviewPage /></PrivateRoute>} />

                        <Route path="forgot-password" element={<ForgotPassword />} />
                        <Route path="reset-password" element={<ResetPassword />} />

                        <Route path="chat/:id" element={<PrivateRoute><ChatPage /></PrivateRoute>} />
                        <Route path="chat" element={<PrivateRoute><ChatListPage /></PrivateRoute>} />
                        <Route path="request/:id" element={<PrivateRoute><RequestDetailsPage /></PrivateRoute>} />

                        {/* Route pour le paiement manuel des techniciens */}
                        <Route path="technician/payment/:requestId" element={
                            <PrivateRoute userTypeRequired="technician">
                                <ManualPaymentPage />
                            </PrivateRoute>
                        } />

                        <Route path="contact-support" element={<ContactSupportForm />} />
                        <Route path="faq" element={<FAQPage />} />

                        <Route path="*" element={<NotFound />} />
                    </Route>
                </Routes>

                {/* Panneau de diagnostic (visible en mode développement) */}
                {process.env.NODE_ENV === 'development' && <DiagnosticPanel />}

                {/* Bouton flottant messages non lus */}
                {unreadMessagesCount > 0 && location.pathname !== '/chat' && (
                    <button
                        onClick={() => navigate('/chat')}
                        className="fixed bottom-6 right-6 z-50 bg-blue-600 hover:bg-blue-700 text-white rounded-full shadow-lg flex items-center justify-center w-16 h-16 transition-colors group"
                        title="Voir les messages"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.77 9.77 0 01-4-.8l-4 1 1-4A8.96 8.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                        <span className="absolute -top-2 -right-2 bg-red-600 text-white text-xs rounded-full px-2 py-0.5 font-bold animate-bounce">
                            {unreadMessagesCount}
                        </span>
                    </button>
                )}
            </EnvironmentCheck>
        </ErrorBoundary>
    );
}

export default App;