import { Given, When, Then, After } from "@badeball/cypress-cucumber-preprocessor";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Cypress.env('supabaseUrl');
const supabaseKey = Cypress.env('supabaseKey');
const supabase = createClient(supabaseUrl, supabaseKey);

const PROYECTO = "Parly";
const CLIENTE = "Comultrasan";
const CANAL = "Gestión Humana";
const FLUJO = "Portal Empleado";

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

When("hago clic en Fibot Asistente virtual Operaciones", () => {
    validarPaso("2. Abrir Fibot", () => {
        cy.get(".img-responsive", { timeout: 10000 }).should('be.visible').click();
    });
});

When("hago clic en la opción Gestión Humana", () => {
    validarPaso("3. Seleccionar Gestión Humana", () => {
        cy.get(".chatG", { timeout: 10000 }).should('be.visible').click({ force: true });
    });
});

When("hago clic en opción Nómina", () => {
    validarPaso("4. Seleccionar Nómina", () => {
        cy.contains("div", /Nómina/i, { timeout: 10000 }).should('be.visible').click();
    });
});

When("hago clic en Portal del Empleado", () => {
    validarPaso("5. Seleccionar Portal Empleado", () => {
        cy.get('[aria-label=" Portal del Empleado"]', { timeout: 10000 }).should('be.visible').click();
    });
});

Then("si muestra el mensaje Hay algo mas en lo que te pueda ayudar el asistente funciona correctamente", () => {
    validarPaso("6. Validar mensaje final", () => {
        cy.wait(3000);
        cy.contains('¿Hay algo más en lo que te pueda ayudar?', { timeout: 15000 }).should('be.visible');
        executionStatus = "OK";
    });
});

After(() => {
    cy.then(async () => {
        if (executionStatus === 'OK') {
            const duration = Date.now() - startTime;
            const mensajeFinal = `FLUJO COMPLETADO. Gestión Humana OK.`;

            await supabase.from('monitoreos').insert({
                sistema: FLUJO,
                proyecto: PROYECTO,
                cliente: CLIENTE,
                canal: CANAL,
                estado: "OK",
                mensaje: mensajeFinal,
                duracion_ms: duration
            });
            cy.log("Reporte enviado a Supabase");
        }
    });
});