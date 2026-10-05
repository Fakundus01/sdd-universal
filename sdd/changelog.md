# changelog.md · SDD Hub

Semver `MAJOR.MINOR.PATCH` (R13). Acompaña la versión del paquete. No se borra nunca.

---

## [0.33.2] — 2026-10-05 · web

Lo que pidió la segunda vuelta del reviewer (0.33.1 aprobada, con un menor y nits), más material nuevo del owner sobre IA en el producto (OWASP Top 10 para LLMs 2025, RAG, agentes, evals).

### Corregido
- **R1 · Un anónimo elegía el `id` de `eventos`.** Con el INSERT sobre todas las columnas que Supabase da por defecto, ocupaba ids por delante de la secuencia, y el contador legítimo que caía ahí daba 409 y se perdía en silencio (`contar()` se traga el error). Ahora `anon` y `authenticated` solo tienen `INSERT (tipo, detalle)`: `id` y `dia` los pone la base. Idempotente, en `metricas.sql` (corre igual en `dev/`).
- **R2 · La lección de Pydantic contaba el síntoma al revés.** Con pydantic 2.13.5, el validador que se llama como su campo pasa a ser el **default**: un campo obligatorio pasa a opcional y el 500 sale al serializar. Corregido en FastAPI y Pydantic (`tecnologias.js`) y en `tecnologias.md`.
- Nit: se sacó del combinador la línea que sumaba R01 con CONFIANZA; con el configurador como única fuente, `Prompt.r01Apagada` ya lo resuelve.

### Agregado
- **pgvector y Embeddings** en el catálogo (130), con su lección: lo recuperado es dato, no instrucción (OWASP LLM01/04/08); el filtro por permisos va **antes** de buscar; cambiar el modelo de embeddings obliga a re-indexar. RAG en la entrada de Anthropic API.
- **El bloque de IA del prompt** pide recorrer la tabla OWASP LLM01–LLM10 de `seguridad.md` (N4) y anotar en `security.md` cuáles aplican, con control y test, y cuáles no y por qué. Y suma: si el agente va a actuar (publicar, mandar, cobrar), el que lee no es el que actúa, y lo sensible lleva aprobación humana.
- La card y Manuales del playbook `ia-en-el-producto` nombran RAG, agentes y evals. La card de escenarios dice 38 situaciones (S38).
- **Tests:** R1 y el barrido de todo lo que la web puede mandar contra el formato de `eventos` (`dev/tests`); pgvector/Embeddings, la lección de Pydantic y el bloque OWASP (`web/tests/combinador-ui.test.mjs`).

### Modificado
- `?v=33.2` en las cuatro páginas.
- `sdd/`: ADR-013 y contracts (qué columnas se insertan), testing, status, design.

### Limpieza de la base de dev
La sonda del reviewer dejó 11 filas en `eventos` de `dev/.data/` (ninguna en el repo): ids 351–354 (`juan.perez.30123456` como descarga y `md:`, `/juan.perez/dni-30123456|movil`, `interes:JuanPerez30123456`), 358–360 (`/web/|escritorio`, `ticketera\|escritorio`, `ticketera/py-react/PRO/nuevo`, `md:ia-en-el-producto.md`), 361–363 y 999999999 (`SDD-MASTER.md`; el 362 es el id ocupado por la sonda). Se borraron por id, más la 380 que dejó la prueba manual de R1 con `curl`.

### Verificado
- Rojo sobre `74ad57e`: `web/tests` 37 tests, 4 en rojo (N3 «37 situaciones» con S38 ya en `scenarios.md`, pgvector/Embeddings, la lección de Pydantic y el bloque OWASP); `dev/tests` 15, 1 en rojo (`insert con id → 201`). El barrido salió verde de entrada (cubre código que ya estaba bien): con un mutante del SQL que no acepta `-` en el stack, falla y nombra `py-react`.
- Verde: `web/tests` 37/37, `dev/tests` 15/15. Contra :4321 reiniciado: insert con `id` → 401, sin `id` → 201.

