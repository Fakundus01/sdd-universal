/* Portón de entrada: el sitio es privado.
 *
 * Mientras no haya sesión, una tapa opaca cubre la página entera y solo
 * ofrece entrar. Los registros están cerrados: las cuentas las da de alta
 * el administrador en Supabase (Add user → Auto Confirm), así que acá no
 * hay "crear cuenta" ni magic link (crearía usuarios).
 *
 * Honestidad técnica: esto esconde la INTERFAZ, no los archivos. El sitio
 * es estático, así que quien tenga la URL exacta de un MD puede bajarlo
 * igual. Para el objetivo actual (que no lo encuentre gente de pasada, ni
 * lo indexe Google) alcanza; protección real requiere un servidor delante.
 *
 * Degradación: sin supabase-config no hay contra qué validar, así que no
 * hay portón (igual que el resto de la app degrada a localStorage).
 */
const Porton = (() => {
  const activo = () => typeof SUPABASE !== "undefined" && Boolean(SUPABASE?.url && SUPABASE?.key);

  // Carpeta real de este script: sirve para volver a index.html desde
  // páginas que viven en otro nivel (el tablero está en la raíz).
  const DIR = (document.currentScript?.src || "").replace(/[^/]*$/, "");

  let tapa = null;

  function css(){
    const s = document.createElement("style");
    s.textContent = `
      .porton-tapa{position:fixed;inset:0;z-index:99999;display:flex;align-items:center;
        justify-content:center;padding:20px;background:var(--bg,#0b0f1f)}
      .porton-caja{width:min(420px,94vw);background:var(--card,#11162a);
        border:1px solid var(--line,#252b45);border-radius:18px;padding:30px 28px;
        color:var(--ink,#e8eaf6);font-family:inherit}
      .porton-caja h1{font-size:1.2rem;letter-spacing:-.02em;margin:0 0 6px}
      .porton-caja p.s{font-size:.85rem;color:var(--muted,#8b91b3);margin:0 0 18px;line-height:1.55}
      .porton-caja label{display:block;font-size:.76rem;font-weight:700;
        color:var(--ink-soft,#c7cbe6);margin:11px 0 5px}
      .porton-caja input{width:100%;box-sizing:border-box;padding:11px 13px;
        border:1px solid var(--line-strong,#333a5e);border-radius:10px;
        background:var(--bg-soft,#0e1327);color:var(--ink,#e8eaf6);
        font-family:inherit;font-size:.9rem}
      .porton-caja button.entrar{width:100%;margin-top:16px;padding:12px;border:0;
        border-radius:11px;background:var(--accent,#7b74f5);color:var(--on-accent,#fff);
        font-weight:700;font-size:.9rem;cursor:pointer;font-family:inherit}
      .porton-caja button.entrar:disabled{opacity:.6;cursor:wait}
      .porton-caja button.olvide{display:block;margin:12px auto 0;background:none;border:0;
        color:var(--accent-ink,#a9a4ff);font-size:.8rem;cursor:pointer;font-family:inherit}
      .porton-msg{font-size:.82rem;margin:10px 0 0;min-height:1.2em}
      .porton-msg.err{color:var(--red,#ff8f8f)}
      .porton-msg.ok{color:var(--green,#5ed88f)}
      .porton-caja p.pie{font-size:.76rem;color:var(--muted,#8b91b3);margin:18px 0 0;
        padding-top:14px;border-top:1px solid var(--line,#252b45);line-height:1.55}`;
    document.head.appendChild(s);
  }

  const ponerInert = si =>
    [...document.body.children].forEach(el => { if (el !== tapa) el.inert = si; });

  function cerrar(){
    if (tapa) return;
    // lo que haya quedado abierto (diálogos modales viven en el top layer,
    // por encima de la tapa) se cierra: sin sesión no queda nada usable
    document.querySelectorAll("dialog[open]").forEach(d => d.close());
    css();
    tapa = document.createElement("div");
    tapa.className = "porton-tapa";
    tapa.innerHTML = `
      <form class="porton-caja">
        <h1>🔒 SDD Hub</h1>
        <p class="s">Este sitio es de uso privado. Entrá con tu cuenta.</p>
        <label for="ptmail">Tu email</label>
        <input id="ptmail" type="email" required autocomplete="email" placeholder="vos@ejemplo.com">
        <label for="ptpass">Contraseña</label>
        <input id="ptpass" type="password" required autocomplete="current-password" placeholder="tu contraseña">
        <p class="porton-msg" id="ptmsg" role="status"></p>
        <button class="entrar" type="submit" id="ptok">Entrar</button>
        <button class="olvide" type="button" id="ptolvide">Olvidé mi contraseña</button>
        <p class="pie">Los registros están cerrados: las cuentas las crea el administrador.
        Si te falta la tuya, pedísela a quien te pasó este link.</p>
      </form>`;
    document.body.appendChild(tapa);
    ponerInert(true);
    // el shell agrega nodos después de que este script corre (asa de arrastre,
    // barra de progreso): se re-afirma el inert cuando el DOM está completo
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", () => { if (tapa) ponerInert(true); });

    const $ = id => tapa.querySelector("#" + id);
    const decir = (clase, texto) => { $("ptmsg").className = "porton-msg " + clase; $("ptmsg").textContent = texto; };

    tapa.querySelector("form").onsubmit = async e => {
      e.preventDefault();
      const b = $("ptok");
      b.disabled = true; b.textContent = "Entrando…";
      try {
        await Sesion.entrar($("ptmail").value.trim(), $("ptpass").value);
        decir("ok", "¡Hola! Cargando…");
        // recarga limpia: toda la página se inicializa ya con la sesión puesta
        location.reload();
      } catch (err) {
        decir("err", err.message);
        b.disabled = false; b.textContent = "Entrar";
      }
    };

    $("ptolvide").onclick = async () => {
      const email = $("ptmail").value.trim();
      if (!email) { $("ptmail").focus(); return decir("err", "Escribí tu mail primero."); }
      try {
        await Sesion.recuperar(email);
        decir("ok", "Si ese mail tiene cuenta, le llega un link para elegir contraseña nueva. Si no llega, avisale al administrador.");
      } catch (err) { decir("err", err.message); }
    };

    $("ptmail").focus();
  }

  function abrir(){
    if (!tapa) return;
    ponerInert(false);
    tapa.remove();
    tapa = null;
  }

  async function iniciar(){
    if (!activo()) return {usuario: null};
    // si la sesión se cierra en cualquier momento, el portón vuelve solo
    Sesion.alCambiar(u => { if (!u) cerrar(); });
    cerrar();
    const r = await Sesion.iniciar();
    if (Sesion.usuario()){
      abrir();
      // El link de recupero puede caer en cualquier página; el formulario
      // para elegir contraseña nueva vive solo en la app principal.
      if (r.tipo === "recovery" && !document.getElementById("authdlg"))
        location.href = DIR + "index.html";
    }
    // sin usuario, la tapa queda puesta: no hay más nada que hacer acá
    return r;
  }

  return {arranque: iniciar(), abrir};
})();
