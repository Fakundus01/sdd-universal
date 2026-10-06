# Handback C-2 — Núcleo de cerebro/: notas, índice híbrido y buscar

- **Estado:** done
- **Rama / commit:** `v0.36-C-2` @ `8965144` (vuelta 2; el commit siguiente solo actualiza este handback y `current.md`)
- **Quién:** implementer (MEDIO), retomando una sesión cortada

## Hecho
- Retomé lo existente (config, embedders, notas, indice y 4 archivos de tests, ya completos y correctos) y lo commiteé como base (`682088d`, con `cerebro.py` aún stub).
- Completé `cerebro/cerebro.py`: `init · indexar [--todo] · buscar [--proyecto --tipo -k --json] · revisar · nota`; errores esperados en español por stderr, código 2, sin traceback; salida de `buscar` marcada como dato (R26) con `fuente`.
- Agregué `test_tope_por_defecto_es_1500` (mató un mutante que sobrevivía) y `cerebro/.gitignore` (`.venv/`, `__pycache__/`, `*.pyc`).
- Vuelta 2 (review): ver apéndice. Los 7 criterios cubiertos; solo stdlib, sin instalar nada. FTS5 disponible.

## No hecho / pendiente
- Embedders reales (local C-3, OpenAI C-6): `embedders.obtener` da un error claro si se pide uno.

## Cómo
- Se respetó el diseño fijado. Contención de escritura: slug `[a-z0-9-]` + `open(..., "x")` + verificación por `resolve()` (enlaces que escapan se rechazan). Índice transaccional: si falla, queda como estaba.
- `indexar` salta (y avisa por stderr) las notas con formato inválido; `revisar` es quien falla con código 1.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| cerebro/cerebro.py | CLI completo (era stub) |
| cerebro/config.py, embedders.py, notas.py, indice.py | del trabajo previo, sin cambios |
| cerebro/tests/ (soporte, test_cli, test_indice, test_notas) | del trabajo previo; +1 test en test_indice |
| cerebro/.gitignore | .venv/, __pycache__/, *.pyc |
| sdd/progress/v0.36-C-2/ | current.md y este handback |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1. init idempotente | test_cli.test_init_crea_y_dos_veces_no_pisa |
| 2. validación y revisar | test_notas (campos, cada error dice archivo y campo), test_cli.test_revisar |
| 3. incremental / --todo / borrada | test_indice.test_incremental_cuenta_las_llamadas_al_embedder, test_nota_borrada_sale_del_indice, test_cli.test_indexar_todo |
| 4. híbrida RRF, filtros, --json | test_indice (palabra exacta, sinónimos, filtros_antes_de_puntuar, suma de rangos k=60), test_cli.test_indexar_buscar_json |
| 5. cambio de embedder | test_indice.test_cambiar_dimension_o_nombre_sin_todo_es_error, test_cli.test_cambio_de_embedder_error_claro_sin_traceback y test_proceso_real_sin_traceback |
| 6. contención | test_notas (no_sale_de_cerebro_dir, nombres_reservados_de_windows, enlace_que_escapa, nunca_pisa), test_cli.test_nota_hostil_no_sale |
| 7. suite sin red | salida de abajo |

Rojo antes (R29): la base `d61f084` no tiene `cerebro/`, así que los tests ni existen ahí. Medí el rojo contra los stubs: en `682088d` (cerebro.py stub) los tests de config/notas/indice ya pasaban (esos módulos estaban escritos por la sesión previa; el rojo original de ellos no se midió) y el CLI falló:
```text
$ git rev-parse --short HEAD
682088d
$ python -m unittest discover -s cerebro/tests
Ran 61 tests in 0.792s
FAILED (failures=15, errors=1)   # todos en test_cli.TestCLI (init, revisar, indexar, buscar, nota, sin_subcomando, proceso_real...)
```

Verde después (Python 3.14.0 y 3.11.9):
```text
$ python -m unittest discover -s cerebro/tests -v | tail
Ran 73 tests in 2.525s
OK
$ py -3.11 -m unittest discover -s cerebro/tests
Ran 73 tests in 2.505s
OK
```

### Mutantes (a mano, uno por vez, timeout 120 s, todos revertidos)
| # | Mutante | Resultado |
|---|---|---|
| M1 | RRF no suma (pisa) | muerto (test_suma_de_rangos_reciprocos_con_k_60) |
| M2 | RRF sin lista de coseno | muerto |
| M3 | RRF sin lista FTS | muerto (palabra_exacta_la_encuentra_fts…) |
| M4 | incremental: siempre re-embebe | muerto (test_incremental_cuenta_las_llamadas…) |
| M5 | guardia de meta apagada | muerto |
| M6 | guardia ignora la dimensión | muerto |
| M7 | nota borrada no sale del índice | muerto |
| M8 | filtro proyecto ignorado | muerto |
| M9 | filtro tipo ignorado | muerto |
| M10 | slug sin nombres reservados | muerto |
| M11 | escritura pisa (`w` en vez de `x`) | muerto |
| M12 | sin contención por resolve() | muerto (test_enlace_que_escapa_se_rechaza) |
| M13 | fecha sin validar | muerto |
| M14 | tipo sin validar | muerto |
| M15 | --todo no reconstruye | muerto |
| M16 | fragmentos sin tope por defecto | SOBREVIVÍA → agregué test_tope_por_defecto_es_1500 → muerto |
| M17 | revisar siempre sale 0 | muerto |