---

## [0.33.0] — 2026-10-05 · web

Lo que encontró usar el paquete en cuatro proyectos reales (landing, tienda, mesa de ayuda con IA y chatbot, todos FastAPI + React/Vite/TS), en la parte que vive en `web/`. El resto de la 0.33 (núcleo, arnés, playbooks) está en el changelog del paquete.

### Agregado
- **Stack «Python back + React/TS front»** (H1): FastAPI + Pydantic + pytest atrás, React + Vite + TypeScript + Vitest adelante, con `contracts.md` como única fuente de la API. El START-PROMPT del master lo daba de ejemplo y el combinador no lo tenía.
- **8 tecnologías** (H2/H10/H15): Vite, Vitest, pytest, Tailwind CSS, React Router, Mercado Pago, Stripe (categoría nueva: Pagos) y Anthropic API. 128 en total, en `tecnologias.js` y `tecnologias.md` a la vez. Campo opcional `a` con la **lección de proyectos reales**, que viaja al prompt con la tecnología: FastAPI (H17, el `Path(ge=1)` compartido que da 422 en otra ruta; se arregla con `Annotated`) y Anthropic API (SDK real sobre `httpx.MockTransport`, tope de gasto como reserva, modelos vigentes).
- **Lo que no está en el catálogo ya no se pierde** (H2): buscar algo que no existe ofrece «Sumar igual»; queda como chip punteado con aviso, y el prompt lo manda en un bloque aparte, `PEDIDAS QUE NO ESTÁN EN EL CATÁLOGO`, para que el agente lo verifique.
- **Tipo «Mesa de ayuda / ticketera»** (H14) con su card, y checkbox **«IA en el producto»** en el combinador: suma al prompt el nivel N4 (R26, tope reservado antes de llamar, salida como dato), la recomendación de modelo de R12 (salvo que esté apagada) y el playbook `ia-en-el-producto`, que entra solo a la lista y al ZIP. El chatbot lo tilda solo. Viaja en el link compartido y en las combinaciones guardadas (columna `ia` en `combinaciones`, idempotente).
- **Playbooks `ia-en-el-producto` y `go-live`** en el catálogo, Manuales, los checkboxes del combinador y el mapa del ZIP.
- **Reporte de outcomes en el panel** (D3, ADR-013, F22): O1, O2 y O4 de los últimos 30 días contra su meta, «sin datos» cuando no hay eventos, y O3 como manual con dónde anotarlo y la línea para `status.md`. Para O4, la visita guarda `|movil` o `|escritorio` calculado con `matchMedia("(pointer: coarse)")`; **nunca el user-agent**. `metricas.sql` suma, idempotente, el check `eventos_detalle_visita_check` y la vista `metricas_30_dias`.
- `web/prompt.js` y `web/metricas.js`: lógica pura, sin DOM, con tests (`combinador.test.mjs`, `metricas.test.mjs`).

### Corregido
- **Con `R01=OFF` el prompt seguía diciendo «primer commit (R01)» y «avisame que R01 es desactivable»** (H3). Ahora lee el configurador: con R01 apagada, o perfil CONFIANZA (que es R01=OFF según el master), dice `R01=OFF` y que commitee sin esperar el OK. El prompt además lista las reglas apagadas.
- **Modo LITE sin plantilla** (H4): `prompts/sdd-lite.md` viaja siempre en `sdd/prompts/` (el modo lo clasifica el agente, y el master y `harness.md` la citan), y con LITE elegido, o un tipo que ya es LITE, el prompt dice que `sdd/sdd-lite.md` se arma con ella.
- **`.gitattributes` del ZIP** (H5): suma `sdd/changelog.md merge=union` y `sdd/sdd-lite.md merge=union`.
- `dev/servidor.mjs` no ruteaba recursos de `/rest/v1/` con dígitos (`metricas_30_dias` caía al estático con 404).
- En el panel, una combinación larga (`ticketera/py-react/NOVATO/nuevo`) ensanchaba la tabla a 379 px en un celular de 360. Y la lista de archivos del combinador desbordaba con la descripción larga: ahora se acomoda.

