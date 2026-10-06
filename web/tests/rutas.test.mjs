// Rutas reales (ADR-015), entrar opcional sin portón (ADR-014) y el
// onboarding como página (0.34).
//   node --test "web/tests/*.test.mjs"
import {test} from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import {fileURLToPath} from "node:url";

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const existe = r => fs.existsSync(path.join(RAIZ, r));
const leer = r => existe(r) ? fs.readFileSync(path.join(RAIZ, r), "utf8").replace(/\r\n/g, "\n") : "";

const ctx = {URL};
vm.createContext(ctx);
vm.runInContext(leer("web/rutas.js") + "\n;this.Rutas = typeof Rutas !== 'undefined' ? Rutas : {};", ctx);
const {Rutas} = ctx;
const VISTAS = ["inicio", "catalogo", "combinador", "tecnologias", "reglas", "manuales",
                "perfil", "preferencias", "configuracion", "comunidad", "login"];

test("cada vista tiene su URL y la URL vuelve a la vista", () => {
  for (const v of VISTAS){
    const u = Rutas.url(v, "", "/web/");
    assert.equal(u, v === "inicio" ? "/web/" : `/web/${v}`, v);
    assert.equal(Rutas.vistaDe(u), v, u);
  }
  assert.equal(Rutas.url("combinador", "?c=abc", "/web/catalogo"), "/web/combinador?c=abc");
  assert.equal(Rutas.vistaDe("/web/"), "inicio");
  assert.equal(Rutas.vistaDe("/web/index.html"), "inicio");
  assert.equal(Rutas.vistaDe("/web/inicio"), "inicio");
  assert.equal(Rutas.vistaDe("/web/inexistente"), null);
  assert.equal(Rutas.vistaDe("/web/admin"), null, "admin es una página aparte");
  // La base sale del pathname: sirve igual si el sitio vive en otra carpeta.
  assert.equal(Rutas.base("/otra/web/catalogo"), "/otra/web/");
  assert.equal(Rutas.url("reglas", "", "/otra/web/catalogo"), "/otra/web/reglas");
});

test("los links viejos #/x?… pasan a /web/x?… sin recargar", () => {
  assert.equal(Rutas.desdeHash(""), null);
  assert.equal(Rutas.desdeHash("#seccion"), null, "un ancla común no es una ruta");
  const casos = [
    [{pathname: "/web/", search: "", hash: "#/combinador?c=eyJ0IjoiY2FsYyJ9"}, "/web/combinador?c=eyJ0IjoiY2FsYyJ9"],
    [{pathname: "/web/index.html", search: "", hash: "#/perfil"}, "/web/perfil"],
    [{pathname: "/web/", search: "?cat=Base", hash: "#/catalogo"}, "/web/catalogo?cat=Base"],
    [{pathname: "/web/", search: "", hash: "#/no-existe?x=1"}, "/web/?x=1"]
  ];
  for (const [loc, esperado] of casos){
    let url = null;
    const cambio = Rutas.migrar(loc, {replaceState: (_a, _b, u) => { url = u; }});
    assert.equal(cambio, true, loc.hash);
    assert.equal(url, esperado, loc.hash);
  }
  assert.equal(Rutas.migrar({pathname: "/web/catalogo", search: "", hash: ""}, {replaceState(){ throw new Error("no"); }}), false);
});

test("volver: solo rutas internas bajo /web/ (sin redirección abierta)", () => {
  const malos = ["//evil.com", "//evil.com/web/", "https://evil.com/web/", "http:/web/x", "/\\evil.com",
                 "/web/\\evil", "javascript:alert(1)", "JaVaScRiPt:alert(1)", "/web/../evil", "/web/%2e%2e/evil",
                 "evil.com", "", null, undefined, "/web/login", "/web/login?volver=//evil.com", " /web/", "/web/\nx",
                 "/otra", "data:text/html,x", "/web//evil.com"];
  for (const v of malos) assert.equal(Rutas.volverSeguro(v, "/web/"), "/web/", JSON.stringify(v));
  for (const v of ["/web/", "/web/combinador?c=abc", "/web/admin", "/web/catalogo?cat=Base#x"])
    assert.equal(Rutas.volverSeguro(v, "/web/"), v, v);
});

test("ADR-014: no hay portón en ninguna página ni en el paquete", () => {
  assert.ok(!existe("web/porton.js"), "porton.js sigue existiendo");
  for (const f of ["web/index.html", "web/admin.html", "web/guia.html", "web/demo.html",
                   "sdd-universal-tablero.html", "web/inicio.js", "web/paquete.js", "web/perfil-vista.js"])
    assert.doesNotMatch(leer(f), /porton|Porton/, f);
});

