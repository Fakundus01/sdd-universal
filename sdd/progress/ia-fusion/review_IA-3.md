# Review IA-3 @ ca56a0e
**Veredicto vigente (vuelta 3, @ ca56a0e):** APPROVED · **mergeada a `main`** en `33ab93a` el 2026-10-19

Tres vueltas. La 1 encontró que los 56 tests de IA-1 probaban la primitiva `reservar()` y no que el handler la
usara antes de llamar (M1b gastaba 5× el tope). La 2 trajo los 5 tests a nivel endpoint, pero su assert central
—«gastado final ≤ tope», la medición literal del criterio 2— estaba satisfecho por construcción (M5b gastaba
1,24× el tope en verde). La 3 hizo que el transporte simulado derive el peor caso del **pedido real**, y con eso
el assert mide lo que dice: M5b muere por ese assert, M1b sigue muriendo por el primero, y M2/M3/M4 mueren donde
morían. Reviewer independiente en las tres vueltas; en la 3, ni el implementer ni el leader podían aprobar.

**Pendientes no bloqueantes que dejó la vuelta 3** (están en su sección, al final): M10b (`tools`/server tool use
autoriza gasto fuera de `max_tokens` y nadie lo cotiza — el más serio, zona IA-1 + un test), M14 (una línea cierra
la banda entre la reserva y el tope), la degradación silenciosa de la sonda P1, y los de la vuelta 2 (el `200` sin
`usage`, la tabla de precios sin test literal, el límite de gasto de la consola antes de producción).

---

# Vuelta 3 · @ ca56a0e
**Veredicto:** APPROVED

Revisor: `reviewer` (tier ALTO), independiente — no escribí estos tests y no participé de las vueltas 1 ni 2
(R30). El leader tampoco podía aprobar esto: dictaminó el bloqueante de la vuelta 2.

Revisado: rama `ia-fusion-IA-3-v3` en el worktree `C:\Users\Facundo\Estudio_Trabajo\sdd-universal-IA-3-v3`,
dos commits sobre `main` @ `f8a3e6c`: `e975512` (el trabajo) + `ca56a0e` (hash real en el handback + sync del
grafo). `HEAD = ca56a0e0849e3d21925914e17b7de1e93cf7830f`. No edité ni un archivo del worktree ni del repo
principal: los 11 mutantes y las 3 sondas corrieron sobre una copia sandbox fuera del repo
(`<scratchpad>/rev3/sb` = `api/` + `web/catalogo.js` + `package.json` + `node_modules/`), aplicados y
restaurados por un script propio (`<scratchpad>/rev3/bin/mut.py`).

**Resumen.** El bloqueante de la vuelta 2 está cerrado y cerrado bien. Los tres cambios pedidos están, son los
tres y nada más, y el que importaba funciona por la razón correcta: **M5b muere en G1 por el segundo assert**
(`topeEndpoint.test.mjs:152`, `gastado final USD 1.2435 > tope 1`), no de rebote, y **M1b sigue muriendo por el
primero** (`:149`). Verifiqué además que el cambio de firma de `fetchLento` no debilitó nada: M2, M3 y M4
mueren exactamente donde morían. El `usage` derivado de `init.body` no dejó una tautología nueva del otro lado
y ató también el lado de la **entrada** (mutante propio M11: 30 KB pegados al prompt después de cotizar →
muere). Nada rojo, nada skipeado, nada debilitado. Queda un agujero real que encontré con mis mutantes
(M10b: un campo del pedido distinto de `max_tokens` que autoriza gasto —`tools`/server tool use— no lo ve
nadie) y va como **pendiente no bloqueante para el leader**: cerrarlo pide tocar `costo.js` (zona de IA-1) y un
test nuevo, las dos cosas fuera de lo que la vuelta 2 pidió para esta vuelta.

---

## Verificación re-ejecutada (mis comandos, salida literal)

```text
$ node api/tests/correr.mjs
...
✔ AC4: una IP que pasa el límite recibe 429 con reintentar_en, otra IP no se ve afectada (0.9167ms)
✔ la ventana se reinicia pasado el minuto (0.8594ms)
✔ IA-1 R29 (rojo medido): sin lock, 8 hilos reales rompen el tope (103.4307ms)
✔ IA-1 AC3: bajo lock, 8 hilos reales en paralelo nunca gastan más del tope (295.8599ms)
✔ reservar()/liberar()/ajustar() fuera de la concurrencia: libera y ajusta bien (3.9959ms)
...
✔ G1: 8 pedidos en paralelo al endpoint nunca gastan más que el tope (S33, mata M1b) (73.2343ms)
✔ G2: la cota sale del prompt real, no de un número fijo (mata M2) (3.7384ms)
✔ G3: un éxito deja anotado el costo real, no la cota entera (mata M3) (2.3159ms)
✔ G3b: con tope para dos cotas, tres éxitos chicos seguidos entran los tres (mata M3) (3.4371ms)
✔ G4: un corte a mitad de la respuesta conserva la reserva (ambiguo, mata M4) (4.8689ms)
...
ℹ tests 61
ℹ suites 0
ℹ pass 61
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 583.5295
```

```text
$ python harness/verify.py
verify.py @ ca56a0e (rama ia-fusion-IA-3-v3)

── Arnés ──
[OK]    Memoria en disco: sdd/progress/ia-fusion-IA-3-v3/current.md
[OK]    Tarjetas válidas (21)
[OK]    Rutas citadas existen (282 revisadas)
[OK]    Arranque liviano: paquete 9199 bytes de 10240 (AGENTS.md + SDD-COMPACT.md); custom.md 990 bytes (aparte; aviso > 2048); 33 reglas definidas

── Lint ──
[WARN]  sin 'lint' en harness.config.json

── Tests ──
[OK]    test — `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests && python -m unittest discover -s graph/_meta/tests && python -m unittest discover -s cerebro/tests && node api/tests/correr.mjs` (116.1s): Ran 241 tests in 9.028s · OK (skipped=3)

VERDE — 0 FAIL, 1 WARN
```

El WARN de `lint` y los 3 `skipped` son preexistentes (están desde antes de la tarjeta).

```text
$ python graph/_meta/sync_graph.py --check
[graph] 13 nodo(s) al día
exit=0
```

El sync del grafo de `ca56a0e` (`graph/api.md`, `graph/sdd.md`) es correcto, no un hash puesto a mano.

### Estabilidad (20 corridas seguidas del archivo, en el worktree)

```text
run 1: pass 5 fail 0      run 2: pass 5 fail 0      ...      run 20: pass 5 fail 0
=== corridas con falla: 0/20
```

### G1 no depende del `sleep` de 30 ms (re-medido con la firma nueva)

Con `demoraMs = 0` por default en la copia sandbox: código real 5/5 verde, **M5b sigue muriendo** con
`gastado final USD 1.2435 > tope 1` y **M1b sigue muriendo** con `8 llamada(s) × USD 0.63626 = USD 5.0901`. La
demora sigue siendo decorativa: `manejar()` corre sincrónico hasta el primer `await`, así que las 8 reservas se
resuelven antes de que cualquier `fetch` complete.

### Criterio 7: la suite no sale a la red (re-medido con precarga propia)

```text
$ node --import file:///<scratchpad>/rev3/bin/bloquear_fetch_rev.mjs --test "api/tests/*.test.mjs"
     17 fetch reales registrados: 0        (una línea por proceso/worker)
      1 ℹ tests 61
      1 ℹ pass 61
      1 ℹ fail 0
```

Precarga que reemplaza `globalThis.fetch` por uno que cuenta y tira error. Cero llamadas reales en los 17
procesos, incluidos los `worker_threads` de `reserva.test.mjs`. Ninguna clave real en el entorno en ningún
momento (`sk-ant-test-clave` es un literal evidente y `afterEach` restaura las 4 variables).

---

## Mutantes (aplicados por mí, no por el handback)

Todos sobre `<scratchpad>/rev3/sb`, con `git hash-object` del worktree verificado antes y después. «cae en» es
el test que falla; la línea es el assert exacto que revienta.

