/* Shell compartido: barra lateral y barra superior, iguales en todas las páginas.
 *
 * Se renderiza desde JS y no se copia en cada HTML: con tres páginas ya eran
 * tres lugares donde tocar cada vez que cambia un link, y el tercero siempre
 * se olvida. Sin build, la única forma de tener una sola fuente es esta.
 */
const Shell = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

  // pagina: "app" (index, con vistas) | "contenido" (guia, demo…)
  // base: prefijo de ruta para las páginas que no viven en web/ (el tablero)
  let pagina = "app", base = "";

  const VISTAS = [
    {g: "Empezar"},
    {v: "inicio",     i: "🏠", t: "Inicio"},
    {v: "catalogo",   i: "📦", t: "Catálogo"},
    {v: "combinador", i: "🧩", t: "Combinador"},
    {g: "Tu espacio"},
    {v: "perfil",     i: "👤", t: "Mi perfil"},
    {a: "tech",       i: "⚙️", t: "Tecnologías", soloApp: true},
    {a: "reglas",     i: "📐", t: "Mis reglas",  soloApp: true},
    {g: "Aprender"},
    {h: "guia.html",  i: "📖", t: "Guía"},
    {h: "demo.html",  i: "🔬", t: "Demo con/sin SDD"},
    {h: "../sdd-universal-tablero.html", i: "🗺️", t: "Tablero"},
    {g: "Comunidad"},
    {v: "comunidad",  i: "💬", t: "Feedback"},
    {h: "https://github.com/Fakundus01/sdd-universal", i: "🐙", t: "GitHub"}
  ];

  /* Las iniciales del avatar: nombre y apellido si los hay, y si no las dos
     primeras letras del mail. Nunca queda vacío. */
  function iniciales(usuario, perfil){
    const nombre = (perfil?.nombre || "").trim();
    if (nombre){
      const p = nombre.split(/\s+/).filter(Boolean);
      return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || nombre.slice(0, 2).toUpperCase();
    }
    const mail = usuario?.email || "";
    return mail ? mail.slice(0, 2).toUpperCase() : "··";
  }

  function linkVista(x){
    const href = pagina === "app" ? `#/${x.v}` : `${base}index.html#/${x.v}`;
    return `<a data-vista="${x.v}" href="${href}"><span class="i">${x.i}</span>${esc(x.t)}</a>`;
  }

  // El tablero vive en la raíz del repo, así que sus links necesitan `web/`
  // adelante y el del propio tablero, uno menos.
  const ruta = h => h.startsWith("http") ? h
    : base && h.startsWith("../") ? h.slice(3)
    : base + h;

  function montar(opciones = {}){
    pagina = opciones.pagina || "app";
    base = opciones.base || "";
    const actual = opciones.actual || "";

    $("side").innerHTML = `
      <div class="side-marca">
        <a class="brand" href="${pagina === "app" ? "#/inicio" : base + "index.html"}">
          <span class="mark"><span></span></span>SDD Hub</a>
        <button class="side-cerrar" id="sideCerrar" type="button" aria-label="Cerrar el menú">✕</button>
      </div>
      <nav class="side-nav">
        ${VISTAS.map(x => {
          if (x.g) return `<p class="side-grupo">${esc(x.g)}</p>`;
          if (x.v) return linkVista(x);
          if (x.a) return pagina === "app"
            ? `<a data-abre="${x.a}" href="#"><span class="i">${x.i}</span>${esc(x.t)}</a>`
            : `<a href="${base}index.html#/catalogo"><span class="i">${x.i}</span>${esc(x.t)}</a>`;
          const fuera = x.h.startsWith("http");
          const act = x.h === actual ? ' aria-current="page" class="act"' : "";
          return `<a href="${ruta(x.h)}"${act}${fuera ? ' rel="noopener"' : ""}><span class="i">${x.i}</span>${esc(x.t)}</a>`;
        }).join("")}
      </nav>
      <div class="side-pie">
        <button class="pie-btn" id="btnConfig" type="button">
          <span class="i">🎨</span><span>Preferencias</span>
        </button>
        <button class="cuenta-btn" id="authbtn" type="button" hidden>
          <span class="ava" id="avaChico">··</span>
          <span class="quien">
            <b id="authmailTxt">Entrar</b>
            <small id="authsubTxt">Guardá tus combinaciones</small>
          </span>
        </button>
      </div>`;

    $("barra").innerHTML = `
      <button class="hamb" id="hamb" type="button" aria-label="Abrir el menú" aria-expanded="false">☰</button>
      <b id="barraTitulo">${esc(opciones.titulo || "Inicio")}</b>
      <div class="barra-acciones">
        <button class="tbtn" id="theme" type="button" aria-label="Cambiar a tema claro" title="Cambiar tema">◐</button>
        <button class="avatar" id="avatar" type="button" aria-label="Tu perfil" title="Tu perfil">··</button>
      </div>`;

    // Primer pintado con lo que haya en el navegador: en las páginas de
    // contenido no hay sesión que avise, y el avatar quedaría en "··".
    let local = {};
    try { local = JSON.parse(localStorage.getItem("sdd-perfil")) || {}; } catch { /* nada */ }
    pintarCuenta(null, local);
  }

  /* Refresca avatar e identidad cuando cambia la sesión. */
  function pintarCuenta(usuario, perfil){
    // Con nombre cargado se muestran las iniciales aunque no haya cuenta:
    // alguien que se tomó el trabajo de escribirlo espera verlo.
    const nombre = perfil?.nombre?.trim() || "";
    const conIdentidad = Boolean(usuario || nombre);
    const ini = iniciales(usuario, perfil);
    const av = $("avatar"), chico = $("avaChico"), btn = $("authbtn");
    const linea1 = $("authmailTxt"), linea2 = $("authsubTxt");

    if (av){
      av.textContent = conIdentidad ? ini : "👤";
      av.classList.toggle("anon", !conIdentidad);
      av.title = usuario ? `${usuario.email} · tu perfil` : "Tu perfil (sin cuenta)";
    }
    if (chico){ chico.textContent = conIdentidad ? ini : "＋"; chico.classList.toggle("anon", !usuario); }

    if (btn){
      btn.hidden = false;
      btn.classList.toggle("dentro", Boolean(usuario));
      // Un mail largo no entra en 246px: arriba va lo corto y legible,
      // y el mail completo queda en el title y en la vista de perfil.
      btn.title = usuario ? usuario.email : "Entrar o crear tu cuenta";
    }
    if (linea1) linea1.textContent = usuario ? (nombre || usuario.email.split("@")[0]) : (nombre || "Entrar");
    if (linea2) linea2.textContent = usuario ? "Ver mi perfil"
      : (nombre ? "Sin cuenta · tocá para entrar" : "Guardá tus combinaciones");
  }

  return {montar, pintarCuenta, iniciales};
})();
