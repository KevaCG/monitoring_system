import { Given, When, Then, After } from "@badeball/cypress-cucumber-preprocessor";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Cypress.env('supabaseUrl');
const supabaseKey = Cypress.env('supabaseKey');
const supabase = createClient(supabaseUrl, supabaseKey);

const PROYECTO = "Parly";
const CLIENTE = "Comultrasan";
const CANAL = "Fibotclientes";
const FLUJO = "Solicitud Crédito";

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


Given("el usuario navega en la página web", () => {
    startTime = Date.now();
    executionStatus = "ERROR";
    validarPaso("1. Navegar a Comultrasan (Parly)", () => {
        cy.visit("https://parly-webchat-comultrasan-fibotclientes.atomic-ecm.com.co/comultrasan/index.html");
        cy.wait(2000);
    });
});

When("hago clic en Fibot Asistente virtual", () => {
    validarPaso("2. Abrir Fibot", () => {
        cy.contains("div", /Fitbot/i).trigger('click');
    });
});

When("hago clic en el botón Si cuando me pregunta sobre tratamiento de datos", () => {
    validarPaso("3. Aceptar tratamiento de datos", () => {
        cy.contains("li", /si/i).click();
    });
});

When("hago clic en la opción Solicitar crédito", () => {
    validarPaso("4. Opción Solicitar Crédito", () => {
        cy.contains("li", /Solicitar crédito/i).click();
    });
});

When("luego ingresa un número de cedula valido", () => {
    validarPaso("5. Ingresar Cédula", () => {
        cy.get(".format-markdown", { timeout: 10000 }).should('be.visible');
        cy.get(".wc-shellinput").type('1032328372');
        cy.get(".wc-send").click();
    });
});

When("luego ingresa un nombre si apellidos", () => {
    validarPaso("6. Ingresar Nombre", () => {
        cy.contains("p", /A continuación, por favor ingresa tu nombre/i, { timeout: 10000 });
        cy.get(".wc-shellinput").type('Juan');
        cy.get(".wc-send").click();
    });
});

When("luego ingresa tu apellido", () => {
    validarPaso("7. Ingresar Apellido", () => {
        cy.contains("p", /Ahora por favor ingresa tu apellido/i);
        cy.get(".wc-shellinput").type('Pruebas');
        cy.get(".wc-send").click();
    });
});

When("luego ingresas la ciudad donde vives", () => {
    validarPaso("8. Ingresar Ciudad", () => {
        cy.contains("p", /Confírmame la ciudad donde vives/i);
        cy.get(".wc-shellinput").type('Bogotá');
        cy.get(".wc-send").click();
    });
});

When("luego ingresas tú número de celular", () => {
    validarPaso("9. Ingresar Celular", () => {
        cy.contains("p", /Confírmame tu número celular/i);
        cy.get(".wc-shellinput").type('3124567890');
        cy.get(".wc-send").click();
    });
});

When("luego ingresas tú correo electrónico", () => {
    validarPaso("10. Ingresar Correo", () => {
        cy.contains("p", /Confírmame un correo electrónico/i);
        cy.get(".wc-shellinput").type('juanp@gmail.com');
        cy.get(".wc-send").click();
    });
});

When("hago clic en el botón No", () => {
    validarPaso("11. Negar tarjeta/estudio", () => {
        cy.contains("h1", /¿Tu solicitud es para tarjeta/i, { timeout: 10000 });
        cy.contains("li", /No/i).click();
    });
});

When("hago clic en la cantidad del monto que necesitas", () => {
    validarPaso("12. Seleccionar Monto", () => {
        cy.contains("h1", /El monto de crédito es hasta/i);
        cy.contains("li", /30.000.000/i).click();
    });
});

When("hago clic en solicitar crédito", () => {
    validarPaso("13. Confirmar solicitud", () => {
        cy.contains("h1", /Cuéntanos ¿Qué trámite deseas realizar?/i);
        cy.contains("li", /Solicitar crédito/i).click();
    });
});

When("hago clic en el botón Con un asesor", () => {
    validarPaso("14. Seleccionar 'Por ahora no'", () => {
        cy.contains("li", /Por ahora no/i).click();
    });
});

Then("el chat muestra las opciones de ciudades donde se encuentra disponible", () => {
    validarPaso("15. Verificar respuesta final", () => {
        cy.contains("¿Te puedo ayudar en algo más?", { timeout: 15000 }).should('be.visible');
        executionStatus = "OK";
    });
});

After(() => {
    cy.then(async () => {
        if (executionStatus === 'OK') {
            const duration = Date.now() - startTime;
            const mensajeFinal = `FLUJO COMPLETADO. Fibot respondió correctamente.`;

            Cypress.log({
                name: 'SUPABASE',
                message: `Enviando reporte: ${PROYECTO} -> ${CLIENTE} -> ${CANAL}`
            });

            const { error } = await supabase.from('monitoreos').insert({
                sistema: FLUJO,
                proyecto: PROYECTO,
                cliente: CLIENTE,
                canal: CANAL,
                estado: "OK",
                mensaje: mensajeFinal,
                duracion_ms: duration
            });

            if (error) {
                console.error("Error enviando a Supabase:", error);
                Cypress.log({ name: 'ERROR DB', message: error.message });
            } else {
                console.log("✅ Reporte guardado correctamente en Supabase");
                Cypress.log({ name: 'ÉXITO DB', message: 'Datos guardados.' });
            }
        }
    });
});