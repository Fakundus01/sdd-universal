'use strict';
/* Cota de gasto: playbooks/ia-en-el-producto.md §A paso 2.
 * - Entrada: un token por byte UTF-8 de todo lo que se manda (cota dura).
 * - Precio: el peor — toda la entrada como escritura de caché (1,25x, TTL 5
 *   min) y un margen fijo por lo que agrega el proveedor (formato de
 *   mensajes, tool use).
 * - Salida: max_tokens × precio de salida.
 *
 * LOS PRECIOS DE ACÁ SON UN PEOR CASO CONSERVADOR, NO LA TARIFA REAL:
 * tecnologias.md (ficha "Anthropic API") y R19 piden verificarlos contra la
 * doc vigente del proveedor antes de producción — un ID de modelo o una
 * tabla vieja subestiman el tope. Esta tarjeta no tuvo permiso para leer
 * costs.md ni para salir a buscar precios en vivo (R11): quien despliegue
 * la función tiene que confirmar estos números.
 */
const PEOR_PRECIO_ENTRADA_USD_POR_TOKEN = 15 / 1_000_000;
const PEOR_PRECIO_SALIDA_USD_POR_TOKEN = 75 / 1_000_000;
const MULTIPLICADOR_CACHE_ESCRITURA = 1.25; // TTL 5 min
const MARGEN_TOKENS_PROVEEDOR = 500;

function bytesUtf8(texto) {
  return Buffer.byteLength(String(texto ?? ''), 'utf8');
}

/** Lo máximo que puede costar la llamada, en USD, antes de llamar. */
function estimarCotaUSD({ promptBytes, maxTokensSalida }) {
  const tokensEntrada = promptBytes + MARGEN_TOKENS_PROVEEDOR;
  const costoEntrada = tokensEntrada * PEOR_PRECIO_ENTRADA_USD_POR_TOKEN * MULTIPLICADOR_CACHE_ESCRITURA;
  const costoSalida = maxTokensSalida * PEOR_PRECIO_SALIDA_USD_POR_TOKEN;
  return costoEntrada + costoSalida;
}

/** Costo real a partir del `usage` que devuelve la API (paso 6-8 del playbook). */
function costoRealUSD(usage) {
  const u = usage || {};
  const entrada = Number(u.input_tokens) || 0;
  const salida = Number(u.output_tokens) || 0;
  const cacheEscritura = Number(u.cache_creation_input_tokens) || 0;
  const cacheLectura = Number(u.cache_read_input_tokens) || 0;
  return (
    entrada * PEOR_PRECIO_ENTRADA_USD_POR_TOKEN +
    cacheEscritura * PEOR_PRECIO_ENTRADA_USD_POR_TOKEN * MULTIPLICADOR_CACHE_ESCRITURA +
    cacheLectura * PEOR_PRECIO_ENTRADA_USD_POR_TOKEN * 0.1 +
    salida * PEOR_PRECIO_SALIDA_USD_POR_TOKEN
  );
}

/** USD -> micro-dólares enteros (BigInt), redondeando siempre para arriba: la cota nunca se subestima. */
function usdAMicros(usd) {
  return BigInt(Math.ceil(Number(usd) * 1_000_000));
}

module.exports = { bytesUtf8, estimarCotaUSD, costoRealUSD, usdAMicros };