### Modificado
- `?v=33` en `index.html`, `admin.html`, `guia.html` y `demo.html` (cambiaron `sesion.js` y otros).
- `sdd/`: spec 0.9 (cómo se mide cada outcome, V8 y V9), ADR-013, contracts 0.9 (§5 `prompt.js`, §6 formato de las métricas), status (F2, F3, F22, D3 cerrada), testing, design.

### Verificado
- Rojo medido sobre `2b522bd` con los tests nuevos: `web/tests` 20 tests, 14 en rojo (los 13 nuevos de combinador y métricas y el de LITE del ZIP); `dev/tests` 12, 2 en rojo (`#/combinador|Mozilla/5.0 (iPhone…)` entraba con `201`, y faltaba la columna `ia`). H5 llegó después: rojo propio con `falta sdd/changelog.md merge=union`.
- Verde: `node --test "web/tests/*.test.mjs"` 21/21; `node --test "dev/tests/*.test.mjs"` 12/12.
- Smoke en Chrome headless por CDP contra `node dev/dev.mjs`, a 360 px (táctil) y 1280 px: ticketera + `py-react` + IA + FastAPI, Anthropic API y «Celery» sumada fuera del catálogo, con `R01=OFF` en el configurador. El prompt trae N4, R12, la reserva, el stack, la lección de FastAPI, el bloque de fuera del catálogo y `R01=OFF`, sin «R01 es desactivable» ni «commit (R01)»; `ia-en-el-producto.md` en la lista y en el árbol. Las visitas llegaron a la base como `#/combinador|movil` y `|escritorio`. El panel muestra las cuatro tarjetas. Sin scroll horizontal en ninguno de los dos anchos y cero errores de consola.

### Review R30, vuelta 1 (sobre `bb6f168`, cambios pedidos)
- **M3 · Prompt y ZIP del mismo estado.** Destildar «IA en el producto» después de generar dejaba un prompt que pedía un playbook que el ZIP ya no traía. Ahora el ZIP arma el prompt con el estado actual (nunca con el textarea), y si ya se generó, cualquier cambio (tipo, stack, nivel, perfil, IA, playbooks, tecnologías o «Mis reglas») regenera prompt, lista y árbol juntos.
- **M4 · La base hace cumplir lo que dice la doc.** `eventos_detalle_formato_check` cierra el `detalle` por tipo (rutas, nombres de archivo e ids de `[A-Za-z0-9._/-]` con largo acotado: sin espacios, `@` ni saltos de línea), `NOT VALID` para no tocar filas viejas. La política de alta exige `dia = hoy` y la vista de 30 días además acota `dia <= hoy`. ADR-013 y contracts dicen exactamente eso, y lo que no garantiza (un slug corto puede ser un nombre). La sonda del reviewer (`revs-sonda-db.mjs`) pasó de 201 a 400/401 en los ocho casos.
- **M6 · Tecnologías de afuera** (link, guardadas, base): `Prompt.limpiarTecnologia` las deja en una línea, sin control y con 60 caracteres como máximo, al cargar y al armar el prompt.
- **Link compartido roto desde antes de 0.33:** `writeURL` (`catalogo.js`) borraba el hash `#/combinador?c=…` antes de que `inicio.js` lo leyera. Ahora lo conserva.
- **N3:** README «101 tecnologías» → 128 y la card de escenarios «23 situaciones» → 37, con un test que mira los dos conteos en el README y la web.
- **N4:** el perfil tiene una sola fuente, el configurador (`ReglasUI.fijarPerfil` / `alCambiar`). El prompt y el `custom.md` ya no pueden decir dos perfiles distintos.
- **N5:** aviso en el combinador cuando un tipo (calc, guía, proceso) sale LITE con el configurador en FULL.
- **N6:** `Metricas.visita` corta el lugar antes de pegar la clase.
- **H24 (ticketera):** la lección de Pydantic sobre `@field_validator` con el mismo nombre que el campo, en FastAPI, en Pydantic y en `tecnologias.md` (0.8.1).
- Un chip de tecnología muy larga desbordaba a 360 px; ahora corta la palabra.
- Rojo medido sobre `8cfac06`: `web/tests` 34 tests, 10 en rojo (M3 ×2, W15/N4, N5, M6 ×2, link, N3, H24, N6); W10, W11 y W16 quedaron en verde porque cubren código que ya estaba bien, y se verificaron con sus mutantes. `dev/tests` 13, 2 en rojo (`{"tipo":"visita","detalle":"juan.perez@gmail.com DNI 30123456"} → 201` y `la vista mira fuera de los últimos 30 días`). Verde: 34/34 y 13/13. Mutantes W10, W11, W15, W16 (×2), M3, M6, N4, N6 y el del link: todos mueren.

