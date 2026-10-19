// G1–G4 de la review de la tarjeta IA-3: el tope de gasto probado **en el endpoint**, no en la
// primitiva (scenarios.md S46).
//
// Por qué existe este archivo. `reserva.test.mjs` prueba `reservar()` con hilos reales y barrera, y
// el mutante «sin lock» muere 3 de 3: la primitiva está probada. Pero ningún test mandaba pedidos
// concurrentes al handler, así que el mutante clásico de S33 —chequear el tope, llamar al modelo, y
// recién después anotar el gasto— pasaba las 56 pruebas en verde y gastaba USD 5,00 contra un tope
// de USD 1 con 8 pedidos en paralelo. Un criterio que dice «el endpoint» y una evidencia que prueba
// una función interna coinciden en el nombre, no en el alcance.
//
// Qué reimplementa este archivo y qué no. `cotaUSDDe()` llama a `estimarCotaUSD` de producción, y G3
// compara contra `costoRealUSD`, también de producción: la fórmula y los precios NO se repiten acá.
// Lo que el test reimplementa a propósito es *qué bytes entran* en la cota (instrucción + mensaje
// de usuario), que es lo que mata a los mutantes que subestiman el prompt. Limitación que queda: la
// tabla de precios de `api/_lib/costo.js` no la fija ningún test de este archivo (dividir el precio
// de salida por 10 sigue pasando en verde); eso se cierra con un valor literal en `costo.test.mjs`.
//   node --test "api/tests/*.test.mjs"
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import handlerMod from '../fusionar.js';
import anthropicClienteMod from '../_lib/anthropicCliente.js';
import catalogoMod from '../_lib/catalogo.js';
import rateLimitMod from '../_lib/rateLimit.js';
import constantesMod from '../_lib/constantes.js';
import costoMod from '../_lib/costo.js';
import promptSeguroMod from '../_lib/promptSeguro.js';

const handler = handlerMod.default || handlerMod;
const { _resetParaTests, _estadoParaTests } = handlerMod;
const { _establecerFetchParaTests } = anthropicClienteMod;
const { _resetParaTests: _resetRateLimit } = rateLimitMod;
const { gastadoActual } = await import('../_lib/reserva.js');
const { MAX_TOKENS_SALIDA } = constantesMod;
const { estimarCotaUSD, costoRealUSD, usdAMicros, bytesUtf8 } = costoMod;
const { INSTRUCCION_SISTEMA, mensajeUsuario } = promptSeguroMod;

const MICROS = 1_000_000;

/** La cota que el handler va a reservar para este pedido, calculada acá. */
function cotaUSDDe(pedido) {
  return estimarCotaUSD({
    promptBytes: bytesUtf8(INSTRUCCION_SISTEMA + '\n\n' + mensajeUsuario(pedido)),
    maxTokensSalida: MAX_TOKENS_SALIDA,
  });
}

function pedido({ custom = 'PERFIL=ESTRICTO', descripcion = 'un combinador de recetas' } = {}) {
  const { TYPES, STACKS } = catalogoMod.datosDelCatalogo();
  return {
    tipo: Object.keys(TYPES)[0],
    stack: Object.keys(STACKS)[0],
    tecnologias: ['React'],
    playbooks: [],
    custom,
    descripcion,
  };
}

function crearRes() {
  return {
    statusCode: 200,
    _headers: {},
    _body: '',
    setHeader(k, v) { this._headers[k] = v; },
    end(s) { this._body = s ?? ''; },
  };
}

function crearReq(body, ip = '203.0.113.9') {
  return { method: 'POST', headers: { 'x-forwarded-for': ip }, body, socket: { remoteAddress: ip } };
}

const cuerpo = (res) => JSON.parse(res._body);
const gastadoUSD = () => Number(gastadoActual(_estadoParaTests())) / MICROS;

