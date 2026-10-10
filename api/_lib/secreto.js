'use strict';
/* AC8: la clave nunca viaja en la respuesta ni en ningún log. Si un error de
 * la API la repite (algunos proveedores la citan en el mensaje), se tacha
 * ANTES de loguear — nunca se loguea el objeto de error completo. */

function tachar(texto, clave) {
  if (typeof texto !== 'string' || !clave) return texto;
  return texto.split(clave).join('[REDACTED]');
}

/** Al log va el TIPO, nunca el texto (playbook §B paso 9: "puede traer datos
 * del usuario") — y punto, sin excepción "por si acaso": loguear el mensaje
 * fue justo lo que en la review dejó pasar el cuerpo entero de un error de
 * la API. `error.name` en las clases del SDK de Anthropic hereda el genérico
 * "Error" (no lo pisan), así que `error.constructor.name` es la señal real
 * (ej. "BadRequestError", "APIConnectionError"); el `status` HTTP, si lo
 * hay, se suma porque es dato del protocolo, no del usuario. */
function logSeguro(prefijo, error) {
  const tipo = (error && error.constructor && error.constructor.name) || (error && error.name) || typeof error;
  const status = error && typeof error.status === 'number' ? ` status=${error.status}` : '';
  console.error(`${prefijo}: ${tipo}${status}`);
}

module.exports = { tachar, logSeguro };
