// Tests del combinador y del catálogo de tecnologías, sin navegador:
//   node --test "web/tests/*.test.mjs"
// Nacen de los hallazgos de cuatro proyectos reales (0.33): stacks que no
// existían, tecnologías que se perdían en silencio, R01 apagada que el prompt
// ignoraba y la IA en el producto que nadie preguntaba.
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = r => fs.readFileSync(path.join(RAIZ, r), "utf8").replace(/\r\n/g, "\n");
// Un archivo que todavía no existe tiene que dar rojo por test, no tirar la suite entera.
const leerSiExiste = r => fs.existsSync(path.join(RAIZ, r)) ? leer(r) : "";

/* catalogo.js toca el DOM al cargar: de él se toman solo las constantes de
   datos, que son literales puros, y se evalúan aparte. */
function datosDelCatalogo(){
  const src = leer("web/catalogo.js");
  const tomar = nombre => {
    const m = src.match(new RegExp(`const ${nombre} = ([\\[{][\\s\\S]*?\\n[\\]}]);`));
    assert.ok(m, `no encontré ${nombre} en catalogo.js`);
    return vm.runInNewContext(`(${m[1]})`);
  };
  return {CARDS: tomar("CARDS"), TYPES: tomar("TYPES"), STACKS: tomar("STACKS"), PB_META: tomar("PB_META")};
}

function cargar(...archivos){
  const ctx = {};
  vm.createContext(ctx);
  vm.runInContext(archivos.map(leerSiExiste).join("\n;\n") +
    "\n;this.TECH = typeof TECH !== 'undefined' ? TECH : undefined;" +
    "this.Prompt = typeof Prompt !== 'undefined' ? Prompt : undefined;" +
    "this.Metricas = typeof Metricas !== 'undefined' ? Metricas : undefined;", ctx);
  return ctx;
}

const {CARDS, TYPES, STACKS, PB_META} = datosDelCatalogo();
const {TECH, Prompt = {}} = cargar("web/tecnologias.js", "web/prompt.js");

const opciones = extra => ({
  tipo: TYPES.webapp, stack: STACKS.reco, nivel: "PRO", perfil: "ESTRICTO",
  brownfield: false, playbooks: ["env-setup"], tecnologias: [], catalogo: TECH,
  custom: false, apagadas: [], ia: false, ...extra
});

test("H1: existe el stack Python back + React/TS front, también en el select", () => {
  const s = STACKS["py-react"];
  assert.ok(s, "falta STACKS['py-react']");
  for (const x of ["FastAPI", "React", "Vite", "TypeScript", "pytest", "contracts"])
    assert.match(s, new RegExp(x), `el bloque STACK no nombra ${x}`);
  assert.match(leer("web/index.html"), /<option value="py-react">/);
  const p = Prompt.armar(opciones({stack: s}));
  assert.ok(p.includes("STACK: " + s));
});

const NUEVAS = ["Vite", "Vitest", "pytest", "Tailwind CSS", "Mercado Pago", "Stripe", "React Router", "Anthropic API"];

test("H2/H10/H15: las tecnologías que faltaban están, y tecnologias.md va en sincronía", () => {
  const nombres = TECH.map(t => t.n);
  for (const n of NUEVAS) assert.ok(nombres.includes(n), `falta ${n} en tecnologias.js`);
  assert.equal(new Set(nombres).size, nombres.length, "hay nombres repetidos");
  for (const t of TECH) for (const k of ["n", "c", "t", "u"]) assert.ok(t[k], `${t.n}: falta «${k}»`);

  const md = leer("tecnologias.md");
  for (const n of nombres)
    assert.ok(md.includes(`| **${n}**`) || md.includes(`| **${n} ·`), `${n} no está en la tabla de tecnologias.md`);
  const filas = md.split("\n").filter(l => /^\| \*\*/.test(l) && !l.includes("Tecnología |"));
  const enTablas = filas.filter(l => !l.includes("— lección"));
  assert.equal(new Set(enTablas.map(l => l.split("|")[1])).size, TECH.length, "filas de tecnologias.md ≠ TECH");
  assert.match(md, new RegExp(`\\*\\*${TECH.length} tecnologías\\*\\*`));
  // El número aparece en la web: que no quede ningún «120» viejo.
  for (const f of ["web/catalogo.js", "web/index.html", "web/inicio.js", "web/manuales.js"])
    for (const m of leer(f).matchAll(/(\d+) (?:tecnologías|del catálogo)/g))
      assert.equal(+m[1], TECH.length, `${f} dice «${m[0]}»`);
});

