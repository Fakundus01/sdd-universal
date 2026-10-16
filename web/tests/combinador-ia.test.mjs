// Fusión con IA del combinador (F28, ADR-016, IA-2): el botón nuevo llama a
// POST /api/fusionar y arma el ZIP con lo que devuelve, sin romper nunca el
// camino v1 (sin key, sin red, o si el endpoint no existe en este deploy).
// Mock de fetch — sin red real, como pide la tarjeta (criterio 7).
//   node --test "web/tests/*.test.mjs"
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const leer = r => fs.readFileSync(path.join(RAIZ, r), "utf8").replace(/\r\n/g, "\n");

/* Un elemento mínimo: valor, checked, listeners y nada más (mismo molde que
   combinador-ui.test.mjs). */
function elemento(id){
  const oyentes = {};
  return {id, value: "", checked: false, hidden: false, disabled: false, innerHTML: "", textContent: "",
    style: {}, dataset: {}, classList: {add(){}, remove(){}, toggle(){}, contains: () => false},
    addEventListener(t, f){ (oyentes[t] ||= []).push(f); },
    disparar(t){ (oyentes[t] || []).forEach(f => f({target: this, type: t})); if (this["on" + t]) this["on" + t]({target: this}); },
    showModal(){}, close(){}, scrollIntoView(){}, focus(){}};
}

function tomar(src, nombre){
  const m = src.match(new RegExp(`const ${nombre} = ([\\[{][\\s\\S]*?\\n[\\]}]);`));
  assert.ok(m, `no encontré ${nombre}`);
  return m[1];
}

/* Monta el combinador real (combinador.js sin tocar) con un DOM de mentira,
   un Zip y un Paquete.proyecto espía (sin filesystem/red reales), y un fetch
   configurable por test. */
function montar({fetchImpl} = {}){
  const els = {};
  const $ = id => (els[id] ||= elemento(id));
  const pbs = [{value: "env-setup", checked: true}, {value: "ia-en-el-producto", checked: false}];
  const docOyentes = {};
  const reglas = {perfil: "ESTRICTO", apagadas: [], oyentes: [], fijado: null};
  const cat = leer("web/catalogo.js");
  const zipCalls = [], sesionCalls = [], paqueteCalls = [];
  const ctx = {
    $, sel: new Set(), console,
    fetch: fetchImpl || (() => Promise.reject(new Error("fetch no configurado en este test"))),
    document: {
      querySelectorAll: q => q === "#pbs input:checked" ? pbs.filter(p => p.checked) : q === "#pbs input" ? pbs : [],
      querySelector: () => null,
      addEventListener: (t, f) => (docOyentes[t] ||= []).push(f)
    },
    ReglasUI: {
      apagadas: () => [...reglas.apagadas], perfil: () => reglas.perfil, modo: () => "FULL",
      hayCambios: () => reglas.apagadas.length > 0,
      generar: () => `PERFIL=${reglas.perfil}`,
      fijarPerfil: p => { reglas.perfil = p; },
      alCambiar: () => {}
    },
    Paquete: {
      slug: t => String(t).toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      HARNESS: [],
      proyecto: async o => { paqueteCalls.push(o); if (o.onPaso) o.onPaso(1, 1); return 7; }
    },
    Zip: {descargar(nombre, archivos){ zipCalls.push({nombre, archivos}); }},
    Sesion: {contar(...a){ sesionCalls.push(a); }},
    Feedback: {toast(){}, empezar(){}, terminar(){}, fijar(){}},
    App: {ir(){}}
  };
  vm.createContext(ctx);
  vm.runInContext(
    `const esc = ${cat.match(/const esc = (s => [^\n]+);/)[1]};
     const TYPES = ${tomar(cat, "TYPES")}; const STACKS = ${tomar(cat, "STACKS")}; const PB_META = ${tomar(cat, "PB_META")};
     ${leer("web/tecnologias.js")}\n${leer("web/prompt.js")}\n${leer("web/combinador.js")}
     this.opcionesFusion = typeof opcionesFusion !== "undefined" ? opcionesFusion : undefined;
     this.fusionarIA = typeof fusionarIA !== "undefined" ? fusionarIA : undefined;`, ctx);
  $("ctype").value = "webapp"; $("cstack").value = "reco"; $("clvl").value = "PRO";
  $("cperf").value = "ESTRICTO"; $("cexiste").value = "nuevo";
  return {ctx, $, zipCalls, sesionCalls, paqueteCalls};
}

const resp = (status, cuerpo) => ({
  ok: status >= 200 && status < 300, status,
  json: async () => cuerpo
});

