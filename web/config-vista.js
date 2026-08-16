/* La vista Configuración: pestañas y, para el admin, el panel de números.
 *
 * El panel de acá es un resumen; el completo sigue en admin.html. Los datos
 * son los contadores anónimos de siempre — acá no se ve quién hizo nada,
 * porque no se guarda quién hizo nada.
 */
const ConfigVista = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));
  let adminCargado = false;

  function mostrar(tab){
    document.querySelectorAll("#cfgTabs [data-tab]").forEach(b =>
      b.setAttribute("aria-selected", b.dataset.tab === tab));
    document.querySelectorAll(".cfg-panel").forEach(p =>
      p.hidden = p.dataset.panel !== tab);
    if (tab === "admin" && !adminCargado) cargarAdmin();
  }

  async function chequearAdmin(){
    const btn = $("tabAdmin");
    if (!btn) return;
    let es = false;
    try { es = Boolean(Sesion.usuario()) && await Sesion.esAdmin(); } catch { es = false; }
    btn.hidden = !es;
    if (!es && btn.getAttribute("aria-selected") === "true") mostrar("temas");
  }

  /* ---------------- panel de admin ---------------- */

  const NOMBRES = {
    "nivel:NOVATO": "Sin experiencia (novato)", "nivel:PRO": "Con experiencia (pro)",
    "nivel:nc": "No contestó",
    "interes:webapp": "Web o aplicación", "interes:landing": "Página para un negocio",
    "interes:proceso": "Automatizar algo", "interes:chatbot": "Algo con IA",
    "interes:nc": "Todavía no sabe",
    "agente:claude": "Claude", "agente:codex": "Codex / ChatGPT", "agente:cursor": "Cursor",
    "agente:copilot": "Copilot", "agente:otro": "Otro / varios", "agente:nc": "No contestó"
  };

  function lista(titulo, filas, max){
    if (!filas.length) return "";
    const tope = Math.max(...filas.map(f => Number(f.total)), 1);
    return `<h3 style="margin-top:18px">${esc(titulo)}</h3>
      <ul class="adm-lista">${filas.slice(0, max).map(f => `
        <li><span class="eti">${esc(NOMBRES[f.detalle] || f.detalle || "—")}</span>
        <span class="b" style="width:${Math.round(Number(f.total) / tope * 30)}%"></span>
        <span class="tot">${f.total}</span></li>`).join("")}</ul>`;
  }

  async function cargarAdmin(){
    adminCargado = true;
    const zona = $("admZona");
    try {
      const {resumen} = await Sesion.metricas();
      const de = t => resumen.filter(r => r.tipo === t).sort((a, b) => b.total - a.total);
      const suma = t => de(t).reduce((n, r) => n + Number(r.total), 0);
      const perfilDe = pref => de("perfil").filter(r => (r.detalle || "").startsWith(pref + ":"));

      const perfiles = de("perfil");
      zona.innerHTML = `
        <div class="adm-tiles">
          <div class="adm-tile"><div class="n">${suma("visita")}</div><div class="l">Visitas</div></div>
          <div class="adm-tile"><div class="n">${suma("descarga")}</div><div class="l">Descargas</div></div>
          <div class="adm-tile"><div class="n">${suma("paquete")}</div><div class="l">Paquetes .zip</div></div>
          <div class="adm-tile"><div class="n">${suma("combinacion")}</div><div class="l">Combinaciones</div></div>
        </div>
        ${lista("Lo más descargado", de("descarga"), 8)}
        ${lista("Combinaciones más armadas (tipo/stack/nivel)", de("combinacion"), 8)}
        ${perfiles.length ? `
          ${lista("Quiénes llegan: experiencia", perfilDe("nivel"), 4)}
          ${lista("Qué quieren construir", perfilDe("interes"), 6)}
          ${lista("Con qué agente trabajan", perfilDe("agente"), 6)}`
        : `<p class="d" style="margin-top:16px">Todavía no hay datos del onboarding. Para empezar a contarlos,
             corré el <code>supabase/metricas.sql</code> actualizado (agrega el tipo «perfil» a los eventos).</p>`}
        <p class="d" style="margin-top:16px">
          Números anónimos: sin usuario, sin IP, sin cookies. El detalle por día está en el
          <a href="admin.html">panel completo</a>.</p>`;
    } catch (e) {
      admin_error(zona, e);
    }
  }

  function admin_error(zona, e){
    zona.innerHTML = `<p class="d">No se pudieron leer las métricas: ${esc(e.message)}.
      ¿Corriste <code>supabase/metricas.sql</code> y tenés <code>admin = true</code> en tu fila de perfiles?</p>`;
  }

  function abrir(){
    App.pintarConfig();
    mostrar("temas");
    adminCargado = false;
    chequearAdmin();
  }

  function iniciar(){
    $("cfgTabs").addEventListener("click", e => {
      const b = e.target.closest("[data-tab]");
      if (b) mostrar(b.dataset.tab);
    });
  }

  return {abrir, iniciar, chequearAdmin};
})();
