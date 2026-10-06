/* Rutas de la app (ADR-015): una vista, una URL real bajo /web/.
 *
 * Es lo único que sabe armar y leer URLs de la app. Puro salvo la última
 * línea, que convierte un link viejo con hash (#/combinador?c=…) en su
 * ruta: por eso este archivo se carga primero, antes que el shell y que
 * catalogo.js, que leen la URL al arrancar.
 *
 * El servidor resuelve las rutas (dev/servidor.mjs y vercel.json): un
 * /web/<vista> sin extensión sirve index.html. Antes era hash porque no
 * había quién las resolviera y recargar /web/catalogo daba 404. */
const Rutas = (() => {
  const VISTAS = ["inicio", "catalogo", "combinador", "tecnologias", "reglas", "manuales",
                  "perfil", "preferencias", "configuracion", "comunidad", "login"];

  /* La carpeta de la app sale del pathname: «/web/» en dev y en Vercel. */
  function base(pathname){
    const m = String(pathname || "").match(/^(.*?\/web\/)/);
    return m ? m[1] : "/web/";
  }

  /* La vista de un pathname, o null si no es ninguna (una ruta inventada,
     o una página aparte como admin). */
  function vistaDe(pathname){
    const resto = String(pathname || "").slice(base(pathname).length);
    if (resto === "" || resto === "index.html") return "inicio";
    return VISTAS.includes(resto) ? resto : null;
  }

  /* Inicio es la carpeta misma: /web/. */
  const url = (vista, search = "", pathname = "/web/") =>
    base(pathname) + (vista === "inicio" || !VISTAS.includes(vista) ? "" : vista) + (search || "");

  /* «#/combinador?c=x» → {vista, search}. Un ancla común (#seccion) no es ruta. */
  function desdeHash(hash){
    const m = String(hash || "").match(/^#\/([^?]*)(\?.*)?$/);
    if (!m) return null;
    return {vista: VISTAS.includes(m[1]) ? m[1] : "inicio", search: m[2] || ""};
  }

  /* Reemplaza (sin recargar ni sumar un paso al «atrás») un link viejo por su ruta. */
  function migrar(loc, hist){
    const d = desdeHash(loc.hash);
    if (!d) return false;
    hist.replaceState(null, "", url(d.vista, d.search || loc.search || "", loc.pathname));
    return true;
  }

  /* Adónde volver después de entrar: solo una ruta interna bajo la app.
     Un `volver` sin validar es una redirección abierta (la lección de 0.32,
     cuando /%2Fweb terminaba en //web/). */
  function volverSeguro(v, raiz = "/web/"){
    if (typeof v !== "string" || !v.startsWith(raiz) || v.startsWith("//")) return raiz;
    if (/[\\\u0000-\u001f\u007f]/.test(v) || /%2e|%2f|%5c/i.test(v)) return raiz;
    let u;
    try { u = new URL(v, "http://interno.invalid"); } catch { return raiz; }
    if (u.origin !== "http://interno.invalid" || !u.pathname.startsWith(raiz) || u.pathname.includes("//")) return raiz;
    if (u.pathname === raiz + "login") return raiz;
    return u.pathname + u.search + u.hash;
  }

  return {VISTAS, base, vistaDe, url, desdeHash, migrar, volverSeguro};
})();

if (typeof location !== "undefined" && typeof history !== "undefined") Rutas.migrar(location, history);
