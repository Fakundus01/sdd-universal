# Handback IA-1 — Endpoint `/api/fusionar` con reserva de gasto, rate limit y modo simulado

- **Estado:** done
- **Rama / commit:** `ia-fusion` @ `0330a1e`
- **Quién:** implementer (MEDIO, alto) | sesión única, dos vueltas (review ALTO → CHANGES_REQUESTED → esta vuelta)

## Hecho
- `api/fusionar.js`: función serverless (Vercel, zero-config) que valida TODO el pedido (tipo/stack/tecnologias/playbooks/custom/descripcion, con tipos y tamaños acotados), aplica rate limit por IP, cae a modo simulado si falta `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` (avisando por `console.warn` si falta solo el modelo), reserva el gasto bajo lock (freno **por instancia**, ADR-017), llama al SDK real de Anthropic (`max_retries:0`, `system` separado del texto de la persona), costea con el `usage` real, libera la reserva solo con un rechazo real de la API (4xx/529, nunca con un 500/502/503/504), y nunca devuelve un 500 (red de seguridad de último recurso incluida).
- `api/_lib/reserva.js`: la reserva de gasto como `SharedArrayBuffer` + `Atomics` (lock real entre hilos) — `reservar`/`liberar`/`ajustar`/`gastadoActual`, más `adquirirLock`/`liberarLock` exportadas para que el hook de test de concurrencia viva fuera del código de producción.
- `api/_lib/validacion.js` (nuevo en esta vuelta): valida tipo/stack contra el catálogo y tipo+tamaño de `tecnologias`/`playbooks`/`custom`/`descripcion` — nunca deja pasar un campo mal tipado hacia `.join`/`.length` (que tiraba 500).
- `api/_lib/promptSeguro.js` (nuevo en esta vuelta): separa la instrucción fija (`system`) del texto de la persona, que va escapado en una sola pasada dentro de etiquetas (`<reglas>`, `<descripcion>`, etc.) — LLM01.
- `api/_lib/catalogo.js`, `api/_lib/costo.js`, `api/_lib/rateLimit.js`, `api/_lib/secreto.js`, `api/_lib/fusionV1.js`, `api/_lib/anthropicCliente.js`, `api/_lib/constantes.js`: helpers de la tarjeta (varios corregidos en esta vuelta, ver Apéndice).
- `package.json` + `package-lock.json`: única dependencia nueva, `@anthropic-ai/sdk@0.133.0`, para `api/` (no para `web/`, que sigue sin build). `.gitignore` +`node_modules/`.
- 50 tests en `api/tests/*.test.mjs` (8 archivos, más 3 fixtures de hilos reales en `api/tests/fixtures/`), todos verdes.

## No hecho / pendiente
- **Decisión de contrato que tomé y que IA-2 (la UI) tiene que confirmar:** asumí que `tipo`/`stack` en el pedido son las **keys** del catálogo (`TYPES`/`STACKS` de `web/catalogo.js`, ej. `"webapp"`, `"ts"`), no el objeto completo `{name, extra}` que usa `Prompt.armar` internamente — `contracts.md` §8 no lo precisa. El review de esta tarjeta confirmó que es razonable y no bloquea; queda para que el leader lo cierre con una línea en el contrato.
- **`ANTHROPIC_MODEL` no tiene default hardcodeado a propósito** (no inventar un ID de modelo de memoria, tecnologias.md lo pide así): si no está seteada, la función cae a modo simulado aunque haya `ANTHROPIC_API_KEY` (con `console.warn`, agregado en esta vuelta). Hay que setear `ANTHROPIC_MODEL` en Vercel con un ID verificado antes de que el modo IA funcione en producción.
- **El precio de `api/_lib/costo.js` no está atado a `ANTHROPIC_MODEL`** (recomendación "no bloqueante" del review, no aplicada en esta vuelta por tiempo): hoy es un único peor-caso fijo ($15/$75 por MTok), que el review confirmó que cubre el catálogo vigente de Anthropic (el más caro de primera parte es Fable 5.1 a $10/$50). El riesgo que señala el review sigue abierto: un modelo *futuro* más caro rompería la cota en silencio si `ANTHROPIC_MODEL` apunta a él sin actualizar `costo.js`.
- **No implementé la distinción de 3 respuestas del playbook §A paso 5** ("ocupada" / "no alcanza hoy" / "se alcanzó el tope") — el review confirmó que no bloquea porque ni la tarjeta ni `contracts.md` §8 la piden (un solo `429`).
- **No implementé el saneo de "reservas colgadas"** (playbook §B paso 10, `en_curso` > 15 min) — no está en los criterios de aceptación y es más relevante para un servidor persistente que para una función serverless de vida corta.
- **No until implementé streaming** (SSE) — el contrato §8 no lo pide (JSON simple).
- **Límite de gasto de la consola de Anthropic:** ADR-017 pide configurarlo como techo real y duro antes de producción — es una acción fuera de este repo (consola del proveedor), no código; la anoto para que no se pierda.
- **`web/catalogo.js` posiblemente ausente del bundle de Vercel en runtime:** `api/_lib/catalogo.js` lo lee con `fs.readFileSync` en tiempo de ejecución, y nadie (ni yo, ni el review) pudo verificar contra un preview deploy real si Vercel incluye ese archivo en el bundle de la función. Si no lo incluye, `validarPedido` fallaría siempre al validar tipo/stack; mi red de seguridad de último recurso lo convertiría en un `400` parejo (nunca un 500), pero el endpoint quedaría inservible hasta que alguien lo note. Dejo esto marcado para que se verifique con un deploy real antes de confiar en la feature.

