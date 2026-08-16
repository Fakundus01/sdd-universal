/* Buscador con sugerencias.
 *
 * El problema que resuelve: escribir "py" y no ver Python hasta scrollear.
 * Antes se filtraba con includes() y se mostraba en el orden del catálogo,
 * así que "py" traía primero cualquier cosa que tuviera "py" en la mitad de
 * una palabra. Ahora se ordena por qué tan bien matchea y se sugiere arriba.
 */
const Buscador = (() => {
  const norm = s => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

  /* 0 = no matchea · 3 = el nombre empieza así · 2 = una palabra del nombre
     empieza así · 1 = aparece en el medio, o en la descripción. */
  function puntaje(texto, q){
    const t = norm(texto);
    if (!t) return 0;
    if (t.startsWith(q)) return 3;
    if (t.split(/[\s/+.\-·()]+/).some(p => p.startsWith(q))) return 2;
    return t.includes(q) ? 1 : 0;
  }

  /* Ordena por relevancia y, a igual relevancia, alfabéticamente:
     sin el desempate, el orden cambia solo entre búsquedas parecidas. */
  function filtrar(items, q, campos){
    const b = norm(q).trim();
    if (!b) return items.slice();
    return items
      .map(x => {
        const p = Math.max(...campos.map((c, i) => puntaje(x[c] || "", b) * (i === 0 ? 1 : 0.34)));
        return {x, p};
      })
      .filter(r => r.p > 0)
      .sort((a, b2) => b2.p - a.p || norm(a.x[campos[0]]).localeCompare(norm(b2.x[campos[0]])))
      .map(r => r.x);
  }

  const resaltar = (texto, q) => {
    const b = norm(q).trim();
    if (!b) return esc(texto);
    const i = norm(texto).indexOf(b);
    return i < 0 ? esc(texto)
      : esc(texto.slice(0, i)) + "<u>" + esc(texto.slice(i, i + b.length)) + "</u>" + esc(texto.slice(i + b.length));
  };

  /* Engancha un input a una lista de sugerencias navegable con el teclado. */
  function sugerir({input, caja, datos, campo, detalle, alElegir, max = 7}){
    let marcada = -1;

    const cerrar = () => { caja.innerHTML = ""; caja.hidden = true; marcada = -1; };

    function pintar(){
      const q = input.value.trim();
      if (q.length < 2) return cerrar();
      const res = filtrar(datos(), q, [campo]).slice(0, max);
      if (!res.length) return cerrar();
      caja.innerHTML = res.map((x, i) => `
        <button type="button" data-i="${i}" class="${i === marcada ? "marcada" : ""}">
          <b>${resaltar(x[campo], q)}</b><small>${esc(detalle ? detalle(x) : "")}</small>
        </button>`).join("");
      caja.hidden = false;
      caja._res = res;
    }

    input.addEventListener("input", () => { marcada = -1; pintar(); });
    input.addEventListener("focus", pintar);
    input.addEventListener("blur", () => setTimeout(cerrar, 140));

    input.addEventListener("keydown", e => {
      if (caja.hidden) return;
      const n = caja._res?.length || 0;
      if (e.key === "ArrowDown" || e.key === "ArrowUp"){
        e.preventDefault();
        marcada = (marcada + (e.key === "ArrowDown" ? 1 : -1) + n) % n;
        pintar();
      } else if (e.key === "Enter" && marcada >= 0){
        e.preventDefault();
        alElegir(caja._res[marcada]); cerrar();
      } else if (e.key === "Escape") cerrar();
    });

    caja.addEventListener("mousedown", e => {
      const b = e.target.closest("[data-i]");
      if (b){ e.preventDefault(); alElegir(caja._res[+b.dataset.i]); cerrar(); }
    });

    return {cerrar, pintar};
  }

  return {filtrar, puntaje, resaltar, sugerir, norm};
})();
