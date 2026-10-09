'use strict';
/* El SDK real sobre un transporte falso en los tests (tecnologias.md, ficha
 * "Anthropic API"; playbook §E paso 20): nunca un mock del cliente. El
 * cliente oficial acepta una implementación propia de `fetch`, así que los
 * tests inyectan ahí su servidor falso y todo lo demás (parseo, status,
 * clases de error, `usage`) corre de verdad. */
const Anthropic = require('@anthropic-ai/sdk');

let _fetchParaTests = null;

/** SOLO para tests: reemplaza el `fetch` que usa el SDK. `null` lo saca. */
function _establecerFetchParaTests(fn) {
  _fetchParaTests = fn;
}

/** AC5: un solo intento por llamada — `maxRetries: 0`. Los reintentos
 * automáticos del SDK cobran más sin avisar (playbook §A paso 4). */
function crearCliente(apiKey) {
  const opciones = { apiKey, maxRetries: 0 };
  if (_fetchParaTests) opciones.fetch = _fetchParaTests;
  return new Anthropic(opciones);
}

module.exports = { crearCliente, _establecerFetchParaTests, APIError: Anthropic.APIError };
