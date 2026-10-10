/* Combinador: el prompt de arranque, la lista de archivos, el ZIP y la
 * descarga rápida de las cards (que le presta sus campos).
 *
 * Parte del JS de index.html (D1): se carga como script clásico, en orden,
 * después de los módulos compartidos. Comparte el ámbito global con los
 * otros archivos de la página: lo que se ejecuta al cargar solo puede usar
 * lo declarado en este archivo o en los anteriores. */

/* ---------- combinador ---------- */
$("ctype").innerHTML = Object.entries(TYPES)
  .map(([k, v]) => `<option value="${k}">${esc(v.name)}</option>`).join("");

/* Los tipos que siempre llevan un modelo adentro: tildan solos «IA en el producto». */
const TIPOS_CON_IA = new Set(["chatbot"]);

const playbooksTildados = () => [...document.querySelectorAll("#pbs input:checked")].map(x => x.value);
/* Con IA en el producto, ia-en-el-producto viaja aunque no esté tildado. */
const playbooksElegidos = () => Prompt.playbooks(playbooksTildados(), $("cia").checked);

/* El texto lo arma prompt.js (puro y testeado); acá solo se junta el estado:
   los campos, las tecnologías y lo que dice el configurador de reglas.
   El perfil tiene UNA fuente, el configurador (N4 de la review de 0.33): el
   select del combinador escribe ahí y lo refleja, así el prompt y el
   custom.md adjunto nunca dicen dos perfiles distintos. */
function opcionesPrompt(){
  // CONFIANZA ya es R01=OFF para Prompt.r01Apagada: no hace falta sumarla acá.
  const perfil = ReglasUI.perfil(), apagadas = ReglasUI.apagadas();
  return {
    tipo: TYPES[$("ctype").value], stack: STACKS[$("cstack").value],
    nivel: $("clvl").value, perfil,
    brownfield: $("cexiste").value === "brownfield",
    playbooks: playbooksTildados(), tecnologias: [...sel], catalogo: TECH,
    custom: ReglasUI.hayCambios(), apagadas, ia: $("cia").checked,
    lite: Prompt.esLite({modo: ReglasUI.modo(), tipo: $("ctype").value})
  };
}

const buildPrompt = () => Prompt.armar(opcionesPrompt());

/* N5: calc, guía y proceso salen en LITE aunque el configurador diga FULL,
   que es el default y no se distingue de una elección. Se dice en pantalla. */
function pintarAvisoLite(){
  const lite = Prompt.TIPOS_LITE.has($("ctype").value) && ReglasUI.modo() === "FULL";
  $("clitehint").hidden = !lite;
  $("clitehint").textContent = lite
    ? "Este tipo sale en modo LITE (R18): un solo sdd/sdd-lite.md, aunque «Mis reglas» diga FULL, que es el default. Si querés otro modo, elegilo ahí (COMPACT o FEDERADO); si el proyecto crece, el agente te propone pasar a FULL."
    : "";
}

$("ctype").addEventListener("change", () => {
  if (TIPOS_CON_IA.has($("ctype").value)) $("cia").checked = true;
  pintarAvisoLite();
});
$("cperf").addEventListener("change", () => ReglasUI.fijarPerfil($("cperf").value));

function renderFiles(){
  const pbs = playbooksElegidos();
  const files = [
    {f:"../SDD-MASTER.md", n:"SDD-MASTER.md", d:"el núcleo — siempre"},
    {f:"../seguridad.md", n:"seguridad.md", d:"controles por superficie (R27)"},
    {f:"../harness.md", n:"harness.md", d:"evidencia y review para cerrar (R29, R30)"},
    {f:"../orchestration.md", n:"orchestration.md", d:"roles de agentes (R31)"},
    ...pbs.map(p => ({f:PB_META[p].f, n:p + ".md", d:PB_META[p].d}))
  ];
  if (opcionesPrompt().lite) files.push({f:"../prompts/sdd-lite.md", n:"prompts/sdd-lite.md", d:"plantilla del modo LITE (R18)"});
  if (sel.size) files.push({f:"../tecnologias.md", n:"tecnologias.md", d:`${sel.size} tecnologías elegidas`});
  if ($("clvl").value === "NOVATO") files.push({f:"../GUIDE.md", n:"GUIDE.md", d:"para vos, no para el agente"});
  $("filelist").innerHTML = files.map(x =>
    `<li><a href="${x.f}" download><code>${esc(x.n)}</code><span>${esc(x.d)}</span></a>
     <button class="ver-mini" type="button" data-ver="${x.f}" data-vt="${esc(x.n)}"
       aria-label="Ver ${esc(x.n)}" title="Ver antes de bajar">👁</button></li>`).join("") +
    (ReglasUI.hayCambios()
      ? `<li><a href="#" data-abrir-reglas="1"><code>custom.md</code><span>tus overrides — bajalo desde «Mis reglas»</span></a></li>`
      : "");
}

