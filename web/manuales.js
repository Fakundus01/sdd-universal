/* Recorrido guiado por las secciones y vista Manuales (playbooks y skills).
 *
 * Parte del JS de index.html (D1): se carga como script clásico, en orden,
 * después de los módulos compartidos. Comparte el ámbito global con los
 * otros archivos de la página: lo que se ejecuta al cargar solo puede usar
 * lo declarado en este archivo o en los anteriores. */

/* ---------- recorrido guiado por las secciones ---------- */
(() => {
  const PASOS = [
    {v: "inicio", t: "🏠 Inicio", d: "La portada: qué es el SDD en tres líneas, el master para descargar directo y las preguntas frecuentes."},
    {v: "catalogo", t: "📦 Catálogo", d: "Todos los paquetes: el núcleo, los tipos de proyecto y los playbooks. Cada card tiene el ojito 👁 para leer antes de bajar, y las de proyecto traen «📦 Descargar ZIP» con la carpeta ya armada."},
    {v: "combinador", t: "🧩 Combinador", d: "El camino fino: tipo + stack + nivel + tecnologías + playbooks → tu prompt de arranque exacto y el ZIP del proyecto. Con cuenta podés guardar combinaciones y retomarlas desde cualquier dispositivo."},
    {v: "tecnologias", t: "🛠️ Tecnologías", d: "Las 130 del catálogo con búsqueda y filtros. Lo que marcás acá queda elegido y entra al prompt cuando armás tu paquete."},
    {v: "reglas", t: "📐 Mis reglas", d: "Las 32 reglas del SDD con su interruptor ON/OFF. Apagá las que no van con vos y bajate el custom.md ya escrito — el núcleo nunca se toca, así tu configuración sobrevive a cada actualización."},
    {v: "manuales", t: "📚 Manuales", d: "Los playbooks (recetas paso a paso: deploy, git, Supabase, datos ajenos…) para leer acá mismo o bajar, y las skills de Claude para instalar en tu repo."},
    {t: "📖 Aprender", d: "En el menú también están la Guía (cómo se usa el SDD, para humanos), el Demo (el mismo formulario con y sin SDD — probá los casos borde) y el Tablero (todo el sistema en una página). Son páginas aparte: se abren desde el menú."},
    {v: "comunidad", t: "💬 Feedback", d: "Errores, ideas y casos reales van a GitHub Issues con plantillas. Lo que se confirma termina alimentando el núcleo: nada entra «porque suena bien» (R20)."},
    {v: "configuracion", t: "⚙️ Configuración", d: "Temas con vida propia, tamaño de texto, animaciones, qué secciones se ven, y este recorrido para cuando quieras repetirlo. ¡Eso es todo — a armar tu primer paquete!"}
  ];
  let i = 0;
  function pintar(){
    const p = PASOS[i];
    $("tutPaso").textContent = `Recorrido · ${i + 1} de ${PASOS.length}`;
    $("tutTitulo").textContent = p.t;
    $("tutTexto").textContent = p.d;
    $("tutAtras").disabled = i === 0;
    $("tutSig").textContent = i === PASOS.length - 1 ? "Terminar ✓" : "Siguiente ›";
    if (p.v) App.ir(p.v);
  }
  const cerrar = () => { $("tut").hidden = true; };
  $("tutBtn").onclick = () => { i = 0; $("tut").hidden = false; pintar(); };
  $("tutAtras").onclick = () => { if (i > 0){ i--; pintar(); } };
  $("tutSig").onclick = () => { if (i === PASOS.length - 1) cerrar(); else { i++; pintar(); } };
  $("tutSalir").onclick = cerrar;
})();

