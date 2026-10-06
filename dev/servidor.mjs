/* El servidor del entorno local (ADR-012): sirve el repo como lo sirve Vercel
 * y atiende /auth/v1 y /rest/v1 contra el Postgres propio.
 */
import {createServer} from "node:http";
import {readFileSync, realpathSync, statSync} from "node:fs";
import {extname, join, relative, resolve, sep} from "node:path";
import {fileURLToPath} from "node:url";
import {Cluster} from "./postgres.mjs";
import {Auth} from "./auth.mjs";
import {Rest} from "./rest.mjs";

export const RAIZ = resolve(fileURLToPath(new URL("..", import.meta.url)));

const TIPOS = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8", ".webmanifest": "application/manifest+json",
  ".md": "text/markdown; charset=utf-8", ".txt": "text/plain; charset=utf-8",
  ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon",
  ".py": "text/plain; charset=utf-8", ".sql": "text/plain; charset=utf-8",
  ".yml": "text/plain; charset=utf-8", ".skill": "application/zip"
};

// Los mismos headers que fija vercel.json, para que lo que anda acá ande allá.
const HEADERS = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "SAMEORIGIN",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Cache-Control": "no-store"
};

const CONFIG_LOCAL = `// Servido por dev/servidor.mjs en lugar de web/supabase-config.js (ADR-012).
// Apunta al entorno local: el mismo origen que la página.
const SUPABASE = {url: location.origin, key: "local-anon"};
`;

/* Aplica el auth mínimo y los dos .sql del repo, en ese orden. Idempotente:
   se corre en cada arranque, así un cambio en schema.sql entra solo. */
export function prepararBase(cluster){
  cluster.asegurarBase();
  for (const archivo of ["dev/supabase-local.sql", "supabase/schema.sql", "supabase/metricas.sql"])
    cluster.script(readFileSync(join(RAIZ, archivo), "utf8"));
}

// Nada que empiece con punto: ni .git, ni .env, ni dev/.data.
const oculta = partes => partes.some(p => p.startsWith(".") || p.includes("\\") || p.includes(":"));

/* El filtro se aplica dos veces: a lo pedido y al nombre real en disco. En
   Windows `/dev/DATA~1/` es un alias 8.3 de `dev/.data/` que no tiene punto;
   realpathSync.native lo devuelve con el nombre largo, y ahí se lo ve. */
function archivoDe(ruta){
  const partes = ruta.split("/").filter(Boolean);
  if (oculta(partes)) return null;
  let real;
  try { real = realpathSync.native(resolve(RAIZ, ...partes)); } catch { return null; }
  const dentro = relative(RAIZ, real);
  if (dentro.startsWith("..") || resolve(RAIZ, dentro) !== real) return null;
  return oculta(dentro.split(sep).filter(Boolean)) ? null : real;
}

function estatico(ruta, res){
  if (ruta === "/") return enviar(res, 307, null, {Location: "/web/"});
  if (ruta === "/web/supabase-config.js")
    return enviar(res, 200, CONFIG_LOCAL, {"Content-Type": TIPOS[".js"]});

  // ADR-015: rutas reales. /web/<nombre> (una parte, patrón cerrado) sirve
  // web/<nombre>.html si existe (admin, guia, demo) y si no la app. Con barra
  // final, 308 sin barra, para que los recursos relativos resuelvan contra
  // /web/. El Location se arma con lo validado, nunca con lo pedido.
  const vista = ruta.match(/^\/web\/([a-z][a-z0-9-]*)(\/)?$/);
  if (vista){
    if (vista[2]) return enviar(res, 308, null, {Location: `/web/${vista[1]}`});
    const pagina = archivoDe(`/web/${vista[1]}.html`) || join(RAIZ, "web", "index.html");
    return enviar(res, 200, readFileSync(pagina), {"Content-Type": TIPOS[".html"]});
  }

  let archivo = archivoDe(ruta);
  try {
    if (!archivo) throw new Error("fuera del sitio");
    if (archivo && statSync(archivo).isDirectory()){
      // Una sola barra adelante: con `//web/` el navegador iría a otro host.
      if (!ruta.endsWith("/")) return enviar(res, 308, null, {Location: "/" + ruta.replace(/^\/+/, "") + "/"});
      archivo = join(archivo, "index.html");
    }
    const contenido = readFileSync(archivo);
    return enviar(res, 200, contenido, {"Content-Type": TIPOS[extname(archivo)] || "application/octet-stream"});
  } catch {
    const pagina404 = readFileSync(join(RAIZ, "404.html"));
    return enviar(res, 404, pagina404, {"Content-Type": TIPOS[".html"]});
  }
}