function opcionesPaquete(){
  const pbs = playbooksElegidos();
  return {
    nombre: $("comboname").value.trim() || TYPES[$("ctype").value].name,
    tipoNombre: TYPES[$("ctype").value].name,
    nivel: $("clvl").value,
    // M3: siempre del estado actual, nunca del textarea. Así el ZIP no puede
    // llevar un prompt de antes de un cambio.
    prompt: buildPrompt(),
    playbooks: pbs,
    custom: ReglasUI.hayCambios() ? ReglasUI.generar() : null,
    conTecnologias: sel.size > 0,
    conGuia: $("clvl").value === "NOVATO",
    brownfield: $("cexiste").value === "brownfield",
    conSkills: $("zipSkills").checked,
    conHarness: $("zipHarness").checked
  };
}

function renderArbol(){
  const o = opcionesPaquete(), c = Paquete.slug(o.nombre);
  const linea = (txt, nota) => `${txt}${nota ? `<i>   ← ${nota}</i>` : ""}`;
  const filas = [
    `<b>${c}/</b>`,
    linea("├── LEEME.md", "qué hacer, en 3 pasos"),
    linea("├── PROMPT-DE-ARRANQUE.txt", "pegalo en tu agente"),
    linea("├── .gitignore", "con .env adentro (R17)"),
    linea("├── .gitattributes", "merge union p/ changelogs (S27)"),
    "├── AGENTS.md",
    "├── CLAUDE.md",
  ];
  if (o.conSkills) filas.push(linea("├── .claude/skills/", "atajos /sdd-* para Claude"));
  if (o.nivel !== "NOVATO") filas.push(linea("├── agents/", "prompts de rol (R31)"));
  if (o.conHarness) filas.push(linea("├── harness/", `${Paquete.HARNESS.length} archivos: verify.py, pre-commit…`));
  filas.push(
    "└── sdd/",
    linea("    ├── SDD-MASTER.md", "el núcleo"),
    linea("    ├── seguridad.md", "controles según lo que hacés (R27)"),
    linea("    ├── harness.md", "cómo se cierra algo (R29, R30)"),
    linea("    ├── orchestration.md", "roles de agentes (R31)"),
    linea("    ├── prompts/", "tarjeta, handback, relevo y sdd-lite")
  );
  if (o.custom)         filas.push(linea("    ├── custom.md", "tus reglas"));
  if (o.conTecnologias) filas.push(linea("    ├── tecnologias.md", `${sel.size} elegidas`));
  if (o.conGuia)        filas.push(linea("    ├── GUIDE.md", "para vos"));
  if (o.playbooks.length){
    filas.push("    └── playbooks/");
    o.playbooks.forEach((p, i) =>
      filas.push(`        ${i === o.playbooks.length - 1 ? "└──" : "├──"} ${p}.md`));
  }
  $("ziparbol").innerHTML = filas.join("\n");
}

async function bajar(boton, fn){
  const b = $(boton), original = b.textContent, msg = $("zipmsg");
  msg.className = "zipmsg"; msg.textContent = "";
  b.disabled = true; b.textContent = "Armando…";
  Feedback.empezar();
  Feedback.toast("Armando tu paquete…", {spinner: true, duracion: 0, id: "zip"});
  try {
    const n = await fn({...opcionesPaquete(), onPaso: (hecho, total) => Feedback.fijar(hecho / total)});
    msg.textContent = `Listo: ${n} archivos. Descomprimí y seguí el LEEME.`;
    Feedback.toast(`Paquete listo: ${n} archivos`, {tipo: "ok", id: "zip", duracion: 2600});
  } catch (e) {
    msg.className = "zipmsg err";
    msg.textContent = "No se pudo armar el paquete: " + e.message;
    Feedback.toast("No se pudo armar el paquete", {tipo: "err", id: "zip", duracion: 3200});
  } finally { b.disabled = false; b.textContent = original; Feedback.terminar(); }
}