## Fuera de zona / riesgos
- Nada tocado fuera de `cerebro/` y `sdd/progress/v0.36-C-2/`. `cerebro/requirements.txt` es de C-3 (no existe todavía).
- Git avisa de LF→CRLF en el worktree (autocrlf); sin efecto en los tests.

## Cambios de spec sugeridos
- ninguno

## Variables de entorno nuevas
- CEREBRO_DIR (carpeta del Cerebro), CEREBRO_EMBEDDINGS (local|openai|falso) — ya en el playbook §B/§D; se leen del entorno.

## Próximo paso sugerido
- C-3: embedder local (fastembed) y `requirements.txt`; después MCP (C-4).

## Apéndice: vueltas
- **Vuelta 2 (`8965144`)** — la review pidió cambios @ `e710850` (M6, M7, M8, M11 vivos; índice roto con traceback). Suite: 73 tests OK en 3.14.0 y 3.11.9.

Rojo medido contra el código de `e710850` (tests nuevos, mismo código), tail:
```text
$ git rev-parse --short HEAD   # e710850 + tests nuevos sin commitear
$ python -m unittest discover -s cerebro/tests
FAIL: test_sin_ascii_lleva_sufijo_determinista_y_no_choca   (AssertionError: Regex didn't match '^nota-[0-9a-f]{6}$' not found in 'nota')
ERROR: test_archivo_que_no_es_base_de_datos_error_claro     (sqlite3.DatabaseError: file is not a database)
ERROR: test_todo_rehace_un_indice_roto_y_guarda_el_viejo    (sqlite3.DatabaseError: file is not a database)
ERROR: test_base_bloqueada_no_dice_que_falta_fts5           (TypeError: Indice.__init__() got an unexpected keyword argument 'timeout')
ERROR: test_listar_no_sigue_enlaces_que_salen_de_cerebro_dir (TypeError: listar() takes 1 positional argument but 2 were given)
ERROR: test_indice_roto_error_claro_y_todo_lo_recupera      (x3, CLI: DatabaseError sin atrapar)
Ran 73 tests in 1.187s
FAILED (failures=1, errors=10)
```
Los 4 tests que atan lo que ya funcionaba (contención de `proyectos/` como enlace, todo-o-nada normal y `--todo`, fecha AAAA-MM-DD, orden BM25) pasan contra el código y se midieron contra los mutantes de la review (abajo, todos muertos).

| # | Cambio pedido | Test |
|---|---|---|
| 1 | `proyectos/` como junction/symlink hacia afuera | test_notas.TestEscribir.test_proyectos_como_enlace_hacia_afuera_se_rechaza (enlace por symlink o `mklink /J`; `skipTest` si no se puede) |
| 2 | todo-o-nada con embedder que falla a mitad | test_indice.TestTodoONada (normal y `--todo`) |
| 3 | fecha `20261006`, `2026-10-6`, `2026-W41-3`… | test_notas.TestParsear.test_fecha_solo_acepta_aaaa_mm_dd |
| 4 | índice corrupto → error claro en español, rc 2, `--todo` lo rehace y guarda el roto como `indice.sqlite.roto` | test_indice.TestIndiceRoto, test_cli.test_indice_roto_error_claro_y_todo_lo_recupera |
| 5 | orden BM25 | test_indice.TestOrdenBM25 (embedder `Dirigido` con vectores a mano) |
| m1 | «database is locked» ya no dice FTS5 (`Indice(timeout=)`, `_traducir`) | TestIndiceRoto.test_base_bloqueada_no_dice_que_falta_fts5 |
| m2 | `listar(base, avisos)` saltea enlaces que salen de CEREBRO_DIR, con aviso (indexar y revisar lo imprimen a stderr) | test_listar_no_sigue_enlaces_que_salen_de_cerebro_dir |
| m3 | slug sin ASCII → `nota-<sha256[:6]>` | TestSlug.test_sin_ascii_lleva_sufijo_determinista_y_no_choca |
| m4 | `buscar --json` sin marca R26 | **no se hizo**: queda para C-4 (el MCP la agrega) |

Mutantes de la vuelta 2 (uno por vez, `timeout 120`, revertidos):
| # | Mutante | Resultado |
|---|---|---|
| M6 | fecha sin la regex AAAA-MM-DD | muerto (test_fecha_solo_acepta_aaaa_mm_dd) |
| M7 | sin la guardia `raiz_real.parent != base.resolve()` | muerto (test_proyectos_como_enlace_hacia_afuera_se_rechaza) |
| M8 | `con.commit()` tras el borrado de `--todo` | muerto (test_si_el_embedder_falla_a_mitad_de_todo_…) |
| M11 | `ORDER BY bm25(fts) DESC` | muerto (TestOrdenBM25) |
| M18 | `listar` sigue enlaces | muerto |
| M19 | `buscar` sin traducir errores de SQLite | muerto (2 tests) |
| M20 | slug sin sufijo | muerto |
| M21 | `--todo` borra el roto en vez de apartarlo | muerto |
| M22 | «locked» dicho como FTS5 | muerto |

Los 17 mutantes de la vuelta 1 siguen muertos (suite de esa vuelta incluida en esta).
