/* El servidor del entorno local (ADR-012): sirve el repo como lo sirve Vercel
 * y atiende /auth/v1 y /rest/v1 contra el Postgres propio.
 */
import {createServer} from "node:http";
import {readFileSync, statSync} from "node:fs";
import {extname, join, resolve, sep} from "node:path";
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

function archivoDe(ruta){
  const partes = ruta.split("/").filter(Boolean);
  // Nada que empiece con punto: ni .git, ni .env, ni dev/.data.
  if (partes.some(p => p.startsWith(".") || p.includes("\\"))) return null;
  const destino = resolve(RAIZ, ...partes);
  if (destino !== RAIZ && !destino.startsWith(RAIZ + sep)) return null;
  return destino;
}

function estatico(ruta, res){
  if (ruta === "/") return enviar(res, 307, null, {Location: "/web/"});
  if (ruta === "/web/supabase-config.js")
    return enviar(res, 200, CONFIG_LOCAL, {"Content-Type": TIPOS[".js"]});

  let archivo = archivoDe(ruta);
  try {
    if (archivo && statSync(archivo).isDirectory()){
      if (!ruta.endsWith("/")) return enviar(res, 308, null, {Location: ruta + "/"});
      archivo = join(archivo, "index.html");
    }
    const contenido = archivo && readFileSync(archivo);
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
    try {
      const api = ruta.match(/^\/(auth|rest)\/v1\/([a-z_]+)$/);
      if (!api) return estatico(ruta, res);
      const cuerpo = ["POST", "PUT", "PATCH"].includes(req.method) ? await leerCuerpo(req) : null;
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
