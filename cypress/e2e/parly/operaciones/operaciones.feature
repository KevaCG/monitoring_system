Feature: Asistente virtual comultrasan operaciones

    Scenario: Validar que el chat en la plataforma web Financiera Comultrasan funcione correctamente
        Given el usuario navega en la página web
        When hago clic en Fibot Asistente virtual 
        And hago clic en la opción de operaciones
        And espero que muestre el primer mensaje de fibot
        And envió el mensaje de olvide mi clave
        And hago clic en le botón enviar
        And envió un mensaje con alguna de las opciones que me muestra
        And hago clic de nuevo en el botón enviar
        Then me muestra el botón que debo seleccionar para pasar con un agente