test("el botón de fusión con IA existe al lado de los de v1 y dice «con IA»", () => {
  const html = leer("web/index.html");
  assert.match(html, /id="zipFusion"/, "falta el botón nuevo");
  assert.match(html, /id="zipProyecto"[\s\S]{0,400}id="zipFusion"|id="zipFusion"[\s\S]{0,400}id="zipProyecto"/,
    "el botón de IA no está cerca de los botones v1");
  const boton = html.match(/<button[^>]*id="zipFusion"[^>]*>([^<]*)<\/button>/);
  assert.ok(boton, "no encontré el texto del botón zipFusion");
  assert.match(boton[1], /con IA/i, "el botón no dice explícito «con IA»");
  assert.match(html, /id="cdesc"/, "falta el textarea de descripción libre");
});

test("fusion: ia — arma el ZIP con los archivos de la respuesta, sin pasar por v1", async () => {
  const {ctx, zipCalls, sesionCalls, paqueteCalls} = montar({
    fetchImpl: async (url, init) => {
      assert.equal(url, "/api/fusionar");
      assert.equal(init.method, "POST");
      const body = JSON.parse(init.body);
      // keys del catálogo, no el objeto {name, extra} (contracts.md §8)
      assert.equal(body.tipo, "webapp");
      assert.equal(body.stack, "reco");
      assert.deepEqual(body.tecnologias, []);
      assert.ok(Array.isArray(body.playbooks));
      assert.equal(body.custom, null);
      assert.ok(!("descripcion" in body), "sin texto, descripcion no debería viajar");
      return resp(200, {archivos: [{nombre: "a.md", contenido: "hola"}], fusion: "ia"});
    }
  });
  assert.equal(typeof ctx.fusionarIA, "function", "falta fusionarIA en combinador.js");
  await ctx.fusionarIA();
  assert.equal(zipCalls.length, 1, "no se llamó a Zip.descargar");
  assert.deepEqual(zipCalls[0].archivos, [{nombre: "a.md", contenido: "hola"}]);
  assert.match(zipCalls[0].nombre, /\.zip$/);
  assert.equal(paqueteCalls.length, 0, "no debería caer a v1 cuando la IA respondió bien");
  assert.ok(sesionCalls.some(a => a[0] === "paquete" && /ia/i.test(a[1]) && !/simulad/i.test(a[1])),
    "falta la métrica de fusión IA");
});

test("fusion: ia — la descripción libre viaja como string cuando hay texto", async () => {
  let visto;
  const {ctx} = montar({
    fetchImpl: async (url, init) => { visto = JSON.parse(init.body); return resp(200, {archivos: [{nombre: "a.md", contenido: "x"}], fusion: "ia"}); }
  });
  ctx.$("cdesc").value = "  un club de barrio  ";
  await ctx.fusionarIA();
  assert.equal(visto.descripcion, "un club de barrio");
});

test("fusion: simulada — arma el ZIP igual y avisa (sin error) que es la versión sin IA", async () => {
  const {ctx, zipCalls, sesionCalls, paqueteCalls, $} = montar({
    fetchImpl: async () => resp(200, {archivos: [{nombre: "b.md", contenido: "chau"}], fusion: "simulada"})
  });
  await ctx.fusionarIA();
  assert.equal(zipCalls.length, 1);
  assert.deepEqual(zipCalls[0].archivos, [{nombre: "b.md", contenido: "chau"}]);
  assert.equal(paqueteCalls.length, 0);
  assert.notEqual($("zipmsg").className, "zipmsg err", "el aviso de modo simulado no es un error");
  assert.match($("zipmsg").textContent, /simulad|sin ia/i, "no avisa que es la versión sin IA");
  assert.ok(sesionCalls.some(a => a[0] === "paquete" && /simulad/i.test(a[1])),
    "falta la métrica de fusión simulada");
});

test("si la llamada falla (red, 429 o 500) cae al v1 automáticamente, con aviso y sin colgarse", async () => {
  const casos = [
    ["red", () => Promise.reject(new Error("fetch failed"))],
    ["429", async () => resp(429, {error: "rate limit", reintentar_en: 10})],
    ["500 inesperado", async () => resp(500, {error: "boom"})]
  ];
  for (const [nombre, fetchImpl] of casos){
    const {ctx, zipCalls, sesionCalls, paqueteCalls, $} = montar({fetchImpl});
    assert.equal(typeof ctx.fusionarIA, "function", "falta fusionarIA en combinador.js");
    await assert.doesNotReject(ctx.fusionarIA(), `${nombre}: la promesa no puede quedar sin catch`);
    assert.equal(paqueteCalls.length, 1, `${nombre}: no cayó a Paquete.proyecto (v1)`);
    assert.equal(zipCalls.length, 0, `${nombre}: no debería llamar a Zip.descargar directo (eso lo hace v1)`);
    assert.ok($("zipmsg").textContent.length > 0, `${nombre}: no hay aviso visible`);
    assert.ok(sesionCalls.length > 0, `${nombre}: falta la métrica`);
  }
});
