/* Cuenta: sesión, combinaciones guardadas, avisos, entrar y contraseña.
 *
 * Parte del JS de index.html (D1): se carga como script clásico, en orden,
 * después de los módulos compartidos. Comparte el ámbito global con los
 * otros archivos de la página: lo que se ejecuta al cargar solo puede usar
 * lo declarado en este archivo o en los anteriores. */

/* ---------- sesión y combinaciones guardadas ---------- */
function estadoActual(){
  return {
    nombre: $("comboname").value.trim(),
    tipo: $("ctype").value,
    stack: $("cstack").value,
    nivel: $("clvl").value,
    perfil: $("cperf").value,
    playbooks: [...document.querySelectorAll("#pbs input:checked")].map(x => x.value),
    tecnologias: [...sel],
    ia: $("cia").checked
  };
}

function aplicarCombinacion(c){
  $("comboname").value = c.nombre || "";
  if (TYPES[c.tipo]) $("ctype").value = c.tipo;
  if (STACKS[c.stack]) $("cstack").value = c.stack;
  $("clvl").value = c.nivel || "PRO";
  ReglasUI.fijarPerfil(c.perfil || "ESTRICTO");
  $("cperf").value = ReglasUI.perfil();
  document.querySelectorAll("#pbs input").forEach(i => i.checked = (c.playbooks || []).includes(i.value));
  $("cia").checked = Boolean(c.ia);
  // Texto ajeno (link, base): una línea, sin control y con tope (M6, R26).
  sel.clear();
  (Array.isArray(c.tecnologias) ? c.tecnologias : []).map(Prompt.limpiarTecnologia).filter(Boolean)
    .slice(0, 40).forEach(t => sel.add(t));
  renderSel(); renderTech();
  $("go").click();
}

async function renderGuardadas(){
  const dentro = Sesion.usuario();
  $("guardadassub").textContent = dentro
    ? `Guardadas en tu cuenta (${dentro.email}): las vas a encontrar desde cualquier dispositivo.`
    : Sesion.activo()
      ? "Se guardan en este navegador. Si entrás con tu mail, viajan con vos a cualquier dispositivo."
      : "Se guardan en este navegador.";
  // el spinner solo cuando de verdad se va a la red: lo local es instantáneo
  if (Sesion.usuario())
    $("combolist").innerHTML = `<li class="cargando-centro" style="padding:14px"><span class="spin"></span> Recargando…</li>`;
  let lista = [];
  try { lista = await Sesion.listar(); } catch (e) { lista = []; }
  $("combolist").innerHTML = lista.length ? lista.map(c => {
    const det = [TYPES[c.tipo]?.name || c.tipo, c.nivel,
      (c.tecnologias || []).length ? `${c.tecnologias.length} tecnologías` : null]
      .filter(Boolean).join(" · ");
    return `<li><b>${esc(c.nombre)}</b><small>${esc(det)}</small>
      <span class="acc">
        <button type="button" data-usar="${esc(c.id)}">Usar</button>
        <button type="button" data-borrar="${esc(c.id)}" aria-label="Borrar ${esc(c.nombre)}">Borrar</button>
      </span></li>`;
  }).join("") : `<li><small>Todavía no guardaste ninguna. Armá una arriba y ponele nombre.</small></li>`;
  $("combolist").dataset.cache = JSON.stringify(lista);
}

$("comboRecargar").onclick = async () => {
  const b = $("comboRecargar");
  b.classList.add("girando");
  await renderGuardadas();
  b.classList.remove("girando");
  Feedback.toast(Sesion.usuario() ? "Combinaciones actualizadas desde tu cuenta" : "Lista actualizada",
                 {tipo: "ok", duracion: 2000, id: "recarga"});
};

$("combosave").onclick = async () => {
  const c = estadoActual();
  if (!c.nombre){ $("comboname").focus(); $("comboname").placeholder = "Ponele un nombre primero…"; return; }
  try { await Sesion.guardarCombinacion(c); await renderGuardadas(); }
  catch (e) { alert("No se pudo guardar: " + e.message); }
};

$("combolist").addEventListener("click", async e => {
  const lista = JSON.parse($("combolist").dataset.cache || "[]");
  const usar = e.target.closest("[data-usar]");
  if (usar){ const c = lista.find(x => x.id === usar.dataset.usar); if (c) aplicarCombinacion(c); return; }
  const bo = e.target.closest("[data-borrar]");
  if (bo){
    const c = lista.find(x => x.id === bo.dataset.borrar);
    if (!confirm(`¿Borrar "${c?.nombre}"? No se puede deshacer.`)) return;
    try { await Sesion.borrarCombinacion(bo.dataset.borrar); await renderGuardadas(); }
    catch (err) { alert("No se pudo borrar: " + err.message); }
  }
});

