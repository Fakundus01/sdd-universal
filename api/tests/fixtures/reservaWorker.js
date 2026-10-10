'use strict';
/* Hilo real de verdad (worker_threads, no una promesa en el mismo hilo):
 * reconstruye el estado compartido desde los SharedArrayBuffer que le pasa
 * el hilo principal y hace UNA reserva, con o sin lock según `modo`.
 *
 * Barrera real (review de IA-1, Cambio 8): este worker avisa "listo" ANTES
 * de `Atomics.wait`, para que el hilo principal espere a que los N workers
 * estén de verdad parados ahí antes de soltarlos a todos juntos. Antes, el
 * hilo principal soltaba el gate apenas terminaba de CREAR los workers, sin
 * esperar nada — la carrera se reproducía solo porque el `delayMs` alcanzaba
 * para tapar esa diferencia, no porque hubiera una barrera real. */
const { parentPort, workerData } = require('worker_threads');
const { reservarSinLock } = require('./reservaSinLock');
const { reservarConDelay } = require('./reservaConLockYDelay');

const estado = {
  lock: new Int32Array(workerData.lockBuffer),
  gastado: new BigInt64Array(workerData.gastadoBuffer),
};
const cota = BigInt(workerData.cota);
const tope = BigInt(workerData.tope);
const gate = new Int32Array(workerData.gateBuffer);

parentPort.postMessage({ tipo: 'listo' });
Atomics.wait(gate, 0, 0);

const resultado =
  workerData.modo === 'sinLock'
    ? reservarSinLock(estado, cota, tope, workerData.delayMs)
    : reservarConDelay(estado, cota, tope, workerData.delayMs);

parentPort.postMessage({ tipo: 'resultado', ...resultado });
