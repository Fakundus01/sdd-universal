# Handback L-2 — verify.py revisa depende_de: que exista y que no haya ciclos

- **Estado:** done
- **Rama / commit:** `v0.35-L-2` @ `HASH_NUEVO` (vuelta 1; base de la vuelta `abcb57c`)
- **Quién:** implementer (MEDIO)

## Hecho
- `Card.deps` (campo, ya parseado) y `Card.deps_error`: `depende_de: [A, B]` / `[A,B]` / comillas / `[]` / ausente / comentario al final son válidos y se deduplican; **cualquier otro formato da `FAIL ... formato no reconocido`** (lista YAML en varias líneas, valores sin corchetes, `"A", "B"`, un id suelto).
- `_check_graph` (existencia, fuera de orden para `in_progress`/`review`/`done`) y `_check_cycles` (**DFS iterativo**, sin `RecursionError`, O(n) con `on_path`; un ciclo se informa una vez). Una tarjeta con id vacío no inventa un «no existe» (ya falla por el id vacío).
- Tests: `TestGrafoDeTarjetas` (16 tests) movida arriba de `if __name__ == "__main__"`; ahora corre también con `python test_checks.py`.
- `harness.md` §7 punto 4 e historial 0.35, sin cambios respecto a la vuelta 0.

## No hecho / pendiente
- Nada.

## Cómo
- El formato estricto sigue `prompts/task-card.md` (`depende_de: [H-1, H-2]`); lo que antes se aceptaba suelto (`A, B` o `A`) ahora avisa con FAIL en vez de perderse. Decisión pedida por el leader.
- Cambios requeridos 1 y 2 del review: tests `test_done_con_dependencia_sin_done_falla` y `test_fallo_del_grafo_apaga_el_ok_de_tarjetas`; además el OK apagado se verifica en fuera de orden y formato.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| harness/checks.py | `Card.deps`/`deps_error`/`_parse_deps`, `_check_graph`, `_check_cycles` iterativo |
| harness/tests/test_checks.py | `TestGrafoDeTarjetas` (16 tests) antes del `__main__` |
| harness/tests/support.py | sin cambios en esta vuelta (`card(..., depende_de=None)` de la vuelta 0) |
| harness.md | §7 punto 4 + historial 0.35 (vuelta 0) |
| sdd/progress/v0.35-L-2/ | `current.md`, este handback |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1. dependencia inexistente | `test_dependencia_inexistente_falla`, `test_id_vacio_no_inventa_dependencia_inexistente` |
| 2. ciclos A→B→A, A→A | `test_ciclo_entre_dos_falla_y_lo_muestra`, `test_autodependencia_es_ciclo`, `test_ciclo_en_cadena_larga_se_encuentra`, `test_diamante_no_es_ciclo` |
| 3. fuera de orden | `test_in_progress_...`, `test_review_...`, `test_done_con_dependencia_sin_done_falla` |
| 4. ausente/`[]`/formas válidas | `test_sin_depende_de_o_vacio_es_valido`, `test_formas_de_la_lista_...` (incluye repetidas y comentario), `test_pending_con_dependencia_...` |
| formatos no reconocidos | `test_lista_yaml_en_varias_lineas_falla`, `test_valores_sin_corchetes_fallan` |
| dedupe / cadena larga | `test_dependencia_repetida_falla_una_sola_vez`, `test_cadena_larga_sin_traceback` |
| 5. suite OK | abajo |
| 6. harness.md §7 | punto 4 |

