'use strict';
/* AC8: la clave nunca viaja en la respuesta ni en ningún log. Si un error de
 * la API la repite (algunos proveedores la citan en el mensaje), se tacha
 * ANTES de loguear — nunca se loguea el objeto de error completo. */

function tachar(texto, clave) {
  if (typeof texto !== 'string' || !clave) return texto;
  return texto.split(clave).join('[REDACTED]');
}

/** El tipo del error siempre es la señal principal (playbook §B paso 9: "al
 * log va el tipo, nunca el texto, porque puede traer datos del usuario");
 * el mensaje se tacha igual, por si acaso, pero nunca se loguea el stack
 * completo ni el objeto crudo del SDK (podría traer headers con la key). */
function logSeguro(prefijo, error, clave) {
  const tipo = (error && (error.name || error.constructor?.name)) || typeof error;
  const mensaje = error && typeof error.message === 'string' ? tachar(error.message, clave) : '';
  console.error(`${prefijo}: ${tipo}${mensaje ? ' — ' + mensaje : ''}`);
}

module.exports = { tachar, logSeguro };
