'use strict';
/* Hilo real de verdad (worker_threads, no una promesa en el mismo hilo):
 * reconstruye el estado compartido desde los SharedArrayBuffer que le pasa
 * el hilo principal y hace UNA reserva, con o sin lock según `modo`.
 *
 * V2-1 (review de IA-1, vuelta 2): en "conLock" se llama a `reservar()` de
 * api/_lib/reserva.js TAL CUAL se exporta — nunca una copia reimplementada
 * en el fixture. Eso fue justo el bug de la vuelta anterior: al sacar el
 * hook `debugDelayMs` de `reserva.js` (bien, era un hook de test en
 * producción), el worker pasó a llamar a una función aparte armada acá
 * (`reservarConDelay`) que reimplementaba la sección crítica — y el
 * reviewer probó con un mutante que, sacándole el lock a `reservar()` de
 * producción, los 50 tests seguían en verde: la evidencia de AC3/R29 ya no
 * decía nada sobre el código que se entrega.
 *
 * La demora para ensanchar la ventana de la carrera se inyecta SIN tocar
 * `reserva.js`: cada `worker_thread` tiene su PROPIO `globalThis` — no
 * comparte el de otros workers ni el del hilo principal — así que pisar
 * `Atomics.load` acá adentro es una instrumentación 100% local a este
 * worker, invisible para cualquier otro código. Solo se demora la lectura
 * de `estado.gastado` (la que hace `reservar()` para decidir si entra);
 * el lock en sí (`Atomics.compareExchange`/`Atomics.store`, en
 * `adquirirLock`/`liberarLock`) usa otros métodos de `Atomics` y no se
 * toca, así que la demora queda DENTRO de la sección crítica real,
 * mientras el lock de producción sigue tomado. */
const { parentPort, workerData } = require('worker_threads');
const { reservarSinLock } = require('./reservaSinLock');

function busyWaitMs(ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    /* spin a propósito: ensancha la ventana entre leer y anotar */
  }
}

const estado = {
  lock: new Int32Array(workerData.lockBuffer),
  gastado: new BigInt64Array(workerData.gastadoBuffer),
};

if (workerData.modo !== 'sinLock' && workerData.delayMs) {
  const loadOriginal = Atomics.load;
  Atomics.load = function loadInstrumentado(typedArray, index) {
    const valor = loadOriginal(typedArray, index);
    if (typedArray === estado.gastado) busyWaitMs(workerData.delayMs);
    return valor;
  };
}

// Se importa DESPUÉS de instrumentar Atomics.load (aunque no cambiaría el
// resultado importarlo antes: reservar() busca `Atomics.load` en cada
// llamada, no al cargar el módulo) — la función que corre es la real de
// producción, exportada tal cual por api/_lib/reserva.js.
const { reservar } = require('../../_lib/reserva');

const cota = BigInt(workerData.cota);
const tope = BigInt(workerData.tope);
const gate = new Int32Array(workerData.gateBuffer);

parentPort.postMessage({ tipo: 'listo' });
Atomics.wait(gate, 0, 0);

const resultado =
  workerData.modo === 'sinLock' ? reservarSinLock(estado, cota, tope, workerData.delayMs) : reservar(estado, cota, tope);

parentPort.postMessage({ tipo: 'resultado', ...resultado });
