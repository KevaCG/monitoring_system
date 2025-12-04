import { Given, When, Then, After } from "@badeball/cypress-cucumber-preprocessor";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Cypress.env('supabaseUrl');
const supabaseKey = Cypress.env('supabaseKey');
const supabase = createClient(supabaseUrl, supabaseKey);

const PROYECTO = "Parly";
const CLIENTE = "Comultrasan";
const CANAL = "Fibotclientes";
const FLUJO = "Clave Registro";

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

    console.error(`CRITICAL FAILURE EN: ${pasoActual}`);

    return supabase.from('monitoreos').insert({
        sistema: FLUJO,
        proyecto: PROYECTO,
        cliente: CLIENTE,
        canal: CANAL,
        estado: "ERROR",
        mensaje: mensajeFallo,
        duracion_ms: 0
    }).then(() => {
        throw error;
    });
});

Given("el usuario ingresa a la página web de Comultrasan", () => {
    startTime = Date.now();
    executionStatus = "ERROR";
    validarPaso("1. Navegar al Chat", () => {
        cy.visit("https://parly-webchat-comultrasan-fibotclientes.atomic-ecm.com.co/comultrasan/index.html");
        cy.wait(2000);
    });
});

When("abre el asistente virtual Fibot", () => {
    validarPaso("2. Abrir Fibot", () => {
        cy.contains("div", /Fitbot/i).trigger('click');
    });
});

When("acepta el tratamiento de datos personales", () => {
    validarPaso("3. Aceptar tratamiento de datos", () => {
        cy.contains("li", /si/i).click();
    });
});

When("selecciona la opción Clave de registro en el menú", () => {
    validarPaso("4. Seleccionar opción 'Clave de registro'", () => {
        cy.contains(/Opciones/i, { timeout: 15000 }).should('be.visible');
        cy.contains("li", /Clave de registro/i).click();
    });
});

When("responde Si a la pregunta de confirmación", () => {
    validarPaso("5. Confirmar pregunta inicial (Si)", () => {
        cy.contains(/¿Deseas continuar\?/i, { timeout: 15000 }).should('be.visible');
        cy.contains("li", /Si/i).click();
    });
});

When("ingresa el número de cédula para registro", () => {
    validarPaso("6. Ingresar Cédula (1095812717)", () => {
        cy.contains(/Por favor digita tu número de documento de identidad, sin puntos, comas o letras:/i, { timeout: 15000 }).should('be.visible');

        cy.get(".wc-shellinput").type('1095812717');
        cy.get(".wc-send").click();
    });
});

When("ingresa la fecha de expedición requerida", () => {
    validarPaso("7. Ingresar Fecha Expedición (15/07/2010)", () => {
        cy.contains(/Por favor digita la fecha de expedición de tu documento de identidad/i, { timeout: 15000 }).should('be.visible');

        cy.get(".wc-shellinput").type('15/07/2010');
        cy.get(".wc-send").click();
    });
});

Then("el sistema debe entregar un código QR exitosamente", () => {
    validarPaso("8. Validar recepción del mensaje de éxito", () => {
        cy.wait(5000);
        cy.contains("Valida tu identidad", { timeout: 30000 }).should('be.visible');
        cy.log("Mensaje de validación encontrado correctamente");
        executionStatus = "OK";
    });
});

After(() => {
    cy.then(async () => {
        if (executionStatus === 'OK') {
            const duration = Date.now() - startTime;
            const mensajeFinal = `FLUJO COMPLETADO. Clave de registro generada (Mensaje recibido).`;

            Cypress.log({ name: 'SUPABASE', message: `Enviando reporte: ${FLUJO}` });

            const { error } = await supabase.from('monitoreos').insert({
                sistema: FLUJO,
                proyecto: PROYECTO,
                cliente: CLIENTE,
                canal: CANAL,
                estado: "OK",
                mensaje: mensajeFinal,
                duracion_ms: duration
            });

            if (error) console.error("Error Supabase:", error);
            else console.log("Reporte guardado.");
        }
    });
});