| Mutante | Qué cambia | Resultado | ¿Coincide con el handback? |
|---|---|---|---|
| **M5b** · `max_tokens: MAX_TOKENS_SALIDA * 2` en `messages.create`, cota intacta | `api/fusionar.js:158` | **MUERE** · 5/4/1 · cae en **G1**, assert de `:152`: `AssertionError [ERR_ASSERTION]: gastado final USD 1.2435 > tope 1`. G2/G3/G3b/G4 siguen verdes: **muere por el assert del criterio 2, no de rebote** | **Sí**, literal |
| **M1b** · chequear-y-después-llamar, con el `catch` que anota la cota si el error es ambiguo | `reservar()` → leer y comparar sin anotar; `ajustar(+costoReal)` tras el éxito; `if (!esRechazoDeLaAPI) ajustar(+cota)` | **SIGUE MURIENDO** · 5/4/1 · cae en **G1**, assert de `:149`: `8 llamada(s) al modelo × USD 0.63626 = USD 5.0901 contra un tope de USD 1 (codigos: 200,200,200,200,200,200,200,200)` | **Sí**, literal |
| **M2** · cota fija USD 0,06 | `const cotaUSD = 0.06;` | **SIGUE MURIENDO** · 5/3/2 · cae en **G1** (`:149`) y **G2** (`:171`, `el pedido largo (cota USD 0.8605) tiene que no entrar en un tope de USD 0.7480`) | Sí |
| **M3** · no ajusta al costo real tras un éxito | se borra `ajustar(estado, usdAMicros(costoReal) - cotaMicros)` | **SIGUE MURIENDO** · 5/3/2 · cae en **G3** (`:194`, `quedó anotada la cota en vez del costo real (esperado 525 micro-USD)`) y **G3b** (`:207`) | Sí |
| **M4** · libera con cualquier error | `liberar(estado, cotaMicros)` sin el `if (esRechazoDeLaAPI)` | **SIGUE MURIENDO** · 5/4/1 · cae en **G4** (`:231`, `se liberó la reserva de un fallo ambiguo…`) | Sí |
| **M11** · 🟢 propio — 30 KB de relleno pegados al `system` **después** de calcular la cota | `system: INSTRUCCION_SISTEMA + '\n' + 'R'.repeat(30000)` | **MUERE** · 5/4/1 · cae en **G1** (`:152`, `gastado final USD 1.191619 > tope 1`) | — (prueba que el arreglo ató también el lado de la **entrada**, no solo `max_tokens`) |
| **M13** · 🟢 propio — `maxRetries: 3` (cada reintento es otra llamada contra una sola reserva) | `api/_lib/anthropicCliente.js:19` | **MUERE** en la suite · cae en `fusionar.test.mjs:227` («AC5: max_retries:0 — un rechazo del modelo cuenta una sola vez»). No lo ve `topeEndpoint.test.mjs` (5/5), y está bien: es zona de IA-1 y ahí está cubierto | — |
| **M12** · 🟢 propio — el modelo se llama con el pedido **crudo** (sin validar) | `mensajeUsuario(pedidoCrudo)` | **SOBREVIVE** 5/5, pero es un **mutante equivalente**: `validarPedido` rechaza con 400 todo lo que excede los topes, así que el crudo que llega al prompt no puede ser más grande que el validado. No es un agujero | — |
| **M14** · 🔴 propio — `max_tokens: MAX_TOKENS_SALIDA + 4096` (1,5× de salida, cota intacta) | `api/fusionar.js:158` | **SOBREVIVE** 5/5. Gasta **USD 0,9363 contra una reserva de USD 0,6363** (47 % más de lo reservado) sin pasar el tope de 1, así que el criterio 2 literal no se viola. Marca el ancho de la banda del assert: ve desgastes > 1,59× del gasto de un pedido. Ver pendiente 2 | — |
| **M10** · 🔴 propio — presupuesto de *thinking* además de `max_tokens` | `thinking: { type: 'enabled', budget_tokens: MAX_TOKENS_SALIDA * 4 }` | **SOBREVIVE** 5/5. El pedido autoriza 40.960 tokens de salida (USD 3,072 al peor precio) contra una reserva de USD 0,636: el test cobra solo `max_tokens`. Atenuante: la API real exige `max_tokens > budget_tokens`, así que *este* shape daría 400 en producción | — |
| **M10b** · 🔴 propio — `tools: [{ type: 'web_search_20250305', max_uses: 50 }]`, cota y `max_tokens` intactos | `api/fusionar.js:156-161` | **SOBREVIVE** 5/5 **y 61/61**. Es el más serio: el server tool use se cobra **por búsqueda**, fuera de `max_tokens`, y `costoRealUSD` no lee `server_tool_use` del `usage` (solo input/output/cache), así que sería **gratis en el registro**. Shape válido para la API real. Ver pendiente 1 | — |
| **M9** · precio de salida ÷ 10 en `api/_lib/costo.js:17` | `7.5 / 1_000_000` | **SOBREVIVE** 5/5 y 61/61 — confirma que lo que el comentario nuevo del encabezado declara como limitación es exactamente cierto | — (declarado) |

Los dos mutantes que el handback declara (M5b, M1b) mueren donde dice, en el assert que dice y con el mensaje
que dice, letra por letra. Los tres de regresión (M2, M3, M4) mueren donde morían en la vuelta 2: **el arreglo
no debilitó ningún otro test**.

### Sonda propia: cuánta banda le queda al assert arreglado

```text
$ node <scratchpad>/rev3/bin/sonda.mjs        # el mismo pedido de G1, código real
bytes del prompt cotizado (+500 de margen)   : 666 -> 1166
bytes del CUERPO del pedido (lo que cobra)   : 783
margen de entrada que queda (tokens)         : 383
max_tokens cotizado / pedido                 : 8192 / 8192
cota reservada (USD)                         : 0.636262
costo real derivado del pedido (USD)         : 0.629081
  de los cuales salida                       : 0.614400
  de los cuales entrada                      : 0.014681
status / fusion                              : 200 ia
gastado final anotado (USD)                  : 0.629082  tope: 1
banda ciega del assert `gastado <= tope`     : hasta 1.590 x el gasto real de un pedido
```

Dos cosas que importan acá:

1. **No hay fragilidad.** `bytesUtf8(init.body)` (783) queda por debajo de `promptBytes + 500` (1166): el JSON
   del pedido, con su escapado y sus claves, entra en el margen de proveedor de `estimarCotaUSD`, así que el
   `usage` derivado nunca empuja el gasto por arriba de la cota con el código real. Y si mañana el prompt
   crece mucho, el que avisa primero es el assert honesto de `:129` (`la cota (…) tiene que entrar en el tope de
   1 para que el test tenga sentido`), no un rojo misterioso.
2. **No es una tautología nueva, pero tiene banda.** El assert ya no puede pasar por construcción (M5b y M11 lo
   hacen fallar), pero mide el criterio 2 literal («no pasar el tope»), no el invariante más fuerte
   («no gastar más de lo reservado»): M14 gasta 1,47× la reserva y pasa. Es exactamente lo que pide la
   tarjeta, así que no bloquea; la mejora de una línea está en el pendiente 2.

### Sonda propia: el test se degrada en silencio si el pedido deja de ser un string JSON

El `usage` derivado hace `JSON.parse(init.body)`. Si el SDK alguna vez pasa el cuerpo como bytes o como stream,
ese `JSON.parse` tira dentro del `fetch` falso, el `catch` del handler lo trata como error ambiguo, responde
200 `fusion:"simulada"` **y los cuatro asserts de G1 siguen pasando**:

```text
$ node <scratchpad>/rev3/bin/sonda_p1.mjs      # mismo fetch del test, con init.body como Uint8Array
codigos            : 200,429,429,429,429,429,429,429
fusion de los 200  : simulada
llamadas al modelo : 1  oks: 1  (assert llamadas===oks: true )
gastado final      : 0.636263 <= 1 -> true
```

Y con esa degradación, **M5b resucita**: `P1` sola → 5/5 verde; `P1 + M5b` → 5/5 verde. Hoy no pasa (M5b muere),
así que no bloquea; la red de contención es una línea (pendiente 3).

---

## Criterios de aceptación de IA-3

| # | Estado | Evidencia (re-verificada por mí) |
|---|---|---|
| 1 · SDK real sobre transporte simulado, nunca un mock del cliente | **Cubierto** | `api/_lib/anthropicCliente.js:18-22` inyecta solo `fetch` en el `Anthropic` real (`maxRetries: 0`); `topeEndpoint.test.mjs:83-98` devuelve un `Response` nativo y `:216-224` hace pasar al SDK por un `ReadableStream` que se corta a mitad. Prueba positiva de que el SDK está en el camino: M13 (`maxRetries: 3`) cambia el conteo de llamadas, algo que un mock escrito a mano no haría |
| 2 · Hilos reales + barrera; N pedidos contra tope bajo; **gasto registrado al final** ≤ tope | **Cubierto — era el bloqueante** | Hilos reales y compuerta compartida en la primitiva: `api/tests/reserva.test.mjs:63` y `:79` (8 `Worker` reales, `SharedArrayBuffer`), re-ejecutados verdes. A nivel endpoint, `topeEndpoint.test.mjs:125-155`: 8 pedidos con `Promise.all`, 8 IPs distintas, y ahora **los dos asserts muestran rojo con mutantes plausibles**: `:149` mata a M1b y M2, `:152` mata a M5b (`gastado final USD 1.2435 > tope 1`) y a mi M11. La tautología de la vuelta 2 está cerrada: el `usage` lo decide el pedido (`fetchLento` en `:81-101`), no las constantes de la cota |
| 3 · Fallback/reintento tardío: 529 o timeout no deja la reserva colgada ni cobra de más | **Cubierto** | `fusionar.test.mjs:227` (529 → una sola llamada), `:252` (529 → gastado 0), `:262` (corte de red sin status → conserva), `:276` y `:289` (500 y 504 conservan). Archivo byte a byte igual al de `main` y re-ejecutado verde; M4 confirma que esos asserts son reales |
| 4 · Rate limit por IP: misma IP → 429; IPs distintas no se afectan | **Cubierto** | `fusionar.test.mjs:189`, `rateLimit.test.mjs:7` y `:23`. G1 lo refuerza por el otro lado: con 8 IPs distintas el rate limit no interviene y el freno tiene que ser el tope (`:138-141`) |
| 5 · 4xx cuesta 0; corte a mitad de respuesta conserva la reserva | **Cubierto** | 4xx → 0: `fusionar.test.mjs:240`. Corte a mitad del **cuerpo**: `topeEndpoint.test.mjs:212-233` (200 `fusion:"simulada"`, `gastado > 0`, y el contrato §8 explícito en el mensaje del assert `:229`). Mata a M4 con su propio mensaje |
| 6 · Un test por cada forma de romper el tope de S33 | **Cubierto** | **6a carrera en el handler:** G1 mata a M1b con la cuenta en el mensaje. **6b la reserva acota el pedido real:** cerrado en los dos lados — salida (M5b muere) y entrada (M2, M7/M8 de la vuelta 2 y mi M11 mueren). **6c «ocupada» sin nada en vuelo:** G3 fija el costo real exacto (525 micro-USD) y G3b los tres éxitos seguidos; los dos matan a M3. Lo que queda abierto (M10b: un campo del pedido distinto de `max_tokens` que autoriza gasto) no es una de las tres formas de S33 y pide tocar `costo.js`, zona de IA-1 → pendiente 1 |
| 7 · Nunca llaman a la API real; no gastan un centavo en CI | **Cubierto** | Re-medido con precarga propia: 0 `fetch` reales en 61 pruebas y 17 procesos/workers. `beforeEach`/`afterEach` (`:106-123`) limpian el `fetch`, el estado del día, el rate limit, el cache del catálogo y las 4 variables de entorno; mismo resultado corriendo el archivo solo y dentro de la suite |

