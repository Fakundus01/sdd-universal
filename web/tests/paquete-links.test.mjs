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
// custom.md lo arma la web: acá linkea a un MD que viaja y a uno que no
const CUSTOM = ["# custom", "", "Ver [el master](SDD-MASTER.md#r01) y [escenarios](scenarios.md).", ""].join("\n");
const BASE = {nombre: "Prueba", tipoNombre: "Web", prompt: "P", playbooks: PLAYBOOKS,
  custom: "# custom\n", conTecnologias: true, conGuia: true, brownfield: false,
  conSkills: true, conHarness: true};

/* Links relativos a un archivo (cualquier extensión) fuera de bloques y code
   spans, en orden. Chequeo propio: no usa nada de paquete.js. */
function linksArchivo(texto){
  const out = [];
  let abre = null;
  for (const linea of texto.replace(/\r/g, "").split("\n")){
    const f = linea.match(/^\s*(`{3,}|~{3,})/);
    if (abre){ if (f && f[1][0] === abre[0] && f[1].length >= abre.length && /^\s*\S+\s*$/.test(linea)) abre = null; continue; }
    if (f){ abre = f[1]; continue; }
    const sinCode = linea.replace(/(`+)[^`].*?\1(?!`)/g, m => " ".repeat(m.length));
    for (const m of sinCode.matchAll(/(?<![!\\])\[[^\]]*\]\(([^)\s]+)\)/g)){
      const u = m[1];
      if (/^(#|[a-z][a-z0-9+.-]*:|\/)/i.test(u)) continue;
      const p = u.split(/[#?]/)[0];
      if (/\.[a-z0-9]+$/i.test(p)) out.push(p);
    }
  }
  return out;
}

const resolver = (desde, l) => path.posix.normalize(path.posix.join(path.posix.dirname(desde), decodeURI(l)));

function rotos(archivos){
  const presentes = new Set(archivos.map(a => a.nombre));
  let total = 0; const malos = [];
  for (const a of archivos){
    if (!a.nombre.endsWith(".md")) continue;
    for (const l of linksArchivo(a.contenido)){
      total++;
      if (!presentes.has(resolver(a.nombre, l))) malos.push(`${a.nombre} -> ${l}`);
    }
  }
  return {total, malos};
}

/* El «0 rotos» se cumple también degradando todo a texto. Acá: cada link del
   MD original cuyo destino viaja en el ZIP sigue siendo un link, y al mismo
   archivo lógico (el de su `origen`); los demás quedaron como texto. */
function conservados(archivos){
  const mapa = new Map(archivos.filter(a => a.origen).map(a => [a.origen, a.nombre]));
  const problemas = [];
  let esperados = 0;
  for (const a of archivos){
    if (!a.origen) continue;
    if (a.origen !== "custom.md")
      assert.ok(fs.existsSync(path.join(RAIZ, a.origen)), `el origen ${a.origen} de ${a.nombre} no existe en el repo`);
    if (!a.nombre.endsWith(".md")) continue;
    const orig = a.origen === "custom.md" ? CUSTOM : leer(a.origen);
    const esperado = linksArchivo(orig)
      .map(l => mapa.get(path.posix.normalize(path.posix.join(path.posix.dirname(a.origen), decodeURI(l)))))
      .filter(Boolean);
    esperados += esperado.length;
    const obtenido = linksArchivo(a.contenido).map(l => resolver(a.nombre, l));
    if (JSON.stringify(esperado) !== JSON.stringify(obtenido))
      problemas.push(`${a.nombre}: esperaba ${esperado.length} links, salieron ${obtenido.length}`);
  }
  return {problemas, esperados};
}

const ZIPS = {
  "proyecto completo (PRO)": () => archivosDe("proyecto", {...BASE, nivel: "PRO"}),
  "proyecto mínimo (NOVATO)": () => archivosDe("proyecto",
    {...BASE, nivel: "NOVATO", playbooks: [], custom: null, conTecnologias: false, conGuia: false,
     conSkills: false, conHarness: false}),
  "sdd-archivos.zip (soloMd)": () => archivosDe("soloMd", {...BASE})
};

for (const [nombre, armar] of Object.entries(ZIPS))
  test(`C-11: ${nombre} no lleva links rotos y conserva los que pueden viajar`, async () => {
    const archivos = await armar();
    const {total, malos} = rotos(archivos);
    console.log(`# ${nombre}: ${malos.length} rotos de ${total}`);
    assert.ok(total > 0, "el chequeo no encontró links: está roto");
    assert.deepEqual(malos, [], `${malos.length} rotos de ${total}`);
    const {problemas, esperados} = conservados(archivos);
    assert.ok(esperados > 0, "no hay links que conservar: el chequeo está roto");
    assert.deepEqual(problemas, [], "links que podían viajar y se perdieron o apuntan a otro archivo");
  });
