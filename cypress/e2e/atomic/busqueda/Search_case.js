import { Given, When, Then, After } from "@badeball/cypress-cucumber-preprocessor";
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = Cypress.env('supabaseUrl');
const supabaseKey = Cypress.env('supabaseKey');
const supabase = createClient(supabaseUrl, supabaseKey);

const PROYECTO = "Atomic";
const CANAL = "Busqueda";
const FLUJO = "Consulta Prueba";

let startTime = 0;
let clienteActual = "";
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

    console.error(`🛑 CRITICAL FAILURE EN: ${pasoActual}`);


    return supabase.from('monitoreos').insert({
        sistema: FLUJO,
        proyecto: PROYECTO,          
        cliente: clienteActual || 'General', 
        canal: CANAL,                
        estado: "ERROR",
        mensaje: mensajeFallo,
        duracion_ms: 0
    }).then(() => {
        throw error;
    });
});


Given("el usuario inicia sesión para el cliente {string}", (cliente) => {
    startTime = Date.now();
    clienteActual = cliente;
    executionStatus = "ERROR";

    validarPaso("1. Obteniendo credenciales", () => {
        cy.fixture("credential").then((data) => {
            const credentials = data.credentials;
            const cred = credentials.find((c) => c.cliente === cliente);
            if (!cred) throw new Error(`Credenciales no encontradas para ${cliente}`);

            cy.wrap(cred).as('cred');

            validarPaso("2. Navegando a la URL", () => {
                cy.visit(cred.url);
            });

            validarPaso("3. Ejecutando Login", () => {
                cy.get("body", { timeout: 60000 }).then(($body) => {
                    const options = { timeout: 11000 };

                    if ($body.find("iframe").length > 0) {
                        cy.log("Login vía Iframe");
                        cy.frameLoaded();
                        cy.wait(2000);
                        cy.iframe().find("#ecm_widget_layout_NavigatorMainLayout_0_LoginPane_username", options)
                            .should("be.visible").type(cred.username);
                        cy.iframe().find("#ecm_widget_layout_NavigatorMainLayout_0_LoginPane_password", options)
                            .should("be.visible").type(cred.password);
                        cy.iframe().find("#ecm_widget_layout_NavigatorMainLayout_0_LoginPane_LoginButton", options)
                            .click();
                    } else {
                        cy.log("Login Estándar");
                        cy.wait(2000);
                        cy.get("#ecm_widget_layout_NavigatorMainLayout_0_LoginPane_username", options)
                            .should("be.visible").type(cred.username);
                        cy.get("#ecm_widget_layout_NavigatorMainLayout_0_LoginPane_password", options)
                            .should("be.visible").type(cred.password);
                        cy.get("#ecm_widget_layout_NavigatorMainLayout_0_LoginPane_LoginButton", options)
                            .click();
                    }
                });
            });

            validarPaso("4. Esperando carga del Dashboard", () => {
                cy.wait(2000);
                cy.get(".featureListIcon", { timeout: 30000 }).should("be.visible");
            });
        });
    });
});

When("hago clic en el menú hamburguesa", () => {
    validarPaso("5. Clic menú hamburguesa", () => {
        cy.get(".featureListIcon", { timeout: 11000 }).click();
    });
});

When("hago clic en buscar", () => {
    validarPaso("6. Seleccionando opción Buscar", () => {
        cy.wait(2000);
        cy.contains("td", /Search|Buscar/i, { timeout: 11000 }).click();
    });
    validarPaso("6.1 Cerrando menú (ESC)", () => {
        cy.get("body").type("{esc}");
    });
});

When("hago clic en Consulta Prueba", () => {
    validarPaso("7. Seleccionando Consulta Prueba", () => {
        cy.contains("span", /ConsultaPrueba/i, { timeout: 11000 }).click();
        cy.wait(2000);
    });
});

When("hago clic en el botón de busqueda", () => {
    validarPaso("8. Buscando botón 'Search' (BottomArea)", () => {
        cy.get(".searchBottomArea", { timeout: 11000 }).within(() => {
            cy.contains("span", /Buscar|Search/i, { timeout: 11000 }).click();
        });
    });
});

Then("el buscador funciona correctamente", () => {
    validarPaso("9. Verificando resultados finales", () => {
        cy.get(".totalCount", { timeout: 20000 }).should("be.visible").then(($element) => {
            const content = $element.text();
            expect(content).to.not.be.empty;
            executionStatus = "OK";
            cy.log(`✅ RESULTADOS: ${content}`);
        });
    });
});

After(() => {

    cy.then(async () => {
        if (executionStatus === 'OK') {
            const duration = Date.now() - startTime;
            const mensajeFinal = `✅ COMPLETADO. Cliente: ${clienteActual}`;

            Cypress.log({
                name: 'SUPABASE',
                message: `Enviando: Atomic -> ${clienteActual}`
            });

        
            const { error } = await supabase.from('monitoreos').insert({
                sistema: FLUJO,
                proyecto: PROYECTO,
                cliente: clienteActual,
                canal: CANAL,
                estado: "OK",
                mensaje: mensajeFinal,
                duracion_ms: duration
            });

            if (error) console.error("Error Supabase:", error);
            else console.log("✅ Reporte Atomic guardado.");
        }
    });
});