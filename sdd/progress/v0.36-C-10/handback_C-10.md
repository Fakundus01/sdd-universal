# Handback C-10 — Los MD del paquete se enlazan (grafo de Obsidian conectado)

- **Estado:** done
- **Rama / commit:** `v0.36-C-10` @ `509623f` (contenido; el commit del handback va encima)
- **Quién:** implementer (MEDIO)

## Hecho
- La primera mención de cada MD del paquete en cada sección `##` pasó a link markdown relativo, con el mismo texto (`` [`harness.md`](harness.md) ``). 302 links nuevos en 38 archivos de la raíz, `agents/`, `playbooks/` y `prompts/`. Sin `[[wikilinks]]`.
- Los `-EN` enlazan a pares `-EN` (`SDD-COMPACT-EN.md`); el resto no tiene par en inglés.
- Ningún MD del alcance queda huérfano. `SDD-MASTER`, `SDD-COMPACT`, `scenarios`, `loops` y `orchestration` tienen links de salida.

## No hecho / pendiente
- Sin links de salida (tienen entrada, no son huérfanos): `agents/analytic.md`, `playbooks/_template.md`, `consumir-api-externa`, `create-react-vite`, `deploy-vercel`, `publish-github-vercel`, `resend-smtp`, `prompts/loop-prompt.md`, `maintenance-prompt.md`, `start-prompt.md`: no nombran ningún MD del paquete fuera de bloques de código.

## Cómo
- Script de conversión en el scratchpad (no se commitea): reemplaza solo `` `x.md` `` completos que existen en el alcance, fuera de bloques de código, primera vez por sección `##` y por destino; la ruta es relativa al archivo. Salteó `<proyecto>/…`, nombres ambiguos (`README.md`) y archivos fuera del alcance.
- Casos a mano (mismo texto, solo se agrega el link): `**LOOP-PROMPT**` en `SDD-MASTER(-EN).md` → `prompts/loop-prompt.md`; roles `analytic` y `looper` en la tabla de `orchestration.md` → `agents/`; `SDD-MASTER` en prosa de `prompts/from-another-chat.md` y `lead-finder-brownfield.md`; la columna ID de `playbooks/catalog.md` (11 playbooks que existen); menciones sin backticks en `SDD-COMPACT(-EN).md`; el título `## Límites (orchestration.md §6)` de `agents/looper.md` (único link en un encabezado; el `§6` queda como texto).
- Menciones con `§` : el link va al archivo, el `§N` queda fuera del link.

## Archivos tocados
| Archivo | Links agregados |
|---|---|
| AGENTS.md | +3 |
| CLAUDE.md | +3 |
| CONTRIBUTING.md | +4 |
| GUIDE.md | +17 |
| README.md | +15 |
| SDD-COMPACT-EN.md | +8 |
| SDD-COMPACT.md | +8 |
| SDD-MASTER-EN.md | +46 |
| SDD-MASTER.md | +46 |
| agents/README.md | +4 |
| agents/implementer.md | +1 |
| agents/infra-implementer.md | +4 |
| agents/leader.md | +7 |
| agents/looper.md | +1 |
| agents/prompter.md | +1 |
| agents/reviewer.md | +1 |
| blocks.md | +8 |
| custom.md | +3 |
| harness.md | +14 |
| historial-master.md | +18 |
| loops.md | +6 |
| models.md | +5 |
| orchestration.md | +14 |
| playbooks/catalog.md | +12 |
| playbooks/env-setup.md | +1 |
| playbooks/go-live.md | +1 |
| playbooks/ia-en-el-producto.md | +3 |
| playbooks/obsidian-cerebro.md | +6 |
| prompts/from-another-chat.md | +1 |
| prompts/handback.md | +1 |
| prompts/lead-finder-brownfield.md | +1 |
| prompts/relevo.md | +1 |
| prompts/sdd-lite.md | +1 |
| prompts/task-card.md | +2 |
| scenarios.md | +22 |
| seguridad.md | +7 |
| teams.md | +4 |
| tecnologias.md | +2 |

