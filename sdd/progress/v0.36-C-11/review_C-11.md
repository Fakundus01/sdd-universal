# Review C-11 @ 1245f98
**Veredicto:** APPROVED

> Vueltas: 1 (@ `959670f`) abajo; 2 (@ `fd5325c`) y 3 (@ `1245f98`) al final, en sus secciones. El veredicto de arriba es el de la vuelta 3.

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

---

## Vuelta 2 @ fd5325c
**Veredicto:** CHANGES_REQUESTED

Rama en `9962df0`: código `fd5325c`, tests `463f355`/`7bc663e`, base de la vuelta `8629fee`. Los tres cambios de la vuelta 1 quedaron bien resueltos y con tests. Pero la vuelta 2 trae una **regresión que borra texto**: la lógica nueva de definiciones de referencia toma por definición líneas de prosa y las saca enteras, incluidas las notas que el usuario escribe en `custom.md` desde la web.

### Verificación re-ejecutada
```text
$ node --test "web/tests/*.test.mjs"
# proyecto completo (PRO): 0 rotos de 80
# proyecto mínimo (NOVATO): 0 rotos de 30
# sdd-archivos.zip (soloMd): 0 rotos de 64
ℹ tests 67
ℹ pass 67
ℹ fail 0
$ node web/tests/smoke/smoke.mjs
PASS smoke: 22 pasos, 0 errores de consola
$ python harness/verify.py --quick      @ 9962df0
[OK]    Creado sdd/progress/v0.36-C-11-rev/current.md desde la plantilla   (borrado después)
[FAIL]  sdd/cards/C-11.md: in_progress pero depende de C-10, que está in_progress (despacho fuera de orden: esperá a que sea done)
[OK]    Rutas citadas existen (184 revisadas)
ROJO — 1 FAIL, 0 WARN
```
El FAIL es el esperado (orden de despacho por C-10).

### Diff `8629fee..9962df0`
- Archivos tocados: `web/paquete.js`, `web/tests/{paquete-links,paquete-reescritura,rutas}.test.mjs`, `?v=38` en `web/{index,admin,guia,demo}.html` (todas las `?v=` quedan en 38) y el handback. Zona respetada; ningún `.md` del paquete tocado.
- Ningún test debilitado. En «externos… no se tocan», `[d](harness/verify.py)` pasó a `[d](/abs/x.md)` porque ahora los no-`.md` sí se reescriben (el contrato cambió a pedido), y el caso no-md tiene su propio test. `paquete-links` suma `conservados()`: cada `origen` existe, y cada link que viaja se conserva y apunta al mismo archivo lógico.

### Pedidos de la vuelta 1
| # | Pedido | Estado |
|---|---|---|
| 1 | test que exija conservar los links que viajan | Hecho con `conservados()`: R12, R13 y R14 mueren (67/66/1 cada uno) |
| 2 | fences `~~~` y por largo | Hecho (`paquete.js:209-222`); `prompts/handback.md:5-64` ya no cuenta como prosa; N1–N3 mueren |
| 3 | `%20` re-codificado | Hecho (`paquete.js:205`, `encodeURI`); R6 y N4 mueren |

### Simulación independiente (408 combinaciones, MD actuales con C-10 vuelta 2)
`sim.mjs` está actualizado al contrato nuevo: cualquier archivo relativo con extensión, imágenes y escapados sin tocar, destino re-codificado. Misma grilla que en la vuelta 1: 384 de `proyecto` + 24 de `soloMd`.

| | Resultado |
|---|---|
| Diferencias contra la reimplementación | **0** |
| Links que viajan, al mismo archivo lógico | 20 228 |
| Excluidos como texto idéntico | 21 840 (136 más que en la vuelta 1: `../supabase/schema.sql` ahora pasa a texto) |
| Links rotos (cualquier extensión, y carpetas) | **0** en las 408 |
| Por ZIP con todo | completo 80, NOVATO 30, soloMd 64 |
| Casos reales | `playbooks/supabase-auth.md:36` → `` `supabase/schema.sql` `` (texto); `agents/looper.md:18` → `../sdd/orchestration.md`; `SDD-MASTER.md:28` → `**LOOP-PROMPT**` |

