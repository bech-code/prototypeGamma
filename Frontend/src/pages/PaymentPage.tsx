import React from "react";

const PaymentPage: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">Paiement</h2>
        <p className="text-gray-600 mb-8">Interface de paiement sécurisée pour vos transactions.</p>
        {/* Intégration du formulaire ou du module de paiement ici */}
        <div className="w-full max-w-md bg-white rounded shadow p-6">
            <p className="text-center text-gray-400">Module de paiement à venir...</p>
        </div>
    </div>
);

export default PaymentPage; 