Total: 302 links (38 archivos).

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1. sin huérfanos, 5 núcleos con salida | medición antes/después abajo |
| 2. links a archivos que existen | `verify.py --quick` VERDE (rutas citadas existen) |
| 3. `-EN` a pares `-EN` | `SDD-MASTER-EN` → `SDD-COMPACT-EN`; `SDD-COMPACT-EN` enlaza a `custom`, `scenarios`, `teams`, `seguridad`, `orchestration`, etc. (sin par EN) |
| 4. web | `node --test`: pass 49, fail 0; smoke PASS (22 pasos, 0 errores); ver visor abajo |
| 5. texto sin cambios | revisado: revertir los links del diff deja cada archivo idéntico a la base (chequeo por script), más `git diff --word-diff`; 249 líneas cambiadas, solo links agregados; ninguna línea dentro de un bloque de código |

Medición del criterio 1 (script `measure.py`, scratchpad; cuenta links `](x.md)` entre los 50 MD del alcance, fuera de bloques de código).

Antes (base `f0e2d8e`; líneas largas recortadas a 400 caracteres):
```text
MD en alcance: 50  links entre ellos: 9
huerfanos: 39 ['agents\\README.md', 'agents\\analytic.md', 'agents\\implementer.md', 'agents\\infra-implementer.md', 'agents\\leader.md', 'agents\\looper.md', 'agents\\prompter.md', 'agents\\reviewer.md', 'playbooks\\_template.md', 'playbooks\\catalog.md', 'playbooks\\consumir-api-externa.md', 'playbooks\\create-react-vite.md', 'playbooks\\deploy-vercel.md', 'playbooks\\env-setup.md', 'playbooks\\
SDD-MASTER.md salida: 0
SDD-COMPACT.md salida: 0
scenarios.md salida: 0
loops.md salida: 0
orchestration.md salida: 0
sin salida: ['agents\\README.md', 'agents\\analytic.md', 'agents\\implementer.md', 'agents\\infra-implementer.md', 'agents\\leader.md', 'agents\\looper.md', 'agents\\prompter.md', 'agents\\reviewer.md', 'playbooks\\_template.md', 'playbooks\\catalog.md', 'playbooks\\consumir-api-externa.md', 'playbooks\\create-react-vite.md', 'playbooks\\deploy-vercel.md', 'playbooks\\env-setup.md', 'playbooks\\go
```

Después (`509623f`):
```text
MD en alcance: 50  links entre ellos: 309
huerfanos: 0 []
SDD-MASTER.md salida: 24
SDD-COMPACT.md salida: 8
scenarios.md salida: 17
loops.md salida: 2
orchestration.md salida: 10
sin salida: ['agents\\analytic.md', 'playbooks\\_template.md', 'playbooks\\consumir-api-externa.md', 'playbooks\\create-react-vite.md', 'playbooks\\deploy-vercel.md', 'playbooks\\publish-github-vercel.md', 'playbooks\\resend-smtp.md', 'prompts\\loop-prompt.md', 'prompts\\maintenance-prompt.md', 'prompts\\start-prompt.md']
```

Verde:
```text
$ python harness/verify.py --quick
[OK]    Tarjetas válidas (15)
[OK]    Rutas citadas existen (184 revisadas)
VERDE — 0 FAIL, 0 WARN
$ node --test "web/tests/*.test.mjs"
ℹ tests 49 · pass 49 · fail 0
$ node web/tests/smoke/smoke.mjs
PASS smoke: 22 pasos, 0 errores de consola
```

Visor de la web (leído en `web/inicio.js` y `web/md.js`; no se abrió navegador): `md.js` convierte `[txt](url)` en `<a href>`; `inicio.js` intercepta el click en un `<a>` cuyo href termina en `.md` (con `#` opcional), hace `preventDefault` y abre ese archivo en el mismo preview, resolviendo la ruta relativa contra el archivo abierto. Un link `../SDD-MASTER.md` desde un playbook no rompe la página: carga el otro MD en el popup. Hallazgo menor, fuera de zona: `abrirPreview` muestra en `#mdruta` la URL absoluta cuando se llega por un link (`url.replace(/^\.\.\//,"")` solo recorta el `../` del catálogo).

## Fuera de zona / riesgos
- Menciones genéricas de archivos de proyecto (`custom.md`, `AGENTS.md`, `CLAUDE.md`) ahora enlazan a los del paquete; la regla de la tarjeta lo pide (existen en el paquete), pero en prosa sobre «tu proyecto» el link es una aproximación.
- Los dos `SDD-MASTER` llevan 46 links cada uno por tener muchas secciones `##`; si se juzga ruidoso, el criterio es «primera mención por sección», como pide la tarjeta.