---

## Calidad de los tests (no solo el resultado)

- **El comentario nuevo del encabezado (`:11-16`) es cierto, frase por frase.** Lo chequeé contra el archivo:
  `cotaUSDDe()` **sí** llama a `estimarCotaUSD` de producción (`:42`), G3 **sí** compara contra `costoRealUSD`
  (`:193`), en el archivo **no** hay ningún precio ni ninguna fórmula de costo reimplementada
  (`grep -nE "75|1\.25|1_000_000|1e6" topeEndpoint.test.mjs` solo devuelve `const MICROS = 1_000_000` y su uso
  en `:75`, que es conversión de micro-dólares, no un precio), y lo que el test sí reimplementa es qué bytes
  entran en la cota (`:43`, el mismo
  `INSTRUCCION_SISTEMA + '\n\n' + mensajeUsuario(pedido)` que `fusionar.js:87`). La limitación que declara la
  **medí yo**: M9 (precio de salida ÷ 10) sobrevive 5/5 y 61/61. Cambió una afirmación falsa por una verdadera,
  con su limitación nombrada; es mejor comentario que el anterior.
- **El `usage` derivado no dejó un assert tautológico del otro lado.** Los cuatro asserts de G1 pueden fallar
  con mutantes plausibles: `:149` con M1b/M2, `:152` con M5b/M11, `:153` quedaría rojo si la cota saliera por
  encima del tope (y `:129` lo custodia antes), `:154` (`llamadas === oks`) es el que mata cualquier llamada sin
  reserva — lo probé de rebote: en la sonda P1 es el único que seguía atando el conteo. G2, G3, G3b y G4 pasan
  `usage` explícito, así que el cambio no los tocó, y sus mutantes siguen muriendo.
- **Flakiness: 0/20** en el worktree, y el test no depende de la demora de 30 ms (verificado con `demoraMs = 0`:
  verde con el código real, M5b y M1b siguen muriendo).
- **Sin red, sin secretos, sin basura.** 0 `fetch` reales; la única clave es el literal `sk-ant-test-clave`; el
  diff no agrega `console.log`, ni `.only`, ni `skip`, ni dependencias, ni archivos throwaway.
- **Mensajes de rojo:** siguen siendo lo mejor del archivo. `gastado final USD 1.2435 > tope 1` se lee sin
  abrir el test, y el de `:149` trae la cuenta completa con los códigos HTTP.
- **Alcance del diff:** mínimo de verdad. 38 líneas en un solo archivo de test, sin tests nuevos, exactamente
  los 3 cambios pedidos. Es la vuelta corta que la vuelta 2 pidió.

## Zona de archivos

```text
$ git diff --name-only main..ia-fusion-IA-3-v3
api/tests/topeEndpoint.test.mjs
graph/api.md
graph/sdd.md
sdd/progress/ia-fusion-IA-3-v3/current.md
sdd/progress/ia-fusion/handback_IA-3.md

$ git diff main..ia-fusion-IA-3-v3 -- api/ ':(exclude)api/tests/'
(vacío)

$ git hash-object api/fusionar.js
56a62dda9faf9c51e8f3e6be4cedaea807aabde4
$ git rev-parse main:api/fusionar.js
56a62dda9faf9c51e8f3e6be4cedaea807aabde4
$ git rev-parse ia-fusion-IA-3-v3:api/fusionar.js
56a62dda9faf9c51e8f3e6be4cedaea807aabde4
```

Impecable: dentro de `api/` solo `api/tests/`, y `api/fusionar.js` es **el mismo blob `56a62dda…` que en
`main`** — antes y después de mis 11 mutantes (`diff -r` del sandbox contra el worktree: `api/ IDENTICO`). Lo
de fuera de `api/` es lo esperado: el handback, el `current.md` de la rama y el sync del grafo (verificado con
`sync_graph.py --check`, 13 nodos al día). **`sdd/cards/IA-3.md` no aparece en el diff y está bien:** ya quedó
en `estado: review` en `main` (`git show main:sdd/cards/IA-3.md` → `estado: review`), así que esta vuelta no
tenía nada que cambiarle. Sin features mezcladas.

Al terminar, el worktree quedó limpio:

```text
$ git status --porcelain
(vacío)
```

---

## Checkpoints

- **C1 · El arnés está sano:** `[x]` — `verify.py` completo VERDE @ `ca56a0e` (0 FAIL, 1 WARN preexistente de
  `lint`), 282 rutas citadas OK, 21 tarjetas válidas, memoria en disco en
  `sdd/progress/ia-fusion-IA-3-v3/current.md`. `sync_graph.py --check`: 13 nodos al día.
- **C2 · Cumple la tarjeta:** `[x]` — los 7 criterios cubiertos (tabla arriba); los dos que la vuelta 2 dejaba
  parciales (2 y 6b) ahora tienen evidencia que puede dar rojo, medida por mí. Zona de archivos impecable y
  `api/fusionar.js` intacto byte a byte. Los 3 cambios requeridos están hechos, y solo esos 3.
- **C3 · Respeta diseño y convenciones:** `[x]` — ni una línea de producción nueva; el test respeta
  contracts §8 (G4 afirma el «nunca un 500 al usuario» explícitamente), usa las funciones exportadas de `_lib`
  en vez de duplicar fórmulas o catálogo, no agrega dependencias. ADR-017 (freno por instancia, no tope global)
  sigue bien dicho y sin prometer más de lo que el test prueba.
- **C4 · La verificación es real:** `[x]` — re-ejecuté todo con mis comandos (`correr.mjs` 61/61, `verify.py`
  VERDE, `sync_graph.py --check`, 20 corridas del archivo, precarga anti-red, 11 mutantes, 3 sondas). El rojo
  medido de R29 del handback es honesto y reproducible: M5b muere por el assert de `:152` y M1b por el de
  `:149`, con los mensajes literales que declara. Los de regresión (M2, M3, M4) mueren donde morían. Nada
  skipeado, nada debilitado, nada en rojo.
- **C5 · Cierra limpio:** `[x]` — handback completo y commiteado, con la sección «Vuelta 3» arriba y **el hash
  real** (`e975512`), que era la nota menor de la vuelta 2; `current.md` de la rama presente y honesto (incluye
  «lo que se probó y no anduvo»); sin archivos throwaway, sin prints de debug, sin secretos; `git status` del
  worktree vacío.

Cinco casillas en `[x]`: **APPROVED, sin reservas.** El merge a `main` lo hace el leader.

---

## Pendientes no bloqueantes para el leader

1. **Un campo del pedido distinto de `max_tokens` puede autorizar gasto que nadie ata a la reserva (mío, M10b
   — el más serio).** `tools: [{ type: 'web_search_20250305', max_uses: 50 }]` en `messages.create` sobrevive
   5/5 y 61/61: el server tool use se cobra por búsqueda, fuera de `max_tokens`, `estimarCotaUSD` no lo cotiza y
   `costoRealUSD` (`api/_lib/costo.js:34-46`) no lee `server_tool_use` del `usage`, así que quedaría **gratis en
   el registro**. M10 (presupuesto de *thinking*) es la misma familia, más atenuada porque la API real exige
   `max_tokens > budget_tokens`. Cierre barato y en dos zonas: (a) en `api/tests/`, un assert que fije las
   claves del cuerpo del pedido — `assert.deepEqual(Object.keys(JSON.parse(init.body)).sort(), ['max_tokens','messages','model','system'])` —
   para que cualquier campo nuevo que autorice gasto ponga el test en rojo hasta que alguien lo cotice; (b) en
   zona de IA-1, que `costoRealUSD` sume `server_tool_use`. Es trabajo de otra tarjeta: no está en los 7
   criterios de IA-3 y pide tocar `costo.js`, que esta tarjeta tenía vedado.
