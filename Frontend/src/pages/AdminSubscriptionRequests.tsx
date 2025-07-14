import React from "react";

const AdminSubscriptionRequests: React.FC = () => (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
        <h2 className="text-2xl font-bold mb-4">Demandes d'abonnement</h2>
        <p className="text-gray-600 mb-8">Gestion des demandes d'abonnement des utilisateurs.</p>
        {/* Liste ou tableau des demandes à intégrer ici */}
        <div className="w-full max-w-2xl bg-white rounded shadow p-6">
            <p className="text-center text-gray-400">Aucune demande pour le moment.</p>
        </div>
    </div>
);

export default AdminSubscriptionRequests; 