test("H2: una tecnología pedida que no está en el catálogo se avisa, no se pierde", () => {
  const p = Prompt.armar(opciones({tecnologias: ["FastAPI", "Celery"]}));
  assert.match(p, /FastAPI \(Python\)/);
  assert.match(p, /NO ESTÁN EN EL CATÁLOGO/);
  assert.match(p, /- Celery/);
  const {conocidas, fuera} = Prompt.separarTecnologias(["FastAPI", "celery", "vite"], TECH);
  assert.deepEqual([...conocidas.map(t => t.n)], ["FastAPI", "Vite"], "la comparación tiene que ignorar mayúsculas");
  assert.deepEqual([...fuera], ["celery"]);
  assert.doesNotMatch(Prompt.armar(opciones({tecnologias: ["FastAPI"]})), /NO ESTÁN EN EL CATÁLOGO/);
});

test("H17 y Anthropic: las lecciones viajan con la tecnología al prompt y al MD", () => {
  const fastapi = TECH.find(t => t.n === "FastAPI");
  assert.match(fastapi.a || "", /Path\(ge=1\)/);
  assert.match(fastapi.a, /Annotated/);
  assert.match(fastapi.a, /422/);
  const anth = TECH.find(t => t.n === "Anthropic API");
  assert.match(anth.a || "", /MockTransport/);
  assert.match(anth.a, /reserva/i);
  assert.match(anth.a, /vigentes/);
  const p = Prompt.armar(opciones({tecnologias: ["FastAPI", "Anthropic API"]}));
  assert.ok(p.includes(fastapi.a) && p.includes(anth.a), "la lección no entra al prompt");
  const md = leer("tecnologias.md");
  assert.match(md, /Path\(ge=1\)/);
  assert.match(md, /Annotated/);
  assert.match(md, /MockTransport/);
});

test("H3: con R01 apagada el prompt no promete esperar el OK del commit", () => {
  const on = Prompt.armar(opciones());
  assert.match(on, /R01 es desactivable/);
  assert.match(on, /primer commit solo con los MD \(R01\)/);
  for (const o of [{apagadas: ["R01"]}, {perfil: "CONFIANZA"}, {apagadas: ["R01"], brownfield: true}]){
    const p = Prompt.armar(opciones(o));
    assert.doesNotMatch(p, /R01 es desactivable/, JSON.stringify(o));
    assert.doesNotMatch(p, /commit[^\n]*\(R01\)/, JSON.stringify(o));
    assert.match(p, /R01=OFF/, JSON.stringify(o));
  }
  assert.equal(Prompt.r01Apagada({apagadas: [], perfil: "ESTRICTO"}), false);
  assert.equal(Prompt.r01Apagada({apagadas: ["R01"], perfil: "ESTRICTO"}), true);
  assert.equal(Prompt.r01Apagada({apagadas: [], perfil: "CONFIANZA"}), true);
  // El configurador expone lo que el combinador necesita leer.
  assert.match(leer("web/reglas-ui.js"), /apagadas: \(\) =>/);
});

