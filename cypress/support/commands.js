import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Cypress.env('supabaseUrl');
const supabaseKey = Cypress.env('supabaseKey');
const supabase = createClient(supabaseUrl, supabaseKey);

Cypress.Commands.add('logMonitor', (sistema, estado, mensaje, duracion) => {
    // Usamos cy.wrap para manejar la promesa de Supabase dentro de la cadena de Cypress
    return cy.wrap(
        supabase.from('monitoreos').insert({
            sistema: sistema,
            estado: estado,
            mensaje: mensaje,
            duracion_ms: duracion
        })
    ).then(({ error }) => {
        if (error) {
            cy.log('❌ Error guardando en Supabase:', error.message);
        } else {
            cy.log('✅ Log guardado en Supabase');
        }
    });
});