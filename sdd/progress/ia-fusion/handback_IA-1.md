# Handback IA-1 — Endpoint `/api/fusionar` con reserva de gasto, rate limit y modo simulado

- **Estado:** done
- **Rama / commit:** `ia-fusion` @ `00b1d93`
- **Quién:** implementer (MEDIO, alto) | sesión única, tres vueltas (orchestration.md §6: este es el límite)

## Hecho
- `api/fusionar.js`: función serverless (Vercel, zero-config) que valida TODO el pedido (tipo/stack/tecnologias/playbooks/custom/descripcion, con tipos y tamaños acotados, `custom`/`descripcion` en `null` tratados como vacío), aplica rate limit por IP, cae a modo simulado si falta `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL` (avisando por `console.warn` si falta solo el modelo), reserva el gasto bajo lock (freno **por instancia**, ADR-017), llama al SDK real de Anthropic (`max_retries:0`, `system` separado del texto de la persona), costea con el `usage` real, libera la reserva solo con un rechazo real de la API (4xx/529, nunca con un 500/502/503/504), y nunca devuelve un 500 (red de seguridad de último recurso incluida, con el `error.code` del sistema en el log cuando existe).
- `api/_lib/reserva.js`: la reserva de gasto como `SharedArrayBuffer` + `Atomics` (lock real entre hilos) — `reservar`/`liberar`/`ajustar`/`gastadoActual`. Sin ningún hook de test en la firma ni primitivas de más bajo nivel exportadas solo para eso (ver V2-1 más abajo: ya no hace falta).
- `api/_lib/validacion.js`: valida tipo/stack contra el catálogo y tipo+tamaño de `tecnologias`/`playbooks`/`custom`/`descripcion` — nunca deja pasar un campo mal tipado hacia `.join`/`.length` (que tiraba 500); `custom`/`descripcion` en `null` se tratan como `''` (contracts.md §8, V2-2).
- `api/_lib/promptSeguro.js`: separa la instrucción fija (`system`) del texto de la persona, que va escapado en una sola pasada dentro de etiquetas (`<reglas>`, `<descripcion>`, etc.) — LLM01.
- `api/_lib/catalogo.js`, `api/_lib/costo.js`, `api/_lib/rateLimit.js`, `api/_lib/secreto.js`, `api/_lib/fusionV1.js`, `api/_lib/anthropicCliente.js`, `api/_lib/constantes.js`: helpers de la tarjeta.
- `package.json` + `package-lock.json`: única dependencia nueva, `@anthropic-ai/sdk@0.133.0`, para `api/` (no para `web/`, que sigue sin build). `.gitignore` +`node_modules/`.
- 56 tests en `api/tests/*.test.mjs` (8 archivos, más 2 fixtures de hilos reales en `api/tests/fixtures/`), todos verdes. El test de concurrencia de AC3 llama a `reservar()` de producción tal cual se exporta (ver V2-1).

## No hecho / pendiente
- **Decisión de contrato que tomé y que IA-2 (la UI) tiene que confirmar:** asumí que `tipo`/`stack` en el pedido son las **keys** del catálogo (`TYPES`/`STACKS` de `web/catalogo.js`), no el objeto completo `{name, extra}`. El review lo confirmó como razonable; `contracts.md` §8 ya lo deja explícito ("keys del catálogo... no el objeto {name, extra}") desde la vuelta 2.
- **`ANTHROPIC_MODEL` no tiene default hardcodeado a propósito**: si no está seteada, la función cae a modo simulado aunque haya `ANTHROPIC_API_KEY` (con `console.warn`). Hay que setear `ANTHROPIC_MODEL` en Vercel con un ID verificado antes de que el modo IA funcione en producción.
- **El precio de `api/_lib/costo.js` no está atado a `ANTHROPIC_MODEL`** (recomendación "no bloqueante" del review, no aplicada por tiempo en ninguna vuelta): hoy es un único peor-caso fijo ($15/$75 por MTok), que el review confirmó que cubre el catálogo vigente. Un modelo *futuro* más caro rompería la cota en silencio si `ANTHROPIC_MODEL` apunta a él sin actualizar `costo.js`.
- **No implementé la distinción de 3 respuestas del playbook §A paso 5** ni **el saneo de "reservas colgadas"** (playbook §B paso 10) ni **streaming** — el review confirmó en la vuelta 2 que ninguno de los tres bloquea (no los pide ni la tarjeta ni `contracts.md` §8).
- **Límite de gasto de la consola de Anthropic:** ADR-017 pide configurarlo como techo real y duro antes de producción — es una acción fuera de este repo (consola del proveedor), no código.
- **`web/catalogo.js` posiblemente ausente del bundle de Vercel en runtime:** sigue sin poder verificarse contra un deploy real. Lo que sí se endureció en esta vuelta (V2-3): si pasa, el `400` que devuelve la red de seguridad ahora queda diagnosticable en el log (`error.code`, ej. `ENOENT`) en vez de un `Error` genérico sin pistas.
- **Una respuesta 200 sin `usage`** (`fusionar.js`, señalado como "no bloqueante" en la vuelta 2): `costoRealUSD` da 0 y se libera toda la reserva aunque la llamada se haya cobrado. La API real siempre manda `usage`; no lo corregí porque el review lo marcó explícitamente como no bloqueante y no hubo tiempo en esta vuelta (la 3ª y última por `orchestration.md` §6).

