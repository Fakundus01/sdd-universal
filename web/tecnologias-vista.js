/* Tecnologías: la vista/popup, la paginación reutilizable y mover ventanas.
 *
 * Parte del JS de index.html (D1): se carga como script clásico, en orden,
 * después de los módulos compartidos. Comparte el ámbito global con los
 * otros archivos de la página: lo que se ejecuta al cargar solo puede usar
 * lo declarado en este archivo o en los anteriores. */

/* ---------- catálogo de tecnologías ---------- */
const sel = new Set();
const dlg = $("techdlg");

(() => {
  const cats = [...new Set(TECH.map(t => t.c))];
  const fams = [...new Set(TECH.map(t => t.f).filter(Boolean))]
    .sort((a, b) => TECH.filter(t => t.f === b).length - TECH.filter(t => t.f === a).length);
  Combo.crear($("tcat"), [{v: "", t: "Todas las categorías"},
    ...cats.map(c => ({v: c, t: c, x: String(TECH.filter(t => t.c === c).length)}))],
    () => { techPage = 1; renderTech(); });
  Combo.crear($("tfam"), [{v: "", t: "Todos los ecosistemas"},
    ...fams.map(f => ({v: f, t: f, x: String(TECH.filter(t => t.f === f).length)}))],
    () => { techPage = 1; renderTech(); });
  $("techsub").textContent = `${TECH.length} tecnologías en ${cats.length} categorías. Marcá las que quieras usar y entran al prompt de arranque. Elegir no reemplaza justificar: tu agente igual tiene que decirte si la combinación sirve para tu proyecto (R12).`;
  $("techhint").textContent = `${TECH.length} disponibles · opcional`;
})();

/* ---------- paginación reutilizable ---------- */
function pager(total, page, perPage, onGo){
  const paginas = Math.ceil(total / perPage);
  if (paginas <= 1) return "";
  const nums = [];
  for (let p = 1; p <= paginas; p++){
    if (p === 1 || p === paginas || Math.abs(p - page) <= 1) nums.push(p);
    else if (nums[nums.length - 1] !== "…") nums.push("…");
  }
  const desde = (page - 1) * perPage + 1, hasta = Math.min(page * perPage, total);
  return `<nav class="pager" aria-label="Paginación" data-go="${onGo}">
    <button type="button" data-p="${page - 1}"${page === 1 ? " disabled" : ""} aria-label="Página anterior">‹</button>
    ${nums.map(n => n === "…" ? `<span class="dots">…</span>`
      : `<button type="button" data-p="${n}"${n === page ? ' aria-current="true"' : ""}
           aria-label="Página ${n}">${n}</button>`).join("")}
    <button type="button" data-p="${page + 1}"${page === paginas ? " disabled" : ""} aria-label="Página siguiente">›</button>
    <span class="info">${desde}–${hasta} de ${total}</span>
  </nav>`;
}
document.addEventListener("click", e => {
  const b = e.target.closest(".pager button[data-p]");
  if (!b || b.disabled) return;
  const destino = b.closest(".pager").dataset.go;
  const p = +b.dataset.p;
  if (destino === "tech"){ techPage = p; renderTech(); $("techlist").scrollTop = 0; }
  else if (destino === "reglas"){ ReglasUI.irPagina(p); }
  else if (destino === "manskills"){ manSkillsPag = p; renderManSkills(); }
  else { catPage = p; render(); $("catalogo").scrollIntoView({behavior:"smooth", block:"start"}); }
});

function techRows(){
  const q = $("tq").value.trim(),
        c = $("tcat").dataset.v, f = $("tfam").dataset.v, onlyOS = $("tos").checked;
  const base = TECH.filter(t => (!c || t.c === c) && (!f || t.f === f) && (!onlyOS || t.os));
  return Buscador.filtrar(base, q, ["n", "u", "e", "t"]);
}

/* En el popup entran 20 porque hay scroll; la vista muestra 8 y pagina,
   que a pantalla completa se lee mejor que una columna eterna. */
const techPorPagina = () => $("techCuerpo").classList.contains("como-vista") ? 8 : 20;
let techPage = 1;

/* Lo que se busca y no está en el catálogo no se pierde: se puede sumar
   igual, y va al prompt marcado como «fuera del catálogo» para que el
   agente lo verifique (Prompt.separarTecnologias). */
const enCatalogo = n => TECH.some(t => t.n.toLowerCase() === String(n).trim().toLowerCase());
function botonSumar(){
  const q = $("tq").value.trim();
  if (!q || q.length > 60 || enCatalogo(q) || [...sel].some(n => n.toLowerCase() === q.toLowerCase())) return "";
  return `<button class="tsumar" type="button" data-sumar="${esc(q)}">＋ Sumar «${esc(q)}» igual
    <small>No está en el catálogo: entra al prompt marcada, para que tu agente la verifique antes de usarla.</small></button>`;
}