/** Una respuesta válida del modelo y una demora opcional: la demora es lo que deja a los N pedidos
 * pisándose de verdad en el mismo tick. Sin `usage` explícito, el peor caso sale del PEDIDO REAL que
 * mandó el handler (`max_tokens` y bytes del cuerpo), no de las constantes de la cota: así un handler
 * que autoriza más salida de la que reservó gasta de verdad más que el tope. */
function fetchLento({ usage, demoraMs = 30 }) {
  let llamadas = 0;
  const f = async (url, init) => {
    llamadas += 1;
    const u = usage ?? {
      input_tokens: 0,
      cache_creation_input_tokens: bytesUtf8(init.body),
      cache_read_input_tokens: 0,
      output_tokens: JSON.parse(init.body).max_tokens,
    };
    if (demoraMs) await new Promise((r) => setTimeout(r, demoraMs));
    const body = {
      id: 'msg_test', type: 'message', role: 'assistant',
      content: [{ type: 'text', text: JSON.stringify({ archivos: [{ nombre: 'x', contenido: 'y' }] }) }],
      model: 'claude-test', stop_reason: 'end_turn', usage: u,
    };
    return new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  f.llamadas = () => llamadas;
  return f;
}

const ENV_KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_MODEL', 'FUSIONAR_TOPE_DIARIO_USD', 'FUSIONAR_RATE_LIMIT_POR_MINUTO'];
let envBackup = {};

beforeEach(() => {
  envBackup = {};
  for (const k of ENV_KEYS) envBackup[k] = process.env[k];
  _resetParaTests();
  _resetRateLimit();
  catalogoMod._resetCacheParaTests();
  _establecerFetchParaTests(null);
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-clave';
  process.env.ANTHROPIC_MODEL = 'claude-test-model';
});

afterEach(() => {
  _establecerFetchParaTests(null);
  for (const k of ENV_KEYS) {
    if (envBackup[k] === undefined) delete process.env[k];
    else process.env[k] = envBackup[k];
  }
});

test('G1: 8 pedidos en paralelo al endpoint nunca gastan más que el tope (S33, mata M1b)', async () => {
  process.env.FUSIONAR_TOPE_DIARIO_USD = '1';
  const p = pedido();
  const cota = cotaUSDDe(p);
  assert.ok(cota < 1, `la cota (${cota}) tiene que entrar en el tope de 1 para que el test tenga sentido`);

  // Sin `usage` explícito: el transporte simulado cobra el peor caso del pedido que de verdad llegó
  // (su `max_tokens` y los bytes de su cuerpo), así el gasto final lo decide el handler, no el test.
  const f = fetchLento({});
  _establecerFetchParaTests(f);

  // IPs distintas: el rate limit por IP no tiene que ser lo que salve al tope. Si el único freno
  // fuera el rate limit, un atacante distribuido pasaría igual.
  const reqs = Array.from({ length: 8 }, (_, i) => {
    const res = crearRes();
    return { res, promesa: handler(crearReq(p, `198.51.100.${i + 1}`), res) };
  });
  await Promise.all(reqs.map((r) => r.promesa));

  const codigos = reqs.map((r) => r.res.statusCode);
  const oks = codigos.filter((c) => c === 200).length;
  const llamadas = f.llamadas();

  // El invariante, tal como lo escribió la review: lo que se llamó, al peor precio, entra en el tope.
  assert.ok(llamadas * cota <= 1 + 1e-9,
    `${llamadas} llamada(s) al modelo × USD ${cota.toFixed(5)} = USD ${(llamadas * cota).toFixed(4)} ` +
    `contra un tope de USD 1 (codigos: ${codigos.join(',')})`);
  assert.ok(gastadoUSD() <= 1 + 1e-9, `gastado final USD ${gastadoUSD()} > tope 1`);
  assert.ok(oks >= 1, 'con el tope en 1 y una cota menor, al menos un pedido tiene que entrar');
  assert.equal(llamadas, oks, 'hubo llamadas al modelo que nadie reservó');
});

test('G2: la cota sale del prompt real, no de un número fijo (mata M2)', async () => {
  const corto = pedido({ custom: '', descripcion: '' });
  const largo = pedido({ custom: 'x'.repeat(8000), descripcion: 'y'.repeat(4000) });
  const cotaCorta = cotaUSDDe(corto);
  const cotaLarga = cotaUSDDe(largo);
  assert.ok(cotaLarga > cotaCorta, 'la cota tiene que crecer con el prompt');

  // Un tope entre las dos: el pedido corto entra y el largo no. Con una cota fija, los dos entran.
  const tope = (cotaCorta + cotaLarga) / 2;
  process.env.FUSIONAR_TOPE_DIARIO_USD = String(tope);
  _establecerFetchParaTests(fetchLento({ usage: { input_tokens: 10, output_tokens: 5 }, demoraMs: 0 }));

  const resLargo = crearRes();
  await handler(crearReq(largo), resLargo);
  assert.equal(resLargo.statusCode, 429,
    `el pedido largo (cota USD ${cotaLarga.toFixed(4)}) tiene que no entrar en un tope de USD ${tope.toFixed(4)}`);

  _resetParaTests();
  _resetRateLimit();
  const resCorto = crearRes();
  await handler(crearReq(corto), resCorto);
  assert.equal(resCorto.statusCode, 200,
    `el pedido corto (cota USD ${cotaCorta.toFixed(4)}) tiene que entrar en el mismo tope`);
  assert.equal(cuerpo(resCorto).fusion, 'ia');
});

test('G3: un éxito deja anotado el costo real, no la cota entera (mata M3)', async () => {
  process.env.FUSIONAR_TOPE_DIARIO_USD = '1';
  const p = pedido();
  const usage = { input_tokens: 10, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, output_tokens: 5 };
  _establecerFetchParaTests(fetchLento({ usage, demoraMs: 0 }));

  const res = crearRes();
  await handler(crearReq(p), res);
  assert.equal(res.statusCode, 200);

  const esperado = usdAMicros(costoRealUSD(usage));
  assert.equal(gastadoActual(_estadoParaTests()), esperado,
    `quedó anotada la cota en vez del costo real (esperado ${esperado} micro-USD)`);
});

test('G3b: con tope para dos cotas, tres éxitos chicos seguidos entran los tres (mata M3)', async () => {
  const p = pedido();
  process.env.FUSIONAR_TOPE_DIARIO_USD = String(cotaUSDDe(p) * 2);
  _establecerFetchParaTests(fetchLento({ usage: { input_tokens: 10, output_tokens: 5 }, demoraMs: 0 }));

  for (let i = 1; i <= 3; i += 1) {
    _resetRateLimit();
    const res = crearRes();
    await handler(crearReq(p), res);
    assert.equal(res.statusCode, 200,
      `el pedido ${i} no entró: cada éxito chico está dejando la cota entera reservada`);
  }
});

test('G4: un corte a mitad de la respuesta conserva la reserva (ambiguo, mata M4)', async () => {
  process.env.FUSIONAR_TOPE_DIARIO_USD = '1';
  // 200 con el cuerpo cortado a mitad: el modelo pudo haber generado (y cobrado) todo. Es ambiguo,
  // así que la reserva NO se libera (S33). Distinto de un error de conexión antes de responder.
  _establecerFetchParaTests(async () => {
    const cuerpoRoto = new ReadableStream({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('{"id":"msg_test","type":"message","content":[{"type":"te'));
        controller.error(new Error('conexión cortada a mitad del cuerpo'));
      },
    });
    return new Response(cuerpoRoto, { status: 200, headers: { 'content-type': 'application/json' } });
  });

  const res = crearRes();
  await handler(crearReq(pedido()), res);

  assert.equal(res.statusCode, 200, 'el contrato §8 no admite un 500 al usuario');
  assert.equal(cuerpo(res).fusion, 'simulada');
  assert.ok(gastadoUSD() > 0,
    'se liberó la reserva de un fallo ambiguo: el modelo pudo haber cobrado y nadie lo anotó');
});