---

## [0.32.0] — 2026-10-05

### Agregado
- **Entorno local sin nube** (`dev/`, ADR-012, F21). `node dev/dev.mjs` levanta un Postgres propio en `127.0.0.1:54329`, corre `supabase/schema.sql` y `metricas.sql` tal cual sobre un `auth` mínimo, y sirve la web en `http://127.0.0.1:4321/web/` con un emulador del subconjunto de GoTrue y PostgREST que usa `sesion.js`. La web no cambia para correr en local: el servidor reemplaza `supabase-config.js` al servirlo. Sin `node_modules`: habla con la base por `psql`, con los valores en base64 por stdin. Trae tres cuentas de ejemplo (`dev/README.md`) y comandos para crear cuentas y cambiar claves, porque en local no hay mails.
- **`dev/tests/local.test.mjs`**, 10 tests con `node --test` sobre un clúster temporal: la prueba de dos cuentas de F5 (leer, editar, borrar y crear a nombre de otra cuenta), sin sesión, token falso, métricas solo para el admin, upsert sin duplicar, el ciclo de auth completo y que el servidor no salga del repo.
- `.claude/launch.json` suma `sdd-local`.

### Corregido
- **Guardar una combinación con cuenta fallaba siempre** (42P10). Causa raíz: el upsert de PostgREST manda `on_conflict=usuario_id,nombre`, y la unicidad era un índice sobre `lower(nombre)`; Postgres no encaja columnas contra un índice de expresión. Corrección: columna generada `nombre_clave = lower(nombre)` con índice único `(usuario_id, nombre_clave)`, y `sesion.js` usa ese `on_conflict`. Se mantiene que «Landing» y «landing» son la misma combinación, como sin cuenta.
- **Cualquier cuenta podía hacerse admin** con un `PATCH {admin:true}` a su propio perfil, y con eso leer las métricas. Causa raíz: RLS decide qué filas se tocan, no qué columnas, y la política «perfil propio: editar» deja editar la fila entera. Corrección en `metricas.sql`: sin `insert` ni `update` de tabla para `anon` y `authenticated`, y `update` solo sobre las siete columnas que manda la web. El perfil lo sigue creando el trigger.
- Los dos arreglos están en el repo, **no en la nube**: el proyecto Supabase sigue pausado, y al reactivarlo hay que volver a correr los dos `.sql` (`status.md`).

### Modificado
- `?v=32` en las páginas de `web/`, porque cambió `sesion.js` (corolario de ADR-011).
- `.gitignore` suma `dev/.data/`.
- `sdd/`: ADR-012; `design.md` §8; `testing.md` (la suite nueva, V3 ✅ y RLS pasa a testearse); `security.md` §3b; `status.md` (F5 y F21 completas, bloqueos).

