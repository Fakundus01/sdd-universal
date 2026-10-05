/* Vista previa de los MD, compartir por link, buscador (Ctrl+K) e init.
 *
 * Parte del JS de index.html (D1): se carga como script clásico, en orden,
 * después de los módulos compartidos. Comparte el ámbito global con los
 * otros archivos de la página: lo que se ejecuta al cargar solo puede usar
 * lo declarado en este archivo o en los anteriores. */

/* ---------- vista previa de los MD ---------- */
async function abrirPreview(url, titulo){
  $("mdtitulo").textContent = titulo || url.split("/").pop();
  $("mdruta").textContent = url.replace(/^\.\.\//, "");
  $("mdraw").href = url;
  $("mddescargar").href = url;
  $("mdcuerpo").innerHTML = Feedback.spinnerHTML("Cargando el documento…");
  $("mddlg").dataset.base = url;
  if (!$("mddlg").open) $("mddlg").showModal();
  Feedback.empezar();
  try {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    const t = await r.text();
    $("mdcuerpo").innerHTML = Md.render(t);
    $("mdcuerpo").scrollTop = 0;
    $("mdinfo").textContent = `${t.split("\n").length} líneas · ${(t.length / 1024).toFixed(1)} KB`;
    Sesion.contar("visita", "md:" + url.split("/").pop());
  } catch (e) {
    $("mdcuerpo").innerHTML = `<p class="dlg-empty">No se pudo cargar el archivo (${esc(e.message)}).</p>`;
  } finally {
    Feedback.terminar();
  }
}

document.addEventListener("click", e => {
  const v = e.target.closest("[data-ver]");
  if (v){ e.preventDefault(); abrirPreview(v.dataset.ver, v.dataset.vt); }
});

// Un link relativo a otro .md dentro del preview abre ESE archivo en el
// preview, en vez de sacarte de la app al markdown crudo.
$("mdcuerpo").addEventListener("click", e => {
  const a = e.target.closest("a[href]");
  if (!a) return;
  const h = a.getAttribute("href");
  if (h.startsWith("http") || h.startsWith("#")) return;
  if (/\.md(#|$)/.test(h)){
    e.preventDefault();
    const abs = new URL(h, new URL($("mddlg").dataset.base, location.href)).href;
    abrirPreview(abs, h.split("/").pop().split("#")[0]);
  }
});
$("mdx").onclick = () => $("mddlg").close();
$("mddlg").addEventListener("click", e => { if (e.target === $("mddlg")) $("mddlg").close(); });

/* ---------- compartir la combinación por link ---------- */
const b64url = {
  cod: o => btoa(unescape(encodeURIComponent(JSON.stringify(o))))
         .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""),
  dec: t => JSON.parse(decodeURIComponent(escape(atob(t.replace(/-/g, "+").replace(/_/g, "/")))))
};

$("share").onclick = async () => {
  const o = {n: $("comboname").value.trim(), t: $("ctype").value, s: $("cstack").value,
             l: $("clvl").value, p: $("cperf").value, e: $("cexiste").value,
             pb: [...document.querySelectorAll("#pbs input:checked")].map(x => x.value),
             tec: [...sel], ia: $("cia").checked};
  const url = location.origin + location.pathname + "#/combinador?c=" + b64url.cod(o);
  try { await navigator.clipboard.writeText(url); } catch { /* sin portapapeles */ }
  $("share").textContent = "¡Link copiado!";
  setTimeout(() => $("share").textContent = "🔗 Compartir link", 2200);
};

function cargarComboDelLink(){
  const m = location.hash.match(/[?&]c=([A-Za-z0-9_-]+)/);
  if (!m) return;
  try {
    const o = b64url.dec(m[1]);
    if (o.e) $("cexiste").value = o.e;
    aplicarCombinacion({nombre: o.n, tipo: o.t, stack: o.s, nivel: o.l,
                        perfil: o.p, playbooks: o.pb, tecnologias: o.tec, ia: o.ia});
    avisar("Cargamos la combinación que venía en el link. Revisala y generá tu paquete.");
  } catch { avisar("El link traía una combinación que no se pudo leer.", true); }
}

/* ---------- buscador global (Ctrl+K) ---------- */
function itemsBusca(){
  const arr = [];
  CARDS.forEach(c => arr.push({t: c.t, d: c.c, tipo: "Catálogo",
    run: () => { App.ir("catalogo"); $("q").value = c.t; catPage = 1; render(); }}));
  TECH.forEach(x => arr.push({t: x.n, d: [x.t, x.e].filter(Boolean).join(" · "), tipo: "Tecnología",
    run: () => { App.ir("tecnologias"); const tq = $("tq"); tq.value = x.n; tq.dispatchEvent(new Event("input")); }}));
  REGLAS.forEach(r => arr.push({t: r.id + " · " + r.nombre, d: r.tipo, tipo: "Regla",
    run: () => App.ir("reglas")}));
  [["Guía", "guia.html"], ["Demo con/sin SDD", "demo.html"], ["Tablero", "../sdd-universal-tablero.html"]]
    .forEach(([t, h]) => arr.push({t, d: "página", tipo: "Ir a", run: () => location.href = h}));
  [["Combinador", "combinador"], ["Mi perfil", "perfil"], ["Configuración", "configuracion"], ["Feedback", "comunidad"]]
    .forEach(([t, v]) => arr.push({t, d: "sección", tipo: "Ir a", run: () => App.ir(v)}));
  return arr;
}

let kMarcada = 0, kRes = [];
function pintarBusca(){
  const q = $("kq").value.trim();
  kRes = q.length < 2 ? [] : Buscador.filtrar(itemsBusca(), q, ["t", "d"]).slice(0, 12);
  $("kres").innerHTML = q.length < 2
    ? `<p class="k-vacio">Escribí al menos dos letras. Busca en las cards, las 128 tecnologías, las 32 reglas y las páginas.</p>`
    : kRes.length
      ? kRes.map((r, i) => `<button type="button" data-k="${i}" class="${i === kMarcada ? "marcada" : ""}">
          <span class="tipo">${r.tipo}</span><b>${Buscador.resaltar(r.t, q)}</b><small>${esc(r.d)}</small>
        </button>`).join("")
      : `<p class="k-vacio">Nada con «${esc(q)}».</p>`;
}
function abrirBusca(){
  kMarcada = 0; $("kq").value = ""; pintarBusca();
  $("kdlg").showModal(); $("kq").focus();
}
function ejecutarBusca(i){
  const r = kRes[i]; if (!r) return;
  $("kdlg").close();
  r.run();
}
$("btnBuscar").onclick = abrirBusca;
$("kq").addEventListener("input", () => { kMarcada = 0; pintarBusca(); });
$("kq").addEventListener("keydown", e => {
  if (e.key === "ArrowDown" || e.key === "ArrowUp"){
    e.preventDefault();
    if (kRes.length){ kMarcada = (kMarcada + (e.key === "ArrowDown" ? 1 : -1) + kRes.length) % kRes.length; pintarBusca(); }
  } else if (e.key === "Enter"){ e.preventDefault(); ejecutarBusca(kMarcada); }
});
$("kres").addEventListener("click", e => {
  const b = e.target.closest("[data-k]");
  if (b) ejecutarBusca(+b.dataset.k);
});
$("kdlg").addEventListener("click", e => { if (e.target === $("kdlg")) $("kdlg").close(); });
addEventListener("keydown", e => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k"){ e.preventDefault(); abrirBusca(); }
});