## Cómo
### De vueltas anteriores (sigue vigente)
- **Reserva con `SharedArrayBuffer`+`Atomics`, no una promesa encadenada**, para que el test de concurrencia pueda usar `worker_threads` reales.
- **`fetch` falso, SDK real** (tecnologias.md, ficha "Anthropic API"): `api/_lib/anthropicCliente.js` expone `_establecerFetchParaTests`, y los tests usan el `Response`/`Headers` globales de Node.
- **Clasificación de errores por `.status`:** confirmada en el código fuente instalado del SDK.
- **ADR-017 (DRIFT, vuelta 2):** la reserva es un freno **por instancia**, no un tope global — resuelto por el owner, código documentado en consecuencia.
- **`api/_lib/validacion.js` + `promptSeguro.js` (vuelta 2):** cota y tipo en todo lo que entra al prompt; `system` separado del texto de la persona, escapado en una sola pasada (LLM01).
- **`esRechazoDeLaAPI` (vuelta 2):** libera la reserva solo con 4xx/529; 500/502/503/504 y lo ambiguo conservan.
- **`logSeguro` (vuelta 2):** solo `constructor.name` + `status`, nunca el mensaje del error.

### De esta vuelta (vuelta 3 — 2 cambios que bloquean, 1 que no)

**V2-1 (la importante — regresión de evidencia en el test de concurrencia):** al sacar `debugDelayMs` de `api/_lib/reserva.js` en la vuelta 2 (correcto: era un hook de test en código de producción), el worker de `api/tests/fixtures/reservaWorker.js` dejó de llamar a `reservar()` real y empezó a llamar a una **copia** de la sección crítica armada en un fixture nuevo (`reservaConLockYDelay.js`). El reviewer lo probó con un mutante — sacarle el lock a `reservar()` de producción y los 50 tests seguían en verde — porque ningún test corría ya ese código. Arreglo:
- `api/tests/fixtures/reservaConLockYDelay.js` se borró por completo. No hace falta ninguna copia.
- `api/tests/fixtures/reservaWorker.js` ahora llama a `reservar()` de `api/_lib/reserva.js` **tal cual se exporta**. La demora para ensanchar la ventana de la carrera se inyecta pisando `Atomics.load` dentro del propio worker, ANTES de llamar a `reservar()`: como cada `worker_thread` tiene su propio `globalThis` (no comparte el de otros hilos ni el del proceso principal), esto es una instrumentación 100% local a ese worker — nunca toca `reserva.js`, nunca afecta a otro hilo. El parche solo actúa cuando el typed array leído es exactamente `estado.gastado` (identidad de objeto), así que no interfiere con el lock en sí (`adquirirLock`/`liberarLock` usan `Atomics.compareExchange`/`Atomics.store`, métodos distintos, intactos).
- `api/_lib/reserva.js` ya no exporta `adquirirLock`/`liberarLock` (los había agregado en la vuelta 2 para que el fixture los reusara; ya no hace falta, así que se achica la superficie pública de nuevo).
- **Confirmé yo mismo el mutante exacto que usó el reviewer:** le saqué el `adquirirLock`/`liberarLock` a `reservar()` de producción (dejando el resto igual) y corrí `api/tests/reserva.test.mjs` — el test de AC3 dio **rojo** (ver Evidencia). Lo revertí enseguida.

