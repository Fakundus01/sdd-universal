/* Tema compartido por todas las páginas.
   Oscuro por default: solo el toggle explícito lo cambia, y queda guardado.
   Otras partes del sitio pueden engancharse con Tema.alCambiar(fn) — así la
   cuenta de Supabase sincroniza la preferencia sin que este archivo la conozca. */
const Tema = (() => {
  const CLAVE = "sdd-theme";
  const oyentes = [];

  // El color de la barra del navegador tiene que coincidir con el fondo real
  // del tema, o en celular queda un borde de otro color arriba de todo.
  const FONDO = {dark: "#0b0f1f", light: "#f5f6fa", noche: "#05060d",
                 bosque: "#0c1613", contraste: "#000000", sepia: "#f4ecd8",
                 jungla: "#08160e", oceano: "#04121f", desierto: "#190f08"};

  function aplicar(t, avisar = true){
    document.documentElement.dataset.theme = t;
    const meta = document.getElementById("themecolor");
    if (meta) meta.content = FONDO[t] || FONDO.dark;
    const btn = document.getElementById("theme");
    if (btn) btn.setAttribute("aria-label", t === "light" ? "Cambiar a tema oscuro" : "Cambiar a tema claro");
    if (avisar) oyentes.forEach(f => f(t));
  }

  const actual = () => document.documentElement.dataset.theme || "dark";
  const elegido = () => localStorage.getItem(CLAVE);

  function iniciar(){
    aplicar(elegido() || "dark", false);
    const btn = document.getElementById("theme");
    if (btn) btn.onclick = () => {
      // El botón alterna claro/oscuro; si hay un tema de la paleta puesto,
      // vuelve a ese en vez de al oscuro genérico.
      const previo = localStorage.getItem("sdd-theme-previo");
      let next;
      if (actual() === "light" || actual() === "sepia") next = previo || "dark";
      else { localStorage.setItem("sdd-theme-previo", actual()); next = "light"; }
      localStorage.setItem(CLAVE, next);
      aplicar(next);
    };
  }

  /* Acento personalizado: pisa los tokens del tema con un color elegido.
     El texto sobre el acento se decide por luminancia, para que un acento
     claro no termine con letras blancas ilegibles. */
  function acento(hex){
    const r = document.documentElement.style;
    if (!hex){
      ["--accent", "--accent-ink", "--on-accent", "--accent-soft"].forEach(p => r.removeProperty(p));
      return;
    }
    const n = parseInt(hex.slice(1), 16);
    const lum = (0.299 * (n >> 16 & 255) + 0.587 * (n >> 8 & 255) + 0.114 * (n & 255)) / 255;
    r.setProperty("--accent", hex);
    r.setProperty("--accent-ink", hex);
    r.setProperty("--on-accent", lum > 0.62 ? "#101010" : "#ffffff");
    r.setProperty("--accent-soft", hex + "2b");
  }

  return {iniciar, aplicar, actual, elegido, acento, alCambiar: f => oyentes.push(f)};
})();

Tema.iniciar();