### Bordes (vuelta 2), desde `agents/leader.md` → `p/agents/leader.md`
| Borde | Entrada → salida | Veredicto |
|---|---|---|
| Título, incluido / excluido | `[h](../harness.md "t")` → `[h](../sdd/harness.md "t")`; `[s](../scenarios.md "t")` → `s` | Correcto |
| Título entre paréntesis | `[h](../harness.md (t))` → sin tocar: **roto en el ZIP** | Incorrecto (latente; sintaxis rara) |
| `<…>` incluido / excluido | `[h](<../sdd/harness.md>)`; `s` | Correcto |
| `.MD` excluido | `s` | Correcto |
| `%20` incluido | `[d](../sdd/mi%20doc.md)` | Correcto |
| UTF-8 incluido | `[g](../guía.md)` → `[g](../sdd/gu%C3%ADa.md)` | Correcto (link válido, cambia la forma) |
| ``` / `~~~` / ```` con ``` / fence sin cerrar | intactos | Correcto |
| Inline `` `](x.md)` `` | intacto | Correcto |
| `![a](x.png)`, `![a](../scenarios.md)` | intactos | Correcto según el contrato |
| `\[a](../scenarios.md)` | intacto | Correcto |
| `/x.md`, `http(s)`, `mailto:` | intactos | Correcto |
| No-md que no viaja / que viaja | `[i](x.png)` → `i`; `[v](../harness/verify.py)` → igual (viaja a la misma ruta relativa) | Correcto |
| Carpeta / sin extensión | `[d](../prompts/)`, `[m](../Makefile)` intactos | Según el contrato (pueden quedar rotos; hoy 0 en los MD reales) |
| Referencia incluida | `[h]: ../harness.md` → `[h]: ../sdd/harness.md` | Correcto |
| Referencia excluida, usos `[a][s]` y `[s][]` | → `a y s`, definición sacada | Correcto |
| Uso shortcut `[s]` de una ref excluida | queda `[s]` literal | Aceptable (GitHub muestra lo mismo sin definición) |
| Def excluida con el título en la línea siguiente | queda suelta la línea `  "T"` | Incorrecto (latente) |
| Uso `[a][S]` con la def en minúsculas | → `a` | Correcto, pero sin test (N9 sobrevive) |
| **Prosa que parece definición** | `[Nota]: config.json es el archivo que hay que editar.` → **desaparece la línea entera** | **Incorrecto: borra texto** (cambio requerido 1) |
| Def con CRLF | `[s]: ../scenarios.md\r` no se reconoce (`(.*)$` no consume el `\r`): la def y su uso quedan rotos | Incorrecto (latente: los MD reales no usan referencias; en disco, en Windows, sí hay CRLF) |
| Encabezado (`agents/looper.md:18`), negrita (`SDD-MASTER.md:28`) | reescrito / `**LOOP-PROMPT**` | Correcto |

