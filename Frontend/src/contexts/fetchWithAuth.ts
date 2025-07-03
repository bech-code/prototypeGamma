// Fonction utilitaire pour fetch avec gestion automatique du refresh token
export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    let token = localStorage.getItem('token');
    let refreshToken = localStorage.getItem('refreshToken');

    // Ajoute l'en-tête Authorization
    const addAuthHeader = (headers: HeadersInit = {}) => ({
        ...headers,
        Authorization: `Bearer ${token}`,
    });

    // Première tentative
    let response = await fetch(input, {
        ...init,
        headers: addAuthHeader(init.headers),
    });

    // Si le token est expiré, tente de le rafraîchir
    if (response.status === 401 && refreshToken) {
        try {
            const refreshResp = await fetch('http://127.0.0.1:8000/users/token/refresh/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });
            if (refreshResp.ok) {
                const data = await refreshResp.json();
                token = data.access;
                localStorage.setItem('token', token);
                // Rejoue la requête initiale avec le nouveau token
                response = await fetch(input, {
                    ...init,
                    headers: addAuthHeader(init.headers),
                });
            } else {
                // Refresh token invalide/expiré
                localStorage.removeItem('token');
                localStorage.removeItem('refreshToken');
                window.location.href = '/login';
                throw new Error('Session expirée, veuillez vous reconnecter.');
            }
        } catch (err) {
            localStorage.removeItem('token');
            localStorage.removeItem('refreshToken');
            window.location.href = '/login';
            throw err;
        }
    }
    return response;
} 