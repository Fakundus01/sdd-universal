// Smoke de la interfaz en un navegador real (D2): Chrome headless por CDP,
// sin dependencias (ADR-001). Sirve el repo, carga la web y falla si hay
// excepciones o errores de consola, o si un paso no deja el DOM esperado.
//
//   node web/tests/smoke/smoke.mjs
//
// Chrome: CHROME_PATH si está; si no, las rutas de siempre por plataforma.
// No usa dev/servidor.mjs porque levantar() arranca Postgres: acá alcanza
// con los estáticos y las rutas reales /web/<vista> (ADR-015). Supabase va
// vacío, así la página corre entera contra localStorage y sin red (V2).
import {createServer} from "node:http";
import {spawn, spawnSync} from "node:child_process";
import {existsSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync} from "node:fs";
import {tmpdir} from "node:os";
import {extname, join, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";

const RAIZ = resolve(fileURLToPath(new URL("../../..", import.meta.url)));
const TOPE_MS = Number(process.env.SMOKE_TIMEOUT_MS) || 120_000;

/* ---------------- servidor estático ---------------- */

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".py": "text/plain; charset=utf-8", ".sql": "text/plain; charset=utf-8",
  ".yml": "text/plain; charset=utf-8", ".sh": "text/plain; charset=utf-8"
};
// Las páginas por nombre, como PAGINAS de dev/servidor.mjs y los rewrites de vercel.json.
const PAGINAS = ["admin", "guia", "demo"];
const CONFIG_VACIA = "// Servido por el smoke: sin Supabase, todo contra localStorage.\nconst SUPABASE = {url: \"\", key: \"\"};\n";

function archivoDe(ruta){
  const partes = ruta.split("/").filter(Boolean);
  if (partes.some(p => p.startsWith(".") || p.includes("\\") || p.includes(":"))) return null;
  try {
    const real = realpathSync.native(resolve(RAIZ, ...partes));
    const dentro = relative(RAIZ, real);
    return dentro.startsWith("..") || dentro.split(sep).some(p => p.startsWith(".")) ? null : real;
  } catch { return null; }
}

function servir(req, res){
  const enviar = (estado, cuerpo, tipo, extra = {}) => {
    res.writeHead(estado, {"Content-Type": tipo, "Cache-Control": "no-store", ...extra});
    res.end(cuerpo);
  };
  let ruta;
  try { ruta = decodeURIComponent(new URL(req.url, "http://local").pathname); }
  catch { return enviar(400, "URL inválida", TIPOS[".txt"]); }
  if (ruta === "/") return enviar(307, "", TIPOS[".txt"], {Location: "/web/"});
  if (ruta === "/web/supabase-config.js") return enviar(200, CONFIG_VACIA, TIPOS[".js"]);
  const vista = ruta.match(/^\/web\/([a-z][a-z0-9-]*)(\/)?$/);
  if (vista){
    if (vista[2]) return enviar(308, "", TIPOS[".txt"], {Location: `/web/${vista[1]}`});
    const pagina = (PAGINAS.includes(vista[1]) && archivoDe(`/web/${vista[1]}.html`)) || join(RAIZ, "web", "index.html");
    return enviar(200, readFileSync(pagina), TIPOS[".html"]);
  }
  let archivo = archivoDe(ruta);
  try {
    if (!archivo) throw new Error("fuera");
    if (statSync(archivo).isDirectory()){
      if (!ruta.endsWith("/")) return enviar(308, "", TIPOS[".txt"], {Location: ruta + "/"});
      archivo = join(archivo, "index.html");
    }
    return enviar(200, readFileSync(archivo), TIPOS[extname(archivo)] || "application/octet-stream");
  } catch {
    return enviar(404, "no existe", TIPOS[".txt"]);
  }
}

/* ---------------- Chrome ---------------- */

function rutaChrome(){
  if (process.env.CHROME_PATH) return process.env.CHROME_PATH;
  const candidatas = {
    win32: [process.env.PROGRAMFILES, process.env["PROGRAMFILES(X86)"], process.env.LOCALAPPDATA]
      .filter(Boolean).map(b => join(b, "Google", "Chrome", "Application", "chrome.exe")),
    darwin: ["/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"],
    linux: []
  }[process.platform] || [];
  const hallada = candidatas.find(existsSync);
  if (hallada) return hallada;
  for (const nombre of ["google-chrome", "google-chrome-stable", "chromium", "chromium-browser"]){
    const r = spawnSync("which", [nombre], {encoding: "utf8"});
    if (r.status === 0 && r.stdout.trim()) return r.stdout.trim();
  }
  throw new Error("No encontré Chrome: definí CHROME_PATH con la ruta del ejecutable.");
}

