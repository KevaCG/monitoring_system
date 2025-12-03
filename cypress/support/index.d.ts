/// <reference types="cypress" />

declare namespace Cypress {
    interface Chainable {
        /**
         * Comando personalizado para enviar logs a Supabase
         */
        logMonitor(
            sistema: string,
            estado: 'OK' | 'ERROR' | 'WARNING',
            mensaje?: string,
            duracion?: number // <--- ¡ESTA ES LA LÍNEA QUE FALTA!
        ): Chainable<void>;

        /**
         * Comando para login en ECM manejando iframes
         */
        loginECM(cred: any): Chainable<void>;

        // Definiciones de iframe
        iframe(): Chainable<any>;
        frameLoaded(): Chainable<void>;
    }
}