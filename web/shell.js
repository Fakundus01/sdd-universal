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
  let pagina = "app";

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
    const activa = pagina === "app" ? "" : "";
    const href = pagina === "app" ? `#/${x.v}` : `index.html#/${x.v}`;
    return `<a data-vista="${x.v}" href="${href}"><span class="i">${x.i}</span>${esc(x.t)}</a>`;
  }

  function montar(opciones = {}){
    pagina = opciones.pagina || "app";
    const actual = opciones.actual || "";

    $("side").innerHTML = `
      <div class="side-marca">
        <a class="brand" href="${pagina === "app" ? "#/inicio" : "index.html"}">
          <span class="mark"><span></span></span>SDD Hub</a>
        <button class="side-cerrar" id="sideCerrar" type="button" aria-label="Cerrar el menú">✕</button>
      </div>
      <nav class="side-nav">
        ${VISTAS.map(x => {
          if (x.g) return `<p class="side-grupo">${esc(x.g)}</p>`;
          if (x.v) return linkVista(x);
          if (x.a) return pagina === "app"
            ? `<a data-abre="${x.a}" href="#"><span class="i">${x.i}</span>${esc(x.t)}</a>`
            : `<a href="index.html#/${x.a === "tech" ? "catalogo" : "catalogo"}"><span class="i">${x.i}</span>${esc(x.t)}</a>`;
          const fuera = x.h.startsWith("http");
          const act = x.h === actual ? ' aria-current="page" class="act"' : "";
          return `<a href="${x.h}"${act}${fuera ? ' rel="noopener"' : ""}><span class="i">${x.i}</span>${esc(x.t)}</a>`;
        }).join("")}
      </nav>
      <div class="side-pie">
        <button class="pie-btn" id="btnConfig" type="button">
          <span class="i">🎨</span><span>Preferencias</span>
        </button>
        <button class="pie-btn cuenta" id="authbtn" type="button" hidden>
          <span class="ava" id="avaChico">··</span><span class="mail" id="authmailTxt">Entrar</span>
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
    const conIdentidad = Boolean(usuario || perfil?.nombre?.trim());
    const ini = iniciales(usuario, perfil);
    const av = $("avatar"), chico = $("avaChico"), mail = $("authmailTxt"), btn = $("authbtn");
    if (av){
      av.textContent = conIdentidad ? ini : "👤";
      av.classList.toggle("anon", !conIdentidad);
      av.title = usuario ? `${usuario.email} · tu perfil` : "Tu perfil (sin cuenta)";
    }
    if (btn) btn.hidden = false;
    if (chico){ chico.textContent = conIdentidad ? ini : "＋"; chico.classList.toggle("anon", !usuario); }
    if (mail) mail.textContent = usuario ? usuario.email
      : (perfil?.nombre?.trim() || "Entrar");
  }

  return {montar, pintarCuenta, iniciales};
})();
