import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import { useAuth } from '../contexts/AuthContext';
import { MessageSquare, CheckCircle, Star, MapPin, Phone, AlertCircle, ArrowLeft } from 'lucide-react';

const RequestDetailsPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const [request, setRequest] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (!id) return;
        const fetchRequest = async () => {
            setLoading(true);
            setError(null);
            try {
                const response = await fetchWithAuth(`/depannage/api/repair-requests/${id}/`);
                if (response.ok) {
                    const data = await response.json();
                    setRequest(data);
                } else {
                    setError("Demande non trouvée ou accès refusé.");
                }
            } catch (e) {
                setError("Erreur lors du chargement de la demande.");
            } finally {
                setLoading(false);
            }
        };
        fetchRequest();
    }, [id]);

    // Vérification des permissions (client ou technicien assigné)
    const isAuthorized = () => {
        if (!user || !request) return false;
        if (user.user_type === 'client' && request.client?.user?.id === user.id) return true;
        if (user.user_type === 'technician' && request.technician?.user?.id === user.id) return true;
        return false;
    };

    if (loading) {
        return <div className="min-h-screen flex items-center justify-center text-blue-700">Chargement...</div>;
    }
    if (error) {
        return <div className="min-h-screen flex items-center justify-center text-red-600">{error}</div>;
    }
    if (!request || !isAuthorized()) {
        return <div className="min-h-screen flex items-center justify-center text-red-600">Accès refusé.</div>;
    }

    return (
        <div className="max-w-3xl mx-auto p-4">
            <button onClick={() => navigate(-1)} className="mb-4 flex items-center text-blue-600 hover:underline"><ArrowLeft className="w-4 h-4 mr-1" /> Retour</button>
            <h1 className="text-2xl font-bold mb-2">Détail de la demande #{request.id}</h1>
            <div className="mb-4 text-gray-700">
                <div><b>Statut :</b> {request.status}</div>
                <div><b>Service :</b> {request.title || request.specialty_needed}</div>
                <div><b>Description :</b> {request.description}</div>
                <div><b>Date de création :</b> {new Date(request.created_at).toLocaleString('fr-FR')}</div>
                <div><b>Client :</b> {request.client?.user?.first_name} {request.client?.user?.last_name}</div>
                <div><b>Technicien :</b> {request.technician ? `${request.technician.user.first_name} ${request.technician.user.last_name}` : 'Non assigné'}</div>
                <div><b>Adresse :</b> {request.address}</div>
                <div><b>Ville :</b> {request.city}</div>
                {request.is_urgent && <div className="text-red-600 font-semibold">Demande urgente</div>}
            </div>
            {/* Progression / Timeline */}
            <div className="mb-4">
                <h2 className="text-lg font-semibold mb-2">Progression</h2>
                <ul className="list-disc ml-6 text-sm text-gray-800">
                    <li>Créée le {new Date(request.created_at).toLocaleString('fr-FR')}</li>
                    {request.assigned_at && <li>Assignée le {new Date(request.assigned_at).toLocaleString('fr-FR')}</li>}
                    {request.started_at && <li>En cours depuis le {new Date(request.started_at).toLocaleString('fr-FR')}</li>}
                    {request.completed_at && <li>Terminée le {new Date(request.completed_at).toLocaleString('fr-FR')}</li>}
                </ul>
            </div>
            {/* Actions principales */}
            <div className="flex flex-wrap gap-2 mb-4">
                {request.status === 'pending' && user.user_type === 'client' && (
                    <button className="px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs font-semibold shadow">Annuler</button>
                )}
                {request.status === 'assigned' && user.user_type === 'technician' && (
                    <button className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 text-xs font-semibold shadow">Commencer</button>
                )}
                {request.status === 'in_progress' && user.user_type === 'technician' && (
                    <button className="px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs font-semibold shadow">Terminer</button>
                )}
                {request.technician?.phone && (
                    <a href={`tel:${request.technician.phone}`} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold shadow flex items-center"><Phone className="w-4 h-4 mr-1" /> Appeler le technicien</a>
                )}
                {request.conversation?.id ? (
                    <button onClick={() => navigate(`/chat/${request.conversation.id}`)} className="px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs font-semibold shadow flex items-center"><MessageSquare className="w-4 h-4 mr-1" /> Messages</button>
                ) : (
                    <button disabled className="px-3 py-1 bg-gray-300 text-gray-500 rounded text-xs font-semibold shadow flex items-center cursor-not-allowed opacity-60"><MessageSquare className="w-4 h-4 mr-1" /> Messages</button>
                )}
                {/* Noter le technicien si terminé et pas encore noté */}
                {request.status === 'completed' && user.user_type === 'client' && !request.review && (
                    <button onClick={() => navigate(`/review/${request.id}`)} className="px-3 py-1 bg-yellow-100 hover:bg-yellow-200 text-yellow-700 text-xs font-semibold rounded-full shadow flex items-center"><Star className="w-4 h-4 mr-1" /> Noter le technicien</button>
                )}
                {/* Voir le reçu si terminé */}
                {request.status === 'completed' && request.mission_validated && (
                    <button className="px-3 py-1 bg-blue-100 hover:bg-blue-200 text-blue-700 text-xs font-semibold rounded-full shadow flex items-center"><CheckCircle className="w-4 h-4 mr-1 text-green-600" /> Voir le reçu</button>
                )}
            </div>
            {/* Géolocalisation */}
            {request.latitude && request.longitude && (
                <div className="mb-4">
                    <h2 className="text-lg font-semibold mb-2 flex items-center"><MapPin className="w-5 h-5 mr-1" /> Localisation</h2>
                    <div className="w-full h-64 bg-gray-100 rounded-lg flex items-center justify-center">
                        <span>Carte à afficher ici (Leaflet ou autre)</span>
                    </div>
                </div>
            )}
            {/* Historique des messages (optionnel, résumé) */}
            {/* ... à compléter selon besoin ... */}
        </div>
    );
};

export default RequestDetailsPage; 