## Cómo
### De la vuelta 1 (sigue vigente)
- **Reserva con `SharedArrayBuffer`+`Atomics`, no una promesa encadenada**, para que el test de concurrencia pueda usar `worker_threads` reales sin depender de que JS corra lo sincrónico de un tirón (eso haría que un test con `Promise.all` "pase por suerte" sin probar nada).
- **`fetch` falso, SDK real** (tecnologias.md, ficha "Anthropic API"; playbook §E paso 20): `api/_lib/anthropicCliente.js` expone `_establecerFetchParaTests`, y los tests usan el `Response`/`Headers` globales de Node (WHATWG Fetch nativo) para que el parseo, las clases de error y el `usage` sean los de verdad.
- **Clasificación de errores por `.status`:** confirmada en el código fuente instalado del SDK (`node_modules/@anthropic-ai/sdk/core/error.js`, `generate()`) — todo rechazo HTTP de la API construye una subclase de `APIError` con `.status` numérico; un error de conexión/timeout construye `APIConnectionError`/`APIConnectionTimeoutError` con `.status === undefined`.

### De esta vuelta (review → CHANGES_REQUESTED)
- **Cambio 1 (DRIFT, resuelto por el owner en ADR-017, "opción B"):** no tenía que implementar ningún store compartido — eso ya se decidió. Mi parte era corregir los comentarios falsos que decían "producción: un solo proceso" (`reserva.js`, `fusionar.js`, `rateLimit.js`): ahora dicen la verdad (freno **por instancia** de Vercel, el techo real y duro es el límite de gasto de la consola de Anthropic) y citan ADR-017. El código de la reserva/rate-limit no cambió de comportamiento, solo la documentación que lo describe.
- **Cambio 2 + 3 (`api/_lib/validacion.js`, nuevo):** antes solo `descripcion` tenía cota; `custom`, `tecnologias` y `playbooks` entraban al prompt sin tope de tamaño NI de tipo — un `tecnologias: "abc"` (string en vez de array) tiraba `TypeError: tecnologias.join is not a function` sin capturar (500 real, contra el contrato §8: "nunca un 500 genérico"). `validarPedido()` ahora valida tipo (`tecnologias`/`playbooks` tienen que ser arrays de hasta 40 strings de hasta 60 caracteres cada una — mismo largo que ya usa `Prompt.limpiarTecnologia`, contracts.md §5; `custom` hasta 8000 bytes) ANTES de construir el prompt o de tocar la reserva. Esto también resuelve, como efecto colateral, el caso que el review marcó como "falso 429": un pedido cuya cota sola ya superaba el tope (`tecnologias` de 200KB) ahora da `400` en la validación, nunca llega a reservar nada.
- **Cambio 3, segunda mitad (red de seguridad):** `handler()` ahora envuelve TODO en un `try/catch` de último recurso (`manejar()` es la lógica real) que convierte cualquier excepción no prevista en un `400` parejo — cubre tanto un campo que algún día se cuele sin pasar por `validarPedido` como una falla al leer `web/catalogo.js` en runtime (ver "No hecho" sobre el bundle de Vercel).
- **Cambio 4 (`esRechazoDeLaAPI`, en `fusionar.js`):** `typeof error.status === 'number'` incluía CUALQUIER status numérico, así que un 500 o un 504 (gateway timeout) liberaban la reserva igual que un 400 — contra el playbook §B paso 9 y AC6, que limitan el "costo 0" a 4xx y 529. Ahora solo libera si `status === 529 || (status >= 400 && status < 500)`; todo lo demás (500/502/503/504, y lo ambiguo sin status) conserva la reserva. **Rojo medido** antes de este fix (ver Evidencia).
- **Cambio 5 (`api/_lib/promptSeguro.js`, nuevo — LLM01):** antes, `descripcion` y `custom` iban crudos dentro del único mensaje de usuario, sin separar instrucción de dato ni escapar `<`/`>`/`&` — contra `playbooks/ia-en-el-producto.md` §D paso 14 y R26. Ahora la instrucción fija va en `system` (separado), y el texto de la persona va envuelto en etiquetas que pone el sistema (`<tecnologias>`, `<playbooks>`, `<reglas>`, `<descripcion>`) con `escaparUnaPasada()`: un intento de cerrar la etiqueta antes de tiempo (`</descripcion><system>...</system>`) queda como texto escapado, nunca como una etiqueta real. Una sola pasada a propósito (el mismo síntoma que describe tecnologias.md: escapar en dos pasadas separadas rompe el texto, `</tick</ticket>et>`).
- **Cambio 6 (`api/_lib/secreto.js`):** `logSeguro` todavía logueaba el MENSAJE del error (tachando solo la clave si aparecía ahí) — contra el playbook §B paso 9 ("al log va el tipo, nunca el texto"). La sonda del review mostró el cuerpo entero del error de la API en el log. Ahora logueo solo `error.constructor.name` (la señal real: las clases del SDK heredan `.name === "Error"` sin pisarlo) y el `status` HTTP si existe — nunca el mensaje. `tachar()` queda exportado y testeado, pero ya no hace falta en el camino feliz porque no se loguea texto libre en absoluto. **Rojo medido** antes de este fix (ver Evidencia): el rojo mostró literalmente la clave filtrada en el log con el código viejo.
- **Cambio 7 (`fusionar.js`):** con clave pero sin `ANTHROPIC_MODEL` configurado, antes caía a simulada en silencio (0 líneas de log, confirmado por la sonda del review). Ahora un `console.warn` (sin la clave) avisa que la IA está mal configurada. Sin clave (el caso esperado, sin configurar nada) NO avisa — es la degradación normal del contrato §8, no un error de configuración.
- **Cambio 8 (`api/tests/reserva.test.mjs` + `fixtures/reservaWorker.js`):** la "barrera" anterior soltaba el gate apenas el hilo principal terminaba de CREAR los 8 workers, sin esperar a que ninguno llegara a `Atomics.wait` — el comentario decía "con los 8 hilos ya arrancados y esperando" pero eso era falso; la carrera se reproducía solo porque `delayMs` (30ms) tapaba la diferencia. Ahora cada worker manda `{tipo:'listo'}` justo antes de `Atomics.wait`, y el hilo principal recién suelta el gate cuando recibió los N avisos — una barrera real.
- **Mejora no bloqueante aplicada — `debugDelayMs` fuera de producción:** el hook de demora vivía como parámetro de `reservar()` en `api/_lib/reserva.js` (código de producción con un parámetro que solo usa un test). Lo saqué: `reserva.js` ahora exporta `adquirirLock`/`liberarLock`, y el test de concurrencia tiene su propia `api/tests/fixtures/reservaConLockYDelay.js` que usa esas mismas primitivas reales con la demora, sin tocar la función de producción.
- **Mejora no bloqueante aplicada — `rateLimit.js`:** el `Map` de contadores por IP nunca se achicaba. Agregué un barrido perezoso (cada 1000 llamadas, se borran las entradas vencidas hace más de 2 ventanas) para que no crezca sin límite con cada IP única que pase por una instancia tibia.
- **Mejora no bloqueante aplicada — `x-forwarded-for`:** tomaba la PRIMERA IP de la cabecera, que la puede escribir quien hace el pedido (el review lo confirmó rotando esa cabecera). Ahora toma la ÚLTIMA, asumiendo que Vercel agrega al final en vez de reemplazar — documentado en el código que esto depende de un comportamiento de la plataforma que no pude verificar sin un deploy real (R19).
- **Mejora no bloqueante aplicada — `MAX_TOKENS_SALIDA`:** subí de 4096 a 8192 (más margen contra el corte que señaló el review para un `sdd/` entero en JSON); sigue siendo "a medir con la clave real".
- **No aplicada — tabla de precios por modelo:** el review la deja como recomendación, no bloqueo, y confirmó que el peor-caso actual cubre el catálogo vigente; no llegué a implementarla en esta vuelta por tiempo (ver "No hecho").

