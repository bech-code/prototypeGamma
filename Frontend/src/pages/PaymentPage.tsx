import React from 'react';

const PaymentPage: React.FC = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-6 rounded shadow-md max-w-lg">
                <h1 className="text-2xl font-bold mb-2">Paiement en main propre</h1>
                <p className="text-lg">Le paiement doit être effectué <span className="font-semibold">en main propre au technicien</span> lors de la réalisation de la prestation.</p>
                <p className="mt-4 text-sm text-gray-600">Aucun paiement en ligne n'est requis ni accepté sur la plateforme.</p>
            </div>
        </div>
    );
};

export default PaymentPage; 