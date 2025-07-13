// Centralisation de la base URL de l'API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Fonction utilitaire pour fetch avec gestion automatique du refresh token et des erreurs d'authentification
export async function fetchWithAuth(input: RequestInfo, init: RequestInit = {}): Promise<Response> {
    let token = localStorage.getItem('token');
    let refreshToken = localStorage.getItem('refreshToken');

    // Préfixe l'URL si besoin
    let url = typeof input === 'string' && input.startsWith('/')
        ? API_BASE_URL + input
        : input;

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
        // N'ajoute PAS Authorization pour /users/login/ ou /users/token/refresh/
        const urlStr = typeof input === 'string' ? input : '';
        if (
            token && token !== 'null' && token.trim() !== '' &&
            !urlStr.includes('/users/login') &&
            !urlStr.includes('/users/token/refresh')
        ) {
            base['Authorization'] = `Bearer ${token}`;
        }
        return base;
    };

    // Première tentative
    let response = await fetch(url, {
        ...init,
        headers: mergeHeaders(init.headers),
    });

    // Si le token est expiré, tente de le rafraîchir
    if (response.status === 401 && refreshToken) {
        try {
            const refreshResp = await fetch(`${API_BASE_URL}/users/token/refresh/`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ refresh: refreshToken }),
            });
            if (refreshResp.ok) {
                const data = await refreshResp.json();
                token = data.access;
                localStorage.setItem('token', token);
                // Rejoue la requête initiale avec le nouveau token
                response = await fetch(url, {
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
    // Si 401 ou 403 après refresh, déconnexion et redirection
    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        window.location.href = '/login';
        throw new Error('Session expirée ou accès refusé.');
    }
    return response;
} 