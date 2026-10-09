'use strict';
/* La reserva de gasto: playbooks/ia-en-el-producto.md §A paso 1.
 * "Nunca chequear y después llamar": bajo lock se anota `gastado + cota <=
 * tope` y RECIÉN AHÍ se llama. El estado vive en SharedArrayBuffer y el
 * lock es un spinlock de Atomics — no una promesa encadenada — porque la
 * tarjeta pide probarlo con hilos reales (worker_threads), no con async
 * interleaving simulado en el mismo hilo (ver api/tests/reserva.test.mjs):
 * un "lock" que solo sirve entre promesas del mismo hilo puede dar verde
 * por suerte (JS corre lo sincrónico de un tirón) sin proteger nada de
 * verdad. Atomics.compareExchange es la única primitiva que sigue siendo
 * correcta tanto en el hilo principal (producción: un solo proceso, muchos
 * pedidos concurrentes por I/O asíncrona) como entre hilos reales (el test).
 *
 * Unidad interna: micro-dólares (1e-6 USD) en un BigInt64Array, para no
 * perder precisión con floats bajo Atomics (que no opera sobre Float64Array
 * de forma atómica para read-modify-write).
 */

const LIBRE = 0;
const TOMADO = 1;
const LIMITE_ESPERA_ITERACIONES = 10_000_000; // válvula de seguridad: nunca se espera esto en la práctica

function crearEstado() {
  return {
    lock: new Int32Array(new SharedArrayBuffer(4)),
    gastado: new BigInt64Array(new SharedArrayBuffer(8)),
  };
}

function adquirirLock(lock) {
  let i = 0;
  while (Atomics.compareExchange(lock, 0, LIBRE, TOMADO) !== LIBRE) {
    i += 1;
    if (i > LIMITE_ESPERA_ITERACIONES) throw new Error('reserva: lock nunca se liberó');
  }
}

function liberarLock(lock) {
  Atomics.store(lock, 0, LIBRE);
}

function busyWaitMs(ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    /* spin: usado SOLO por el test de concurrencia, para ensanchar a propósito
       la ventana entre leer y anotar y así demostrar que el lock la cierra
       igual (mutante "reserva sin lock" de la verificación del playbook). */
  }
}

/**
 * Bajo lock: si `gastado + cota <= tope`, anota la cota y devuelve {ok:true}.
 * Si no entra, no anota nada y devuelve {ok:false}. `cota` y `tope` son
 * BigInt en micro-dólares.
 *
 * `debugDelayMs` (opcional): SOLO para api/tests/reserva.test.mjs — nunca lo
 * pasa api/fusionar.js. Ensancha la sección crítica para probar que, aun con
 * la ventana abierta a propósito, el lock sigue dando un resultado correcto.
 */
function reservar(estado, cota, tope, debugDelayMs = 0) {
  adquirirLock(estado.lock);
  try {
    const gastado = Atomics.load(estado.gastado, 0);
    if (gastado + cota > tope) return { ok: false, gastado };
    if (debugDelayMs) busyWaitMs(debugDelayMs);
    Atomics.store(estado.gastado, 0, gastado + cota);
    return { ok: true, gastado: gastado + cota };
  } finally {
    liberarLock(estado.lock);
  }
}

/** Costo 0 (AC6, un APIStatusError): se devuelve toda la cota reservada. */
function liberar(estado, cota) {
  ajustar(estado, -cota);
}

/** Ajusta lo anotado por la diferencia real una vez que se conoce el costo
 * de verdad (delta puede ser negativo). Nunca deja `gastado` negativo. */
function ajustar(estado, delta) {
  adquirirLock(estado.lock);
  try {
    const gastado = Atomics.load(estado.gastado, 0);
    let nuevo = gastado + delta;
    if (nuevo < 0n) nuevo = 0n;
    Atomics.store(estado.gastado, 0, nuevo);
    return nuevo;
  } finally {
    liberarLock(estado.lock);
  }
}

function gastadoActual(estado) {
  return Atomics.load(estado.gastado, 0);
}

module.exports = { crearEstado, reservar, liberar, ajustar, gastadoActual };