2. **El assert mide el tope, no la reserva (mío, M14).** `max_tokens + 4096` gasta USD 0,9363 contra una reserva
   de USD 0,6363 (47 % más de lo reservado) y pasa, porque no cruza el tope de 1. Una línea cierra la banda
   entera: `assert.ok(gastadoUSD() <= llamadas * cota + 1e-9, …)` («gastar más de lo reservado»), que es el
   invariante fuerte y mata también a M5b y a M14. No bloquea porque el criterio 2 pide literalmente el tope.
3. **El transporte derivado puede degradarse en silencio (mío, sonda P1).** Si `init.body` deja de ser un string
   JSON, `JSON.parse` tira dentro del `fetch` falso, el handler lo toma como error ambiguo y G1 pasa verde
   midiendo nada — con M5b incluido. Una línea lo vuelve ruidoso: en G1, para las respuestas 200, assert
   `cuerpo(res).fusion === 'ia'`.
4. **Sigue abierto de la vuelta 2 (zona de IA-1, no de IA-3):** un `200` válido **sin `usage`** libera toda la
   reserva (`costoRealUSD({}) === 0` + `fusionar.js:165`); la tabla de precios no la fija ningún test (lo
   re-confirmé: M9 sobrevive 61/61, y el comentario nuevo del encabezado ya lo deja escrito en el código);
   ADR-017, el tope global real es el límite de gasto de la consola de Anthropic, hay que configurarlo antes de
   producción.
5. **Detalle de alcance de G1 (de la vuelta 2, sigue):** nada comprueba que los 7 rechazados traigan el 429
   **del tope** y no el del rate limit. Con 8 IPs distintas hoy no puede ser el rate limit; chequear el cuerpo
   (`reintentar_en` hasta medianoche) haría el test inmune a que mañana cambie el límite por IP.

## Mejoras al arnés detectadas

- **La regla «el transporte simulado responde en función del pedido, no de constantes» quedó validada: ya es
  candidata firme a `playbooks/ia-en-el-producto.md` §E.** No solo mató a M5b: mi M11 (30 KB pegados al prompt
  después de cotizar) muere por el mismo cambio, y con el `usage` fabricado de la vuelta 2 habría sobrevivido.
  Dos mutantes de familias distintas con una línea de test: la regla se paga sola.
- **Corolario nuevo, de esta vuelta: un transporte que deriva del pedido necesita un assert que falle fuerte si
  el pedido cambia de forma.** La sonda P1 muestra el fracaso silencioso: el `JSON.parse` del transporte se come
  el error vía el `catch` del handler y el test queda verde midiendo nada. Regla: cuando el `fetch` falso derive
  algo del pedido, el test tiene que afirmar también que la respuesta vino del modelo (`fusion: "ia"`), o que
  las claves del cuerpo son las esperadas.
- **Y el corolario fuerte: en un control de gasto hay que fijar la lista de campos que autorizan gasto, no solo
  el que hoy existe.** `max_tokens` quedó atado; `thinking`, `tools`/server tool use, batch o code execution no.
  Un assert de «las claves del pedido son exactamente estas» convierte cada campo nuevo en un rojo que obliga a
  cotizarlo. Es la generalización de lo que la vuelta 2 dejó escrito («mutar lo que se reserva *y* lo que se
  autoriza a gastar»).
- **R29 medido por assert, no por test: funcionó.** Esta vuelta se pudo juzgar en 10 minutos porque el rojo se
  pudo atribuir a una línea (`:152` vs `:149`). Vale la pena que el formato del «rojo medido» del handback pida
  la **línea del assert** además del nombre del test; el handback de esta vuelta lo logra de hecho, citando el
  mensaje, pero por convención, no por regla.
- **La precarga `node --import` que bloquea `globalThis.fetch` ya va por su tercera vuelta a mano.** Debería ser
  una opción del comando `test` del arnés para proyectos con IA (N4), con el conteo de `fetch` reales como FAIL.
- **Dos chequeos de higiene que el arnés podría automatizar y hoy hace el reviewer a mano, los dos mecánicos:**
  (a) `git diff <base>..<hash> -- <zona prohibida de la tarjeta>` vacío + `git hash-object` del archivo vedado
  igual al de la base (la zona ya está declarada en el MD de la tarjeta); (b) `sync_graph.py --check` después
  de un commit de sync — este ya existe, solo falta que `verify.py` lo corra (hoy no aparece en su salida).

---

# Vuelta 2 · @ 3335fe4
**Veredicto:** CHANGES_REQUESTED · *resuelto en la vuelta 3 (ver arriba)*

Revisor: reviewer (tier ALTO), independiente — no escribí estos tests (R30). Diff revisado: `git show 3335fe4`
(`api/tests/topeEndpoint.test.mjs` nuevo, + `graph/sdd.md`, `sdd/cards/IA-3.md` y el handback). Working tree de
`C:\Users\Facundo\Estudio_Trabajo\sdd-universal` (rama `cerebro-oficio`, idéntico a `main` en todo lo revisado:
`git hash-object api/fusionar.js` = `git rev-parse 3335fe4:api/fusionar.js` = `56a62dda`). No edité ningún archivo
del repo: los mutantes corrieron sobre una copia sandbox fuera del repo (`api/` + `web/catalogo.js` + `package.json`
+ `node_modules/`).

**Resumen.** Los cuatro tests pedidos están, hacen lo que dicen, y los cuatro mutantes del handback mueren donde dice
y con la falla que dice: lo verifiqué aplicándolos yo. 4 de los 5 tests son sólidos. Bloquea **una sola cosa**, de la
misma forma que bloqueó la vuelta 1: el segundo assert de G1 (`gastado final ≤ tope`, que es la medición literal que
pide el criterio 2) **está satisfecho por construcción**. El `usage` del transporte simulado lo fabrica el propio test
con las mismas constantes con que el handler calcula la cota, así que nunca puede exceder lo reservado. Mi mutante
propio **M5b** —la cota se calcula con `MAX_TOKENS_SALIDA` pero la llamada pide `MAX_TOKENS_SALIDA * 2`— pasa las 61
pruebas en verde, y **un solo pedido** anota USD 1,2288 contra un tope de USD 1. El arreglo son 2 líneas en el
`fetch` falso, ya lo probé: queda verde con el código real y mata a M5b (y sigue matando a M1b).

## Verificación re-ejecutada

```text
$ node api/tests/correr.mjs
✔ G1: 8 pedidos en paralelo al endpoint nunca gastan más que el tope (S33, mata M1b) (80.4678ms)
✔ G2: la cota sale del prompt real, no de un número fijo (mata M2) (4.2785ms)
✔ G3: un éxito deja anotado el costo real, no la cota entera (mata M3) (4.0588ms)
✔ G3b: con tope para dos cotas, tres éxitos chicos seguidos entran los tres (mata M3) (4.8455ms)
✔ G4: un corte a mitad de la respuesta conserva la reserva (ambiguo, mata M4) (7.6586ms)
ℹ tests 61
ℹ suites 0
ℹ pass 61
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 716.4494
```

```text
$ python harness/verify.py
verify.py @ 550f155 (rama cerebro-oficio)

── Arnés ──
[OK]    Memoria en disco: sdd/progress/cerebro-oficio/current.md
[OK]    Tarjetas válidas (21)
[OK]    Rutas citadas existen (282 revisadas)
[OK]    Arranque liviano: paquete 9199 bytes de 10240 (AGENTS.md + SDD-COMPACT.md); custom.md 990 bytes (aparte; aviso > 2048); 33 reglas definidas

── Lint ──
[WARN]  sin 'lint' en harness.config.json

── Tests ──
[OK]    test — `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests && python -m unittest discover -s graph/_meta/tests && python -m unittest discover -s cerebro/tests && node api/tests/correr.mjs` (160.0s): Ran 265 tests in 22.278s · OK (skipped=3)

VERDE — 0 FAIL, 1 WARN
```

El WARN de `lint` y los 3 `skipped` ya estaban antes de la tarjeta.

El repo quedó intacto al terminar (los mutantes corrieron todos en la copia sandbox):

```text
$ git status --porcelain
 M .serena/project.yml
?? .serena/memories/
?? .serena/project.yml.bak

$ git diff --stat HEAD -- api/
(vacío)
```

Los tres de `.serena/` ya estaban antes de empezar y no son de esta tarjeta.

### Estabilidad (20 corridas seguidas de `topeEndpoint.test.mjs`)

```text
run 1: ℹ pass 5 | ℹ fail 0      ...      run 20: ℹ pass 5 | ℹ fail 0
=== corridas con falla: 0/20
```

