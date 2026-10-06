# Review C-11 @ 959670f
**Veredicto:** CHANGES_REQUESTED

Reviewer independiente (ALTO), worktree `sdd-universal-C-11-rev` @ `aaeccf2` (= `959670f` + MD de C-10 vuelta 2). Scripts propios fuera del repo (`scratchpad/c11rev/sim.mjs`, `bordes.mjs`, `mut.py`).

**Resumen:** la reescritura hace lo correcto con **todos** los MD reales: la simulación propia (otro parser, fences CommonMark) da 0 diferencias en 408 combinaciones. Pero la suite no protege el cableado de `origen` (tres mutantes no equivalentes sobreviven: un `origen` mal escrito convierte links buenos en texto y el test de «0 rotos» sigue verde), y la reescritura tiene dos agujeros genéricos que el propio repo ya roza (fences `~~~` / ```` con ``` adentro, y `%20` que sale como link roto).

## Verificación re-ejecutada
```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 60
ℹ pass 60
ℹ fail 0
$ node web/tests/smoke/smoke.mjs
PASS smoke: 22 pasos, 0 errores de consola
$ python harness/verify.py --quick      @ aaeccf2
[OK]    Creado sdd/progress/v0.36-C-11-rev/current.md desde la plantilla   (borrado después)
[FAIL]  sdd/cards/C-11.md: in_progress pero depende de C-10, que está in_progress (despacho fuera de orden: esperá a que sea done)
[OK]    Rutas citadas existen (184 revisadas)
ROJO — 1 FAIL, 0 WARN
$ node --test web/tests/paquete-links.test.mjs
# proyecto completo (PRO): 0 rotos de 79
# proyecto mínimo (NOVATO): 0 rotos de 30
# sdd-archivos.zip (soloMd): 0 rotos de 63
```
El FAIL de `verify --quick` es el orden de despacho (C-10 sin cerrar), no el código de C-11.

## Simulación independiente de los ZIP
`sim.mjs`: carga `zip.js` + `paquete.js` en un `vm`, intercepta `Zip.descargar` y, por cada MD con `origen`, **reimplementa** la reescritura con un parser propio (fences ``` y `~~~` con largo, code spans de N backticks, corchetes anidados libres) y compara byte a byte con lo que sale del ZIP. Para cada link incluido verifica que `join(dirname(nombre_en_zip), rel) === mapa.get(destino_lógico)` (mismo archivo lógico, no solo «uno que exista»); para cada excluido, que quede exactamente el texto del link. Además resuelve todos los links relativos del resultado (cualquier extensión) contra el ZIP.

| | Resultado |
|---|---|
| Combinaciones | **408**: `proyecto` 384 = nivel {PRO, NOVATO} × custom {no, sí con links a `SDD-MASTER.md#r01` y `scenarios.md`} × tecnologías × guía × brownfield × skills × harness × playbooks {ninguno, todos, uno}; `soloMd` 24 = custom × tecnologías × guía × playbooks {3} |
| Links incluidos verificados (mismo archivo lógico) | 20 228 |
| Links excluidos verificados (texto idéntico) | 21 704 |
| Diferencias contra la reimplementación | **0** |
| Links `.md` rotos | **0** en las 408 |
| Links `.md` por ZIP «con todo» | completo 80, NOVATO 30, soloMd 64 (uno más que el test del implementer por el link de mi `custom.md`) |
| Links relativos NO `.md` rotos (fuera del criterio) | 1: `playbooks/supabase-auth.md:36` → `../supabase/schema.sql` (en ambos layouts) |