### Verificado
- `node --test "dev/tests/*.test.mjs"`: 9/9. `node --test "web/tests/*.test.mjs"`: 6/6.
- Rojo medido contra la base `1055eef` (su `schema.sql`, `metricas.sql` y `sesion.js`): fallan los tres tests de los dos bugs y pasan los otros seis.
- Rojo forzado: con la política de lectura de `combinaciones` en `using (true)`, fallan «una cuenta no ve…» (`B ve combinaciones de A`) y «sin sesión no se lee nada».
- Smoke en Chrome headless por CDP contra `node dev/dev.mjs`: portón sin sesión, clave mala con el mensaje traducido, login de ana, guardar dos veces la misma combinación (pisa), tema al perfil, sesión que sobrevive a recargar, salir, facundo sin ver lo de ana y con métricas de admin, `admin.html`, `guia.html` y `demo.html`. Cero excepciones y cero errores de consola. V3: dos combinaciones de `localStorage` quedan en la cuenta de beto al entrar.
- **Reviewer independiente (R30), vuelta 1** sobre `5fa58a2`: re-ejecutó 9/9 y 6/6 y pidió cambios. Dos bloqueantes: (B1) en Windows el alias 8.3 `/dev/DATA~1/jwt-secreto` esquivaba el filtro de punto y entregaba el secreto de los JWT (y `/GIT~1/config`); (B2) el test de «crear a nombre de otro» pasaba por la política de lectura y seguía verde con el `with check` roto. Dos menores: (M1) cambiar la clave por la CLI sacaba el admin; (M2) una columna nueva de perfil fuera del `grant` rompería `guardarPerfil` en silencio. Más nits: 500 en vez de 400 con cuerpos raros, JWT con más de tres partes, 404 por accidente. Todo resuelto, más un control de `Host` contra DNS rebinding. Rojos de cada arreglo: con `with check (true)` falla «no se puede crear…»; con el `servidor.mjs` de `5fa58a2` falla por `/dev/DATA~1/jwt-secreto`; con el `auth.mjs` de `5fa58a2` falla el admin tras cambiar la clave (`false !== true`); sin `interes` en el `grant` falla `guardarPerfil` (42501). Suites: 10/10 y 6/6.
- **Vuelta 2** sobre `1a1ec83`: **APROBADO**. Re-ejecutó las suites, repitió los rojos de B1 y B2 y probó alias 8.3, ADS, dispositivos, junctions y `Host` vacío o ajeno sin encontrar agujeros. De sus nits se resolvieron dos: `/%2Fweb` redirigía a `//web/` (redirección abierta, venía de `5fa58a2`) y el `Host` distinguía mayúsculas.

---

## [0.31.0] — 2026-10-03

### Agregado
- **El ZIP del proyecto trae la capa de ejecución.** Antes el master citaba en R30/R31 archivos que no venían en el ZIP. Ahora:
  - `sdd/harness.md`, `sdd/orchestration.md` y las plantillas `sdd/prompts/{task-card,handback,relevo}.md` van **siempre**, con el mismo criterio que `seguridad.md`: los piden reglas fijas.
  - `agents/` va con nivel **PRO**: con NOVATO R31 queda en OFF.
  - **`harness/`** entra con un checkbox nuevo, marcado por defecto, en el Combinador y en la descarga rápida. Son 12 archivos, sin `tests/`.
  - Se suman las skills **`relevo`** y **`harness-fix`**. `harness-fix` no viaja con NOVATO, porque su protocolo vive en `agents/prompter.md`.
  - «Solo los MD» ahora trae `seguridad.md`, `harness.md`, `orchestration.md` y `prompts/`.
  - En brownfield, el LEEME lista lo que hay que copiar a partir de lo que realmente trae el ZIP.
