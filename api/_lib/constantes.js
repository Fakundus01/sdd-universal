'use strict';
/* Constantes de la tarjeta IA-1. Lo que depende del entorno (tope diario,
 * modelo) se lee de variables de entorno en fusionar.js; acá solo los
 * defaults y los topes que la tarjeta pide "a definir". */
module.exports = {
  // AC7: tope de sdd/cards/IA-1.md — evita que `descripcion` sea una forma
  // barata de inflar el costo del prompt. 4000 caracteres alcanza para un
  // pedido libre real y acota el peor caso a unos pocos KB de UTF-8.
  // Ojo: son unidades UTF-16 (`.length`), no "caracteres" en sentido estricto
  // (2000 emoji llegan al tope) — aceptado, el mensaje de error lo simplifica.
  MAX_DESCRIPCION_CHARS: 4000,
  // Review de IA-1, Cambio 2: `custom`, `tecnologias` y `playbooks` también
  // entran al prompt y no tenían cota — un `custom` de 100KB gastaba USD 2,11
  // de un tope de 3 en un solo pedido.
  MAX_CUSTOM_BYTES: 8000,
  MAX_ARRAY_ITEMS: 40,
  MAX_ITEM_CHARS: 60, // mismo largo que ya usa Prompt.limpiarTecnologia (contracts.md §5)
  // Tope diario de gasto en USD si no hay FUSIONAR_TOPE_DIARIO_USD en el entorno.
  // playbooks/ia-en-el-producto.md "Costos": conservador a propósito.
  // ADR-017: esto es un freno por instancia de Vercel, no un tope global —
  // el techo real y duro es el límite de gasto de la consola de Anthropic.
  TOPE_DIARIO_USD_DEFAULT: 3,
  // max_tokens de la respuesta: entra en la cota (paso 2 del playbook).
  // 8192 en vez de 4096 (review, "no bloquea"): un sdd/ entero en JSON corre
  // riesgo de cortarse por max_tokens; sin la clave real no se puede medir
  // mejor que esto, así que se prefiere menos riesgo de corte sobre una cota
  // más ajustada.
  MAX_TOKENS_SALIDA: 8192,
};