## Cambios de spec sugeridos
- Ninguno.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- El leader mira el grafo en Obsidian (objetivo 6) y decide si hace falta enlazar los 10 MD sin salida.

## Vuelta 2 (`406a5c5`) — review `cd571e8`
- **H1** (links rotos en los ZIP): no es de esta tarjeta (C-11, `web/paquete.js`); no se sacaron links por eso.
- **H4 (falsos positivos):** se sacó el link (vuelve a quedar como en la base) en toda mención de `AGENTS.md`, `CLAUDE.md`, `custom.md` o `sdd-lite.md` que habla del archivo **del proyecto** o de la plantilla que el usuario completa. Se mantienen: `[prompts/sdd-lite.md]` cuando el texto nombra explícitamente la plantilla (`harness.md`, `SDD-MASTER.md` §3) y la fila de `README.md` que lista `custom.md` como archivo del paquete. Links sacados (58 en 13 archivos, incluidos los de H5 y H2):
  - `CONTRIBUTING.md`: custom.md. `GUIDE.md`: AGENTS, CLAUDE (l.18), custom.md (l.32, 71, 85), sdd-lite.md (l.75). `README.md`: custom.md (l.52). `blocks.md`: custom.md (l.33, 45). `harness.md` l.57: AGENTS, CLAUDE. `historial-master.md` l.29: custom, AGENTS, CLAUDE. `models.md`: CLAUDE, AGENTS (tabla de espejos), custom.md (l.47). `scenarios.md`: sdd-lite (l.15), AGENTS y CLAUDE (l.28), custom.md (l.49, 77). `seguridad.md`: custom.md (l.128).
  - `SDD-MASTER.md` y `SDD-MASTER-EN.md` (9 cada uno): AGENTS y CLAUDE (l.30-31), custom.md (l.32, 50, 77, 152), sdd-lite.md (l.89, 253, 383/384).
- **H2:** el link anidado en el placeholder de `SDD-MASTER(-EN).md:77` salió con lo anterior.
- **H5:** sin links en `SDD-COMPACT.md` y `SDD-COMPACT-EN.md` (8 cada uno). Ninguno queda huérfano (tienen entrada desde el master y otros MD); sí quedan **sin salida**, así que el criterio «SDD-COMPACT con links de salida» ya no se cumple, por decisión del leader; no se compensó con links artificiales.
- **`harness.config.json`:** probé `cited_paths_docs` = los 50 MD del alcance + los defaults del proyecto. `verify.py --quick` dio **ROJO, 48 FAIL**, todos citas legítimas de rutas de «un proyecto normal» o ejemplos (`sdd/sdd-lite.md`, `sdd/SDD-MASTER.md`, `GEMINI.md`, `metrics.md`, `.claude/agents/`, `sdd/cards/H-1.md`, `harness_fixes.md`…): harness.md 17, scenarios.md 8, historial-master.md 5, agents/README.md 3, orchestration.md 3, prompts/relevo.md 3, SDD-MASTER.md 2, SDD-MASTER-EN.md 2, README.md 1, models.md 1, teams.md 1, playbooks/obsidian-cerebro.md 1 (`(harness.md)`, ejemplo preexistente en un code span), prompts/sdd-lite.md 1. No se forzó: **revertido**, `harness.config.json` sin cambios.

Medición después de la vuelta 2 (`measure.py`):
```text
MD en alcance: 50  links entre ellos: 251
huerfanos: 0 []
SDD-MASTER.md salida: 20
SDD-COMPACT.md salida: 0
scenarios.md salida: 13
loops.md salida: 2
orchestration.md salida: 10
sin salida: ['agents\\analytic.md', 'playbooks\\_template.md', 'playbooks\\consumir-api-externa.md', 'playbooks\\create-react-vite.md', 'playbooks\\deploy-vercel.md', 'playbooks\\publish-github-vercel.md', 'playbooks\\resend-smtp.md', 'prompts\\loop-prompt.md', 'prompts\\maintenance-prompt.md', 'prompts\\start-prompt.md', 'SDD-COMPACT-EN.md', 'SDD-COMPACT.md']
componentes: 1 (50 nodos)
```
- Texto intacto: quitando todos los links nuevos, los 38 archivos quedan idénticos a la base (`f0e2d8e`): 0 diferencias. Links netos agregados: 244.
- `verify.py --quick` VERDE (0 FAIL, 0 WARN); `node --test` pass 49 / fail 0; smoke PASS (22 pasos, 0 errores).