function renderTech(){
  const list = techRows();
  const POR = techPorPagina();
  const paginas = Math.max(1, Math.ceil(list.length / POR));
  if (techPage > paginas) techPage = paginas;

  if (!list.length){
    $("techlist").innerHTML = botonSumar() + `<p class="dlg-empty">Ninguna tecnología coincide con esos filtros.<br>El catálogo arranca con lo que ya relevamos y crece con casos reales (R20).</p>`;
  } else {
    const pagina = list.slice((techPage - 1) * POR, techPage * POR);
    // Con búsqueda activa el orden es por relevancia, así que agrupar por
    // categoría partiría el ranking en pedazos sin sentido.
    const agrupar = !$("tq").value.trim();
    let html = "", grupo = null;
    for (const t of pagina){
      if (agrupar && t.c !== grupo){ grupo = t.c; html += `<p class="dlg-grp">${esc(grupo)}</p>`; }
      const meta = [t.u, t.e].filter(Boolean).join(" · ");
      html += `<label class="trow${sel.has(t.n) ? " elegida" : ""}">
        <input type="checkbox" value="${esc(t.n)}"${sel.has(t.n) ? " checked" : ""}>
        <span class="tick" aria-hidden="true"></span>
        <span class="datos">
          <span class="nm">${esc(t.n)}</span>
          <span class="meta">${esc(meta)}</span>
        </span>
        ${t.os ? '<span class="os" title="Open source">OSS</span>' : ""}
      </label>`;
    }
    $("techlist").innerHTML = botonSumar() + html + pager(list.length, techPage, POR, "tech");
  }
  const n = sel.size;
  $("techsel").textContent = n === 0 ? "Ninguna elegida"
    : n === 1 ? "1 tecnología elegida" : `${n} tecnologías elegidas`;
  $("techCuantas").textContent = list.length === TECH.length
    ? `${TECH.length} tecnologías`
    : `${list.length} de ${TECH.length}`;
}

function renderSel(){
  $("selchips").innerHTML = [...sel].map(n => {
    const t = TECH.find(x => x.n.toLowerCase() === n.toLowerCase());
    const det = t ? t.e : "fuera del catálogo";
    return `<span class="selchip${t ? "" : " fuera"}"><b>${esc(n)}</b>${det ? `<small>${esc(det)}</small>` : ""}
      <button type="button" data-unsel="${esc(n)}" aria-label="Quitar ${esc(n)}">✕</button></span>`;
  }).join("");
  const fuera = [...sel].filter(x => !enCatalogo(x));
  $("techaviso").textContent = fuera.length
    ? `⚠ ${fuera.length === 1 ? `«${fuera[0]}» no está` : `${fuera.map(x => `«${x}»`).join(", ")} no están`} en el catálogo. No se descarta${fuera.length === 1 ? "" : "n"}: va${fuera.length === 1 ? "" : "n"} al prompt aparte, para que tu agente confirme qué ${fuera.length === 1 ? "es" : "son"} y si encaja${fuera.length === 1 ? "" : "n"}.`
    : "";
  const n = sel.size;
  $("techhint").textContent = n === 0 ? `${TECH.length} disponibles · opcional`
    : n === 1 ? "1 elegida" : `${n} elegidas`;
}

$("techlist").addEventListener("change", e => {
  const cb = e.target.closest("input[type=checkbox]");
  if (!cb) return;
  cb.checked ? sel.add(cb.value) : sel.delete(cb.value);
  renderTech(); renderSel();
});
["tq","tos"].forEach(id => {
  $(id).addEventListener(id === "tq" ? "input" : "change", () => { techPage = 1; renderTech(); });
});
function openTech(){ techMontar("popup"); renderTech(); dlg.showModal(); $("tq").focus(); }
$("opentech").onclick = openTech;
$("techx").onclick = () => dlg.close();
$("techdone").onclick = () => dlg.close();
$("techclear").onclick = () => { sel.clear(); renderTech(); renderSel(); };
dlg.addEventListener("click", e => { if (e.target === dlg) dlg.close(); });

/* ---------- mover la ventana ---------- */
(() => {
  const head = $("dlghead");
  let drag = null;

  const recentrar = () => { dlg.style.left = dlg.style.top = dlg.style.margin = ""; };
  $("techrecenter").onclick = recentrar;

  head.addEventListener("pointerdown", e => {
    if (e.target.closest("button") || matchMedia("(max-width:640px)").matches) return;
    const r = dlg.getBoundingClientRect();
    drag = {dx: e.clientX - r.left, dy: e.clientY - r.top, w: r.width, h: r.height};
    // pasar de centrado (margin:auto) a posición explícita, sin que salte
    dlg.style.margin = "0";
    dlg.style.left = r.left + "px";
    dlg.style.top = r.top + "px";
    head.setPointerCapture(e.pointerId);
  });

  head.addEventListener("pointermove", e => {
    if (!drag) return;
    // que nunca se pueda arrastrar fuera de la pantalla
    const x = Math.min(Math.max(e.clientX - drag.dx, 8 - drag.w + 120), innerWidth - 120);
    const y = Math.min(Math.max(e.clientY - drag.dy, 0), innerHeight - 60);
    dlg.style.left = x + "px";
    dlg.style.top = y + "px";
  });

  const soltar = e => { if (drag){ drag = null; head.releasePointerCapture?.(e.pointerId); } };
  head.addEventListener("pointerup", soltar);
  head.addEventListener("pointercancel", soltar);

  // si cambia el tamaño de la ventana, lo movido puede quedar fuera: recentrar
  addEventListener("resize", recentrar);
})();
document.addEventListener("click", e => {
  const su = e.target.closest("[data-sumar]");
  if (su){ sel.add(su.dataset.sumar); $("tq").value = ""; techPage = 1; renderTech(); renderSel(); return; }
  const un = e.target.closest("[data-unsel]");
  if (un) { sel.delete(un.dataset.unsel); renderTech(); renderSel(); }
});
