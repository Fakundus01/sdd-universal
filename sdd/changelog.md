# changelog.md · SDD Hub

Semver `MAJOR.MINOR.PATCH` (R13). Acompaña la versión del paquete. No se borra nunca.

---

## [0.29.0] — 2026-08-17

### Modificado
- **Transferencia inversa desde IDA** (la app hermana, nacida del mismo Word base), entrada por R20 como S26 y S27:
  - **R16 ahora bloquea**: los controles críticos de `security.md` frenan el done y el release; el override existe pero solo con justificación registrada en `decisions.md`. Antes R27 clasificaba y `security.md` documentaba, pero nada impedía cerrar con un crítico pendiente — documentar sin frenar es tranquilidad, no seguridad. Actualizado en master ES/EN, COMPACT ES/EN, `reglas.js` y tablero.
  - **`.gitattributes` en el scaffold** con `merge=union` para `sdd/changelog/*`, `sdd/status.md` y `CHANGELOG.md`: con N agentes o personas en paralelo esos archivos chocaban en cada merge. Entra al ZIP del Combinador y al árbol de vista previa.
- `scenarios.md`: S24 y S25 se unieron a la tabla principal — habían quedado como filas sueltas separadas por líneas en blanco (no renderizaban como tabla).

---

## [0.28.0] — 2026-08-17

### Agregado
- **11 skills sueltas** para Claude, útiles con o sin SDD: `plan-primero`, `menos-tokens`, `codigo-en-clases`, `commit-prolijo`, `revisar-antes`, `arreglar-error`, `tests-minimos`, `explicame-simple`, `limpiar-repo`, `resumen-sesion`, `datos-ajenos`. Chicas a propósito: una cosa por skill, legibles en una pasada. En Manuales van **paginadas de a 6** y el ZIP (`skills-claude.zip`) trae las 14 (SDD + sueltas) en `.claude/skills/`.
- **Cambiar contraseña desde Mi perfil**, con la sesión abierta: pensado para pisar la clave provisoria que da el administrador al crear la cuenta. El diálogo vuelve al modo «entrar» al cerrarse.

### Modificado
- **Cerrar sesión pone el portón al instante**: `porton.js` se suscribe a `Sesion.alCambiar` y tapa la página en cuanto la sesión muere (incluye cerrar los diálogos abiertos, que viven en el top layer por encima de la tapa). El ZIP del proyecto sigue trayendo solo las 3 skills del SDD — las sueltas se bajan desde Manuales para no engordar cada paquete.

---

## [0.27.0] — 2026-08-17

### Agregado
- **R28 · DEPENDENCIA-JUSTIFICADA**, nacida de la fila S25 de `scenarios.md` como manda R20: cada dependencia nueva se justifica en una línea en `decisions.md`, y R19 audita sobre ese registro. Entra en master (ES y EN), COMPACT (ES y EN), `reglas.js` y el tablero. De paso se encontró y arregló que **R27 nunca había llegado a `reglas.js`**: la web mostraba 26 reglas mientras el master tenía 27.
- Catálogo de tecnologías: **101 → 120**, reforzando justo lo que estaba flaco (bases de datos ×5, runtimes, escritorio, lenguajes, front, infra, IA). Conteos sincronizados en `tecnologias.md`, `tecnologias.js` y los textos de la web.
- Tipo de proyecto nuevo: **«Compendio de datos abiertos (D&D y afines)»** — el caso de consumir un repo público gigante y convertirlo en API propia. Con su playbook **`consumir-api-externa`**: copia propia normalizada en vez de proxy en vivo, licencia y atribución antes de mostrar nada, sincronización con registro.
- **Recorrido guiado** por las secciones del menú, desde Configuración: nueve pasos que navegan de verdad cada vista.
- Guía: sección nueva «El flujo completo, de punta a punta» (web → ZIP → cuestionario → OK → HANDBACK), en `guia.html` y `GUIDE.md`.

### Corregido
- **El Combinador ahora sigue el tema** (reporte con captura): estaba construido sobre los tokens `--panel` fijos más colores hardcodeados (`#22c55e`, `#4f46e5`, `#fff`), y en los temas claros quedaba un bloque negro con botones de otra paleta. Todo pasado a tokens del tema, incluida la sección «Mis combinaciones».
- Links a otros dominios (GitHub, etc.) abren en **pestaña nueva** — un solo handler en el shell, en captura, para todas las páginas.

---

## [0.26.0] — 2026-08-17

### Modificado
- **El sitio es privado**: `porton.js` tapa todas las páginas (app, guía, demo, tablero, admin) hasta que haya sesión. Solo login — el registro se sacó de la interfaz y se cierra del lado del servidor en Supabase (Auth → desactivar «Allow new users to sign up»); las cuentas las crea el admin con Add user → Auto Confirm. El magic link también se fue: con `create_user` creaba cuentas, justo lo que queremos cerrar.
- `noindex, nofollow` en todas las páginas + `robots.txt` con `Disallow: /`.
- Decisión documentada con honestidad: el portón esconde la **interfaz**, no los archivos — un estático no puede ocultar sus MD a quien tenga la URL exacta. Para el objetivo (uso interno, sin aparecer en buscadores) alcanza; protección real necesitaría un servidor delante (Vercel paga, o Cloudflare Access).
- Degradación intacta: sin `supabase-config` no hay portón, igual que el resto degrada a localStorage.

---

## [0.25.0] — 2026-08-17