- `zip.js` puede marcar archivos como ejecutables (modo Unix 100755). Sin eso, el `pre-commit` llegaba sin `+x` a Linux y macOS y git lo ignoraba sin avisar. Como Windows no guarda ese bit, el LEEME y `harness/README.md` piden `git update-index --chmod=+x` al commitear desde ahí. El `.gitattributes` suma `harness/git-hooks/* text eol=lf`.
- **Primeros tests de la web** (D2), en `web/tests/paquete.test.mjs` con `node --test`, sin dependencias, en CI (`.github/workflows/web.yml`). Cubren el contenido del ZIP, el modo del pre-commit, NOVATO vs PRO, el LEEME brownfield y **la sincronía de las reglas**: `id`, `nombre`, `def`, `tipo` y `nota` de `reglas.js` contra los encabezados de la §4, el tablero, y todo «N reglas» de la web. Cada test se vio fallar a propósito antes de darlo por bueno.
- **`web/og.py`** regenera `og.png` con el mismo diseño y toma el número de reglas del master (D5). La imagen decía «26 reglas» desde la 0.11.

### Modificado
- **El JS de `index.html` se parte en seis archivos** (D1): `catalogo.js`, `tecnologias-vista.js`, `combinador.js`, `manuales.js`, `cuenta.js` e `inicio.js`, de 105 a 237 líneas sin la cabecera, sin cambios en el código. Antes eran 1123 líneas inline y el límite de R05 es 300. Siguen siendo scripts clásicos en el mismo orden y con el mismo ámbito global.
- **ADR-004, revisión:** el generador de `reglas.js` nunca estuvo en el repo, y por eso R27 y R29–R32 llegaron tarde a la web. La garantía pasa a ser el test en CI; las descripciones de `reglas.js` son resúmenes curados y no se regeneran.
- `?v=31` en las páginas de `web/`: `zip.js`, `paquete.js` y `reglas.js` cambiaron, y el corolario de ADR-011 pide subir la versión para que un navegador no use la vieja en caché. El tablero sigue en `?v=29`, porque carga recursos que no cambiaron.
- El árbol de vista previa del Combinador sigue al nivel después de generar: `agents/` y `GUIDE.md` dependen de él.
- Las actions de CI pasan a versiones que corren en Node 24 (`checkout@v5`, `setup-python@v6`), en `harness.yml` y en el `ci/verify.yml` del scaffold.
- `sdd/status.md` (F17–F20, bloqueos, deudas), `design.md` y `testing.md` al día.

### Corregido
- **Este changelog tenía un byte NUL crudo** en la entrada de la 0.20, justo donde se contaba el mismo problema en otro archivo. Git lo trataba como binario, así que no mostraba diffs y lo guardaba con CRLF sin normalizar. Ahora es texto (`\u0000`, que es lo que usa `md.js`) y el archivo pasa a LF.

### Verificado
- `node --test "web/tests/*.test.mjs"`: 6/6. Rojos forzados: sin la marca de ejecutable; con el `reglas.js` de 0.29; con R30 marcada como desactivable; con «28 reglas» en `catalogo.js`; con `harness.md` citando un `prompts/nuevo.md` que no existe; y con el LEEME de NOVATO anunciando `/harness-fix`. Con `harness/` en CRLF, como queda en un clon de Windows, sigue en verde.
- D1: smoke en Chrome headless por CDP, antes y después del corte. La salida es idéntica en carga, generar, lista de archivos, árbol, cambio de nivel, checkbox del arnés y vistas, con 0 excepciones. Rojo forzado: con `inicio.js` cargado antes que `catalogo.js`, salta `ReferenceError`.
- La descarga rápida, en el navegador: el popup se abre con el arnés marcado, y la descarga real (interceptando `Zip.descargar`) trae 31 archivos, 12 de `harness/` y el pre-commit ejecutable. Con el arnés destildado no trae ninguno.
- Arnés desde el ZIP descomprimido, en un repo nuevo: `verify.py --quick`, `verify.py` y el pre-commit real dan `VERDE`.
- Reviewer independiente (R30), dos vueltas. La vuelta 1, sobre el primer corte del empaquetado, pidió 4 menores y 4 nits. La vuelta 2, sobre el commit con D1, D2 y D5, pidió 2 menores en el test (el chequeo de «N reglas» no veía los JS nuevos de D1, y había un rojo falso con CRLF) y 6 nits. Todo quedó resuelto en esta versión.

