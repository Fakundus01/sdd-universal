/* Tema compartido por todas las páginas.
   Oscuro por default: solo el toggle explícito lo cambia, y queda guardado.
   Otras partes del sitio pueden engancharse con Tema.alCambiar(fn) — así la
   cuenta de Supabase sincroniza la preferencia sin que este archivo la conozca. */
const Tema = (() => {
  const CLAVE = "sdd-theme";
  const oyentes = [];

  function aplicar(t, avisar = true){
    document.documentElement.dataset.theme = t;
    const meta = document.getElementById("themecolor");
    if (meta) meta.content = t === "light" ? "#f5f6fa" : "#0b0f1f";
    const btn = document.getElementById("theme");
    if (btn) btn.setAttribute("aria-label", t === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro");
    if (avisar) oyentes.forEach(f => f(t));
  }

  const actual = () => document.documentElement.dataset.theme || "dark";
  const elegido = () => localStorage.getItem(CLAVE);

  function iniciar(){
    aplicar(elegido() === "light" ? "light" : "dark", false);
    const btn = document.getElementById("theme");
    if (btn) btn.onclick = () => {
      const next = actual() === "light" ? "dark" : "light";
      localStorage.setItem(CLAVE, next);
      aplicar(next);
    };
  }

  return {iniciar, aplicar, actual, elegido, alCambiar: f => oyentes.push(f)};
})();

Tema.iniciar();
