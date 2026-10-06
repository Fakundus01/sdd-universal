# Handback C-2 — Núcleo de cerebro/: notas, índice híbrido y buscar

- **Estado:** done
- **Rama / commit:** `v0.36-C-2` @ `e710850` (código; el commit siguiente solo agrega este handback y `current.md`)
- **Quién:** implementer (MEDIO), retomando una sesión cortada

## Hecho
- Retomé lo existente (config, embedders, notas, indice y 4 archivos de tests, ya completos y correctos) y lo commiteé como base (`682088d`, con `cerebro.py` aún stub).
- Completé `cerebro/cerebro.py`: `init · indexar [--todo] · buscar [--proyecto --tipo -k --json] · revisar · nota`; errores esperados en español por stderr, código 2, sin traceback; salida de `buscar` marcada como dato (R26) con `fuente`.
- Agregué `test_tope_por_defecto_es_1500` (mató un mutante que sobrevivía) y `cerebro/.gitignore` (`.venv/`, `__pycache__/`, `*.pyc`).
- Los 7 criterios cubiertos; solo stdlib, sin instalar nada. FTS5 disponible.

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
Ran 62 tests in 1.031s
OK
$ py -3.11 -m unittest discover -s cerebro/tests
Ran 62 tests in 0.977s
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
