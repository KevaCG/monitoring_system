Feature: Asistente virtual financiera comultrasan    
    
    Scenario: Validar que el chat en la plataforma web Financiera Comultrasan funcione correctamente
        Given el usuario navega en la página web
        When hago clic en Fibot Asistente virtual
        And hago clic en el botón Si cuando me pregunta sobre tratamiento de datos
        And hago clic en la opción Solicitar crédito
        And luego ingresa un número de cedula valido
        And luego ingresa un nombre si apellidos
        And luego ingresa tu apellido
        And luego ingresas la ciudad donde vives
        And luego ingresas tú número de celular
        And luego ingresas tú correo electrónico
        And hago clic en el botón No
        And hago clic en la cantidad del monto que necesitas
        And hago clic en solicitar crédito
        And hago clic en el botón Con un asesor
        Then el chat muestra las opciones de ciudades donde se encuentra disponible