/* Métricas anónimas: la clase de dispositivo de una visita y el reporte de
 * outcomes del panel (D3, sdd/spec.md §2).
 *
 * Funciones puras, sin DOM ni red: las usan sesion.js (al contar) y
 * admin.html (al reportar), y se testean en web/tests/metricas.test.mjs.
 *
 * Privacidad (supabase/metricas.sql): de un dispositivo se guarda una CLASE
 * GRUESA, «movil» o «escritorio», y se calcula con matchMedia. Nunca se lee
 * el user-agent: dos valores no distinguen a nadie, un user-agent sí. */
const Metricas = (() => {
  const CLASES = ["movil", "escritorio"];

  /* Puntero grueso (dedo) = celular o tablet. Sin matchMedia, escritorio. */
  function clase(mm){
    try { return typeof mm === "function" && mm("(pointer: coarse)").matches ? "movil" : "escritorio"; }
    catch { return "escritorio"; }
  }

  /* El detalle de una visita: «lugar|clase». La base rechaza cualquier otra
     cosa después de la barra (eventos_detalle_visita_check). */
  function visita(lugar, cls){
    if (!CLASES.includes(cls)) throw new Error(`Clase de dispositivo inválida: ${cls}`);
    // N6: se corta el lugar ANTES de pegar la clase. Cortado después (como
    // hacía contar() con su tope de 120), el sufijo quedaba roto, la base lo
    // rechazaba y la visita se perdía en silencio.
    const sufijo = "|" + cls;
    return String(lugar).replace(/\|/g, "").slice(0, 120 - sufijo.length) + sufijo;
  }

  /* filas: [{tipo, detalle, total}] de la vista metricas_30_dias. */
  function outcomes(filas){
    const n = f => Number(f.total) || 0;
    const sumar = pred => filas.filter(pred).reduce((s, f) => s + n(f), 0);
    const medir = (num, den, meta) => {
      const valor = den ? Math.round(num / den * 1000) / 1000 : null;
      return {num, den, meta, valor, cumple: valor === null ? null : valor > meta};
    };
    // Visita = carga de página (el detalle es una ruta, «/web/…»), no cada
    // cambio de vista ni cada vista previa de un MD.
    const esCarga = f => f.tipo === "visita" && f.detalle.startsWith("/");
    // Llegadas al combinador con la clase conocida: las anteriores a 0.33
    // no la tienen y no pueden contar ni a favor ni en contra.
    const alComb = f => f.tipo === "visita" && /^#\/combinador\|(movil|escritorio)$/.test(f.detalle);
    return {
      O1: {nombre: "La gente descarga el archivo correcto",
           mide: "Descargas de SDD-MASTER.md sobre el total de descargas",
           ...medir(sumar(f => f.tipo === "descarga" && f.detalle === "SDD-MASTER.md"),
                    sumar(f => f.tipo === "descarga"), 0.6)},
      O2: {nombre: "El prompt sale de la web y no a mano",
           mide: "Clics en «Generar» sobre cargas de página",
           ...medir(sumar(f => f.tipo === "combinacion"), sumar(esCarga), 0.25)},
      O3: {nombre: "Se entiende sin leer nada", manual: true,
           mide: "Alguien ajeno explica qué es después de 2 min en la página (3 personas)"},
      O4: {nombre: "Entra desde el celular",
           mide: "Llegadas al combinador desde un celular sobre el total de llegadas",
           ...medir(sumar(f => alComb(f) && f.detalle.endsWith("|movil")), sumar(alComb), 0.3)}
    };
  }

  return {clase, visita, outcomes, CLASES};
})();
