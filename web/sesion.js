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

  async function pedirLink(email){
    const volverA = location.href.split("#")[0];
    await auth("otp", {email, create_user: true}, `?redirect_to=${encodeURIComponent(volverA)}`);
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

  /* El magic link vuelve con los tokens en el hash de la URL. Se leen, se
     guardan y se limpia la barra de direcciones para que no queden ahí. */
  function leerCallback(){
    if (!location.hash.includes("access_token")) return false;
    const h = new URLSearchParams(location.hash.slice(1));
    guardar({
      access_token: h.get("access_token"),
      refresh_token: h.get("refresh_token"),
      expires_at: Date.now() + (+h.get("expires_in") || 3600) * 1000,
      user: null
    });
    history.replaceState(null, "", location.pathname + location.search);
    return true;
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

  async function iniciar(){
    if (!activo()) return null;
    const vino = leerCallback();
    if (!s) { try { s = JSON.parse(localStorage.getItem(CLAVE)); } catch { s = null; } }
    if (s && (!s.user || vino)) await traerUsuario().catch(() => guardar(null));
    avisar();
    return usuario();
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

  return {
    activo, usuario, iniciar, pedirLink, salir,
    listar, guardarCombinacion, borrarCombinacion, migrarLocales,
    guardarTema, traerPerfil,
    alCambiar: f => oyentes.push(f)
  };
})();
