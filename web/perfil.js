/* Onboarding en 4 pasos y panel de configuración.
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
  const base = () => ({nivel: "", interes: "", perfil_sdd: "", agente: "", onboarding: false});
  let p = base();
  let paso = 0;
  let alTerminar = null;

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
    $("obSaltar").hidden = paso === PASOS.length - 1;
  }

  async function elegir(valor){
    p[PASOS[paso].campo] = valor;
    if (paso < PASOS.length - 1){ paso++; pintar(); }
    else await terminar();
  }

  async function terminar(){
    p.onboarding = true;
    await guardar();
    $("obdlg").close();
    if (alTerminar) alTerminar(p);
  }

  /* ---------------- API ---------------- */

  function abrir(cuandoTermine){
    alTerminar = cuandoTermine;
    paso = 0; pintar();
    $("obdlg").showModal();
  }

  async function iniciar(cuandoTermine){
    p = local();
    if (Sesion.usuario()){
      const remoto = await Sesion.traerPerfil().catch(() => null);
      // lo que está en la cuenta manda sobre lo del navegador
      if (remoto?.onboarding) p = {...p, ...remoto, onboarding: true};
      else if (p.onboarding) await guardar();   // lo tenía local y ahora tiene cuenta
    }
    if (!p.onboarding) abrir(cuandoTermine);
    else if (cuandoTermine) cuandoTermine(p);

    $("obOpciones").addEventListener("click", e => {
      const b = e.target.closest("[data-v]");
      if (b) elegir(b.dataset.v);
    });
    $("obAtras").onclick = () => { if (paso > 0){ paso--; pintar(); } };
    $("obSaltar").onclick = () => { if (paso < PASOS.length - 1){ paso++; pintar(); } else terminar(); };
    $("obCerrar").onclick = () => terminar();
  }

  return {iniciar, abrir, datos: () => p, guardar, PASOS};
})();
