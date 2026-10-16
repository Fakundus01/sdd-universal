// Los conteos que la web muestra, contra su fuente de verdad: las filas de la matriz de
// `scenarios.md` y el largo de `TECH` en `web/tecnologias.js`. El check N3 de `web/tests` ya los
// compara y da rojo; esto los arregla, para no editarlos a mano — ya se corrigieron cuatro veces
// (23->37, 38->40, 42->43, 43->45) y la cuarta llegó a `main` en rojo.
//
//   node web/sync_conteos.mjs            informa y sale 1 si alguno está desactualizado
//   node web/sync_conteos.mjs --accept   los escribe
//   node web/sync_conteos.mjs --root X   sobre otra raíz (lo usan los tests)
//
// Lee las fuentes igual que el test (texto normalizado, `TECH` evaluado y no parseado a ojo), así
// el arreglo y el check nunca pueden discrepar.
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

/* Los archivos donde el conteo es una afirmación viva. El changelog y `sdd/progress/` nombran
   conteos viejos a propósito: son el historial, no se tocan. */
export const ARCHIVOS = ["README.md", "web/catalogo.js", "web/index.html", "web/inicio.js", "web/manuales.js"];

const CONTEO_RE = /(\d+) (situaciones|tecnologías)/g;

export function conteos(raiz){
  const leer = r => fs.readFileSync(path.join(raiz, r), "utf8").replace(/\r\n/g, "\n");
  return {
    situaciones: (leer("scenarios.md").match(/^\| S\d+ \|/gm) || []).length,
    tecnologías: vm.runInNewContext(leer("web/tecnologias.js") + ";TECH").length,
  };
}

/** Devuelve `{desactualizados, esperado}`. Con `escribir`, además los corrige en disco. */
export function sincronizar(raiz, {escribir = false} = {}){
  const esperado = conteos(raiz);
  const desactualizados = [];
  for (const rel of ARCHIVOS){
    const p = path.join(raiz, rel);
    if (!fs.existsSync(p)) continue;
    const antes = fs.readFileSync(p, "utf8");   // crudo: así el fin de línea del archivo queda igual
    const despues = antes.replace(CONTEO_RE, (todo, viejo, palabra) => {
      const n = esperado[palabra];
      if (Number(viejo) === n) return todo;
      desactualizados.push({archivo: rel, dice: todo, esperado: `${n} ${palabra}`});
      return `${n} ${palabra}`;
    });
    if (escribir && despues !== antes) fs.writeFileSync(p, despues);
  }
  return {desactualizados, esperado};
}

function cli(argv){
  const raiz = argv.includes("--root")
    ? path.resolve(argv[argv.indexOf("--root") + 1])
    : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const escribir = argv.includes("--accept");
  const {desactualizados, esperado} = sincronizar(raiz, {escribir});
  if (!desactualizados.length){
    console.log(`[conteos] al día (${esperado.situaciones} situaciones, ${esperado.tecnologías} tecnologías)`);
    return 0;
  }
  for (const d of desactualizados) console.log(`[conteos] ${d.archivo}: «${d.dice}» -> «${d.esperado}»`);
  if (escribir){
    console.log(`[conteos] ${desactualizados.length} corregido(s).`);
    return 0;
  }
  console.log("[conteos] Desactualizados. Para escribirlos:");
  console.log("[conteos]   node web/sync_conteos.mjs --accept");
  return 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])){
  process.exit(cli(process.argv.slice(2)));
}