**G1 no depende del `sleep` de 30 ms.** Lo probé bajando `demoraMs` a 0 en la copia sandbox: el código real sigue
verde (5/5) y M1b **sigue muriendo** en G1 con el mismo assert. Y tiene que ser así: `manejar()` corre sincrónico
hasta el primer `await` (`validarPedido` → `permitir` → `reservar` no esperan nada), así que las 8 reservas se
resuelven antes de que cualquier `fetch` complete, con demora o sin ella. El `sleep` no es lo que hace pasar el test;
es decorativo. Bien.

### Criterio 7: la suite no sale a la red (re-medido)

```text
$ node --import file:///…/bloquear_fetch.mjs --test "api/tests/*.test.mjs"
fetch reales registrados: 0        (una línea por proceso/worker: 17 líneas, todas en 0)
ℹ tests 61
ℹ pass 61
ℹ fail 0
```

Precarga propia que reemplaza `globalThis.fetch` por uno que registra y falla. Cero llamadas reales, incluidos los
`worker_threads` de `reserva.test.mjs`. Sin clave real en el entorno en ningún momento.

## Mutantes

Todos sobre la copia sandbox de `api/fusionar.js` (`<scratchpad>/sandbox`), aplicados y restaurados por script
(`mutar.py`); el repo nunca se tocó. «cae en» es el test que falla; entre paréntesis, los conteos contra
`topeEndpoint.test.mjs` solo / contra la suite completa.

| Mutante | Qué cambia en `api/fusionar.js` | Resultado | Coincide con el handback |
|---|---|---|---|
| **M1b** · chequear y después llamar, con el `catch` prolijo (anota la cota si el error es ambiguo) | `reservar()` → leer `gastadoActual` y comparar sin anotar; tras el éxito `ajustar(+costoReal)`; en el `catch`, `if (!esRechazoDeLaAPI) ajustar(+cota)` | **MUERE** · 4/1 (tope) · 60/1 (suite) · cae en **G1**: `AssertionError [ERR_ASSERTION]: 8 llamada(s) al modelo × USD 0.63626 = USD 5.0901 contra un tope de USD 1 (codigos: 200,200,200,200,200,200,200,200)` | **Sí**, literal |
| **M2** · cota fija USD 0,06 | `const cotaUSD = 0.06;` | **MUERE** · 3/2 · 59/2 · cae en **G1** y **G2**: `el pedido largo (cota USD 0.8605) tiene que no entrar en un tope de USD 0.7480` | **Sí** |
| **M3** · no ajusta al costo real tras un éxito | se borra `ajustar(estado, usdAMicros(costoReal) - cotaMicros)` | **MUERE** · 3/2 · 59/2 · cae en **G3** (`quedó anotada la cota en vez del costo real (esperado 525 micro-USD)`) y **G3b** (`el pedido 2 no entró…`) | **Sí** |
| **M4** · libera con cualquier error | `liberar(estado, cotaMicros)` sin el `if (esRechazoDeLaAPI)` | **MUERE** · 4/1 · 57/4 · cae en **G4** (`se liberó la reserva de un fallo ambiguo…`) y, de rebote, en los 3 tests de «lo ambiguo conserva» de IA-1 | **Sí** (el handback cuenta solo el archivo nuevo) |
| **M5b** · 🔴 **propio** — la cota se calcula con `MAX_TOKENS_SALIDA` (8192) pero la llamada pide `MAX_TOKENS_SALIDA * 2` | `max_tokens: MAX_TOKENS_SALIDA * 2` en `messages.create` | **SOBREVIVE** · 5/0 · **61/0** | — |
| M5 · lo mismo pero × 8 (65536) | `max_tokens: MAX_TOKENS_SALIDA * 8` | muere 52/9, pero **por accidente**: el SDK real tira `AnthropicError` («streaming recomendado») antes de salir, y lo que falla son asserts de `fusion:"ia"` y de `maxRetries`, ninguno sobre el tope. Un rojo que dice «el modelo dejó de funcionar», no «se rompió el tope» | — |
| M6 · propio — la cota ignora `INSTRUCCION_SISTEMA` | `promptBytes: bytesUtf8(mensajeUsuario(pedido))` | **SOBREVIVE** · 61/0. Subestima ~USD 0,02 por pedido (constante, no la controla el usuario): poco daño, pero marca el ancho de la banda ciega de G2 | — |
| M7 · propio — la cota cuenta la **mitad** de los bytes del prompt | `promptBytes: Math.floor(bytes/2)` | muere · cae en G2 | — |
| M8 · propio — la cota ignora `custom` (8000 bytes que controla el usuario) | `promptBytes: bytes(prompt) - bytes(pedido.custom)` | muere · cae en G2 | — |
| M9 · propio, en `api/_lib/costo.js` — precio de salida ÷ 10 | `PEOR_PRECIO_SALIDA_USD_POR_TOKEN = 7.5 / 1_000_000` | **SOBREVIVE** · 61/0 (ver «calidad de los tests») | — |

Los cuatro mutantes del handback mueren donde dice y con el tipo de falla que dice. La cuenta de los conteos cuadra
exactamente con la tabla del handback cuando se corre solo el archivo nuevo, que es lo que el handback midió.

### El mutante que sobrevive, medido (no es teórico)

Sonda propia: el `fetch` falso deriva el `usage` del **pedido real** (`output_tokens = el max_tokens que el handler
autorizó`), que es lo que hace un transporte simulado honesto y lo que ningún test de la tarjeta hace.

```text
=== CODIGO REAL ===
max_tokens pedido al modelo : 8192 (la cota se calculó con 8192)
cota reservada              : USD 0.63626
status                      : 200 ia
gastado anotado al final    : USD 0.61440   tope: USD 1
¿pasa el tope con UN pedido?: no

=== MUTANTE M5b ===
max_tokens pedido al modelo : 16384 (la cota se calculó con 8192)
cota reservada              : USD 0.63626
status                      : 200 ia
gastado anotado al final    : USD 1.22880   tope: USD 1
¿pasa el tope con UN pedido?: SÍ — tope roto
```

Con M5b **un solo pedido** anota USD 1,2288 contra un tope de USD 1 y la suite queda en 61/61 verde. El criterio 2
dice textual «nunca gastan más que el tope, **medido con el gasto registrado al final**»: eso es exactamente lo que
pasa acá y ningún test lo ve. El motivo es que G1 fabrica el `usage` con `output_tokens: MAX_TOKENS_SALIDA` —la misma
constante con la que `cotaUSDDe()` calcula la cota— así que `gastado` final **es** `llamadas × cota` por
construcción y el assert `gastadoUSD() <= 1` no agrega nada sobre el primero. El eslabón que falta no es la carrera
(eso G1 lo prueba bien): es que **lo que el pedido autoriza a gastar nunca exceda lo reservado**. Hoy el acople entre
`max_tokens` de la cota y `max_tokens` de la llamada no lo fija ningún test: `grep -n "max_tokens" api/tests/*.mjs`
solo aparece en `topeEndpoint.test.mjs`, y nunca contra el cuerpo del pedido (la técnica de leer `init.body` ya
existe en `fusionar.test.mjs`, el test de LLM01, pero mira `system`/`messages`, no `max_tokens`).

### El arreglo pedido, ya probado en el sandbox

```text
===== con el fix · CODIGO REAL · exit=0
ℹ tests 5 · pass 5 · fail 0

===== con el fix · M5b (max_tokens x2) · exit=1
✖ G1: 8 pedidos en paralelo al endpoint nunca gastan más que el tope (S33, mata M1b)
  AssertionError [ERR_ASSERTION]: gastado final USD 1.2435 > tope 1
ℹ tests 5 · pass 4 · fail 1

===== con el fix · M1b (chequear y despues llamar) · exit=1
✖ G1: 8 pedidos en paralelo al endpoint nunca gastan más que el tope (S33, mata M1b)
  AssertionError [ERR_ASSERTION]: 8 llamada(s) al modelo × USD 0.63626 = USD 5.0901 contra un tope de USD 1 (codigos: 200,200,200,200,200,200,200,200)
```

Queda verde con el código real, mata a M5b con el segundo assert de G1 (el que hoy no puede fallar) y sigue matando a
M1b con el primero. Es el cambio del punto 1 de «Cambios requeridos».

## Criterios de aceptación de IA-3