if ("serviceWorker" in navigator) navigator.serviceWorker.register("sw.js").catch(() => {});

/* ---------- init ---------- */
PerfilVista.iniciar();
ConfigVista.iniciar();
ReglasUI.iniciar();

/* Tecnologías y Mis reglas viven en UN solo DOM que se muda: a la vista
   cuando entrás por el menú, al diálogo cuando las abrís desde el
   combinador. Mismo contenido, cero duplicación. */
function techMontar(modo){
  const c = $("techCuerpo");
  if (modo === "popup"){ $("techdlg").appendChild(c); c.classList.remove("como-vista"); }
  else { $("slotTech").appendChild(c); c.classList.add("como-vista"); }
}
function reglasMontar(modo){
  const c = $("reglasCuerpo");
  if (modo === "popup"){ $("reglasdlg").appendChild(c); c.classList.remove("como-vista"); }
  else { $("slotReglas").appendChild(c); c.classList.add("como-vista"); }
}
const VISTA_HOOKS = {
  tecnologias(){ if ($("techdlg").open) $("techdlg").close(); techMontar("vista"); renderTech(); },
  reglas(){ if ($("reglasdlg").open) $("reglasdlg").close(); reglasMontar("vista"); ReglasUI.abrir(false); }
};
// si venís desde el link de la guía, abrimos el configurador directo
if (sessionStorage.getItem("sdd-abrir-reglas")){
  sessionStorage.removeItem("sdd-abrir-reglas");
  ReglasUI.abrir();
}
readURL();
render();
renderRoadmap();
renderSel();
App.iniciar();

