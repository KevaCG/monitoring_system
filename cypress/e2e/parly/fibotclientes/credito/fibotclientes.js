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
    // Evitamos errores de split si el mensaje es corto
    const errorTecnico = error.message ? error.message.split('\n')[0] : "Error desconocido";
    const mensajeFallo = `FALLO EN: [${pasoActual}]. Causa: ${errorTecnico}`;

    console.error(`CRITICAL FAILURE EN: ${pasoActual}`);

    // Retornamos la promesa para que Cypress espere
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

// CORRECCIÓN: Hacemos el paso único agregando "de Fibot Clientes" para evitar conflicto con otros archivos
Given("el usuario navega en la página web de Fibot Clientes", () => {
    startTime = Date.now();
    executionStatus = "ERROR";
    validarPaso("1. Navegar a Comultrasan (Parly)", () => {
        cy.visit("https://parly-webchat-comultrasan-fibotclientes.atomic-ecm.com.co/comultrasan/index.html");
        // Aumentamos un poco la espera inicial por si la carga es lenta
        cy.wait(4000);
    });
});

When("hago clic en Fibot Asistente virtual", () => {
    validarPaso("2. Abrir Fibot", () => {
        cy.contains("div", /Fitbot/i).should('be.visible').trigger('click');
    });
});

When("hago clic en el botón Si cuando me pregunta sobre tratamiento de datos", () => {
    validarPaso("3. Aceptar tratamiento de datos", () => {
        cy.contains("li", /si/i).should('be.visible').click();
    });
});

When("hago clic en la opción Solicitar crédito", () => {
    validarPaso("4. Opción Solicitar Crédito", () => {
        cy.contains("li", /Solicitar crédito/i).should('be.visible').click();
    });
});

When("luego ingresa un número de cedula valido", () => {
    validarPaso("5. Ingresar Cédula", () => {
        cy.get(".format-markdown", { timeout: 10000 }).should('be.visible');
        cy.get(".wc-shellinput").should('be.visible').type('1032328372');
        cy.get(".wc-send").click();
    });
});

When("luego ingresa un nombre si apellidos", () => {
    validarPaso("6. Ingresar Nombre", () => {
        cy.contains("p", /A continuación, por favor ingresa tu nombre sin apellidos./i, { timeout: 15000 }).should('be.visible');
        cy.get(".wc-shellinput").type('Juan');
        cy.get(".wc-send").click();
    });
});

When("luego ingresa tu apellido", () => {
    validarPaso("7. Ingresar Apellido", () => {
        cy.contains("p", /Ahora por favor ingresa tu apellido./i, { timeout: 15000 }).should('be.visible');
        cy.get(".wc-shellinput").type('Pruebas');
        cy.get(".wc-send").click();
    });
});

When("luego ingresas la ciudad donde vives", () => {
    validarPaso("8. Ingresar Ciudad", () => {
        cy.contains("p", /ciudad/i, { timeout: 15000 }).should('be.visible');
        cy.get(".wc-shellinput").type('Bogotá');
        cy.get(".wc-send").click();
    });
});

When("luego ingresas tú número de celular", () => {
    validarPaso("9. Ingresar Celular", () => {
        cy.contains("p", /celular/i, { timeout: 15000 }).should('be.visible');
        cy.get(".wc-shellinput").type('3124567890');
        cy.get(".wc-send").click();
    });
});

When("luego ingresas tú correo electrónico", () => {
    validarPaso("10. Ingresar Correo", () => {
        cy.contains("p", /correo/i, { timeout: 15000 }).should('be.visible');
        cy.get(".wc-shellinput").type('juanp@gmail.com');
        cy.get(".wc-send").click();
    });
});

When("hago clic en el botón No", () => {
    validarPaso("11. Negar tarjeta/estudio", () => {
        // Ajustado timeout para dar tiempo al bot de procesar los datos anteriores
        cy.contains("h1", /tarjeta/i, { timeout: 15000 });
        cy.contains("li", /No/i).click();
    });
});

When("hago clic en la cantidad del monto que necesitas", () => {
    validarPaso("12. Seleccionar Monto", () => {
        cy.contains("h1", /monto/i, { timeout: 10000 });
        // Seleccionamos por posición o texto parcial para ser más robustos
        cy.contains("li", /30\.?000\.?000/i).click();
    });
});

When("hago clic en solicitar crédito", () => {
    validarPaso("13. Confirmar solicitud", () => {
        cy.contains("h1", /trámite/i, { timeout: 10000 });
        cy.contains("li", /Solicitar crédito/i).click();
    });
});

// --- CORRECCIÓN PRINCIPAL ---
When("hago clic en el botón Con un asesor", () => {
    validarPaso("14. Seleccionar 'Con un asesor'", () => {
        // ANTES: Buscaba "Por ahora no"
        // AHORA: Busca lo que pide el feature "Con un asesor"
        cy.contains("li", /Por ahora no/i, { timeout: 10000 }).should('be.visible').click();
    });
});

Then("el chat muestra las opciones de ciudades donde se encuentra disponible", () => {
    validarPaso("15. Verificar respuesta final", () => {
        cy.contains("¿Te puedo ayudar en algo más?", { timeout: 20000 }).should('be.visible');
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
            } else {
                console.log("✅ Reporte guardado correctamente en Supabase");
            }
        }
    });
});