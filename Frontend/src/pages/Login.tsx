import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Eye, EyeOff } from 'lucide-react';

const HERO_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80'; // même image que Register

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
    console.log('Formulaire soumis', formData); // LOG AJOUTÉ POUR DEBUG
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
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${HERO_IMAGE})` }}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto bg-white bg-opacity-90 rounded-lg shadow-md overflow-hidden backdrop-blur-md">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Connexion</h2>
            {showRedirectToast && (
              <div className="mb-4 bg-green-50 border-l-4 border-green-500 p-4 animate-fade-in">
                <p className="text-green-700 font-semibold">{showRedirectToast}</p>
              </div>
            )}

            {(error || authError) && (
              <div className="mb-4 bg-red-50 border-l-4 border-red-500 p-4">
                <p className="text-red-700">{error || authError}</p>
              </div>
            )}

            {otpRequired && (
              <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                <div className="bg-white rounded-lg shadow-lg p-8 max-w-sm w-full relative">
                  <h3 className="text-lg font-semibold mb-4 text-center">Vérification de sécurité</h3>
                  <p className="mb-2 text-gray-700 text-center">Un code de sécurité a été envoyé à votre adresse email.<br />Veuillez le saisir pour continuer.</p>
                  <form onSubmit={handleOtpSubmit} className="mt-4">
                    <input
                      type="text"
                      value={otp}
                      onChange={e => setOtp(e.target.value)}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
                      placeholder="Code OTP"
                      required
                      autoFocus
                    />
                    {otpError && <div className="text-red-600 text-sm mb-2">{otpError}</div>}
                    <button
                      type="submit"
                      disabled={otpLoading || !otp}
                      className="w-full bg-blue-700 text-white py-2 rounded-md font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-blue-300 disabled:cursor-not-allowed"
                    >
                      {otpLoading ? 'Vérification...' : 'Valider'}
                    </button>
                  </form>
                  <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-700"
                    onClick={() => window.location.reload()}
                    title="Annuler la vérification"
                  >
                    ×
                  </button>
                </div>
              </div>
            )}

            {!otpRequired && (
              <form onSubmit={handleSubmit}>
                <div className="mb-4">
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Adresse email
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="nom@exemple.com"
                    required
                  />
                </div>

                <div className="mb-6">
                  <div className="flex justify-between items-center mb-1">
                    <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                      Mot de passe
                    </label>
                    <Link to="/forgot-password" className="text-sm text-blue-700 hover:text-blue-800">
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
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 focus:outline-none"
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
                  className="w-full bg-blue-700 text-white py-3 rounded-md font-medium hover:bg-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Connexion...
                    </span>
                  ) : 'Se connecter'}
                </button>
              </form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Pas encore de compte ?{' '}
                <Link to="/register" className="text-blue-700 hover:text-blue-800 font-medium">
                  S'inscrire
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;