// Integración del handler completo, con el SDK real de Anthropic sobre un
// `fetch` falso (tecnologias.md, ficha "Anthropic API" — nunca un mock del
// cliente): node --test "api/tests/*.test.mjs"
import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';

import handlerMod from '../fusionar.js';
import anthropicClienteMod from '../_lib/anthropicCliente.js';
import catalogoMod from '../_lib/catalogo.js';
import rateLimitMod from '../_lib/rateLimit.js';

const handler = handlerMod.default || handlerMod;
const { _resetParaTests, _estadoParaTests, _topeMicrosParaTests } = handlerMod;
const { _establecerFetchParaTests } = anthropicClienteMod;
const { _resetParaTests: _resetRateLimit } = rateLimitMod;
const { gastadoActual } = await import('../_lib/reserva.js');

const PEDIDO_VALIDO = () => {
  const { TYPES, STACKS } = catalogoMod.datosDelCatalogo();
  return {
    tipo: Object.keys(TYPES)[0],
    stack: Object.keys(STACKS)[0],
    tecnologias: ['React'],
    playbooks: [],
    custom: 'PERFIL=ESTRICTO',
    descripcion: 'un combinador de recetas',
  };
};

function crearRes() {
  const res = {
    statusCode: 200,
    _headers: {},
    _body: '',
    setHeader(k, v) {
      this._headers[k] = v;
    },
    end(s) {
      this._body = s ?? '';
    },
  };
  return res;
}

function crearReq({ body, ip = '203.0.113.9', method = 'POST' }) {
  return { method, headers: { 'x-forwarded-for': ip }, body, socket: { remoteAddress: ip } };
}

function cuerpo(res) {
  return JSON.parse(res._body);
}

function fetchContando(fn) {
  let llamadas = 0;
  const f = async (...args) => {
    llamadas += 1;
    return fn(...args);
  };
  f.llamadas = () => llamadas;
  return f;
}

function fetchRespuestaMensaje({ archivos, usage }) {
  const texto = JSON.stringify({ archivos });
  const body = {
    id: 'msg_test',
    type: 'message',
    role: 'assistant',
    content: [{ type: 'text', text: texto }],
    model: 'claude-test',
    stop_reason: 'end_turn',
    usage: usage || { input_tokens: 100, output_tokens: 50, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 },
  };
  return fetchContando(async () => new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } }));
}

function fetchError(status, tipo = 'invalid_request_error', mensaje = 'bad request') {
  const body = { type: 'error', error: { type: tipo, message: mensaje } };
  return fetchContando(async () => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } }));
}

function fetchQueTira(error) {
  return fetchContando(async () => {
    throw error;
  });
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
  delete process.env.ANTHROPIC_API_KEY;
  delete process.env.ANTHROPIC_MODEL;
  process.env.FUSIONAR_TOPE_DIARIO_USD = '1'; // tope bajo, como pide la tarjeta
});

afterEach(() => {
  _establecerFetchParaTests(null);
  for (const k of ENV_KEYS) {
    if (envBackup[k] === undefined) delete process.env[k];
    else process.env[k] = envBackup[k];
  }
});

test('AC1: con ANTHROPIC_API_KEY y modelo, un pedido válido da 200 {archivos, fusion:"ia"}', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-clave';
  process.env.ANTHROPIC_MODEL = 'claude-test-model';
  const archivosEsperados = [{ nombre: 'sdd/SDD-MASTER.md', contenido: 'a medida' }];
  _establecerFetchParaTests(fetchRespuestaMensaje({ archivos: archivosEsperados }));

  const res = crearRes();
  await handler(crearReq({ body: PEDIDO_VALIDO() }), res);

  assert.equal(res.statusCode, 200);
  const b = cuerpo(res);
  assert.equal(b.fusion, 'ia');
  assert.deepEqual(b.archivos, archivosEsperados);
});

