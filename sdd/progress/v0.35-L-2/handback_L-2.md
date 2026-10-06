# Handback L-2 — verify.py revisa depende_de: que exista y que no haya ciclos

- **Estado:** done
- **Rama / commit:** `v0.35-L-2` @ `HASH_PLACEHOLDER` (base `23b9298`; el hash final está en `git log -1`, el commit incluye este handback)
- **Quién:** implementer (MEDIO)

## Hecho
- `Card.deps` parsea `depende_de` (`[A, B]`, `[A,B]`, comillas simples o dobles, sin corchetes; ausente o `[]` = sin dependencias).
- `HarnessChecks._check_graph` (llamado desde `check_cards`): FAIL si una dependencia no existe, FAIL por ciclo mostrando el camino (`H-1 -> H-2 -> H-1`, `H-1 -> H-1`), FAIL si una tarjeta `in_progress`/`review`/`done` depende de una que no está `done` («despacho fuera de orden»).
- `harness.md` §7: punto nuevo 4 (el resto se renumeró) e historial 0.35.

## No hecho / pendiente
- Nada.

## Cómo
- Mismo estilo que `check_cards`: cuenta `errors`, mensajes en español con ruta de la tarjeta. El check corre aunque una tarjeta tenga estado inválido (ese `continue` no lo salta).
- Ciclos por DFS sobre ids ordenados, cada ciclo se informa una vez; las dependencias inexistentes se ignoran en el DFS (ya tienen su FAIL).
- `support.Project.card` suma el parámetro opcional `depende_de` (None = línea ausente), compatible con los tests viejos.
- Las dependencias `pending`/`blocked` de una tarjeta `pending`/`blocked` son válidas (solo se exige `done` al despachar).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| harness/checks.py | `Card.deps`, `_check_graph`, llamada desde `check_cards` |
| harness/tests/support.py | `card(..., depende_de=None)` + `{extra}` en la plantilla |
| harness/tests/test_checks.py | clase `TestGrafoDeTarjetas` (8 tests) |
| harness.md | §7 (check nuevo, renumerado) e historial |
| sdd/progress/v0.35-L-2/ | `current.md` y este handback |

## Evidencia
| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. dependencia inexistente | `test_dependencia_inexistente_falla` |
| 2. ciclo A→B→A y A→A | `test_ciclo_entre_dos_falla_y_lo_muestra`, `test_autodependencia_es_ciclo` |
| 3. in_progress (y review) con dep no done | `test_in_progress_con_dependencia_sin_done_falla`, `test_review_con_dependencia_sin_done_falla` |
| 4. ausente/`[]`/formas de lista válidas | `test_sin_depende_de_o_vacio_es_valido`, `test_formas_de_la_lista_y_dependencia_done_es_valida`, `test_pending_con_dependencia_sin_done_es_valida` |
| 5. suite OK, un test por criterio visto en rojo | abajo |
| 6. harness.md §7 lista el check | punto 4 de §7 |

Rojo antes (R29), medido contra la base (`checks.py` sin tocar; tests nuevos ya escritos):
```text
$ git rev-parse --short HEAD
23b9298
$ python -m unittest test_checks.TestGrafoDeTarjetas      # en harness/tests, recortado a los FAIL (sin tracebacks)
FFF.F.F.
FAIL: test_autodependencia_es_ciclo
AssertionError: False is not true : esperaba un FAIL con 'H-1 -> H-1'; hubo: []
FAIL: test_ciclo_entre_dos_falla_y_lo_muestra
AssertionError: False is not true : esperaba un FAIL con 'ciclo'; hubo: []
FAIL: test_dependencia_inexistente_falla
AssertionError: False is not true : esperaba un FAIL con 'H-1'; hubo: []
FAIL: test_in_progress_con_dependencia_sin_done_falla
AssertionError: False is not true : esperaba un FAIL con 'H-2'; hubo: []
FAIL: test_review_con_dependencia_sin_done_falla
AssertionError: False is not true : esperaba un FAIL con 'fuera de orden'; hubo: []
Ran 8 tests in 2.912s
FAILED (failures=5)
```
(Los 3 tests de casos válidos pasan en la base, como corresponde: son no-regresión del criterio 4.)

Verde después:
```text
$ python -m unittest test_checks.TestGrafoDeTarjetas
Ran 8 tests in 2.756s
OK
$ python -m unittest discover -s harness/tests      # tail -5
Ran 151 tests in 56.009s
OK (skipped=1)
$ python harness/verify.py --changed      # @ 23b9298 (rama v0.35-L-2)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN
```
`verify.py --changed` falla en este repo por una causa ajena: el paquete SDD Universal no trae `harness.config.json` en su raíz (la suite del arnés se corre con `unittest discover`, como pide la tarjeta). No lo toqué (fuera de zona).

Rojo forzado del check: los casos de los tests construyen tarjetas reales con el defecto y el check devuelve `[FAIL]`; contra la base devuelven `hubo: []` (arriba).

## Fuera de zona / riesgos
- Renumeré los puntos de `harness.md` §7 (el check entra como 4, los siguientes suben 1). Otros docs citan `§7.3` (tarjetas) y siguen válidos; `§7.4` ya no es «handbacks» (solo lo cita el historial/review viejo).
- En el repo del paquete sin `harness.config.json`, `verify.py` da rojo siempre; no relacionado.

## Cambios de spec sugeridos
- Ninguno.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Con L-2 mergeada, las tarjetas con `depende_de` ya quedan validadas por `verify.py`; el leader puede activar el grafo en `current.md`.
