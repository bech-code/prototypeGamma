const { defineConfig } = require('cypress');

module.exports = defineConfig({
    e2e: {
        baseUrl: 'http://localhost:5173', // adapte si besoin
        supportFile: false,
        specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    },
}); 