test('AC2: sin ANTHROPIC_API_KEY, 200 {fusion:"simulada"} con el mismo resultado que la concatenación v1', async () => {
  const fusionV1 = (await import('../_lib/fusionV1.js')).default;
  const pedido = PEDIDO_VALIDO();
  const res = crearRes();
  await handler(crearReq({ body: pedido }), res);

  assert.equal(res.statusCode, 200);
  const b = cuerpo(res);
  assert.equal(b.fusion, 'simulada');
  assert.deepEqual(b.archivos, fusionV1.armarConcatenacionV1(pedido));
});

test('AC2: nunca un error al usuario aunque falte solo el modelo (ANTHROPIC_MODEL)', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-clave';
  const res = crearRes();
  await handler(crearReq({ body: PEDIDO_VALIDO() }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(cuerpo(res).fusion, 'simulada');
});

test('AC7: tipo fuera del catálogo da 400', async () => {
  const res = crearRes();
  await handler(crearReq({ body: { ...PEDIDO_VALIDO(), tipo: 'no-existe' } }), res);
  assert.equal(res.statusCode, 400);
  assert.ok(cuerpo(res).error);
});

test('AC7: stack fuera del catálogo da 400', async () => {
  const res = crearRes();
  await handler(crearReq({ body: { ...PEDIDO_VALIDO(), stack: 'no-existe' } }), res);
  assert.equal(res.statusCode, 400);
});

test('AC7: descripcion por encima del máximo da 400 (no infla el costo del prompt gratis)', async () => {
  const { MAX_DESCRIPCION_CHARS } = (await import('../_lib/constantes.js')).default;
  const res = crearRes();
  await handler(crearReq({ body: { ...PEDIDO_VALIDO(), descripcion: 'x'.repeat(MAX_DESCRIPCION_CHARS + 1) } }), res);
  assert.equal(res.statusCode, 400);
});

test('AC4: rate limit por IP — una IP que pasa el límite recibe 429, otra IP no se ve afectada', async () => {
  const { limitePorMinuto } = rateLimitMod;
  const limite = limitePorMinuto();
  const pedido = PEDIDO_VALIDO();
  let ultimo;
  for (let i = 0; i < limite; i++) {
    const res = crearRes();
    await handler(crearReq({ body: pedido, ip: '198.51.100.1' }), res);
    ultimo = res;
  }
  assert.equal(ultimo.statusCode, 200, 'hasta el límite, el pedido se procesa normal');

  const bloqueado = crearRes();
  await handler(crearReq({ body: pedido, ip: '198.51.100.1' }), bloqueado);
  assert.equal(bloqueado.statusCode, 429);
  const b = cuerpo(bloqueado);
  assert.ok(b.error);
  assert.ok(Number.isInteger(b.reintentar_en) && b.reintentar_en > 0);

  const otraIp = crearRes();
  await handler(crearReq({ body: pedido, ip: '198.51.100.2' }), otraIp);
  assert.equal(otraIp.statusCode, 200, 'otra IP no se ve afectada por el límite de la primera');
});

test('AC3: la reserva bloquea con 429 cuando el tope de hoy no alcanza para esta llamada', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-clave';
  process.env.ANTHROPIC_MODEL = 'claude-test-model';
  process.env.FUSIONAR_TOPE_DIARIO_USD = '0.0000001'; // prácticamente $0: ninguna cota entra
  _establecerFetchParaTests(fetchRespuestaMensaje({ archivos: [{ nombre: 'x', contenido: 'y' }] }));

  const res = crearRes();
  await handler(crearReq({ body: PEDIDO_VALIDO() }), res);
  assert.equal(res.statusCode, 429);
  const b = cuerpo(res);
  assert.ok(b.error);
  assert.ok(Number.isInteger(b.reintentar_en) && b.reintentar_en > 0);
});

