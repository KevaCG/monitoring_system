Feature: Validar la funcionalidad del buscador en "Consulta Prueba"

  Scenario Outline: Validar que el buscador en "Consulta Prueba" funcione correctamente para cada cliente
    Given el usuario inicia sesión para el cliente "<cliente>"
    When hago clic en el menú hamburguesa
    And hago clic en buscar
    And hago clic en Consulta Prueba
    And hago clic en el botón de busqueda
    Then el buscador funciona correctamente

    Examples:
      | cliente     |
      | Gobio       |
      | Comultrasan |
      | Flamingo    |
      | Keralty     |