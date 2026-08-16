# changelog.md · SDD Hub

Semver `MAJOR.MINOR.PATCH` (R13). Acompaña la versión del paquete. No se borra nunca.

---

## [0.18.0] — 2026-08-15

### Corregido
- El tema no seguía a la guía, el demo ni el tablero. **Causa raíz:** dos fuentes de verdad (`sdd-prefs.tema` y `sdd-theme`); quedó una sola (ADR-011).
- El tablero en oscuro era ilegible: tarjetas con `#fff` fijo bajo texto claro. Todos los blancos pasaron a tokens, y los chips ya no desbordan la tarjeta.

### Agregado
- **Configuración** como vista con pestañas: temas (9, con Jungla/Océano/Desierto animables), tamaño de texto global, animación y sonido, secciones visibles, y pestaña **Admin** para el owner con los números del onboarding.
- Barra lateral comprimible: botón, o arrastre del borde; comprimida, sus accesos pasan a la barra superior.
- 3 logos animados a elección (Trazos, Órbita, Pulso), SVG + CSS, sin dependencias.
- Combos tipeables en los filtros de tecnologías: escribir «d» filtra la lista en el lugar.
- Métricas anónimas del onboarding (`tipo='perfil'`) para saber qué clase de gente llega — nunca quién.

### Modificado
- Recursos propios versionados (`?v=18`): sin build, es la única garantía de que un release no conviva con archivos viejos en caché.

---

## [0.8.0] — 2026-08-15

### Agregado
- Configurador de reglas (`web/reglas-ui.js`): las 26 reglas con toggle, perfil/modo/variante, overrides con parámetro y reglas propias, con descarga del `custom.md` generado.
- `web/reglas.js`, generado parseando la §4 del master (ADR-004).
- `web/guia.html`: la guía navegable con índice lateral y seguimiento de sección.
- `web/demo.html` + los dos widgets: la misma pantalla de reservas con y sin spec, con el código real leído del archivo en vivo.
- `sdd/`: esta carpeta. El proyecto pasa a tener su propia especificación.

### Modificado
- `base.css` y `tema.js`: los tokens, la barra y el pie salieron de `index.html` para compartirse con las tres páginas. Antes de sumar dos páginas más, la alternativa era triplicar el CSS.

### Corregido
- El seguimiento de sección de la guía no marcaba nada. **Causa raíz:** `IntersectionObserver` depende del pipeline de render y no dispara ni el callback inicial en contextos sin compositing. Reemplazado por cálculo de posiciones en el evento `scroll`, que además es verificable leyendo el DOM.

---

## [0.7.0] — 2026-08-15

### Agregado
- Cuentas de usuario con Supabase (`web/sesion.js`), magic link sin contraseñas, y combinaciones guardadas que se pueden reusar y borrar. Degradación completa a `localStorage` cuando no hay config.
- Paginación reutilizable: catálogo de a 12, tecnologías de a 20.
- Bloque desplegable "¿cuántos archivos tengo que descargar?": la confusión entre lo que descarga la persona y lo que genera el agente era del producto, no del usuario.

### Modificado
- Tema **oscuro por default**, sin consultar `prefers-color-scheme` (ADR-005).
- El diálogo de tecnologías se puede arrastrar y tiene botón de centrar; en celular pasa a pantalla completa.

### Corregido
- El diálogo aparecía pegado arriba a la izquierda. **Causa raíz:** el reset `*{margin:0}` pisaba el `margin:auto` del user-agent, que es lo que centra un `<dialog>` modal con `inset:0`. Corregido con `margin:auto` explícito y un comentario que explica por qué no se puede borrar (ADR-007).

---

## [0.6.0] — 2026-08-15

### Agregado
- Catálogo de 101 tecnologías con búsqueda y filtros por categoría, ecosistema y open source, importado del relevamiento propio.
- Lo elegido entra al prompt como bloque `TECNOLOGÍAS ELEGIDAS`, pidiéndole al agente que valide la combinación en vez de aceptarla sin más (R12).

### Modificado
- Los ecosistemas equivalentes se unifican en una familia para filtrar: `JS/TS`, `JavaScript` y `JavaScript/TypeScript` eran tres filtros para lo mismo.

---

## [0.5.0] — 2026-08-15

### Agregado
- Metaetiquetas OG, imagen de preview y favicon: hasta acá, compartir el link no mostraba nada.
- Hero con los tres caminos de arranque, sección de cuatro pasos y sección de roadmap plegada.
- El combinador pasa a listar los archivos exactos que hay que descargar para esa combinación.

### Modificado
- Los 9 pendientes salieron de la grilla principal: un tercio de las cards vendiendo aire desvalorizaba las que sí existen.
- Accesibilidad: `aria-pressed` en los filtros, labels en los campos, foco visible, y se eliminaron los botones deshabilitados que igual se podían tabular.

---

## [0.4.0] — 2026-08-15

### Agregado
- Primera versión del catálogo con filtros por categoría y nivel, y el combinador de prompt de arranque.
