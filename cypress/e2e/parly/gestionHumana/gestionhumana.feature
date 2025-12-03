Feature: Asistente virtual web - Gestión Humana

    Scenario: Validar el flujo de Nómina y Portal del Empleado en Gestión Humana
        Given el usuario navega en la página web
        When hago clic en Fibot Asistente virtual
        And hago clic en la opción Gestión Humana
        And hago clic en opción Nómina
        And hago clic en Portal del Empleado
        Then si muestra el mensaje Hay algo mas en lo que te pueda ayudar el asistente funciona correctamente