test('AC5: max_retries:0 — un rechazo del modelo cuenta una sola vez (el fetch falso se llama una sola vez)', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-clave';
  process.env.ANTHROPIC_MODEL = 'claude-test-model';
  const fetchFalso = fetchError(529, 'overloaded_error', 'overloaded'); // normalmente reintentable
  _establecerFetchParaTests(fetchFalso);

  const res = crearRes();
  await handler(crearReq({ body: PEDIDO_VALIDO() }), res);
  assert.equal(fetchFalso.llamadas(), 1, 'con maxRetries:0 no tiene que haber un segundo intento');
  assert.equal(res.statusCode, 200);
  assert.equal(cuerpo(res).fusion, 'simulada', 'un rechazo del modelo nunca es un error al usuario');
});

test('AC6: un APIStatusError (400) cuenta costo 0 y libera toda la reserva', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-clave';
  process.env.ANTHROPIC_MODEL = 'claude-test-model';
  _establecerFetchParaTests(fetchError(400, 'invalid_request_error', 'bad request'));

  const res = crearRes();
  await handler(crearReq({ body: PEDIDO_VALIDO() }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(cuerpo(res).fusion, 'simulada');
  assert.equal(gastadoActual(handlerMod._estadoParaTests()), 0n, 'un 4xx tiene que liberar toda la reserva (costo 0)');
});

test('AC6: un 529 (sobrecarga) también cuenta costo 0 y libera la reserva', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-clave';
  process.env.ANTHROPIC_MODEL = 'claude-test-model';
  _establecerFetchParaTests(fetchError(529, 'overloaded_error', 'overloaded'));

  const res = crearRes();
  await handler(crearReq({ body: PEDIDO_VALIDO() }), res);
  assert.equal(gastadoActual(handlerMod._estadoParaTests()), 0n);
});

test('AC6: un timeout/corte de red (sin status) conserva la reserva, no la libera', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-clave';
  process.env.ANTHROPIC_MODEL = 'claude-test-model';
  const errorDeRed = new Error('fetch failed: network error mid-stream');
  _establecerFetchParaTests(fetchQueTira(errorDeRed));

  const res = crearRes();
  await handler(crearReq({ body: PEDIDO_VALIDO() }), res);
  assert.equal(res.statusCode, 200);
  assert.equal(cuerpo(res).fusion, 'simulada', 'nunca un error al usuario, ni con un corte de red');
  const gastado = gastadoActual(handlerMod._estadoParaTests());
  assert.ok(gastado > 0n, 'un error ambiguo NO libera la reserva (S33)');
});

test('AC8: la clave nunca viaja en la respuesta, ni en el log, aunque el error de la API la repita', async () => {
  process.env.ANTHROPIC_API_KEY = 'sk-ant-test-CLAVE-SECRETA';
  process.env.ANTHROPIC_MODEL = 'claude-test-model';
  _establecerFetchParaTests(fetchError(401, 'authentication_error', `invalid x-api-key ${process.env.ANTHROPIC_API_KEY}`));

  const lineas = [];
  const originalError = console.error;
  console.error = (...args) => lineas.push(args.join(' '));
  const res = crearRes();
  try {
    await handler(crearReq({ body: PEDIDO_VALIDO() }), res);
  } finally {
    console.error = originalError;
  }

  assert.ok(!res._body.includes('sk-ant-test-CLAVE-SECRETA'), 'la clave no puede viajar en la respuesta');
  assert.ok(!lineas.join('\n').includes('sk-ant-test-CLAVE-SECRETA'), 'la clave no puede quedar en el log');
});

test('método distinto de POST da 405', async () => {
  const res = crearRes();
  await handler(crearReq({ body: PEDIDO_VALIDO(), method: 'GET' }), res);
  assert.equal(res.statusCode, 405);
});

test('pedido que no es JSON da 400, nunca 500', async () => {
  const res = crearRes();
  await handler(crearReq({ body: 'no-es-json-{' }), res);
  assert.equal(res.statusCode, 400);
});
