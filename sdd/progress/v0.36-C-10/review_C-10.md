# Review C-10 @ 509623f
**Veredicto:** CHANGES_REQUESTED

Reviewer independiente (ALTO). Base `f0e2d8e`, contenido `509623f`, handback en `8cca9e6`. Scripts propios en el scratchpad (`intact.py`, `check.py`, `graph.py`, `zipsim.py`, `md.mjs`; stdlib, no se commitean).

## Verificación re-ejecutada
```text
$ python harness/verify.py --quick
verify.py --quick @ 8cca9e6 (rama v0.36-C-10-rev)
[OK]    Creado sdd/progress/v0.36-C-10-rev/current.md desde la plantilla   (borrado después)
[OK]    Tarjetas válidas (15)
[OK]    Rutas citadas existen (184 revisadas)
VERDE — 0 FAIL, 0 WARN

$ node --test "web/tests/*.test.mjs"
ℹ tests 49 · pass 49 · fail 0 · skipped 0

$ node web/tests/smoke/smoke.mjs
PASS smoke: 22 pasos, 0 errores de consola
```
Ojo: `verify.py` del paquete solo revisa los `](…)` de `AGENTS.md`, `CLAUDE.md` y tarjetas `done` (`harness/config.py:16`), no los del master ni del resto: el criterio 2 lo cubre mi chequeo propio de abajo, no `verify.py`.

### Texto intacto (`intact.py`)
Por archivo cambiado, en cada línea distinta se reemplaza cada link nuevo `[x](y)` por `x` y se compara con la base:
```text
files 38 new links 302 bad 0
```
Mismo número de líneas en los 38 archivos; ninguna línea difiere fuera de los links. Word-diff revisado entero (401 líneas): nada en bloques ```` ``` ````, comandos ni rutas `<proyecto>/…`; ningún link contiene `|` (las tablas no se rompen).

### Links correctos (`check.py`, los 302)
- 302/302 resuelven a un archivo que existe, ruta relativa al archivo que linkea; 0 absolutos; 0 `[[wikilinks]]`; 0 dentro de bloques de código.
- `-EN`: ningún `-EN` linkea a un MD que tenga par `-EN` sin usarlo (`SDD-MASTER-EN` → `SDD-COMPACT-EN.md`).
- Texto≠destino solo en los dos `**[LOOP-PROMPT](prompts/loop-prompt.md)**` (correcto: el LOOP-PROMPT es ese archivo). `analytic`/`looper` → `agents/analytic.md`/`agents/looper.md`, columna ID de `playbooks/catalog.md` → los 11 playbooks homónimos, `SDD-MASTER` en `from-another-chat.md`/`lead-finder-brownfield.md` → `../SDD-MASTER.md`: todos apuntan a lo que nombran.
- Encabezados con link: `agents/looper.md:18` (`## Límites ([…](../orchestration.md) §6)`) y la línea 3 de `SDD-COMPACT(-EN).md` (es un `# …` del cuadro). Nadie cita un ancla de esos encabezados (grep sin resultados); el slug de GitHub no cambia porque el texto es el mismo.

### Criterio 1, medición propia (`graph.py`: nodos = 50 MD del alcance + MD de fuera linkeados; aristas = links `.md` resolubles, fuera de bloques de código, dedupe)
```text
@f0e2d8e: MD alcance 50, nodos 50, aristas unicas 9
huerfanos 39 · sin salida 47 · componentes 41, mayor 9
  SDD-MASTER salida 0 · SDD-COMPACT 0 · scenarios 0 · loops 0 · orchestration 0
@509623f: MD alcance 50, nodos 50, aristas unicas 228
huerfanos 0 · sin salida 10 (los mismos 10 del handback)
componentes 1, mayor 50
  SDD-MASTER salida 24 (entrada 13) · SDD-COMPACT 8 (11) · scenarios 17 (19) · loops 2 (6) · orchestration 10 (16)
```
Coincide con el handback. El único link `.md` no resoluble (`playbooks/obsidian-cerebro.md:22`, `[harness](harness.md)`) es preexistente y es un ejemplo dentro de un code span.

