'use strict';
/* POST /api/fusionar — sdd/contracts.md §8, sdd/design.md §10 (ADR-016,
 * ajustado por ADR-017). Función serverless de Vercel (zero-config):
 * fusiona lo elegido en el combinador con Claude, o cae a la concatenación
 * v1 si no hay ANTHROPIC_API_KEY/ANTHROPIC_MODEL o el modelo falla. Nunca
 * un 500 al usuario.
 *
 * El tope de gasto es una RESERVA bajo lock (playbooks/ia-en-el-producto.md
 * §A), no un chequeo — pero es un freno POR INSTANCIA, no un tope global
 * (ADR-017): ver el comentario largo en api/_lib/reserva.js. */
const { permitir } = require('./_lib/rateLimit');
const { crearEstado, reservar, liberar, ajustar } = require('./_lib/reserva');
const { estimarCotaUSD, costoRealUSD, usdAMicros, bytesUtf8 } = require('./_lib/costo');
const { armarConcatenacionV1 } = require('./_lib/fusionV1');
const { crearCliente } = require('./_lib/anthropicCliente');
const { logSeguro } = require('./_lib/secreto');
const { validarPedido } = require('./_lib/validacion');
const { INSTRUCCION_SISTEMA, mensajeUsuario } = require('./_lib/promptSeguro');
const { MAX_TOKENS_SALIDA, TOPE_DIARIO_USD_DEFAULT } = require('./_lib/constantes');

// Estado del día: vive en ESTA instancia de la función (ADR-017 — freno por
// instancia, no tope global; el techo real y duro es el límite de gasto de
// la consola de Anthropic). "Nada de Postgres nuevo para esto" (design.md
// §10) sigue siendo la decisión del owner, con esa limitación aceptada.
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

/** `x-forwarded-for` puede traer varias IPs separadas por coma: la que
 * agrega el proxy de confianza (Vercel) es la que importa, no la primera
 * de la lista — la primera la puede escribir quien hace el pedido (review
 * de IA-1: rotando esa cabecera se esquivaba el límite). Se toma la ÚLTIMA,
 * que es la convención de un proxy que AGREGA al final de lo que ya traía
 * el pedido, en vez de reemplazarlo. Esto depende de que Vercel realmente
 * agregue (y no solo reenvíe) esa cabecera — pendiente de confirmar contra
 * la doc vigente (R19): no hay forma de probarlo sin un deploy real. */
function ipDe(req) {
  const xff = req.headers && req.headers['x-forwarded-for'];
  if (typeof xff === 'string' && xff.trim()) {
    const partes = xff.split(',').map((x) => x.trim()).filter(Boolean);
    if (partes.length) return partes[partes.length - 1];
  }
  return (req.socket && req.socket.remoteAddress) || '0.0.0.0';
}

function responder(res, status, body) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json');
  res.end(JSON.stringify(body));
}

