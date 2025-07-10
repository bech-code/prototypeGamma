import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchWithAuth } from '../contexts/fetchWithAuth';
import {
    CreditCard,
    User,
    Calendar,
    DollarSign,
    CheckCircle,
    AlertTriangle,
    ArrowLeft,
    Phone,
    Mail,
    MapPin
} from 'lucide-react';

interface PaymentDetails {
    amount: number;
    duration_months: number;
    plan_name: string;
    technician_name: string;
    technician_phone: string;
    technician_email: string;
}

const ManualPaymentPage: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { requestId } = useParams();
    const [paymentDetails, setPaymentDetails] = useState<PaymentDetails | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        if (!user) {
            navigate('/login');
            return;
        }

        if (user.user_type !== 'technician') {
            navigate('/dashboard');
            return;
        }

        fetchPaymentDetails();
    }, [user, requestId]);

    const fetchPaymentDetails = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`/depannage/api/subscription-requests/${requestId}/`);

            if (response.ok) {
                const data = await response.json();
                setPaymentDetails({
                    amount: data.amount,
                    duration_months: data.duration_months,
                    plan_name: `Plan ${data.duration_months} mois`,
                    technician_name: `${data.technician?.user?.first_name || ''} ${data.technician?.user?.last_name || ''}`.trim(),
                    technician_phone: data.technician?.phone || '',
                    technician_email: data.technician?.user?.email || ''
                });
            } else {
                setError('Impossible de récupérer les détails du paiement');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    const handleConfirmPayment = async () => {
        try {
            setLoading(true);
            const response = await fetchWithAuth(`/depannage/api/subscription-requests/${requestId}/`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    payment_confirmed: true,
                    payment_method: 'manual',
                    payment_notes: 'Paiement confirmé par le technicien'
                })
            });

            if (response.ok) {
                setSuccess(true);
                setTimeout(() => {
                    navigate('/technician/dashboard');
                }, 3000);
            } else {
                setError('Erreur lors de la confirmation du paiement');
            }
        } catch (err) {
            setError('Erreur de connexion');
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Chargement des détails du paiement...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Erreur</h2>
                    <p className="text-gray-600 mb-4">{error}</p>
                    <button
                        onClick={() => navigate('/technician/dashboard')}
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
                    >
                        Retour au tableau de bord
                    </button>
                </div>
            </div>
        );
    }

    if (success) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="text-center">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h2 className="text-xl font-semibold text-gray-900 mb-2">Paiement confirmé !</h2>
                    <p className="text-gray-600 mb-4">Votre demande de paiement a été enregistrée avec succès.</p>
                    <p className="text-sm text-gray-500">Redirection vers le tableau de bord...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white shadow-sm border-b">
                <div className="max-w-4xl mx-auto px-4 py-4">
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => navigate('/technician/dashboard')}
                            className="flex items-center text-gray-600 hover:text-gray-900"
                        >
                            <ArrowLeft className="h-5 w-5 mr-2" />
                            Retour
                        </button>
                        <h1 className="text-xl font-semibold text-gray-900">Paiement d'abonnement</h1>
                        <div className="w-20"></div>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl mx-auto px-4 py-8">
                {/* Informations importantes */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mb-8">
                    <div className="flex items-start">
                        <AlertTriangle className="h-6 w-6 text-blue-600 mt-1 mr-3 flex-shrink-0" />
                        <div>
                            <h3 className="text-lg font-semibold text-blue-900 mb-2">
                                Paiement en main propre
                            </h3>
                            <p className="text-blue-800 mb-4">
                                Pour activer votre abonnement, vous devez effectuer le paiement en main propre
                                auprès de notre équipe administrative. Aucun paiement en ligne n'est requis.
                            </p>
                            <div className="bg-white rounded-lg p-4 border border-blue-200">
                                <h4 className="font-semibold text-blue-900 mb-2">Coordonnées de paiement :</h4>
                                <div className="space-y-2 text-sm text-blue-800">
                                    <div className="flex items-center">
                                        <MapPin className="h-4 w-4 mr-2" />
                                        <span>123 Avenue de la République, Bamako, Mali</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Phone className="h-4 w-4 mr-2" />
                                        <span>+223 20 22 33 44</span>
                                    </div>
                                    <div className="flex items-center">
                                        <Mail className="h-4 w-4 mr-2" />
                                        <span>admin@depanneteliman.com</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Détails du paiement */}
                {paymentDetails && (
                    <div className="bg-white rounded-lg shadow-sm border p-6 mb-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6">Détails de votre demande</h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <User className="h-5 w-5 text-gray-600 mr-3" />
                                        <span className="text-gray-700">Technicien</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{paymentDetails.technician_name}</span>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <CreditCard className="h-5 w-5 text-gray-600 mr-3" />
                                        <span className="text-gray-700">Plan d'abonnement</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{paymentDetails.plan_name}</span>
                                </div>

                                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                                    <div className="flex items-center">
                                        <Calendar className="h-5 w-5 text-gray-600 mr-3" />
                                        <span className="text-gray-700">Durée</span>
                                    </div>
                                    <span className="font-semibold text-gray-900">{paymentDetails.duration_months} mois</span>
                                </div>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border border-blue-200">
                                    <div className="flex items-center">
                                        <DollarSign className="h-5 w-5 text-blue-600 mr-3" />
                                        <span className="text-blue-700 font-semibold">Montant à payer</span>
                                    </div>
                                    <span className="text-2xl font-bold text-blue-900">
                                        {paymentDetails.amount.toLocaleString()} FCFA
                                    </span>
                                </div>

                                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                                    <h4 className="font-semibold text-yellow-800 mb-2">Instructions importantes :</h4>
                                    <ul className="text-sm text-yellow-700 space-y-1">
                                        <li>• Présentez-vous avec une pièce d'identité</li>
                                        <li>• Préparez le montant exact en espèces</li>
                                        <li>• Conservez le reçu de paiement</li>
                                        <li>• Votre abonnement sera activé sous 24h</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Actions */}
                <div className="flex flex-col sm:flex-row gap-4">
                    <button
                        onClick={handleConfirmPayment}
                        disabled={loading}
                        className="flex-1 bg-green-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {loading ? (
                            <>
                                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                Traitement...
                            </>
                        ) : (
                            <>
                                <CheckCircle className="h-5 w-5 mr-2" />
                                Confirmer la demande de paiement
                            </>
                        )}
                    </button>

                    <button
                        onClick={() => navigate('/technician/dashboard')}
                        className="flex-1 bg-gray-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-gray-700"
                    >
                        Annuler
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ManualPaymentPage; 