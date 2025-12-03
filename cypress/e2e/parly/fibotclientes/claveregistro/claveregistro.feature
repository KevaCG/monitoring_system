Feature: Generación de Clave de Registro en Fibot

    Scenario: Validar el flujo de obtención de clave de registro mediante código QR
        Given el usuario ingresa a la página web de Comultrasan
        When abre el asistente virtual Fibot
        And acepta el tratamiento de datos personales
        And selecciona la opción Clave de registro en el menú
        And responde Si a la pregunta de confirmación
        And ingresa el número de cédula para registro
        And ingresa la fecha de expedición requerida
        Then el sistema debe entregar un código QR exitosamente