| # | Estado | Dónde está la evidencia (re-verificada por mí) |
|---|---|---|
| 1 · SDK real sobre transporte simulado, nunca un mock del cliente | **Cubierto** | `api/_lib/anthropicCliente.js:18` (`new Anthropic({apiKey, maxRetries:0, fetch})`); `api/tests/topeEndpoint.test.mjs:27` + `:130` inyecta solo el `fetch` y devuelve un `Response` nativo. Prueba positiva de que el SDK real está en el camino, no un mock: con M5 (`max_tokens` 65536) el **propio SDK** tira `AnthropicError` antes de salir a la red — un mock escrito a mano no haría eso. G4 además hace pasar al SDK por un `ReadableStream` que se corta a mitad |
| 2 · Hilos reales + barrera; N pedidos contra tope bajo; gasto registrado al final ≤ tope | **Parcial — bloquea** | Hilos reales y barrera en la primitiva: `api/tests/reserva.test.mjs:79` (ya aprobado en IA-1). A nivel endpoint: `topeEndpoint.test.mjs:134-138` manda 8 pedidos con `Promise.all`, IPs distintas (bien: el rate limit no es lo que salva al tope) y mide `llamadas × cota ≤ tope`, `gastado ≤ tope` y `llamadas === oks`. El primero y el tercero son asserts de verdad (M1b y M2 mueren ahí). **El segundo —la medición literal del criterio— no puede fallar**: el `usage` sale de `MAX_TOKENS_SALIDA`, la misma constante de la cota. M5b lo demuestra: 61/61 verde con un pedido de USD 1,2288 contra un tope de USD 1 |
| 3 · Fallback/reintento tardío: 529 o timeout no deja la reserva colgada ni cobra de más | **Cubierto** | `fusionar.test.mjs:227` (529 → una sola llamada, `maxRetries:0`), `:252` (529 → gastado 0), `:262` (corte de red → conserva). M4 confirma que esos tres asserts son reales (mueren con el mutante) |
| 4 · Rate limit por IP: misma IP → 429; IPs distintas no se afectan | **Cubierto** | `fusionar.test.mjs:189`, `rateLimit.test.mjs:7` y `:23`. G1 lo refuerza por el otro lado: con 8 IPs distintas el rate limit no interviene y el freno tiene que ser el tope |
| 5 · 4xx cuesta 0; corte a mitad de respuesta conserva la reserva | **Cubierto** (era el hueco G4 de la vuelta 1) | 4xx → 0: `fusionar.test.mjs:240`. Corte a mitad: `topeEndpoint.test.mjs:208-220` con un `Response` cuyo `ReadableStream` manda medio JSON y después `error()` — 200 `fusion:"simulada"` y `gastado > 0`. Mata a M4 con su propio mensaje. Es un corte a mitad del **cuerpo** de verdad, no un error del `fetch`: el que faltaba |
| 6 · Un test por cada forma de romper el tope de S33 | **Parcial — bloquea (6b)** | **6a carrera en el handler:** cerrado. G1 mata a M1b con la cuenta en el mensaje (USD 5,0901 vs tope 1) — era el agujero principal de la vuelta 1. **6b la reserva acota el pedido real:** medio cerrado. G2 mata a M2 (cota fija), M7 (mitad de los bytes) y M8 (ignora `custom`), pero su umbral es el punto medio entre las dos cotas, así que es ciego a toda subestimación menor a ~USD 0,11 por pedido (M6 sobrevive) y, sobre todo, **ciego al lado de la salida**, que es el 96 % de la cota (0,6144 de 0,63626): M5b sobrevive. **6c «ocupada» sin nada en vuelo:** cerrado. G3 fija el costo real exacto (525 micro-USD) y G3b los tres éxitos seguidos; los dos matan a M3 |
| 7 · Nunca llaman a la API real; no gastan un centavo en CI | **Cubierto** | Re-medido arriba con precarga propia: 0 `fetch` reales en 61 pruebas y en todos los workers. `beforeEach` limpia el `fetch` y restaura el entorno en `afterEach` (bien: `envBackup` devuelve `ANTHROPIC_*` y los dos `FUSIONAR_*`, así que el archivo no se filtra a los otros tests — lo verifiqué corriendo el archivo solo y dentro de la suite completa, mismo resultado) |

## Calidad de los tests (no solo su resultado)

- **¿Algún assert le pregunta al código cuánto debería gastar?** Sí, en parte, y el comentario del archivo
  (`topeEndpoint.test.mjs:11-12`: «Los cuatro cálculos de abajo repiten la fórmula del handler a propósito: un test
  que le pregunta al código cuánto debería gastar no prueba nada») **afirma algo que el archivo no hace**.
  `cotaUSDDe()` **llama** a `estimarCotaUSD` de producción, y G3 compara contra `usdAMicros(costoRealUSD(usage))`,
  también de producción. Lo que el test reimplementa es *qué bytes entran* en la cota (eso sí, y es lo que mata a M2,
  M7 y M8), no la fórmula ni los precios. Consecuencia medida: **M9** (precio de salida ÷ 10 en
  `api/_lib/costo.js:17`) sobrevive 61/61 — toda la tabla de precios puede estar 10× mal y ningún test se mueve,
  porque `costo.test.mjs` solo prueba monotonía y «> 0». No lo bloqueo acá: la zona de la tarjeta es `api/tests/` y
  `costs.md` le estaba vedado por R11 (ver «mejoras al arnés»). Sí hay que corregir el comentario, que hoy le dice al
  próximo lector que el archivo tiene una defensa que no tiene.
- **¿G1 pasa por suerte por el `sleep` de 30 ms?** No. Verificado con `demoraMs = 0`: verde con el código real y
  M1b sigue muriendo. 0/20 corridas inestables.
- **Fixtures limpias:** `beforeEach`/`afterEach` resetean el estado del día, el rate limit, el cache del catálogo y
  las 4 variables de entorno; no hay orden oculto entre tests (G2 y G3b resetean explícitamente en el medio).
- **Mensajes de rojo:** muy buenos. Los cuatro asserts que mueren traen la cuenta en el mensaje
  (`8 llamada(s) × USD 0.63626 = USD 5.0901 contra un tope de USD 1`), así que el rojo se lee sin abrir el test. Es
  justo lo que la vuelta 1 pidió.
- **Un detalle de alcance de G1:** `assert.ok(oks >= 1, …)` (`:147`) y `assert.equal(llamadas, oks)` son buenos, pero nada
  comprueba que los 7 rechazados tengan el 429 **del tope** y no el del rate limit. Con IPs distintas hoy no puede
  ser el rate limit; igual, chequear el cuerpo (`reintentar_en` hasta medianoche vs. el del rate limit) haría el test
  inmune a que mañana cambie el límite por IP. No bloqueante.

## Checkpoints

- **C1 · El arnés está sano:** `[x]` — `verify.py` completo VERDE (0 FAIL, 1 WARN preexistente), 282 rutas citadas
  OK, 21 tarjetas válidas. La ruta nueva `api/tests/topeEndpoint.test.mjs` existe y entra en el glob de
  `api/tests/correr.mjs`.
- **C2 · Cumple la tarjeta:** `[ ]` — criterios 2 y 6b sin evidencia que los demuestre a nivel endpoint:
  `api/tests/topeEndpoint.test.mjs:148` (`gastadoUSD() <= 1 + 1e-9`) está satisfecho por construcción; M5b sobrevive
  gastando 1,23× el tope en un solo pedido. **Zona de archivos: impecable** — el commit toca `api/tests/` y nada más
  dentro de `api/` (`git diff 3335fe4^ 3335fe4 -- api/ ':(exclude)api/tests/'` vacío), y `api/fusionar.js` es byte a
  byte el mismo blob (`56a62dda`) antes y después. Lo de fuera de `api/` es del leader (`graph/sdd.md`,
  `sdd/cards/IA-3.md` → `estado: review`, el handback). Sin features mezcladas.
- **C3 · Respeta diseño y convenciones:** `[x]` — no hay código de producción nuevo; el test respeta contracts §8
  (nunca un 500 al usuario: G4 lo afirma explícitamente), usa las funciones exportadas de `_lib` en vez de duplicar
  catálogo o prompts, y no agrega dependencias. ADR-017 (freno por instancia, no tope global) queda bien dicho en el
  handback y no se promete más de lo que el test prueba.
- **C4 · La verificación es real:** `[ ]` — re-ejecuté todo yo (`correr.mjs` 61/61, `verify.py` VERDE, 20 corridas
  del archivo nuevo, precarga anti-red) y el rojo de R29 del handback es honesto: los 4 mutantes mueren donde dice.
  Pero «hay tests nuevos que cubren el cambio» falla por el lado de M5b: el invariante central del criterio 2 tiene
  un test que no puede dar rojo. Nada skipeado ni debilitado.
- **C5 · Cierra limpio:** `[x]` — handback completo y commiteado, sin archivos throwaway, sin prints de debug, sin
  secretos (la clave de los tests es `sk-ant-test-clave`, un literal evidente, y `afterEach` la saca). Nota menor, no
  bloqueante: el handback dice «**Rama / commit:** `main` @ el commit de este handback» en vez del hash
  (`3335fe4`) — `verify.py` no lo marca porque hoy revisa los handbacks de la rama actual, pero el próximo handback
  conviene cerrarlo con el hash real como pide harness §7.5.

## Cambios requeridos

1. **`api/tests/topeEndpoint.test.mjs:75-89` (`fetchLento`) + `:121-130` (G1) — el transporte simulado tiene que
   derivar el peor caso del pedido real, no de las constantes de la cota.** Cambio concreto, ya probado (verde con el
   código real, rojo con M5b y con M1b): que `fetchLento` reciba `(url, init)` y, cuando no se le pasa un `usage`
   explícito, lo construya del cuerpo que mandó el handler —
   `output_tokens: JSON.parse(init.body).max_tokens`, `cache_creation_input_tokens: bytesUtf8(init.body)` — y que G1
   lo use así (`fetchLento({})`) en vez de fabricar `output_tokens: MAX_TOKENS_SALIDA`. Con eso el assert
   `gastado final ≤ tope` pasa a medir lo que dice el criterio 2 y el rojo sale solo:
   `AssertionError: gastado final USD 1.2435 > tope 1`.
   Mantener los tres asserts actuales de G1; no hace falta un test nuevo.
