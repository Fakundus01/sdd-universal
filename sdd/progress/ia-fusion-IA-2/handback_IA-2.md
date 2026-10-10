# Handback IA-2 — UI del combinador: botón de fusión con IA, degradación y aviso de modo simulado

- **Estado:** done
- **Rama / commit:** `ia-fusion-IA-2` @ ver "Rama / commit" abajo (se completa después de commitear)
- **Quién:** implementer (MEDIO)

## Hecho
- Botón nuevo `#zipFusion` ("✨ Fusión con IA") al lado de `#zipProyecto`/`#zipSolo`, dentro de `.zipbtns` en `web/index.html`. No reemplaza al v1: las tres opciones convivien.
- Textarea nueva `#cdesc` (descripción libre, opcional) junto a los otros checkboxes de `.files`.
- `web/combinador.js`: `opcionesFusion()` arma el pedido exacto de `contracts.md` §8 (`tipo`/`stack` como **key** del catálogo, no el objeto `{name, extra}`; `tecnologias`/`playbooks` del mismo estado que usa `Prompt.armar` hoy; `custom` con la misma expresión literal que ya usa `opcionesPaquete()` — nunca `null` por error; `descripcion` solo viaja si hay texto, nunca como `null`).
- `fusionarIA()`: `POST /api/fusionar`, y:
  - `fusion:"ia"` → `Zip.descargar` con los `archivos` de la respuesta tal cual (reusa el empaquetado de `zip.js`, no lo reinventa).
  - `fusion:"simulada"` → mismo ZIP, aviso visible en `#zipmsg` (clase normal, no `err`) que dice que es la versión sin IA.
  - cualquier falla (red, `!r.ok` — incluye 429/500/404 del endpoint ausente, o respuesta sin `archivos`) → cae automáticamente a `Paquete.proyecto` (v1), con aviso; nunca una promesa sin catch (hay try/catch interno también alrededor del fallback, por si el v1 también fallara).
  - Métrica nueva: `Sesion.contar("paquete", "ia:"+tipo | "ia-simulada:"+tipo | "ia-fallback:"+tipo)`, mismo patrón (`categoria`, `detalle`) que ya usan `"proyecto:"+tipo`/`"sueltos"`/`"rapido:"+tipo`.
- `web/tests/combinador-ia.test.mjs` (nuevo): 5 tests con mock de `fetch` (sin red real) — botón/markup, caso `ia`, descripción libre viajando, caso `simulada`, y caso de falla (red + 429 + 500 en un mismo test) verificando fallback a v1, sin colgarse y con aviso.
- Ajuste chico en el listener de `$("comb")` para que cambiar `#cdesc` no dispare `refrescarSalida()` (como ya hacía `comboname`): no afecta ni al prompt ni al árbol del ZIP.

## No hecho / pendiente
- No se tocó `web/prompt.js`: no hizo falta pasar `descripcion` por ahí — viaja directo en el body de `fetch`, fuera del prompt.
- No se coordinó con IA-1 un valor de `detalle` nuevo en `metricas.sql`: no pude leer ese archivo (fuera del contexto permitido para esta tarjeta — solo `contracts.md` §8, `combinador.js`, `paquete.js`, `design.md` §2). Elegí `"ia:"+tipo`, `"ia-simulada:"+tipo`, `"ia-fallback:"+tipo` siguiendo el mismo molde (`palabra[:valor]`) que ya usan `"sueltos"`, `"proyecto:"+tipo` y `"rapido:"+tipo` en el propio `combinador.js`, que ya pasan la validación hoy. Si `metricas.sql` valida contra una lista cerrada en vez de un patrón, el leader/IA-1 tiene que sumar estos 3 valores — avisar antes de mergear a `ia-fusion`.
- No agregué un `maxlength` al textarea `#cdesc`: `contracts.md` §8 dice que el tope de `descripcion` "se define en IA-1" y que lo que lo pasa da `400` (nunca se trunca en silencio); truncar en el front sin saber el número exacto habría sido inventar una cota. Si la IA manda un texto larguísimo, el 400 del servidor cae al mismo catch → fallback a v1 automático (cubierto por el test de falla), así que no rompe nada, pero el mensaje al usuario no distingue "demasiado largo" de otras fallas. Aceptable para esta tarjeta; si se quiere un aviso específico, es un cambio chico de criterio, no de código.