## Archivos tocados (estado acumulado, commit de esta vuelta)
| Archivo | Cambio |
|---|---|
| `.gitignore` | +`node_modules/` (vuelta 1) |
| `package.json` / `package-lock.json` | `@anthropic-ai/sdk@0.133.0` (vuelta 1) |
| `api/fusionar.js` | handler — reescrito en la vuelta 2: validación completa, `system`/mensaje separados, `esRechazoDeLaAPI` corregido, warn de `ANTHROPIC_MODEL`, red de seguridad, IP = última de XFF |
| `api/_lib/catalogo.js` | sin cambios en la vuelta 2 |
| `api/_lib/constantes.js` | vuelta 2: +`MAX_CUSTOM_BYTES`, `MAX_ARRAY_ITEMS`, `MAX_ITEM_CHARS`; `MAX_TOKENS_SALIDA` 4096→8192 |
| `api/_lib/costo.js` | sin cambios en la vuelta 2 |
| `api/_lib/reserva.js` | vuelta 2: comentario corregido (ADR-017), se sacó `debugDelayMs`/`busyWaitMs`, se exportan `adquirirLock`/`liberarLock` |
| `api/_lib/rateLimit.js` | vuelta 2: comentario corregido (ADR-017), barrido perezoso del `Map` |
| `api/_lib/secreto.js` | vuelta 2: `logSeguro` ya no loguea el mensaje, solo `constructor.name` + `status` |
| `api/_lib/fusionV1.js` | sin cambios en la vuelta 2 |
| `api/_lib/anthropicCliente.js` | sin cambios en la vuelta 2 |
| `api/_lib/validacion.js` | nuevo (vuelta 2) |
| `api/_lib/promptSeguro.js` | nuevo (vuelta 2) |
| `api/tests/*.test.mjs` (8 archivos) | `catalogo`, `costo`, `fusionV1`, `rateLimit`, `secreto` (vuelta 1, `secreto` ajustado en vuelta 2), `reserva` (vuelta 1, barrera corregida en vuelta 2), `fusionar` (vuelta 1, ampliado en vuelta 2), `validacion` + `promptSeguro` (nuevos, vuelta 2) — 50 tests en total |
| `api/tests/fixtures/reservaSinLock.js` | sin cambios |
| `api/tests/fixtures/reservaWorker.js` | vuelta 2: barrera real (`{tipo:'listo'}`), usa `reservaConLockYDelay` |
| `api/tests/fixtures/reservaConLockYDelay.js` | nuevo (vuelta 2) |
| `sdd/progress/ia-fusion/current.md` | vuelta 1 |
| `sdd/progress/ia-fusion/handback_IA-1.md` | este archivo, reescrito para la vuelta 2 |

