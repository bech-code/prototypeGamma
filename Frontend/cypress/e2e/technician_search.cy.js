describe('Recherche de techniciens proches', () => {
    it('Connexion puis test de la recherche', () => {
        // Aller sur la page de login
        cy.visit('/login');

        // Remplir le formulaire de connexion
        cy.get('input[name="email"]').type('client2@example.com');
        cy.get('input[name="password"]').type('client123');
        cy.get('button[type="submit"]').click();

        // Attendre d'être redirigé sur le dashboard
        cy.url().should('include', '/dashboard');

        // Attendre que le titre soit visible
        cy.contains('Trouver un technicien proche', { timeout: 10000 }).should('be.visible');

        // Simuler la géolocalisation
        cy.window().then((win) => {
            cy.stub(win.navigator.geolocation, 'getCurrentPosition')
                .callsFake((cb) => cb({ coords: { latitude: 5.36, longitude: -4.008 } }));
        });

        // S'assurer que les filtres sont larges
        cy.get('select').first().select('Junior');
        cy.get('input[type=number]').clear().type('0');
        cy.contains('Trouver un technicien proche').click();
        // Timeout augmenté pour l'apparition des marqueurs
        cy.get('.leaflet-marker-icon', { timeout: 15000 }).should('exist');
        cy.contains(/technicien/i, { matchCase: false }).should('exist');

        // Tester les filtres (expérience Senior, note 4)
        cy.get('select').first().select('Senior');
        cy.wait(1000);
        cy.get('.leaflet-marker-icon', { timeout: 10000 }).should('exist');
        cy.get('input[name="minRating"]').then($inputs => {
            cy.log('Nombre d\'inputs minRating:', $inputs.length);
            cy.screenshot('avant-type-minRating');
        });
        cy.get('input[name="minRating"]').first().clear().type('4');
        cy.wait(1000);
        cy.get('.leaflet-marker-icon', { timeout: 10000 }).should('exist');

        // Tester le mode urgence si présent
        cy.get('select').eq(1).select('Urgent');
        cy.wait(1000);
        cy.get('.leaflet-marker-icon', { timeout: 10000 }).should('exist');

        // Vérifier l'absence d'erreur
        cy.contains('Erreur lors de la recherche d\'un technicien').should('not.exist');
    });
}); 