// Sugerencias: el catálogo salta a la card, las tecnologías la marcan directo.
Buscador.sugerir({
  input: $("q"), caja: $("qsug"), datos: () => CARDS, campo: "t",
  detalle: x => x.c,
  alElegir: x => { $("q").value = x.t; catPage = 1; render(); }
});
Buscador.sugerir({
  input: $("tq"), caja: $("tqsug"), datos: () => TECH, campo: "n",
  detalle: x => [x.t, x.e].filter(Boolean).join(" · "),
  alElegir: x => { sel.add(x.n); renderSel(); renderTech(); $("tq").value = ""; techPage = 1; renderTech(); }
});

/* Lo que contestó en el onboarding precarga el combinador. Es todo el punto:
   si preguntamos y después no cambia nada, preguntamos al pedo. */
window.aplicarPerfil = function aplicarPerfil(p){
  if (p.nivel) $("clvl").value = p.nivel;
  if (p.perfil_sdd) $("cperf").value = p.perfil_sdd;
  if (p.interes && TYPES[p.interes]) $("ctype").value = p.interes;
  if (p.agente && p.agente !== "otro"){
    const espejos = {claude: "CLAUDE.md", codex: "AGENTS.md",
                     cursor: ".cursor/rules/", copilot: "copilot-instructions.md"};
    $("techhint").dataset.espejo = espejos[p.agente] || "";
  }
};

(async () => {
  Sesion.contarVisita(location.pathname);
  if (Sesion.activo()) Feedback.empezar();
  // El portón es quien arranca la sesión (y tapa la página si no hay);
  // acá solo se espera su resultado para no llamar a Sesion.iniciar() dos veces.
  const r = await (typeof Porton !== "undefined" ? Porton.arranque : Sesion.iniciar());

  // El link del mail vuelve acá con la sesión ya hecha: no se pide acceso de nuevo.
  if (r.error) avisar(r.error, true);
  else if (r.tipo === "signup")   avisar("¡Mail confirmado! Tu cuenta quedó activa y ya estás dentro.");
  else if (r.tipo === "magiclink") avisar("Listo, entraste. Ya podés guardar tus combinaciones.");
  else if (r.tipo === "recovery") {
    avisar("Link verificado. Elegí tu contraseña nueva para terminar.");
    modoAuth = "nueva"; pintarAuth(); $("authdlg").showModal(); $("authpass").focus();
  }

  if (Sesion.usuario()){
    const migradas = await Sesion.migrarLocales().catch(() => 0);
    const perfil = await Sesion.traerPerfil();
    if (perfil?.tema && !Tema.elegido()) Tema.aplicar(perfil.tema, false);
    if (migradas) avisar(`Subimos a tu cuenta ${migradas} combinación(es) que tenías guardadas en este navegador.`);
  }
  await renderGuardadas();
  await Perfil.iniciar(aplicarPerfil);
  cargarComboDelLink();
  Feedback.terminar();
})();
