'use strict';
/* SOLO para el test de la carrera (R29): la misma operación que reserva.js
 * pero sin lock, con una demora a propósito entre leer y anotar para abrir
 * la ventana que el playbook describe ("se chequea y después se llama").
 * Nunca se usa desde api/fusionar.js. */

function busyWaitMs(ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    /* spin: abre la ventana entre leer `gastado` y escribirlo */
  }
}

function reservarSinLock(estado, cota, tope, delayMs) {
  const gastado = Atomics.load(estado.gastado, 0);
  if (gastado + cota > tope) return { ok: false };
  if (delayMs) busyWaitMs(delayMs);
  Atomics.store(estado.gastado, 0, gastado + cota);
  return { ok: true };
}

module.exports = { reservarSinLock };
