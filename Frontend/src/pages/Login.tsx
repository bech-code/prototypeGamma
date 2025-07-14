import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff, Mail, Shield, Lock, ArrowRight, CheckCircle, AlertCircle, X } from 'lucide-react';

const Login: React.FC = () => {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { login, user, otpRequired, verifyOtp, otpToken, pendingEmail, error: authError, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const params = new URLSearchParams(location.search);
  const redirectTo = params.get('redirect') || '/dashboard';

  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState<string | null>(null);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showRedirectToast, setShowRedirectToast] = useState<string | null>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Formulaire soumis', formData);
    console.log('Email:', formData.email, 'Password:', formData.password ? '***' : 'VIDE');
    console.log('Email length:', formData.email.length, 'Password length:', formData.password.length);

    if (!formData.email || !formData.password) {
      setError('Veuillez remplir tous les champs');
      return;
    }

    setError(null);
    setIsLoading(true);
    try {
      await login(formData.email, formData.password);
      // La redirection sera gérée par le useEffect ci-dessous
    } catch (err) {
      console.error('Erreur de login:', err);
      setError(err instanceof Error ? err.message : 'Identifiants invalides');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError(null);
    setOtpLoading(true);
    try {
      await verifyOtp(otp);
      setOtp('');
    } catch (err) {
      setOtpError('Code OTP invalide ou expiré');
    } finally {
      setOtpLoading(false);
    }
  };

  // Gérer la redirection après la connexion
  React.useEffect(() => {
    if (user) {
      let destination = '/dashboard';
      let label = 'Tableau de bord';
      switch (user?.user_type) {
        case 'admin':
          destination = '/admin/dashboard';
          label = 'Tableau de bord administrateur';
          break;
        case 'technician':
          destination = '/technician/dashboard';
          label = 'Tableau de bord technicien';
          break;
        case 'client':
          destination = '/dashboard';
          label = 'Tableau de bord client';
          break;
        default:
          destination = '/dashboard';
          label = 'Tableau de bord';
      }
      setShowRedirectToast(`Connexion réussie ! Redirection vers le ${label}...`);
      setTimeout(() => {
        setShowRedirectToast(null);
        navigate(destination);
      }, 1200);
    }
  }, [user, navigate, redirectTo]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-8">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">Bienvenue sur DepanneTeliman</h1>
            <p className="text-gray-600 text-lg">Connectez-vous à votre compte pour accéder à nos services</p>
          </div>

          {/* Main Form Container */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-8 h-8 text-blue-600" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Connexion</h2>
                <p className="text-gray-600">Entrez vos identifiants pour accéder à votre compte</p>
              </div>

              {/* Success Toast */}
              {showRedirectToast && (
                <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-green-50 border border-green-200 shadow-sm">
                  <CheckCircle className="w-6 h-6 text-green-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-green-700 text-base mb-1">Connexion réussie !</div>
                    <div className="text-green-700 text-sm">{showRedirectToast}</div>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {(error || authError) && (
                <div className="mb-6 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 shadow-sm">
                  <AlertCircle className="w-6 h-6 text-red-500 mt-1 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-semibold text-red-700 text-base mb-1">Erreur de connexion</div>
                    <div className="text-red-700 text-sm">{error || authError}</div>
                  </div>
                </div>
              )}

              {/* OTP Modal */}
              {otpRequired && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
                  <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 relative">
                    <div className="text-center mb-6">
                      <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Shield className="w-6 h-6 text-blue-600" />
                      </div>
                      <h3 className="text-xl font-bold text-gray-900 mb-2">Vérification de sécurité</h3>
                      <p className="text-gray-600 text-sm">
                        Un code de sécurité a été envoyé à votre adresse email.<br />
                        Veuillez le saisir pour continuer.
                      </p>
                    </div>

                    <form onSubmit={handleOtpSubmit} className="space-y-4">
                      <div className="space-y-2">
                        <label htmlFor="otp" className="flex items-center text-sm font-medium text-gray-700">
                          <Shield className="w-4 h-4 mr-2" />
                          Code de sécurité
                        </label>
                        <input
                          id="otp"
                          type="text"
                          value={otp}
                          onChange={e => setOtp(e.target.value)}
                          className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                          placeholder="Entrez le code à 6 chiffres"
                          required
                          autoFocus
                          maxLength={6}
                        />
                        {otpError && (
                          <div className="flex items-center gap-2 text-red-600 text-sm">
                            <AlertCircle className="w-4 h-4" />
                            {otpError}
                          </div>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={otpLoading || !otp}
                        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-200"
                      >
                        {otpLoading ? (
                          <span className="flex items-center justify-center">
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Vérification...
                          </span>
                        ) : (
                          <span className="flex items-center justify-center">
                            Valider
                            <ArrowRight className="ml-2 w-4 h-4" />
                          </span>
                        )}
                      </button>
                    </form>

                    <button
                      className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-all duration-200"
                      onClick={() => window.location.reload()}
                      title="Annuler la vérification"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Login Form */}
              {!otpRequired && (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <label htmlFor="email" className="flex items-center text-sm font-medium text-gray-700">
                      <Mail className="w-4 h-4 mr-2" />
                      Adresse email
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      placeholder="nom@exemple.com"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label htmlFor="password" className="flex items-center text-sm font-medium text-gray-700">
                        <Shield className="w-4 h-4 mr-2" />
                        Mot de passe
                      </label>
                      <Link 
                        to="/forgot-password" 
                        className="text-sm text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                      >
                        Mot de passe oublié ?
                      </Link>
                    </div>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        value={formData.password}
                        onChange={handleChange}
                        className="w-full p-4 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 pr-12"
                        placeholder="••••••••••••"
                        required
                      />
                      <button
                        type="button"
                        className="absolute inset-y-0 right-0 flex items-center px-4 text-gray-500 hover:text-gray-700 focus:outline-none transition-colors duration-200"
                        onClick={() => setShowPassword((v) => !v)}
                        tabIndex={-1}
                      >
                        {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                      </button>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full bg-blue-600 text-white py-4 rounded-lg font-medium hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed transition-all duration-200"
                  >
                    {isLoading ? (
                      <span className="flex items-center justify-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Connexion en cours...
                      </span>
                    ) : (
                      <span className="flex items-center justify-center">
                        Se connecter
                        <ArrowRight className="ml-2 w-4 h-4" />
                      </span>
                    )}
                  </button>
                </form>
              )}

              {/* Footer */}
              <div className="mt-8 pt-6 border-t border-gray-200">
                <div className="text-center">
                  <p className="text-sm text-gray-600">
                    Pas encore de compte ?{' '}
                    <Link 
                      to="/register" 
                      className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                    >
                      Créer un compte
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Info */}
          <div className="mt-8 text-center">
            <div className="bg-blue-50 rounded-xl p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-2">Besoin d'aide ?</h3>
              <p className="text-blue-700 text-sm mb-4">
                Si vous rencontrez des difficultés pour vous connecter, contactez notre support technique.
              </p>
              <div className="flex justify-center space-x-4 text-sm">
                <Link 
                  to="/contact" 
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                >
                  Contact Support
                </Link>
                <span className="text-blue-400">•</span>
                <Link 
                  to="/faq" 
                  className="text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
                >
                  FAQ
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;