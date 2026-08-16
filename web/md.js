/* Renderizador de Markdown mínimo, para la vista previa de los MD del paquete.
 *
 * No es un parser general: cubre exactamente lo que usan NUESTROS archivos
 * (títulos, tablas, bloques de código, citas, listas con casillas, negrita,
 * links) y nada más. Traer una librería para renderizar documentos que
 * escribimos nosotros contradiría el constraint C2 — y un subset propio
 * también significa cero sorpresas: lo que no soportamos, no existe acá.
 *
 * Seguridad: TODO el documento se escapa antes de transformar, así que ningún
 * HTML del archivo llega vivo al DOM. Los patrones operan sobre texto escapado.
 */
const Md = (() => {
  const esc = s => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // El centinela de los code spans es U+0000 (como secuencia de escape, no
  // como byte crudo: un NUL literal vuelve el archivo "binario" para git).
  // No puede aparecer en un archivo de texto, así que nunca choca con
  // contenido real — un " 1 " suelto sí chocaría.
  const SEP = "\u0000";

  function inline(t){
    const spans = [];
    t = t.replace(/`([^`]+)`/g, (_, c) => { spans.push(c); return SEP + (spans.length - 1) + SEP; });
    t = t.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    t = t.replace(/(^|[\s(¡¿«])\*([^*\n]+)\*(?=[\s).,;:!?»]|$)/g, "$1<i>$2</i>");
    t = t.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, txt, u) =>
      `<a href="${u}"${u.startsWith("http") ? ' target="_blank" rel="noopener"' : ""}>${txt}</a>`);
    t = t.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${spans[+i]}</code>`);
    return t;
  }

  const celdas = l => l.replace(/^\||\|$/g, "").split("|").map(c => c.trim());
  const esLista = l => /^\s*([-*]|\d+[.)])\s+/.test(l);

  function listas(L, i, out){
    const items = [];
    while (i < L.length && esLista(L[i])){
      const m = L[i].match(/^(\s*)([-*]|\d+[.)])\s+(.*)$/);
      items.push({nivel: m[1].length >= 2 ? 1 : 0, num: /\d/.test(m[2]), txt: m[3]});
      i++;
      // Continuación indentada del mismo ítem (líneas envueltas) — pero una
      // tabla o un fence indentados NO son continuación: cortan la lista y
      // los toma el bucle principal como bloque propio.
      while (i < L.length && /^\s{2,}\S/.test(L[i]) && !esLista(L[i]) &&
             !/^\s*(\||```)/.test(L[i])){
        items[items.length - 1].txt += " " + L[i].trim(); i++;
      }
    }
    const tag = items[0].num ? "ol" : "ul";
    let html = `<${tag}>`, sub = null;
    for (const it of items){
      const t = it.txt
        .replace(/^\[ \]\s*/, '<span class="md-chk">☐</span> ')
        .replace(/^\[x\]\s*/i, '<span class="md-chk">☑</span> ');
      if (it.nivel > 0){
        if (!sub){ sub = it.num ? "ol" : "ul"; html += `<${sub}>`; }
        html += `<li>${inline(t)}</li>`;
      } else {
        if (sub){ html += `</${sub}>`; sub = null; }
        html += `<li>${inline(t)}</li>`;
      }
    }
    if (sub) html += `</${sub}>`;
    out.push(html + `</${tag}>`);
    return i;
  }

  function bloques(L){
    const out = [];
    let i = 0;
    while (i < L.length){
      const l = L[i];
      if (!l.trim()){ i++; continue; }

      const lt = l.trimStart();

      // Fences, tolerando indentación: los playbooks los anidan en pasos.
      if (lt.startsWith("```")){
        const ind = l.length - lt.length;
        const buf = []; i++;
        while (i < L.length && !L[i].trimStart().startsWith("```")){
          buf.push(L[i].startsWith(" ".repeat(ind)) ? L[i].slice(ind) : L[i]); i++;
        }
        i++;
        out.push(`<pre class="md-pre"><code>${buf.join("\n")}</code></pre>`);
        continue;
      }

      const h = l.match(/^(#{1,6})\s+(.*)$/);
      if (h){ out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`); i++; continue; }

      if (/^(-{3,}|\*{3,})\s*$/.test(l)){ out.push("<hr>"); i++; continue; }

      // Tablas, también tolerando indentación.
      if (lt.startsWith("|") && i + 1 < L.length &&
          /^\s*\|?[\s:|-]+\|?\s*$/.test(L[i + 1]) && L[i + 1].includes("-")){
        const cab = celdas(lt); i += 2;
        const filas = [];
        while (i < L.length && L[i].trimStart().startsWith("|")){
          filas.push(celdas(L[i].trimStart())); i++;
        }
        out.push(`<div class="md-tabla"><table><thead><tr>${
          cab.map(c => `<th>${inline(c)}</th>`).join("")}</tr></thead><tbody>${
          filas.map(f => `<tr>${f.map(c => `<td>${inline(c)}</td>`).join("")}</tr>`).join("")
        }</tbody></table></div>`);
        continue;
      }

      if (l.startsWith("&gt;")){
        const buf = [];
        while (i < L.length && L[i].startsWith("&gt;")){
          buf.push(L[i].replace(/^&gt;\s?/, "")); i++;
        }
        out.push(`<blockquote>${bloques(buf).join("")}</blockquote>`);
        continue;
      }

      if (esLista(l)){ i = listas(L, i, out); continue; }

      // Párrafo: juntar líneas hasta el próximo bloque.
      const buf = [l];
      i++;
      while (i < L.length && L[i].trim() &&
             !L[i].trimStart().startsWith("```") && !L[i].trimStart().startsWith("|") &&
             !L[i].startsWith("&gt;") && !/^#{1,6}\s/.test(L[i]) &&
             !/^(-{3,}|\*{3,})\s*$/.test(L[i]) && !esLista(L[i])){
        buf.push(L[i]); i++;
      }
      out.push(`<p>${inline(buf.join(" "))}</p>`);
    }
    return out;
  }

  const render = md => bloques(esc(md.replace(/\r/g, "")).split("\n")).join("\n");

  return {render};
})();
