# Review IA-3 @ 9a45e24
**Veredicto:** CHANGES_REQUESTED

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