/* ---------- vista manuales ---------- */
const MANUALES = [
  {t: "Deploy en Vercel",              d: "tu front online con URL propia en 20 minutos",      f: "../playbooks/deploy-vercel.md"},
  {t: "Publicar en GitHub + Vercel",   d: "de carpeta local a repo público con web deployada", f: "../playbooks/publish-github-vercel.md"},
  {t: "Inicio de sesión con Supabase", d: "cuentas de usuario en un sitio estático, con RLS",  f: "../playbooks/supabase-auth.md"},
  {t: "Que los mails lleguen",         d: "Gmail gratis o Resend, con el DNS explicado",       f: "../playbooks/resend-smtp.md"},
  {t: ".env y credenciales seguras",   d: "secretos fuera del repo desde el minuto cero",      f: "../playbooks/env-setup.md"},
  {t: "React + Vite desde cero",       d: "node -v, npm create vite, npm run dev",             f: "../playbooks/create-react-vite.md"},
  {t: "Git desde cero, sin miedo",     d: "el ciclo diario y cómo deshacer sin romper nada",   f: "../playbooks/git-basico.md"},
  {t: "IA en el producto",             d: "tope de gasto reservado, RAG con permisos, agentes que actúan con aprobación y evals", f: "../playbooks/ia-en-el-producto.md"},
  {t: "Antes de desplegar (go-live)",  d: "datos de prod en solo lectura, capacidad y OK humano (R32)", f: "../playbooks/go-live.md"},
  {t: "Consumir un repo o API ajeno",  d: "copia propia, licencia y sincronización con registro", f: "../playbooks/consumir-api-externa.md"},
  {t: "Catálogo de playbooks",         d: "el índice completo, con el estado de cada receta",  f: "../playbooks/catalog.md"}
];
$("manPlaybooks").innerHTML = MANUALES.map(x => `
  <div class="man-fila">
    <div class="txt"><b>${esc(x.t)}</b><small>${esc(x.d)}</small></div>
    <button class="ver-mini" type="button" data-ver="${x.f}" data-vt="${esc(x.t)}"
      aria-label="Ver ${esc(x.t)}" title="Leer acá">👁</button>
    <a class="btn b-alt man-dl" href="${x.f}" download>Bajar</a>
  </div>`).join("");
const skillFila = s => `
  <div class="man-fila">
    <div class="txt"><b>/${esc(s.n)}</b><small>${esc(s.d)}</small></div>
    <button class="ver-mini" type="button" data-ver="../skills/${s.n}/SKILL.md" data-vt="/${esc(s.n)}"
      aria-label="Ver ${esc(s.n)}" title="Leer acá">👁</button>
  </div>`;
$("manSkills").innerHTML = Paquete.SKILLS.map(skillFila).join("");

const SKILLS_POR_PAGINA = 6;
let manSkillsPag = 1;
function renderManSkills(){
  const lista = Paquete.SKILLS_EXTRA;
  const paginas = Math.max(1, Math.ceil(lista.length / SKILLS_POR_PAGINA));
  if (manSkillsPag > paginas) manSkillsPag = paginas;
  $("manSkillsExtra").innerHTML =
    lista.slice((manSkillsPag - 1) * SKILLS_POR_PAGINA, manSkillsPag * SKILLS_POR_PAGINA)
         .map(skillFila).join("")
    + pager(lista.length, manSkillsPag, SKILLS_POR_PAGINA, "manskills");
}
renderManSkills();
$("manSkillsZip").onclick = async () => {
  const b = $("manSkillsZip"), original = b.textContent;
  b.disabled = true; b.textContent = "Armando…";
  try {
    const n = await Paquete.soloSkills();
    Feedback.toast(`Listo: ${n} skills en el ZIP — descomprimilo en la raíz de tu repo`, {tipo: "ok", duracion: 3000});
    Sesion.contar("paquete", "skills");
  } catch {
    Feedback.toast("No se pudieron bajar las skills", {tipo: "err", duracion: 3200});
  } finally { b.disabled = false; b.textContent = original; }
};

$("go").onclick = () => {
  Sesion.contar("combinacion", $("ctype").value + "/" + $("cstack").value + "/" +
    $("clvl").value + "/" + $("cexiste").value);
  $("ta").value = buildPrompt();
  renderFiles();
  renderArbol();
  $("out").style.display = "block";
  $("out").scrollIntoView({behavior:"smooth", block:"start"});
};

$("cp").onclick = async () => {
  try { await navigator.clipboard.writeText($("ta").value); }
  catch { $("ta").select(); document.execCommand("copy"); }
  $("cp").textContent = "¡Copiado! Pegalo en tu agente";
  setTimeout(() => $("cp").textContent = "Copiar al portapapeles", 2500);
};

$("dl").onclick = () => {
  const url = URL.createObjectURL(new Blob([$("ta").value], {type:"text/plain;charset=utf-8"}));
  const a = document.createElement("a");
  a.href = url; a.download = "prompt-de-arranque.txt"; a.click();
  URL.revokeObjectURL(url);
};
