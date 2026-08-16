/* La sección "Mi perfil": identidad, cómo trabaja la persona y su cuenta.
 *
 * Funciona logueado y sin cuenta. Sin cuenta muestra qué suma tener una,
 * pero nunca bloquea lo que ya se puede hacer: el límite es de persistencia,
 * no de funcionalidad (ver LIMITES).
 */
const PerfilVista = (() => {
  const $ = id => document.getElementById(id);
  const esc = s => String(s).replace(/[&<>"]/g, m => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[m]));

  // Lo único que cambia tener cuenta: cuántas combinaciones sobreviven y
  // si te siguen a otro dispositivo. El catálogo, las descargas, el ZIP,
  // el combinador, las reglas y las tecnologías andan igual sin entrar.
  const LIMITES = {combinacionesSinCuenta: 3};

  function pintarFormulario(){
    const p = Perfil.datos();
    $("perfilForm").innerHTML = Perfil.PASOS.map(paso => `
      <div class="pfila">
        <label class="plbl" for="pf-${paso.campo}">${esc(paso.titulo)}</label>
        <select id="pf-${paso.campo}" data-campo="${paso.campo}">
          ${paso.opciones.map(o =>
            `<option value="${esc(o.v)}"${p[paso.campo] === o.v ? " selected" : ""}>${esc(o.t)}</option>`).join("")}
        </select>
      </div>`).join("");
  }

  function pintarCuenta(){
    const u = Sesion.usuario();
    const caja = $("perfilCuenta");
    if (u){
      caja.innerHTML = `
        <p class="d">Entraste como <b>${esc(u.email)}</b>. Tus combinaciones y preferencias te siguen a cualquier dispositivo.</p>
        <ul class="pventajas">
          <li>✓ Combinaciones ilimitadas y sincronizadas</li>
          <li>✓ El tema y tus respuestas viajan con vos</li>
        </ul>
        <button class="btn b-alt" id="perfilSalir" type="button">Cerrar sesión</button>`;
      $("perfilSalir").onclick = async () => {
        if (!confirm("¿Cerrar sesión? Lo que tengas guardado sigue en tu cuenta.")) return;
        await Sesion.salir();
        refrescar(); if (window.renderGuardadas) renderGuardadas();
      };
    } else if (Sesion.activo()){
      caja.innerHTML = `
        <p class="d">Estás sin cuenta, y la app anda igual: el catálogo, las descargas, el paquete <code>.zip</code>, el combinador, las tecnologías y tus reglas funcionan completos.</p>
        <p class="d"><b>Lo único limitado</b> es lo que sobrevive: sin cuenta se guardan hasta <b>${LIMITES.combinacionesSinCuenta} combinaciones</b>, solo en este navegador. Si borrás los datos del navegador o entrás desde el celular, no están.</p>
        <ul class="pventajas">
          <li>✓ Combinaciones ilimitadas</li>
          <li>✓ Las encontrás desde cualquier dispositivo</li>
          <li>✓ Tu tema y tus respuestas viajan con vos</li>
        </ul>
        <button class="btn b-go" id="perfilEntrar2" type="button">Crear cuenta o entrar</button>`;
      $("perfilEntrar2").onclick = () => $("authdlg").showModal();
    } else {
      caja.innerHTML = `<p class="d">Las cuentas no están configuradas en esta instalación. Todo se guarda en este navegador. Ver <code>playbooks/supabase-auth.md</code>.</p>`;
      $("pcardCuenta").hidden = false;
    }
  }

  function refrescar(){
    const u = Sesion.usuario(), p = Perfil.datos();
    const ini = Shell.iniciales(u, p);
    const conIdentidad = Boolean(u || p.nombre?.trim());
    $("perfilAva").textContent = conIdentidad ? ini : "👤";
    $("perfilAva").classList.toggle("anon", !conIdentidad);
    $("perfilNombre").textContent = p.nombre?.trim() || (u ? u.email.split("@")[0] : "Invitado");
    $("perfilMail").textContent = u ? u.email : "Estás usando la app sin cuenta";
    $("perfilAccion").hidden = Boolean(u);
    $("perfilNombreInput").value = p.nombre || "";
    $("perfilNombreHint").textContent = `Tu avatar se ve como «${ini}».`;
    pintarFormulario();
    pintarCuenta();
    Shell.pintarCuenta(u, p);
  }

  function iniciar(){
    $("perfilAccion").onclick = () => $("authdlg").showModal();
    $("perfilRehacer").onclick = () => Perfil.abrir(p => { window.aplicarPerfil(p); refrescar(); });

    $("perfilForm").addEventListener("change", async e => {
      const sel = e.target.closest("[data-campo]"); if (!sel) return;
      const p = Perfil.datos();
      p[sel.dataset.campo] = sel.value;
      await Perfil.guardar();
      window.aplicarPerfil(p);
      refrescar();
    });

    let t = null;
    $("perfilNombreInput").addEventListener("input", e => {
      const p = Perfil.datos();
      p.nombre = e.target.value.slice(0, 60);
      clearTimeout(t);
      t = setTimeout(async () => {
        await Perfil.guardar();
        const ini = Shell.iniciales(Sesion.usuario(), p);
        const con = Boolean(Sesion.usuario() || p.nombre.trim());
        $("perfilAva").textContent = con ? ini : "👤";
        $("perfilAva").classList.toggle("anon", !con);
        $("perfilNombreHint").textContent = `Tu avatar se ve como «${ini}».`;
        $("perfilNombre").textContent = p.nombre.trim() || (Sesion.usuario() ? Sesion.usuario().email.split("@")[0] : "Invitado");
        Shell.pintarCuenta(Sesion.usuario(), p);
      }, 350);
    });
  }

  return {iniciar, refrescar, LIMITES};
})();
