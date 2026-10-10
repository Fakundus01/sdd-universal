'use strict';
/* AC7 completo (review de IA-1, Cambios 2 y 3): valida TODO lo que entra al
 * prompt, no solo `descripcion` — y valida el TIPO antes de usarlo, para que
 * un campo mal tipado nunca llegue a `.join`/`.length` y tire un 500
 * (contrato §8: "nunca un 500 genérico"). */
const { tipoValido, stackValido } = require('./catalogo');
const { bytesUtf8 } = require('./costo');
const { MAX_DESCRIPCION_CHARS, MAX_CUSTOM_BYTES, MAX_ARRAY_ITEMS, MAX_ITEM_CHARS } = require('./constantes');

function esArrayDeStringsCorto(valor, maxItems, maxChars) {
  return (
    Array.isArray(valor) &&
    valor.length <= maxItems &&
    valor.every((x) => typeof x === 'string' && x.length <= maxChars)
  );
}

/** Devuelve `{ok:true, pedido}` con los defaults ya aplicados, o `{ok:false, error}`. */
function validarPedido(pedido) {
  if (!pedido || typeof pedido !== 'object' || Array.isArray(pedido)) {
    return { ok: false, error: 'pedido inválido: se esperaba JSON' };
  }
  const { tipo, stack, tecnologias = [], playbooks = [], custom = '', descripcion = '' } = pedido;

  if (!tipoValido(tipo)) return { ok: false, error: 'tipo no está en el catálogo' };
  if (!stackValido(stack)) return { ok: false, error: 'stack no está en el catálogo' };
  if (!esArrayDeStringsCorto(tecnologias, MAX_ARRAY_ITEMS, MAX_ITEM_CHARS)) {
    return {
      ok: false,
      error: `tecnologias tiene que ser una lista de hasta ${MAX_ARRAY_ITEMS} textos de hasta ${MAX_ITEM_CHARS} caracteres`,
    };
  }
  if (!esArrayDeStringsCorto(playbooks, MAX_ARRAY_ITEMS, MAX_ITEM_CHARS)) {
    return {
      ok: false,
      error: `playbooks tiene que ser una lista de hasta ${MAX_ARRAY_ITEMS} textos de hasta ${MAX_ITEM_CHARS} caracteres`,
    };
  }
  if (typeof custom !== 'string' || bytesUtf8(custom) > MAX_CUSTOM_BYTES) {
    return { ok: false, error: `custom tiene que ser texto de hasta ${MAX_CUSTOM_BYTES} bytes` };
  }
  if (typeof descripcion !== 'string' || descripcion.length > MAX_DESCRIPCION_CHARS) {
    return { ok: false, error: `descripcion supera el máximo de ${MAX_DESCRIPCION_CHARS} caracteres` };
  }

  return { ok: true, pedido: { tipo, stack, tecnologias, playbooks, custom, descripcion } };
}

module.exports = { validarPedido, esArrayDeStringsCorto };