Sesion.alCambiar(u => {
  Shell.pintarCuenta(u, Perfil.datos());
  if (typeof ConfigVista !== "undefined") ConfigVista.chequearAdmin();
  if (typeof PerfilVista !== "undefined" && !$("perfilAva").closest(".vista").hidden) PerfilVista.refrescar();
});

// El botón del pie lleva al perfil: cerrar sesión vive ahí, junto con todo
// lo demás de la cuenta, en vez de escondido detrás de un confirm().
$("authbtn").onclick = () => Sesion.usuario() ? App.ir("perfil") : $("authdlg").showModal();
$("authx").onclick = () => $("authdlg").close();

/* --- avisos de la barra superior --- */
function avisar(texto, esError = false){
  $("avisotexto").textContent = texto;
  $("aviso").className = "aviso" + (esError ? " err" : "");
  $("aviso").hidden = false;
}
$("avisox").onclick = () => $("aviso").hidden = true;

/* --- entrar / contraseña nueva (el registro no existe: cuentas por admin) --- */
let modoAuth = "entrar";
function pintarAuth(){
  const nueva = modoAuth === "nueva";
  $("authmail").closest(".authform").querySelectorAll("label")[0].hidden = nueva;
  $("authmail").hidden = nueva;
  $("authtitle").textContent = nueva ? "Elegí una contraseña nueva" : "Tu cuenta";
  $("authsend").textContent = nueva ? "Guardar la contraseña" : "Entrar";
  $("authpass").autocomplete = nueva ? "new-password" : "current-password";
  $("authhint").textContent = nueva
    ? "Elegí algo de 8 caracteres o más. No la reutilices de otro sitio."
    : "";
  $("autholvide").hidden = nueva;
  $("authmsg").className = "authmsg"; $("authmsg").textContent = "";
}
pintarAuth();

/* Cambiar la contraseña con la sesión abierta (p. ej. pisar la provisoria
   que dio el admin). Lo usa Mi perfil; el diálogo vuelve a "entrar" al cerrarse
   para que un cambio abandonado no deje el formulario en un modo raro. */
window.abrirCambioPassword = () => {
  modoAuth = "nueva"; pintarAuth(); $("authdlg").showModal(); $("authpass").focus();
};
$("authdlg").addEventListener("close", () => { modoAuth = "entrar"; pintarAuth(); });

$("verpass").onclick = () => {
  const i = $("authpass");
  i.type = i.type === "password" ? "text" : "password";
  $("verpass").setAttribute("aria-label",
    i.type === "password" ? "Mostrar la contraseña" : "Ocultar la contraseña");
};

function decirAuth(clase, texto){
  const m = $("authmsg");
  m.className = "authmsg " + clase;
  m.textContent = texto;
}

async function conBoton(textoMientras, fn){
  const btn = $("authsend"), original = btn.textContent;
  $("authmsg").className = "authmsg"; $("authmsg").textContent = "";
  btn.disabled = true; btn.textContent = textoMientras;
  try { await fn(); }
  catch (err) { decirAuth("err", err.message); }
  finally { btn.disabled = false; btn.textContent = original; }
}

$("authform").onsubmit = e => {
  e.preventDefault();
  const email = $("authmail").value.trim(), pass = $("authpass").value;
  if (modoAuth === "nueva") {
    conBoton("Guardando…", async () => {
      await Sesion.cambiarPassword(pass);
      decirAuth("ok", "Contraseña actualizada. Ya podés usarla la próxima vez.");
      $("authpass").value = "";
      setTimeout(() => { $("authdlg").close(); modoAuth = "entrar"; pintarAuth(); }, 1200);
    });
  } else {
    conBoton("Entrando…", async () => {
      await Sesion.entrar(email, pass);
      decirAuth("ok", "¡Hola de nuevo!");
      await renderGuardadas();
      setTimeout(() => $("authdlg").close(), 700);
    });
  }
};

$("autholvide").onclick = () => {
  const email = $("authmail").value.trim();
  if (!email) { $("authmail").focus(); return decirAuth("err", "Escribí tu mail primero."); }
  conBoton("Mandando…", async () => {
    await Sesion.recuperar(email);
    decirAuth("ok", "Si ese mail tiene cuenta, te llega un link para poner una contraseña nueva.");
  });
};
