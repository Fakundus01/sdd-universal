'use strict';
/* SOLO para el test de concurrencia: la misma sección crítica que
 * reservar() de api/_lib/reserva.js, pero con una demora a propósito entre
 * leer y anotar, para probar que el lock REAL de producción (las mismas
 * `adquirirLock`/`liberarLock` exportadas) sigue siendo correcto aun con la
 * ventana ensanchada a mano. No hay ningún parámetro de debug en
 * api/_lib/reserva.js (review de IA-1, mejora no bloqueante): el hook vive
 * solo acá. */
const { adquirirLock, liberarLock } = require('../../_lib/reserva');

function busyWaitMs(ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    /* spin a propósito: ensancha la sección crítica */
  }
}

function reservarConDelay(estado, cota, tope, delayMs) {
  adquirirLock(estado.lock);
  try {
    const gastado = Atomics.load(estado.gastado, 0);
    if (gastado + cota > tope) return { ok: false };
    if (delayMs) busyWaitMs(delayMs);
    Atomics.store(estado.gastado, 0, gastado + cota);
    return { ok: true };
  } finally {
    liberarLock(estado.lock);
  }
}

module.exports = { reservarConDelay };