### Mutantes (uno por vez, suite completa, `subprocess.run(timeout=300)`; base 67/67/0; revertidos, árbol limpio)
| # | Mutante | Suite | Resultado |
|---|---|---|---|
| R1 | fences no se reconocen (apertura) | 67/65/2 | muerto |
| R2 | code spans no se esconden | 67/66/1 | muerto |
| R3 | `relativa` sin `..` | 67/57/10 | muerto |
| R4 | excluido deja el link | 67/55/12 | muerto |
| R5 | se pierde el ancla | 67/66/1 | muerto |
| R6 | sin `decodeURI` | 67/66/1 | **muerto** (antes sobrevivía) |
| R7 | extensión sensible a mayúsculas | 67/66/1 | **muerto** (antes sobrevivía) |
| R8 | `..` fuera de la raíz no corta | 67/67/0 | sobrevive (casi equivalente) |
| R9 | sin chequeo de esquema | 67/66/1 | muerto |
| R10 | `proyecto` no enlaza | 67/65/2 | muerto |
| R11 | `soloMd` no enlaza | 67/66/1 | muerto |
| R12 | `origen` de agents equivocado | 67/66/1 | **muerto** (antes sobrevivía) |
| R13 | `origen` de playbooks equivocado | 67/66/1 | **muerto** (antes sobrevivía) |
| R14 | `origen` de `harness.md` (soloMd) equivocado | 67/66/1 | **muerto** (antes sobrevivía) |
| R15 | `relativa` compara el último segmento | 67/67/0 | sobrevive (equivalente) |
| R16 | el visor vuelve a admitir `[` | 67/66/1 | muerto |
| R17 | excluido pierde el texto | 67/57/10 | muerto |
| N1 | el cierre de fence ignora el carácter | 67/66/1 | muerto |
| N2 | el cierre de fence ignora el largo | 67/66/1 | muerto |
| N3 | apertura sin `~~~` | 67/66/1 | muerto |
| N4 | sin `encodeURI` | 67/65/2 | muerto |
| N5 | se pierde el título | 67/66/1 | muerto |
| N6 | se pierden los `<>` en línea | 67/66/1 | muerto |
| N7 | la def excluida no se saca | 67/65/2 | muerto |
| N8 | los usos de una ref excluida no pasan a texto | 67/66/1 | muerto |
| N9 | id de ref sensible a mayúsculas en el uso (`paquete.js:255`) | 67/67/0 | **sobrevive** |
| N10 | solo `.md` (los no-md no se tocan) | 67/64/3 | muerto |
| N11 | no se respeta el prefijo `!`/`\` en línea | 67/66/1 | muerto |
| N12 | la def incluida no se reescribe | 67/66/1 | muerto |
| N13 | la def pierde los `<>` (`paquete.js:233`) | 67/67/0 | **sobrevive** |
| N14 | usos de ref: no se respeta el prefijo | 67/66/1 | muerto |
| N15 | `[id][]` sin fallback al texto | 67/66/1 | muerto |

32 mutantes, 28 muertos. Sobreviven R8 y R15 (equivalentes en la práctica) y N9 y N13 (sin test).

### Checkpoints
- C1: [ ] ← `verify --quick` está en rojo solo por el orden de despacho (C-10); no es del código.
- C2: [x] zona respetada; los tres pedidos con evidencia.
- C3: [x]
- C4: [ ] ← `paquete.js:228` borra prosa válida y ningún test lo cubre; N9 y N13 sobreviven.
- C5: [x] handback de la vuelta 2 commiteado.

### Cambios requeridos
1. **`web/paquete.js:228` (con `:232` y `:242`) — media: borra texto, regresión de la vuelta 2.** La regex de definición `^( {0,3}\[([^\]]+)\]:\s*)(<[^>\n]*>|\S+)(.*)$` acepta cualquier resto (`(.*)`). Entonces una línea de prosa que empieza con `[algo]: archivo.ext …` se toma como definición y, si ese «destino» no viaja, **se borra la línea entera**. En CommonMark eso no es una definición: después del destino solo puede venir un título (`"…"`, `'…'`, `(…)`) y espacios.
   - **Pasa desde la web:** las «Notas personales» se copian tal cual a `custom.md` (`web/reglas-ui.js:76`), y `custom.md` pasa por `enlazar`.
   - **Medido con el flujo real** (`scratchpad/c11rev/notas.mjs`): con las notas `[Importante]: config.json no se commitea nunca, tiene la clave del cliente.` y `[Ojo]: README.md lo escribo yo`, tanto `proyecto` como `soloMd` devuelven `custom.md` **sin esas dos líneas**. En la vuelta 1 quedaban intactas.
   - **Esperado:** aceptar como definición solo si `m[4]` está vacío o es un título válido (`^\s*("[^"]*"|'[^']*'|\([^)]*\))?\s*$`); si no, la línea es prosa y no se toca. Unitarios: la línea de prosa queda igual, y una def con título se saca.
2. **`web/tests/paquete-reescritura.test.mjs` — baja.** Faltan tests que maten N9 (uso `[a][S]` con la definición `[s]:` excluida → `a`) y N13 (una definición incluida con `<…>` conserva los `<>`).

### Sin cambio requerido (latentes; ningún MD real los usa)
- `paquete.js:228`: `(.*)$` no consume el `\r`, así que con CRLF (los MD en disco en Windows) las definiciones no se reconocen. Probablemente quede resuelto con el punto 1 si el patrón del resto admite `\s*$`.
- Una def excluida con el título en la línea siguiente deja suelta la línea `"T"`.
- `[h](x.md (t))` (título entre paréntesis) no se reescribe.
- Las carpetas y los archivos sin extensión no se tocan aunque no viajen (hoy, 0 rotos en los MD reales).

