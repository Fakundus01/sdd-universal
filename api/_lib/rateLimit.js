'use strict';
/* AC4: una IP que pasa el límite por minuto recibe 429, el resto no se ve
 * afectado. Ventana fija de 60s por IP, en memoria.
 *
 * ADR-017: el mismo límite por instancia que la reserva de gasto de
 * reserva.js — este `Map` vive y muere con ESTA instancia de Vercel, así
 * que una IP que reparte su tráfico entre varias instancias no ve un único
 * contador compartido. No es "nada de Postgres nuevo para esto" por
 * economía; es la misma limitación de fondo que ADR-017 documenta para el
 * tope de gasto, aplicada acá también. */
const VENTANA_MS = 60_000;
const LIMPIAR_CADA_N_LLAMADAS = 1000; // review: el Map nunca se achicaba solo

function limitePorMinuto() {
  const v = Number(process.env.FUSIONAR_RATE_LIMIT_POR_MINUTO);
  return Number.isInteger(v) && v > 0 ? v : 20;
}

const contadores = new Map(); // ip -> {cuenta, iniciaEn}
let llamadasDesdeLaUltimaLimpieza = 0;

/** Barrido perezoso: se saca lo que ya venció hace rato, para que el `Map`
 * no crezca sin límite con cada IP única que haya pasado por la instancia. */
function limpiarVencidos(ahora) {
  for (const [ip, e] of contadores) {
    if (ahora - e.iniciaEn >= 2 * VENTANA_MS) contadores.delete(ip);
  }
}

/** `ahora` es inyectable para tests deterministas. */
function permitir(ip, ahora = Date.now()) {
  llamadasDesdeLaUltimaLimpieza += 1;
  if (llamadasDesdeLaUltimaLimpieza >= LIMPIAR_CADA_N_LLAMADAS) {
    llamadasDesdeLaUltimaLimpieza = 0;
    limpiarVencidos(ahora);
  }

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
  llamadasDesdeLaUltimaLimpieza = 0;
}

module.exports = { permitir, limitePorMinuto, _resetParaTests };
