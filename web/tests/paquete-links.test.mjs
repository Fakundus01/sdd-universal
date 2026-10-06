// C-11: los MD que viajan en los ZIP no pueden llevar links rotos. El paquete
// y el proyecto tienen layouts distintos (el núcleo va a <proyecto>/sdd/,
// agents/ a la raíz) y varios MD se quedan afuera: el ZIP reescribe los links
// al empaquetar. Acá se arman los tres ZIP con los MD reales del repo.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = path.join(RAIZ, "web");
const leer = r => fs.readFileSync(path.join(RAIZ, r), "utf8");

function cargar(){
  const ctx = {TextEncoder, Uint8Array, Uint32Array, DataView, Blob, Date, Set, Map, Math, Error,
    fetch: async ruta => {
      const f = path.resolve(WEB, ruta);
      if (!fs.existsSync(f)) return {ok: false};
      return {ok: true, text: async () => fs.readFileSync(f, "utf8")};
    }};
  vm.createContext(ctx);
  vm.runInContext(leer("web/zip.js") + "\n" + leer("web/paquete.js") +
                  "\n;this.Zip = Zip; this.Paquete = Paquete;", ctx);
  return ctx;
}

// Los archivos que Zip.descargar recibiría: [{nombre, contenido}]
async function archivosDe(fn, opciones){
  const ctx = cargar();
  let archivos;
  ctx.Zip.descargar = (_, a) => { archivos = a; };
  await ctx.Paquete[fn](opciones);
  return archivos;
}

const PLAYBOOKS = fs.readdirSync(path.join(RAIZ, "playbooks"))
  .filter(f => f.endsWith(".md") && !f.startsWith("_")).map(f => f.replace(/\.md$/, ""));
const BASE = {nombre: "Prueba", tipoNombre: "Web", prompt: "P", playbooks: PLAYBOOKS,
  custom: "# custom\n", conTecnologias: true, conGuia: true, brownfield: false,
  conSkills: true, conHarness: true};

/* Links `](x.md…)` relativos fuera de bloques y code spans. Chequeo propio:
   no usa nada de paquete.js. */
function linksMd(texto){
  const out = [];
  let fence = false;
  for (const linea of texto.replace(/\r/g, "").split("\n")){
    if (/^\s*```/.test(linea)){ fence = !fence; continue; }
    if (fence) continue;
    const sinCode = linea.replace(/`[^`]*`/g, m => " ".repeat(m.length));
    for (const m of sinCode.matchAll(/\]\(([^)\s]+)\)/g)){
      const u = m[1];
      if (/^(#|[a-z][a-z0-9+.-]*:|\/)/i.test(u)) continue;
      const p = u.split("#")[0];
      if (/\.md$/i.test(p)) out.push(p);
    }
  }
  return out;
}

function rotos(archivos){
  const presentes = new Set(archivos.map(a => a.nombre));
  let total = 0; const malos = [];
  for (const a of archivos){
    if (!a.nombre.endsWith(".md")) continue;
    for (const l of linksMd(a.contenido)){
      total++;
      const dest = path.posix.normalize(path.posix.join(path.posix.dirname(a.nombre), decodeURI(l)));
      if (!presentes.has(dest)) malos.push(`${a.nombre} -> ${l}`);
    }
  }
  return {total, malos};
}

const ZIPS = {
  "proyecto completo (PRO)": () => archivosDe("proyecto", {...BASE, nivel: "PRO"}),
  "proyecto mínimo (NOVATO)": () => archivosDe("proyecto",
    {...BASE, nivel: "NOVATO", playbooks: [], custom: null, conTecnologias: false, conGuia: false,
     conSkills: false, conHarness: false}),
  "sdd-archivos.zip (soloMd)": () => archivosDe("soloMd", {...BASE})
};

for (const [nombre, armar] of Object.entries(ZIPS))
  test(`C-11: ${nombre} no lleva links .md rotos`, async () => {
    const {total, malos} = rotos(await armar());
    console.log(`# ${nombre}: ${malos.length} rotos de ${total}`);
    assert.ok(total > 0, "el chequeo no encontró links: está roto");
    assert.deepEqual(malos, [], `${malos.length} rotos de ${total}`);
  });
