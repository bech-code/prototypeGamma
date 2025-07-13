import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

const specialiteOptions = [
  { value: '', label: 'Sélectionner une spécialité' },
  { value: 'electricien', label: 'Électricien' },
  { value: 'plombier', label: 'Plombier' },
  { value: 'mecanicien', label: 'Mécanicien' },
  { value: 'informatique', label: 'Informatique' },
  { value: 'climatisation', label: 'Climatisation' },
  { value: 'autre', label: 'Autre' },
];

const HERO_IMAGE = 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?auto=format&fit=crop&w=1500&q=80'; // image en ligne

const Register: React.FC = () => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    user_type: 'client' as 'client' | 'technician' | 'admin',
    phone_number: '',
    address: '',
    first_name: '',
    last_name: '',
    specialty: '',
    years_experience: '',
    phone: '',
    acceptTerms: false,
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pieceIdentite, setPieceIdentite] = useState<File | null>(null);
  const [certificatResidence, setCertificatResidence] = useState<File | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showPassword2, setShowPassword2] = useState(false);

  const { register, user } = useAuth();
  const navigate = useNavigate();

  React.useEffect(() => {
    if (user) {
      switch (user.user_type) {
        case 'admin':
          navigate('/admin/dashboard');
          break;
        case 'technician':
          navigate('/technician/dashboard');
          break;
        case 'client':
        default:
          navigate('/dashboard');
      }
    }
  }, [user, navigate]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, files } = e.target;
    if (name === 'piece_identite' && files && files[0]) {
      setPieceIdentite(files[0]);
    } else if (name === 'certificat_residence' && files && files[0]) {
      setCertificatResidence(files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});
    if (formData.password !== formData.password2) {
      setError('Les mots de passe ne correspondent pas');
      return;
    }
    if (formData.password.length < 12) {
      setError('Le mot de passe doit contenir au moins 12 caractères');
      return;
    }
    if (!formData.first_name.trim()) {
      setError('Le prénom est requis');
      return;
    }
    if (!formData.last_name.trim()) {
      setError('Le nom est requis');
      return;
    }
    // Validation stricte du numéro de téléphone pour client et technicien
    if ((formData.user_type === 'client' || formData.user_type === 'technician')) {
      // Normaliser les espaces : un seul espace entre chaque groupe, pas d'espaces en début/fin
      const normalizedPhone = formData.phone.trim().replace(/\s+/g, ' ');
      // Regex identique au backend
      const phonePattern = /^(\+223\d{8}|\+223( +\d{2}){4})$/;
      if (!normalizedPhone) {
        setError('Le numéro de téléphone est requis');
        return;
      }
      if (!phonePattern.test(normalizedPhone)) {
        setError('Le numéro de téléphone doit être au format +223XXXXXXXX ou +223 XX XX XX XX (8 chiffres après +223)');
        return;
      }
    }
    if (formData.user_type === 'technician' && !formData.specialty) {
      setError('La spécialité est requise pour un technicien');
      return;
    }
    if (!formData.acceptTerms) {
      setError('Vous devez accepter les conditions générales pour continuer');
      return;
    }
    if (formData.user_type === 'technician') {
      if (!pieceIdentite) {
        setError("La pièce d'identité est obligatoire pour les techniciens");
        return;
      }
      if (!certificatResidence) {
        setError("Le certificat de résidence est obligatoire pour les techniciens");
        return;
      }
    }
    setIsLoading(true);
    try {
      const normalizedPhone = formData.phone.trim().replace(/\s+/g, ' ');
      const dataToSend = {
        ...formData,
        years_experience: formData.years_experience ? Number(formData.years_experience) : undefined,
        phone: normalizedPhone, // Toujours envoyer la version normalisée
      };
      let payload: any = dataToSend;
      if (formData.user_type === 'technician') {
        const fd = new FormData();
        Object.entries(dataToSend).forEach(([key, value]) => {
          if (value !== undefined && value !== null) fd.append(key, value as string);
        });
        if (pieceIdentite) fd.append('piece_identite', pieceIdentite);
        if (certificatResidence) fd.append('certificat_residence', certificatResidence);
        payload = fd;
      }
      await register(payload);
      // navigate('/dashboard'); // SUPPRIMÉ : la redirection est gérée par le useEffect
    } catch (err: any) {
      setIsLoading(false);
      let backendDetails = undefined;
      if (err && typeof err === 'object') {
        if ('details' in err && typeof err.details === 'object') {
          backendDetails = err.details;
          setFieldErrors(backendDetails);
        } else if (err.response && err.response.data && typeof err.response.data.details === 'object') {
          backendDetails = err.response.data.details;
          setFieldErrors(backendDetails);
        }
      }
      if (backendDetails) {
        setError('Veuillez corriger les erreurs ci-dessous.');
      } else {
        setError((err && err.message) ? err.message : 'Erreur lors de l\'inscription');
      }
    }
  };

  return (
    <div
      className="min-h-screen bg-cover bg-center flex items-center justify-center"
      style={{ backgroundImage: `url(${HERO_IMAGE})` }}
    >
      <div className="container mx-auto px-4">
        <div className="max-w-md mx-auto bg-white bg-opacity-90 rounded-lg shadow-md overflow-hidden backdrop-blur-md">
          <div className="p-6">
            <h2 className="text-2xl font-bold text-center text-gray-900 mb-6">Créer un compte</h2>

            {error && (
              <div className="mb-4 flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 shadow-sm animate-fade-in">
                <div className="mt-1">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-red-700 text-base mb-1">Erreur lors de l'inscription</div>
                  <div className="text-red-700 text-sm">
                    <span>{error}</span>
                    {Object.keys(fieldErrors).length > 0 && (
                      <ul className="list-disc ml-5 space-y-1 mt-2">
                        {Object.entries(fieldErrors).map(([field, msg]) => (
                          <li key={field}><span className="font-medium">{field} :</span> {msg}</li>
                        ))}
                      </ul>
                    )}
                    <div className="mt-2 text-xs text-gray-600">
                      <ul className="list-disc ml-5">
                        <li>Vérifiez que tous les champs obligatoires sont remplis.</li>
                        <li>Assurez-vous que les fichiers sont au format PDF, JPG ou PNG et non vides.</li>
                        <li>En cas de doute, rechargez la page et réessayez.</li>
                        <li>Si le problème persiste, contactez le support technique avec le message d'erreur affiché.</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="mb-4">
                <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Prénom
                </label>
                <input
                  id="first_name"
                  name="first_name"
                  type="text"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Jean"
                  required
                />
                {fieldErrors['first_name'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['first_name']}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom
                </label>
                <input
                  id="last_name"
                  name="last_name"
                  type="text"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Traoré"
                  required
                />
                {fieldErrors['last_name'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['last_name']}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Nom d'utilisateur
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mamadou"
                  required
                />
                {fieldErrors['username'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['username']}</p>}
              </div>

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
                {fieldErrors['email'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['email']}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="user_type" className="block text-sm font-medium text-gray-700 mb-1">
                  Type de compte
                </label>
                <select
                  id="user_type"
                  name="user_type"
                  value={formData.user_type}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="client">Client</option>
                  <option value="technician">Technicien</option>
                </select>
              </div>

              {/* Champs spécifiques pour technicien */}
              {formData.user_type === 'technician' && (
                <>
                  <div className="mb-4">
                    <label htmlFor="specialty" className="block text-sm font-medium text-gray-700 mb-1">
                      Spécialité <span className="text-red-500">*</span>
                    </label>
                    <select
                      id="specialty"
                      name="specialty"
                      value={formData.specialty}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      {specialiteOptions.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                    {fieldErrors['specialty'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['specialty']}</p>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="years_experience" className="block text-sm font-medium text-gray-700 mb-1">
                      Années d'expérience
                    </label>
                    <input
                      id="years_experience"
                      name="years_experience"
                      type="number"
                      min="0"
                      value={formData.years_experience}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="3"
                    />
                    {fieldErrors['years_experience'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['years_experience']}</p>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                      Numéro de téléphone
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={handleChange}
                      className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="+223 XX XX XX XX"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Format attendu : <span className="font-mono">+223 XX XX XX XX</span> (Mali, X = chiffre)</p>
                    {fieldErrors['phone'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['phone']}</p>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="piece_identite" className="block text-sm font-medium text-gray-700 mb-1">
                      Pièce d'identité (CNI, carte biométrique ou passeport) <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="piece_identite"
                      name="piece_identite"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Format accepté : PDF ou image (JPG, PNG). Ce document reste strictement confidentiel et sert uniquement à la vérification de votre identité.</p>
                    {fieldErrors['piece_identite'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['piece_identite']}</p>}
                  </div>
                  <div className="mb-4">
                    <label htmlFor="certificat_residence" className="block text-sm font-medium text-gray-700 mb-1">
                      Certificat de résidence <span className="text-red-500">*</span>
                    </label>
                    <input
                      id="certificat_residence"
                      name="certificat_residence"
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleFileChange}
                      className="w-full p-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-xs text-gray-500 mt-1">Format accepté : PDF ou image (JPG, PNG). Ce document reste strictement confidentiel et sert uniquement à la vérification de votre résidence.</p>
                    {fieldErrors['certificat_residence'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['certificat_residence']}</p>}
                  </div>
                </>
              )}

              {/* Champ numéro de téléphone pour client et technicien */}
              {(formData.user_type === 'client' || formData.user_type === 'technician') && (
                <div className="mb-4">
                  <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Numéro de téléphone <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="+223 XX XX XX XX"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Format attendu : <span className="font-mono">+223 XX XX XX XX</span> (Mali, X = chiffre)</p>
                  {fieldErrors['phone'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['phone']}</p>}
                </div>
              )}

              <div className="mb-4">
                <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                  Adresse
                </label>
                <input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Kalaban coura, avenue AES"
                  required
                />
                {fieldErrors['address'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['address']}</p>}
              </div>

              <div className="mb-4">
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Mot de passe
                </label>
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
                {fieldErrors['password'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['password']}</p>}
              </div>

              <div className="mb-6">
                <label htmlFor="password2" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmer le mot de passe
                </label>
                <div className="relative">
                  <input
                    id="password2"
                    name="password2"
                    type={showPassword2 ? "text" : "password"}
                    value={formData.password2}
                    onChange={handleChange}
                    className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 focus:outline-none"
                    onClick={() => setShowPassword2((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword2 ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                {fieldErrors['password2'] && <p className="text-xs text-red-600 mt-1">{fieldErrors['password2']}</p>}
              </div>

              <div className="mb-6">
                <div className="flex items-start">
                  <div className="flex items-center h-5">
                    <input
                      id="acceptTerms"
                      name="acceptTerms"
                      type="checkbox"
                      checked={formData.acceptTerms}
                      onChange={(e) => setFormData(prev => ({ ...prev, acceptTerms: e.target.checked }))}
                      className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 focus:ring-2"
                      required
                    />
                  </div>
                  <div className="ml-3 text-sm">
                    <label htmlFor="acceptTerms" className="font-medium text-gray-700">
                      J'accepte les{' '}
                      <a href="/terms" target="_blank" className="text-blue-600 hover:text-blue-500 underline">
                        conditions générales
                      </a>{' '}
                      et la{' '}
                      <a href="/privacy" target="_blank" className="text-blue-600 hover:text-blue-500 underline">
                        politique de confidentialité
                      </a>
                    </label>
                  </div>
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
                    Création du compte...
                  </span>
                ) : 'Créer un compte'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Déjà un compte ?{' '}
                <Link to="/login" className="text-blue-700 hover:text-blue-800 font-medium">
                  Se connecter
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;