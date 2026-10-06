# Review L-2 @ f7673be
**Veredicto:** CHANGES_REQUESTED

Diff revisado: `git diff 23b9298..f7673be` (base del handback). La implementación es correcta en los casos de la tarjeta; lo que falta son tests: dos de las ramas del check se pueden borrar y la suite sigue en verde.

## Verificación re-ejecutada
```text
$ python -m unittest discover -s harness/tests -v      # @ f7673be, tail
test_autodependencia_es_ciclo (test_checks.TestGrafoDeTarjetas...) ... ok
test_ciclo_entre_dos_falla_y_lo_muestra ... ok
test_dependencia_inexistente_falla ... ok
test_formas_de_la_lista_y_dependencia_done_es_valida ... ok
test_in_progress_con_dependencia_sin_done_falla ... ok
test_pending_con_dependencia_sin_done_es_valida ... ok
test_review_con_dependencia_sin_done_falla ... ok
test_sin_depende_de_o_vacio_es_valido ... ok
Ran 151 tests in 59.714s
OK (skipped=1)          # el skip es test_posix_linter_con_ruta_relativa_y_script, anterior a L-2

$ python harness/verify.py --changed
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN
```
El rojo de `verify.py` no tiene que ver con L-2: la base `23b9298` tampoco trae `harness.config.json` (`git ls-tree 23b9298` no lo lista), porque el repo del paquete no lo tiene. La suite del arnés es la verificación que pide la tarjeta.

### Casos armados a mano (proyectos temporales con `support.Project`, fuera del repo)
| Caso | Resultado |
|---|---|
| `depende_de: [X-9]` inexistente | `FAIL sdd/cards/A.md: depende_de X-9 y esa tarjeta no existe (sdd/cards/X-9.md)` |
| A→B→A | `FAIL ciclo en depende_de: A -> B -> A` |
| A→A | `FAIL ciclo en depende_de: A -> A` |
| A→B→C→D→A | `FAIL ciclo en depende_de: A -> B -> C -> D -> A` (una sola vez) |
| dos ciclos y una cola (E→C) | un FAIL por ciclo, la cola no repite el ciclo |
| `in_progress` → `pending` / `blocked` | `FAIL ... despacho fuera de orden` |
| `done` → `pending` | `FAIL ... done pero depende de A, que está pending` |
| `[A,B]`, `["A", 'B']`, `[]`, ausente, vacío, `[ A ,  B ]`, `A, B`, `[A, B]  # coment`, `[A,,B,]`, `[<ID>]` | sin FAIL |
| `[A B]` (id con espacio) | FAIL claro: `depende_de A B y esa tarjeta no existe` |
| `[ ' A ' ]` | se normaliza a `A`, sin FAIL |
| `{a: 1}`, `[[A]]`, estado inválido + dep, id vacío | FAIL claros, sin traceback |
| cadena lineal de 1500 tarjetas | **`RecursionError`** (traceback); hasta 980 anda bien |

### Mutantes (copia de `harness/` en un directorio temporal, `python -m unittest test_checks`)
| Mutante | Resultado |
|---|---|
| sacar `errors += self._check_graph()` | muerto (5 FAIL) |
| invertir `!= "done"` / `not in by_id` / quitar el chequeo de ciclo | muertos |
| sacar `"in_progress"` de los estados despachados | muerto |
| cambiar el parseo de `deps` (corchetes, comillas, split, vacíos) | muertos |
| **sacar `"done"` de `("in_progress", "review", "done")`** | **vivo** |
| **`_check_graph` devuelve `0`** (o se saca el `errors += 1` del ciclo o de la dependencia inexistente) | **vivo** |

## Checkpoints
- C1: [x] La suite está en verde. El rojo de `verify.py` ya estaba en la base y viene de que el paquete no tiene config (ver arriba). Las rutas nuevas existen.
- C2: [x] Los criterios 1 a 6 tienen evidencia y se tocó solo la zona permitida (`checks.py`, `tests/`, `harness.md` §7 y su historial, el handback y `current.md`).
- C3: [x] Sigue el estilo de `check_cards`: mensajes en español con la ruta y conteo de `errors`.
- C4: [ ] Dos ramas del check se pueden quitar y ningún test da rojo (ver «Cambios requeridos» 1 y 2). `harness.md` §7.4 dice que el check cubre `done` y eso no tiene test.
- C5: [x] El handback está completo y commiteado con hash real, y `current.md` está al día. No quedan archivos de prueba sueltos.

## Cambios requeridos
1. `harness/tests/test_checks.py` (clase `TestGrafoDeTarjetas`) no tiene un test de una tarjeta `done` que depende de una que no está `done`. El objetivo de la tarjeta y `harness.md` §7.4 nombran `in_progress`/`review`/`done`, y la regla del §7 es que cada check tiene su test con rojo forzado. El mutante que saca `"done"` en `harness/checks.py:214` sobrevive. Falta un test con `H-1` en `pending` y `H-2` en `done` (`rama: main`, con review) y `depende_de: [H-1]`, que pida un `assertFails(..., "fuera de orden")`.
2. `harness/checks.py:200` (`errors += self._check_graph()`): ningún test verifica que un FAIL del grafo apague el `[OK] Tarjetas válidas (n)`. Si `_check_graph` devuelve `0`, el reporte muestra a la vez `FAIL ciclo ...` y `OK Tarjetas válidas`, un mensaje que se contradice, y la suite sigue en verde. Alcanza con agregar `assertNotIn` del OK en el test del ciclo y en el de la dependencia inexistente.

## Mejoras sugeridas (no bloquean)
- `harness/checks.py:220-235`: el DFS es recursivo y una cadena de unas 1000 tarjetas tira `RecursionError` con traceback. No es un caso real, pero un DFS iterativo (o un `try/except RecursionError` → FAIL) evita el traceback. Además, `path + [node]` y `node in path` son O(n²).
- `harness/checks.py:106` (`Card.deps`): hay dos formas que se pierden en silencio. Con `depende_de:` y la lista YAML en varias líneas (`  - A`), el parser por línea no ve ninguna dependencia. Con `depende_de: "A", "B"` (sin corchetes), `_clean_value` se queda solo con `A`. En los dos casos una `in_progress` con una dependencia pendiente pasa sin FAIL. Un WARN «depende_de vacío pero hay líneas `- X` debajo», o un FAIL con un formato no reconocido, cerraría el hueco.
- Una dependencia repetida (`[A, A]`) produce el FAIL de fuera de orden dos veces: conviene deduplicar en `deps`.
- Con el id vacío en el frontmatter, el mensaje dice `depende_de Q y esa tarjeta no existe (sdd/cards/Q.md)` aunque el archivo existe. El FAIL de id vacío ya aparece, pero ese mensaje confunde.
- `harness/tests/test_checks.py:204-258`: la clase nueva quedó después de `if __name__ == "__main__": unittest.main()`. Con `python test_checks.py`, `unittest.main()` corre y sale antes de que la clase exista, así que sus tests no se ejecutan (con `discover` sí). Hay que moverla arriba de ese bloque.

## Mejoras al arnés detectadas
- Un paso de mutantes mínimo en la review de checks (sacar cada estado de una tupla de estados y cada `errors += 1`) habría encontrado los dos huecos de C4. Para el prompter: en las tarjetas de checks, que el implementer pegue en el handback una tabla de mutantes muertos.