function enviar(res, estado, cuerpo, extra = {}){
  const esJson = cuerpo !== null && typeof cuerpo === "object" && !Buffer.isBuffer(cuerpo);
  res.writeHead(estado, {...HEADERS, ...(esJson ? {"Content-Type": TIPOS[".json"]} : {}), ...extra});
  res.end(esJson ? JSON.stringify(cuerpo) : cuerpo ?? undefined);
}

function leerCuerpo(req){
  return new Promise((ok, mal) => {
    let datos = "";
    req.setEncoding("utf8");
    req.on("data", d => { datos += d; if (datos.length > 1e6) { mal(new Error("Cuerpo demasiado grande")); req.destroy(); } });
    req.on("end", () => { try { ok(datos ? JSON.parse(datos) : null); } catch { mal(new Error("El cuerpo no es JSON")); } });
    req.on("error", mal);
  });
}

/* Levanta Postgres, prepara la base y abre el servidor HTTP. Devuelve con
   qué cerrarlo. `datos` es la carpeta del clúster (dev/.data por default). */
export async function levantar({datos = join(RAIZ, "dev", ".data"), puerto = 4321, puertoPg = 54329} = {}){
  const cluster = new Cluster({datos, puerto: puertoPg});
  cluster.arrancar();
  prepararBase(cluster);
  const auth = new Auth(cluster);
  const rest = new Rest(cluster, auth.jwt);

  const servidor = createServer(async (req, res) => {
    const url = new URL(req.url, "http://local");
    let ruta;
    try { ruta = decodeURIComponent(url.pathname); } catch { return enviar(res, 400, {message: "URL inválida"}); }
    // Solo se atiende a quien llama a 127.0.0.1 o localhost: una página ajena
    // que reapunte su dominio acá (DNS rebinding) llega con otro Host.
    if (!/^(127\.0\.0\.1|localhost)(:\d+)?$/i.test(req.headers.host || ""))
      return enviar(res, 403, {message: "Host no permitido"});
    try {
      // Con dígitos: la vista metricas_30_dias (0.33) caía al estático y daba 404.
      const api = ruta.match(/^\/(auth|rest)\/v1\/([a-z_][a-z0-9_]*)$/);
      if (!api) return estatico(ruta, res);
      let cuerpo = null;
      if (["POST", "PUT", "PATCH"].includes(req.method)){
        try { cuerpo = await leerCuerpo(req); }
        catch (e) { return enviar(res, 400, {message: e.message, msg: e.message}); }
      }
      const [estado, salida] = await (api[1] === "auth" ? auth : rest)
        .atender(req.method, api[2], url.searchParams, req.headers, cuerpo);
      enviar(res, estado, salida);
    } catch (e) {
      console.error(`${req.method} ${ruta}:`, e.message);
      enviar(res, 500, {message: e.message});
    }
  });

  await new Promise((ok, mal) => servidor.once("error", mal).listen(puerto, "127.0.0.1", ok));
  return {
    cluster, servidor,
    url: `http://127.0.0.1:${servidor.address().port}`,
    cerrar: async ({pararPostgres = true} = {}) => {
      await new Promise(ok => { servidor.close(ok); servidor.closeAllConnections(); });
      if (pararPostgres) cluster.parar();
    }
  };
}