### Visor web (leído en `web/inicio.js:38-50` y `web/md.js:27`, probado con `md.mjs` sobre `Md.render`)
Un link relativo a `.md` dentro del preview hace `preventDefault` y abre ese archivo en el mismo popup, resuelto contra el archivo abierto: no rompe la página. Ver H2 y H3.

### Lo que el paquete lleva a un proyecto (`zipsim.py`, simula `web/paquete.js:167-258`)
`proyecto()` copia el núcleo a `<proyecto>/sdd/` (`sdd/SDD-MASTER.md`, `sdd/harness.md`, `sdd/prompts/…`, `sdd/playbooks/…`) pero `agents/` a la raíz, y no copia `scenarios.md`, `teams.md`, `models.md`, `loops.md`, `blocks.md`, `SDD-COMPACT.md`, etc. Links `](…)` de los archivos copiados que no resuelven dentro del ZIP:
```text
                                  base f0e2d8e        509623f
proyecto completo (PRO, todo)     2 rotos / 4         74 rotos / 139
proyecto mínimo (NOVATO)          0 / 0               48 / 86
soloMd (sdd-archivos.zip)         2 / 4               57 / 120
```
Por archivo (proyecto completo): `SDD-MASTER.md` 22, `GUIDE.md` 11, `orchestration.md` 7, `agents/leader.md` 6, `seguridad.md` 5, `harness.md` 4, `agents/infra-implementer.md` 4, `agents/README.md` 3, `playbooks/obsidian-cerebro.md` 3, resto 1–2.

## Criterio → evidencia
| Criterio | ¿Demostrado? |
|---|---|
| 1. Sin huérfanos; los 5 núcleos con salida | Sí — medición propia: 39→0 huérfanos, 41→1 componente (50 nodos) |
| 2. Links a archivos que existen | Sí — 302/302 existen (chequeo propio; `verify.py` no mira esos archivos) |
| 3. `-EN` a pares `-EN` | Sí |
| 4. Web tests, smoke, visor | Sí — 49/0, PASS; el visor navega dentro del popup (H2, H3 menores) |
| 5. Texto sin cambios | Sí — `intact.py` 0 diferencias en 38 archivos |

## Checkpoints
- C1: [x] `verify.py --quick` VERDE re-ejecutado; las rutas nuevas existen en el paquete.
- C2: [x] los 5 criterios con evidencia; zona respetada (`git diff --name-only f0e2d8e..8cca9e6`: 38 MD de raíz/`agents/`/`playbooks/`/`prompts/` + `sdd/progress/v0.36-C-10/{handback_C-10.md,current.md}`).
- C3: [ ] ← H1: `web/paquete.js:190-192` fija el criterio de diseño «Un master que apunta a archivos que no vinieron en el ZIP es un agente que improvisa»; tras C-10, el `sdd/SDD-MASTER.md` del ZIP apunta a 22 archivos que no vinieron.
- C4: [x] re-ejecuté `verify.py`, tests y smoke; sin tests nuevos porque el cambio es solo texto de docs, y la medición es por script.
- C5: [x] handback completo y commiteado. Observación: `sdd/progress/v0.36-C-10/current.md` es la plantilla vacía que crea `verify.py`, commiteada sin llenar (igual que otras ramas; no bloquea).