Rojo antes (R29), tests nuevos contra el `checks.py` de la base de la vuelta (`abcb57c`):
```text
$ git rev-parse --short HEAD
abcb57c
$ python test_checks.py TestGrafoDeTarjetas      # en harness/tests, sin tracebacks
.EE..F...F.F...F
ERROR: test_cadena_larga_sin_traceback            RecursionError: maximum recursion depth exceeded
ERROR: test_ciclo_en_cadena_larga_se_encuentra    RecursionError: maximum recursion depth exceeded
FAIL: test_dependencia_repetida_falla_una_sola_vez   AssertionError: 2 != 1
FAIL: test_id_vacio_no_inventa_dependencia_inexistente   (hubo un FAIL "no existe")
FAIL: test_lista_yaml_en_varias_lineas_falla      esperaba un FAIL con 'formato no reconocido'; hubo: []
FAIL: test_valores_sin_corchetes_fallan           esperaba un FAIL con 'formato no reconocido'; hubo: [... no existe]
Ran 16 tests / FAILED (failures=4, errors=2)
```
Los tests de `done`, del OK apagado y del diamante pasaban o no aplicaban en la base: su rojo es la tabla de mutantes (cada uno falla cuando se quita la rama que cubren).

Verde después:
```text
$ python -m unittest discover -s harness/tests      # tail -4
Ran 160 tests in 72.811s
OK (skipped=1)
```
`verify.py --changed` sigue en `[FAIL] falta harness.config.json` por la causa ajena de la vuelta 0 (el paquete no trae config; la base tampoco).

### Mutantes (copia temporal de `harness/`, `python -m unittest test_checks.TestGrafoDeTarjetas`)
| Mutante | Resultado | Test que lo mata |
|---|---|---|
| sacar `"done"` de la tupla de estados | muerto (1 FAIL) | `test_done_con_dependencia_sin_done_falla` |
| sacar `"review"` | muerto (1 FAIL) | `test_review_con_dependencia_sin_done_falla` |
| sacar `"in_progress"` | muerto (2 FAIL) | `test_in_progress_...` y OK apagado |
| `_check_graph()` sin sumar a `errors` | muerto (3 FAIL) | `test_fallo_del_grafo_apaga_el_ok_de_tarjetas` y afines |
| sin `errors += 1` (formato) | muerto (1 FAIL; vivo antes de agregar el aserto del OK) | `test_valores_sin_corchetes_fallan` |
| sin `errors += 1` (inexistente) | muerto (1 FAIL) | `test_fallo_del_grafo_apaga_el_ok_de_tarjetas` |
| sin `errors += 1` (fuera de orden) | muerto (1 FAIL; vivo antes del aserto del OK) | `test_in_progress_con_dependencia_sin_done_falla` |
| sin `errors += 1` (ciclo) | muerto (1 FAIL) | `test_fallo_del_grafo_apaga_el_ok_de_tarjetas` |
| invertir la condición del ciclo (`dep not in on_path`) | muerto (el DFS cuelga; corte a los 100 s) | todo el grupo de ciclos |
| invertir `!= "done"` | muerto (4 FAIL) | fuera de orden y válidos |
| no limpiar `on_path` al cerrar un nodo | vivo la primera vez; muerto (error) con `test_diamante_no_es_ciclo` agregado | `test_diamante_no_es_ciclo` |

## Fuera de zona / riesgos
- Igual que la vuelta 0: `verify.py` sin `harness.config.json` en el repo del paquete.
- Riesgo: tarjetas de proyectos con `depende_de: A, B` (sin corchetes) ahora dan FAIL; es el formato de `prompts/task-card.md` el que manda.

## Cambios de spec sugeridos
- `prompts/task-card.md` y `harness.md` §7 podrían nombrar explícitamente que solo vale la lista de una línea entre corchetes.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Re-review de L-2.

## Apéndice: vueltas
- Vuelta 1 (HASH_NUEVO): review R30 CHANGES_REQUESTED sobre `f7673be`. Req. 1 (test de `done` fuera de orden) y 2 (el FAIL del grafo apaga el OK) resueltos; mejoras: DFS iterativo, FAIL por formato no reconocido, dedupe, id vacío, clase de tests antes de `__main__`, tabla de mutantes (que además encontró dos huecos más: aserto del OK en formato y fuera de orden, y el diamante).
