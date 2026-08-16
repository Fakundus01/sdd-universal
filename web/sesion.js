/* Sesión y persistencia del SDD Hub.
 *
 * Habla directo con las APIs HTTP de Supabase (GoTrue para auth, PostgREST
 * para datos): sin librerías ni CDN, para que el sitio siga siendo un HTML
 * que se abre y funciona.
 *
 * Degradación a propósito: si supabase-config.js está vacío, todo sigue
 * andando contra localStorage. Nadie se queda sin usar la página porque
 * falte configurar la nube.
 */
const Sesion = (() => {
  const CLAVE = "sdd-sesion";
  const LOCAL = "sdd-combinaciones";
  const TOPE_SIN_CUENTA = 3;
  const activo = () => Boolean(SUPABASE?.url && SUPABASE?.key);

  let s = null;                        // {access_token, refresh_token, expires_at, user}
  const oyentes = [];
  const avisar = () => oyentes.forEach(f => f(usuario()));

  const guardar = valor => {
    s = valor;
    valor ? localStorage.setItem(CLAVE, JSON.stringify(valor))
          : localStorage.removeItem(CLAVE);
  };

  const usuario = () => s?.user || null;

  /* ---------------- llamadas HTTP ---------------- */

  async function auth(ruta, cuerpo, query = ""){
    const r = await fetch(`${SUPABASE.url}/auth/v1/${ruta}${query}`, {
      method: "POST",
      headers: {apikey: SUPABASE.key, "Content-Type": "application/json"},
      body: JSON.stringify(cuerpo)
    });
    const data = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(data.error_description || data.msg || data.message || `Error ${r.status}`);
    return data;
  }

  async function rest(ruta, opciones = {}){
    if (!s) throw new Error("Sin sesión");
    if (s.expires_at && Date.now() > s.expires_at - 60000) await refrescar();
    const r = await fetch(`${SUPABASE.url}/rest/v1/${ruta}`, {
      ...opciones,
      headers: {
        apikey: SUPABASE.key,
        Authorization: `Bearer ${s.access_token}`,
        "Content-Type": "application/json",
        ...opciones.headers
      }
    });
    if (r.status === 204) return null;
    const data = await r.json().catch(() => null);
    if (!r.ok) throw new Error(data?.message || `Error ${r.status}`);
    return data;
  }

  function normalizar(d){
    return {
      access_token: d.access_token,
      refresh_token: d.refresh_token,
      expires_at: Date.now() + (d.expires_in || 3600) * 1000,
      user: d.user ? {id: d.user.id, email: d.user.email} : s?.user
    };
  }

  async function refrescar(){
    try {
      guardar(normalizar(await auth("token", {refresh_token: s.refresh_token}, "?grant_type=refresh_token")));
    } catch {
      guardar(null); avisar();
      throw new Error("La sesión venció. Volvé a entrar.");
    }
  }

  /* ---------------- API pública ---------------- */

  /* Los errores de GoTrue vienen en inglés y algunos son crípticos.
     Se traducen acá y no en la interfaz, para que haya un solo lugar
     donde mirar cuando aparezca uno nuevo. */
  function traducir(msg = ""){
    const m = msg.toLowerCase();
    if (m.includes("already registered") || m.includes("already been registered"))
      return "Ese mail ya tiene cuenta. Entrá en vez de crear una nueva.";
    if (m.includes("invalid login credentials"))
      return "Mail o contraseña incorrectos.";
    if (m.includes("email not confirmed"))
      return "Te falta confirmar el mail: buscá el correo de confirmación (revisá spam).";
    if (m.includes("password should be at least"))
      return "La contraseña es muy corta: mínimo 8 caracteres.";
    if (m.includes("unable to validate email") || m.includes("invalid format"))
      return "Ese mail no parece válido.";
    if (m.includes("rate limit") || m.includes("too many"))
      return "Demasiados intentos seguidos. Esperá un minuto y probá de nuevo.";
    if (m.includes("signups not allowed"))
      return "Los registros están cerrados en este momento.";
    return msg || "No se pudo completar. Probá de nuevo.";
  }

  /* Crear cuenta con mail y contraseña.
     Devuelve {sesion:true} si el proyecto tiene la confirmación de mail
     apagada (entra directo), o {sesion:false} si hay que confirmar. */
  async function registrar(email, password){
    if ((password || "").length < 8)
      throw new Error("La contraseña tiene que tener al menos 8 caracteres.");
    try {
      const d = await auth("signup", {email, password});
      if (d.access_token){ guardar(normalizar(d)); avisar(); return {sesion: true}; }
      return {sesion: false};
    } catch (e) { throw new Error(traducir(e.message)); }
  }

  async function entrar(email, password){
    try {
      guardar(normalizar(await auth("token", {email, password}, "?grant_type=password")));
      avisar();
    } catch (e) { throw new Error(traducir(e.message)); }
  }

  /* Recuperar contraseña y magic link: los dos dependen de que el mail
     llegue. Quedan como camino alternativo, no como el principal. */
  async function recuperar(email){
    const volverA = location.href.split("#")[0];
    try {
      await auth("recover", {email}, `?redirect_to=${encodeURIComponent(volverA)}`);
    } catch (e) { throw new Error(traducir(e.message)); }
  }

  async function pedirLink(email){
    const volverA = location.href.split("#")[0];
    try {
      await auth("otp", {email, create_user: true}, `?redirect_to=${encodeURIComponent(volverA)}`);
    } catch (e) { throw new Error(traducir(e.message)); }
  }

  async function salir(){
    if (s?.access_token){
      // si el servidor no contesta, igual limpiamos lo local: nunca se queda "adentro"
      await fetch(`${SUPABASE.url}/auth/v1/logout`, {
        method: "POST",
        headers: {apikey: SUPABASE.key, Authorization: `Bearer ${s.access_token}`}
      }).catch(() => {});
    }
    guardar(null); avisar();
  }

  /* Confirmar el mail, el magic link y el recupero vuelven todos al sitio con
     el resultado en el hash de la URL.
     Si salió bien, vienen los tokens: la persona llega YA CON SESIÓN, así que
     no hay que mandarla a ningún formulario de acceso.
     Si salió mal (link vencido o ya usado), viene `error_description`.
     En los dos casos se limpia la barra de direcciones: un access_token no
     tiene por qué quedar en el historial ni en un link que se pueda compartir. */
  function leerCallback(){
    if (!location.hash || location.hash.length < 2) return null;
    const h = new URLSearchParams(location.hash.slice(1));
    const limpiar = () => history.replaceState(null, "", location.pathname + location.search);

    if (h.get("error") || h.get("error_description")){
      limpiar();
      const d = (h.get("error_description") || "").toLowerCase();
      return {error: d.includes("expired")
        ? "Ese link ya venció. Pedí uno nuevo desde «Entrar»."
        : d.includes("already")
          ? "Ese link ya se usó. Entrá con tu mail y contraseña."
          : (h.get("error_description") || "El link no era válido.")};
    }

    if (!h.get("access_token")) return null;
    guardar({
      access_token: h.get("access_token"),
      refresh_token: h.get("refresh_token"),
      expires_at: Date.now() + (+h.get("expires_in") || 3600) * 1000,
      user: null
    });
    limpiar();
    return {tipo: h.get("type") || "sesion"};   // signup | recovery | magiclink
  }

  /* Con sesión activa (incluida la que llega por el link de recupero) se puede
     fijar una contraseña nueva. Esto es lo que hace que "olvidé mi contraseña"
     termine en algo, y no en una pantalla que no lleva a ningún lado. */
  async function cambiarPassword(nueva){
    if ((nueva || "").length < 8)
      throw new Error("La contraseña tiene que tener al menos 8 caracteres.");
    if (!s) throw new Error("Se cerró la sesión. Volvé a pedir el link.");
    if (s.expires_at && Date.now() > s.expires_at - 60000) await refrescar();
    const r = await fetch(`${SUPABASE.url}/auth/v1/user`, {
      method: "PUT",
      headers: {apikey: SUPABASE.key, Authorization: `Bearer ${s?.access_token}`,
                "Content-Type": "application/json"},
      body: JSON.stringify({password: nueva})
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(traducir(d.msg || d.message || d.error_description));
  }

  async function traerUsuario(){
    const r = await fetch(`${SUPABASE.url}/auth/v1/user`, {
      headers: {apikey: SUPABASE.key, Authorization: `Bearer ${s.access_token}`}
    });
    if (!r.ok) { guardar(null); return null; }
    const u = await r.json();
    guardar({...s, user: {id: u.id, email: u.email}});
    return usuario();
  }

  /* Devuelve qué pasó al cargar, para que la interfaz pueda decirlo:
     {usuario, tipo?, error?} — `tipo` es signup | recovery | magiclink. */
  async function iniciar(){
    if (!activo()) return {usuario: null};
    const cb = leerCallback();
    if (!s) { try { s = JSON.parse(localStorage.getItem(CLAVE)); } catch { s = null; } }
    if (s && (!s.user || cb?.tipo)) await traerUsuario().catch(() => guardar(null));
    avisar();
    return {usuario: usuario(), tipo: cb?.tipo, error: cb?.error};
  }

  /* ---------------- combinaciones ---------------- */

  const localLeer = () => { try { return JSON.parse(localStorage.getItem(LOCAL)) || []; } catch { return []; } };
  const localEscribir = v => localStorage.setItem(LOCAL, JSON.stringify(v));

  /* Si las tablas todavía no existen (el SQL del playbook no se corrió),
     PostgREST devuelve 404 PGRST205. No es un error del usuario: seguimos
     contra localStorage en vez de romper la página. */
  let sinTablas = false;
  const esFaltanTablas = e => /PGRST205|schema cache/i.test(e?.message || "");

  async function listar(){
    if (!usuario() || sinTablas) return localLeer();
    try {
      return await rest("combinaciones?select=*&order=actualizado_en.desc");
    } catch (e) {
      if (!esFaltanTablas(e)) throw e;
      sinTablas = true;
      console.warn("Supabase está configurado pero faltan las tablas. " +
        "Corré supabase/schema.sql (playbooks/supabase-auth.md, paso B). " +
        "Mientras tanto se guarda en este navegador.");
      return localLeer();
    }
  }

  async function guardarCombinacion(c){
    if (!usuario() || sinTablas){
      const todas = localLeer().filter(x => x.nombre.toLowerCase() !== c.nombre.toLowerCase());
      todas.unshift({...c, id: crypto.randomUUID(), actualizado_en: new Date().toISOString()});
      // Sin cuenta se guardan pocas y solo en este navegador. No es una
      // traba artificial: sin servidor donde ponerlas, más de esto es
      // prometer una persistencia que no tenemos.
      if (todas.length > TOPE_SIN_CUENTA)
        throw new Error(`Sin cuenta podés guardar hasta ${TOPE_SIN_CUENTA} combinaciones. Borrá una, o entrá con tu mail para tenerlas ilimitadas y en cualquier dispositivo.`);
      localEscribir(todas);
      return todas[0];
    }
    const fila = {...c, usuario_id: usuario().id};
    const r = await rest("combinaciones?on_conflict=usuario_id,nombre", {
      method: "POST",
      headers: {Prefer: "resolution=merge-duplicates,return=representation"},
      body: JSON.stringify(fila)
    });
    return r?.[0];
  }

  async function borrarCombinacion(id){
    if (!usuario() || sinTablas){ localEscribir(localLeer().filter(x => x.id !== id)); return; }
    await rest(`combinaciones?id=eq.${id}`, {method: "DELETE"});
  }

  /* Al entrar por primera vez, lo que había en el navegador se sube.
     Si no, la persona pierde lo que venía armando sin cuenta. */
  async function migrarLocales(){
    const locales = localLeer();
    if (!usuario() || sinTablas || !locales.length) return 0;
    for (const c of locales){
      const {id, actualizado_en, ...datos} = c;
      await guardarCombinacion(datos).catch(() => {});
    }
    localStorage.removeItem(LOCAL);
    return locales.length;
  }

  /* ---------------- métricas anónimas ---------------- */

  /* Suma un contador. No manda usuario, ni sesión, ni nada que identifique:
     va con la clave pública aunque haya sesión abierta, a propósito.
     Falla en silencio — una métrica caída nunca puede romper la página. */
  function contar(tipo, detalle = ""){
    if (!activo()) return;
    fetch(`${SUPABASE.url}/rest/v1/eventos`, {
      method: "POST",
      headers: {apikey: SUPABASE.key, "Content-Type": "application/json", Prefer: "return=minimal"},
      body: JSON.stringify({tipo, detalle: String(detalle).slice(0, 120)}),
      keepalive: true
    }).catch(() => {});
  }

  /* Solo devuelve algo si el perfil tiene admin=true; para cualquier otro,
     RLS filtra y esto es una lista vacía. */
  async function metricas(){
    const [resumen, porDia] = await Promise.all([
      rest("metricas_resumen?select=*&order=total.desc"),
      rest("metricas_por_dia?select=*&order=dia.desc")
    ]);
    return {resumen, porDia};
  }

  const esAdmin = async () => Boolean((await traerPerfil())?.admin);

  /* ---------------- preferencias ---------------- */

  async function guardarTema(tema){
    if (!usuario()) return;
    await rest(`perfiles?id=eq.${usuario().id}`, {
      method: "PATCH", body: JSON.stringify({tema})
    }).catch(() => {});
  }

  async function traerPerfil(){
    if (!usuario()) return null;
    const r = await rest(`perfiles?id=eq.${usuario().id}&select=*`).catch(() => null);
    return r?.[0] || null;
  }

  /* Guarda las respuestas del onboarding. Solo manda las columnas que
     conoce: si el esquema todavía no tiene las nuevas, falla en silencio
     y el perfil sigue viviendo en localStorage. */
  async function guardarPerfil({nivel, interes, perfil_sdd, agente, nombre, onboarding}){
    if (!usuario()) return;
    await rest(`perfiles?id=eq.${usuario().id}`, {
      method: "PATCH",
      body: JSON.stringify({nivel: nivel || "PRO", interes, perfil_sdd: perfil_sdd || "ESTRICTO",
                            agente, nombre: nombre || "", onboarding})
    }).catch(() => {});
  }

  return {
    activo, usuario, iniciar, salir,
    registrar, entrar, recuperar, pedirLink, cambiarPassword,
    contar, metricas, esAdmin, TOPE_SIN_CUENTA,
    listar, guardarCombinacion, borrarCombinacion, migrarLocales,
    guardarTema, traerPerfil, guardarPerfil,
    alCambiar: f => oyentes.push(f)
  };
})();
