// Que lo que la web manda a `eventos.detalle` entre de verdad en la base.
//
// Nace del review de IA-2 (B1): `combinador.js` empezó a emitir `ia:`, `ia-simulada:` e
// `ia-fallback:` para el tipo `paquete`, y el CHECK de `supabase/metricas.sql` acepta solo
// `sueltos|skills|proyecto:|rapido:`. El insert falla, y como `Sesion.contar` no frena la interfaz
// por una métrica —y está bien que no la frene— la pérdida es **silenciosa**: el panel de outcomes
// reporta de menos y nada lo delata. Medir sin que entre es peor que no medir, porque el número
// parece completo.
//
// Lo que este test cruza: cada `Sesion.contar("<tipo>", "<literal>"...)` de `web/*.js` contra el
// regex que `metricas.sql` exige para ese tipo. No puede verificar los que pasan una variable
// (`Sesion.contar("descarga", nombre)`): esos los lista al final para que se vean.
//   node --test "web/tests/*.test.mjs"
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = r => fs.readFileSync(path.join(RAIZ, r), "utf8").replace(/\r\n/g, "\n");

/** Los regex del CHECK `eventos_detalle_formato_check`, por tipo de evento. */
function formatosDeLaBase(){
  const sql = leer("supabase/metricas.sql");
  const out = {};
  for (const m of sql.matchAll(/when\s+'(\w+)'\s+then\s+detalle\s+~\s+'([^']+)'/g)) out[m[1]] = m[2];
  return out;
}

/** Cada `Sesion.contar("tipo", "literal"…)` de la web, con el archivo donde está. */
function valoresQueEmiteLaWeb(){
  const conLiteral = [], conVariable = [];
  for (const archivo of fs.readdirSync(path.join(RAIZ, "web")).filter(f => f.endsWith(".js"))){
    const texto = leer(`web/${archivo}`);
    for (const m of texto.matchAll(/Sesion\.contar\(\s*"(\w+)"\s*,\s*([^)]*)/g)){
      const [, tipo, resto] = m;
      const literal = resto.match(/^"([^"]*)"/);
      (literal ? conLiteral : conVariable).push({archivo, tipo, valor: literal ? literal[1] : resto.trim()});
    }
  }
  return {conLiteral, conVariable};
}

/* Un literal que termina en `:` se completa con un sufijo mínimo válido para las clases que usan
   los regex de la base (`[a-z0-9-]`, `[A-Za-z0-9-]`, `[A-Za-z0-9._-]`): lo que se verifica es el
   prefijo, que es justo lo que el CHECK enumera. */
const completar = v => (v.endsWith(":") ? v + "x" : v);

test("todo `detalle` que emite la web entra en el CHECK de metricas.sql", () => {
  const formatos = formatosDeLaBase();
  assert.ok(Object.keys(formatos).length >= 5,
    "no pude leer los formatos de supabase/metricas.sql: ¿cambió el CHECK?");

  const {conLiteral} = valoresQueEmiteLaWeb();
  assert.ok(conLiteral.length >= 5, "no encontré los Sesion.contar de la web");

  for (const {archivo, tipo, valor} of conLiteral){
    const patron = formatos[tipo];
    assert.ok(patron, `web/${archivo}: el tipo «${tipo}» no está en el CHECK de metricas.sql`);
    const candidato = completar(valor);
    assert.match(candidato, new RegExp(patron),
      `web/${archivo}: «${candidato}» (tipo ${tipo}) no entra en el CHECK de metricas.sql — ` +
      `el insert va a fallar en producción y la métrica se pierde en silencio`);
  }
});

test("los `detalle` que son variables quedan a la vista, no tapados", () => {
  // No es un test de formato: es un inventario. Si mañana uno de estos empieza a mandar algo que
  // el CHECK no acepta, ningún test lo puede ver — y conviene que eso esté escrito en algún lado.
  const {conVariable} = valoresQueEmiteLaWeb();
  for (const {tipo} of conVariable){
    assert.ok(formatosDeLaBase()[tipo], `el tipo «${tipo}» no está en el CHECK de metricas.sql`);
  }
  assert.ok(conVariable.length <= 4,
    `aparecieron ${conVariable.length} Sesion.contar con valor variable: ya son demasiados para ` +
    "no poder verificar ninguno. Pasalos a un prefijo literal + sufijo");
});
