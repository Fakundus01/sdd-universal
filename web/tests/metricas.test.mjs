// El reporte de outcomes del panel (D3): O1, O2 y O4 contra sus metas, con
// los conteos anónimos de los últimos 30 días. O3 es manual.
//   node --test "web/tests/*.test.mjs"
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = r => fs.readFileSync(path.join(RAIZ, r), "utf8");
// Un archivo que todavía no existe tiene que dar rojo por test, no tirar la suite entera.
const leerSiExiste = r => fs.existsSync(path.join(RAIZ, r)) ? leer(r) : "";

const ctx = {};
vm.createContext(ctx);
vm.runInContext(leerSiExiste("web/metricas.js") +
  "\n;this.Metricas = typeof Metricas !== 'undefined' ? Metricas : {};", ctx);
const {Metricas} = ctx;

const fila = (tipo, detalle, total) => ({tipo, detalle, total: String(total)});

test("O1, O2 y O4 se calculan contra sus metas", () => {
  const r = Metricas.outcomes([
    fila("descarga", "SDD-MASTER.md", 7), fila("descarga", "seguridad.md", 3),
    fila("visita", "/web/|movil", 20), fila("visita", "/web/|escritorio", 20), fila("visita", "/web/", 10),
    fila("visita", "#/combinador|movil", 4), fila("visita", "#/combinador|escritorio", 6),
    fila("visita", "#/catalogo|movil", 9), fila("visita", "md:SDD-MASTER.md", 50),
    fila("combinacion", "webapp/reco/PRO/nuevo", 10), fila("paquete", "sueltos", 2)
  ]);
  assert.equal(r.O1.num, 7); assert.equal(r.O1.den, 10);
  assert.equal(r.O1.valor, 0.7); assert.equal(r.O1.meta, 0.6); assert.equal(r.O1.cumple, true);

  // Visitas = cargas de página (detalle con «/»), no cada vista ni cada preview.
  assert.equal(r.O2.num, 10); assert.equal(r.O2.den, 50);
  assert.equal(r.O2.valor, 0.2); assert.equal(r.O2.meta, 0.25); assert.equal(r.O2.cumple, false);

  // De las llegadas al combinador con clase conocida, cuántas son del celular.
  assert.equal(r.O4.num, 4); assert.equal(r.O4.den, 10);
  assert.equal(r.O4.valor, 0.4); assert.equal(r.O4.meta, 0.3); assert.equal(r.O4.cumple, true);

  assert.equal(r.O3.manual, true);
});

test("sin datos no hay porcentaje inventado", () => {
  const r = Metricas.outcomes([]);
  for (const k of ["O1", "O2", "O4"]){
    assert.equal(r[k].valor, null, k);
    assert.equal(r[k].cumple, null, k);
  }
});

test("la clase de dispositivo es gruesa y nunca sale del user-agent", () => {
  assert.equal(Metricas.clase(q => ({matches: q.includes("coarse")})), "movil");
  assert.equal(Metricas.clase(() => ({matches: false})), "escritorio");
  assert.equal(Metricas.clase(undefined), "escritorio");
  assert.equal(Metricas.visita("#/combinador", "movil"), "#/combinador|movil");
  assert.throws(() => Metricas.visita("#/x", "Mozilla/5.0 (iPhone)"));
  for (const f of ["web/metricas.js", "web/sesion.js", "web/app.js", "web/inicio.js"])
    assert.doesNotMatch(leer(f), /userAgent|navigator\.platform|userAgentData/, f);
  // El SQL tiene el check y la vista de 30 días.
  const sql = leer("supabase/metricas.sql");
  assert.match(sql, /eventos_detalle_visita_check/);
  assert.match(sql, /metricas_30_dias/);
});

test("el panel carga el reporte y usa la vista de 30 días", () => {
  const admin = leer("web/admin.html");
  assert.match(admin, /metricas\.js\?v=33/);
  assert.match(admin, /Metricas\.outcomes/);
  assert.match(admin, /O3/);
  assert.match(leer("web/sesion.js"), /metricas_30_dias/);
  assert.match(leer("dev/rest.mjs"), /"metricas_30_dias"/);
});