---

## Vuelta 3 @ 1245f98
**Veredicto:** APPROVED

Rama en `2da1c24` (código `1245f98`, base de la vuelta `6c8bdb9`). La regresión de la vuelta 2 está corregida por dos lados: `custom.md` (texto de la persona) ya no pasa por la reescritura, y la regex de definiciones solo acepta un título después del destino. N9 y N13 mueren, y sobre el código nuevo no sobrevive ningún mutante.

### Verificación re-ejecutada
```text
$ node --test "web/tests/*.test.mjs"
# proyecto completo (PRO): 0 rotos de 79
# proyecto mínimo (NOVATO): 0 rotos de 30
# sdd-archivos.zip (soloMd): 0 rotos de 63
ℹ tests 74
ℹ pass 74
ℹ fail 0
$ node web/tests/smoke/smoke.mjs
PASS smoke: 22 pasos, 0 errores de consola
$ python harness/verify.py --quick      @ 2da1c24
[FAIL]  sdd/cards/C-11.md: in_progress pero depende de C-10, que está in_progress (despacho fuera de orden: esperá a que sea done)
ROJO — 1 FAIL, 0 WARN
```
Ese FAIL es el único y es el esperado (orden de despacho por C-10). El `current.md` que creó `verify.py` en mi rama se borró.

### Diff `6c8bdb9..2da1c24`
- Archivos tocados: `web/paquete.js` (regex de definición en `:231`; `usuario` en `enlazar` `:270` y en `custom.md` `:306`/`:353`), `web/tests/{paquete-links,paquete-reescritura,rutas}.test.mjs`, `?v=39` en `web/{index,admin,guia,demo}.html` (todas las `?v=` quedan en 39), `current.md` y el handback. Zona respetada; ningún `.md` del paquete tocado.
- Ningún test debilitado. `rotos()` y `conservados()` dejan de mirar `custom.md` por la decisión del leader (los links de la persona son de ella), y en su lugar entra un test más fuerte: `custom.md` byte a byte en `proyecto` y `soloMd`, con prosa tipo definición, una definición real, links, `<…>` y CRLF.

### Regresión de la vuelta 2: corregida
- **Flujo real** (`notas.mjs`): con las notas `[Importante]: config.json no se commitea nunca, tiene la clave del cliente.` y `[Ojo]: README.md lo escribo yo`, `custom.md` sale idéntico en `proyecto` y en `soloMd`.
- **Simulación:** `custom.md` con CRLF, prosa tipo definición, una definición real excluida, una con título, un uso `[a][s]`, código inline con `](x.md)` y un bloque `~~~` con un link sale **byte a byte igual en las 204 combinaciones que lo incluyen**.
- **Regex de definiciones en los MD del paquete** (`defs3.mjs`, `bordes2.mjs`):

| Caso | Salida | Veredicto |
|---|---|---|
| `[Ver]: ../scenarios.md y nada más` | intacta | Correcto (prosa) |
| `[Ojo]: README.md lo escribo yo` | intacta | Correcto |
| `[Importante]: config.json no se commitea nunca.\r\n` | intacta | Correcto |
| `[ID]: ../harness.md manda, sigue la frase` | intacta | Correcto |
| def excluida sin título / `"T"` / `'T'` / `(T)` | se saca; uso → texto | Correcto |
| def incluida `<../harness.md> "T"` | `<../sdd/harness.md> "T"` | Correcto |
| def excluida `<…>` con CRLF | se saca; los `\r\n` del resto se conservan | Correcto |
| def incluida con CRLF y título | reescrita, `\r` conservado | Correcto |
| `[Ojo]: README.md` sola en la línea | se saca | Es definición en CommonMark (GitHub no la muestra); consistente |
| def en continuación de párrafo (`texto\n[s]: x.md`) | se saca | En CommonMark sería prosa (latente; ningún MD real) |
| título con comilla escapada `"a \" b"` | no se reconoce: queda la def | Latente |
| título en la línea siguiente | queda suelta la línea `"T"` | Latente (ya anotado en la vuelta 2) |