No toqué `sdd/decisions.md` (ADR-017), `sdd/design.md` §10 ni `sdd/costs.md`: ya venían actualizados por el leader/owner antes de que empezara esta vuelta.

## Evidencia

| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. 200 `{archivos, fusion:"ia"}` con key | `fusionar.test.mjs` → "AC1: con ANTHROPIC_API_KEY y modelo..." |
| 2. 200 `fusion:"simulada"` sin key, = concatenación v1 | `fusionar.test.mjs` → "AC2: sin ANTHROPIC_API_KEY..." / "...falte solo el modelo" |
| 3. Reserva bajo lock, 8 en paralelo nunca pasan el tope — **dentro de una instancia** (ADR-017) | `reserva.test.mjs` → "IA-1 AC3: bajo lock, 8 hilos reales..." + `fusionar.test.mjs` → "AC3: la reserva bloquea con 429..." |
| 4. Rate limit por IP → 429, otras IPs sin afectar | `rateLimit.test.mjs`, `fusionar.test.mjs` → "AC4: rate limit por IP..." |
| 5. `max_retries:0`, un rechazo cuenta una vez | `fusionar.test.mjs` → "AC5: max_retries:0..." |
| 6. 4xx/529 → costo 0 + libera; 500/502/503/504/timeout → conserva | `fusionar.test.mjs` → "AC6: ...", "Cambio 4 (AC6): un 500...", "...un 504..." |
| 7. tipo/stack/tecnologias/playbooks/custom/descripcion, todo acotado y tipado → 400 si no cumple, nunca 500 | `validacion.test.mjs`, `fusionar.test.mjs` → "Cambio 2/3 (AC7...)" |
| 8. La clave nunca viaja en la respuesta ni en el log (ni el texto del error) | `secreto.test.mjs`, `fusionar.test.mjs` → "AC8: ..." |
| — (LLM01, no es un AC numerado pero lo pide `security.md` §3c) | `promptSeguro.test.mjs`, `fusionar.test.mjs` → "Cambio 5 (LLM01): ..." |

