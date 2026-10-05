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
   los campos, las tecnologías y lo que dice el configurador de reglas. */
function opcionesPrompt(){
  const apagadas = ReglasUI.apagadas();
  if (ReglasUI.perfil() === "CONFIANZA" && !apagadas.includes("R01")) apagadas.push("R01");
  return {
    tipo: TYPES[$("ctype").value], stack: STACKS[$("cstack").value],
    nivel: $("clvl").value, perfil: $("cperf").value,
    brownfield: $("cexiste").value === "brownfield",
    playbooks: playbooksTildados(), tecnologias: [...sel], catalogo: TECH,
    custom: ReglasUI.hayCambios(), apagadas, ia: $("cia").checked,
    lite: Prompt.esLite({modo: ReglasUI.modo(), tipo: $("ctype").value})
  };
}

const buildPrompt = () => Prompt.armar(opcionesPrompt());

$("ctype").addEventListener("change", () => {
  if (TIPOS_CON_IA.has($("ctype").value)) $("cia").checked = true;
});

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
    prompt: $("ta").value || buildPrompt(),
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

$("zipSkills").onchange = renderArbol;
// IA en el producto suma un playbook: si ya se generó, la lista lo sigue.
$("cia").addEventListener("change", () => {
  if ($("out").style.display === "block"){ renderFiles(); renderArbol(); }
});
$("zipHarness").onchange = renderArbol;
// El nivel decide GUIDE.md y agents/: si ya se generó, la vista previa lo sigue.
$("clvl").addEventListener("change", () => {
  if ($("out").style.display === "block"){ renderFiles(); renderArbol(); }
});
$("zipProyecto").onclick = () => {
  Sesion.contar("paquete", "proyecto:" + $("ctype").value);
  bajar("zipProyecto", Paquete.proyecto);
};
$("zipSolo").onclick = () => {
  Sesion.contar("paquete", "sueltos");
  bajar("zipSolo", Paquete.soloMd);
};

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
      $("ctype").value = tipo; $("cstack").value = "reco"; $("cperf").value = "ESTRICTO";
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