## Cómo
- `tipo`/`stack` del pedido salen de `$("ctype").value`/`$("cstack").value` (las keys), no de `opcionesPrompt()` (que devuelve `TYPES[...]`/`STACKS[...]`, los objetos) — es la diferencia explícita que marca `contracts.md` §8.
- `custom` reusa literalmente `ReglasUI.hayCambios() ? ReglasUI.generar() : null`, la misma expresión que `opcionesPaquete()`, para no tener dos lugares que puedan decidir distinto si hay cambios de reglas.
- El fallback a v1 llama a `Paquete.proyecto(...)` (la función real, no una reimplementación) con el mismo `opcionesPaquete()` de siempre — así el ZIP de emergencia es idéntico al que bajaría el botón v1 en ese momento.
- Decidí que el aviso de "cayó a v1" NO quede con clase `err` una vez que el v1 terminó bien (el paquete se entregó, no es un error del usuario); solo queda `err` si el propio fallback a v1 también falla.
- Alternativa descartada: transformar/reempaquetar los `archivos` de la respuesta antes de bajarlos. El contrato dice que ya vienen en "mismo formato que ya usa paquete.js para el ZIP" (`{nombre, contenido}`), y `Zip.descargar` los acepta tal cual — agregar una transformación habría sido reinventar el empaquetado (prohibido por el criterio 3).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `web/combinador.js` | `opcionesFusion()`, `fusionarIA()`, cableado de `#zipFusion`, excepción de `#cdesc` en el listener de `#comb` |
| `web/index.html` | textarea `#cdesc` y botón `#zipFusion` dentro de `.zipbtns` |
| `web/tests/combinador-ia.test.mjs` | nuevo — 5 tests, mock de `fetch`, sin red real |
| `sdd/progress/ia-fusion-IA-2/current.md` | plan y bitácora de la sesión |

## Evidencia
| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. Botón nuevo, dice "con IA", convive con v1 | test "el botón de fusión con IA existe al lado de los de v1 y dice «con IA»" |
| 2. Llama a `/api/fusionar` con el estado actual + descripción libre opcional | test "fusion: ia — arma el ZIP..." (verifica `tipo`/`stack`/`tecnologias`/`playbooks`/`custom` en el body) y test "la descripción libre viaja como string cuando hay texto" |
| 3. `fusion:"ia"` → ZIP con esos archivos, reusa `Zip.descargar` | test "fusion: ia — arma el ZIP con los archivos de la respuesta, sin pasar por v1" |
| 4. `fusion:"simulada"` → mismo ZIP + aviso visible, no error | test "fusion: simulada — arma el ZIP igual y avisa (sin error)..." |
| 5. Falla (red/429/500) → cae a v1 automático, con aviso, sin promesa sin catch | test "si la llamada falla (red, 429 o 500) cae al v1 automáticamente, con aviso y sin colgarse" |
| 6. Métrica nueva `paquete`/`detalle` que distingue IA vs v1 | mismos tests de arriba, assert sobre `sesionCalls` (`ia:`, `ia-simulada:`, `ia-fallback:`) |
| 7. `web/tests/` cubre `ia`/`simulada`/error de red con mock de `fetch` | `web/tests/combinador-ia.test.mjs` completo — sin red real en ningún test |