**V2-2 (contrato, más simple):** `contracts.md` §8 ya aclara que `custom` puede ser `string` o `null` (`combinador.js` lo manda como `null` cuando no hay cambios de reglas) y que `descripcion` "nunca [es] null como error". `api/_lib/validacion.js` rechazaba `custom: null` y `descripcion: null` con `400`. Arreglo: ambos ahora usan `pedido.custom ?? ''` / `pedido.descripcion ?? ''` (el `??` cubre `null` Y `undefined`, a diferencia del default de desestructuración `= ''`, que solo cubre `undefined`). `tecnologias`/`playbooks` NO se tocaron: el contrato los documenta como "arrays de strings; `[]` si no hay", sin mencionar `null`, así que ahí `null` sigue siendo un tipo inválido (`400`) — es la convención documentada, no una inconsistencia.

**V2-3 (no bloqueante, aplicada):** si falta `web/catalogo.js` en el bundle, la red de seguridad de último recurso devolvía `400` sin ninguna pista en el log (`fusionar: excepción no capturada: Error`, sin más). Ahora `api/_lib/secreto.js#logSeguro` suma `error.code` cuando existe (ej. `ENOENT`) — es dato del sistema, no del usuario, así que no choca con "nunca el texto del error" (playbook §B paso 9).

## Archivos tocados (estado acumulado, commit de esta vuelta)
| Archivo | Cambio |
|---|---|
| `.gitignore`, `package.json`, `package-lock.json` | sin cambios en esta vuelta (vuelta 1) |
| `api/fusionar.js` | sin cambios en esta vuelta (vuelta 2) |
| `api/_lib/catalogo.js`, `costo.js`, `fusionV1.js`, `anthropicCliente.js`, `constantes.js` | sin cambios en esta vuelta |
| `api/_lib/reserva.js` | vuelta 3: ya no exporta `adquirirLock`/`liberarLock` (V2-1) |
| `api/_lib/validacion.js` | vuelta 3: `custom`/`descripcion` en `null` → `''`, no `400` (V2-2) |
| `api/_lib/secreto.js` | vuelta 3: `logSeguro` suma `error.code` (V2-3) |
| `api/_lib/promptSeguro.js` | sin cambios en esta vuelta (vuelta 2) |
| `api/tests/fixtures/reservaWorker.js` | vuelta 3: llama a `reservar()` real, demora inyectada pisando `Atomics.load` local al worker (V2-1) |
| `api/tests/fixtures/reservaConLockYDelay.js` | **borrado** en esta vuelta (V2-1: era la copia que debilitaba la evidencia) |
| `api/tests/fixtures/reservaSinLock.js` | sin cambios |
| `api/tests/validacion.test.mjs` | vuelta 3: tests de `custom`/`descripcion` en `null` (ok) y se sacó el assert viejo que pedía `400` para `custom:null` |
| `api/tests/secreto.test.mjs` | vuelta 3: test de `error.code` en el log |
| `api/tests/fusionar.test.mjs` | vuelta 3: tests de `custom`/`descripcion` en `null` en el handler completo, y de la red de seguridad con `fs.readFileSync` roto (ENOENT) |
| `api/tests/reserva.test.mjs` | sin cambios de código en esta vuelta (solo se re-confirmó con el mutante del reviewer) |
| `api/tests/catalogo.test.mjs`, `costo.test.mjs`, `fusionV1.test.mjs`, `rateLimit.test.mjs`, `promptSeguro.test.mjs` | sin cambios en esta vuelta |
| `sdd/progress/ia-fusion/current.md` | vuelta 1 |
| `sdd/progress/ia-fusion/handback_IA-1.md` | este archivo, reescrito para la vuelta 3 |

No toqué `sdd/contracts.md`, `sdd/decisions.md`, `sdd/design.md` ni `sdd/costs.md`: la aclaración de `custom`/`descripcion` en `contracts.md` §8 y el ADR-017 llegaron por merge del leader antes de esta vuelta.

## Evidencia

| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. 200 `{archivos, fusion:"ia"}` con key | `fusionar.test.mjs` → "AC1: con ANTHROPIC_API_KEY y modelo..." |
| 2. 200 `fusion:"simulada"` sin key, = concatenación v1 | `fusionar.test.mjs` → "AC2: ..." |
| 3. Reserva bajo lock, 8 en paralelo nunca pasan el tope — **dentro de una instancia** (ADR-017), **contra el código real de producción** | `reserva.test.mjs` → "IA-1 AC3: bajo lock, 8 hilos reales..." (llama a `reservar()` real desde la vuelta 3) + `fusionar.test.mjs` → "AC3: ..." |
| 4. Rate limit por IP → 429, otras IPs sin afectar | `rateLimit.test.mjs`, `fusionar.test.mjs` → "AC4: ..." |
| 5. `max_retries:0`, un rechazo cuenta una vez | `fusionar.test.mjs` → "AC5: ..." |
| 6. 4xx/529 → costo 0 + libera; 500/502/503/504/timeout → conserva | `fusionar.test.mjs` → "AC6: ...", "Cambio 4..." |
| 7. tipo/stack/tecnologias/playbooks/custom/descripcion, todo acotado y tipado → 400 si no cumple (salvo `custom`/`descripcion` en `null`, que son válidos), nunca 500 | `validacion.test.mjs`, `fusionar.test.mjs` → "Cambio 2/3...", "V2-2: ..." |
| 8. La clave nunca viaja en la respuesta ni en el log (ni el texto del error) | `secreto.test.mjs`, `fusionar.test.mjs` → "AC8: ..." |
| — LLM01 | `promptSeguro.test.mjs`, `fusionar.test.mjs` → "Cambio 5..." |
| — V2-3 (diagnóstico de fallas de deploy) | `secreto.test.mjs` → "V2-3: ...", `fusionar.test.mjs` → "V2-3: si falta web/catalogo.js..." |

### Rojo medido de esta vuelta (V2-1 — el mutante exacto del reviewer)
Con `reservar()` de producción sin `adquirirLock`/`liberarLock` (el mismo mutante que usó el review):
```text
$ node --test "api/tests/reserva.test.mjs"
✔ IA-1 R29 (rojo medido): sin lock, 8 hilos reales rompen el tope (212.0689ms)
✖ IA-1 AC3: bajo lock, 8 hilos reales en paralelo nunca gastan más del tope (231.65ms)
✔ reservar()/liberar()/ajustar() fuera de la concurrencia: libera y ajusta bien (11.2012ms)
ℹ pass 2
ℹ fail 1
  AssertionError [ERR_ASSERTION]: lo anotado tiene que ser exactamente cota × reservas aceptadas
  + actual 300000n  - expected 2400000n
```
Esto confirma que el test de AC3 vuelve a probar el código real: sin el lock de producción, da rojo. Revertido el mutante antes de seguir.

### Rojo medido de esta vuelta (V2-2)
Antes del fix en `validacion.js`:
```text
$ node --test "api/tests/validacion.test.mjs"
✖ V2-2 (contracts.md §8, review vuelta 2): custom:null es la convención de combinador.js — nunca 400
  AssertionError: custom:null tendría que pasar, no: {"ok":false,"error":"custom tiene que ser texto de hasta 8000 bytes"}
✖ V2-2: descripcion:null tampoco es un 400 ("nunca null como error", contracts.md §8)
  AssertionError: descripcion:null tendría que pasar, no: {"ok":false,"error":"descripcion supera el máximo de 4000 caracteres"}
```

### Rojo medido de esta vuelta (V2-3)
Antes del fix en `secreto.js`:
```text
$ node --test "api/tests/secreto.test.mjs"
✖ V2-3: logSeguro() suma error.code cuando existe (dato del sistema, no del usuario)
  AssertionError [ERR_ASSERTION]: el log tiene que incluir error.code: fusionar: Error
```

### Rojo medido de vueltas anteriores (sigue siendo evidencia válida, no se repitió)
- Vuelta 1 (R29, `e604690`): la reserva SIN lock, con 8 hilos reales, rompe el tope — `300000n` anotado contra `2400000n` esperado.
- Vuelta 2 (Cambio 4): un 500 liberaba la reserva cuando tenía que conservarla.
- Vuelta 2 (Cambio 6): la clave quedaba filtrada de verdad en el log (`fusionar: Error — 401 unauthorized: invalid x-api-key sk-ant-secreta-123`).

