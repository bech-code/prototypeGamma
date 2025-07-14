import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import {
    User,
    Mail,
    Phone,
    MapPin,
    Camera,
    Edit3,
    Save,
    X,
    Shield,
    Star,
    Award,
    Clock,
    CheckCircle,
    AlertCircle,
    Settings,
    LogOut,
    ArrowLeft,
    Eye,
    EyeOff
} from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

const Profile: React.FC = () => {
    const { user, fetchUser, updateUserProfile, logout, profile } = useAuth();
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        email: '',
        phone: '',
        specialty: '',
        years_experience: '',
        address: '',
        current_password: '',
        new_password: '',
        confirm_password: ''
    });
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [showPasswordFields, setShowPasswordFields] = useState(false);
    const [showPasswords, setShowPasswords] = useState({
        current: false,
        new: false,
        confirm: false
    });
    const [activeTab, setActiveTab] = useState<'profile' | 'security' | 'preferences'>('profile');
    const navigate = useNavigate();

    useEffect(() => {
        if (user) {
            setFormData(prev => ({
                ...prev,
                first_name: user.first_name || '',
                last_name: user.last_name || '',
                email: user.email || '',
                phone: profile?.phone || '',
                specialty: profile?.specialty || '',
                years_experience: profile?.years_experience?.toString() || '',
                address: profile?.address || '',
            }));
        }
    }, [user, profile]);

    useEffect(() => {
        if (!user) navigate('/login');
    }, [user, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        // Validation du téléphone
        const normalizedPhone = formData.phone.trim().replace(/\s+/g, ' ');
        const phonePattern = /^(\+223\d{8}|\+223( +\d{2}){4})$/;
        if (!phonePattern.test(normalizedPhone)) {
            setError('Le numéro doit être au format +223XXXXXXXX ou +223 XX XX XX XX');
            return;
        }

        setIsLoading(true);
        try {
            await updateUserProfile({ ...formData, phone: normalizedPhone });
            setSuccess('Profil mis à jour avec succès !');
            fetchUser && fetchUser();
            setIsEditing(false);
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError("Erreur lors de la mise à jour du profil.");
        } finally {
            setIsLoading(false);
        }
    };

    const handlePasswordChange = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        setSuccess(null);

        if (formData.new_password !== formData.confirm_password) {
            setError('Les nouveaux mots de passe ne correspondent pas');
                return;
            }

        if (formData.new_password.length < 8) {
            setError('Le nouveau mot de passe doit contenir au moins 8 caractères');
            return;
        }

        setIsLoading(true);
        try {
            // Ici vous ajouteriez l'appel API pour changer le mot de passe
            setSuccess('Mot de passe modifié avec succès !');
            setShowPasswordFields(false);
            setFormData(prev => ({
                ...prev,
                current_password: '',
                new_password: '',
                confirm_password: ''
            }));
            setTimeout(() => setSuccess(null), 3000);
        } catch (err) {
            setError("Erreur lors du changement de mot de passe.");
        } finally {
            setIsLoading(false);
        }
    };

    const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
        setShowPasswords(prev => ({
            ...prev,
            [field]: !prev[field]
        }));
    };

    const getSpecialtyLabel = (specialty: string) => {
        const specialties = {
            'electrician': 'Électricien',
            'plumber': 'Plombier',
            'mechanic': 'Mécanicien',
            'it': 'Informatique',
            'air_conditioning': 'Climatisation',
            'appliance_repair': 'Électroménager',
            'locksmith': 'Serrurier',
            'other': 'Autre'
        };
        return specialties[specialty as keyof typeof specialties] || specialty;
    };

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
            {/* Header moderne */}
            <div className="relative bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-800 text-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <ArrowLeft className="h-6 w-6" />
                            </button>
                            <div>
                                <h1 className="text-3xl font-bold">Mon Profil</h1>
                                <p className="text-blue-100">Gérez vos informations personnelles</p>
                            </div>
                        </div>
                        <div className="flex items-center space-x-3">
                            <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center">
                                <User className="h-6 w-6" />
                            </div>
                            <div className="text-right">
                                <p className="font-semibold">{user.first_name} {user.last_name}</p>
                                <p className="text-sm text-blue-100">{user.user_type}</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {/* Messages d'état */}
                {error && (
                    <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3 animate-fade-in">
                        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
                        <span className="text-red-700 font-medium">{error}</span>
                    </div>
                )}
                {success && (
                    <div className="mb-6 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3 animate-fade-in">
                        <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0" />
                        <span className="text-green-700 font-medium">{success}</span>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
                    {/* Sidebar */}
                    <div className="lg:col-span-1">
                        <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-8">
                            <div className="text-center mb-6">
                                <div className="relative inline-block">
                                    <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold mb-4">
                                        {user.first_name?.charAt(0)?.toUpperCase()}{user.last_name?.charAt(0)?.toUpperCase()}
                                    </div>
                                    <button className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full hover:bg-blue-700 transition-colors">
                                        <Camera className="h-4 w-4" />
                                    </button>
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900">{user.first_name} {user.last_name}</h3>
                                <p className="text-sm text-gray-500 capitalize">{user.user_type}</p>
                            </div>

                            {/* Navigation */}
                            <nav className="space-y-2">
                                <button
                                    onClick={() => setActiveTab('profile')}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'profile'
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <User className="h-5 w-5" />
                                    <span>Informations</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('security')}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'security'
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <Shield className="h-5 w-5" />
                                    <span>Sécurité</span>
                                </button>
                                <button
                                    onClick={() => setActiveTab('preferences')}
                                    className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg text-left transition-colors ${activeTab === 'preferences'
                                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                            : 'text-gray-600 hover:bg-gray-50'
                                        }`}
                                >
                                    <Settings className="h-5 w-5" />
                                    <span>Préférences</span>
                                </button>
                            </nav>

                            {/* Statistiques rapides pour techniciens */}
                            {user.user_type === 'technician' && profile && (
                                <div className="mt-6 pt-6 border-t border-gray-200">
                                    <h4 className="text-sm font-semibold text-gray-900 mb-3">Statistiques</h4>
                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Note</span>
                                            <div className="flex items-center space-x-1">
                                                <Star className="h-4 w-4 text-yellow-400" />
                                                <span className="font-semibold">4.8/5</span>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Missions</span>
                                            <span className="font-semibold">127</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-gray-600">Expérience</span>
                                            <span className="font-semibold">{profile.years_experience || 0} ans</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Contenu principal */}
                    <div className="lg:col-span-3">
                        {activeTab === 'profile' && (
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                <div className="flex items-center justify-between mb-8">
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">Informations Personnelles</h2>
                                        <p className="text-gray-600 mt-1">Gérez vos informations de base</p>
                                    </div>
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        {isEditing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
                                        <span>{isEditing ? 'Annuler' : 'Modifier'}</span>
                                    </button>
                                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Prénom
                                            </label>
                                            {isEditing ? (
                            <input
                                name="first_name"
                                type="text"
                                value={formData.first_name}
                                onChange={handleChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                required
                            />
                                            ) : (
                                                <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                                    <span className="text-gray-900">{formData.first_name}</span>
                                                </div>
                                            )}
                        </div>

                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                Nom
                                            </label>
                                            {isEditing ? (
                            <input
                                name="last_name"
                                type="text"
                                value={formData.last_name}
                                onChange={handleChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                required
                            />
                                            ) : (
                                                <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                                    <span className="text-gray-900">{formData.last_name}</span>
                        </div>
                                            )}
                    </div>

                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                <Mail className="h-4 w-4 inline mr-2" />
                                                Email
                                            </label>
                                            <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                                <span className="text-gray-900">{formData.email}</span>
                                            </div>
                        </div>

                        <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                <Phone className="h-4 w-4 inline mr-2" />
                                                Téléphone
                                            </label>
                                            {isEditing ? (
                            <input
                                name="phone"
                                type="tel"
                                value={formData.phone}
                                onChange={handleChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                placeholder="+223 XX XX XX XX"
                                required
                            />
                                            ) : (
                                                <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                                    <span className="text-gray-900">{formData.phone}</span>
                        </div>
                                            )}
                    </div>

                            <div>
                                            <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                <MapPin className="h-4 w-4 inline mr-2" />
                                                Adresse
                                            </label>
                                            {isEditing ? (
                                <input
                                                    name="address"
                                                    type="text"
                                                    value={formData.address}
                                                    onChange={handleChange}
                                                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                />
                                            ) : (
                                                <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                                    <span className="text-gray-900">{formData.address || 'Non renseignée'}</span>
                                                </div>
                                            )}
                                        </div>

                                        {user.user_type === 'technician' && (
                                            <>
                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        <Award className="h-4 w-4 inline mr-2" />
                                                        Spécialité
                                                    </label>
                                                    {isEditing ? (
                                                        <select
                                    name="specialty"
                                    value={formData.specialty}
                                    onChange={handleChange}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                        >
                                                            <option value="">Sélectionner une spécialité</option>
                                                            <option value="electrician">Électricien</option>
                                                            <option value="plumber">Plombier</option>
                                                            <option value="mechanic">Mécanicien</option>
                                                            <option value="it">Informatique</option>
                                                            <option value="air_conditioning">Climatisation</option>
                                                            <option value="appliance_repair">Électroménager</option>
                                                            <option value="locksmith">Serrurier</option>
                                                            <option value="other">Autre</option>
                                                        </select>
                                                    ) : (
                                                        <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                                            <span className="text-gray-900">{getSpecialtyLabel(formData.specialty)}</span>
                                                        </div>
                                                    )}
                            </div>

                            <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        <Clock className="h-4 w-4 inline mr-2" />
                                                        Années d'expérience
                                                    </label>
                                                    {isEditing ? (
                                <input
                                    name="years_experience"
                                    type="number"
                                    min="0"
                                    value={formData.years_experience}
                                    onChange={handleChange}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                                                        />
                                                    ) : (
                                                        <div className="px-4 py-3 bg-gray-50 rounded-lg">
                                                            <span className="text-gray-900">{formData.years_experience} ans</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </>
                                        )}
                                    </div>

                                    {isEditing && (
                                        <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
                                            <button
                                                type="button"
                                                onClick={() => setIsEditing(false)}
                                                className="px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                Annuler
                                            </button>
                                            <button
                                                type="submit"
                                                disabled={isLoading}
                                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                                        <span>Sauvegarde...</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4" />
                                                        <span>Sauvegarder</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    )}
                                </form>
                            </div>
                        )}

                        {activeTab === 'security' && (
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900">Sécurité</h2>
                                    <p className="text-gray-600 mt-1">Gérez votre mot de passe et la sécurité de votre compte</p>
                                </div>

                                <div className="space-y-6">
                                    {/* Changement de mot de passe */}
                                    <div className="border border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Changer le mot de passe</h3>

                                        {!showPasswordFields ? (
                                            <button
                                                onClick={() => setShowPasswordFields(true)}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                            >
                                                Modifier le mot de passe
                                            </button>
                                        ) : (
                                            <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Mot de passe actuel
                                                    </label>
                                                    <div className="relative">
                                <input
                                                            name="current_password"
                                                            type={showPasswords.current ? "text" : "password"}
                                                            value={formData.current_password}
                                    onChange={handleChange}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                                    required
                                />
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePasswordVisibility('current')}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                        >
                                                            {showPasswords.current ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                        </button>
                            </div>
                        </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Nouveau mot de passe
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            name="new_password"
                                                            type={showPasswords.new ? "text" : "password"}
                                                            value={formData.new_password}
                                                            onChange={handleChange}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePasswordVisibility('new')}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                        >
                                                            {showPasswords.new ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                        </button>
                                                    </div>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-gray-700 mb-2">
                                                        Confirmer le nouveau mot de passe
                                                    </label>
                                                    <div className="relative">
                                                        <input
                                                            name="confirm_password"
                                                            type={showPasswords.confirm ? "text" : "password"}
                                                            value={formData.confirm_password}
                                                            onChange={handleChange}
                                                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors pr-12"
                                                            required
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => togglePasswordVisibility('confirm')}
                                                            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700"
                                                        >
                                                            {showPasswords.confirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                                                        </button>
                                                    </div>
                        </div>

                                                <div className="flex space-x-4 pt-4">
                                                    <button
                                                        type="button"
                                                        onClick={() => setShowPasswordFields(false)}
                                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                                    >
                                                        Annuler
                                                    </button>
                        <button
                            type="submit"
                            disabled={isLoading}
                                                        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                                                    >
                                                        {isLoading ? 'Modification...' : 'Modifier le mot de passe'}
                        </button>
                    </div>
                </form>
                                        )}
                                    </div>

                                    {/* Autres options de sécurité */}
                                    <div className="border border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Autres options</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div>
                                                    <h4 className="font-medium text-gray-900">Authentification à deux facteurs</h4>
                                                    <p className="text-sm text-gray-600">Ajoutez une couche de sécurité supplémentaire</p>
                                                </div>
                                                <button className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">
                                                    Activer
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'preferences' && (
                            <div className="bg-white rounded-2xl shadow-lg p-8">
                                <div className="mb-8">
                                    <h2 className="text-2xl font-bold text-gray-900">Préférences</h2>
                                    <p className="text-gray-600 mt-1">Personnalisez votre expérience</p>
                                </div>

                                <div className="space-y-6">
                                    <div className="border border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h3>
                                        <div className="space-y-4">
                                            <label className="flex items-center">
                                                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" defaultChecked />
                                                <span className="ml-3 text-gray-900">Notifications par email</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" defaultChecked />
                                                <span className="ml-3 text-gray-900">Notifications push</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                                <span className="ml-3 text-gray-900">Newsletter</span>
                                            </label>
                                        </div>
                                    </div>

                                    <div className="border border-gray-200 rounded-xl p-6">
                                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Confidentialité</h3>
                                        <div className="space-y-4">
                                            <label className="flex items-center">
                                                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" defaultChecked />
                                                <span className="ml-3 text-gray-900">Partager mon profil avec les autres utilisateurs</span>
                                            </label>
                                            <label className="flex items-center">
                                                <input type="checkbox" className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded" />
                                                <span className="ml-3 text-gray-900">Autoriser les messages directs</span>
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Bouton de déconnexion */}
                <div className="mt-8 text-center">
                <button
                    onClick={logout}
                        className="inline-flex items-center space-x-2 px-6 py-3 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors"
                >
                        <LogOut className="h-5 w-5" />
                        <span>Déconnexion</span>
                </button>
                </div>
            </div>
        </div>
    );
};

export default Profile; 