import { Given, When, Then, After } from "@badeball/cypress-cucumber-preprocessor";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Cypress.env('supabaseUrl');
const supabaseKey = Cypress.env('supabaseKey');
const supabase = createClient(supabaseUrl, supabaseKey);

const PROYECTO = "Parly";
const CLIENTE = "Comultrasan";
const CANAL = "Operaciones";
const FLUJO = "Olvide Clave";

let startTime = 0;
let executionStatus = "ERROR";
let pasoActual = "Inicio";

const validarPaso = (descripcion, accion) => {
    pasoActual = descripcion;
    cy.then(() => Cypress.log({ name: 'PASO', message: descripcion }));
    accion();
};

Cypress.on('fail', (error, runnable) => {
    executionStatus = "ERROR";
    const errorTecnico = error.message.split('\n')[0];
    const mensajeFallo = `FALLO EN: [${pasoActual}]. Causa: ${errorTecnico}`;

    return supabase.from('monitoreos').insert({
        sistema: FLUJO,
        proyecto: PROYECTO,
        cliente: CLIENTE,
        canal: CANAL,
        estado: "ERROR",
        mensaje: mensajeFallo,
        duracion_ms: 0
    }).then(() => { throw error; });
});


Given("el usuario navega en la página web", () => {
    startTime = Date.now();
    executionStatus = "ERROR";
    validarPaso("1. Navegar al sitio", () => {
        cy.visit("https://parly-webchat-comultrasan-fibotgestionhumanaoperaciones.1jp71cao1my3.us-east.codeengine.appdomain.cloud/comultrasan/index.html");
    });
});

When("hago clic en Fibot Asistente virtual", () => {
    validarPaso("2. Abrir Fibot", () => {
        cy.get(".img-responsive", { timeout: 10000 }).should('be.visible').click();
    });
});

When("hago clic en la opción de operaciones", () => {
    validarPaso("3. Seleccionar Operaciones", () => {
        cy.get(".chatO", { timeout: 10000 }).should('be.visible').click({ force: true });
    });
});

When("espero que muestre el primer mensaje de fibot", () => {
    validarPaso("4. Esperar saludo inicial", () => {
        cy.get(".markdown", { timeout: 10000 }).should('exist');
    });
});

When("envió el mensaje de olvide mi clave", () => {
    validarPaso("5. Escribir 'olvide mi clave'", () => {
        cy.wait(4000); // Espera necesaria por animación del chat
        cy.get('.css-16qahhi > input').should('be.visible').type('olvide mi clave');
    });
});

When("hago clic en le botón enviar", () => {
    validarPaso("6. Enviar mensaje", () => {

        cy.get(":nth-child(3) > .css-115fwte").click();
        cy.wait(5000);
    });
});

When("envió un mensaje con alguna de las opciones que me muestra", () => {
    validarPaso("7. Seleccionar opción (Sat)", () => {
        cy.get('.css-16qahhi > input').should('be.visible').type('Sat');
    });
});

When("hago clic de nuevo en el botón enviar", () => {
    validarPaso("8. Enviar opción", () => {
        cy.get(":nth-child(3) > .css-115fwte").click();
    });
});

Then("me muestra el botón que debo seleccionar para pasar con un agente", () => {
    validarPaso("9. Validar botón de Agente", () => {
        cy.contains('Pulsa aquí para paso con Agente', { timeout: 15000 }).should('be.visible');
        executionStatus = "OK";
    });
});

After(() => {
    cy.then(async () => {
        if (executionStatus === 'OK') {
            const duration = Date.now() - startTime;
            const mensajeFinal = `✅ FLUJO COMPLETADO. Operaciones OK.`;

            await supabase.from('monitoreos').insert({
                sistema: FLUJO,
                proyecto: PROYECTO,
                cliente: CLIENTE,
                canal: CANAL,
                estado: "OK",
                mensaje: mensajeFinal,
                duracion_ms: duration
            });
            cy.log("✅ Reporte enviado a Supabase");
        }
    });
});