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

function techBlock(){
  if (!sel.size) return "";
  const filas = [...sel].map(n => {
    const t = TECH.find(x => x.n === n) || {n};
    return `- ${t.n}${t.e ? ` (${t.e})` : ""}${t.u ? ` — ${t.u}` : ""}`;
  }).join("\n");
  return `
TECNOLOGÍAS ELEGIDAS (las saqué del catálogo, no son una decisión de arquitectura):
${filas}

Antes de aceptarlas: decime si esta combinación tiene sentido para este proyecto (R12),
qué falta, qué sobra y qué chocaría entre sí. Si algo no conviene, proponé el reemplazo
con el motivo — prefiero cambiar de idea ahora y no a mitad del código (R25). Verificá
también las versiones actuales contra la web antes de fijarlas (R19).
`;
}

/* Un proyecto que ya existe NO se arranca igual que uno nuevo: R15 dice que
   primero se analiza y se genera el sdd/ reflejando lo que HAY, y recién
   después se trabaja. Mandarle el prompt greenfield a un repo con código es
   pedirle al agente que empiece por crear una carpeta que ya existe. */
function promptBrownfield(){
  const t = TYPES[$("ctype").value], lvl = $("clvl").value, perf = $("cperf").value;
  const pbs = [...document.querySelectorAll("#pbs input:checked")].map(x => x.value);
  return `Pegá/adjuntá primero el SDD-MASTER (está en la lista de archivos de abajo). Aplicalo.

Este repo YA EXISTE y NO tiene SDD. Aplicá R15: no toques código todavía.

NIVEL: ${lvl}${lvl === "NOVATO"
  ? " — R23 activa: pensá por tres antes de cada acción con consecuencias, explicame todo en lenguaje simple y un paso por vez."
  : " — experiencia en código: podés ir al grano."}
PERFIL: ${perf}${ReglasUI.hayCambios() ? "\nTengo overrides propios en custom.md (va adjunto): leelo DESPUÉS del master." : ""}

QUÉ ES ESTE PROYECTO: ${t.name}
${t.extra}

Nota: dicto mis mensajes por voz. Si una palabra no te cierra, citámela y
preguntame qué quise decir en vez de asumir (R04).

PASOS:
1. Analizá el repo con subagentes económicos (R11): estructura, git log,
   dependencias y el estilo que ya usa el código. NO toques nada.
2. Clasificá la superficie de ataque con las seis preguntas de seguridad.md
   (R27) sobre lo que el proyecto YA hace, y decime qué niveles quedan activos.
3. Generá sdd/ completo reflejando lo que EXISTE, no lo que te gustaría que
   existiera. Si algo está a medias, que status.md lo diga con su % real.
4. Redactá la "prompt de arranque sintética": el contexto reconstruido como si
   el proyecto hubiera nacido con SDD.
5. Presentame todo y esperá mi OK. Recién ahí commiteás los MD (R01).
6. Después de eso, y no antes: proponeme las 3 mejoras que más valor agregan,
   marcadas [MEJORA PROPUESTA] (R03), y las trabajamos por ciclos con HANDBACK.
${techBlock()}
PLAYBOOKS a seguir al pie de la letra cuando toque (R24): ${pbs.length ? pbs.join(", ") : "ninguno por ahora"} — te los adjunto junto con el master.`;
}

function buildPrompt(){
  if ($("cexiste").value === "brownfield") return promptBrownfield();
  const t = TYPES[$("ctype").value], lvl = $("clvl").value, perf = $("cperf").value;
  const pbs = [...document.querySelectorAll("#pbs input:checked")].map(x => x.value);
  return `Pegá/adjuntá primero el SDD-MASTER (está en la lista de archivos de abajo). Aplicalo.

NIVEL: ${lvl}${lvl === "NOVATO"
  ? " — R23 activa: pensá por tres antes de cada acción con consecuencias (plan → autocrítica → plan corregido), explicame todo en lenguaje simple, un paso por vez, y no asumas que sé nada de programación."
  : " — experiencia en código: podés ir al grano."}
PERFIL: ${perf} · MODO: que lo clasifiques vos (R18)${ReglasUI.hayCambios()
  ? "\nTengo overrides propios en custom.md (va adjunto): leelo DESPUÉS del master y aplicá lo que pise."
  : ""}

TIPO DE PROYECTO: ${t.name}
${t.extra}

STACK: ${STACKS[$("cstack").value]}
${techBlock()}
PLAYBOOKS a seguir al pie de la letra cuando toque (R24): ${pbs.length ? pbs.join(", ") : "ninguno por ahora"} — te los adjunto junto con el master.

SEGURIDAD (R27): clasificá la superficie de este proyecto con las seis preguntas de
seguridad.md (¿login? ¿datos de personas? ¿plata? ¿IA con entrada del usuario?
¿archivos subidos? ¿API pública?), decime qué niveles quedan activos y por qué, y
registralo en security.md. No me pases el checklist entero: solo lo que aplica.

Arrancá con el cuestionario socrático (R04) sumando las preguntas propias de este tipo de proyecto. Después: propuesta de estructura y stack → mi OK → carpeta del repo (R10, con OK) → generás sdd/ → primer commit solo con los MD (R01). Avisame, como siempre, que R01 es desactivable.`;
}

function renderFiles(){
  const pbs = [...document.querySelectorAll("#pbs input:checked")].map(x => x.value);
  const files = [
    {f:"../SDD-MASTER.md", n:"SDD-MASTER.md", d:"el núcleo — siempre"},
    {f:"../seguridad.md", n:"seguridad.md", d:"controles por superficie (R27)"},
    {f:"../harness.md", n:"harness.md", d:"evidencia y review para cerrar (R29, R30)"},
    {f:"../orchestration.md", n:"orchestration.md", d:"roles de agentes (R31)"},
    ...pbs.map(p => ({f:PB_META[p].f, n:p + ".md", d:PB_META[p].d}))
  ];
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
  const pbs = [...document.querySelectorAll("#pbs input:checked")].map(x => x.value);
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
    linea("    ├── prompts/", "tarjeta, handback y relevo")
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
    try {
      $("ctype").value = tipo; $("cstack").value = "reco"; $("cperf").value = "ESTRICTO";
      $("clvl").value = $("zrnivel").value; $("cexiste").value = $("zrexiste").value;
      const o = {...opcionesPaquete(), nombre: TYPES[tipo].name, prompt: buildPrompt(),
                 playbooks: ["env-setup"], conSkills: $("zrskills").checked,
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
      b.disabled = false; b.textContent = original; Feedback.terminar();
    }
  };
})();
