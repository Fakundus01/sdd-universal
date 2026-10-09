'use strict';
/* Constantes de la tarjeta IA-1. Lo que depende del entorno (tope diario,
 * modelo) se lee de variables de entorno en fusionar.js; acá solo los
 * defaults y los topes que la tarjeta pide "a definir". */
module.exports = {
  // AC7: tope de sdd/cards/IA-1.md — evita que `descripcion` sea una forma
  // barata de inflar el costo del prompt. 4000 caracteres alcanza para un
  // pedido libre real y acota el peor caso a unos pocos KB de UTF-8.
  MAX_DESCRIPCION_CHARS: 4000,
  // Tope diario de gasto en USD si no hay FUSIONAR_TOPE_DIARIO_USD en el entorno.
  // playbooks/ia-en-el-producto.md "Costos": conservador a propósito.
  TOPE_DIARIO_USD_DEFAULT: 3,
  // max_tokens de la respuesta: entra en la cota (paso 2 del playbook).
  MAX_TOKENS_SALIDA: 4096,
};
