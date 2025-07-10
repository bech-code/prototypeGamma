import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { Users, Search, Edit, Trash2, UserCheck, Shield, Phone, MapPin, Calendar, Eye, Plus, Download, AlertCircle, CheckCircle, Clock, Ban, Star, X, Globe, Wrench, CreditCard, Star as StarIcon, RefreshCw, EyeOff } from 'lucide-react';

interface User {
    id: number;
    username: string;
    email: string;
    first_name: string;
    last_name: string;
    phone_number: string;
    user_type: 'client' | 'technician' | 'admin';
    is_active: boolean;
    is_verified: boolean;
    date_joined: string;
    last_login: string;
    location: string;
    rating?: number;
    total_requests?: number;
    completed_requests?: number;
}

const UserManagement: React.FC = () => {
    const { user } = useAuth();
    const [users, setUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState<'all' | 'client' | 'technician' | 'admin'>('all');
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [createForm, setCreateForm] = useState({
        first_name: '',
        last_name: '',
        email: '',
        user_type: 'client',
        password: '',
        password2: '',
    });
    const [createError, setCreateError] = useState<any>(null);
    const [createLoading, setCreateLoading] = useState(false);
    const [createSuccess, setCreateSuccess] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [editForm, setEditForm] = useState<any>(null);
    const [editError, setEditError] = useState<any>(null);
    const [editLoading, setEditLoading] = useState(false);
    const [showDetailModal, setShowDetailModal] = useState(false);
    const [detailUser, setDetailUser] = useState<User | null>(null);
    const [loginHistory, setLoginHistory] = useState<any[]>([]);
    const [requestHistory, setRequestHistory] = useState<any[]>([]);
    const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
    const [reviewHistory, setReviewHistory] = useState<any[]>([]);
    const [loginPeriod, setLoginPeriod] = useState<'all' | '7d' | '30d'>('all');
    const [requestPeriod, setRequestPeriod] = useState<'all' | '7d' | '30d'>('all');
    const [requestStatus, setRequestStatus] = useState<string>('all');
    const [paymentPeriod, setPaymentPeriod] = useState<'all' | '7d' | '30d'>('all');
    const [paymentType, setPaymentType] = useState<string>('all');
    const [reviewPeriod, setReviewPeriod] = useState<'all' | '7d' | '30d'>('all');
    const [reviewMinRating, setReviewMinRating] = useState<number>(1);
    const [showFullComment, setShowFullComment] = useState<string | null>(null);
    const [paymentStatus, setPaymentStatus] = useState<string>('all');
    const [technicianSubscriptions, setTechnicianSubscriptions] = useState<{ [key: number]: any }>({});

    // États pour les toasts et feedback
    const [toast, setToast] = useState<{ type: 'success' | 'error' | 'info', message: string } | null>(null);
    const [actionLoading, setActionLoading] = useState<{ type: string, userId: number } | null>(null);
    const [exporting, setExporting] = useState(false);

    // Fonction pour afficher les toasts
    const showToast = (type: 'success' | 'error' | 'info', message: string) => {
        setToast({ type, message });
        setTimeout(() => setToast(null), 5000);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    useEffect(() => {
        if (showDetailModal && detailUser) {
            loadUserDetails(detailUser);
        }
    }, [showDetailModal, detailUser]);

    const loadUsers = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth('/users/');
            if (response.ok) {
                const data = await response.json();
                setUsers(data.results || data);
                showToast('success', 'Utilisateurs chargés avec succès');
            } else {
                setUsers([]);
                showToast('error', 'Erreur lors du chargement des utilisateurs');
            }
        } catch (err) {
            setUsers([]);
            showToast('error', 'Erreur de connexion lors du chargement');
        } finally {
            setLoading(false);
        }
    };

    const loadUserDetails = async (user: User) => {
        try {
            // Historique de connexion
            const loginResponse = await fetchWithAuth('/users/admin/login-locations/?limit=1000');
            if (loginResponse.ok) {
                const loginData = await loginResponse.json();
                setLoginHistory(loginData.filter((l: any) => l.user_email === user.email));
            }

            // Historique des demandes
            const requestResponse = await fetchWithAuth('/depannage/api/repair-requests/');
            if (requestResponse.ok) {
                const requestData = await requestResponse.json();
                let filtered = requestData.results || requestData;
                if (user.user_type === 'client') {
                    filtered = filtered.filter((r: any) => r.client && r.client.email === user.email);
                } else if (user.user_type === 'technician') {
                    filtered = filtered.filter((r: any) => r.technician && r.technician.email === user.email);
                }
                setRequestHistory(filtered);
            }

            // Historique des paiements
            const paymentResponse = await fetchWithAuth('/depannage/api/payments/');
            if (paymentResponse.ok) {
                const paymentData = await paymentResponse.json();
                let filtered = paymentData.results || paymentData;
                if (user.user_type === 'client') {
                    filtered = filtered.filter((p: any) => p.payer && p.payer.email === user.email);
                } else if (user.user_type === 'technician') {
                    filtered = filtered.filter((p: any) => p.recipient && p.recipient.email === user.email);
                }
                setPaymentHistory(filtered);
            }

            // Historique des avis
            const reviewResponse = await fetchWithAuth('/depannage/api/reviews/');
            if (reviewResponse.ok) {
                const reviewData = await reviewResponse.json();
                let filtered = reviewData.results || reviewData;
                if (user.user_type === 'client') {
                    filtered = filtered.filter((r: any) => r.client && r.client_name && typeof r.client_name === 'string' && r.client_name.toLowerCase().includes(user.first_name.toLowerCase()));
                } else if (user.user_type === 'technician') {
                    filtered = filtered.filter((r: any) => r.technician && r.technician_name && typeof r.technician_name === 'string' && r.technician_name.toLowerCase().includes(user.first_name.toLowerCase()));
                }
                setReviewHistory(filtered);
            }
        } catch (error) {
            showToast('error', 'Erreur lors du chargement des détails utilisateur');
        }
    };

    const filteredUsers = users.filter(user => {
        const matchesSearch =
            (typeof user.username === 'string' && user.username.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof user.email === 'string' && user.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
            (typeof user.first_name === 'string' && typeof user.last_name === 'string' && `${user.first_name} ${user.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()));

        const matchesType = filterType === 'all' || user.user_type === filterType;

        return matchesSearch && matchesType;
    });

    const getUserTypeColor = (type: string) => {
        switch (type) {
            case 'admin': return 'bg-red-100 text-red-800';
            case 'technician': return 'bg-blue-100 text-blue-800';
            case 'client': return 'bg-green-100 text-green-800';
            default: return 'bg-gray-100 text-gray-800';
        }
    };

    const getUserTypeLabel = (type: string) => {
        switch (type) {
            case 'admin': return 'Administrateur';
            case 'technician': return 'Technicien';
            case 'client': return 'Client';
            default: return type;
        }
    };

    // Action: activer/désactiver
    const toggleActive = async (userId: number, isActive: boolean) => {
        setActionLoading({ type: 'toggle', userId });
        try {
            const response = await fetchWithAuth(`/users/${userId}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ is_active: !isActive })
            });

            if (response.ok) {
                setUsers(prev => prev.map(user =>
                    user.id === userId ? { ...user, is_active: !isActive } : user
                ));
                showToast('success', `Utilisateur ${!isActive ? 'activé' : 'désactivé'} avec succès`);
            } else {
                const errorData = await response.json();
                showToast('error', errorData.message || 'Erreur lors de la modification');
            }
        } catch (error) {
            showToast('error', 'Erreur de connexion lors de la modification');
        } finally {
            setActionLoading(null);
        }
    };

    // Action: supprimer
    const deleteUser = async (userId: number) => {
        if (!window.confirm('Êtes-vous sûr de vouloir supprimer cet utilisateur ? Cette action est irréversible.')) {
            return;
        }

        setActionLoading({ type: 'delete', userId });
        try {
            const response = await fetchWithAuth(`/users/${userId}/`, {
                method: 'DELETE'
            });

            if (response.ok || response.status === 204) {
                setUsers(prev => prev.filter(user => user.id !== userId));
                showToast('success', 'Utilisateur supprimé avec succès');
            } else {
                const errorData = await response.json();
                showToast('error', errorData.message || 'Erreur lors de la suppression');
            }
        } catch (error) {
            showToast('error', 'Erreur de connexion lors de la suppression');
        } finally {
            setActionLoading(null);
        }
    };

    const handleCreateChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setCreateForm({ ...createForm, [e.target.name]: e.target.value });
        setCreateError(null);
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setCreateLoading(true);
        setCreateError(null);

        if (createForm.password !== createForm.password2) {
            setCreateError({ password: ['Les mots de passe ne correspondent pas'] });
            setCreateLoading(false);
            return;
        }

        try {
            const response = await fetchWithAuth('/users/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: createForm.first_name,
                    last_name: createForm.last_name,
                    email: createForm.email,
                    user_type: createForm.user_type,
                    password: createForm.password,
                })
            });

            if (response.ok) {
                const newUser = await response.json();
                setUsers(prev => [...prev, newUser]);
                setCreateSuccess(true);
                setCreateForm({
                    first_name: '',
                    last_name: '',
                    email: '',
                    user_type: 'client',
                    password: '',
                    password2: '',
                });
                setShowCreateModal(false);
                showToast('success', 'Utilisateur créé avec succès');
            } else {
                const errorData = await response.json();
                setCreateError(errorData);
                showToast('error', 'Erreur lors de la création de l\'utilisateur');
            }
        } catch (error) {
            showToast('error', 'Erreur de connexion lors de la création');
        } finally {
            setCreateLoading(false);
        }
    };

    const openEditModal = (user: User) => {
        setEditForm({
            id: user.id,
            first_name: user.first_name,
            last_name: user.last_name,
            email: user.email,
            user_type: user.user_type,
            phone_number: user.phone_number,
        });
        setShowEditModal(true);
    };

    const handleEditChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setEditForm({ ...editForm, [e.target.name]: e.target.value });
        setEditError(null);
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setEditLoading(true);
        setEditError(null);

        try {
            const response = await fetchWithAuth(`/users/${editForm.id}/`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: editForm.first_name,
                    last_name: editForm.last_name,
                    email: editForm.email,
                    user_type: editForm.user_type,
                    phone_number: editForm.phone_number,
                })
            });

            if (response.ok) {
                const updatedUser = await response.json();
                setUsers(prev => prev.map(user =>
                    user.id === editForm.id ? { ...user, ...updatedUser } : user
                ));
                setShowEditModal(false);
                showToast('success', 'Utilisateur modifié avec succès');
            } else {
                const errorData = await response.json();
                setEditError(errorData);
                showToast('error', 'Erreur lors de la modification');
            }
        } catch (error) {
            showToast('error', 'Erreur de connexion lors de la modification');
        } finally {
            setEditLoading(false);
        }
    };

    const openDetailModal = (user: User) => {
        setDetailUser(user);
        setShowDetailModal(true);
    };

    const exportCSV = async () => {
        setExporting(true);
        try {
            const response = await fetchWithAuth('/users/export/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    filter_type: filterType,
                    search_term: searchTerm
                })
            });

            if (response.ok) {
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `utilisateurs-${new Date().toISOString().split('T')[0]}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
                showToast('success', 'Export CSV réussi');
            } else {
                showToast('error', 'Erreur lors de l\'export');
            }
        } catch (error) {
            showToast('error', 'Erreur de connexion lors de l\'export');
        } finally {
            setExporting(false);
        }
    };

    const filterByPeriod = (items: any[], dateKey: string, period: 'all' | '7d' | '30d') => {
        if (period === 'all') return items;
        const now = new Date();
        const daysAgo = period === '7d' ? 7 : 30;
        const cutoff = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
        return items.filter(item => new Date(item[dateKey]) >= cutoff);
    };

    const fetchTechnicianSubscription = async (technicianId: number) => {
        try {
            const response = await fetchWithAuth(`/depannage/api/technician-subscriptions/${technicianId}/`);
            if (response.ok) {
                const subscription = await response.json();
                setTechnicianSubscriptions(prev => ({
                    ...prev,
                    [technicianId]: subscription
                }));
            }
        } catch (error) {
            console.error('Erreur lors du chargement de l\'abonnement:', error);
        }
    };

    // Charger les statuts d'abonnement pour tous les techniciens affichés
    useEffect(() => {
        filteredUsers.forEach(user => {
            if (user.user_type === 'technician' && !technicianSubscriptions[user.id]) {
                fetchTechnicianSubscription(user.id);
            }
        });
        // eslint-disable-next-line
    }, [filteredUsers]);

    const filteredLoginHistory = filterByPeriod(loginHistory, 'timestamp', loginPeriod);
    const filteredRequestHistory = filterByPeriod(requestHistory, 'created_at', requestPeriod).filter(r => requestStatus === 'all' || r.status === requestStatus);

    const filteredPaymentHistory = filterByPeriod(paymentHistory, 'created_at', paymentPeriod)
        .filter(p => (paymentType === 'all' || p.payment_type === paymentType) && (paymentStatus === 'all' || p.status === paymentStatus));

    const filteredReviewHistory = filterByPeriod(reviewHistory, 'created_at', reviewPeriod).filter(r => r.rating >= reviewMinRating);

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-2 text-gray-600">Chargement des utilisateurs...</span>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Toast notifications */}
            {toast && (
                <div className={`fixed top-4 right-4 z-50 px-6 py-3 rounded-lg shadow-lg flex items-center ${toast.type === 'success' ? 'bg-green-500 text-white' :
                    toast.type === 'error' ? 'bg-red-500 text-white' :
                        'bg-blue-500 text-white'
                    }`}>
                    {toast.type === 'success' ? (
                        <CheckCircle className="h-5 w-5 mr-2" />
                    ) : toast.type === 'error' ? (
                        <AlertCircle className="h-5 w-5 mr-2" />
                    ) : (
                        <Clock className="h-5 w-5 mr-2" />
                    )}
                    {toast.message}
                    <button
                        onClick={() => setToast(null)}
                        className="ml-4 hover:opacity-75"
                    >
                        <X className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Modal création utilisateur */}
            {showCreateModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative">
                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => setShowCreateModal(false)}>
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-2xl font-bold mb-4">Créer un utilisateur</h2>
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div className="flex space-x-2">
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium mb-1">Prénom</label>
                                    <input name="first_name" value={createForm.first_name} onChange={handleCreateChange} required className="w-full border rounded px-3 py-2" />
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium mb-1">Nom</label>
                                    <input name="last_name" value={createForm.last_name} onChange={handleCreateChange} required className="w-full border rounded px-3 py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input name="email" type="email" value={createForm.email} onChange={handleCreateChange} required className="w-full border rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Type d'utilisateur</label>
                                <select name="user_type" value={createForm.user_type} onChange={handleCreateChange} className="w-full border rounded px-3 py-2">
                                    <option value="client">Client</option>
                                    <option value="technician">Technicien</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Mot de passe</label>
                                <div className="relative">
                                    <input name="password" type={showCreatePassword ? "text" : "password"} value={createForm.password} onChange={handleCreateChange} required className="w-full border rounded px-3 py-2 pr-10" />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 focus:outline-none"
                                        onClick={() => setShowCreatePassword((v) => !v)}
                                        tabIndex={-1}
                                    >
                                        {showCreatePassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Confirmation du mot de passe</label>
                                <div className="relative">
                                    <input name="password2" type={showCreatePassword2 ? "text" : "password"} value={createForm.password2} onChange={handleCreateChange} required className="w-full border rounded px-3 py-2 pr-10" />
                                    <button
                                        type="button"
                                        className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 focus:outline-none"
                                        onClick={() => setShowCreatePassword2((v) => !v)}
                                        tabIndex={-1}
                                    >
                                        {showCreatePassword2 ? <EyeOff size={18} /> : <Eye size={18} />}
                                    </button>
                                </div>
                            </div>
                            {createError && (
                                <div className="text-red-600 text-sm">{typeof createError === 'string' ? createError : Object.entries(createError).map(([k, v]) => <div key={k}>{k}: {v}</div>)}</div>
                            )}
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700" disabled={createLoading}>
                                {createLoading ? 'Création...' : 'Créer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal édition utilisateur */}
            {showEditModal && editForm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative">
                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => setShowEditModal(false)}>
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-2xl font-bold mb-4">Éditer l'utilisateur</h2>
                        <form onSubmit={handleEditUser} className="space-y-4">
                            <div className="flex space-x-2">
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium mb-1">Prénom</label>
                                    <input name="first_name" value={editForm.first_name} onChange={handleEditChange} required className="w-full border rounded px-3 py-2" />
                                </div>
                                <div className="w-1/2">
                                    <label className="block text-sm font-medium mb-1">Nom</label>
                                    <input name="last_name" value={editForm.last_name} onChange={handleEditChange} required className="w-full border rounded px-3 py-2" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Email</label>
                                <input name="email" type="email" value={editForm.email} onChange={handleEditChange} required className="w-full border rounded px-3 py-2" />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Type d'utilisateur</label>
                                <select name="user_type" value={editForm.user_type} onChange={handleEditChange} className="w-full border rounded px-3 py-2">
                                    <option value="client">Client</option>
                                    <option value="technician">Technicien</option>
                                    <option value="admin">Administrateur</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">Téléphone</label>
                                <input name="phone_number" type="text" value={editForm.phone_number} onChange={handleEditChange} className="w-full border rounded px-3 py-2" />
                            </div>
                            {editError && (
                                <div className="text-red-600 text-sm">{typeof editError === 'string' ? editError : Object.entries(editError).map(([k, v]) => <div key={k}>{k}: {v}</div>)}</div>
                            )}
                            <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded font-semibold hover:bg-blue-700" disabled={editLoading}>
                                {editLoading ? 'Enregistrement...' : 'Enregistrer'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal détails utilisateur */}
            {showDetailModal && detailUser && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                    <div className="bg-white rounded-lg shadow-lg w-full max-w-lg p-8 relative">
                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => setShowDetailModal(false)}>
                            <X className="h-5 w-5" />
                        </button>
                        <h2 className="text-2xl font-bold mb-4">Détails de l'utilisateur</h2>
                        <div className="flex items-center space-x-4 mb-6">
                            <div className="h-16 w-16 rounded-full bg-gray-300 flex items-center justify-center text-2xl font-bold text-gray-700">
                                {detailUser.first_name?.charAt(0) || ''}{detailUser.last_name?.charAt(0) || ''}
                            </div>
                            <div>
                                <div className="text-lg font-semibold">{detailUser.first_name} {detailUser.last_name}</div>
                                <div className="text-gray-500">{detailUser.email}</div>
                                <div className="text-sm text-gray-400">ID: {detailUser.id}</div>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                            <div className="bg-gray-50 rounded p-4">
                                <div className="text-xs text-gray-500 mb-1">Type</div>
                                <div className="font-semibold">{getUserTypeLabel(detailUser.user_type)}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-4">
                                <div className="text-xs text-gray-500 mb-1">Statut</div>
                                <div className="font-semibold">{detailUser.is_active ? 'Actif' : 'Inactif'}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-4">
                                <div className="text-xs text-gray-500 mb-1">Vérifié</div>
                                <div className="font-semibold">{detailUser.is_verified ? 'Oui' : 'Non'}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-4">
                                <div className="text-xs text-gray-500 mb-1">Date d'inscription</div>
                                <div className="font-semibold">{detailUser.date_joined ? new Date(detailUser.date_joined).toLocaleDateString('fr-FR') : '—'}</div>
                            </div>
                            <div className="bg-gray-50 rounded p-4">
                                <div className="text-xs text-gray-500 mb-1">Dernière connexion</div>
                                <div className="font-semibold">{detailUser.last_login ? new Date(detailUser.last_login).toLocaleString('fr-FR') : '—'}</div>
                            </div>
                            {typeof detailUser.total_requests !== 'undefined' && (
                                <div className="bg-gray-50 rounded p-4">
                                    <div className="text-xs text-gray-500 mb-1">Demandes totales</div>
                                    <div className="font-semibold">{detailUser.total_requests}</div>
                                </div>
                            )}
                            {typeof detailUser.completed_requests !== 'undefined' && (
                                <div className="bg-gray-50 rounded p-4">
                                    <div className="text-xs text-gray-500 mb-1">Demandes complétées</div>
                                    <div className="font-semibold">{detailUser.completed_requests}</div>
                                </div>
                            )}
                        </div>
                        {/* Historique de connexion */}
                        <div className="mb-6">
                            <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold flex items-center mr-4"><Globe className="h-5 w-5 mr-2" />Historique des connexions</h3>
                                <select value={loginPeriod} onChange={e => setLoginPeriod(e.target.value as any)} className="ml-auto border rounded px-2 py-1 text-sm">
                                    <option value="all">Tout</option>
                                    <option value="7d">7 derniers jours</option>
                                    <option value="30d">30 derniers jours</option>
                                </select>
                            </div>
                            {filteredLoginHistory.length === 0 ? (
                                <div className="text-gray-400 text-sm">Aucune connexion trouvée.</div>
                            ) : (
                                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto pr-2">
                                    {filteredLoginHistory.map((l, i) => (
                                        <li key={i} className="flex items-center space-x-2">
                                            <span>{new Date(l.timestamp).toLocaleString('fr-FR')}</span>
                                            <span className="text-gray-500">{l.ip_address}</span>
                                            <span className="text-gray-500">{l.geo_country}{l.geo_city ? `, ${l.geo_city}` : ''}</span>
                                            <span className="text-xs text-gray-400">{l.user_agent?.slice(0, 20)}...</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {/* Historique des demandes */}
                        <div>
                            <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold flex items-center mr-4"><Wrench className="h-5 w-5 mr-2" />Historique des demandes</h3>
                                <select value={requestPeriod} onChange={e => setRequestPeriod(e.target.value as any)} className="ml-auto border rounded px-2 py-1 text-sm mr-2">
                                    <option value="all">Tout</option>
                                    <option value="7d">7 derniers jours</option>
                                    <option value="30d">30 derniers jours</option>
                                </select>
                                <select value={requestStatus} onChange={e => setRequestStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                    <option value="all">Tous statuts</option>
                                    <option value="pending">En attente</option>
                                    <option value="in_progress">En cours</option>
                                    <option value="completed">Terminée</option>
                                    <option value="cancelled">Annulée</option>
                                </select>
                            </div>
                            {filteredRequestHistory.length === 0 ? (
                                <div className="text-gray-400 text-sm">Aucune demande trouvée.</div>
                            ) : (
                                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto pr-2">
                                    {filteredRequestHistory.map((r, i) => (
                                        <li key={i} className="flex items-center space-x-2">
                                            <span>{r.title || 'Demande'}</span>
                                            <span className="text-gray-500">{r.status}</span>
                                            <span>{r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : ''}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {/* Historique des paiements */}
                        <div className="mb-6">
                            <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold flex items-center mr-4"><CreditCard className="h-5 w-5 mr-2" />Historique des paiements</h3>
                                <select value={paymentPeriod} onChange={e => setPaymentPeriod(e.target.value as any)} className="ml-auto border rounded px-2 py-1 text-sm mr-2">
                                    <option value="all">Tout</option>
                                    <option value="7d">7 derniers jours</option>
                                    <option value="30d">30 derniers jours</option>
                                </select>
                                <select value={paymentType} onChange={e => setPaymentType(e.target.value)} className="border rounded px-2 py-1 text-sm mr-2">
                                    <option value="all">Tous types</option>
                                    <option value="client_payment">Paiement client</option>
                                    <option value="technician_payout">Paiement technicien</option>
                                    <option value="refund">Remboursement</option>
                                </select>
                                <select value={paymentStatus} onChange={e => setPaymentStatus(e.target.value)} className="border rounded px-2 py-1 text-sm">
                                    <option value="all">Tous statuts</option>
                                    <option value="success">Succès</option>
                                    <option value="failed">Échec</option>
                                    <option value="pending">En attente</option>
                                </select>
                            </div>
                            {filteredPaymentHistory.length === 0 ? (
                                <div className="text-gray-400 text-sm">Aucun paiement trouvé.</div>
                            ) : (
                                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto pr-2">
                                    {filteredPaymentHistory.map((p, i) => (
                                        <li key={i} className="flex items-center space-x-2">
                                            <span>{p.amount} FCFA</span>
                                            <span className="text-gray-500">{p.status}</span>
                                            <span className="text-gray-500">{p.payment_type}</span>
                                            <span>{p.created_at ? new Date(p.created_at).toLocaleString('fr-FR') : ''}</span>
                                            <a href={p.request ? `/admin/requests/${p.request}` : '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Voir demande</a>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                        {/* Historique des avis */}
                        <div className="mb-6">
                            <div className="flex items-center mb-2">
                                <h3 className="text-lg font-semibold flex items-center mr-4"><StarIcon className="h-5 w-5 mr-2" />Historique des avis</h3>
                                <select value={reviewPeriod} onChange={e => setReviewPeriod(e.target.value as any)} className="ml-auto border rounded px-2 py-1 text-sm mr-2">
                                    <option value="all">Tout</option>
                                    <option value="7d">7 derniers jours</option>
                                    <option value="30d">30 derniers jours</option>
                                </select>
                                <select value={reviewMinRating} onChange={e => setReviewMinRating(Number(e.target.value))} className="border rounded px-2 py-1 text-sm">
                                    <option value={1}>Note ≥ 1</option>
                                    <option value={2}>Note ≥ 2</option>
                                    <option value={3}>Note ≥ 3</option>
                                    <option value={4}>Note ≥ 4</option>
                                    <option value={5}>Note = 5</option>
                                </select>
                            </div>
                            {filteredReviewHistory.length === 0 ? (
                                <div className="text-gray-400 text-sm">Aucun avis trouvé.</div>
                            ) : (
                                <ul className="text-sm space-y-1 max-h-48 overflow-y-auto pr-2">
                                    {filteredReviewHistory.map((r, i) => (
                                        <li key={i} className="flex items-center space-x-2">
                                            <span className="flex items-center"><StarIcon className="h-4 w-4 text-yellow-400 mr-1" />{r.rating}/5</span>
                                            <span className="text-gray-500">
                                                {r.comment && r.comment.length > 30 ? (
                                                    <>
                                                        {r.comment.slice(0, 30)}...
                                                        <button className="text-blue-600 underline text-xs" onClick={() => setShowFullComment(r.comment)}>voir</button>
                                                    </>
                                                ) : r.comment}
                                            </span>
                                            <span>{r.created_at ? new Date(r.created_at).toLocaleString('fr-FR') : ''}</span>
                                            <a href={r.request ? `/admin/requests/${r.request}` : '#'} target="_blank" rel="noopener noreferrer" className="text-blue-600 underline text-xs">Voir demande</a>
                                            <span className="text-xs text-gray-400">{r.client_name || r.technician_name}</span>
                                        </li>
                                    ))}
                                </ul>
                            )}
                            {/* Modal pour commentaire complet */}
                            {showFullComment && (
                                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
                                    <div className="bg-white rounded-lg shadow-lg w-full max-w-md p-8 relative">
                                        <button className="absolute top-3 right-3 text-gray-400 hover:text-gray-600" onClick={() => setShowFullComment(null)}>
                                            <X className="h-5 w-5" />
                                        </button>
                                        <h2 className="text-xl font-bold mb-4">Commentaire complet</h2>
                                        <div className="text-gray-800 whitespace-pre-line">{showFullComment}</div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
                    <div className="flex items-center justify-between">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">Gestion des Utilisateurs</h1>
                            <p className="mt-2 text-gray-600">
                                Gérez les comptes clients, techniciens et administrateurs
                            </p>
                        </div>
                        <div className="flex space-x-3">
                            <button
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                onClick={loadUsers}
                                disabled={actionLoading?.type === 'toggle' || actionLoading?.type === 'delete'}
                            >
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Actualiser
                            </button>
                            <button
                                className="flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                                onClick={exportCSV}
                                disabled={exporting}
                            >
                                {exporting ? (
                                    <div className="animate-spin rounded-full h-4 w-4 border-b border-gray-600 mr-2"></div>
                                ) : (
                                    <Download className="h-4 w-4 mr-2" />
                                )}
                                {exporting ? 'Export...' : 'Exporter'}
                            </button>
                            <button
                                className="flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                                onClick={() => setShowCreateModal(true)}
                                disabled={actionLoading?.type === 'toggle' || actionLoading?.type === 'delete'}
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Ajouter Utilisateur
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
                {/* Filtres et recherche */}
                <div className="bg-white rounded-lg shadow p-6 mb-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Recherche</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Nom, email, username..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-10 w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Type d'utilisateur</label>
                            <select
                                value={filterType}
                                onChange={(e) => setFilterType(e.target.value as any)}
                                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            >
                                <option value="all">Tous les types</option>
                                <option value="client">Clients</option>
                                <option value="technician">Techniciens</option>
                                <option value="admin">Administrateurs</option>
                            </select>
                        </div>
                        <div className="flex items-end">
                            <div className="text-sm text-gray-600">
                                {filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''} trouvé{filteredUsers.length !== 1 ? 's' : ''}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Statistiques */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Users className="h-8 w-8 text-blue-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Total utilisateurs</p>
                                <p className="text-2xl font-bold text-gray-900">{users.length}</p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <UserCheck className="h-8 w-8 text-green-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Utilisateurs actifs</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => u.is_active).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Shield className="h-8 w-8 text-purple-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Vérifiés</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => u.is_verified).length}
                                </p>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white rounded-lg shadow p-6">
                        <div className="flex items-center">
                            <Clock className="h-8 w-8 text-yellow-600" />
                            <div className="ml-4">
                                <p className="text-sm font-medium text-gray-600">Nouveaux (30j)</p>
                                <p className="text-2xl font-bold text-gray-900">
                                    {users.filter(u => {
                                        const joinDate = new Date(u.date_joined);
                                        const thirtyDaysAgo = new Date();
                                        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
                                        return joinDate > thirtyDaysAgo;
                                    }).length}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Liste des utilisateurs */}
                <div className="bg-white rounded-lg shadow overflow-hidden">
                    <div className="overflow-x-auto">
                        {filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-gray-500">Aucun utilisateur trouvé.</div>
                        ) : (
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Utilisateur
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Type
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Statut
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Abonnement
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Dernière connexion
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Actions
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {filteredUsers.map((user) => (
                                        <tr key={user.id} className="hover:bg-gray-50 transition-colors duration-200">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className="flex-shrink-0 h-10 w-10">
                                                        <div className="h-10 w-10 rounded-full bg-gray-300 flex items-center justify-center">
                                                            <Users className="h-6 w-6 text-gray-600" />
                                                        </div>
                                                    </div>
                                                    <div className="ml-4">
                                                        <div className="text-sm font-medium text-gray-900">
                                                            {user.first_name} {user.last_name}
                                                        </div>
                                                        <div className="text-sm text-gray-500">{user.email}</div>
                                                        <div className="text-sm text-gray-500">@{user.username}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getUserTypeColor(user.user_type)}`}>
                                                    {getUserTypeLabel(user.user_type)}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center space-x-2">
                                                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${user.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                        }`}>
                                                        {user.is_active ? 'Actif' : 'Inactif'}
                                                    </span>
                                                    {!user.is_verified && (
                                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                                    )}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {user.user_type === 'technician' && technicianSubscriptions[user.id] ? (
                                                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${technicianSubscriptions[user.id].is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                        {technicianSubscriptions[user.id].is_active ? 'Actif' : 'Inactif'}
                                                        {technicianSubscriptions[user.id].end_date && (
                                                            <span className="ml-2 text-xs opacity-80">(Expire le {new Date(technicianSubscriptions[user.id].end_date).toLocaleDateString('fr-FR')})</span>
                                                        )}
                                                    </span>
                                                ) : user.user_type === 'technician' ? (
                                                    <span className="text-xs text-gray-400">Chargement...</span>
                                                ) : null}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                                <div className="flex items-center">
                                                    <Calendar className="h-4 w-4 mr-1" />
                                                    {user.last_login ? new Date(user.last_login).toLocaleDateString('fr-FR') : '—'}
                                                </div>
                                                <div className="text-xs text-gray-400">
                                                    {user.last_login ? new Date(user.last_login).toLocaleTimeString('fr-FR') : ''}
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                                <div className="flex space-x-2">
                                                    <button className="text-blue-600 hover:text-blue-900" onClick={() => openDetailModal(user)}>
                                                        <Eye className="h-4 w-4" />
                                                    </button>
                                                    <button className="text-gray-600 hover:text-gray-900" onClick={() => openEditModal(user)}>
                                                        <Edit className="h-4 w-4" />
                                                    </button>
                                                    <button
                                                        className={`hover:text-green-900 ${user.is_active ? 'text-green-600' : 'text-gray-600'}`}
                                                        onClick={() => toggleActive(user.id, user.is_active)}
                                                        disabled={actionLoading?.type === 'toggle' && actionLoading?.userId === user.id}
                                                    >
                                                        {actionLoading?.type === 'toggle' && actionLoading?.userId === user.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b border-current"></div>
                                                        ) : user.is_active ? (
                                                            <UserCheck className="h-4 w-4" />
                                                        ) : (
                                                            <Ban className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                    <button
                                                        className="text-red-600 hover:text-red-900"
                                                        onClick={() => deleteUser(user.id)}
                                                        disabled={actionLoading?.type === 'delete' && actionLoading?.userId === user.id}
                                                    >
                                                        {actionLoading?.type === 'delete' && actionLoading?.userId === user.id ? (
                                                            <div className="animate-spin rounded-full h-4 w-4 border-b border-red-600"></div>
                                                        ) : (
                                                            <Trash2 className="h-4 w-4" />
                                                        )}
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>

                    {filteredUsers.length === 0 && (
                        <div className="text-center py-12">
                            <Users className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun utilisateur trouvé</h3>
                            <p className="text-gray-500">
                                {users.length === 0 ? 'Aucun utilisateur disponible.' : 'Aucun utilisateur ne correspond aux critères de recherche.'}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default UserManagement; 