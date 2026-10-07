// Tests de la web sin navegador ni dependencias: node --test web/tests/
// Cubren lo que ya se rompió una vez (D2 en sdd/status.md): el ZIP del
// proyecto y que la web muestre las mismas reglas que el master.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import zlib from "node:zlib";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const WEB = path.join(RAIZ, "web");
const leer = r => fs.readFileSync(path.join(RAIZ, r), "utf8");
// Un clon de Windows con autocrlf deja CRLF en disco: se compara texto, no finales de línea.
const lf = t => t.replace(/\r\n/g, "\n");

/* Carga zip.js + paquete.js como los carga el navegador (scripts clásicos,
   globals), con fetch servido desde el disco y la descarga interceptada. */
function cargar(){
  const traidos = [];
  const ctx = {TextEncoder, Uint8Array, Uint32Array, DataView, Blob, Date, Set, Math, Error,
    fetch: async ruta => {
      const f = path.resolve(WEB, ruta);
      if (!fs.existsSync(f)) return {ok: false};
      traidos.push(ruta);
      return {ok: true, text: async () => fs.readFileSync(f, "utf8")};
    }};
  vm.createContext(ctx);
  vm.runInContext(leer("web/zip.js") + "\n" + leer("web/paquete.js") +
                  "\n;this.Zip = Zip; this.Paquete = Paquete;", ctx);
  return {ctx, traidos};
}

/* Lector mínimo del directorio central: nombre, modo Unix y contenido. */
function abrirZip(buf){
  const fin = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(fin >= 0, "sin fin de directorio central");
  const n = buf.readUInt16LE(fin + 10);
  let p = buf.readUInt32LE(fin + 16);
  const entradas = new Map();
  for (let i = 0; i < n; i++){
    assert.equal(buf.readUInt32LE(p), 0x02014b50, "firma de directorio central");
    const crc = buf.readUInt32LE(p + 16), tam = buf.readUInt32LE(p + 20);
    const largo = buf.readUInt16LE(p + 28), extra = buf.readUInt16LE(p + 30), coment = buf.readUInt16LE(p + 32);
    const modo = buf.readUInt32LE(p + 38) >>> 16, local = buf.readUInt32LE(p + 42);
    const nombre = buf.toString("utf8", p + 46, p + 46 + largo);
    const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const datos = buf.subarray(ini, ini + tam);
    assert.equal(zlib.crc32(datos), crc, `CRC de ${nombre}`);
    entradas.set(nombre, {modo, datos});
    p += 46 + largo + extra + coment;
  }
  return entradas;
}

async function armar(opciones){
  const {ctx, traidos} = cargar();
  let blob, ultimoPaso = null;
  ctx.Zip.descargar = (_, archivos) => { blob = ctx.Zip.crear(archivos); };
  await ctx.Paquete.proyecto({nombre: "Prueba", tipoNombre: "Web", prompt: "P", playbooks: [],
    custom: null, conTecnologias: false, conGuia: false, brownfield: false, conSkills: true,
    conHarness: true, ...opciones, onPaso: (h, t) => { ultimoPaso = [h, t]; }});
  const zip = abrirZip(Buffer.from(await blob.arrayBuffer()));
  return {zip, traidos, ultimoPaso, nombres: [...zip.keys()].map(n => n.replace(/^prueba\//, ""))};
}

test("PRO con arnés: trae la capa de ejecución completa", async () => {
  const {zip, nombres, traidos, ultimoPaso} = await armar({nivel: "PRO"});
  for (const f of ["sdd/SDD-MASTER.md", "sdd/seguridad.md", "sdd/harness.md", "sdd/orchestration.md",
                   "sdd/prompts/task-card.md", "sdd/prompts/handback.md", "sdd/prompts/relevo.md",
                   "agents/leader.md", "agents/reviewer.md", "harness/verify.py",
                   ".claude/skills/relevo/SKILL.md", ".claude/skills/harness-fix/SKILL.md"])
    assert.ok(nombres.includes(f), `falta ${f}`);
  assert.equal(nombres.filter(n => n.startsWith("harness/")).length, 12);
  assert.equal(nombres.filter(n => n.startsWith("agents/")).length, 8);
  assert.deepEqual(ultimoPaso, [traidos.length, traidos.length], "la barra de progreso no cierra");
  // harness/ sale igual que en el repo
  for (const n of nombres.filter(n => n.startsWith("harness/")))
    assert.equal(lf(zip.get("prueba/" + n).datos.toString("utf8")), lf(leer(n)), n);
});

test("lo que trae la capa de ejecución no cita prompts/ ni agents/ que falten", async () => {
  const {zip, nombres} = await armar({nivel: "PRO"});
  const capa = nombres.filter(n =>
    /^(sdd\/(harness|orchestration)\.md|sdd\/prompts\/|agents\/|harness\/|\.claude\/skills\/(relevo|harness-fix)\/)/.test(n));
  assert.ok(capa.length > 20, "el filtro no encontró la capa");
  for (const n of capa)
    for (const [, cita] of zip.get("prueba/" + n).datos.toString("utf8").matchAll(/\b((?:prompts|agents)\/[\w.-]+\.md)\b/g))
      assert.ok(nombres.includes(cita) || nombres.includes("sdd/" + cita), `${n} cita ${cita}, que no viene en el ZIP`);
});

// Va siempre, no solo cuando la web eligió LITE: el modo lo clasifica el
// agente al arrancar (R18), y el master y harness.md citan la plantilla.
test("H4: la plantilla sdd-lite.md viaja con las otras de prompts/", async () => {
  for (const nivel of ["PRO", "NOVATO"]){
    const {zip, nombres} = await armar({nivel});
    assert.ok(nombres.includes("sdd/prompts/sdd-lite.md"), `${nivel}: falta sdd/prompts/sdd-lite.md`);
    // C-11 reescribe los links al empaquetar: se compara el texto, no los destinos.
    const sinLinks = t => lf(t).replace(/\[([^\]]+)\]\([^)\s]+\.md[^)\s]*\)/g, "$1");
    assert.equal(sinLinks(zip.get("prueba/sdd/prompts/sdd-lite.md").datos.toString("utf8")), sinLinks(leer("prompts/sdd-lite.md")));
  }
});