2. **Rojo medido del mutante nuevo (R29), en el handback:** agregar **M5b** (`max_tokens: MAX_TOKENS_SALIDA * 2` en
   `api/fusionar.js:158`, con la cota intacta) a la tabla de mutantes, con su cola de rojo contra G1 arreglado. Es el
   mutante que hoy sobrevive; sin él en la tabla, el próximo cambio de `max_tokens` vuelve a pasar sin que nadie se
   entere.
3. **`api/tests/topeEndpoint.test.mjs:11-12` — corregir el comentario.** Hoy dice que los cálculos «repiten la
   fórmula del handler» y que el test no le pregunta al código cuánto debería gastar; en realidad importa
   `estimarCotaUSD` y `costoRealUSD` de producción y lo que reimplementa es qué bytes entran. Decirlo como es (y, si
   se quiere, nombrar la limitación: la tabla de precios de `costo.js` no la fija ningún test — M9 sobrevive).

**Lo que NO hace falta** (para que la vuelta 3 sea corta): nada de G2, G3, G3b ni G4 — están bien y matan a sus
mutantes. Ningún test nuevo. No tocar `api/fusionar.js`: M5b es un mutante, el código real está bien como está.

## Hallazgos para el leader (no bloqueantes, son de IA-1, no de IA-3)

1. **Un 200 válido sin `usage` libera toda la reserva.** Medido con sonda propia sobre el código real: un `200`
   bien formado cuyo cuerpo no trae `usage` termina con `gastado = USD 0,00000` (porque `costoRealUSD({}) === 0`
   —`costo.test.mjs:24` lo documenta— y `api/fusionar.js:165` ajusta `0 - cotaMicros`). O sea: respuestas así son
   gratis en el registro y el tope del día nunca se llena, por muchas que sean. La API real siempre manda `usage`,
   pero un proxy o un gateway en el medio no es imposible. Arreglo natural, en zona de IA-1: si falta `usage`,
   conservar la cota en vez de liberarla (el mismo criterio de «lo ambiguo conserva» que ya aplica el `catch`).
2. **La tabla de precios no la fija ningún test** (M9: precio de salida ÷ 10 sobrevive 61/61). Un solo assert con un
   número literal en `api/tests/costo.test.mjs` (p. ej. `costoRealUSD({input_tokens:10, output_tokens:5}) ===
   0.000525`) lo cerraría. Se cruza con R19 y con la nota de `costo.js:9-14`: los precios están sin verificar contra
   la doc del proveedor y hay que confirmarlos antes de producción.
3. **Sigue en pie lo de ADR-017**, como dice bien el handback: todo esto es el freno por instancia. El techo duro
   compartido es el límite de gasto de la consola de Anthropic, que hay que configurar antes de producción.

## Mejoras al arnés detectadas

- **El mutante del reviewer tiene que ir también al punto de uso, y en los dos lados de la cuenta.** La vuelta 1 ya
  dejó escrito «al menos un mutante en el handler, no solo en la primitiva» y funcionó: así salió M1b. Esta vuelta
  muestra la segunda mitad de la lección: en un control de gasto hay que mutar **lo que se reserva** *y* **lo que se
  autoriza a gastar** (`max_tokens`, y mañana un presupuesto de *thinking* o de *streaming*). El agujero no estaba en
  la reserva, estaba en que nadie ataba la reserva al pedido.
- **Regla general, candidata a `playbooks/ia-en-el-producto.md` §E: un transporte simulado tiene que responder en
  función del pedido, no de constantes.** Un `usage` fabricado con las mismas constantes que usa la cota convierte
  cualquier assert de «gastado ≤ tope» en una tautología. El test que mide un tope tiene que dejar que el peor caso
  lo decida el pedido (`output_tokens = max_tokens` del cuerpo, bytes de entrada = bytes del cuerpo). Es una línea y
  cambia el test de decorativo a real.
- **Un assert que no puede dar rojo es un test skipeado con otra cara.** El rojo forzado de R29 se mide hoy por
  *test* («cae G1»), y G1 tiene tres asserts de los cuales uno no podía fallar nunca. Vale la pena que R29 se mida
  por **assert** cuando un test afirma varias cosas: si un mutante plausible no puede hacer caer a un assert
  concreto, ese assert todavía no está probado.
- **La precarga `node --import` que bloquea `globalThis.fetch`** volvió a pagar (criterio 7, 0 llamadas reales en 61
  pruebas, workers incluidos). Segunda vuelta que se usa a mano: debería ser una opción del comando `test` del arnés
  para los proyectos con IA (N4), con el conteo de `fetch` reales como FAIL.
- **Chequeo de higiene que el arnés podría automatizar:** `git diff <base>..<hash> -- <zona prohibida>` vacío. Lo hice
  a mano para confirmar que `api/fusionar.js` no se tocó (y está impecable). La zona de archivos de la tarjeta ya
  está declarada en el MD: verificarla contra el diff es mecánico.

## Re-verificación del bloqueante por el leader

El leader reprodujo M5b por su cuenta antes de aceptar el veredicto, en una copia sandbox propia
(`api/` + `web/catalogo.js` + `package.json` + `node_modules/` fuera del repo; el working tree no se tocó):

```text
$ sed -i 's/max_tokens: MAX_TOKENS_SALIDA,/max_tokens: MAX_TOKENS_SALIDA * 2,/' <sandbox>/api/fusionar.js
$ node --test "api/tests/topeEndpoint.test.mjs"
ℹ tests 5 · pass 5 · fail 0          <-- M5b SOBREVIVE

$ node sonda.mjs     # el `usage` lo deriva del pedido real (output_tokens = el max_tokens del cuerpo)
### con el mutante M5b
codigo HTTP           : 200
max_tokens cotizado   : 8192
max_tokens PEDIDO     : 16384
cota reservada  (USD) : 0.6363
gastado final   (USD) : 1.2435   tope: 1
>>> TOPE ROTO con UN solo pedido

### con el codigo real (3335fe4)
max_tokens cotizado   : 8192
max_tokens PEDIDO     : 8192
cota reservada  (USD) : 0.6363
gastado final   (USD) : 0.6291   tope: 1
>>> dentro del tope
```

Confirmado en los dos sentidos: el mutante rompe el tope con un solo pedido y la suite no se mueve, y el código
real aguanta. El veredicto CHANGES_REQUESTED queda en pie y los tres cambios requeridos van a la vuelta 3.

---

# Vuelta 1 · @ 9a45e24
**Veredicto:** CHANGES_REQUESTED · *resuelto en la vuelta 2 salvo el criterio 6b (ver arriba)*

Esta tarjeta no se implementó por separado: se revisa si los criterios de aceptación ya quedaron
cubiertos por el trabajo de IA-1 (ver sdd/cards/IA-1.md y sus 3 vueltas de review).

Revisor: reviewer (tier ALTO), worktree `sdd-universal-IA-3-check`, HEAD detached en `9a45e24` (punta de `ia-fusion`, con IA-1 aprobado). Antes de los tests corrí `npm ci --ignore-scripts`.

**Resumen:** 4 de los 7 criterios están cubiertos de verdad (1, 3, 4, 7). Los criterios 2, 5 y 6 están cubiertos **a medias**. El hueco principal es el criterio 6a: el mutante clásico de S33, «chequear y después llamar» **en el handler**, pasa los 56 tests en verde y en una sonda gasta **USD 5,00 contra un tope de USD 1** con 8 pedidos en paralelo. Los tests de hilos de IA-1 prueban la primitiva `reservar()`, no que el handler la use antes de llamar. No hace falta rehacer IA-3: alcanzan los 4 tests chicos de abajo.

## Verificación re-ejecutada
```text
$ node --test "api/tests/*.test.mjs"
ℹ tests 56 ℹ pass 56 ℹ fail 0 ℹ skipped 0

$ python harness/verify.py
[OK]    test — `node --test "web/tests/*.test.mjs" "api/tests/*.test.mjs" && python -m unittest discover -s harness/tests` (160.2s): Ran 178 tests in 157.778s · OK (skipped=1)
VERDE — 0 FAIL, 1 WARN
```
El WARN (sin `lint`) y el `skipped=1` en `harness/tests` ya estaban antes de esta tarjeta.