test("H14: existe el tipo Mesa de ayuda / ticketera, con su card", () => {
  assert.ok(TYPES.ticketera, "falta TYPES.ticketera");
  assert.match(TYPES.ticketera.name, /Mesa de ayuda/);
  assert.match(TYPES.ticketera.extra, /estado/i);
  assert.ok(CARDS.some(c => c.k === "ticketera"), "falta la card del catálogo");
});

test("H14: IA en el producto suma N4, R12 y el playbook; sin IA no aparece", () => {
  assert.match(leer("web/index.html"), /id="cia"/);
  const con = Prompt.armar(opciones({ia: true, tipo: TYPES.ticketera}));
  assert.match(con, /IA EN EL PRODUCTO/);
  assert.match(con, /N4/);
  assert.match(con, /R26/);
  assert.match(con, /reserv/i);
  assert.match(con, /salida[^\n]*dato/i);
  assert.match(con, /R12/);
  assert.match(con, /ia-en-el-producto/);
  const sin = Prompt.armar(opciones());
  assert.doesNotMatch(sin, /IA EN EL PRODUCTO/);
  // R12 apagada: no se le pide la recomendación de modelo
  assert.doesNotMatch(Prompt.armar(opciones({ia: true, apagadas: ["R12"]})), /recomendame[^\n]*\(R12\)/i);
  assert.match(con, /recomendame[^\n]*\(R12\)/i);
  // brownfield también lo lleva
  assert.match(Prompt.armar(opciones({ia: true, brownfield: true})), /IA EN EL PRODUCTO/);
});

test("playbooks nuevos: ia-en-el-producto, go-live y obsidian-cerebro en el catálogo, Manuales y el ZIP", () => {
  for (const p of ["ia-en-el-producto", "go-live", "obsidian-cerebro"]){
    assert.ok(PB_META[p], `falta PB_META['${p}']`);
    assert.ok(fs.existsSync(path.join(RAIZ, "playbooks", p + ".md")), `no existe playbooks/${p}.md`);
    assert.ok(CARDS.some(c => c.f === `../playbooks/${p}.md`), `falta la card de ${p}`);
    assert.match(leer("web/manuales.js"), new RegExp(`playbooks/${p}\\.md`));
    assert.match(leer("web/index.html"), new RegExp(`<input type="checkbox" value="${p}"`));
  }
  // Arrays de otro contexto de vm: se copian para comparar solo el contenido.
  const pbs = (l, ia) => [...Prompt.playbooks(l, ia)];
  assert.deepEqual(pbs(["env-setup"], true), ["env-setup", "ia-en-el-producto"]);
  assert.deepEqual(pbs(["env-setup", "ia-en-el-producto"], true), ["env-setup", "ia-en-el-producto"]);
  assert.deepEqual(pbs(["env-setup"], false), ["env-setup"]);
  // Todo playbook del mapa existe en disco.
  for (const [k, v] of Object.entries(PB_META))
    assert.ok(fs.existsSync(path.resolve(RAIZ, "web", v.f)), `${k}: ${v.f} no existe`);
});

test("H4: el modo LITE usa la plantilla prompts/sdd-lite.md y el ZIP la trae", () => {
  assert.equal(Prompt.esLite({modo: "LITE", tipo: "webapp"}), true);
  assert.equal(Prompt.esLite({modo: "FULL", tipo: "calc"}), true, "calc es LITE automático");
  assert.equal(Prompt.esLite({modo: "FULL", tipo: "webapp"}), false);
  assert.equal(Prompt.esLite({modo: "COMPACT", tipo: "calc"}), false, "un modo elegido a mano manda");
  const p = Prompt.armar(opciones({lite: true}));
  assert.match(p, /MODO: LITE/);
  assert.match(p, /sdd\/prompts\/sdd-lite\.md/);
  assert.match(p, /sdd\/sdd-lite\.md/);
  assert.doesNotMatch(Prompt.armar(opciones()), /sdd-lite/);
  assert.ok(fs.existsSync(path.join(RAIZ, "prompts/sdd-lite.md")));
});
