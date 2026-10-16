'use strict';
/* La reserva de gasto: playbooks/ia-en-el-producto.md §A paso 1.
 * "Nunca chequear y después llamar": bajo lock se anota `gastado + cota <=
 * tope` y RECIÉN AHÍ se llama.
 *
 * ADR-017 — ESTO ES UN FRENO POR INSTANCIA, NO UN TOPE GLOBAL. `gastado`
 * vive en memoria de ESTA instancia de la función. Vercel corre N
 * instancias en paralelo (procesos/microVMs distintos) y cada una arranca
 * en $0 en cada arranque en frío: el gasto real queda acotado por
 * `tope × instancias_concurrentes × reciclajes_del_día`, no por `tope`. No
 * hay forma de que `SharedArrayBuffer` sincronice eso — comparte memoria
 * dentro de un mismo proceso, nunca entre procesos. El techo real y duro,
 * compartido por todo el tráfico, es el límite de gasto de la consola de
 * Anthropic (ver `sdd/design.md` §10 y `sdd/decisions.md` ADR-017).
 *
 * Por qué sigue siendo un spinlock de Atomics y no una promesa encadenada:
 * dentro de ESTA instancia, muchos pedidos concurrentes comparten el mismo
 * hilo principal de Node (I/O asíncrona, no hilos reales) y ahí un mutex
 * async ya alcanzaría. Pero la tarjeta pide probar la primitiva con hilos
 * reales (worker_threads), no con async interleaving simulado en el mismo
 * hilo (ver api/tests/reserva.test.mjs): un "lock" que solo sirve entre
 * promesas del mismo hilo puede dar verde por suerte (JS corre lo
 * sincrónico de un tirón) sin probar nada de verdad bajo preemption real.
 * Atomics.compareExchange es la única primitiva que sigue siendo correcta
 * tanto dentro del hilo principal como entre hilos reales — y no cuesta
 * nada extra usarla también ahí, aunque el problema que de verdad importa
 * en producción (instancias distintas) quede fuera de su alcance.
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

/**
 * Bajo lock: si `gastado + cota <= tope`, anota la cota y devuelve {ok:true}.
 * Si no entra, no anota nada y devuelve {ok:false}. `cota` y `tope` son
 * BigInt en micro-dólares.
 */
function reservar(estado, cota, tope) {
  adquirirLock(estado.lock);
  try {
    const gastado = Atomics.load(estado.gastado, 0);
    if (gastado + cota > tope) return { ok: false, gastado };
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
