/* Feedback de carga: la barra de progreso de arriba, los toasts de estado y
 * el spinner. Un solo lugar para "cargando / descargando / recargando", así
 * cada feature no inventa el suyo.
 *
 * La barra avanza sola hasta el 90% mientras no haya progreso real (nadie
 * sabe cuánto falta en un fetch), y quien SÍ conoce el total — el armado del
 * .zip, que baja N archivos — la fija con fijar(hecho/total).
 */
const Feedback = (() => {
  let barra = null, timer = null, valor = 0;
  let zona = null;

  function asegurarBarra(){
    if (barra) return;
    barra = document.createElement("div");
    barra.id = "cargabarra";
    barra.setAttribute("aria-hidden", "true");
    document.body.appendChild(barra);
  }

  function empezar(){
    asegurarBarra();
    clearInterval(timer);
    valor = 0.08;
    barra.style.opacity = "1";
    barra.style.transform = `scaleX(${valor})`;
    timer = setInterval(() => {
      valor = Math.min(0.9, valor + (0.95 - valor) * 0.08);
      barra.style.transform = `scaleX(${valor})`;
    }, 180);
  }

  function fijar(p){
    asegurarBarra();
    clearInterval(timer);
    valor = Math.max(valor, Math.min(1, p));
    barra.style.opacity = "1";
    barra.style.transform = `scaleX(${valor})`;
  }

  function terminar(){
    if (!barra) return;
    clearInterval(timer);
    barra.style.transform = "scaleX(1)";
    setTimeout(() => {
      barra.style.opacity = "0";
      setTimeout(() => { barra.style.transform = "scaleX(0)"; valor = 0; }, 300);
    }, 150);
  }

  /* Toasts: texto siempre por textContent — nunca HTML de datos. */
  function toast(texto, {tipo = "info", duracion = 2600, spinner = false, id = ""} = {}){
    if (!zona){
      zona = document.createElement("div");
      zona.id = "toasts";
      document.body.appendChild(zona);
    }
    let t = id ? document.getElementById("toast-" + id) : null;
    if (!t){
      t = document.createElement("div");
      if (id) t.id = "toast-" + id;
      zona.appendChild(t);
    }
    t.className = "toast t-" + tipo;
    t.innerHTML = "";
    if (spinner){
      const s = document.createElement("span");
      s.className = "spin";
      t.appendChild(s);
    } else if (tipo === "ok"){
      const s = document.createElement("span");
      s.className = "toast-ico";
      s.textContent = "✓";
      t.appendChild(s);
    } else if (tipo === "err"){
      const s = document.createElement("span");
      s.className = "toast-ico";
      s.textContent = "✕";
      t.appendChild(s);
    }
    const txt = document.createElement("span");
    txt.textContent = texto;
    t.appendChild(txt);
    clearTimeout(t._tm);
    if (duracion) t._tm = setTimeout(() => cerrar(t), duracion);
    return t;
  }

  function cerrar(t){
    if (typeof t === "string") t = document.getElementById("toast-" + t);
    if (!t) return;
    t.classList.add("chau");
    setTimeout(() => t.remove(), 260);
  }

  const spinnerHTML = (texto = "Cargando…") =>
    `<div class="cargando-centro"><span class="spin grande"></span><span>${texto}</span></div>`;

  return {empezar, fijar, terminar, toast, cerrar, spinnerHTML};
})();