/* M3 (review de 0.33): si ya se generó, cualquier cambio que toque el prompt
   o los archivos (tipo, stack, nivel, perfil, IA, playbooks, tecnologías,
   reglas) regenera las tres cosas juntas. Antes, destildar «IA en el
   producto» dejaba un prompt que pedía un playbook que el ZIP ya no traía. */
function refrescarSalida(){
  pintarAvisoLite();
  if ($("out").style.display !== "block") return;
  $("ta").value = buildPrompt();
  renderFiles(); renderArbol();
}
$("comb").addEventListener("change", e => {
  if (e.target && (e.target.id === "comboname" || e.target.id === "cdesc")) return;
  refrescarSalida();
});
ReglasUI.alCambiar(() => { $("cperf").value = ReglasUI.perfil(); refrescarSalida(); });

$("zipSkills").onchange = renderArbol;
$("zipHarness").onchange = renderArbol;
$("zipProyecto").onclick = () => {
  Sesion.contar("paquete", "proyecto:" + $("ctype").value);
  bajar("zipProyecto", Paquete.proyecto);
};
$("zipSolo").onclick = () => {
  Sesion.contar("paquete", "sueltos");
  bajar("zipSolo", Paquete.soloMd);
};

/* ---------- fusión con IA (F28, ADR-016) ---------- */
/* El pedido de contracts.md §8: tipo/stack van como key del catálogo (no el
   objeto {name, extra} que usa Prompt.armar), tecnologias/playbooks son el
   mismo estado que arma el prompt hoy, y custom es exactamente la expresión
   que ya usa opcionesPaquete() — nunca null «por error», nunca 400. */
function opcionesFusion(){
  const o = {
    tipo: $("ctype").value, stack: $("cstack").value,
    tecnologias: [...sel], playbooks: playbooksElegidos(),
    custom: ReglasUI.hayCambios() ? ReglasUI.generar() : null
  };
  const descripcion = $("cdesc").value.trim();
  if (descripcion) o.descripcion = descripcion;
  return o;
}

/* Botón aparte del v1 (criterio 1): llama a /api/fusionar y arma el ZIP con
   lo que devuelve, reusando Zip.descargar (criterio 3) igual que paquete.js.
   Nunca rompe el camino v1: sin key, sin red, 429/500 o el endpoint ausente
   en este deploy caen automáticamente a Paquete.proyecto (criterio 5), y
   "simulada" arma el mismo ZIP con un aviso, no un error (criterio 4). */
async function fusionarIA(){
  const b = $("zipFusion"), original = b.textContent, msg = $("zipmsg");
  msg.className = "zipmsg"; msg.textContent = "";
  b.disabled = true; b.textContent = "Armando…";
  Feedback.empezar();
  Feedback.toast("Armando tu paquete con fusión IA…", {spinner: true, duracion: 0, id: "zip"});
  const tipo = $("ctype").value;
  try {
    const r = await fetch("/api/fusionar", {
      method: "POST",
      headers: {"Content-Type": "application/json"},
      body: JSON.stringify(opcionesFusion())
    });
    if (!r.ok) throw new Error("fusión: HTTP " + r.status);
    const datos = await r.json();
    if (!datos || !Array.isArray(datos.archivos) || !datos.archivos.length)
      throw new Error("fusión: respuesta sin archivos");
    const carpeta = Paquete.slug($("comboname").value.trim() || TYPES[$("ctype").value].name);
    Zip.descargar(`${carpeta}.zip`, datos.archivos);
    if (datos.fusion === "simulada"){
      msg.textContent = `Listo: ${datos.archivos.length} archivos. Sin IA disponible: esta es la versión simulada (igual a la v1).`;
      Feedback.toast(`Paquete listo (modo simulado): ${datos.archivos.length} archivos`, {tipo: "ok", id: "zip", duracion: 3200});
      Sesion.contar("paquete", "ia-simulada:" + tipo);
    } else {
      msg.textContent = `Listo: ${datos.archivos.length} archivos, con fusión IA.`;
      Feedback.toast(`Paquete con IA listo: ${datos.archivos.length} archivos`, {tipo: "ok", id: "zip", duracion: 2600});
      Sesion.contar("paquete", "ia:" + tipo);
    }
  } catch (e) {
    // Nunca una promesa sin catch ni una pantalla rota: cae al v1 de siempre.
    Feedback.toast("Sin fusión IA: armamos el paquete v1", {tipo: "err", id: "zip", duracion: 2600});
    try {
      const n = await Paquete.proyecto({...opcionesPaquete(), onPaso: (h, t) => Feedback.fijar(h / t)});
      msg.textContent = `La fusión con IA no respondió: armamos el paquete v1 de siempre (${n} archivos).`;
      Feedback.toast(`Paquete v1 listo: ${n} archivos`, {tipo: "ok", id: "zip", duracion: 2600});
      Sesion.contar("paquete", "ia-fallback:" + tipo);
    } catch (e2) {
      msg.className = "zipmsg err";
      msg.textContent = "No se pudo armar el paquete: " + e2.message;
      Feedback.toast("No se pudo armar el paquete", {tipo: "err", id: "zip", duracion: 3200});
    }
  } finally {
    b.disabled = false; b.textContent = original; Feedback.terminar();
  }
}
$("zipFusion").onclick = fusionarIA;

