import React, { useState, useEffect } from 'react';
import { User, Camera, Edit, Save, Download, Star, Shield, FileText, MapPin, Phone, Mail } from 'lucide-react';
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

            // Validation côté client
            if (!formData.first_name.trim()) {
                setError('Le prénom est requis');
                return;
            }
            if (!formData.last_name.trim()) {
                setError('Le nom est requis');
                return;
            }
            if (!formData.phone.trim()) {
                setError('Le téléphone est requis');
                return;
            }
            if (!formData.specialty) {
                setError('La spécialité est requise');
                return;
            }
            if (formData.years_experience < 0) {
                setError('Les années d\'expérience ne peuvent pas être négatives');
                return;
            }
            if (formData.hourly_rate < 0) {
                setError('Le tarif horaire ne peut pas être négatif');
                return;
            }

            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    user: {
                        first_name: formData.first_name.trim(),
                        last_name: formData.last_name.trim()
                    },
                    phone: formData.phone.trim(),
                    specialty: formData.specialty,
                    years_experience: formData.years_experience,
                    address: formData.address.trim(),
                    hourly_rate: formData.hourly_rate,
                    bio: formData.bio.trim()
                })
            });

            if (response.ok) {
                setSuccess('Profil mis à jour avec succès !');
                setEditing(false);
                fetchProfile(); // Recharger les données
            } else {
                const errorData = await response.json();
                setError(errorData.error || errorData.detail || 'Erreur lors de la mise à jour');
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
            setError(null);
            setSuccess(null);

            // Validation du fichier
            if (selectedFile.size > 5 * 1024 * 1024) { // 5MB
                setError('Le fichier est trop volumineux (max 5MB)');
                return;
            }

            if (!selectedFile.type.startsWith('image/')) {
                setError('Seuls les fichiers image sont acceptés');
                return;
            }

            const formData = new FormData();
            formData.append('profile_picture', selectedFile);

            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/upload_photo/`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                setSuccess('Photo de profil mise à jour avec succès !');
                setSelectedFile(null);
                fetchProfile();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors du téléchargement de la photo');
            }
        } catch (err) {
            console.error('Erreur lors de l\'upload de la photo:', err);
            setError('Erreur réseau lors du téléchargement de la photo');
        }
    };

    const handleKycUpload = async () => {
        if (!kycFile) return;

        try {
            setError(null);
            setSuccess(null);

            // Validation du fichier
            if (kycFile.size > 10 * 1024 * 1024) { // 10MB
                setError('Le fichier est trop volumineux (max 10MB)');
                return;
            }

            const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
            if (!allowedTypes.includes(kycFile.type)) {
                setError('Format de fichier non supporté (PDF, JPG, PNG uniquement)');
                return;
            }

            const formData = new FormData();
            formData.append('kyc_document', kycFile);

            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/upload_kyc/`, {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                setSuccess('Document KYC téléchargé avec succès !');
                setKycFile(null);
                fetchProfile();
            } else {
                const errorData = await response.json();
                setError(errorData.error || 'Erreur lors du téléchargement du document KYC');
            }
        } catch (err) {
            console.error('Erreur lors de l\'upload du document KYC:', err);
            setError('Erreur réseau lors du téléchargement du document KYC');
        }
    };

    const downloadReceipts = async () => {
        try {
            const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/technicians/${technicianId}/download_receipts/`);

            if (response.ok) {
                const blob = await response.blob();
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `reçus_technicien_${new Date().toISOString().split('T')[0]}.zip`;
                a.click();
                URL.revokeObjectURL(url);
            } else {
                setError('Erreur lors du téléchargement des reçus');
            }
        } catch (err) {
            setError('Erreur réseau');
        }
    };

    if (loading) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="animate-pulse">
                    <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="h-32 bg-gray-200 rounded mb-4"></div>
                    <div className="h-20 bg-gray-200 rounded"></div>
                </div>
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="bg-white rounded-lg shadow p-6">
                <div className="text-center text-gray-500">
                    <User className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>Profil non trouvé</p>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Messages d'erreur et de succès */}
            {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-red-800">{error}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={() => setError(null)}
                                className="text-red-400 hover:text-red-600"
                            >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {success && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-center">
                        <div className="flex-shrink-0">
                            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                            </svg>
                        </div>
                        <div className="ml-3">
                            <p className="text-green-800">{success}</p>
                        </div>
                        <div className="ml-auto pl-3">
                            <button
                                onClick={() => setSuccess(null)}
                                className="text-green-400 hover:text-green-600"
                            >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                                </svg>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* En-tête du profil */}
            <div className="bg-white rounded-lg shadow p-6">
                <div className="flex items-center justify-between mb-6">
                    <h3 className="text-lg font-semibold text-gray-800 flex items-center">
                        <User className="h-5 w-5 mr-2 text-blue-600" />
                        Mon Profil
                    </h3>
                    <button
                        onClick={() => setEditing(!editing)}
                        disabled={saving}
                        className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                    >
                        {editing ? (
                            saving ? (
                                <>
                                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                    Sauvegarde...
                                </>
                            ) : (
                                <>
                                    <Save className="h-4 w-4 mr-2" />
                                    Sauvegarder
                                </>
                            )
                        ) : (
                            <>
                                <Edit className="h-4 w-4 mr-2" />
                                Modifier
                            </>
                        )}
                    </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Photo de profil */}
                    <div className="text-center">
                        <div className="relative inline-block">
                            <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden">
                                {profile.profile_picture ? (
                                    <img
                                        src={profile.profile_picture}
                                        alt="Photo de profil"
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <User className="h-16 w-16 text-gray-400" />
                                )}
                            </div>
                            {editing && (
                                <label className="absolute bottom-0 right-0 bg-blue-600 text-white p-2 rounded-full cursor-pointer hover:bg-blue-700">
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
                        {selectedFile && (
                            <button
                                onClick={handleProfilePictureUpload}
                                className="mt-2 text-sm text-blue-600 hover:text-blue-700"
                            >
                                Télécharger la photo
                            </button>
                        )}
                    </div>

                    {/* Informations principales */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Prénom</label>
                                {editing ? (
                                    <input
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(e) => handleInputChange('first_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{profile.user?.first_name || 'Prénom non disponible'}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nom</label>
                                {editing ? (
                                    <input
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(e) => handleInputChange('last_name', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{profile.user?.last_name || 'Nom non disponible'}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Téléphone</label>
                                {editing ? (
                                    <input
                                        type="tel"
                                        value={formData.phone}
                                        onChange={(e) => handleInputChange('phone', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 flex items-center">
                                        <Phone className="h-4 w-4 mr-1" />
                                        {profile.phone}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <p className="text-gray-900 flex items-center">
                                    <Mail className="h-4 w-4 mr-1" />
                                    {profile.user?.email || 'Email non disponible'}
                                </p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Spécialité</label>
                                {editing ? (
                                    <select
                                        value={formData.specialty}
                                        onChange={(e) => handleInputChange('specialty', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
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
                                    <p className="text-gray-900">{profile.specialty}</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Années d'expérience</label>
                                {editing ? (
                                    <input
                                        type="number"
                                        value={formData.years_experience}
                                        onChange={(e) => handleInputChange('years_experience', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{profile.years_experience} ans</p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Adresse</label>
                                {editing ? (
                                    <input
                                        type="text"
                                        value={formData.address}
                                        onChange={(e) => handleInputChange('address', e.target.value)}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900 flex items-center">
                                        <MapPin className="h-4 w-4 mr-1" />
                                        {profile.address}
                                    </p>
                                )}
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Tarif horaire (FCFA)</label>
                                {editing ? (
                                    <input
                                        type="number"
                                        value={formData.hourly_rate}
                                        onChange={(e) => handleInputChange('hourly_rate', parseInt(e.target.value))}
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    />
                                ) : (
                                    <p className="text-gray-900">{profile.hourly_rate} FCFA/h</p>
                                )}
                            </div>
                        </div>

                        {editing && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                <textarea
                                    value={formData.bio}
                                    onChange={(e) => handleInputChange('bio', e.target.value)}
                                    rows={3}
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                    placeholder="Décrivez votre expérience et spécialités..."
                                />
                            </div>
                        )}

                        {!editing && formData.bio && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
                                <p className="text-gray-900">{formData.bio}</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Statistiques et vérification */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Statistiques */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Star className="h-5 w-5 mr-2 text-yellow-600" />
                        Mes Statistiques
                    </h4>
                    <div className="space-y-3">
                        <div className="flex justify-between">
                            <span className="text-gray-600">Note moyenne</span>
                            <span className="font-semibold">
                                {typeof profile.average_rating === 'number' && profile.average_rating > 0
                                    ? `${profile.average_rating.toFixed(1)}/5`
                                    : 'Aucune note'}
                            </span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Missions terminées</span>
                            <span className="font-semibold">{profile.total_jobs_completed || 0}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Années d'expérience</span>
                            <span className="font-semibold">{profile.years_experience || 0} ans</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-600">Tarif horaire</span>
                            <span className="font-semibold">{profile.hourly_rate || 0} FCFA/h</span>
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

                {/* Vérification KYC */}
                <div className="bg-white rounded-lg shadow p-6">
                    <h4 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
                        <Shield className="h-5 w-5 mr-2 text-green-600" />
                        Vérification KYC
                    </h4>
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-gray-600">Statut de vérification</span>
                            <span className={`px-2 py-1 rounded-full text-sm font-semibold ${profile.is_verified ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                {profile.is_verified ? 'Vérifié' : 'En attente'}
                            </span>
                        </div>

                        {!profile.is_verified && (
                            <div className="space-y-2">
                                <p className="text-sm text-gray-600">Téléchargez votre document d'identification</p>
                                <input
                                    type="file"
                                    accept=".pdf,.jpg,.jpeg,.png"
                                    onChange={(e) => setKycFile(e.target.files?.[0] || null)}
                                    className="text-sm"
                                />
                                {kycFile && (
                                    <button
                                        onClick={handleKycUpload}
                                        className="text-sm text-blue-600 hover:text-blue-700"
                                    >
                                        Télécharger le document
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="bg-white rounded-lg shadow p-6">
                <h4 className="text-lg font-semibold text-gray-800 mb-4">Actions</h4>
                <div className="flex flex-wrap gap-3">
                    <button
                        onClick={downloadReceipts}
                        className="inline-flex items-center px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg transition-colors"
                    >
                        <Download className="h-4 w-4 mr-2" />
                        Télécharger mes reçus
                    </button>

                    {editing && (
                        <button
                            onClick={handleSaveProfile}
                            disabled={saving}
                            className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg transition-colors disabled:opacity-50"
                        >
                            <Save className="h-4 w-4 mr-2" />
                            {saving ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default TechnicianProfile; 