### Agregado
- **`skills/` en el paquete**: tres atajos para Claude Code — `/sdd-arranque` (cuestionario + MDs + OK), `/sdd-ciclo` (loop con HANDBACK) y `/sdd-auditoria` (R19). Envuelven los prompts del master **sin duplicarlos**: la fuente de verdad sigue siendo `SDD-MASTER.md`, y se marcan solo-Claude para que el paquete siga agnóstico (R22).
- **Vista «Manuales»**: los playbooks se leen y bajan desde la web (antes solo viajaban dentro del ZIP), más el apartado de skills con su ZIP suelto (`skills-claude-sdd.zip`, se descomprime en la raíz de un repo que ya anda).
- **Descarga rápida por card**: cada proyecto del catálogo tiene «📦 Descargar ZIP» con popup de tres opciones (nuevo/existente, nivel, skills) y defaults razonables; «Afinar» sigue llevando al Combinador. El popup presta los campos del Combinador para armar el prompt y los devuelve como estaban.
- El ZIP del Combinador puede incluir `.claude/skills/` (checkbox, marcado por defecto), con su fila en el LEEME y en el árbol de vista previa.

---

## [0.24.0] — 2026-08-17

### Modificado
- La vista **Tecnologías** aprovecha el ancho: el contenedor se estira a 1380px y la lista pasa a **dos columnas** (una sola en pantallas angostas), con **páginas de 8** en vez de la columna de 20 con scroll. El popup del Combinador sigue en 20, porque ahí el scroll dentro de la ventana funciona bien.
- **Mis reglas** pagina **de a 5** (vista y popup comparten la lógica: es el mismo DOM). Los selects de la vista van en fila con aire — dentro de la pcard heredaban `width:100%` y quedaban apilados sin separación.
- El interruptor de cada regla muestra **ON y OFF apilados** con el estado activo resaltado (OFF en rojo cuando está apagada): viendo los dos estados se entiende que se puede tocar. Las reglas fijas conservan la pastilla única — ofrecer un OFF que no existe sería mentir.

---

## [0.23.0] — 2026-08-15

### Modificado
- **Tecnologías** y **Mis reglas** pasan a ser vistas al entrar por el menú, y siguen siendo popups desde el Combinador. Un solo DOM que se **muda de contenedor** según el origen — la alternativa (duplicar el markup) es la misma trampa de dos fuentes de verdad que ya nos mordió con el tema (ADR-011).
- La card del catálogo y el buscador global ahora llevan a las vistas; los botones del Combinador conservan el popup, que es donde el contexto lo pide.

---

## [0.22.0] — 2026-08-15

### Agregado
- **Color de acento propio**: seis presets + selector libre. El texto sobre el acento se decide por luminancia, para que un acento claro no termine con letras blancas ilegibles (`Tema.acento`).
- **Intensidad del fondo animado** (sutil/media/alta), **velocidad de las animaciones** (tranquila/normal/rápida — mueve `--velf`, que escala fondos y logos) y **ancho del contenido** (angosto/normal/amplio).
- Segunda capa animada por tema: **estrellas** en Medianoche (que ahora también tiene aurora), **olas** en Océano, **luciérnagas** en Bosque y Jungla, y el **calor que sube** en Desierto. Todas respetan la intensidad, la velocidad, el apagado de animaciones y `prefers-reduced-motion`.

### Modificado
- «Mi perfil» salió del menú lateral: el avatar de la barra superior ya lleva ahí, y estaba duplicado.

---

## [0.21.0] — 2026-08-15

### Agregado
- **Feedback de carga** (`web/feedback.js`): barra de progreso arriba, toasts de estado y spinner, en un solo módulo para que cada feature no invente el suyo. «Descargando X…» en toda descarga, «Armando tu paquete…» con **progreso real** en el `.zip` (el armador sabe cuántos archivos busca), spinner en el preview y en el panel de admin, y botón **⟳ recargar** en Mis combinaciones.
- Tipos de proyecto **Videojuego en Godot** y **Videojuego en Unity**, con las decisiones de cada engine: escenas como texto y lógica en scripts (Godot); Force Text, `.meta` versionados y `Library/` afuera (Unity). El tipo genérico `videojuego` queda sin card para no romper links compartidos viejos.

---

## [0.20.0] — 2026-08-15

### Agregado
- **Vista previa de los MD** (F15): el 👁 de cada card y de la lista del combinador abre el archivo renderizado adentro de la app, con el tema puesto, antes de bajarlo. Los links internos entre MD navegan dentro del preview en vez de sacarte al crudo.
- `web/md.js`: renderer de Markdown propio — un subset de lo que usan nuestros archivos, con todo el documento escapado antes de transformar. Cero dependencias (C2).

### Corregido
- El renderer aprendió tablas y bloques de código **indentados dentro de listas** (los playbooks los anidan en pasos numerados): antes se aplanaban como texto.
- El centinela de los code spans pasó de NUL crudo (git trataba el archivo como binario) a secuencia de escape ` `.

---

## [0.19.0] — 2026-08-15

### Agregado
- **Compartir combinaciones por link**: `#/combinador?c=<combinación codificada>` — abrirlo restaura tipo, stack, nivel, playbooks y tecnologías, y genera el prompt.
- **Buscador global** (Ctrl+K o la lupa): busca a la vez en las cards, las 101 tecnologías, las 27 reglas y las páginas, con ranking por relevancia.
- **Instalable como app** (PWA): manifest + íconos. El service worker no cachea a propósito — acabamos de pelear contra un `tema.js` viejo de caché, y un SW cache-first es la versión industrial de ese problema.
- **El núcleo en inglés**: `SDD-MASTER-EN.md` y `SDD-COMPACT-EN.md` en el catálogo (cierra D4).

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