En los MD reales del paquete no hay ninguna línea que empiece con `[x]:` (grep vacío), así que estos bordes latentes no afectan a ningún ZIP de hoy.

### Simulación independiente (408 combinaciones, MD actuales)
`sim3.mjs`: lo mismo que en la vuelta 2, más el contrato nuevo (`custom.md` viaja tal cual y no cuenta para «rotos»).

| | Resultado |
|---|---|
| Diferencias contra la reimplementación | **0** |
| Links que viajan, al mismo archivo lógico | 20 024 |
| Excluidos como texto idéntico | 21 636 |
| `custom.md` byte a byte | 204 / 204 |
| Links rotos en los MD del paquete (cualquier extensión y carpetas) | **0** |
| Por ZIP con todo | completo 79, NOVATO 30, soloMd 63 |

Los bordes de la vuelta 2 (`\[a](x.md)`, `![a](x.md)`, referencias, título, `<>`, `%20`, `.MD`, fences, `playbooks/supabase-auth.md:36` → texto, `agents/looper.md:18`, `SDD-MASTER.md:28`) dan lo mismo que en la vuelta 2.

### Mutantes (uno por vez, suite completa, `subprocess.run(timeout=300)`; base 74/74/0; revertidos, árbol limpio)
| # | Mutante | Suite | Resultado |
|---|---|---|---|
| R1–R7, R9–R14, R16, R17 | los de las vueltas 1 y 2 | 74/72/2 … 74/61/13 | muertos los 15 |
| R8 | `..` fuera de la raíz no corta | 74/74/0 | sobrevive (casi equivalente) |
| R15 | `relativa` compara el último segmento | 74/74/0 | sobrevive (equivalente) |
| N1–N8, N10–N12, N14, N15 | los de la vuelta 2 | 74/73/1 … 74/69/5 | muertos los 13 |
| N9 | id de ref sensible a mayúsculas en el uso | 74/73/1 | **muerto** (antes sobrevivía) |
| N13 | la def pierde los `<>` | 74/73/1 | **muerto** (antes sobrevivía) |
| N16 | `enlazar` reescribe también `custom.md` (sin `!a.usuario`) | 74/72/2 | muerto |
| N17 | `proyecto`: `custom.md` sin `usuario` | 74/73/1 | muerto |
| N18 | `soloMd`: `custom.md` sin `usuario` | 74/73/1 | muerto |
| N19 | la def acepta cualquier resto (la regresión) | 74/73/1 | muerto |
| N20 | la def sin `\s*` final (CRLF) | 74/73/1 | muerto |
| N21 | título `(…)` no admitido | 74/73/1 | muerto |
| N22 | título `'…'` no admitido | 74/73/1 | muerto |
| N23 | título `"…"` no admitido | 74/73/1 | muerto |

40 mutantes, 38 muertos. Los dos que sobreviven (R8, R15) son equivalentes en la práctica.

### Checkpoints
- C1: [x] el único FAIL de `verify --quick` es el orden de despacho por C-10, ajeno al código, ya conocido y aceptado por el leader; las rutas citadas existen.
- C2: [x] zona respetada; los pedidos de las vueltas 1 y 2 con evidencia; criterios 1–5 de la tarjeta cumplidos.
- C3: [x]
- C4: [x] re-ejecutado; tests nuevos (prosa intacta, títulos, mayúsculas, `<>`, CRLF, `custom.md` byte a byte); nada skipeado ni debilitado; sin mutantes no equivalentes vivos.
- C5: [x] handback de la vuelta 3 y `current.md` commiteados.

### Hallazgos menores (sin cambio requerido)
- `web/paquete.js:307` y `:354`: `if (conTecnologias)archivos.push(…)` perdió la alineación (falta el espacio). Es solo estilo.
- Latentes de la regex de definiciones (continuación de párrafo, comilla escapada en el título, título en la línea siguiente): hoy ningún MD del paquete tiene líneas `[x]:`. Si algún día se usan referencias, conviene un check.
- Siguen igual que en las vueltas anteriores: `soloSkills` no pasa por `enlazar` (sin links hoy) y el visor no muestra `[ver [1]](x.md)` como link (preexistente).
