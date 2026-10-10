// La reserva de gasto bajo concurrencia REAL (worker_threads), no promesas
// interleaved en el mismo hilo: playbooks/ia-en-el-producto.md §A paso 1 y
// "Errores comunes" ("los hilos no arrancan juntos" → usar una barrera).
//
// node --test "api/tests/*.test.mjs"
import { test } from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Worker } from 'node:worker_threads';

const AQUI = path.dirname(fileURLToPath(import.meta.url));
const WORKER = path.join(AQUI, 'fixtures', 'reservaWorker.js');

/** Lanza `n` hilos reales que intentan reservar `cota` contra el mismo
 * estado compartido, todos a la vez (barrera REAL, no apenas creados: ver
 * Cambio 8 de la review de IA-1), con una demora a propósito entre leer y
 * anotar para ensanchar la ventana de la carrera. */
function correrEnHilosReales({ modo, n, cota, tope, delayMs }) {
  return new Promise((resolve, reject) => {
    const lockBuffer = new SharedArrayBuffer(4);
    const gastadoBuffer = new SharedArrayBuffer(8);
    const gateBuffer = new SharedArrayBuffer(4);
    const gate = new Int32Array(gateBuffer);
    const gastadoView = new BigInt64Array(gastadoBuffer);

    let listos = 0;
    let pendientes = n;
    let oks = 0;
    const workers = [];
    for (let i = 0; i < n; i++) {
      const w = new Worker(WORKER, { workerData: { lockBuffer, gastadoBuffer, gateBuffer, cota, tope, delayMs, modo } });
      w.on('message', (msg) => {
        if (msg.tipo === 'listo') {
          listos += 1;
          // Barrera real: recién cuando los N workers avisaron que están
          // parados en Atomics.wait, se los suelta a todos juntos.
          if (listos === n) {
            Atomics.store(gate, 0, 1);
            Atomics.notify(gate, 0, Infinity);
          }
          return;
        }
        if (msg.ok) oks += 1;
        pendientes -= 1;
        if (pendientes === 0) {
          Promise.all(workers.map((x) => x.terminate())).then(() =>
            resolve({ oks, gastadoFinal: gastadoView[0] })
          );
        }
      });
      w.on('error', reject);
      workers.push(w);
    }
  });
}

const TOPE = 1_000_000n; // USD 1, en micro-dólares (ej. de la tarjeta)
const COTA = 300_000n; // USD 0.30: con 8 pedidos en paralelo, como mucho 3 entran
const N = 8;
const DELAY_MS = 30;

test('IA-1 R29 (rojo medido): sin lock, 8 hilos reales rompen el tope', async () => {
  const { oks } = await correrEnHilosReales({ modo: 'sinLock', n: N, cota: COTA, tope: TOPE, delayMs: DELAY_MS });
  // Evidencia roja de la tarjeta: con 8 pedidos en paralelo y la reserva SIN
  // lock, entran más de los 3 que el tope permite (cada "ok" es un pedido
  // que en producción dispararía una llamada real al modelo). El dato que
  // importa es `oks` — no el valor final de `gastado`, que con hilos reales
  // puede quedar con lecturas perdidas (varios hilos pisan el mismo
  // contador) y por eso NO es una señal confiable del daño: el daño real es
  // "se aprobaron más llamadas de las que el tope permite", que es justo lo
  // que mide `oks`. Si este assert alguna vez falla, el mutante dejó de
  // reproducir la carrera (ver playbooks/ia-en-el-producto.md "Errores
  // comunes": revisar el delay o la barrera de arranque).
  assert.ok(oks > 3, `esperaba que entraran más de 3 pedidos sin lock (entraron ${oks}): el mutante no reprodujo la carrera`);
  assert.ok(BigInt(oks) * COTA > TOPE, `si se cobraran los ${oks} pedidos aprobados, el gasto real superaría el tope`);
});

test('IA-1 AC3: bajo lock, 8 hilos reales en paralelo nunca gastan más del tope', async () => {
  const { oks, gastadoFinal } = await correrEnHilosReales({ modo: 'conLock', n: N, cota: COTA, tope: TOPE, delayMs: DELAY_MS });
  assert.ok(gastadoFinal <= TOPE, `gastado (${gastadoFinal}) superó el tope (${TOPE})`);
  assert.equal(gastadoFinal, BigInt(oks) * COTA, 'lo anotado tiene que ser exactamente cota × reservas aceptadas');
  assert.equal(oks, 3, 'con cota=0.30 y tope=1.00 tienen que entrar exactamente 3');
});

test('reservar()/liberar()/ajustar() fuera de la concurrencia: libera y ajusta bien', async () => {
  const { crearEstado, reservar, liberar, ajustar, gastadoActual } = await import('../_lib/reserva.js');
  const estado = crearEstado();
  const r1 = reservar(estado, 500_000n, TOPE);
  assert.equal(r1.ok, true);
  assert.equal(gastadoActual(estado), 500_000n);

  const r2 = reservar(estado, 600_000n, TOPE); // no entra: 500k+600k > 1_000_000
  assert.equal(r2.ok, false);
  assert.equal(gastadoActual(estado), 500_000n, 'un rechazo no tiene que anotar nada');

  liberar(estado, 500_000n); // AC6: costo 0 → se libera toda la reserva
  assert.equal(gastadoActual(estado), 0n);

  reservar(estado, 400_000n, TOPE);
  ajustar(estado, 50_000n - 400_000n); // costo real 50k (mucho menor a la cota reservada)
  assert.equal(gastadoActual(estado), 50_000n);

  ajustar(estado, -1_000_000n); // nunca queda negativo
  assert.equal(gastadoActual(estado), 0n);
});