## Criterio → evidencia
| # | Criterio | Evidencia | ¿OK? |
|---|---|---|---|
| 1 | Reescritura: incluido → ruta en el ZIP; excluido → texto; externos/anclas/código intactos | sim: 0 diferencias en 408 combinaciones; bordes abajo | Sí con los MD reales; **no en general** (hallazgos 2 y 3) |
| 2 | Test con los tres ZIP, 0 rotos, rojo pegado | `paquete-links.test.mjs`; rojo `8f960b2` sobre `1559dae` en el handback (72/53/55 rotos) | Sí, pero **insuficiente**: «0 rotos» se cumple degradando links a texto (hallazgo 1) |
| 3 | Unitarios: otra carpeta, excluido, ancla, externo, código, corchetes | `paquete-reescritura.test.mjs` (7 + visor) | Sí |
| 4 | Visor sin `[` suelto | test «visor…»; probado a mano: `[ninguna — ver [`custom.md`](custom.md)]` → `[ninguna — ver <a href="custom.md"><code>custom.md</code></a>]` | Sí |
| 5 | Suite, smoke, `?v=` | 60/60/0, smoke PASS, `?v=37` en index/admin/guia/demo y `rutas.test.mjs` | Sí |

**Zona (diff `1559dae..959670f`):** solo `web/paquete.js`, `web/md.js`, `web/tests/{paquete-links,paquete-reescritura,paquete,rutas}.test.mjs`, `?v=` de `web/{index,admin,guia,demo}.html`. Ningún `.md` tocado (`git diff --stat 1559dae..959670f -- '*.md'` vacío). El cambio de `paquete.test.mjs` H4 (compara sin destinos de links `.md`) es el mínimo necesario, no debilita lo que H4 mide (que `sdd-lite.md` viaje).

## Visor (`web/md.js:28`)
| Entrada | Salida | ¿OK? |
|---|---|---|
| `[ninguna — ver [`custom.md`](custom.md)]` | `[ninguna — ver <a href="custom.md"><code>custom.md</code></a>]` | Sí |
| tabla con `[b](x.md)` en encabezado | `<th><a href="x.md">b</a></th>`, tabla intacta | Sí |
| bloque ``` con `[x](y.md)` | `<pre class="md-pre"><code>[x](y.md)</code></pre>` | Sí |
| `[a](https://x.dev) y [b](c.md)` | externo con `target=_blank`, interno normal | Sí |
| `[ver [1]](x.md)` | texto crudo, sin link | No como GitHub, pero igual que antes de C-11 (preexistente, ningún MD lo usa) |

## Bordes de la reescritura
Probados con `Paquete.reescribirLinks` desde `agents/leader.md` (→ `p/agents/leader.md`), mapa con `SDD-MASTER.md`, `harness.md`, `mi doc.md` en `p/sdd/`.

| Borde | Entrada → salida | Veredicto |
|---|---|---|
| Ancla incluida | `[h](../harness.md#sec)` → `[h](../sdd/harness.md#sec)` | Correcto |
| Ancla excluida | `[s](../scenarios.md#sec)` → `s` | Correcto |
| `./x.md` | `[l](./leader.md)` → `[l](leader.md)` | Correcto |
| `../x.md` | `[h](../harness.md)` → `[h](../sdd/harness.md)` | Correcto |
| Fuera del paquete | `[x](../../x.md)` → `x` | Correcto |
| Con título, incluido | `[h](../harness.md "t")` → sin tocar: queda `../harness.md`, **roto en el ZIP** | Incorrecto (latente: ningún MD lo usa) |
| Con título, excluido | `[s](../scenarios.md "t")` → sin tocar, **roto** | Incorrecto (latente) |
| Mayúsculas `.MD` | `[s](../SCEN.MD)` → `s` | Correcto |
| Mayúsculas en el nombre | `[m](../sdd-master.md)` → `m` (el archivo es `SDD-MASTER.md`) | Aceptable (en GitHub también estaría roto) |
| `%20` incluido | `[d](../mi%20doc.md)` → `[d](../sdd/mi doc.md)`: **espacio crudo en el destino, el link deja de ser link** | Incorrecto (latente) — hallazgo 3 |
| Bloque ``` | intacto | Correcto |
| Bloque `~~~` | `[s](../scenarios.md)` → `s` **dentro del bloque** | Incorrecto (latente) — hallazgo 2 |
| ```` con ``` adentro | el ``` interno cierra el bloque: `[s](…)` → `s` dentro del ejemplo | Incorrecto; **forma real** en `prompts/handback.md:5-64` (líneas 36-39 y 44-45 quedan «fuera de código»; hoy sin links) — hallazgo 2 |
| Código inline `` `](x.md)` `` | intacto | Correcto |
| Inline de doble backtick con `` ` `` adentro | intacto | Correcto |
| Imagen `![a](x.png)` | intacta | Correcto |
| Imagen a `.md` excluida | `![a](../scenarios.md)` → `!a` | Raro pero inofensivo (latente) |
| Absoluto `/x.md` | intacto | Correcto según el criterio (no relativo) |
| `http(s)` / `mailto:` | intactos | Correcto |
| Referencia `[a]: ../x.md` | intacta: **queda rota** si el destino no viaja | Incorrecto (latente; ningún MD usa referencias) |
| `<../x.md>` | intacto: queda roto | Incorrecto (latente) |
| Escapado `\[a](../scenarios.md)` | → `\a` (cambia el texto: GitHub mostraba `[a](../scenarios.md)` literal) | Incorrecto (latente) |
| **Link en encabezado** (real: `agents/looper.md:18`) | PRO: `## Límites ([`orchestration.md`](../sdd/orchestration.md) §6)` — reescrito al mismo archivo lógico; NOVATO/soloMd: `looper.md` no viaja | Correcto |
| **Link en negrita, excluido** (real: `SDD-MASTER.md:28`) | `**[LOOP-PROMPT](prompts/loop-prompt.md)**` → `**LOOP-PROMPT**` en los tres ZIP (`loop-prompt.md` no está en `PLANTILLAS`) | Correcto (texto idéntico) |
| Link en negrita, incluido | `**[M](../SDD-MASTER.md)**` → `**[M](../sdd/SDD-MASTER.md)**` | Correcto |
| `SDD-MASTER.md:77` real | `[ninguna / lista, ej.: R01=OFF — ver `custom.md`]` sin custom; con custom, link a `custom.md` | Correcto |
| Dos links en una línea (uno sí, uno no) | `[a](../sdd/harness.md) y b` | Correcto |
| Autorreferencia | `[yo](leader.md#x)` → igual | Correcto |
| Query `?x=1` | conservada | Correcto |

