'use strict';
/* POST /api/fusionar — sdd/contracts.md §8, sdd/design.md §10 (ADR-016).
 * Función serverless de Vercel (zero-config): fusiona lo elegido en el
 * combinador con Claude, o cae a la concatenación v1 si no hay
 * ANTHROPIC_API_KEY o el modelo falla. Nunca un 500 al usuario.
 *
 * El tope de gasto es una RESERVA bajo lock (playbooks/ia-en-el-producto.md
 * §A), no un chequeo: ver api/_lib/reserva.js. */
const { tipoValido, stackValido } = require('./_lib/catalogo');
const { permitir } = require('./_lib/rateLimit');
const { crearEstado, reservar, liberar, ajustar } = require('./_lib/reserva');
const { estimarCotaUSD, costoRealUSD, usdAMicros, bytesUtf8 } = require('./_lib/costo');
const { armarConcatenacionV1 } = require('./_lib/fusionV1');
const { crearCliente } = require('./_lib/anthropicCliente');
const { logSeguro } = require('./_lib/secreto');
const { MAX_DESCRIPCION_CHARS, MAX_TOKENS_SALIDA, TOPE_DIARIO_USD_DEFAULT } = require('./_lib/constantes');

// Estado del día: vive en la función (design.md §10 — "nada de Postgres
// nuevo para esto"). Una instancia fría arranca en $0, que es el peor caso
// aceptado a propósito (preferible a confiar un lock de concurrencia a un
// proyecto de Supabase que ya se pausó una vez por free tier).
let _estado = null;
let _dia = null;

function diaUTC(ahora = new Date()) {
  return ahora.toISOString().slice(0, 10);
}

function estadoDelDia() {
  const hoy = diaUTC();
  if (_dia !== hoy || !_estado) {
    _estado = crearEstado();
    _dia = hoy;
  }
  return _estado;
}

function segundosHastaMedianocheUTC(ahora = new Date()) {
  const siguiente = new Date(Date.UTC(ahora.getUTCFullYear(), ahora.getUTCMonth(), ahora.getUTCDate() + 1, 0, 0, 0));
  return Math.max(1, Math.round((siguiente.getTime() - ahora.getTime()) / 1000));
}

function topeDiarioUSD() {
  const v = Number(process.env.FUSIONAR_TOPE_DIARIO_USD);
  return Number.isFinite(v) && v > 0 ? v : TOPE_DIARIO_USD_DEFAULT;
}

function ipDe(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) return xff.split(',')[0].trim();
  return (req.socket && req.socket.remoteAddress) || '0.0.0.0';
}

function textoPrompt({ tipo, stack, tecnologias, playbooks, custom, descripcion }) {
  return [
    'Fusioná los siguientes bloques elegidos por la persona en un sdd/ a medida.',
    `Tipo: ${tipo}`,
    `Stack: ${stack}`,
    Array.isArray(tecnologias) && tecnologias.length ? `Tecnologías: ${tecnologias.join(', ')}` : '',
    Array.isArray(playbooks) && playbooks.length ? `Playbooks: ${playbooks.join(', ')}` : '',
    custom ? `Reglas (custom.md):\n${custom}` : '',
    descripcion ? `Descripción libre de la persona:\n${descripcion}` : '',
    'Devolvé SOLO JSON válido, sin texto fuera del JSON, con esta forma exacta:',
    '{"archivos":[{"nombre":"sdd/....md","contenido":"..."}]}',
  ]
    .filter(Boolean)
    .join('\n\n');
}

