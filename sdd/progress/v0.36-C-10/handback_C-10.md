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
