// Fonction utilitaire pour fetch avec gestion automatique du refresh token
export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    let token = localStorage.getItem('token');
    let refreshToken = localStorage.getItem('refreshToken');

    // Fusionne proprement les headers
    const mergeHeaders = (headers: HeadersInit = {}) => {
        let base: Record<string, string> = {};
        if (headers instanceof Headers) {
            headers.forEach((v, k) => { base[k] = v; });
        } else if (Array.isArray(headers)) {
            headers.forEach(([k, v]) => { base[k] = v; });
        } else {
            base = { ...headers };
        }
        // Ajoute Authorization seulement si token existe et n'est pas vide
        if (token && token !== 'null' && token.trim() !== '') {
            base['Authorization'] = `Bearer ${token}`;
        }
        return base;
    };

    // Première tentative
    let response = await fetch(input, {
        ...init,
        headers: mergeHeaders(init.headers),
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
                    headers: mergeHeaders(init.headers),
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