## Cambios requeridos
1. **H1 · ALTA — links rotos en lo que se descarga.** `web/paquete.js:184-216` (proyecto) y `:236-252` (soloMd) copian estos MD cambiando de carpeta (núcleo a `sdd/`, `agents/` en la raíz) y sin la mayoría de los destinos. Resultado: 72 links rotos nuevos en el ZIP completo (2→74), 48 en el mínimo NOVATO (0→48), 55 en `sdd-archivos.zip`. Ejemplos: `SDD-MASTER.md:28` → `prompts/loop-prompt.md` (no va al ZIP), `SDD-MASTER.md:30-31` → `AGENTS.md`/`CLAUDE.md` (en el ZIP quedan en la raíz, no en `sdd/`), `SDD-MASTER.md:50-60` (tabla de ruteo: `scenarios`, `teams`, `models`, `blocks`, `loops`), `harness.md:57`, `orchestration.md:25,27,73` (`agents/…` está en `<proyecto>/agents/`, no en `sdd/agents/`), `agents/README.md:3`, `agents/leader.md:12`, `agents/reviewer.md:14` (`../harness.md` → `<proyecto>/harness.md`; el real está en `sdd/harness.md`), `prompts/sdd-lite.md:5`. En un proyecto el humano los ve rotos en GitHub y, si abre el proyecto en Obsidian como dice el propio §A («la carpeta del repo, la que tiene `SDD-MASTER.md` o `sdd/`»), salen como nodos sin archivo. La carpeta del paquete y la del proyecto tienen layouts distintos, así que ningún link relativo núcleo↔`agents/` sirve en los dos a la vez. No se arregla dentro de la zona de C-10: el leader decide entre (a) una tarjeta en `web/paquete.js` que reescriba al empaquetar (ruta del paquete → ruta en el ZIP; si el destino no viene, dejar el texto sin link) con su test en `web/tests/`, o (b) restringir los links de los MD que van al ZIP a destinos que también van y con el mismo layout relativo (pierde parte del grafo). Sin una de las dos, C-10 no se mergea.

## Hallazgos menores (no bloquean solos)
2. **H2 · BAJA — el visor rompe un link anidado en un placeholder.** `SDD-MASTER.md:77` y `SDD-MASTER-EN.md:77` (`[ninguna / lista, ej.: R01=OFF — ver [`custom.md`](custom.md)]`): `web/md.js:26` (`\[([^\]]+)\]\(`) toma desde el primer `[`, y el link se come todo el placeholder con un `[` suelto adentro: `<a href="custom.md">ninguna / lista, … ver [<code>custom.md</code></a>]`. GitHub y Obsidian lo muestran bien. Arreglo en la zona: sacar ese link (`custom.md` ya está linkeado más arriba en el master, línea 32), o en `md.js` excluir `[` del texto del link (fuera de zona).
3. **H3 · BAJA — `#mdruta` muestra la URL absoluta** cuando se llega por un link (`web/inicio.js:11` solo recorta `../`; `inicio.js:47` pasa una URL absoluta). Ya anotado por el implementer; fuera de zona.
4. **H4 · BAJA — falsos positivos: archivos «del proyecto» linkeados a los del paquete.** `SDD-MASTER(-EN).md:30-31`, `GUIDE.md:18`, `models.md` (tabla de espejos), `harness.md:57`, `SDD-COMPACT(-EN).md` R22: `AGENTS.md`/`CLAUDE.md` nombran el espejo de una línea **del proyecto** (al lado dice «`Leé sdd/SDD-MASTER.md…`»), pero el link lleva al `CLAUDE.md` del paquete, que dice lo contrario («el núcleo vive en la raíz»). Igual, con menos daño, `sdd-lite.md` → `prompts/sdd-lite.md` (la plantilla, no el `sdd/sdd-lite.md` del proyecto) y `custom.md`. El handback lo reconoce como «aproximación»; con H1 resuelto por (a) conviene dejar sin link las menciones de espejos.
5. **H5 · INFO — `SDD-COMPACT(-EN).md`** se pega «como primer mensaje» en agentes solo-chat: los 8 links suman tokens sin poder navegarse ahí. Menor; decisión del leader.

## Mejoras al arnés detectadas
- `verify.py` del paquete no revisa los `](…)` del núcleo ni de `agents/`/`playbooks/`/`prompts/` (`harness/config.py:16`): con 300 links nuevos, el «Rutas citadas existen (184)» no cambió. Para el paquete, sumar esos MD a `cited_paths_docs` en `harness.config.json`.
- Un test en `web/tests/` que arme el ZIP (`Paquete.proyecto`) y resuelva cada `](…)` de los MD copiados contra las rutas del ZIP habría atrapado H1.
