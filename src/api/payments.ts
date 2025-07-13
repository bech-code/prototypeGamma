// Paiements API - squelette

export async function createPayment(token: string, paymentData: any) {
    return fetch('/depannage/api/payments/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentData),
    });
} 