async function lanzarChrome(perfil, vivo){
  const args = ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check",
    "--disable-extensions", "--disable-background-networking", "--disable-component-update",
    "--remote-debugging-port=0", `--user-data-dir=${perfil}`, "about:blank"];
  // En ubuntu-latest el sandbox de Chrome no arranca sin user namespaces, y
  // /dev/shm de los runners es chico.
  if (process.platform === "linux") args.unshift("--no-sandbox", "--disable-dev-shm-usage");
  // `vivo.proc` queda apenas se lanza: si algo falla después, el finally lo cierra igual.
  const proc = vivo.proc = spawn(rutaChrome(), args, {stdio: ["ignore", "ignore", "pipe"]});
  let stderr = "", fallo = null;
  proc.on("error", e => { fallo = e; });
  proc.stderr.on("data", d => { stderr = (stderr + d).slice(-4000); });
  const archivo = join(perfil, "DevToolsActivePort");
  for (let i = 0; i < 300; i++){
    if (fallo) throw new Error(`No se pudo abrir Chrome (${fallo.message}); revisá CHROME_PATH.`);
    if (proc.exitCode !== null) throw new Error(`Chrome terminó al arrancar (${proc.exitCode}):\n${stderr}`);
    if (existsSync(archivo)){
      const [puerto, camino] = readFileSync(archivo, "utf8").split(/\r?\n/);
      if (puerto && camino) return `ws://127.0.0.1:${puerto}${camino}`;
    }
    await new Promise(ok => setTimeout(ok, 100));
  }
  throw new Error("Chrome no abrió el puerto de depuración en 30 s");
}

/* ---------------- CDP con el WebSocket nativo ---------------- */

class Cdp {
  constructor(url){
    this.n = 0; this.pendientes = new Map(); this.oyentes = new Set();
    this.ws = new WebSocket(url);
    this.listo = new Promise((ok, mal) => {
      this.ws.onopen = ok;
      this.ws.onerror = () => mal(new Error("No se pudo conectar al CDP"));
    });
    this.ws.onmessage = e => {
      const m = JSON.parse(e.data);
      const p = m.id && this.pendientes.get(m.id);
      if (p){
        this.pendientes.delete(m.id);
        m.error ? p.mal(new Error(`${p.metodo}: ${m.error.message}`)) : p.ok(m.result);
      } else this.oyentes.forEach(f => f(m));
    };
  }
  enviar(metodo, params = {}, sessionId){
    const id = ++this.n;
    return new Promise((ok, mal) => {
      this.pendientes.set(id, {ok, mal, metodo});
      this.ws.send(JSON.stringify({id, method: metodo, params, ...(sessionId ? {sessionId} : {})}));
    });
  }
  esperarEvento(metodo, sessionId){
    return new Promise(ok => {
      const f = m => { if (m.method === metodo && m.sessionId === sessionId){ this.oyentes.delete(f); ok(m.params); } };
      this.oyentes.add(f);
    });
  }
}

/* ---------------- el smoke ---------------- */