function responder(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function leerPedido(req) {
  let pedido = req.body;
  if (typeof pedido === 'string') {
    try {
      pedido = JSON.parse(pedido);
    } catch {
      return null;
    }
  }
  return pedido && typeof pedido === 'object' && !Array.isArray(pedido) ? pedido : null;
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    return responder(res, 405, { error: 'método no permitido' });
  }

  const pedido = leerPedido(req);
  if (!pedido) return responder(res, 400, { error: 'pedido inválido: se esperaba JSON' });

  const { tipo, stack, tecnologias = [], playbooks = [], custom = '', descripcion = '' } = pedido;

  // AC7: tipo/stack fuera del catálogo, o descripción que infla el prompt a propósito.
  if (!tipoValido(tipo)) return responder(res, 400, { error: 'tipo no está en el catálogo' });
  if (!stackValido(stack)) return responder(res, 400, { error: 'stack no está en el catálogo' });
  if (typeof descripcion !== 'string' || descripcion.length > MAX_DESCRIPCION_CHARS) {
    return responder(res, 400, { error: `descripcion supera el máximo de ${MAX_DESCRIPCION_CHARS} caracteres` });
  }

  // AC4: rate limit por IP.
  const ip = ipDe(req);
  const rl = permitir(ip);
  if (!rl.ok) {
    return responder(res, 429, { error: 'demasiados pedidos desde esta IP, esperá un momento', reintentar_en: rl.reintentar_en });
  }

  const clave = process.env.ANTHROPIC_API_KEY || '';
  const modelo = process.env.ANTHROPIC_MODEL || '';

  // AC2: sin clave (o sin modelo configurado) → simulada, nunca un error.
  if (!clave || !modelo) {
    return responder(res, 200, { archivos: armarConcatenacionV1(pedido), fusion: 'simulada' });
  }

  const prompt = textoPrompt(pedido);
  const cotaUSD = estimarCotaUSD({ promptBytes: bytesUtf8(prompt), maxTokensSalida: MAX_TOKENS_SALIDA });
  const cotaMicros = usdAMicros(cotaUSD);
  const topeMicros = usdAMicros(topeDiarioUSD());

  // AC3: reserva bajo lock, antes de llamar.
  const estado = estadoDelDia();
  const reserva = reservar(estado, cotaMicros, topeMicros);
  if (!reserva.ok) {
    return responder(res, 429, {
      error: 'se alcanzó el tope de gasto de hoy para la fusión con IA',
      reintentar_en: segundosHastaMedianocheUTC(),
    });
  }

  try {
    // AC5: maxRetries:0, un solo intento.
    const cliente = crearCliente(clave);
    const respuesta = await cliente.messages.create({
      model: modelo,
      max_tokens: MAX_TOKENS_SALIDA,
      messages: [{ role: 'user', content: prompt }],
    });

    // Costo real conocido: se ajusta la reserva (paso 6-8 del playbook).
    const costoReal = costoRealUSD(respuesta.usage);
    ajustar(estado, usdAMicros(costoReal) - cotaMicros);

    const archivos = archivosDesdeRespuesta(respuesta);
    if (!archivos) {
      // El modelo no devolvió JSON válido: cae a la fusión v1, nunca un error.
      return responder(res, 200, { archivos: armarConcatenacionV1(pedido), fusion: 'simulada' });
    }
    return responder(res, 200, { archivos, fusion: 'ia' });
  } catch (error) {
    // AC6: la API rechazó el pedido antes de generar (status HTTP presente,
    // 4xx/529) → costo 0, se libera toda la reserva. Ambiguo (timeout, corte
    // de red: sin `status`) → se conserva la reserva, no se libera (S33).
    const rechazoDeLaAPI = error && typeof error.status === 'number';
    if (rechazoDeLaAPI) liberar(estado, cotaMicros);
    logSeguro('fusionar: fallo al llamar al modelo', error, clave);
    return responder(res, 200, { archivos: armarConcatenacionV1(pedido), fusion: 'simulada' });
  }
}

/** Valida a mano DESPUÉS de recibir la respuesta (playbook §D paso 15: ojo
 * con los helpers que validan adentro de la llamada, ahí el gasto se pierde
 * sin registrar si la salida no cierra). */
function archivosDesdeRespuesta(respuesta) {
  const texto = Array.isArray(respuesta.content)
    ? respuesta.content
        .map((b) => (b && b.type === 'text' && typeof b.text === 'string' ? b.text : ''))
        .join('')
    : '';
  let parsed;
  try {
    parsed = JSON.parse(texto);
  } catch {
    return null;
  }
  if (
    !parsed ||
    !Array.isArray(parsed.archivos) ||
    parsed.archivos.length === 0 ||
    !parsed.archivos.every((a) => a && typeof a.nombre === 'string' && typeof a.contenido === 'string')
  ) {
    return null;
  }
  return parsed.archivos;
}

function _resetParaTests() {
  _estado = null;
  _dia = null;
}

/** SOLO para tests: el estado de reserva del día, para inspeccionar `gastado`. */
function _estadoParaTests() {
  return estadoDelDia();
}

module.exports = handler;
module.exports.default = handler;
module.exports._resetParaTests = _resetParaTests;
module.exports._estadoParaTests = _estadoParaTests;
module.exports._topeMicrosParaTests = () => usdAMicros(topeDiarioUSD());
