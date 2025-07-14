import React, { useState, useEffect } from 'react';
import {
    User,
    Camera,
    Edit3,
    Save,
    Download,
    Star,
    Shield,
    FileText,
    MapPin,
    Phone,
    Mail,
    Award,
    Clock,
    CheckCircle,
    AlertCircle,
    X,
    Eye,
    EyeOff,
    TrendingUp,
    Calendar,
    DollarSign,
    Zap
} from 'lucide-react';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface TechnicianProfile {
    id: number;
    user: {
        first_name: string;
        last_name: string;
        email: string;
        username: string;
    };
    phone: string;
    specialty: string;
    years_experience: number;
    average_rating: number;
    total_jobs_completed: number;
    is_verified: boolean;
    kyc_document?: string;
    address: string;
    hourly_rate: number;
    bio?: string;
    profile_picture?: string;
}

interface TechnicianProfileProps {
    technicianId: number;
}

const TechnicianProfile: React.FC<TechnicianProfileProps> = ({ technicianId }) => {
    const [profile, setProfile] = useState<TechnicianProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [editing, setEditing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [kycFile, setKycFile] = useState<File | null>(null);
    const [activeTab, setActiveTab] = useState<'overview' | 'documents' | 'settings'>('overview');

    // Form data
    const [formData, setFormData] = useState({
        first_name: '',
        last_name: '',
        phone: '',
        specialty: '',
        years_experience: 0,
        address: '',
        hourly_rate: 0,
        bio: ''
    });

    useEffect(() => {
        fetchProfile();
    }, [technicianId]);

    const fetchProfile = async () => {
        try {
            setLoading(true);
            setError(null);

            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/`);

            if (response.ok) {
                const data = await response.json();
                setProfile(data);
                setFormData({
                    first_name: data.user?.first_name || '',
                    last_name: data.user?.last_name || '',
                    phone: data.phone || '',
                    specialty: data.specialty || '',
                    years_experience: data.years_experience || 0,
                    address: data.address || '',
                    hourly_rate: data.hourly_rate || 0,
                    bio: data.bio || ''
                });
            } else if (response.status === 404) {
                setError('Profil technicien non trouvé');
            } else if (response.status === 403) {
                setError('Vous n\'avez pas les permissions pour accéder à ce profil');
            } else {
                const errorData = await response.json();
                setError(errorData.error || `Erreur ${response.status}: ${response.statusText}`);
            }
        } catch (err) {
            console.error('Erreur lors du chargement du profil:', err);
            setError('Erreur réseau lors du chargement du profil');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field: string, value: any) => {
        setFormData(prev => ({
            ...prev,
            [field]: value
        }));
    };

    const handleSaveProfile = async () => {
        try {
            setSaving(true);
            setError(null);
            setSuccess(null);

            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData),
            });

            if (response.ok) {
                setSuccess('Profil mis à jour avec succès !');
                setEditing(false);
                fetchProfile(); // Recharger les données
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors de la mise à jour du profil');
            }
        } catch (err) {
            console.error('Erreur lors de la sauvegarde:', err);
            setError('Erreur réseau lors de la sauvegarde');
        } finally {
            setSaving(false);
        }
    };

    const handleProfilePictureUpload = async () => {
        if (!selectedFile) return;

        try {
            setSaving(true);
            setError(null);

            const formData = new FormData();
            formData.append('profile_picture', selectedFile);

            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/upload_photo/`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setSuccess('Photo de profil mise à jour avec succès !');
                setSelectedFile(null);
                fetchProfile();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors du téléchargement de la photo');
            }
        } catch (err) {
            console.error('Erreur lors du téléchargement:', err);
            setError('Erreur réseau lors du téléchargement');
        } finally {
            setSaving(false);
        }
    };

    const handleKycUpload = async () => {
        if (!kycFile) return;

        try {
            setSaving(true);
            setError(null);

            const formData = new FormData();
            formData.append('kyc_document', kycFile);

            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/upload_kyc/`, {
                method: 'POST',
                body: formData,
            });

            if (response.ok) {
                setSuccess('Document KYC téléchargé avec succès !');
                setKycFile(null);
                fetchProfile();
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors du téléchargement du document');
            }
        } catch (err) {
            console.error('Erreur lors du téléchargement:', err);
            setError('Erreur réseau lors du téléchargement');
        } finally {
            setSaving(false);
        }
    };

    const downloadReceipts = async () => {
        try {
            setSaving(true);
            setError(null);

            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/download_receipts/`);

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `recus_${profile?.user?.username || 'technicien'}.zip`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                setSuccess('Téléchargement des reçus réussi !');
                setTimeout(() => setSuccess(null), 3000);
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors du téléchargement des reçus');
            }
        } catch (err) {
            console.error('Erreur lors du téléchargement:', err);
            setError('Erreur réseau lors du téléchargement');
        } finally {
            setSaving(false);
        }
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

    if (loading) {
        return (
            <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                    <AlertCircle className="h-6 w-6 text-red-500" />
                    <div>
                        <h3 className="text-lg font-semibold text-red-800">Erreur</h3>
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6">
                <div className="flex items-center space-x-3">
                    <AlertCircle className="h-6 w-6 text-yellow-500" />
                    <div>
                        <h3 className="text-lg font-semibold text-yellow-800">Profil non trouvé</h3>
                        <p className="text-yellow-700">Le profil technicien demandé n'existe pas.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Messages d'état */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center space-x-3 animate-fade-in">
                    <AlertCircle className="h-5 w-5 text-red-500" />
                    <span className="text-red-700 font-medium">{error}</span>
                </div>
            )}
            {success && (
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 flex items-center space-x-3 animate-fade-in">
                    <CheckCircle className="h-5 w-5 text-green-500" />
                    <span className="text-green-700 font-medium">{success}</span>
                </div>
            )}

            {/* Navigation par onglets */}
            <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-8 px-6" role="tablist">
                        <button
                            onClick={() => setActiveTab('overview')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'overview'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <User className="h-4 w-4 inline mr-2" />
                            Aperçu
                        </button>
                        <button
                            onClick={() => setActiveTab('documents')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'documents'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <FileText className="h-4 w-4 inline mr-2" />
                            Documents
                        </button>
                    <button
                            onClick={() => setActiveTab('settings')}
                            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === 'settings'
                                    ? 'border-blue-500 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                                }`}
                        >
                            <Shield className="h-4 w-4 inline mr-2" />
                            Paramètres
                    </button>
                    </nav>
                </div>

                <div className="p-6">
                    {activeTab === 'overview' && (
                        <div className="space-y-6">
                            {/* En-tête avec photo et actions */}
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-6">
                                    <div className="relative">
                                        <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-2xl font-bold">
                                {profile.profile_picture ? (
                                    <img
                                        src={profile.profile_picture}
                                        alt="Photo de profil"
                                                    className="w-full h-full object-cover rounded-full"
                                    />
                                ) : (
                                                `${profile.user?.first_name?.charAt(0)?.toUpperCase()}${profile.user?.last_name?.charAt(0)?.toUpperCase()}`
                                )}
                            </div>
                            {editing && (
                                            <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700 transition-colors">
                                    <Camera className="h-4 w-4" />
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                        className="hidden"
                                    />
                                </label>
                            )}
                        </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">
                                            {profile.user?.first_name} {profile.user?.last_name}
                                        </h2>
                                        <p className="text-gray-600">{getSpecialtyLabel(profile.specialty)}</p>
                                        <div className="flex items-center space-x-4 mt-2">
                                            <div className="flex items-center space-x-1">
                                                <Star className="h-4 w-4 text-yellow-400" />
                                                <span className="text-sm font-medium">
                                                    {profile.average_rating > 0 ? `${profile.average_rating.toFixed(1)}/5` : 'Aucune note'}
                                                </span>
                                            </div>
                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${profile.is_verified
                                                    ? 'bg-green-100 text-green-800'
                                                    : 'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {profile.is_verified ? 'Vérifié' : 'En attente'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex space-x-3">
                                    {editing ? (
                                        <>
                                            <button
                                                onClick={() => setEditing(false)}
                                                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                                            >
                                                <X className="h-4 w-4 inline mr-2" />
                                                Annuler
                                            </button>
                                            <button
                                                onClick={handleSaveProfile}
                                                disabled={saving}
                                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                                            >
                                                {saving ? (
                                                    <>
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                                        Sauvegarde...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Save className="h-4 w-4 mr-2" />
                                                        Sauvegarder
                                                    </>
                                                )}
                                            </button>
                                        </>
                                    ) : (
                            <button
                                            onClick={() => setEditing(true)}
                                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                            >
                                            <Edit3 className="h-4 w-4 inline mr-2" />
                                            Modifier
                            </button>
                        )}
                    </div>
                            </div>

                            {/* Statistiques */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between">
                            <div>
                                            <p className="text-blue-100 text-sm">Missions terminées</p>
                                            <p className="text-2xl font-bold">{profile.total_jobs_completed || 0}</p>
                                        </div>
                                        <TrendingUp className="h-8 w-8 text-blue-200" />
                            </div>
                            </div>
                                <div className="bg-gradient-to-r from-green-500 to-green-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between">
                            <div>
                                            <p className="text-green-100 text-sm">Note moyenne</p>
                                            <p className="text-2xl font-bold">
                                                {profile.average_rating > 0 ? profile.average_rating.toFixed(1) : 'N/A'}
                                </p>
                            </div>
                                        <Star className="h-8 w-8 text-green-200" />
                                    </div>
                                </div>
                                <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between">
                            <div>
                                            <p className="text-purple-100 text-sm">Expérience</p>
                                            <p className="text-2xl font-bold">{profile.years_experience} ans</p>
                                        </div>
                                        <Calendar className="h-8 w-8 text-purple-200" />
                            </div>
                            </div>
                                <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl p-4 text-white">
                                    <div className="flex items-center justify-between">
                            <div>
                                            <p className="text-orange-100 text-sm">Tarif horaire</p>
                                            <p className="text-2xl font-bold">{profile.hourly_rate} FCFA</p>
                            </div>
                                        <DollarSign className="h-8 w-8 text-orange-200" />
                            </div>
                        </div>
                            </div>

                            {/* Informations détaillées */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <User className="h-5 w-5 mr-2 text-blue-600" />
                                        Informations personnelles
                                    </h3>
                                    <div className="space-y-3">
                                        <div className="flex items-center space-x-3">
                                            <Mail className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-900">{profile.user?.email}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <Phone className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-900">{profile.phone}</span>
                                        </div>
                                        <div className="flex items-center space-x-3">
                                            <MapPin className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-900">{profile.address}</span>
                            </div>
                                        <div className="flex items-center space-x-3">
                                            <Award className="h-4 w-4 text-gray-500" />
                                            <span className="text-gray-900">{getSpecialtyLabel(profile.specialty)}</span>
                    </div>
                </div>
            </div>

                                <div className="bg-gray-50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                                        <Zap className="h-5 w-5 mr-2 text-blue-600" />
                                        Performance
                                    </h3>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Missions terminées</span>
                            <span className="font-semibold">{profile.total_jobs_completed || 0}</span>
                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Note moyenne</span>
                                            <span className="font-semibold">
                                                {profile.average_rating > 0 ? `${profile.average_rating.toFixed(1)}/5` : 'Aucune note'}
                                            </span>
                                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Années d'expérience</span>
                                            <span className="font-semibold">{profile.years_experience} ans</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tarif horaire</span>
                                            <span className="font-semibold">{profile.hourly_rate} FCFA/h</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Statut</span>
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${profile.is_verified
                                ? 'bg-green-100 text-green-800'
                                : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {profile.is_verified ? 'Vérifié' : 'En attente'}
                            </span>
                                        </div>
                        </div>
                    </div>
                </div>

                            {/* Bio */}
                            {profile.bio && (
                                <div className="bg-gray-50 rounded-xl p-6">
                                    <h3 className="text-lg font-semibold text-gray-900 mb-3">À propos</h3>
                                    <p className="text-gray-700 leading-relaxed">{profile.bio}</p>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'documents' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Documents</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="border border-gray-200 rounded-xl p-6">
                                    <h4 className="font-semibold text-gray-900 mb-4">Photo de profil</h4>
                                    {selectedFile && (
                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-700">Fichier sélectionné: {selectedFile.name}</p>
                                            <button
                                                onClick={handleProfilePictureUpload}
                                                disabled={saving}
                                                className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {saving ? 'Téléchargement...' : 'Télécharger'}
                                            </button>
                                        </div>
                                    )}
                                    <label className="block w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-center">
                                        <Camera className="h-5 w-5 inline mr-2" />
                                        Choisir une photo
                                        <input
                                            type="file"
                                            accept="image/*"
                                            onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                    </label>
                        </div>

                                <div className="border border-gray-200 rounded-xl p-6">
                                    <h4 className="font-semibold text-gray-900 mb-4">Document KYC</h4>
                                    {kycFile && (
                                        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                                            <p className="text-sm text-blue-700">Fichier sélectionné: {kycFile.name}</p>
                                            <button
                                                onClick={handleKycUpload}
                                                disabled={saving}
                                                className="mt-2 px-3 py-1 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                {saving ? 'Téléchargement...' : 'Télécharger'}
                                            </button>
                                        </div>
                                    )}
                                    <label className="block w-full px-4 py-2 border border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors text-center">
                                        <FileText className="h-5 w-5 inline mr-2" />
                                        Choisir un document
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                                            className="hidden"
                                        />
                                    </label>
                                </div>
                            </div>

                            <div className="border border-gray-200 rounded-xl p-6">
                                <h4 className="font-semibold text-gray-900 mb-4">Documents existants</h4>
                                <div className="space-y-3">
                                    {profile.kyc_document && (
                                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                            <div className="flex items-center space-x-3">
                                                <FileText className="h-5 w-5 text-blue-600" />
                                                <span className="text-gray-900">Document KYC</span>
                                            </div>
                                            <a
                                                href={profile.kyc_document}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 hover:text-blue-700 text-sm"
                                            >
                                                Voir le document
                                            </a>
                            </div>
                        )}
                    </div>
                </div>
            </div>
                    )}

                    {activeTab === 'settings' && (
                        <div className="space-y-6">
                            <h3 className="text-lg font-semibold text-gray-900 mb-4">Paramètres</h3>

                            <div className="border border-gray-200 rounded-xl p-6">
                                <h4 className="font-semibold text-gray-900 mb-4">Télécharger les reçus</h4>
                                <p className="text-gray-600 mb-4">Téléchargez tous vos reçus de paiement au format ZIP.</p>
                    <button
                        onClick={downloadReceipts}
                                    disabled={saving}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 flex items-center"
                    >
                        <Download className="h-4 w-4 mr-2" />
                                    {saving ? 'Téléchargement...' : 'Télécharger les reçus'}
                    </button>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TechnicianProfile; 