/* Onboarding en 4 pasos, como página (/web/preferencias, 0.34).
 *
 * Hasta 0.33 era un <dialog> modal que se abría solo al cargar. Con el
 * portón puesto, los dos se tapaban entre sí y no se podía tocar ninguno
 * (ADR-014). Ahora es una vista más: no bloquea nada y se puede saltar.
 *
 * Cuatro preguntas, no diez: cada pantalla que se agrega antes de dejar a
 * alguien usar la herramienta pierde gente. Todas tienen una opción "no sé",
 * porque quien no sabe es justamente el público al que apunta R23 — y
 * obligarlo a elegir algo que no entiende es peor que no preguntarle.
 *
 * Funciona con cuenta y sin cuenta: si hay sesión viaja a Supabase, si no
 * queda en localStorage. Igual que todo lo demás.
 */
const Perfil = (() => {
  const CLAVE = "sdd-perfil";
  const base = () => ({nivel: "", interes: "", perfil_sdd: "", agente: "", nombre: "", onboarding: false});
  let p = base();
  let paso = 0;
  let alTerminar = null;
  let volverA = null;   // vista a la que se vuelve al terminar (p. ej. el perfil)

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

  const PASOS = [
    {
      campo: "nivel",
      titulo: "¿Tenés experiencia programando?",
      ayuda: "De esto depende cómo te va a hablar tu agente. No hay respuesta mejor que otra.",
      opciones: [
        {v: "NOVATO", t: "No, o muy poca", d: "El agente activa R23: piensa tres veces antes de cada paso con consecuencias, te explica todo en criollo y va de a uno."},
        {v: "PRO", t: "Sí, programo", d: "Va al grano, sin explicar lo básico."}
      ]
    },
    {
      campo: "interes",
      titulo: "¿Qué querés construir?",
      ayuda: "Para dejarte el combinador precargado. Después lo cambiás cuando quieras.",
      opciones: [
        {v: "webapp", t: "Una web o aplicación", d: "Front, back y base de datos."},
        {v: "landing", t: "Una página para un negocio", d: "Que explique lo que hacés y deje un contacto."},
        {v: "proceso", t: "Automatizar algo repetitivo", d: "Un proceso que te ahorre tiempo todos los días."},
        {v: "chatbot", t: "Algo con IA adentro", d: "Chatbot, asistente, o IA como parte del producto."},
        {v: "", t: "Todavía no sé", d: "Perfecto. Mirá el catálogo y decidís después."}
      ]
    },
    {
      campo: "perfil_sdd",
      titulo: "¿Cuánto control querés tener?",
      ayuda: "Se puede cambiar en cualquier momento, incluso en mitad de un proyecto.",
      opciones: [
        {v: "ESTRICTO", t: "Que me pida permiso", d: "Nada se commitea sin tu OK. Es el default, y lo recomendado para arrancar."},
        {v: "CONFIANZA", t: "Que avance solo", d: "El agente commitea sin preguntar. Más rápido, pero mirás menos lo que hace."}
      ]
    },
    {
      campo: "agente",
      titulo: "¿Con qué agente de IA trabajás?",
      ayuda: "Para decirte qué archivo espejo te conviene tener en el repo (regla R22).",
      opciones: [
        {v: "claude", t: "Claude", d: "Usa CLAUDE.md."},
        {v: "codex", t: "Codex / ChatGPT", d: "Usa AGENTS.md."},
        {v: "cursor", t: "Cursor", d: "Usa .cursor/rules/."},
        {v: "copilot", t: "GitHub Copilot", d: "Usa copilot-instructions.md."},
        {v: "otro", t: "Otro, o varios", d: "Se generan todos los espejos: no molestan y cualquier agente encuentra el SDD."}
      ]
    }
  ];

  /* ---------------- guardar ---------------- */

  const local = () => { try { return {...base(), ...JSON.parse(localStorage.getItem(CLAVE))}; } catch { return base(); } };

  async function guardar(){
    localStorage.setItem(CLAVE, JSON.stringify(p));
    if (Sesion.usuario()) await Sesion.guardarPerfil(p).catch(() => {});
  }

  /* ---------------- pintar ---------------- */

  function pintar(){
    const s = PASOS[paso];
    $("obTitulo").textContent = s.titulo;
    $("obAyuda").textContent = s.ayuda;
    $("obPaso").textContent = `Paso ${paso + 1} de ${PASOS.length}`;
    $("obBarra").style.width = `${(paso) / PASOS.length * 100}%`;
    $("obOpciones").innerHTML = s.opciones.map(o => `
      <button class="ob-op${p[s.campo] === o.v ? " sel" : ""}" type="button" data-v="${esc(o.v)}">
        <b>${esc(o.t)}</b><small>${esc(o.d)}</small>
      </button>`).join("");
    $("obAtras").hidden = paso === 0;
    // «Prefiero no decir» está en los cuatro pasos (0.34.1): en el último,
    // deja la respuesta vacía y termina, igual que en los otros.
  }

  async function elegir(valor){
    p[PASOS[paso].campo] = valor;
    if (paso < PASOS.length - 1){ paso++; pintar(); }
    else await terminar();
  }

  async function terminar(){
    // Solo la primera vez: es la foto de quien llega, no de cada edicion.
    // Sin usuario, sin IP: entra al mismo contador anonimo que el resto.
    const primeraVez = !p.onboarding;
    p.onboarding = true;
    await guardar();
    if (primeraVez && typeof Sesion !== "undefined"){
      Sesion.contar("perfil", "nivel:" + (p.nivel || "nc"));
      Sesion.contar("perfil", "interes:" + (p.interes || "nc"));
      Sesion.contar("perfil", "agente:" + (p.agente || "nc"));
    }
    if (alTerminar) alTerminar(p);
    const destino = volverA || (p.interes ? "combinador" : "inicio");
    volverA = null;
    if (typeof App !== "undefined") App.ir(destino);
  }

  /* ---------------- API ---------------- */

  /* Lleva a /web/preferencias desde el primer paso. */
  function abrir(cuandoTermine, volver = null){
    alTerminar = cuandoTermine || alTerminar;
    volverA = volver;
    paso = 0;
    if (typeof App !== "undefined") App.ir("preferencias");
    else mostrar();
  }

  /* Lo que se pinta al entrar a la vista (también recargando la ruta). */
  function mostrar(){
    pintar();
    if ($("prefNombre")) $("prefNombre").value = p.nombre || "";
  }

  async function iniciar(cuandoTermine){
    p = local();
    if (Sesion.usuario()){
      const remoto = await Sesion.traerPerfil().catch(() => null);
      // lo que está en la cuenta manda sobre lo del navegador
      if (remoto?.onboarding) p = {...p, ...remoto, onboarding: true};
      else if (p.onboarding) await guardar();   // lo tenía local y ahora tiene cuenta
    }
    alTerminar = cuandoTermine;
    if (p.onboarding){ if (cuandoTermine) cuandoTermine(p); }
    // Primera visita sin onboarding que entra por Inicio: va a preferencias,
    // reemplazando la URL (sin sumar un paso al «atrás»). Un link profundo,
    // como un combinador compartido, se respeta: nada se bloquea.
    else if (typeof App !== "undefined" && App.vistaActual() === "inicio" && !location.search){
      history.replaceState(null, "", Rutas.url("preferencias", "", location.pathname));
      App.ir("preferencias", false);
    }
    if ($("obOpciones") && App.vistaActual?.() === "preferencias") mostrar();
  }

  /* Los listeners van al cargar: la vista puede abrirse antes de que
     iniciar() termine de traer el perfil de la cuenta. */
  function enganchar(){
    if (!$("obOpciones")) return;
    $("obOpciones").addEventListener("click", e => {
      const b = e.target.closest("[data-v]");
      if (b) elegir(b.dataset.v);
    });
    $("obAtras").onclick = () => { if (paso > 0){ paso--; pintar(); } };
    $("obSaltar").onclick = () => { if (paso < PASOS.length - 1){ paso++; pintar(); } else terminar(); };
    $("obCerrar").onclick = () => terminar();
    let t = null;
    $("prefNombre").addEventListener("input", e => {
      p.nombre = e.target.value.slice(0, 60);
      clearTimeout(t);
      t = setTimeout(async () => {
        await guardar();
        if (typeof Shell !== "undefined") Shell.pintarCuenta(Sesion.usuario(), p);
      }, 350);
    });
  }
  p = local();
  enganchar();

  return {iniciar, abrir, mostrar, datos: () => p, guardar, PASOS};
})();
