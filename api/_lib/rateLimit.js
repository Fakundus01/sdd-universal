'use strict';
/* AC4: una IP que pasa el límite por minuto recibe 429, el resto no se ve
 * afectado. Ventana fija de 60s por IP, en memoria (vive y muere con la
 * instancia de la función — mismo criterio que design.md §10 para la
 * reserva: "nada de Postgres nuevo para esto"). */
const VENTANA_MS = 60_000;

function limitePorMinuto() {
  const v = Number(process.env.FUSIONAR_RATE_LIMIT_POR_MINUTO);
  return Number.isInteger(v) && v > 0 ? v : 20;
}

const contadores = new Map(); // ip -> {cuenta, iniciaEn}

/** `ahora` es inyectable para tests deterministas. */
function permitir(ip, ahora = Date.now()) {
  let e = contadores.get(ip);
  if (!e || ahora - e.iniciaEn >= VENTANA_MS) {
    e = { cuenta: 0, iniciaEn: ahora };
    contadores.set(ip, e);
  }
  e.cuenta += 1;
  if (e.cuenta > limitePorMinuto()) {
    const reintentar_en = Math.max(1, Math.ceil((e.iniciaEn + VENTANA_MS - ahora) / 1000));
    return { ok: false, reintentar_en };
  }
  return { ok: true };
}

function _resetParaTests() {
  contadores.clear();
}

module.exports = { permitir, limitePorMinuto, _resetParaTests };
