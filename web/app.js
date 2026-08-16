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
    {id: "contraste",n: "Alto contraste", c: ["#000000", "#141414", "#ffd400"]},
    {id: "sepia",    n: "Sepia",          c: ["#f4ecd8", "#fffaf0", "#8a5a2b"]}
  ];

  const base = () => ({tema: "dark", animaciones: true, sonido: false, vistas: {}});
  let prefs = base();

  const leer = () => { try { return {...base(), ...JSON.parse(localStorage.getItem(CLAVE))}; } catch { return base(); } };
  const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(prefs));

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
    Tema.aplicar(prefs.tema === "light" ? "light" : prefs.tema, false);
    document.documentElement.dataset.anim = prefs.animaciones ? "on" : "off";
    for (const [v, oculta] of Object.entries(prefs.vistas)){
      const link = document.querySelector(`.side-nav a[data-vista="${v}"]`);
      if (link) link.hidden = Boolean(oculta);
    }
  }

  /* ---------------- ruteo ---------------- */
  const TITULOS = {inicio: "Inicio", catalogo: "Catálogo", combinador: "Combinador", comunidad: "Feedback"};

  function ir(vista, empujar = true){
    if (!TITULOS[vista]) vista = "inicio";
    document.querySelectorAll(".vista").forEach(s => s.hidden = s.dataset.vista !== vista);
    document.querySelectorAll(".side-nav a[data-vista]").forEach(a =>
      a.classList.toggle("act", a.dataset.vista === vista));
    $("barraTitulo").textContent = TITULOS[vista];
    if (empujar && location.hash !== "#/" + vista) history.pushState(null, "", "#/" + vista);
    cerrarCajon();
    scrollTo({top: 0, behavior: prefs.animaciones ? "smooth" : "auto"});
    if (window.Sesion) Sesion.contar("visita", "#/" + vista);
  }

  const vistaDeHash = () => (location.hash.replace("#/", "") || "inicio");

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
    $("cfgVistas").innerHTML = Object.entries(TITULOS).filter(([v]) => v !== "inicio").map(([v, n]) => `
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
          config: () => { pintarConfig(); $("cfgdlg").showModal(); }})[a.dataset.abre]();
      };
    });
    $("hamb").onclick = () => $("side").classList.contains("abierta") ? cerrarCajon() : abrirCajon();
    $("sideCerrar").onclick = cerrarCajon;
    $("sideFondo").onclick = cerrarCajon;
    addEventListener("popstate", () => ir(vistaDeHash(), false));
    addEventListener("keydown", e => { if (e.key === "Escape") cerrarCajon(); });

    // preferencias
    $("cfgTemas").addEventListener("click", e => {
      const b = e.target.closest("[data-tema]"); if (!b) return;
      prefs.tema = b.dataset.tema; guardar(); aplicar(); pintarConfig(); sonar(780);
      if (window.Sesion) Sesion.guardarTema(prefs.tema === "light" ? "light" : "dark");
    });
    $("cfgAnim").onchange = e => { prefs.animaciones = e.target.checked; guardar(); aplicar(); };
    $("cfgSonido").onchange = e => { prefs.sonido = e.target.checked; guardar(); if (prefs.sonido) sonar(); };
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
    $("cfgx").onclick = () => $("cfgdlg").close();
    $("cfgdlg").addEventListener("click", e => { if (e.target === $("cfgdlg")) $("cfgdlg").close(); });

    ir(vistaDeHash(), false);
  }

  return {iniciar, ir, sonar, prefs: () => prefs, TEMAS};
})();