Rojo antes (R29), medido contra la base:
```text
$ git rev-parse --short HEAD
c86588e
$ node --test "web/tests/combinador-ia.test.mjs"
✖ el botón de fusión con IA existe al lado de los de v1 y dice «con IA» (2.2693ms)
  AssertionError [ERR_ASSERTION]: falta el botón nuevo
✖ fusion: ia — arma el ZIP con los archivos de la respuesta, sin pasar por v1 (4.6198ms)
  AssertionError [ERR_ASSERTION]: falta fusionarIA en combinador.js
  + actual - expected
  + 'undefined'
  - 'function'
✖ fusion: ia — la descripción libre viaja como string cuando hay texto (1.783ms)
  TypeError: ctx.fusionarIA is not a function
✖ fusion: simulada — arma el ZIP igual y avisa (sin error) que es la versión sin IA (1.5677ms)
  TypeError: ctx.fusionarIA is not a function
✖ si la llamada falla (red, 429 o 500) cae al v1 automáticamente, con aviso y sin colgarse (1.6697ms)
  AssertionError [ERR_ASSERTION]: falta fusionarIA en combinador.js
  + actual - expected
  + 'undefined'
  - 'function'
ℹ tests 5
ℹ pass 0
ℹ fail 5
```
Los 5 tests fallan por la razón correcta: el botón/textarea todavía no existen en `index.html` y `fusionarIA`/`opcionesFusion` todavía no existen en `combinador.js` (el `montar()` del test los expone con un guard `typeof ... !== "undefined"` para no tirar la suite entera — mismo patrón que usa `combinador.test.mjs`/`combinador-ui.test.mjs`).

Verde después:
```text
$ node --test "web/tests/combinador*.test.mjs"
ℹ tests 27
ℹ pass 27
ℹ fail 0

$ python harness/verify.py --changed
verify.py --changed @ c86588e (rama ia-fusion-IA-2)

── Arnés ──
[OK]    Memoria en disco: sdd/progress/ia-fusion-IA-2/current.md
[OK]    Tarjetas válidas (19)
[OK]    Rutas citadas existen (240 revisadas)

── Tests de lo cambiado ──
[OK]    test_quick — `node --test "web/tests/*.test.mjs" "api/tests/*.test.mjs" && python -m unittest discover -s harness/tests` (124.7s): Ran 178 tests in 122.250s · OK (skipped=1)

VERDE — 0 FAIL, 0 WARN
```
Nota: para que `api/tests/*.test.mjs` corriera (no lo toqué, pero `--changed` ejecuta toda la suite `test_quick`) hizo falta `npm ci --ignore-scripts` en la raíz del worktree — sin eso, `api/_lib/anthropicCliente.js` tira `Cannot find module '@anthropic-ai/sdk'` y el verify da rojo por un problema de entorno preexistente, no por este cambio. `node_modules/` sigue ignorado por git; no se tocó `package.json`/`package-lock.json`.

No toqué ningún check, hook ni forma de reportar error: no aplica cola de rojo forzado.

## Fuera de zona / riesgos
- `api/` (IA-1): no tocado. Leí solo `contracts.md` §8 de su contrato, nada de su código.
- `web/prompt.js`: no tocado — no hizo falta.
- `sdd/metricas.sql` (o donde viva la validación del `detalle`): no la leí (fuera de mi contexto permitido). Riesgo: si valida contra una enumeración cerrada, los valores `ia:`, `ia-simulada:`, `ia-fallback:` necesitan sumarse ahí antes de production. Lo marco para el leader/IA-1, no lo arreglé por mi cuenta.
- El tope de largo de `descripcion` (cota "a definir en IA-1" según `contracts.md` §8) no se validó en el front: cualquier texto viaja tal cual, y un 400 del servidor por exceso de largo cae al mismo fallback a v1 (comportamiento seguro, pero el aviso al usuario no distingue el motivo).

## Cambios de spec sugeridos
- Ninguno. El contrato de `contracts.md` §8 alcanzó tal cual para esta tarjeta.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Si el leader confirma que `metricas.sql` valida por patrón (no por enum), este handback no necesita vuelta. Si valida por enum, sumar `ia`, `ia-simulada`, `ia-fallback` como prefijos válidos de `detalle` para la categoría `paquete` (coordinar con IA-1, sin tocar el resto del SQL).
- Probar el flujo end-to-end con `vercel dev` (CLI no disponible en este entorno) para confirmar el contrato en vivo, más allá del mock de `fetch`.