### Verde final, con V2-1/V2-2/V2-3 aplicados
```text
$ node --test "api/tests/*.test.mjs"
ℹ tests 56
ℹ pass 56
ℹ fail 0

$ python harness/verify.py --changed
VERDE — 0 FAIL, 0 WARN
```

## Fuera de zona / riesgos
- **Límite de gasto de la consola de Anthropic (ADR-017):** sigue sin configurar — acción en la consola del proveedor, no un commit de `api/`.
- **`web/catalogo.js` en el bundle de Vercel:** sigue sin poder verificarse sin un deploy real; mitigado parcialmente por V2-3 (el log ahora diagnostica `ENOENT` si pasa).
- **200 sin `usage` libera toda la reserva** (ver "No hecho") — anotado por el review como no bloqueante, no corregido por tiempo.
- **Tabla de precios por modelo** (ver "No hecho") — no bloqueante, no aplicada en ninguna vuelta.

## Cambios de spec sugeridos
- Ninguno nuevo. Los dos de vueltas anteriores (keys de `tipo`/`stack`, `custom`/`descripcion` en `null`) ya quedaron resueltos en `contracts.md` §8 por el leader.

## Variables de entorno nuevas
- `ANTHROPIC_API_KEY` — sin ella, modo simulado siempre.
- `ANTHROPIC_MODEL` — sin ella (con key presente), modo simulado + `console.warn`. **Verificar el ID contra la doc vigente de Anthropic (R19) antes de configurarlo en Vercel.**
- `FUSIONAR_TOPE_DIARIO_USD` — tope diario **por instancia** (ADR-017); default `3`.
- `FUSIONAR_RATE_LIMIT_POR_MINUTO` — pedidos por minuto por IP (por instancia); default `20`.

## Próximo paso sugerido
- Owner: configurar el límite de gasto en la consola de Anthropic (ADR-017) antes de tráfico real.
- Alguien con acceso a un deploy de Vercel: confirmar que `web/catalogo.js` viaja en el bundle, y que `x-forwarded-for` agrega (no reemplaza) la IP real al final.
- IA-2: cablear el fetch a `/api/fusionar` con `tipo`/`stack` como keys y `custom` en `string`/`null` según `contracts.md` §8.
- IA-3: puede reusar `api/_lib/anthropicCliente.js#_establecerFetchParaTests`.

## Apéndice: vueltas
- **Vuelta 1** (`39cda63`): primera entrega. Review ALTO → CHANGES_REQUESTED: DRIFT en la reserva (resuelto por el owner en ADR-017) + 8 cambios de código.
- **Vuelta 2** (`4ddc0e4`): se corrigieron los 9 cambios requeridos (ADR-017 documentado, cota completa del prompt, 500→400 por tipos, liberar solo 4xx/529, LLM01, log sin texto, warn de `ANTHROPIC_MODEL`, barrera real del test, handback corregido) + 3 mejoras no bloqueantes. Review ALTO → **CHANGES_REQUESTED de nuevo**: 2 cambios bloqueantes nuevos, propios de esta vuelta.
  - **V2-1:** al sacar el hook de test de `reserva.js` (Cambio 8/mejora no bloqueante de la vuelta 2), el fixture del test de concurrencia pasó a llamar a una copia de la sección crítica en vez de a `reservar()` real — un mutante del reviewer (sacarle el lock a `reservar()` de producción) sobrevivía: los 50 tests seguían en verde. La evidencia de AC3/R29 quedó vacía sin que yo lo notara.
  - **V2-2:** `validacion.js` (agregada en la vuelta 2 para la cota completa del prompt) rechazaba `custom: null`, que es la convención real de `combinador.js` — un cliente que sigue el contrato al pie de la letra recibía `400` en el caso más común.
  - V2-3 (no bloqueante): el diagnóstico de una falla de deploy (catálogo ausente) quedaba sin pistas en el log.
- **Vuelta 3** (este commit, la 3ª y última por `orchestration.md` §6): arregladas las V2-1/V2-2/V2-3. `reservaWorker.js` llama a `reservar()` real; la demora se inyecta pisando `Atomics.load` de forma local a cada worker, sin tocar `reserva.js`; confirmé con el mismo mutante del reviewer que el test da rojo sin el lock real. `validacion.js` trata `custom`/`descripcion` en `null` como vacío. `secreto.js` suma `error.code` al log. 56 tests (6 nuevos), con rojo medido para los tres cambios antes de aplicarlos.