function leerPedidoCrudo(req) {
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

function textoCompletoDelPrompt(pedido) {
  return INSTRUCCION_SISTEMA + '\n\n' + mensajeUsuario(pedido);
}

/** Costo 0 (AC6): solo un rechazo de la API ANTES de generar — 4xx o 529
 * (playbook §B paso 9, tarjeta IA-1). Un 500/502/503/504 (que no sea 529)
 * es AMBIGUO igual que un timeout: pudo haberse cobrado, se conserva. */
function esRechazoDeLaAPI(error) {
  const status = error && typeof error.status === 'number' ? error.status : null;
  if (status === null) return false;
  return status === 529 || (status >= 400 && status < 500);
}

async function manejar(req, res) {
  if (req.method !== 'POST') {
    return responder(res, 405, { error: 'método no permitido' });
  }

  const pedidoCrudo = leerPedidoCrudo(req);
  if (!pedidoCrudo) return responder(res, 400, { error: 'pedido inválido: se esperaba JSON' });

  // AC7 completo: tipo/stack del catálogo, y TODO lo que entra al prompt
  // (custom/tecnologias/playbooks/descripcion) con tipo y tamaño acotados —
  // nunca un 500 por un campo mal tipado (review de IA-1, Cambios 2 y 3).
  const validado = validarPedido(pedidoCrudo);
  if (!validado.ok) return responder(res, 400, { error: validado.error });
  const pedido = validado.pedido;

  // AC4: rate limit por IP.
  const ip = ipDe(req);
  const rl = permitir(ip);
  if (!rl.ok) {
    return responder(res, 429, { error: 'demasiados pedidos desde esta IP, esperá un momento', reintentar_en: rl.reintentar_en });
  }

  const clave = process.env.ANTHROPIC_API_KEY || '';
  const modelo = process.env.ANTHROPIC_MODEL || '';

  // AC2: sin clave → simulada, nunca un error (es el caso esperado, sin key
  // configurada a propósito, así que no hace falta avisar).
  if (!clave) {
    return responder(res, 200, { archivos: armarConcatenacionV1(pedido), fusion: 'simulada' });
  }
  // Con clave pero sin modelo: es una configuración a medio hacer, no el
  // caso esperado — avisar en los logs (sin la clave) para que no quede
  // "la IA está apagada" sin que nadie se entere (review de IA-1, Cambio 7).
  if (!modelo) {
    console.warn('fusionar: ANTHROPIC_API_KEY está configurada pero falta ANTHROPIC_MODEL — cae a modo simulado');
    return responder(res, 200, { archivos: armarConcatenacionV1(pedido), fusion: 'simulada' });
  }

  const promptCompleto = textoCompletoDelPrompt(pedido);
  const cotaUSD = estimarCotaUSD({ promptBytes: bytesUtf8(promptCompleto), maxTokensSalida: MAX_TOKENS_SALIDA });
  const cotaMicros = usdAMicros(cotaUSD);
  const topeMicros = usdAMicros(topeDiarioUSD());

  // AC3: reserva bajo lock, antes de llamar (freno por instancia, ADR-017).
  const estado = estadoDelDia();
  const reserva = reservar(estado, cotaMicros, topeMicros);
  if (!reserva.ok) {
    return responder(res, 429, {
      error: 'se alcanzó el tope de gasto de hoy para la fusión con IA',
      reintentar_en: segundosHastaMedianocheUTC(),
    });
  }

  try {
    // AC5: maxRetries:0, un solo intento. LLM01: la instrucción fija va en
    // `system`, separada del texto de la persona (escapado en `mensajeUsuario`).
    const cliente = crearCliente(clave);
    const respuesta = await cliente.messages.create({
      model: modelo,
      max_tokens: MAX_TOKENS_SALIDA,
      system: INSTRUCCION_SISTEMA,
      messages: [{ role: 'user', content: mensajeUsuario(pedido) }],
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
    // AC6: 4xx/529 → costo 0, se libera toda la reserva. Ambiguo (timeout,
    // corte de red, o un 500/502/503/504 que no sea 529) → se conserva la
    // reserva, no se libera (S33).
    if (esRechazoDeLaAPI(error)) liberar(estado, cotaMicros);
    logSeguro('fusionar: fallo al llamar al modelo', error);
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

/** Red de seguridad de último recurso (review de IA-1, Cambio 3): nada de lo
 * de arriba puede dejar escapar una excepción sin capturar — ni un campo
 * mal tipado que algún día se cuele, ni que falte `web/catalogo.js` en el
 * bundle de Vercel (`catalogo.js` lo lee con `fs` en runtime y no se pudo
 * verificar en un preview deploy real desde este entorno). El contrato §8
 * no admite un 500 genérico, así que cualquier excepción no prevista cae a
 * un 400 parejo en vez de reventar. */
async function handler(req, res) {
  try {
    return await manejar(req, res);
  } catch (error) {
    logSeguro('fusionar: excepción no capturada', error);
    return responder(res, 400, { error: 'no se pudo procesar el pedido' });
  }
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