test("H5: .gitattributes junta en el merge los historiales de sdd/, también el de LITE", async () => {
  const {zip} = await armar({nivel: "PRO"});
  const ga = zip.get("prueba/.gitattributes").datos.toString("utf8");
  for (const f of ["sdd/changelog/*.md", "sdd/status.md", "sdd/changelog.md", "sdd/sdd-lite.md"])
    assert.match(ga, new RegExp(`^${f.replace(/[.*]/g, m => "\\" + m)} merge=union$`, "m"), `falta ${f} merge=union`);
});

test("el pre-commit sale ejecutable y nada más lo es", async () => {
  const {zip} = await armar({nivel: "PRO"});
  for (const [nombre, {modo}] of zip){
    if (nombre.endsWith("harness/git-hooks/pre-commit")) assert.equal(modo, 0o100755, nombre);
    else assert.equal(modo & 0o111, 0, `${nombre} no debería ser ejecutable`);
  }
});

test("NOVATO: sin agents/ ni harness-fix (R31 va OFF)", async () => {
  const {zip, nombres} = await armar({nivel: "NOVATO", conHarness: false});
  assert.ok(!nombres.some(n => n.startsWith("agents/") || n.startsWith("harness/")));
  assert.ok(!nombres.includes(".claude/skills/harness-fix/SKILL.md"));
  assert.ok(!zip.get("prueba/LEEME.md").datos.toString("utf8").includes("/harness-fix"),
            "el LEEME anuncia una skill que no viene");
  assert.ok(nombres.includes("sdd/harness.md"), "harness.md va siempre: R30 es fija");
});

test("brownfield: el LEEME dice que hay que llevarse harness/ y agents/", async () => {
  const {zip} = await armar({nivel: "PRO", brownfield: true});
  const leeme = zip.get("prueba/LEEME.md").datos.toString("utf8");
  const paso = leeme.split("\n").find(l => l.includes("**dentro** del repo"));
  for (const c of ["`sdd/`", "`agents/`", "`harness/`", "`.claude/skills/`", "`.gitattributes`"])
    assert.ok(paso.includes(c), `el paso brownfield no menciona ${c}`);
});

test("la web tiene las mismas reglas que el master", () => {
  // ADR-004: el generador de reglas.js nunca quedó en el repo y R27–R32
  // llegaron tarde a la web. Esto compara id, nombre, default, tipo y nota contra
  // los encabezados de la §4; la descripción («d») es un resumen curado.
  const encabezados = [...leer("SDD-MASTER.md").matchAll(/^\*\*(R\d\d) · (.+?) — \[(.+?)\] — (fija|desactivable)(?: \((.+)\))?\*\*$/gm)]
    .map(([, id, nombre, def, tipo, nota = ""]) => ({id, nombre, def, tipo, nota}));
  const master = encabezados.map(r => r.id);
  assert.deepEqual(master, [...leer("SDD-MASTER.md").matchAll(/^\*\*(R\d\d) · /gm)].map(m => m[1]),
                   "algún encabezado de regla del master no tiene el formato esperado");
  const ctx = {};
  vm.runInNewContext(leer("web/reglas.js") + "\n;this.R = JSON.stringify(REGLAS);", ctx);
  const web = JSON.parse(ctx.R);  // objetos de este realm: deepEqual compara prototipos
  assert.deepEqual(web.map(({id, nombre, def, tipo, nota}) => ({id, nombre, def, tipo, nota})), encabezados);
  const tablero = [...leer("sdd-universal-tablero.html").matchAll(/class="rid">(R\d\d)</g)].map(m => m[1]);
  assert.deepEqual(tablero, master);
  const n = master.length;
  const conTexto = ["sdd-universal-tablero.html", "README.md",
    ...fs.readdirSync(WEB).filter(f => /\.(html|js)$/.test(f)).map(f => "web/" + f)];
  for (const f of conTexto)
    for (const m of leer(f).matchAll(/(\d+) reglas/g))
      assert.equal(Number(m[1]), n, `${f} dice «${m[0]}» y el master tiene ${n}`);
});

