/* Configurador de reglas → genera custom.md
 *
 * El núcleo (SDD-MASTER.md) no se edita nunca: por eso existe custom.md,
 * que el agente lee después del master y pisa lo que haga falta. Esta
 * pantalla escribe ese archivo por vos, con la sintaxis exacta.
 *
 * Las reglas "fijas" no se pueden apagar y eso no es una limitación de la
 * interfaz: son las que sostienen el sistema (spec antes que código, no
 * commitear secretos, no re-escribir la spec en silencio). Se muestran
 * igual, con candado, porque saber qué NO es negociable también informa.
 */
const ReglasUI = (() => {
  const CLAVE = "sdd-custom";
  const base = () => ({
    perfil: "ESTRICTO", modo: "FULL", variante: "WEB",
    apagadas: [], maxLineas: "", stack: "", propias: "", notas: ""
  });
  let cfg = base();

  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

  /* ---------------- generación del archivo ---------------- */

  function generar(){
    const L = [];
    L.push("# custom.md · Overrides personales");
    L.push("");
    L.push("> Generado desde el catálogo web. El núcleo (`SDD-MASTER.md`, `SDD-COMPACT.md`,");
    L.push("> `scenarios.md`) **no se edita**: así lo actualizás cuando salga una versión");
    L.push("> nueva sin perder nada de esto. El agente lee el master primero y después");
    L.push("> este archivo, que pisa lo que haga falta.");
    L.push("");
    L.push("## Mis overrides");
    L.push("");
    L.push("```");
    L.push(`PERFIL=${cfg.perfil}`);
    L.push(`MODO=${cfg.modo}`);
    L.push(`VARIANTE=${cfg.variante}`);

    if (cfg.apagadas.length){
      L.push("");
      for (const id of cfg.apagadas.slice().sort()){
        const r = REGLAS.find(x => x.id === id);
        L.push(`${id}=OFF${r ? `   # ${r.nombre}` : ""}`);
      }
    }
    if (cfg.maxLineas) L.push(`R05.max=${cfg.maxLineas}`);
    if (cfg.stack)     L.push(`R14.stack=${cfg.stack}`);

    const propias = cfg.propias.split("\n").map(x => x.trim()).filter(Boolean);
    if (propias.length){
      L.push("");
      propias.forEach(p => L.push(p.startsWith("+") ? p : `+${p}`));
    }
    L.push("```");
    L.push("");

    if (cfg.apagadas.length){
      L.push("## Por qué apagué esas reglas");
      L.push("");
      L.push("*(completalo: dentro de tres meses no te vas a acordar, y el agente tampoco.)*");
      L.push("");
      for (const id of cfg.apagadas.slice().sort()){
        const r = REGLAS.find(x => x.id === id);
        L.push(`- **${id} · ${r?.nombre || ""}** — motivo: `);
      }
      L.push("");
    }

    L.push("## Notas personales");
    L.push("");
    L.push(cfg.notas.trim() || "- (espacio libre: convenciones tuyas, stacks favoritos, cosas que el agente debe saber de vos)");
    L.push("");
    return L.join("\n");
  }

  /* ---------------- interfaz ---------------- */

  function render(){
    const soloDesact = $("rsolo").checked;
    const lista = soloDesact ? REGLAS.filter(r => r.tipo === "desactivable") : REGLAS;
    $("rlist").innerHTML = lista.map(r => {
      const off = cfg.apagadas.includes(r.id);
      const fija = r.tipo === "fija";
      return `<div class="rrow${fija ? " fija" : ""}${off ? " off" : ""}">
        <label class="rsw">
          <input type="checkbox" data-regla="${r.id}" ${fija ? "disabled" : ""} ${off ? "" : "checked"}
                 aria-label="${esc(r.id)} ${esc(r.nombre)}">
          <span class="pill">${off ? "OFF" : "ON"}</span>
        </label>
        <div class="rtxt">
          <b>${r.id} · ${esc(r.nombre)}</b>
          ${fija ? '<span class="lock" title="Regla fija: sostiene el sistema y no se puede apagar">🔒 fija</span>' : ""}
          <p>${esc(r.d)}</p>
        </div>
      </div>`;
    }).join("");
    const n = cfg.apagadas.length;
    $("rcount").textContent = n === 0
      ? "Ninguna apagada — configuración por defecto"
      : n === 1 ? "1 regla apagada" : `${n} reglas apagadas`;
    $("rout").textContent = generar();
  }

  function leerFormulario(){
    cfg.perfil = $("rperfil").value;
    cfg.modo = $("rmodo").value;
    cfg.variante = $("rvariante").value;
    cfg.maxLineas = $("rmax").value.trim();
    cfg.stack = $("rstack").value.trim();
    cfg.propias = $("rpropias").value;
    cfg.notas = $("rnotas").value;
    guardar();
    render();
  }

  function pintarFormulario(){
    $("rperfil").value = cfg.perfil;
    $("rmodo").value = cfg.modo;
    $("rvariante").value = cfg.variante;
    $("rmax").value = cfg.maxLineas;
    $("rstack").value = cfg.stack;
    $("rpropias").value = cfg.propias;
    $("rnotas").value = cfg.notas;
  }

  const guardar = () => localStorage.setItem(CLAVE, JSON.stringify(cfg));

  function cargar(){
    try { cfg = {...base(), ...JSON.parse(localStorage.getItem(CLAVE))}; }
    catch { cfg = base(); }
  }

  function abrir(){
    pintarFormulario();
    render();
    $("reglasdlg").showModal();
  }

  function iniciar(){
    cargar();

    $("rlist").addEventListener("change", e => {
      const cb = e.target.closest("[data-regla]");
      if (!cb) return;
      const id = cb.dataset.regla;
      cfg.apagadas = cb.checked ? cfg.apagadas.filter(x => x !== id) : [...cfg.apagadas, id];
      guardar(); render();
    });

    ["rperfil","rmodo","rvariante","rmax","rstack"].forEach(id =>
      $(id).addEventListener("change", leerFormulario));
    ["rpropias","rnotas"].forEach(id => $(id).addEventListener("input", leerFormulario));
    $("rsolo").addEventListener("change", render);

    $("rreset").onclick = () => {
      if (!confirm("¿Volver todo a la configuración por defecto?")) return;
      cfg = base(); guardar(); pintarFormulario(); render();
    };

    $("rdl").onclick = () => {
      const url = URL.createObjectURL(new Blob([generar()], {type: "text/markdown;charset=utf-8"}));
      const a = document.createElement("a");
      a.href = url; a.download = "custom.md"; a.click();
      URL.revokeObjectURL(url);
    };

    $("rcopy").onclick = async () => {
      try { await navigator.clipboard.writeText(generar()); } catch { /* sin portapapeles */ }
      $("rcopy").textContent = "¡Copiado!";
      setTimeout(() => $("rcopy").textContent = "Copiar", 2000);
    };

    $("reglasx").onclick = () => $("reglasdlg").close();
    $("reglasdlg").addEventListener("click", e => {
      if (e.target === $("reglasdlg")) $("reglasdlg").close();
    });
  }

  return {iniciar, abrir, generar, hayCambios: () => cfg.apagadas.length > 0 ||
          cfg.perfil !== "ESTRICTO" || cfg.modo !== "FULL" || Boolean(cfg.maxLineas || cfg.stack || cfg.propias.trim())};
})();
