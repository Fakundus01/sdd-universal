# Handback P-1 — Arrancar con el compacto y un índice; el master solo bajo demanda

- **Estado:** done
- **Rama / commit:** `v0.37-P-1` @ 62c3af7 (código; antes a721497); base `v0.37-plan` @ ab90d19
- **Quién:** implementer (sesión Opus)

## Hecho
- Check nuevo `check_startup` en `harness/checks.py` (corre en `verify.py --quick` vía `run_all`): FAIL si el arranque pasa de 10 KB (10240 bytes) y FAIL si alguna `R<nn>` del master no está definida en el arranque.
- `AGENTS.md` y `CLAUDE.md` mandan a leer `SDD-COMPACT.md`; el master queda «solo si la tarea lo pide».
- Índice «qué abrir para qué tarea» como sección `## ÍNDICE` dentro de `SDD-COMPACT.md` (y `SDD-COMPACT-EN.md`); reemplaza la línea `Ruteo:`.
- ZIP de la web (`web/paquete.js`): trae `sdd/SDD-COMPACT.md`, sus `AGENTS.md`/`CLAUDE.md` apuntan al compacto, el LEEME lo lista; barra de progreso 4→5.

## Decisiones
1. **Índice dentro del compacto, no archivo aparte.** Un solo archivo que mantener, espejar y mandar en el ZIP; el arranque queda en 2 archivos y el check no depende de un segundo nombre que alguien pueda dejar de citar. Costo: el compacto pasa de 6932 a 7816 bytes.
2. **Qué es «el arranque» para el check.** Por cada entry (`AGENTS.md` y `CLAUDE.md`, cada uno por separado; manda el más pesado) se suman, en bytes, el entry y, transitivamente, todo archivo `.md`/`.txt` existente citado (link `](x)` o `` `ruta` ``, relativo al archivo que cita o a la raíz) en una línea que tenga un verbo de lectura (leé, leer, read, cargá, obedecé…). Anti-burla: mover texto a otro archivo que el arranque manda a leer (aunque sea de segundo o tercer nivel) sigue contando; solo queda afuera lo que se cita sin verbo («abrilo solo si la tarea lo pide»). Mandar a leer el master lo mide con todo lo que él manda a leer (194016 bytes) y falla. Limitación declarada: una instrucción de lectura sin esos verbos, o con la ruta en otra línea, no se sigue.
3. **Cobertura de reglas.** Una regla cuenta solo si está *definida* (línea que empieza `R<nn> nombre:` o `**R<nn> ·`) en un archivo del arranque; citar «(R31)» en el índice no alcanza (si no, borrar la línea R31 del compacto pasaba, porque el índice la nombra). Las reglas del master salen de las líneas `**R<nn> ·` de su §4 (33).
4. Sin `AGENTS.md`/`CLAUDE.md` el check no tiene nada que medir (OK): los proyectos de prueba del arnés no los tienen. Un proyecto instalado con el AGENTS viejo («Leé sdd/SDD-MASTER.md») pasa a FAIL por tamaño al actualizar `harness/`: es lo buscado, hay que actualizar su AGENTS.md.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `harness/checks.py` | `check_startup`, `_startup_files`, constantes, llamada en `run_all` |
| `harness/tests/test_arranque.py` | 19 tests nuevos |
| `AGENTS.md`, `CLAUDE.md` | mandan al compacto |
| `SDD-COMPACT.md`, `SDD-COMPACT-EN.md` | sección ÍNDICE |
| `web/paquete.js` | compacto en el ZIP, espejos nuevos, LEEME |
| `web/tests/paquete.test.mjs` | 3 tests P-1 |

## Evidencia
Bytes que carga el arranque (`wc -c`):
```text
antes:   AGENTS.md 627 + SDD-MASTER.md 36686 = 37313 bytes
después: AGENTS.md 755 + SDD-COMPACT.md 7816 = 8571 bytes   (tope 10240; margen 1669)
```
| Criterio | Lo demuestra |
|---|---|
| 1. ≤ 10 KB | `verify.py --quick`: `[OK] Arranque liviano: 8571 bytes de 10240`; `test_arranque.TestTamano.*` (límite inclusivo, bytes distinto de caracteres); web «P-1: el arranque del ZIP… ≤ 10 KB» |
| 2. Índice | sección `## ÍNDICE` de `SDD-COMPACT.md` (loops→loops.md, roles/tarjetas→orchestration.md, arnés→harness.md, regla completa→SDD-MASTER.md §4…) |
| 3. Check + rojo forzado | `TestTamano`, `TestReglas`, `TestCableado` y los rojos de abajo |
| 4. ZIP | 3 tests «P-1» en `web/tests/paquete.test.mjs` |
| 5. Espejo EN, verde | «Verde después» |