### Pendiente
- El proyecto Supabase está pausado y el plan gratis no deja reactivarlo sin liberar un lugar: la web publicada está inaccesible (ver `status.md`).

---

## [0.30.1] — 2026-10-02

### Agregado
- **`harness/`: el arnés ejecutable de R29/R30.** Scaffold en Python 3.10+ sin dependencias: `verify.py` por niveles (`--quick`, `--changed`, completo, `--e2e`), checks de integridad (tarjetas, reviews, status, rutas citadas, handbacks), hooks de Claude Code, pre-commit, CI de ejemplo (`.github/workflows/harness.yml`) y 100 tests con rojo forzado.
- Pasó **siete vueltas de un reviewer independiente** (R30 aplicado al propio arnés); la traza queda en `imports/2026-10-02-relay-harness/reviews/`. Lo central que encontraron: cinco formas de inyección por nombre de archivo, de donde salen S32 y el invariante de `lint_file` (sin shell, toda ruta como `./`, ejecutable resuelto solo desde PATH o la raíz).

### Modificado
- `harness.md` se ajusta a lo implementado (DRIFT, opción A).
- **La web se pone al día con R29–R32**: estaban en el master, COMPACT y los espejos EN, pero no en `reglas.js` ni en el tablero, así que la web seguía mostrando 28 reglas. Es el mismo desfase que tuvo R27 en la 0.27. Se actualizaron los conteos («32 reglas», «R01–R32») y la versión en los pies, la guía, el tablero y el README.

### Corregido
- **La primera corrida de la matriz de `harness.yml`** (run 37136047518) pasó en Windows y falló en Linux y macOS por un solo test: `test_salida_no_utf8_se_decodifica_con_la_codepage` esperaba la decodificación cp1252 de Windows en todas las plataformas. El código estaba bien: fuera de Windows la codepage es UTF-8 y el byte suelto queda marcado con `�`, sin perder la línea. Ahora el test espera eso.

---

## [0.30.0] — 2026-10-02

### Agregado
- **Capa de ejecución verificable**, importada de Relay (usado en producción en chat-commerce-ai) vía S28–S31:
  - **R29 · TDD-ROJO-PRIMERO**: el rojo se mide contra la base, no se deduce, y todo check nuevo se prueba rompiéndolo una vez.
  - **R30 · LOOP-CERRADO**: done = comando + salida literal + hash, re-ejecutado por un reviewer independiente.
  - **R31 · ORQUESTACIÓN-CON-ROLES**: siete roles de agente (`agents/`), una tarjeta por agente con zona de archivos explícita.
  - **R32 · PRODUCCIÓN-CON-OK**: datos de prod revisados en solo lectura y escritura en prod con OK humano.
- Nuevos: `harness.md`, `orchestration.md`, `harness.config.json` por proyecto, y `sdd/cards/` + `sdd/progress/<rama>/` como memoria en disco.
- Plantillas de tarjeta (`prompts/task-card.md`), handback y relevo; playbook `go-live`; skills `relevo` y `harness-fix`.

### Modificado
- El HANDBACK pide la evidencia literal. Espejos COMPACT (ES/EN) y master EN actualizados.

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
- El centinela de los code spans pasó de NUL crudo (git trataba el archivo como binario) a secuencia de escape `\u0000`.

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