async function smoke({base, cdp, pasos, errores}){
  const {targetId} = await cdp.enviar("Target.createTarget", {url: "about:blank"});
  const {sessionId} = await cdp.enviar("Target.attachToTarget", {targetId, flatten: true});
  const s = (metodo, params) => cdp.enviar(metodo, params, sessionId);

  let dondeEstoy = "about:blank";
  cdp.oyentes.add(m => {
    if (m.sessionId !== sessionId) return;
    const p = m.params;
    if (m.method === "Runtime.exceptionThrown")
      errores.push(`[${dondeEstoy}] excepción: ${p.exceptionDetails.exception?.description || p.exceptionDetails.text}`);
    else if (m.method === "Runtime.consoleAPICalled" && (p.type === "error" || p.type === "assert"))
      errores.push(`[${dondeEstoy}] console.${p.type}: ${p.args.map(a => a.value ?? a.description ?? "").join(" ")}`);
    else if (m.method === "Log.entryAdded" && p.entry.level === "error")
      errores.push(`[${dondeEstoy}] ${p.entry.source}: ${p.entry.text}${p.entry.url ? " " + p.entry.url : ""}`);
  });
  await s("Page.enable"); await s("Runtime.enable"); await s("Log.enable");

  const evaluar = async expr => {
    const r = await s("Runtime.evaluate", {expression: `(async () => { ${expr} })()`, awaitPromise: true, returnByValue: true});
    if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text);
    return r.result.value;
  };
  const ir = async ruta => {
    dondeEstoy = ruta;
    const cargada = cdp.esperarEvento("Page.loadEventFired", sessionId);
    const r = await s("Page.navigate", {url: base + ruta});
    if (r.errorText) throw new Error(`No cargó ${ruta}: ${r.errorText}`);
    await cargada;
  };
  // Cada paso devuelve null si anduvo, o el porqué si no.
  const paso = async (nombre, expr) => {
    const falla = await evaluar(expr);
    if (falla) throw new Error(`${nombre}: ${falla}`);
    pasos.push(nombre);
    console.log(`ok   ${nombre}`);
  };
  const UTIL = `
    const $ = id => document.getElementById(id);
    const elegir = (id, v) => { $(id).value = v; $(id).dispatchEvent(new Event("change", {bubbles: true})); };
    const esperar = async (f, ms = 8000) => { const t = Date.now(); while (!f()) { if (Date.now() - t > ms) return false; await new Promise(r => setTimeout(r, 50)); } return true; };
    const arbol = () => $("ziparbol").textContent;
    const archivos = () => [...document.querySelectorAll("#filelist code")].map(c => c.textContent);
  `;

  // 1. Combinador: generar, lista de archivos y árbol.
  await ir("/web/combinador");
  await paso("combinador: la vista está a la vista", `${UTIL}
    return !document.querySelector('.vista[data-vista="combinador"]').hidden ? null : "la sección sigue oculta";`);
  await paso("combinador: generar arma prompt, lista de archivos y árbol", `${UTIL}
    elegir("ctype", "webapp"); elegir("clvl", "NOVATO");
    $("go").click();
    if ($("out").style.display !== "block") return "#out no se mostró";
    if ($("ta").value.length < 300) return "el prompt quedó corto: " + $("ta").value.length;
    const f = archivos();
    for (const n of ["SDD-MASTER.md", "seguridad.md", "harness.md", "orchestration.md", "GUIDE.md"])
      if (!f.includes(n)) return "falta " + n + " en la lista: " + f.join(", ");
    for (const n of ["LEEME.md", "PROMPT-DE-ARRANQUE.txt", "sdd/", "harness/", "GUIDE.md"])
      if (!arbol().includes(n)) return "falta " + n + " en el árbol";
    return arbol().includes("agents/") ? "NOVATO no debería llevar agents/" : null;`);
  await paso("combinador: el cambio de nivel regenera lista y árbol", `${UTIL}
    const antes = $("ta").value;
    elegir("clvl", "PRO");
    if ($("ta").value === antes) return "el prompt no cambió al pasar a PRO";
    if (archivos().includes("GUIDE.md")) return "PRO sigue listando GUIDE.md";
    if (!arbol().includes("agents/")) return "PRO no suma agents/ al árbol";
    return arbol().includes("GUIDE.md") ? "PRO sigue con GUIDE.md en el árbol" : null;`);
  await paso("combinador: el checkbox del arnés saca y pone harness/", `${UTIL}
    if (!$("zipHarness").checked) return "el arnés no viene tildado";
    $("zipHarness").click();
    if (arbol().includes("harness/")) return "destildado, el árbol sigue con harness/";
    $("zipHarness").click();
    return arbol().includes("harness/") ? null : "tildado de nuevo, falta harness/";`);

  // 2. Las vistas por su ruta real, y una navegación sin recargar. El perfil
  //    de Chrome es nuevo: la primera entrada por Inicio va al onboarding.
  await ir("/web/");
  await paso("primera visita: /web/ lleva a /web/preferencias y se puede cerrar", `${UTIL}
    if (location.pathname !== "/web/preferencias") return "quedó en " + location.pathname;
    if (document.querySelector('.vista[data-vista="preferencias"]').hidden) return "preferencias oculta";
    $("obCerrar").click();
    if (!await esperar(() => location.pathname !== "/web/preferencias")) return "cerrar no salió del onboarding";
    return JSON.parse(localStorage.getItem("sdd-perfil") || "{}").onboarding ? null : "no quedó marcado el onboarding";`);
  const vistas = await evaluar("return Rutas.VISTAS;");
  for (const v of vistas){
    await ir(`/web/${v}`);
    await paso(`ruta /web/${v} muestra su vista`, `
      const visibles = [...document.querySelectorAll(".vista")].filter(x => !x.hidden).map(x => x.dataset.vista);
      return visibles.length === 1 && visibles[0] === ${JSON.stringify(v)} ? null : "visibles: " + visibles.join(",");`);
  }
  await paso("navegar sin recargar: el menú lleva al catálogo", `${UTIL}
    document.querySelector('.side-nav a[data-vista="catalogo"]').click();
    if (location.pathname !== "/web/catalogo") return "quedó en " + location.pathname;
    return document.querySelector('.vista[data-vista="catalogo"]').hidden ? "el catálogo sigue oculto" : null;`);
  for (const p of PAGINAS){
    await ir(`/web/${p}`);
    await paso(`ruta /web/${p} sirve su página`, `
      return location.pathname === "/web/${p}" && document.querySelectorAll(".vista").length === 0
        ? null : "parece la app, no la página " + ${JSON.stringify(p)};`);
  }

  // 3. Descarga rápida: categoría «Proyectos» y Zip.descargar interceptado.
  await ir("/web/catalogo");
  await paso("descarga rápida: «Proyectos» trae cards con ZIP", `${UTIL}
    document.querySelector('[data-cat="Proyectos"]').click();
    const n = document.querySelectorAll("#grid [data-zip]").length;
    return n > 0 ? null : "no hay botones 📦 en Proyectos";`);
  await paso("descarga rápida: el popup baja la carpeta del proyecto", `${UTIL}
    window.__zip = null;
    Zip.descargar = (nombre, archivos) => { window.__zip = {nombre, archivos}; };
    const b = document.querySelector("#grid [data-zip]"), tipo = b.dataset.zip;
    b.click();
    if (!$("zipdlg").open) return "el popup no se abrió";
    $("zrdl").click();
    if (!await esperar(() => window.__zip, 20000)) return "Zip.descargar no se llamó: " + $("zrmsg").textContent;
    const {nombre, archivos: bajados} = window.__zip, rutas = bajados.map(a => a.nombre);
    if (!nombre.endsWith(".zip")) return "nombre raro: " + nombre;
    const carpeta = nombre.slice(0, -4);
    for (const r of ["PROMPT-DE-ARRANQUE.txt", "LEEME.md", ".gitignore", "sdd/SDD-MASTER.md", "sdd/playbooks/env-setup.md"])
      if (!rutas.includes(carpeta + "/" + r)) return "el ZIP no trae " + r + " (" + tipo + ")";
    if (bajados.some(a => typeof a.contenido === "string" && !a.contenido.length)) return "hay archivos vacíos";
    if (!await esperar(() => /Listo/.test($("zrmsg").textContent))) return "el popup no dijo Listo: " + $("zrmsg").textContent;
    return null;`);
}

