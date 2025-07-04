import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { CheckCircle, Home, Receipt } from 'lucide-react';

const PaymentSuccess: React.FC = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [paymentDetails, setPaymentDetails] = useState<any>(null);

    useEffect(() => {
        // Récupérer les paramètres de l'URL CinetPay
        const transactionId = searchParams.get('transaction_id');
        const status = searchParams.get('status');

        if (transactionId && status === 'ACCEPTED') {
            // Ici vous pourriez vérifier le statut du paiement avec votre backend
            setPaymentDetails({
                transactionId,
                status,
                amount: searchParams.get('amount'),
                currency: searchParams.get('currency'),
            });
        }

        setLoading(false);
    }, [searchParams]);

    const handleGoHome = () => {
        navigate('/');
    };

    const handleViewDashboard = () => {
        navigate('/dashboard');
    };

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8 mt-8">
                <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
                    <div className="text-center">
                        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle className="w-8 h-8 text-green-600" />
                        </div>

                        <h2 className="text-2xl font-bold text-gray-800 mb-2">Paiement réussi !</h2>
                        <p className="text-gray-600 mb-6">
                            Votre paiement a été effectué avec succès. Un technicien sera bientôt assigné à votre demande.
                        </p>

                        {paymentDetails && (
                            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                                <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
                                    <Receipt className="w-4 h-4 mr-2" />
                                    Détails de la transaction
                                </h3>
                                <div className="space-y-2 text-sm">
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Référence:</span>
                                        <span className="font-medium">{paymentDetails.transactionId}</span>
                                    </div>
                                    <div className="flex justify-between">
                                        <span className="text-gray-600">Statut:</span>
                                        <span className="font-medium text-green-600">Payé</span>
                                    </div>
                                    {paymentDetails.amount && (
                                        <div className="flex justify-between">
                                            <span className="text-gray-600">Montant:</span>
                                            <span className="font-medium">
                                                {paymentDetails.amount} {paymentDetails.currency}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="space-y-3">
                            <button
                                onClick={handleViewDashboard}
                                className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-semibold"
                            >
                                Voir mes demandes
                            </button>
                            <button
                                onClick={handleGoHome}
                                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors flex items-center justify-center"
                            >
                                <Home className="w-4 h-4 mr-2" />
                                Retour à l'accueil
                            </button>
                        </div>

                        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                            <h4 className="font-semibold text-blue-800 mb-2">Prochaines étapes</h4>
                            <div className="text-sm text-blue-700 space-y-1">
                                <p>• Un technicien sera assigné à votre demande</p>
                                <p>• Vous recevrez une notification par email</p>
                                <p>• Le technicien vous contactera pour planifier l'intervention</p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PaymentSuccess; 