/* ---------- descarga rápida desde el catálogo ---------- */
(() => {
  let tipo = null;
  document.addEventListener("click", e => {
    const b = e.target.closest("[data-zip]");
    if (!b) return;
    tipo = b.dataset.zip;
    $("ziprsub").textContent = `${TYPES[tipo].name} — la carpeta lista para descomprimir y arrancar.`;
    $("zrmsg").textContent = "";
    $("zipdlg").showModal();
  });
  $("ziprx").onclick = () => $("zipdlg").close();
  $("zipdlg").addEventListener("click", e => { if (e.target === $("zipdlg")) $("zipdlg").close(); });
  $("zrcomb").onclick = () => {
    $("zipdlg").close();
    const btn = document.querySelector(`[data-pick="${tipo}"]`);
    if (btn) btn.click(); else App.ir("combinador");
  };
  $("zrdl").onclick = async () => {
    const b = $("zrdl"), original = b.textContent;
    b.disabled = true; b.textContent = "Armando…";
    Feedback.empezar();
    Feedback.toast("Armando tu paquete…", {spinner: true, duracion: 0, id: "zip"});
    // El combinador es el único que sabe armar prompts: se le prestan sus
    // campos con los defaults, se genera, y se devuelven como estaban para
    // no pisar una combinación que la persona tenga a medias.
    const prestado = ["ctype", "cstack", "clvl", "cperf", "cexiste"].map(id => [id, $(id).value]);
    const iaPrestada = $("cia").checked;
    try {
      // El perfil no se presta: es el del configurador (una sola fuente).
      $("ctype").value = tipo; $("cstack").value = "reco";
      $("clvl").value = $("zrnivel").value; $("cexiste").value = $("zrexiste").value;
      $("cia").checked = TIPOS_CON_IA.has(tipo);
      const o = {...opcionesPaquete(), nombre: TYPES[tipo].name, prompt: buildPrompt(),
                 playbooks: Prompt.playbooks(["env-setup"], $("cia").checked), conSkills: $("zrskills").checked,
                 conHarness: $("zrharness").checked};
      const n = await Paquete.proyecto({...o, onPaso: (h, t) => Feedback.fijar(h / t)});
      $("zrmsg").textContent = `Listo: ${n} archivos.`;
      Feedback.toast(`Paquete listo: ${n} archivos`, {tipo: "ok", id: "zip", duracion: 2600});
      Sesion.contar("paquete", "rapido:" + tipo);
    } catch (err) {
      $("zrmsg").textContent = "No se pudo: " + err.message;
      Feedback.toast("No se pudo armar el paquete", {tipo: "err", id: "zip", duracion: 3200});
    } finally {
      prestado.forEach(([id, v]) => $(id).value = v);
      $("cia").checked = iaPrestada;
      b.disabled = false; b.textContent = original; Feedback.terminar();
    }
  };
})();
