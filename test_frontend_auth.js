// Script de test pour l'authentification frontend
const BASE_URL = 'http://127.0.0.1:8000';

async function testFrontendAuth() {
    console.log('=== Test d\'authentification frontend ===\n');

    // 1. Test de login
    console.log('1. Tentative de login...');
    const loginData = {
        email: 'admin@depanneteliman.com',
        password: 'admin123'
    };

    try {
        const loginResponse = await fetch(`${BASE_URL}/users/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(loginData)
        });

        console.log(`Status: ${loginResponse.status}`);
        const loginResult = await loginResponse.json();
        console.log('Response:', loginResult);

        if (loginResponse.status === 200) {
            const { access, refresh } = loginResult;

            console.log(`Access token présent: ${access ? 'Oui' : 'Non'}`);
            console.log(`Refresh token présent: ${refresh ? 'Oui' : 'Non'}`);

            if (access && refresh) {
                console.log('✅ Login réussi avec tokens');

                // Simuler le stockage localStorage
                localStorage.setItem('token', access);
                localStorage.setItem('refreshToken', refresh);

                console.log('Tokens stockés dans localStorage');
                console.log('Token stocké:', localStorage.getItem('token') ? 'Oui' : 'Non');
                console.log('Refresh token stocké:', localStorage.getItem('refreshToken') ? 'Oui' : 'Non');

                // 2. Test du refresh token
                console.log('\n2. Test du refresh token...');
                const refreshData = { refresh };

                const refreshResponse = await fetch(`${BASE_URL}/users/token/refresh/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(refreshData)
                });

                console.log(`Refresh status: ${refreshResponse.status}`);
                const refreshResult = await refreshResponse.json();
                console.log('Refresh response:', refreshResult);

                if (refreshResponse.status === 200) {
                    console.log('✅ Refresh token fonctionne côté frontend');

                    // 3. Test avec le nouveau token
                    const newAccess = refreshResult.access;
                    if (newAccess) {
                        console.log('\n3. Test avec le nouveau token...');
                        const meResponse = await fetch(`${BASE_URL}/users/me/`, {
                            headers: {
                                'Authorization': `Bearer ${newAccess}`
                            }
                        });

                        console.log(`Me endpoint status: ${meResponse.status}`);
                        if (meResponse.status === 200) {
                            console.log('✅ Nouveau token valide côté frontend');
                        } else {
                            console.log('❌ Nouveau token invalide côté frontend');
                        }
                    }
                } else {
                    console.log('❌ Refresh token échoué côté frontend');
                }
            } else {
                console.log('❌ Tokens manquants dans la réponse');
            }
        } else {
            console.log('❌ Login échoué côté frontend');
        }

    } catch (error) {
        console.error('❌ Erreur:', error);
    }
}

// Test de simulation du comportement AuthContext
async function testAuthContextSimulation() {
    console.log('\n=== Simulation AuthContext ===\n');

    try {
        // 1. Login
        const loginResponse = await fetch(`${BASE_URL}/users/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                email: 'admin@depanneteliman.com',
                password: 'admin123'
            })
        });

        if (loginResponse.status === 200) {
            const data = await loginResponse.json();
            const { access, refresh } = data;

            console.log('1. Login réussi');
            console.log(`Access: ${access ? access.substring(0, 20) + '...' : 'None'}`);
            console.log(`Refresh: ${refresh ? refresh.substring(0, 20) + '...' : 'None'}`);

            // Simuler le stockage AuthContext
            localStorage.setItem('token', access);
            localStorage.setItem('refreshToken', refresh);

            // 2. Simuler une requête qui échoue (token expiré)
            console.log('\n2. Simulation d\'une requête avec token expiré...');

            // Attendre un peu pour simuler l'expiration
            await new Promise(resolve => setTimeout(resolve, 1000));

            // 3. Simuler le refresh automatique
            console.log('\n3. Tentative de refresh automatique...');
            const storedRefresh = localStorage.getItem('refreshToken');
            console.log(`Refresh token stocké: ${storedRefresh ? 'Oui' : 'Non'}`);

            if (storedRefresh) {
                const refreshResponse = await fetch(`${BASE_URL}/users/token/refresh/`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ refresh: storedRefresh })
                });

                console.log(`Refresh status: ${refreshResponse.status}`);
                if (refreshResponse.status === 200) {
                    const refreshData = await refreshResponse.json();
                    console.log('✅ Refresh réussi');
                    console.log(`Nouveau access: ${refreshData.access ? refreshData.access.substring(0, 20) + '...' : 'None'}`);
                } else {
                    console.log('❌ Refresh échoué');
                }
            } else {
                console.log('❌ Aucun refresh token stocké');
            }
        } else {
            console.log('❌ Login échoué');
        }

    } catch (error) {
        console.error('Erreur:', error);
    }
}

// Exécuter les tests
testFrontendAuth().then(() => {
    testAuthContextSimulation();
}); 