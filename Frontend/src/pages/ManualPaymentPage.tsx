import React from "react";
import { useParams } from "react-router-dom";
import { CheckCircle, AlertCircle } from "lucide-react";

const ManualPaymentPage: React.FC = () => {
    const { requestId } = useParams<{ requestId: string }>();
    const [status, setStatus] = React.useState<'idle' | 'success' | 'error'>('idle');
    const [loading, setLoading] = React.useState(false);

    const handleManualPayment = () => {
        setLoading(true);
        // Simuler un paiement manuel (à remplacer par appel API réel)
        setTimeout(() => {
            setLoading(false);
            setStatus('success');
        }, 1500);
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
            <h2 className="text-2xl font-bold mb-4">Paiement manuel technicien</h2>
            <p className="text-gray-600 mb-6">Effectuez le paiement manuel pour la demande <span className="font-semibold">{requestId}</span>.</p>
            {status === 'success' && (
                <div className="flex flex-col items-center mb-6">
                    <CheckCircle className="w-12 h-12 text-green-600 mb-2" />
                    <span className="text-green-700 font-medium">Paiement enregistré avec succès !</span>
                </div>
            )}
            {status === 'error' && (
                <div className="flex flex-col items-center mb-6">
                    <AlertCircle className="w-12 h-12 text-red-600 mb-2" />
                    <span className="text-red-700 font-medium">Erreur lors du paiement. Veuillez réessayer.</span>
                </div>
            )}
            <button
                onClick={handleManualPayment}
                disabled={loading || status === 'success'}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50"
            >
                {loading ? 'Traitement...' : 'Valider le paiement manuel'}
            </button>
        </div>
    );
};

export default ManualPaymentPage; 