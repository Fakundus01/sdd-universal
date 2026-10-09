'use strict';
/* Hilo real de verdad (worker_threads, no una promesa en el mismo hilo):
 * reconstruye el estado compartido desde los SharedArrayBuffer que le pasa
 * el hilo principal y hace UNA reserva, con o sin lock según `modo`. */
const { parentPort, workerData } = require('worker_threads');
const { reservar } = require('../../_lib/reserva');
const { reservarSinLock } = require('./reservaSinLock');

const estado = {
  lock: new Int32Array(workerData.lockBuffer),
  gastado: new BigInt64Array(workerData.gastadoBuffer),
};
const cota = BigInt(workerData.cota);
const tope = BigInt(workerData.tope);

// Barrera real: todos los hilos arrancan la reserva juntos, no apenas cada
// uno termina de inicializarse (si no, "los hilos no arrancan juntos" es
// justo el motivo por el que un test de carrera nunca da rojo).
const gate = new Int32Array(workerData.gateBuffer);
Atomics.wait(gate, 0, 0);

const resultado =
  workerData.modo === 'sinLock'
    ? reservarSinLock(estado, cota, tope, workerData.delayMs)
    : reservar(estado, cota, tope, workerData.delayMs);

parentPort.postMessage(resultado);