Rojo antes (R29), medido contra la base. Python (primero ImportError porque `STARTUP_MAX_BYTES` no existía; con el check como stub vacío):
```text
$ python -m unittest test_arranque
Ran 17 tests in 2.756s
FAILED (failures=12)
```
Web, con el `web/paquete.js` de a721497 (sin el cambio):
```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 77   ℹ pass 74   ℹ fail 3
✖ P-1: el AGENTS.md y el CLAUDE.md del ZIP mandan a leer el compacto, no el master
✖ P-1: el LEEME del ZIP lista el compacto y no dice que AGENTS.md apunta al master
✖ P-1: el arranque del ZIP (espejo + compacto) pesa ≤ 10 KB y define todas las reglas del master
```
Rojo forzado del check sobre el repo real (`verify.py --quick`), cada uno revertido:
```text
# caso 1: SDD-COMPACT.md + 2000 bytes
[FAIL]  Arranque de AGENTS.md: 10571 bytes > tope 10240 (P-1); carga AGENTS.md, SDD-COMPACT.md. …
[FAIL]  Arranque de CLAUDE.md: 10571 bytes > tope 10240 (P-1); …
ROJO — 2 FAIL, 0 WARN
# caso 2: se borra la línea R33 del compacto
[FAIL]  Arranque de AGENTS.md: no define R33 del SDD-MASTER.md (ninguna regla puede quedar fuera del compacto ni del índice)
[FAIL]  Arranque de CLAUDE.md: no define R33 del SDD-MASTER.md (…)
ROJO — 2 FAIL, 0 WARN
# caso 3: AGENTS.md viejo (Leé SDD-MASTER.md)
[FAIL]  Arranque de AGENTS.md: 194016 bytes > tope 10240 (P-1); carga AGENTS.md, SDD-MASTER.md, CLAUDE.md, custom.md, …
```
Tabla de mutantes sobre `check_startup` (cada corrida de `test_arranque` con `timeout=120 s` vía `subprocess.run`; revertidos con `git checkout`; script en `scratchpad/p1-impl/mutantes.py`):

| Mutante | Resultado |
|---|---|
| M1 `>` a `>=` en el tope | muerto |
| M2 tope 10 a 11 KB | muerto (test que fija 10 KB) |
| M3 sin el verbo «leé» | muerto |
| M4 sin seguimiento transitivo | muerto |
| M5 caracteres en vez de bytes | muerto |
| M6 citar la regla alcanza | muerto |
| M7 solo mira AGENTS.md | muerto |
| M8 sin chequeo de reglas | muerto |
| M9 links solo desde la raíz | muerto |
| M10 no corre en `run_all` | muerto |
| M11 `missing` invertido | muerto |
| M12 sin rutas entre backticks | muerto |
| M13 sin links markdown | muerto |
| M14 sin CLAUDE.md como entry | muerto |
| M15 todo link entra, sin verbo | muerto |

15/15 muertos, ningún timeout.

Verde después:
```text
$ python harness/verify.py --quick   (cola)
[OK]    Rutas citadas existen (217 revisadas)
[OK]    Arranque liviano: 8571 bytes de 10240 (AGENTS.md + SDD-COMPACT.md); 33 reglas definidas
VERDE — 0 FAIL, 0 WARN
$ python -m unittest discover -s harness/tests   -> Ran 197 tests … OK (skipped=1)
$ node --test "web/tests/*.test.mjs"             -> ℹ tests 77  ℹ pass 77  ℹ fail 0
```

## Fuera de zona / riesgos
- `SDD-MASTER.md` §1 paso 4 y su recuadro inicial («Leé este archivo completo») siguen diciendo que `AGENTS.md` es «Leé sdd/SDD-MASTER.md»; `models.md` también describe los espejos. No los toqué (zona): el leader debería alinear ese texto (versión y changelog) en otra tarjeta. `web/prompt.js` («Pegá/adjuntá primero el SDD-MASTER») queda igual: el primer mensaje manual necesita el master para el START-PROMPT.
- El compacto del ZIP nombra docs (`loops.md`, `teams.md`, `scenarios.md`…) que el ZIP no trae; el índice lo cubre con «si el doc no vino al proyecto, pedíselo al humano».
- «El instalador» no existe aparte del ZIP de `paquete.js`; `soloMd` (MD sueltos) no genera AGENTS.md y no se tocó.
- Descuido mío, corregido: un `git checkout -- AGENTS.md` durante el rojo forzado borró cambios sin commitear; los rehíce y desde entonces commiteo antes de mutar.
