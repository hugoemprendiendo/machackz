# Changelog

## [FECHA_ACTUAL]

### Arreglo Crítico: Error al Añadir Partes a Órdenes

**Justificación:**

Se detectó un error de tipo `TypeError: currentData.items is not iterable` que ocurría exclusivamente al intentar añadir un producto o servicio a una orden de servicio existente. Este problema no afectaba la creación de ventas directas.

El error fue introducido en una actualización anterior donde se unificó la lógica para añadir ítems tanto a ventas como a órdenes. La función `addMultiplePartsToOrder` asumía incorrectamente que el documento a actualizar siempre tendría una propiedad `items` (que pertenece a las ventas), cuando en realidad las órdenes de servicio utilizan una propiedad llamada `parts`.

**Cambios Realizados:**

- **`src/context/data-context.tsx`**: Se modificó la función `addMultiplePartsToOrder`.
  - Se añadió una lógica condicional que comprueba si el documento a actualizar es una venta (`isSale`).
  - Si es una venta, se utiliza `currentData.items` para leer y actualizar la lista de ítems.
  - Si es una orden de servicio (no es una venta), se utiliza `currentData.parts` para leer y actualizar la lista de partes.

Este cambio asegura que la estructura de datos correcta sea utilizada para cada tipo de documento, resolviendo el error y restaurando la funcionalidad para añadir partes a las órdenes de servicio sin afectar la funcionalidad de las ventas.
