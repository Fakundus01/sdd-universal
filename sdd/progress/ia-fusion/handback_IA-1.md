# Handback IA-1 — Endpoint `/api/fusionar` con reserva de gasto, rate limit y modo simulado

- **Estado:** done
- **Rama / commit:** `ia-fusion` @ `aceaa99`
- **Quién:** implementer (MEDIO, alto) | sesión única

## Hecho
- `api/fusionar.js`: función serverless (Vercel, zero-config) que valida el pedido, aplica rate limit por IP, cae a modo simulado si falta `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, reserva el gasto bajo lock, llama al SDK real de Anthropic (`max_retries:0`), costea con el `usage` real, y nunca devuelve un 500.
- `api/_lib/reserva.js`: la reserva de gasto como `SharedArrayBuffer` + `Atomics` (lock real entre hilos, no una promesa encadenada) — `reservar`/`liberar`/`ajustar`/`gastadoActual`.
- `api/_lib/catalogo.js`: valida `tipo`/`stack` contra `web/catalogo.js` (TYPES/STACKS) leyéndolo como texto, igual que ya hace `web/tests/combinador.test.mjs` (misma técnica, sin tocar `web/`).
- `api/_lib/costo.js`, `api/_lib/rateLimit.js`, `api/_lib/secreto.js`, `api/_lib/fusionV1.js`, `api/_lib/anthropicCliente.js`, `api/_lib/constantes.js`: helpers de la tarjeta.
- `package.json` + `package-lock.json`: única dependencia nueva, `@anthropic-ai/sdk@0.133.0`, para `api/` (no para `web/`, que sigue sin build). `.gitignore` +`node_modules/`.
- 31 tests nuevos en `api/tests/*.test.mjs` (más 2 fixtures de hilos reales en `api/tests/fixtures/`), todos verdes.

## No hecho / pendiente
- **Decisión de contrato que tomé y que IA-2 (la UI) tiene que confirmar:** asumí que `tipo`/`stack` en el pedido son las **keys** del catálogo (`TYPES`/`STACKS` de `web/catalogo.js`, ej. `"webapp"`, `"ts"`), no el objeto completo `{name, extra}` que usa `Prompt.armar` internamente — `contracts.md` §8 no lo precisa y no tuve permiso para leer más SDD. Si IA-2 manda el objeto completo, hay que ajustar `api/_lib/catalogo.js` o el combinador.
- **Precios de `api/_lib/costo.js` son un peor-caso inventado, no verificado** (R19): no tuve permiso para leer `costs.md` ni para salir a confirmar precios/modelos vigentes contra la doc de Anthropic. Están documentados como placeholder en el código. Alguien con acceso a `costs.md` y a la doc del proveedor tiene que confirmarlos antes de producción.
- **`ANTHROPIC_MODEL` no tiene default hardcodeado a propósito** (para no inventar un ID de modelo de memoria, tecnologias.md lo prohíbe): si no está seteada, la función cae a modo simulado aunque haya `ANTHROPIC_API_KEY`. Hay que setear `ANTHROPIC_MODEL` en Vercel con un ID verificado antes de que el modo IA funcione en producción.
- **No implementé la distinción de 3 respuestas del playbook §A paso 5** ("ocupada, probá en unos segundos" / "no alcanza el tope de hoy" / "se alcanzó el tope") — hice solo 2 (rate limit vs. tope diario), porque los criterios de aceptación de la tarjeta no la pedían explícitamente y no quise inventar la semántica de "ocupada" (reservas en curso que podrían liberarse) sin más contexto.
- **No implementé el saneo de "reservas colgadas"** (playbook §B paso 10, `en_curso` > 15 min): no está en los criterios de aceptación de IA-1 y es más relevante para un servidor persistente que para una función serverless de vida corta (una instancia fría ya arranca en $0). Lo anoto como posible gap si el owner lo quiere para otra tarjeta.
- **No usé streaming** (SSE): no está en el contrato de `contracts.md` §8 (la respuesta es un JSON simple, no streaming), así que el punto C del playbook (cierre en `finally`, `aclose`) no aplicó.

## Cómo
- **Reserva con `SharedArrayBuffer`+`Atomics`, no una promesa encadenada.** La tarjeta pide probar la reserva con **hilos reales**, no simulados en el mismo hilo. En Node, una promesa/mutex async solo sirve dentro de un mismo hilo (un spin con `await` ya es correcto ahí, porque JS corre lo sincrónico de un tirón); pero eso haría que el test "pase por suerte" sin probar nada — el código sincrónico entre dos `await` nunca se interrumpe en un solo hilo, así que un bug real (chequear y después anotar) podría no reproducirse nunca con `Promise.all`. `Atomics.compareExchange` es la única primitiva que sigue siendo correcta tanto en el hilo principal (producción) como entre `worker_threads` reales (el test) — ver el comentario largo al principio de `api/_lib/reserva.js`.
- **Barrera de arranque en el test** (`Atomics.wait`/`notify`): los 8 hilos no empiezan a reservar hasta que el hilo principal los suelta a todos juntos — si no, "los hilos no arrancan juntos" es justo el motivo por el que, según el playbook, "un test de carrera nunca da rojo".
- **Evidencia roja real, no deducida (R29):** primero escribí `api/tests/reserva.test.mjs` con el assert "bajo lock, con 8 hilos reales, `gastado` nunca supera el tope"; corrí ESE MISMO test contra `reservarSinLock` (fixture sin lock, con una demora a propósito entre leer y anotar) y vi el rojo real — ver sección Evidencia. Con el lock, el mismo test da verde.
- **El dato que prueba la carrera es `oks` (cuántos pedidos se aprobaron), no `gastado` final.** Con hilos reales y sin lock, varias escrituras se pisan entre sí (lecturas perdidas): el contador final puede terminar **más bajo** de lo esperado en vez de más alto, que sería un resultado tranquilizador falso. El daño real — más llamadas caras aprobadas de las que el tope permite — lo mide `oks`, así que el test de rojo medido usa esa métrica (lo documenté en el propio test para que no se confunda con un bug del test).
- **`fetch` falso, SDK real** (tecnologias.md, ficha "Anthropic API"; playbook §E paso 20): `api/_lib/anthropicCliente.js` expone `_establecerFetchParaTests` para inyectar un `fetch` propio en el cliente oficial de Anthropic. Usé el `Response` global de Node (WHATWG Fetch, nativo desde Node 18) para que status, headers y body se comporten exactamente como una respuesta real — así el parseo, las clases de error (`APIError` con `.status` numérico vs. `APIConnectionError`/`APIConnectionTimeoutError` con `.status` indefinido) y el `usage` son los de verdad, no un mock inventado.
- **Clasificación de errores:** confirmé en el código fuente instalado del SDK (`node_modules/@anthropic-ai/sdk/core/error.js`, `generate()`) que cualquier rechazo de la API (4xx, 5xx, incluido 529) construye una subclase de `APIError` con `.status` numérico, y que un error de conexión/timeout construye `APIConnectionError`/`APIConnectionTimeoutError` con `.status === undefined`. Por eso `typeof error.status === 'number'` es la distinción exacta entre "rechazo de la API" (AC6: costo 0, libera) y "ambiguo" (AC6: conserva), sin tener que adivinar.
- **`max_retries:0` se verifica, no se asume:** el test de AC5 manda un 529 (que el SDK reintenta por default) y cuenta las llamadas al `fetch` falso — da 1, no 2.
- **La concatenación v1 (`api/_lib/fusionV1.js`) es la misma función para el modo simulado y la base que el modo IA le pide a Claude que mejore** (AC2 pide que la simulada dé "el mismo resultado que daría la concatenación v1"): es una sola fuente, determinista, documentada como decisión propia (ver "No hecho" sobre el contrato exacto de los bloques, que no pude leer en `blocks.md`).
- **`tipo`/`stack` se validan contra `web/catalogo.js` leyéndolo como texto** (no como módulo: toca el DOM al cargar), igual que ya hace `web/tests/combinador.test.mjs` — mismo patrón ya aceptado en el repo, sin tocar `web/`.
- **La clave nunca se loguea entera:** `api/_lib/secreto.js` tacha la clave de cualquier mensaje antes de loguearlo (además de loguear siempre el tipo del error, playbook §B paso 9); nunca se reenvía el cuerpo crudo de un error de la API a la respuesta HTTP.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `.gitignore` | +`node_modules/` (necesario para no commitear la dependencia nueva) |
| `package.json` | nuevo — `@anthropic-ai/sdk@0.133.0`, script `test` |
| `package-lock.json` | nuevo — generado por `npm install` |
| `api/fusionar.js` | nuevo — el handler |
| `api/_lib/catalogo.js` | nuevo — valida tipo/stack contra `web/catalogo.js` |
| `api/_lib/constantes.js` | nuevo — `MAX_DESCRIPCION_CHARS`, tope default, `max_tokens` |
| `api/_lib/costo.js` | nuevo — cota (bytes × peor precio) y costo real desde `usage` |
| `api/_lib/reserva.js` | nuevo — reserva bajo lock (`SharedArrayBuffer`+`Atomics`) |
| `api/_lib/rateLimit.js` | nuevo — rate limit por IP, ventana fija de 60s |
| `api/_lib/secreto.js` | nuevo — tachar la clave antes de loguear |
| `api/_lib/fusionV1.js` | nuevo — concatenación plana (modo simulado) |
| `api/_lib/anthropicCliente.js` | nuevo — cliente real, `maxRetries:0`, `fetch` inyectable en tests |
| `api/tests/*.test.mjs` (6) | nuevos — 31 tests |
| `api/tests/fixtures/reservaSinLock.js`, `reservaWorker.js` | nuevos — solo para el test de concurrencia (nunca los usa `fusionar.js`) |
| `sdd/progress/ia-fusion/current.md` | nuevo — plan y nota de zona (permitido: es mi propio progreso) |
| `sdd/progress/ia-fusion/handback_IA-1.md` | este archivo |

## Evidencia

| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. 200 `{archivos, fusion:"ia"}` con key | `api/tests/fusionar.test.mjs` → "AC1: con ANTHROPIC_API_KEY y modelo..." |
| 2. 200 `fusion:"simulada"` sin key, = concatenación v1 | `fusionar.test.mjs` → "AC2: sin ANTHROPIC_API_KEY..." y "...falte solo el modelo" |
| 3. Reserva bajo lock, 8 en paralelo nunca pasan el tope, hilos reales | `api/tests/reserva.test.mjs` → "IA-1 AC3: bajo lock, 8 hilos reales..." (worker_threads reales) + `fusionar.test.mjs` → "AC3: la reserva bloquea con 429..." |
| 4. Rate limit por IP → 429 `{error, reintentar_en}`, otras IPs sin afectar | `rateLimit.test.mjs` y `fusionar.test.mjs` → "AC4: rate limit por IP..." |
| 5. `max_retries:0`, un rechazo cuenta una vez | `fusionar.test.mjs` → "AC5: max_retries:0..." (cuenta llamadas al fetch falso) |
| 6. APIStatusError → costo 0 + libera; ambiguo → conserva | `fusionar.test.mjs` → "AC6: un APIStatusError (400)...", "...un 529...", "...timeout/corte de red..." |
| 7. tipo/stack fuera de catálogo → 400; descripcion larga → 400 | `catalogo.test.mjs`, `fusionar.test.mjs` → "AC7: ..." |
| 8. La clave nunca viaja en la respuesta ni en el log | `secreto.test.mjs`, `fusionar.test.mjs` → "AC8: la clave nunca viaja..." |

Rojo antes (R29), medido contra la base — la reserva SIN lock, con 8 hilos reales de verdad (no promesas en el mismo hilo), rompe el tope:
```text
$ git rev-parse --short HEAD
e604690
$ node --test "api/tests/reserva.test.mjs"   # con el test de AC3 apuntado a `reservarSinLock`
✔ IA-1 R29 (rojo medido): sin lock, 8 hilos reales rompen el tope (102.572ms)
✖ IA-1 AC3: bajo lock, 8 hilos reales en paralelo nunca gastan más del tope (124.6162ms)
✔ reservar()/liberar()/ajustar() fuera de la concurrencia: libera y ajusta bien (8.3123ms)
ℹ tests 3
ℹ pass 2
ℹ fail 1

✖ failing tests:
test at api\tests\reserva.test.mjs:71:1
✖ IA-1 AC3: bajo lock, 8 hilos reales en paralelo nunca gastan más del tope (124.6162ms)
  AssertionError [ERR_ASSERTION]: lo anotado tiene que ser exactamente cota × reservas aceptadas
  + actual - expected
  + 300000n
  - 2400000n
      at TestContext.<anonymous> (file:///.../api/tests/reserva.test.mjs:74:10)
```
(Revertido ya al archivo real con lock antes de seguir — este bloque es la foto del momento en que se vio el rojo, no el estado final del archivo.)

Verde después, con el lock real:
```text
$ node --test "api/tests/*.test.mjs"
ℹ tests 31
ℹ suites 0
ℹ pass 31
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 667.8852
```

`python harness/verify.py --changed` — **ROJO, pero por una causa previa a esta tarjeta y fuera de mi zona** (ver "Fuera de zona" abajo):
```text
$ python harness/verify.py --changed
verify.py --changed @ e604690 (rama ia-fusion)

── Arnés ──
[OK]    Memoria en disco: sdd/progress/ia-fusion/current.md
[OK]    Tarjetas válidas (19)
[OK]    Rutas citadas existen (222 revisadas)

── Tests de lo cambiado ──
[FAIL]  test_quick — `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests` salió con 1 (0.7s):
✖ failing tests:
test at web\tests\combinador-ui.test.mjs:197:1
✖ N3: los conteos del README y de la web coinciden con los archivos (38.403ms)
  AssertionError [ERR_ASSERTION]: web/catalogo.js: «42 situaciones»
  42 !== 43

ROJO — 1 FAIL, 0 WARN
```
Confirmado que no lo causé yo: `git diff --stat web/ README.md` contra la base (`e604690`) está vacío — no toqué ningún archivo bajo `web/` ni `README.md`. Es drift preexistente entre `web/catalogo.js` y `README.md` (un conteo de "situaciones"), ajeno a IA-1.

## Fuera de zona / riesgos
- **`web/catalogo.js` vs. `README.md`: "42 situaciones" vs "43"** — preexistente, confirmado con `git diff` vacío contra la base. No lo toqué (`web/` está prohibido en mi zona). Alguien tiene que corregir el conteo o el archivo que quedó viejo.
- **`harness.config.json` (`test`) no corre `api/tests/`:** su comando es `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests`, así que mis 31 tests nuevos NUNCA se ejecutan vía `python harness/verify.py`, aunque yo sí los corrí a mano (`node --test "api/tests/*.test.mjs"`, verde, evidencia arriba). `harness.config.json` no está en la zona de archivos de la tarjeta IA-1 (solo `api/fusionar.js`, `api/_lib/`, `package.json`/`package-lock.json`), así que no lo edité. **Sugerencia para el leader:** cambiar `"test"` a algo como `node --test \"web/tests/*.test.mjs\" \"api/tests/*.test.mjs\" && python -m unittest discover -s harness/tests` (o separar en `test`/`test_quick`), para que el arnés deje de dar un verde falso sobre `api/`.
- **`descripcion` también podría abusarse con repetición de caracteres baratos en bytes pero costosos en tokens reales de otro idioma/emoji** — la cota ya cubre esto por diseño (paso 2 del playbook: 1 token por byte UTF-8 es una cota dura incluso con emoji/CJK), así que no es un riesgo nuevo, solo lo dejo anotado por si alguien lo revisa.
- No se implementó ningún endpoint de "panel de gasto" (playbook §B paso 10 lo menciona) — no estaba en los criterios de aceptación de IA-1 ni en `contracts.md` §8.

## Cambios de spec sugeridos
- `contracts.md` §8 no precisa si `tipo`/`stack` del pedido son las keys del catálogo o el objeto `{name, extra}` — asumí las keys (ver "No hecho"). Si el leader confirma, valdría la pena agregar una línea al contrato para que IA-2 no tenga que adivinar lo mismo.
- El tope diario y el modelo (`FUSIONAR_TOPE_DIARIO_USD`, `ANTHROPIC_MODEL`) quedaron como variables de entorno sin un valor de producción fijado por mí — ver sección siguiente. Alguien con acceso a `costs.md` tiene que fijarlos con números reales antes de desplegar.

## Variables de entorno nuevas
- `ANTHROPIC_API_KEY` — la clave del proveedor; sin ella, modo simulado siempre. Va en `.env` del servidor / en Vercel, nunca en el front.
- `ANTHROPIC_MODEL` — el ID del modelo a usar; sin ella, modo simulado aunque haya key (a propósito: no quise hardcodear un ID de memoria, ver tecnologias.md). **Hay que verificarlo contra la doc vigente de Anthropic (R19) y configurarlo en Vercel.**
- `FUSIONAR_TOPE_DIARIO_USD` — tope diario de gasto en USD; default `3` si no está. **Verificar con `costs.md` (no tuve permiso para leerlo).**
- `FUSIONAR_RATE_LIMIT_POR_MINUTO` — pedidos por minuto por IP; default `20` si no está.

## Próximo paso sugerido
- IA-2 (UI del combinador): confirmar el formato exacto de `tipo`/`stack` en el pedido (ver "Cambios de spec sugeridos") antes de cablear el fetch a `/api/fusionar`.
- IA-3 (según menciona la tarjeta): sus propios tests de integración pueden reusar `api/_lib/anthropicCliente.js#_establecerFetchParaTests` para seguir sin gastar.
- Leader: decidir si vale la pena ampliar `harness.config.json` para que `api/tests/` entre al gate automático, y resolver el drift de "42 vs 43 situaciones" en `web/`.