// P-1: el agente que arranca carga el compacto + un índice (≤ 10 KB, medido en bytes), no el master entero.
// Si estos dos espejos mandan a leer el master, cada sesión paga ≈36 KB de más y se frena el caching.
const TOPE_ARRANQUE = 10 * 1024;
const reglasDelMaster = () => [...leer("SDD-MASTER.md").matchAll(/^\*\*R(\d\d)\b/gm)].map(m => "R" + m[1]);

test("P-1: el AGENTS.md y el CLAUDE.md del ZIP mandan a leer el compacto, no el master", async () => {
  for (const nivel of ["PRO", "NOVATO"]){
    const {zip, nombres} = await armar({nivel});
    assert.ok(nombres.includes("sdd/SDD-COMPACT.md"), `${nivel}: el ZIP no trae sdd/SDD-COMPACT.md`);
    for (const espejo of ["AGENTS.md", "CLAUDE.md"]){
      const texto = zip.get("prueba/" + espejo).datos.toString("utf8");
      const leer_ = texto.split("\n").filter(l => l.startsWith("Leé ")).join("\n");
      assert.match(leer_, /sdd\/SDD-COMPACT\.md/, `${nivel} ${espejo}: no manda a leer el compacto`);
      assert.doesNotMatch(leer_, /SDD-MASTER/, `${nivel} ${espejo}: manda a leer el master entero`);
      assert.match(leer_, /sdd\/custom\.md/, `${nivel} ${espejo}: no manda a leer el custom.md`);
      assert.match(texto, /SDD-MASTER\.md`: abrilo solo si la tarea lo pide/, `${nivel} ${espejo}: el master no queda bajo demanda`);
    }
  }
});

test("P-1: el arranque del ZIP (espejo + compacto) pesa ≤ 10 KB y define todas las reglas del master", async () => {
  const custom = "PERFIL=ESTRICTO\nMODO=FULL\nR01=OFF\n";
  const {zip} = await armar({nivel: "PRO", custom});
  const compacto = zip.get("prueba/sdd/SDD-COMPACT.md").datos;
  // en LF, como lo mide el arnés: un clon de Windows con autocrlf no pesa más
  const bytesLF = b => Buffer.byteLength(lf(b.toString("utf8")));
  for (const espejo of ["AGENTS.md", "CLAUDE.md"]){
    const bytes = bytesLF(zip.get("prueba/" + espejo).datos) + bytesLF(compacto) + bytesLF(zip.get("prueba/sdd/custom.md").datos);
    assert.ok(bytes <= TOPE_ARRANQUE, `${espejo} + compacto + custom.md = ${bytes} bytes > ${TOPE_ARRANQUE}`);
  }
  const lineas = compacto.toString("utf8");
  const reglas = reglasDelMaster();
  assert.equal(reglas.length, 33, "el master dejó de tener R01–R33");
  for (const r of reglas)
    assert.match(lineas, new RegExp("^" + r + "\\s", "m"), `el compacto del ZIP no define ${r}`);
});

test("P-1: el LEEME del ZIP lista el compacto y no dice que AGENTS.md apunta al master", async () => {
  const {zip} = await armar({nivel: "PRO"});
  const leeme = zip.get("prueba/LEEME.md").datos.toString("utf8");
  assert.match(leeme, /`sdd\/SDD-COMPACT\.md`/);
  assert.doesNotMatch(leeme, /Una línea para que cualquier agente encuentre el SDD solo \|/, "el LEEME sigue diciendo que AGENTS.md es una línea al master");
  assert.match(leeme, /Apuntan al compacto/);
});

test("P-1: el custom.md que genera la web dice que el agente lee el compacto al arrancar, no el master", () => {
  const fuente = leer("web/reglas-ui.js");
  assert.match(fuente, /El agente lee el compacto al arrancar y después/);
  assert.doesNotMatch(fuente, /El agente lee el master primero/);
});

test("P-1: el recuadro del master no manda a leerlo entero y R23 conserva «lenguaje llano»", () => {
  for (const f of ["SDD-MASTER.md", "SDD-MASTER-EN.md"]){
    const caja = lf(leer(f)).split("\n").slice(0, 14).join("\n");
    assert.doesNotMatch(caja, /leelo completo|read it in full/i, `${f}: el recuadro manda a leer el master entero`);
  }
  assert.match(leer("SDD-COMPACT.md"), /^R23 .*lenguaje llano.*jerga/m);
  assert.match(leer("SDD-COMPACT-EN.md"), /^R23 .*plain language.*jargon/m);
});