async function main(){
  const servidor = createServer(servir);
  const perfil = mkdtempSync(join(tmpdir(), "sdd-smoke-"));
  const chrome = {proc: null};
  let cdp = null, temporizador;
  const pasos = [], errores = [];
  let falla = null;
  try {
    await new Promise((ok, mal) => servidor.once("error", mal).listen(0, "127.0.0.1", ok));
    const base = `http://127.0.0.1:${servidor.address().port}`;
    const tope = new Promise((_, mal) => { temporizador = setTimeout(() => mal(new Error(`tope global de ${TOPE_MS / 1000} s`)), TOPE_MS); });
    await Promise.race([tope, (async () => {
      cdp = new Cdp(await lanzarChrome(perfil, chrome));
      await cdp.listo;
      await smoke({base, cdp, pasos, errores});
    })()]);
  } catch (e) {
    falla = e.message;
  } finally {
    clearTimeout(temporizador);
    try { if (cdp) await Promise.race([cdp.enviar("Browser.close"), new Promise(ok => setTimeout(ok, 2000))]); } catch {}
    try { cdp?.ws.close(); } catch {}
    if (chrome.proc && chrome.proc.exitCode === null && chrome.proc.pid){
      chrome.proc.kill();
      await Promise.race([new Promise(ok => chrome.proc.once("exit", ok)), new Promise(ok => setTimeout(ok, 3000))]);
    }
    servidor.closeAllConnections?.();
    await new Promise(ok => servidor.close(() => ok()));
    try { rmSync(perfil, {recursive: true, force: true, maxRetries: 5, retryDelay: 200}); } catch {}
  }

  if (errores.length) console.log(`\nErrores de la página (${errores.length}):\n` + errores.map(e => "  - " + e).join("\n"));
  if (falla || errores.length){
    console.log(`\nFAIL smoke: ${falla || "la página tiró errores"} (${pasos.length} pasos ok antes)`);
    process.exitCode = 1;
  } else console.log(`\nPASS smoke: ${pasos.length} pasos, 0 errores de consola`);
}

await main();