## Mutantes propios (uno por vez, suite completa `node --test "web/tests/*.test.mjs"`, `subprocess.run(timeout=300)`, tests/pass/fail; base 60/60/0; revertidos, árbol limpio)
| # | Mutante | Suite | Resultado | sim propia |
|---|---|---|---|---|
| R1 | fence ``` no se reconoce (`paquete.js:193`) | 60/59/1 | muerto | 0 |
| R2 | code spans no se esconden (`:197`) | 60/59/1 | muerto | 136 |
| R3 | `relativa` sin `..` | 60/53/7 | muerto | 3384 |
| R4 | excluido deja el link (`:208`) | 60/52/8 | muerto | 4376 |
| R5 | se pierde el ancla | 60/59/1 | muerto | 204 |
| R6 | sin `decodeURI` (`:205`) | 60/60/0 | sobrevive (ningún test ni MD con `%`) | 0 |
| R7 | `.md` sensible a mayúsculas (`:203`) | 60/60/0 | sobrevive (ningún test ni MD con `.MD`) | 0 |
| R8 | `..` más allá de la raíz no corta (`norm`) | 60/60/0 | sobrevive; casi equivalente (el destino recortado no está en el mapa) | 0 |
| R9 | sin chequeo de esquema (`:200`) | 60/59/1 | muerto | 0 |
| R10 | `proyecto` no llama a `enlazar` | 60/58/2 | muerto | 4800 |
| R11 | `soloMd` no llama a `enlazar` | 60/59/1 | muerto | 216 |
| **R12** | `origen` de agents `agent/…` (`paquete.js:269`) | **60/60/0** | **sobrevive, no equivalente**: PRO pasa de 79 a 76 links, los 3 links a `agents/` se vuelven texto y el test dice «0 rotos de 76» | detecta |
| **R13** | `origen` de playbooks `playbook/…` (`paquete.js:260`) | **60/60/0** | **sobrevive, no equivalente** | detecta |
| **R14** | `origen` de `harness.md` en soloMd `harnes.md` (`paquete.js:296`) | **60/60/0** | **sobrevive, no equivalente**: todo link a `harness.md` en `sdd-archivos.zip` pasa a texto | detecta |
| R15 | `relativa` compara también el último segmento | 60/60/0 | sobrevive; equivalente salvo una carpeta llamada igual que un archivo | 0 |
| R16 | visor vuelve a admitir `[` (`md.js:28`) | 60/59/1 | muerto | — |
| R17 | excluido pierde el texto | 60/54/6 | muerto | 3968 |

(«detecta»: `sim.mjs` aborta porque el `origen` no existe en el repo, es decir, la simulación lo atrapa; la suite no.)

## Checkpoints
- C1: [ ] ← `verify.py --quick` en ROJO por el orden de despacho (C-11 depende de C-10 in_progress). No es del código; se cierra cuando C-10 pase a done.
- C2: [x] zona respetada, ningún MD tocado, cada criterio con evidencia (con la salvedad del hallazgo 1 sobre la fuerza del criterio 2).
- C3: [x] `reescribirLinks`/`enlazar` genéricos, sin tabla fija; mismo estilo que `md.js` (centinela U+0000).
- C4: [ ] ← `web/tests/paquete-links.test.mjs:89-90` solo mide «0 rotos», que se cumple degradando links buenos a texto: R12–R14 (14 líneas de `origen` escritas a mano) sobreviven.
- C5: [x] handback y current commiteados; sin throwaway.

## Cambios requeridos
1. **`web/tests/paquete-links.test.mjs:89-90` (C4, R29 mutantes) — media.** El test tiene que probar que un link cuyo destino viaja **sigue siendo link al mismo archivo lógico**, no solo que no haya rotos. Por ejemplo: cada `a.origen` (salvo `custom.md`) existe en el repo y el contenido antes de `enlazar` es el del repo; y la cantidad de links `.md` en el ZIP es igual a la de links del original cuyo destino (resuelto contra `origen`) está en el ZIP. Tiene que matar R12, R13 y R14.
2. **`web/paquete.js:191-194` — baja/media.** El toggle `/^\s*```/` no reconoce `~~~` ni el largo del fence: un ``` dentro de un bloque ```` lo cierra. `prompts/handback.md:5-64` (viaja en los tres ZIP) ya tiene esa forma: sus líneas 36-39 y 44-45 se tratan como texto fuera de código. Hoy no tienen links, pero el criterio 1 dice «lo que está en bloques de código no se toca». Reconocer ``` y `~~~`, cerrar solo con el mismo carácter y largo ≥ al de apertura; unitario con ```` + ``` y con `~~~`.
3. **`web/paquete.js:208` — baja.** El destino reescrito sale con la ruta **decodificada** (`decodeURI` en `:205`): `[d](../mi%20doc.md)` → `[d](../sdd/mi doc.md)`, que en Markdown no es un link (el espacio corta el destino). Volver a codificar la ruta al escribirla (`encodeURI`) y sumar el unitario `%20` (mata R6).

## Hallazgos sin cambio requerido (para el leader)
- Links con título (`[a](x.md "t")`), por referencia (`[a]: x.md`), con `<…>` y escapados (`\[a](x.md)`) no se reescriben o se reescriben mal; ningún MD del paquete los usa hoy. Vale una línea en el comentario de `reescribirLinks` (`paquete.js:167-173`) que diga qué sintaxis se soporta, o un check que avise si aparecen.
- `playbooks/supabase-auth.md:36` → `../supabase/schema.sql` queda roto en el ZIP (no es `.md`, fuera del criterio).
- Visor: `[ver [1]](x.md)` no se muestra como link (preexistente; la reescritura sí lo soporta).
- `soloSkills` (`skills-claude.zip`) no pasa por `enlazar`; hoy ninguna `skills/*/SKILL.md` tiene links `.md` relativos, pero queda fuera del contrato «ningún ZIP con links rotos».

## Mejoras al arnés detectadas
- Para R29: cuando un test se apoya en un conteo «0 malos», pedir siempre también el conteo de «buenos preservados»; si no, la salida trivial (borrar todo) pasa.