### Mutantes del handler (copias de `api/` fuera del repo; el worktree no se tocó)
| Mutante | Qué cambia en `api/fusionar.js` | Resultado de la suite |
|---|---|---|
| M1 | Chequea `gastado + cota <= tope` sin anotar, llama, y recién después anota el costo real. En el `catch` no libera nada | 53 pass / **3 fail**. Pero solo caen los tests de «lo ambiguo conserva» (timeout, 500, 504), y caen de rebote, porque no hay nada reservado. Ningún test detecta la carrera |
| **M1b** | Lo mismo que M1, pero en el `catch` anota la cota si el error es ambiguo. Es la forma «prolija» del bug de S33 | **56 pass / 0 fail: sobrevive** |
| **M2** | Cota fija de USD 0,06 por pedido en vez de `bytes del prompt × peor precio` | **56 pass / 0 fail: sobrevive** |
| **M3** | No ajusta la reserva al costo real después de una respuesta exitosa (queda la cota entera) | **56 pass / 0 fail: sobrevive** |
| M4 | Libera la reserva con cualquier error (incluido lo ambiguo) | 53 pass / 3 fail (timeout, 500 y 504): muere |

Además, ya está la evidencia de la review de IA-1 (vueltas 2 y 3): el mutante «`reservar()` sin lock» muere 3 de 3 en `api/tests/reserva.test.mjs:79`. No lo repetí.

### Sondas (script propio fuera del repo; `fetch` falso, sin red)
```text
# Código real (9a45e24)
[corte a mitad del cuerpo] -> 200 simulada | gastado: 0.635438 | log: ["fusionar: fallo al llamar al modelo: Error"]
[8 en paralelo al handler, tope 1] codigos: 200,429,429,429,429,429,429,429 | llamadas al modelo: 1 | gastado: 0.62535

# Mutante M1b (chequear y después llamar)
[8 en paralelo al handler, tope 1] codigos: 200,200,200,200,200,200,200,200 | llamadas al modelo: 8 | gastado: 5.0028
```
El código real aguanta, y el mutante rompe el tope 5 veces. **Ningún test de la suite distingue uno del otro.**

### Criterio 7: la suite no sale a la red
Corrí la suite con una precarga (`node --import`) que reemplaza `globalThis.fetch` por uno que registra y falla:
```text
ℹ tests 56 ℹ pass 56 ℹ fail 0
fetch reales registrados: 0
```
Para confirmar que la precarga atrapa de verdad al SDK, construí un cliente sin `fetch` inyectado: quedó registrado `FETCH REAL a https://api.anthropic.com/v1/messages`. La suite no hace ninguna llamada real.

## Criterios de aceptación de IA-3
| # | ¿Cubierto por IA-1? | Dónde |
|---|---|---|
| 1 · SDK real sobre transporte simulado, nunca un mock del cliente | **Sí** | `api/_lib/anthropicCliente.js` construye `new Anthropic({apiKey, maxRetries:0, fetch})` con el SDK oficial. Los tests inyectan solo el `fetch` (`_establecerFetchParaTests`) y devuelven un `Response` nativo de Node. En `api/` no hay ningún `messages.create =`, `jest.fn`, `sinon` ni stub del cliente (grep). Las clases de error reales del SDK salen en los logs (`BadRequestError`, `InternalServerError`, `APIConnectionError`) |
| 2 · Hilos reales + barrera; N pedidos contra tope bajo; gasto registrado al final ≤ tope | **Parcial** | Hilos reales con barrera de verdad (aviso «listo» de cada worker) y tope de USD 1: `api/tests/reserva.test.mjs:79` asserta `gastadoFinal <= TOPE` y `== oks × cota`, contra `reservar()` de producción (el mutante sin lock muere). **Pero son N llamadas a la primitiva, no N pedidos al endpoint.** Ningún test manda N pedidos concurrentes a `handler` y mide el gasto registrado al final, así que M1b pasa. En producción el handler corre en un solo hilo de Node, así que la forma correcta de probarlo a nivel endpoint es `Promise.all` con un `fetch` lento (ver G1) |
| 3 · Fallback/reintento tardío: un 529 o timeout no deja la reserva colgada ni cobra de más | **Sí** | `fusionar.test.mjs:227` (un 529 → 1 sola llamada al `fetch`: `maxRetries:0`), `:252` (529 → gastado 0, se libera) y `:262` (corte de red → conserva, se cobra lo ambiguo según S33). No hay fallback del lado del servidor en `fusionar.js`, así que «fallback que cobra dos intentos» no aplica |
| 4 · Rate limit por IP: misma IP → 429, IPs distintas no se afectan | **Sí** | `fusionar.test.mjs:189` (handler completo) y `rateLimit.test.mjs:7`, `:23` |
| 5 · 4xx cuesta 0; corte de red **a mitad de respuesta** conserva la reserva | **Parcial** | 4xx → 0: `fusionar.test.mjs:240`. El «corte de red» de `:262` tira el error **desde el `fetch`, antes de cualquier respuesta**: eso es un error de conexión, no un corte a mitad. La sonda con un 200 cuyo cuerpo se rompe a mitad muestra que el código **sí** conserva (gastado 0,635438), pero **no hay test** que lo fije (ver G4) |
| 6 · Un test por cada forma de romper el tope de S33 | **Parcial: falta 6a (endpoint), falta 6b, falta 6c** | **6a · carrera (chequear y después llamar):** cubierta en la primitiva (`reserva.test.mjs:63` rojo sin lock y `:79` verde con lock), pero **no en el handler**: M1b sobrevive y gasta 5× el tope (ver G1). **6b · reserva fija que no acota con prompt largo:** `costo.test.mjs:7` prueba que `estimarCotaUSD` crece con el prompt, pero nada prueba que el handler la **use** con los bytes reales: M2 (cota fija) sobrevive (ver G2). **6c · «ocupada» sin nada en vuelo:** en S33 es la reserva que queda anotada después de que el pedido terminó y el tope se «llena» sin gasto real. El 529 que libera está cubierto (`:252`), pero el caso exitoso no: M3 (no ajustar al costo real) sobrevive, así que cada éxito deja la cota entera y el día se agota con nada en vuelo (ver G3) |
| 7 · Los tests nunca llaman a la API real | **Sí** | Precarga que bloquea `fetch`: 0 llamadas reales en las 56 pruebas (arriba). `beforeEach` saca el `fetch` de test y borra `ANTHROPIC_API_KEY`/`ANTHROPIC_MODEL`, y todo test que pone clave y modelo inyecta un `fetch` falso |

## Lo que falta, si falta algo
Una tarjeta chica (zona: solo `api/tests/`, sin tocar `api/fusionar.js`), con 4 tests a nivel **handler**. Cada uno con su rojo medido (R29) contra el mutante que nombra, aplicado en una copia local:

1. **G1 · Carrera en el endpoint (criterios 2 y 6a).** 8 pedidos concurrentes a `handler` (`Promise.all`) con `FUSIONAR_TOPE_DIARIO_USD=1` y un `fetch` falso **lento** (p. ej. 30 ms) que devuelve un `usage` igual al peor caso (entrada = bytes del cuerpo, salida = `max_tokens`). El assert: `llamadas_al_fetch × costo_peor ≤ tope` y `gastado` final ≤ tope. Tiene que dar rojo con M1b (sonda: 8 llamadas, USD 5,00) y verde con el código actual (1 llamada, USD 0,63).
2. **G2 · La cota sale del prompt real (criterio 6b).** Con un tope entre la cota de un pedido corto y la de uno largo (p. ej. `custom` vacío contra `custom` de 8000 bytes), el corto entra y el largo recibe 429. O, de forma equivalente: después de un 500 (que conserva), `gastado` es igual a `estimarCotaUSD` con los bytes reales del prompt. Tiene que dar rojo con M2 (cota fija).
3. **G3 · Sin reservas colgadas después de un éxito (criterio 6c).** Una llamada exitosa con un `usage` chico conocido deja `gastado` igual al costo real de ese `usage`, no a la cota. Y con un tope igual a 2 cotas, 3 pedidos exitosos seguidos (no en paralelo) con un `usage` chico entran los 3. Tiene que dar rojo con M3 (sin `ajustar`).
4. **G4 · Corte a mitad de respuesta (criterio 5).** Un `fetch` que devuelve `200` con un `ReadableStream` que manda medio JSON y después `error()`. El assert: 200 `fusion:"simulada"` y reserva **conservada** (`gastado > 0`). Hoy el código ya se comporta así (sonda). El test lo fija, y su rojo se mide con M4 (libera siempre) o con un mutante que libere ante cualquier error sin `status`.

Lo que **no** hace falta: repetir los tests de 1, 3, 4 y 7, ni la concurrencia con hilos reales de la primitiva (ya mata al mutante sin lock).

## Mejoras al arnés detectadas
- Un AC que habla de «el endpoint» y una evidencia que prueba una función interna pueden coincidir en el nombre sin coincidir en el alcance. El paso de mutantes del reviewer debería incluir al menos un mutante **en el punto de uso** (el handler), no solo en la primitiva. Es lo que encontró M1b.
- La precarga `--import` que bloquea `fetch` es una forma barata y genérica de probar «los tests no llaman a la API real». Podría vivir en el arnés como opción del comando `test` para los proyectos con IA (N4).

---

**Veredicto final (vigente): APPROVED.** Ver «Vuelta 3 · @ ca56a0e» al principio de este archivo. Las vueltas 1 y 2 (abajo) son historial, ya resuelto en vueltas posteriores.
