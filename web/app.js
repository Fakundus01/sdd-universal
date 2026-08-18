/* Shell de la aplicación: ruteo por vistas, cajón lateral y preferencias.
 *
 * El ruteo va por hash (#/catalogo) y no por rutas reales: sin servidor que
 * las resuelva, una URL como /web/catalogo daría 404 al recargar. Con hash,
 * el link se puede compartir y el botón "atrás" funciona.
 */
const App = (() => {
  const $ = id => document.getElementById(id);
  const CLAVE = "sdd-prefs";

  const TEMAS = [
    {id: "dark",     n: "Oscuro",         c: ["#0b0f1f", "#151b30", "#7b74f5"]},
    {id: "light",    n: "Claro",          c: ["#f5f6fa", "#ffffff", "#4f46e5"]},
    {id: "noche",    n: "Medianoche",     c: ["#05060d", "#0e1120", "#5b8cff"]},
    {id: "bosque",   n: "Bosque",         c: ["#0c1613", "#132420", "#4ade80"]},
    {id: "jungla",   n: "Jungla",         c: ["#08160e", "#102619", "#7be26a"], vivo: true},
    {id: "oceano",   n: "Océano",         c: ["#04121f", "#0a2036", "#3fc5ff"], vivo: true},
    {id: "desierto", n: "Desierto",       c: ["#190f08", "#2b1c10", "#ffb45c"], vivo: true},
    {id: "contraste",n: "Alto contraste", c: ["#000000", "#141414", "#ffd400"]},
    {id: "sepia",    n: "Sepia",          c: ["#f4ecd8", "#fffaf0", "#8a5a2b"]}
  ];

  const base = () => ({tema: "dark", animaciones: true, sonido: false, vistas: {},
                       texto: "normal", vivo: true, logo: "trazos",
                       fuerza: "media", vel: "normal", ancho: "normal", acento: ""});
  let prefs = base();

  const leer = () => { try { return {...base(), ...JSON.parse(localStorage.getItem(CLAVE))}; } catch { return base(); } };
  const guardar = () => {
    let disco = {};
    try { disco = JSON.parse(localStorage.getItem(CLAVE)) || {}; } catch { /* nada */ }
    // sidebarMini lo administra Shell: no lo pisamos con nuestro snapshot.
    localStorage.setItem(CLAVE, JSON.stringify({...disco, ...prefs, sidebarMini: disco.sidebarMini}));
  };

  /* ---------------- sonido ---------------- */
  // Generado con WebAudio: un archivo de sonido serían kilobytes y una
  // dependencia más para un clic de 60 ms.
  let audio = null;
  function sonar(freq = 660, ms = 45){
    if (!prefs.sonido) return;
    try {
      audio = audio || new (window.AudioContext || window.webkitAudioContext)();
      const osc = audio.createOscillator(), vol = audio.createGain();
      osc.type = "sine"; osc.frequency.value = freq;
      vol.gain.setValueAtTime(0.05, audio.currentTime);
      vol.gain.exponentialRampToValueAtTime(0.0001, audio.currentTime + ms / 1000);
      osc.connect(vol).connect(audio.destination);
      osc.start(); osc.stop(audio.currentTime + ms / 1000);
    } catch { /* sin audio disponible: no pasa nada */ }
  }

  /* ---------------- aplicar preferencias ---------------- */
  function aplicar(){
    Tema.aplicar(prefs.tema, false);
    // El tema vive en sdd-theme: es lo que leen guia, demo y tablero al cargar.
    // Sin esta línea había dos fuentes de verdad y las otras páginas quedaban
    // en el tema viejo — el bug reportado.
    localStorage.setItem("sdd-theme", prefs.tema);
    document.documentElement.dataset.anim = prefs.animaciones ? "on" : "off";
    document.documentElement.dataset.vivo = prefs.vivo ? "on" : "off";
    if (prefs.texto && prefs.texto !== "normal") document.documentElement.dataset.fs = prefs.texto;
    else delete document.documentElement.dataset.fs;
    const marca = (k, v, def) => { if (v && v !== def) document.documentElement.dataset[k] = v;
                                   else delete document.documentElement.dataset[k]; };
    marca("vel", prefs.vel, "normal");
    marca("fuerza", prefs.fuerza, "media");
    marca("ancho", prefs.ancho, "normal");
    Tema.acento(prefs.acento || "");
    for (const [v, oculta] of Object.entries(prefs.vistas)){
      const link = document.querySelector(`.side-nav a[data-vista="${v}"]`);
      if (link) link.hidden = Boolean(oculta);
    }
  }

  /* ---------------- ruteo ---------------- */
  const TITULOS = {inicio: "Inicio", catalogo: "Catálogo", combinador: "Combinador",
                   tecnologias: "Tecnologías", reglas: "Mis reglas", manuales: "Manuales",
                   perfil: "Mi perfil", comunidad: "Feedback", configuracion: "Configuración"};

  function ir(vista, empujar = true){
    if (!TITULOS[vista]) vista = "inicio";
    document.querySelectorAll(".vista").forEach(s => s.hidden = s.dataset.vista !== vista);
    document.querySelectorAll(".side-nav a[data-vista]").forEach(a =>
      a.classList.toggle("act", a.dataset.vista === vista));
    $("barraTitulo").textContent = TITULOS[vista];
    if (vista === "perfil" && typeof PerfilVista !== "undefined") PerfilVista.refrescar();
    if (vista === "configuracion" && typeof ConfigVista !== "undefined") ConfigVista.abrir();
    if (typeof VISTA_HOOKS !== "undefined") VISTA_HOOKS[vista]?.();
    if (empujar && location.hash !== "#/" + vista) history.pushState(null, "", "#/" + vista);
    cerrarCajon();
    scrollTo({top: 0, behavior: prefs.animaciones ? "smooth" : "auto"});
    if (typeof Sesion !== "undefined") Sesion.contar("visita", "#/" + vista);
  }

  const vistaDeHash = () => (location.hash.replace("#/", "") || "inicio").split("?")[0];

  /* ---------------- cajón lateral ---------------- */
  function abrirCajon(){
    $("side").classList.add("abierta"); $("sideFondo").hidden = false;
    $("hamb").setAttribute("aria-expanded", "true");
  }
  function cerrarCajon(){
    $("side").classList.remove("abierta"); $("sideFondo").hidden = true;
    $("hamb").setAttribute("aria-expanded", "false");
  }

  /* ---------------- panel de preferencias ---------------- */
  function pintarConfig(){
    $("cfgTemas").innerHTML = TEMAS.map(t => `
      <button class="tema-op${prefs.tema === t.id ? " sel" : ""}" type="button" data-tema="${t.id}">
        <span class="tema-muestra">${t.c.map(c => `<i style="background:${c}"></i>`).join("")}</span>
        <b>${t.n}</b>
      </button>`).join("");
    $("cfgAnim").checked = prefs.animaciones;
    $("cfgSonido").checked = prefs.sonido;
    $("cfgVivo").checked = prefs.vivo;
    const FS = [["chico","Chico",".8rem"],["normal","Normal","1rem"],["grande","Grande","1.18rem"],["maxi","Muy grande","1.35rem"]];
    $("cfgTexto").innerHTML = FS.map(([v, t, tam]) => `
      <button class="fs-op${(prefs.texto || "normal") === v ? " sel" : ""}" type="button" data-fs-op="${v}">
        <span class="aa" style="font-size:${tam}">Aa</span><small>${t}</small>
      </button>`).join("");
    const ops = (id, lista, actual) => { $(id).innerHTML = lista.map(([v, t]) => `
      <button class="fs-op${actual === v ? " sel" : ""}" type="button" data-op="${id}" data-v="${v}">
        <small>${t}</small></button>`).join(""); };
    ops("cfgFuerza", [["sutil","Sutil"],["media","Media"],["alta","Alta"]], prefs.fuerza || "media");
    ops("cfgVel", [["tranquila","Tranquila"],["normal","Normal"],["rapida","Rápida"]], prefs.vel || "normal");
    ops("cfgAncho", [["angosto","Angosto"],["normal","Normal"],["amplio","Amplio"]], prefs.ancho || "normal");
    const PRESETS = ["#7b74f5","#4ade80","#3fc5ff","#ff7fae","#ffb45c","#f5e356"];
    $("cfgAcento").innerHTML = `
      <button class="acento-dot defecto${!prefs.acento ? " sel" : ""}" type="button" data-acento=""
        title="El del tema" aria-label="Color de acento del tema">✓</button>` +
      PRESETS.map(c => `
      <button class="acento-dot${prefs.acento === c ? " sel" : ""}" type="button" data-acento="${c}"
        style="background:${c}" aria-label="Acento ${c}"></button>`).join("") + `
      <label class="acento-pico" title="Elegir cualquier color">🎨
        <input type="color" id="cfgAcentoLibre" value="${prefs.acento || "#7b74f5"}"></label>`;
    $("cfgLogos").innerHTML = Object.entries(Shell.LOGOS).map(([v, l]) => `
      <button class="logo-op${(prefs.logo || "trazos") === v ? " sel" : ""}" type="button" data-logo="${v}">
        ${Shell.logoHTML(v)}<b>${l.n}</b><small>${l.d}</small>
      </button>`).join("");
    $("cfgVistas").innerHTML = Object.entries(TITULOS)
      .filter(([v]) => v !== "inicio" && v !== "perfil" && v !== "configuracion").map(([v, n]) => `
      <div class="cfg-fila">
        <div class="txt"><b>${n}</b></div>
        <label class="sw"><input type="checkbox" data-vista-visible="${v}"
          ${prefs.vistas[v] ? "" : "checked"}><span class="pista"></span></label>
      </div>`).join("");
  }

  function iniciar(){
    prefs = leer();
    aplicar();

    // navegación
    document.querySelectorAll(".side-nav a[data-vista]").forEach(a => {
      a.onclick = e => { e.preventDefault(); sonar(); ir(a.dataset.vista); };
    });
    document.querySelectorAll(".side-nav a[data-abre]").forEach(a => {
      a.onclick = e => {
        e.preventDefault(); sonar(); cerrarCajon();
        ({tech: () => openTech(), reglas: () => ReglasUI.abrir(),
          perfil: () => Perfil.abrir(window.aplicarPerfil),
          config: () => ir("configuracion")})[a.dataset.abre]?.();
      };
    });
    $("btnConfig").onclick = () => { sonar(); ir("configuracion"); };
    $("barraNav").addEventListener("click", e => {
      const a = e.target.closest("a[data-vista]");
      if (a){ e.preventDefault(); sonar(); ir(a.dataset.vista); }
    });
    $("avatar").onclick = () => { sonar(); ir("perfil"); };
    $("hamb").onclick = () => $("side").classList.contains("abierta") ? cerrarCajon() : abrirCajon();
    $("sideCerrar").onclick = cerrarCajon;
    $("sideFondo").onclick = cerrarCajon;
    addEventListener("popstate", () => ir(vistaDeHash(), false));
    addEventListener("keydown", e => { if (e.key === "Escape") cerrarCajon(); });

    // preferencias
    $("cfgTemas").addEventListener("click", e => {
      const b = e.target.closest("[data-tema]"); if (!b) return;
      prefs.tema = b.dataset.tema; guardar(); aplicar(); pintarConfig(); sonar(780);
      if (typeof Sesion !== "undefined") Sesion.guardarTema(prefs.tema === "light" ? "light" : "dark");
    });
    $("cfgAnim").onchange = e => { prefs.animaciones = e.target.checked; guardar(); aplicar(); };
    $("cfgSonido").onchange = e => { prefs.sonido = e.target.checked; guardar(); if (prefs.sonido) sonar(); };
    $("cfgVivo").onchange = e => { prefs.vivo = e.target.checked; guardar(); aplicar(); };
    $("cfgTexto").addEventListener("click", e => {
      const b = e.target.closest("[data-fs-op]"); if (!b) return;
      prefs.texto = b.dataset.fsOp; guardar(); aplicar(); pintarConfig();
    });
    const MAPA_OP = {cfgFuerza: "fuerza", cfgVel: "vel", cfgAncho: "ancho"};
    ["cfgFuerza", "cfgVel", "cfgAncho"].forEach(id => $(id).addEventListener("click", e => {
      const b = e.target.closest("[data-v]"); if (!b) return;
      prefs[MAPA_OP[id]] = b.dataset.v; guardar(); aplicar(); pintarConfig();
    }));
    $("cfgAcento").addEventListener("click", e => {
      const d = e.target.closest("[data-acento]"); if (!d) return;
      prefs.acento = d.dataset.acento; guardar(); aplicar(); pintarConfig(); sonar(740);
    });
    $("cfgAcento").addEventListener("input", e => {
      if (e.target.id !== "cfgAcentoLibre") return;
      prefs.acento = e.target.value; guardar(); aplicar();
      // sin repintar en vivo: el picker sigue abierto mientras se elige
      document.querySelectorAll("#cfgAcento .sel").forEach(x => x.classList.remove("sel"));
    });
    $("cfgLogos").addEventListener("click", e => {
      const b = e.target.closest("[data-logo]"); if (!b) return;
      prefs.logo = b.dataset.logo; guardar(); Shell.setLogo(prefs.logo); pintarConfig(); sonar(700);
    });
    $("cfgVistas").addEventListener("change", e => {
      const cb = e.target.closest("[data-vista-visible]"); if (!cb) return;
      prefs.vistas[cb.dataset.vistaVisible] = !cb.checked;
      guardar(); aplicar();
      if (!cb.checked && vistaDeHash() === cb.dataset.vistaVisible) ir("inicio");
    });
    $("cfgReset").onclick = () => {
      if (!confirm("¿Volver todas las preferencias a como venían?")) return;
      prefs = base(); guardar(); aplicar(); pintarConfig();
    };
    ir(vistaDeHash(), false);
  }

  return {iniciar, ir, sonar, pintarConfig, prefs: () => prefs, TEMAS};
})();
