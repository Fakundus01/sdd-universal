/* Shell compartido: barra lateral y barra superior, iguales en todas las páginas.
 *
 * Se renderiza desde JS y no se copia en cada HTML: con cuatro páginas ya eran
 * cuatro lugares donde tocar cada vez que cambia un link, y el último siempre
 * se olvida. Sin build, la única forma de tener una sola fuente es esta.
 *
 * También es el dueño del estado "lateral comprimida" (se arrastra o se toca):
 * cuando la barra se comprime, sus accesos pasan a la barra superior.
 */
const Shell = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

  // pagina: "app" (index, con vistas) | "contenido" (guia, demo, tablero)
  // base: prefijo para las páginas que no viven en web/ (el tablero)
  let pagina = "app", base = "";

  const VISTAS = [
    {g: "Empezar"},
    {v: "inicio",     i: "🏠", t: "Inicio"},
    {v: "catalogo",   i: "📦", t: "Catálogo"},
    {v: "combinador", i: "🧩", t: "Combinador"},
    {g: "Tu espacio"},
    {v: "perfil",     i: "👤", t: "Mi perfil"},
    {a: "tech",       i: "🛠️", t: "Tecnologías"},
    {a: "reglas",     i: "📐", t: "Mis reglas"},
    {g: "Aprender"},
    {h: "guia.html",  i: "📖", t: "Guía"},
    {h: "demo.html",  i: "🔬", t: "Demo con/sin SDD"},
    {h: "../sdd-universal-tablero.html", i: "🗺️", t: "Tablero"},
    {g: "Comunidad"},
    {v: "comunidad",  i: "💬", t: "Feedback"},
    {h: "https://github.com/Fakundus01/sdd-universal", i: "🐙", t: "GitHub"}
  ];

  /* ---------------- preferencias (comparte sdd-prefs con App) ---------------- */
  const leerPrefs = () => { try { return JSON.parse(localStorage.getItem("sdd-prefs")) || {}; } catch { return {}; } };
  const guardarPref = (k, v) => {
    const p = leerPrefs(); p[k] = v;
    localStorage.setItem("sdd-prefs", JSON.stringify(p));
  };
  const esEscritorio = () => matchMedia("(min-width:901px)").matches;

  /* ---------------- logo animado ---------------- */
  const LOGOS = {
    trazos: {n: "Trazos", d: "Las líneas de la spec se escriben solas"},
    orbita: {n: "Órbita", d: "El hub con su satélite girando"},
    pulso:  {n: "Pulso",  d: "El núcleo late, tranquilo"}
  };

  function logoHTML(v = "trazos"){
    if (v === "orbita") return `<svg class="logo l-orbita" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <rect x="3" y="3" width="26" height="26" rx="9" fill="none" stroke="var(--accent)" stroke-width="2.6"/>
      <rect class="nucleo" x="11.5" y="11.5" width="9" height="9" rx="3.2" fill="var(--accent)"/>
      <g class="orbe"><circle cx="16" cy="3" r="2.7" fill="var(--accent)"/></g></svg>`;
    if (v === "pulso") return `<svg class="logo l-pulso" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <rect class="onda" x="2" y="2" width="28" height="28" rx="10" fill="none" stroke="var(--accent)" stroke-width="2"/>
      <rect x="6.5" y="6.5" width="19" height="19" rx="7" fill="var(--accent)"/>
      <rect x="11" y="12.2" width="10" height="2.4" rx="1.2" fill="var(--on-accent)"/>
      <rect x="11" y="17.4" width="7" height="2.4" rx="1.2" fill="var(--on-accent)"/></svg>`;
    return `<svg class="logo l-trazos" viewBox="0 0 32 32" width="26" height="26" aria-hidden="true">
      <rect x="1.5" y="1.5" width="29" height="29" rx="9" fill="var(--accent)"/>
      <rect class="ln a" x="8" y="9.6" width="16" height="2.9" rx="1.45" fill="var(--on-accent)"/>
      <rect class="ln b" x="8" y="14.9" width="16" height="2.9" rx="1.45" fill="var(--on-accent)"/>
      <rect class="ln c" x="8" y="20.2" width="10" height="2.9" rx="1.45" fill="var(--on-accent)"/>
      <rect class="caret" x="20.4" y="20.2" width="3" height="2.9" rx="1" fill="var(--on-accent)"/></svg>`;
  }

  function setLogo(v){
    guardarPref("logo", v);
    document.querySelectorAll(".brand .lg").forEach(n => n.innerHTML = logoHTML(v));
  }

  /* ---------------- iniciales del avatar ---------------- */
  function iniciales(usuario, perfil){
    const nombre = (perfil?.nombre || "").trim();
    if (nombre){
      const p = nombre.split(/\s+/).filter(Boolean);
      return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || nombre.slice(0, 2).toUpperCase();
    }
    const mail = usuario?.email || "";
    return mail ? mail.slice(0, 2).toUpperCase() : "··";
  }

  /* ---------------- montaje ---------------- */
  const hrefVista = v => pagina === "app" ? `#/${v}` : `${base}index.html#/${v}`;
  const ruta = h => h.startsWith("http") ? h
    : base && h.startsWith("../") ? h.slice(3)
    : base + h;

  function montar(opciones = {}){
    pagina = opciones.pagina || "app";
    base = opciones.base || "";
    const actual = opciones.actual || "";
    const prefs = leerPrefs();

    // Estas marcas viven acá y no en App porque TODAS las páginas las
    // necesitan al cargar: tema de texto, fondo vivo y lateral comprimida.
    if (prefs.texto && prefs.texto !== "normal") document.documentElement.dataset.fs = prefs.texto;
    document.documentElement.dataset.vivo = prefs.vivo === false ? "off" : "on";
    if (prefs.sidebarMini && esEscritorio()) document.documentElement.classList.add("side-mini");

    $("side").innerHTML = `
      <div class="side-marca">
        <a class="brand" href="${pagina === "app" ? "#/inicio" : base + "index.html"}">
          <span class="lg">${logoHTML(prefs.logo || "trazos")}</span><span class="btxt">SDD Hub</span></a>
        <button class="side-colapsar" id="sideColapsar" type="button" aria-label="Comprimir el menú" title="Comprimir el menú">⟨</button>
        <button class="side-cerrar" id="sideCerrar" type="button" aria-label="Cerrar el menú">✕</button>
      </div>
      <nav class="side-nav">
        ${VISTAS.map(x => {
          if (x.g) return `<p class="side-grupo">${esc(x.g)}</p>`;
          if (x.v) return `<a data-vista="${x.v}" href="${hrefVista(x.v)}"><span class="i">${x.i}</span>${esc(x.t)}</a>`;
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
          <span class="i">⚙️</span><span>Configuración</span>
        </button>
        <button class="cuenta-btn" id="authbtn" type="button" hidden>
          <span class="ava" id="avaChico">··</span>
          <span class="quien">
            <b id="authmailTxt">Entrar</b>
            <small id="authsubTxt">Guardá tus combinaciones</small>
          </span>
        </button>
      </div>
      <div class="side-asa" id="sideAsa" title="Arrastrá para comprimir el menú" aria-hidden="true"></div>`;

    // Cuando la lateral está comprimida, sus accesos viven acá arriba.
    const navMini = VISTAS.filter(x => x.v || x.h).map(x => {
      const href = x.v ? hrefVista(x.v) : ruta(x.h);
      const dv = x.v ? ` data-vista="${x.v}"` : "";
      return `<a${dv} href="${href}" title="${esc(x.t)}"><span>${x.i}</span></a>`;
    }).join("") + `<a data-vista="configuracion" href="${hrefVista("configuracion")}" title="Configuración"><span>⚙️</span></a>`;

    $("barra").innerHTML = `
      <button class="hamb" id="hamb" type="button" aria-label="Abrir el menú" aria-expanded="false">☰</button>
      <button class="hamb expandir" id="sideExpand" type="button" aria-label="Mostrar el menú" title="Mostrar el menú">❯</button>
      <b id="barraTitulo">${esc(opciones.titulo || "Inicio")}</b>
      <nav class="barra-nav" id="barraNav" aria-label="Navegación rápida">${navMini}</nav>
      <div class="barra-acciones">
        <button class="avatar" id="avatar" type="button" aria-label="Tu perfil" title="Tu perfil">··</button>
      </div>`;

    // Primer pintado con lo que haya en el navegador.
    let local = {};
    try { local = JSON.parse(localStorage.getItem("sdd-perfil")) || {}; } catch { /* nada */ }
    pintarCuenta(null, local);

    iniciarLateral();
  }

  /* ---------------- comprimir / expandir, con arrastre ---------------- */
  function setMini(v){
    if (!esEscritorio()) return;
    document.documentElement.classList.toggle("side-mini", v);
    guardarPref("sidebarMini", v);
  }

  function iniciarLateral(){
    $("sideColapsar").onclick = () => setMini(true);
    $("sideExpand").onclick = () => setMini(false);

    const side = $("side");

    // Arrastrar el borde derecho: soltás a la izquierda y se comprime.
    const asa = $("sideAsa");
    let drag = null;
    asa.addEventListener("pointerdown", e => {
      if (!esEscritorio()) return;
      drag = {x0: e.clientX, w0: side.getBoundingClientRect().width};
      side.classList.add("arrastrando");
      asa.setPointerCapture(e.pointerId);
    });
    asa.addEventListener("pointermove", e => {
      if (!drag) return;
      const w = Math.max(0, Math.min(246, drag.w0 + e.clientX - drag.x0));
      side.style.width = w + "px";
    });
    const soltarAsa = e => {
      if (!drag) return;
      const w = side.getBoundingClientRect().width;
      side.classList.remove("arrastrando");
      side.style.width = "";
      setMini(w < 140);
      drag = null;
      asa.releasePointerCapture?.(e.pointerId);
    };
    asa.addEventListener("pointerup", soltarAsa);
    asa.addEventListener("pointercancel", soltarAsa);

    // Comprimida: una tira en el borde izquierdo para arrastrarla de vuelta.
    if (!$("bordeAsa")){
      const tira = document.createElement("div");
      tira.id = "bordeAsa";
      tira.title = "Arrastrá para mostrar el menú";
      document.body.appendChild(tira);
      let d2 = null;
      tira.addEventListener("pointerdown", e => {
        if (!esEscritorio()) return;
        d2 = {x0: e.clientX};
        document.documentElement.classList.remove("side-mini");
        side.classList.add("arrastrando");
        side.style.width = "0px";
        tira.setPointerCapture(e.pointerId);
      });
      tira.addEventListener("pointermove", e => {
        if (!d2) return;
        side.style.width = Math.max(0, Math.min(246, e.clientX - d2.x0)) + "px";
      });
      const soltarTira = e => {
        if (!d2) return;
        const w = side.getBoundingClientRect().width;
        side.classList.remove("arrastrando");
        side.style.width = "";
        setMini(w < 120);
        d2 = null;
        tira.releasePointerCapture?.(e.pointerId);
      };
      tira.addEventListener("pointerup", soltarTira);
      tira.addEventListener("pointercancel", soltarTira);
    }
  }

  /* ---------------- cuenta ---------------- */
  function pintarCuenta(usuario, perfil){
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
      btn.title = usuario ? usuario.email : "Entrar o crear tu cuenta";
    }
    if (linea1) linea1.textContent = usuario ? (nombre || usuario.email.split("@")[0]) : (nombre || "Entrar");
    if (linea2) linea2.textContent = usuario ? "Ver mi perfil"
      : (nombre ? "Sin cuenta · tocá para entrar" : "Guardá tus combinaciones");
  }

  return {montar, pintarCuenta, iniciales, logoHTML, setLogo, setMini, LOGOS};
})();
