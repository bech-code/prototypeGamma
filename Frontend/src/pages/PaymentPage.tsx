import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { fetchWithAuth } from '../contexts/fetchWithAuth';

interface PaymentData {
  request_id: string;
  amount: number;
  description: string;
  customer_name: string;
  customer_surname: string;
  customer_email: string;
  customer_phone_number: string;
  customer_address: string;
  customer_city: string;
  customer_zip_code: string;
  customer_country: string;
  customer_state: string;
  service_name: string;
  date: string;
  time: string;
  is_urgent: boolean;
  phone: string;
}

const PaymentPage: React.FC = () => {
  const { transactionId } = useParams<{ transactionId: string }>();
  const navigate = useNavigate();
  const location = useLocation() as { state: { paymentData?: PaymentData } };
  const [paymentData, setPaymentData] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);

  useEffect(() => {
    // Initialiser le paiement même sans transactionId
      initializePayment();
  }, []);

  const initializePayment = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      // Récupérer les données de paiement depuis l'état de navigation
      const paymentData = location.state?.paymentData;
      if (!paymentData) {
        throw new Error('Données de paiement manquantes');
      }

      console.log('Données de paiement reçues:', paymentData);

      const paymentBody = {
        request_id: paymentData.request_id,
        amount: paymentData.amount,
        description: paymentData.description,
        phone: paymentData.phone,
      };

      const response = await fetchWithAuth(`http://127.0.0.1:8000/depannage/api/cinetpay/initiate_payment/`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(paymentBody),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || data.message || 'Erreur lors de l\'initialisation du paiement');
      }

      if (!data.payment_url) {
        throw new Error('URL de paiement non reçue');
      }

      setPaymentData(paymentData);
      setPaymentUrl(data.payment_url);

    } catch (error: unknown) {
      console.error('Erreur lors de l\'initialisation:', error);
      setError(error instanceof Error ? error.message : 'Erreur lors de l\'initialisation du paiement');
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentRedirect = () => {
    if (paymentUrl) {
      // Redirection vers CinetPay
      window.location.href = paymentUrl;
    }
  };

  const handleRetry = () => {
    setError(null);
    initializePayment();
  };

  const handleBackToBooking = () => {
    navigate('/booking');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold text-gray-800 mb-2">Initialisation du paiement</h2>
            <p className="text-gray-600">Veuillez patienter...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
          <div className="text-center">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-gray-800 mb-4">Erreur de paiement</h2>
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={handleRetry}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
              >
                Réessayer
              </button>
              <button
                onClick={handleBackToBooking}
                className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
              >
                Retour à la réservation
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-md max-w-md w-full">
        <div className="text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>

          <h2 className="text-2xl font-bold text-gray-800 mb-2">Paiement sécurisé</h2>
          <p className="text-gray-600 mb-6">Vous allez être redirigé vers CinetPay pour finaliser votre paiement</p>

          {paymentData && (
            <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
              <h3 className="font-semibold text-gray-800 mb-3">Détails de la transaction</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Référence:</span>
                  <span className="font-medium">{paymentData.request_id}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Montant:</span>
                  <span className="font-medium">{paymentData.amount.toLocaleString()} FCFA</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Service:</span>
                  <span className="font-medium">{paymentData.description}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">{paymentData.customer_name} {paymentData.customer_surname}</span>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            <button
              onClick={handlePaymentRedirect}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg hover:bg-green-700 transition-colors font-semibold"
            >
              Procéder au paiement
            </button>
            <button
              onClick={handleBackToBooking}
              className="w-full bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
            >
              Annuler
            </button>
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-semibold text-blue-800 mb-2">Méthodes de paiement acceptées</h4>
            <div className="flex justify-center space-x-4 text-sm text-blue-700">
              <span>💳 Carte bancaire</span>
              <span>📱 Mobile Money</span>
              <span>💼 Portefeuille</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentPage; 