### Rojo medido de la vuelta 1 (R29) — sigue siendo evidencia válida, no se repitió
La reserva SIN lock, con 8 hilos reales (no promesas en el mismo hilo), rompe el tope:
```text
$ git rev-parse --short HEAD
e604690
$ node --test "api/tests/reserva.test.mjs"   # con el test de AC3 apuntado a la variante sin lock
✔ IA-1 R29 (rojo medido): sin lock, 8 hilos reales rompen el tope (102.572ms)
✖ IA-1 AC3: bajo lock, 8 hilos reales en paralelo nunca gastan más del tope (124.6162ms)
ℹ pass 2
ℹ fail 1
  AssertionError [ERR_ASSERTION]: lo anotado tiene que ser exactamente cota × reservas aceptadas
  + actual 300000n  - expected 2400000n
```

### Rojo medido de esta vuelta (Cambio 4 — "cómo se reporta un error")
Con `esRechazoDeLaAPI` revertido a `typeof error.status === 'number'` (la versión que señaló el review):
```text
$ node --test "api/tests/fusionar.test.mjs"
✖ Cambio 4 (AC6): un 500 conserva la reserva (es ambiguo, no un rechazo de la API) (12.0462ms)
✖ Cambio 4 (AC6): un 504 (gateway timeout) también conserva la reserva (8.4553ms)
ℹ pass 21
ℹ fail 2
  AssertionError [ERR_ASSERTION]: un 500 (que no es 529) tiene que conservar la reserva, no liberarla
```
Revertido el fix (`status === 529 || (status >= 400 && status < 500)`) antes de seguir.

### Rojo medido de esta vuelta (Cambio 6 — "cómo se reporta un error")
Con `logSeguro` revertido a la versión que logueaba el mensaje:
```text
$ node --test "api/tests/secreto.test.mjs" "api/tests/fusionar.test.mjs"
✖ AC8: la clave nunca viaja en la respuesta, ni en el log, aunque el error de la API la repita (3.5491ms)
✖ AC8/Cambio 6: logSeguro() nunca imprime el mensaje del error, solo el tipo y el status (0.6612ms)
  AssertionError [ERR_ASSERTION]: la clave quedó en el log: fusionar: Error — 401 unauthorized: invalid x-api-key sk-ant-secreta-123
ℹ pass 25
ℹ fail 2
```
Esto muestra la clave filtrada de verdad con el código viejo — exactamente lo que AC8 prohíbe. Revertido el fix antes de seguir.

### Verde final, con los 9 cambios aplicados
```text
$ node --test "api/tests/*.test.mjs"
ℹ tests 50
ℹ pass 50
ℹ fail 0
ℹ duration_ms 2401.5568

$ python harness/verify.py --changed
verify.py --changed @ 9f296c4 (rama ia-fusion)
── Arnés ──
[OK]    Memoria en disco: sdd/progress/ia-fusion/current.md
[OK]    Tarjetas válidas (19)
[OK]    Rutas citadas existen (222 revisadas)
── Tests de lo cambiado ──
[OK]    test_quick — `node --test "web/tests/*.test.mjs" "api/tests/*.test.mjs" && python -m unittest discover -s harness/tests` (134.7s): Ran 178 tests in 131.443s · OK (skipped=1)
VERDE — 0 FAIL, 0 WARN
```
(El `harness.config.json` que agrega `api/tests/*.test.mjs` al comando de test y el fix de "42 vs 43 situaciones" en `web/catalogo.js` ya venían en la rama antes de esta vuelta — no son cambios míos, solo dejo registrado que con ellos puestos el arnés da verde de punta a punta.)