test("0.34: onboarding y login son vistas con su ruta, no diálogos encima de todo", () => {
  const html = leer("web/index.html");
  assert.match(html, /<section class="vista" data-vista="preferencias"/);
  assert.match(html, /<section class="vista" data-vista="login"/);
  assert.doesNotMatch(html, /id="obdlg"/, "el onboarding sigue siendo un <dialog>");
  assert.match(html, /<script src="rutas\.js\?v=38"><\/script>\s*\n<script src="shell\.js/, "rutas.js tiene que correr primero");
  const tit = leer("web/app.js").match(/const TITULOS = (\{[\s\S]*?\});/);
  assert.ok(tit, "TITULOS en app.js");
  assert.deepEqual(Object.keys(vm.runInNewContext(`(${tit[1]})`)).sort(), [...VISTAS].sort());
  // El detalle de la métrica sigue siendo «#/vista» (una etiqueta, contracts §7);
  // lo que no puede quedar es ruteo por hash.
  assert.doesNotMatch(leer("web/app.js"), /location\.hash|pushState\([^)]*#\//, "app.js sigue ruteando por hash");
});

test("ningún link de la web apunta a #/: van a la ruta", () => {
  for (const f of ["web/shell.js", "web/guia.html", "web/demo.html", "web/admin.html", "web/inicio.js",
                   "sdd-universal-tablero.html", "README.md"])
    assert.doesNotMatch(leer(f), /index\.html#\/|["'`]#\/[a-z]|\$\{?[a-zA-Z.]*\}?#\/combinador/, f);
  assert.match(leer("web/inicio.js"), /combinador\?c=/);
});

test("cache-busting en ?v=38", () => {
  for (const f of ["web/index.html", "web/admin.html", "web/guia.html", "web/demo.html"]){
    const vs = [...leer(f).matchAll(/\?v=([\d.]+)"/g)].map(m => m[1]);
    assert.ok(vs.length > 2, f);
    assert.deepEqual([...new Set(vs)], ["38"], f);
  }
});

test("vercel.json resuelve las rutas igual que dev: páginas, app y barra final", () => {
  const v = JSON.parse(leer("vercel.json") || "{}");
  const rw = v.rewrites || [];
  const i = d => rw.findIndex(r => r.destination === d);
  assert.ok(i("/web/admin.html") >= 0 && i("/web/guia.html") >= 0 && i("/web/demo.html") >= 0, "faltan páginas");
  const app = rw.find(r => r.destination === "/web/index.html");
  assert.ok(app, "falta el rewrite a index.html");
  assert.ok(i("/web/admin.html") < rw.indexOf(app), "la página va antes que el comodín");
  assert.match(app.source, /^\/web\/:[a-z]+\(\[a-z\]\[a-z0-9-\]\*\)$/, app.source);
  assert.ok((v.redirects || []).some(r => /\/web\/:[a-z]+\(\[a-z\]\[a-z0-9-\]\*\)\/$/.test(r.source)), "falta la barra final");
});

/* 0.34.1 · nits de la review R30 de 0.34. */
test("/web/inicio se normaliza a /web/ (una sola URL canónica)", () => {
  for (const [loc, esperado] of [[{pathname: "/web/inicio", search: "", hash: ""}, "/web/"],
                                 [{pathname: "/web/inicio", search: "?x=1", hash: ""}, "/web/?x=1"],
                                 [{pathname: "/web/index.html", search: "", hash: ""}, "/web/"]]){
    let url = null;
    assert.equal(Rutas.canonizar(loc, {replaceState: (_a, _b, u) => { url = u; }}), true, loc.pathname);
    assert.equal(url, esperado);
  }
  assert.equal(Rutas.canonizar({pathname: "/web/", search: "", hash: ""}, {replaceState(){ throw new Error("no"); }}), false);
  assert.equal(Rutas.canonizar({pathname: "/web/catalogo", search: "", hash: ""}, {replaceState(){ throw new Error("no"); }}), false);
  assert.match(leer("web/rutas.js"), /Rutas\.canonizar\(location, history\)/, "rutas.js no canoniza al cargar");
});

test("volver a cualquier variante de login cae en /web/", () => {
  for (const v of ["/web/login/", "/web/login?volver=/web/admin", "/web/login#x", "/web/login/?a=1", "/web/LOGIN"])
    assert.equal(Rutas.volverSeguro(v, "/web/"), "/web/", v);
  assert.equal(Rutas.volverSeguro("/web/logins", "/web/"), "/web/logins");
});

test("onboarding: «Prefiero no decir» también en el último paso", () => {
  const src = leer("web/perfil.js");
  assert.doesNotMatch(src, /\$\("obSaltar"\)\.hidden\s*=/, "«Prefiero no decir» se esconde en algún paso");
});

/* Paridad dev ↔ Vercel: las páginas que se sirven por nombre son una lista
   explícita, la misma en los dos lados. */
test("dev y vercel.json resuelven las mismas páginas por nombre", () => {
  const v = JSON.parse(leer("vercel.json"));
  const deVercel = v.rewrites.filter(r => /^\/web\/[a-z-]+$/.test(r.source))
    .map(r => { assert.equal(r.destination, r.source + ".html", r.source); return r.source.slice(5); }).sort();
  const m = leer("dev/servidor.mjs").match(/export const PAGINAS = (\[[^\]]*\]);/);
  assert.ok(m, "dev/servidor.mjs no exporta PAGINAS");
  assert.deepEqual(JSON.parse(m[1]).sort(), deVercel);
  assert.ok(deVercel.includes("admin"));
});
