import React from "react";
import { CheckCircle } from 'lucide-react';

const PaymentSuccess: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-green-50">
        <CheckCircle className="w-16 h-16 text-green-600 mb-4" />
        <h2 className="text-2xl font-bold mb-2 text-green-700">Paiement réussi !</h2>
        <p className="text-gray-700 mb-6">Votre paiement a été traité avec succès. Merci pour votre confiance.</p>
        <a href="/dashboard" className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition">Retour au tableau de bord</a>
    </div>
);

export default PaymentSuccess; 