## Fuera de zona / riesgos
- **Límite de gasto de la consola de Anthropic (ADR-017):** sigue sin configurar — es una acción en la consola del proveedor, no algo que un commit de `api/` pueda hacer. Sin eso puesto, la reserva por instancia es solo un freno de abuso local, no el techo real.
- **`web/catalogo.js` en el bundle de Vercel:** ver "No hecho" — no pude verificarlo sin un deploy real.
- **`descripcion`/`custom`/`tecnologias`/`playbooks` acotados, pero el prompt total no tiene un tope global explícito en bytes** (lo pedía como "idealmente" el Cambio 2) — los topes por campo ya acotan el peor caso razonablemente (sumando los máximos: unos 25-30 KB en el peor escenario con CJK), pero no agregué un chequeo de "bytes totales del prompt" como capa extra. Si el leader lo quiere, es un chequeo chico de agregar.

## Cambios de spec sugeridos
- `contracts.md` §8 no precisa si `tipo`/`stack` del pedido son las keys del catálogo o el objeto `{name, extra}` (ver "No hecho"). Sigue pendiente de una línea en el contrato para IA-2.
- Ninguno nuevo sobre lo que ya resolvió ADR-017.

## Variables de entorno nuevas
- `ANTHROPIC_API_KEY` — sin ella, modo simulado siempre. En `.env` del servidor / Vercel, nunca en el front.
- `ANTHROPIC_MODEL` — sin ella (con key presente), modo simulado + `console.warn`. **Verificar el ID contra la doc vigente de Anthropic (R19) antes de configurarlo en Vercel.**
- `FUSIONAR_TOPE_DIARIO_USD` — tope diario **por instancia** (ADR-017); default `3` si no está. `costs.md` dice "a definir con el primer dato real de uso ( no hay histórico todavía); arranca conservador y se ajusta, nunca al revés" — coherente con el default conservador que dejé.
- `FUSIONAR_RATE_LIMIT_POR_MINUTO` — pedidos por minuto por IP (por instancia); default `20` si no está.

## Próximo paso sugerido
- Owner: configurar el límite de gasto en la consola de Anthropic (ADR-017) antes de que esta feature reciba tráfico real.
- Alguien con acceso a un deploy de Vercel: confirmar que `web/catalogo.js` viaja en el bundle de la función, y que `x-forwarded-for` efectivamente agrega (no reemplaza) la IP real al final de la cabecera.
- IA-2 (UI del combinador): confirmar el formato de `tipo`/`stack` en el pedido antes de cablear el fetch.
- IA-3: puede reusar `api/_lib/anthropicCliente.js#_establecerFetchParaTests` para sus propios tests sin gastar.

## Apéndice: vueltas
- **Vuelta 1** (`39cda63`): primera entrega — reserva bajo lock con hilos reales, SDK real sobre `fetch` falso, modo simulado, rate limit, 31 tests. Review ALTO → **CHANGES_REQUESTED** (`sdd/progress/ia-fusion/review_IA-1.md`): DRIFT en la reserva (resuelto por el owner en ADR-017) + 8 cambios de código (inputs mal tipados → 500, liberar con 5xx, LLM01 sin cubrir, log con el texto del error, aviso silencioso sin `ANTHROPIC_MODEL`, cota faltante en `custom`/`tecnologias`/`playbooks`, barrera floja del test de concurrencia, handback con una afirmación incorrecta sobre el permiso para leer `costs.md`).
- **Vuelta 2** (este commit): se corrigieron los 9 cambios requeridos del review (ver "Cómo" arriba, por Cambio) y 3 de las 4 mejoras "no bloqueantes" (se dejó afuera, por tiempo, la tabla de precios por modelo). 50 tests (19 nuevos), con rojo medido para los dos cambios que tocan "cómo se reporta un error" (Cambios 4 y 6) antes de aplicarlos. Esta sección del handback también corrige lo que el review marcó mal en la vuelta 1: **no es cierto que no tuviera permiso para leer `costs.md`** — `costs.md` está listado en la "Spec" de la propia tarjeta IA-1; lo que pasó es que la instrucción de quien me delegó la tarea acotó el contexto a leer a un subconjunto más chico que el de la tarjeta (`contracts.md` §8, `design.md` §10, el playbook y `tecnologias.md`), excluyendo `costs.md`/`security.md`/`decisions.md` explícitamente — una decisión de scope de quien orquestó, no una restricción de la tarjeta misma. Lo registro así para que no vuelva a pasar.
