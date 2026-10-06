# Review L-2 @ 1c19422
**Veredicto:** CHANGES_REQUESTED

Vuelta 2 (re-review). Diff revisado: `git diff abcb57c..1c19422` (vuelta 1 del implementer, sobre mi review de `f7673be`). Los dos cambios que pedí están resueltos, y todas las sondas y mutantes de la vuelta anterior dan bien. Pero la vuelta 1 metió una **regresión con traceback** en `Card.parse`: una tarjeta sin frontmatter tira `verify.py` abajo.

## Verificación re-ejecutada
```text
$ python -m unittest discover -s harness/tests -v      # @ 1c19422, tail
Ran 160 tests in 85.476s
OK (skipped=1)                                       # 17 de TestGrafoDeTarjetas en ok; el skip es el POSIX de siempre

$ cd harness/tests && python test_checks.py           # directo: ahora la clase está antes de __main__
Ran 48 tests in 32.631s
OK

$ python harness/verify.py --changed
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN                                # ajeno a L-2: la base 23b9298 tampoco trae config
```

### Regresión encontrada (bloquea)
Corrí `verify.py --quick` en un proyecto temporal con `sdd/cards/H-1.md` válida y un `sdd/cards/README.md` sin frontmatter:
```text
== HEAD 1c19422  rc 1
  File ".../harness/checks.py", line 182, in load_cards
    self.cards = [Card.parse(p) for p in sorted(folder.glob("*.md"))] if folder.is_dir() else []
  File ".../harness/checks.py", line 107, in parse
    card.deps, card.deps_error = deps, deps_error
UnboundLocalError: cannot access local variable 'deps' where it is not associated with a value

== base 23b9298  rc 1
[FAIL]  sdd/cards/README.md: el id del frontmatter (vacío) no coincide con el nombre del archivo
[FAIL]  sdd/cards/README.md: estado inválido '' (válidos: ...)
ROJO — 2 FAIL, 0 WARN
```
También pasa con un frontmatter sin cerrar (`---\nid: X\n...` sin el segundo `---`) y con un `.md` vacío. Las tres formas, llamando a `Card.parse` directo, dan `UnboundLocalError`.

### Sondas a mano (proyectos temporales con `support.Project`)
| Caso | Resultado @ 1c19422 |
|---|---|
| `[X-9]` inexistente | FAIL que nombra la tarjeta y `X-9` |
| A→B→A / A→A / A→B→C→D→A | FAIL con el ciclo, una vez cada uno |
| dos ciclos y una cola, diamante con un ciclo aparte | un FAIL por ciclo; el diamante no es un ciclo |
| `in_progress`/`done` → `pending`/`blocked` | FAIL «despacho fuera de orden» |
| `[A,B]`, `["A", 'B']`, `[]`, ausente, vacío, `[ A ,  B ]`, `[A, B]  # c`, `[A,,B,]`, `[<ID>]`, `[] # c` | sin FAIL |
| YAML en varias líneas (`  - A` y `- A` sin sangría) | FAIL «formato no reconocido: lista en varias líneas» |
| sin corchetes: `A, B`, `"A", "B"`, `A` | FAIL «no está entre corchetes» |
| `depende_de:` vacío y la línea siguiente es otra clave | sin FAIL (correcto) |
| duplicados `[A, 'A', "A"]` | un solo FAIL de fuera de orden |
| `[A B]` (id con espacio) | FAIL claro «A B no existe» |
| `{a: 1}`, `[[A]]`, `[` partido en dos líneas | FAIL de formato, sin traceback |
| id vacío | solo el FAIL del id, no inventa un «no existe» |
| cadena de 1500 y de 2000 tarjetas | sin FAIL y sin traceback |
| ciclo de 2000 tarjetas | se encuentra, pero el mensaje es una sola línea con los 2000 ids (ver mejoras) |
| **tarjeta sin frontmatter / sin cierre / vacía** | **`UnboundLocalError`** (arriba) |

### Mutantes (los maté yo, en una copia temporal de `harness/`, `python -m unittest test_checks.TestGrafoDeTarjetas`)
| Mutante | Resultado |
|---|---|
| sacar la llamada a `_check_graph` / sumarla sin `errors` | muertos (11 / 3 FAIL) |
| sacar `done` / `review` / `in_progress` de la tupla | muertos (1 / 1 / 2) |
| invertir `!= "done"` / `not in by_id` | muertos (4 / 9) |
| sin `errors += 1` en inexistente / fuera de orden / formato / ciclo | muertos (1 cada uno) |
| sin el FAIL de formato | muerto (2) |
| sin detección de ciclo (`if dep in on_path` → `False`) | muerto: la suite **cuelga** (timeout de 180 s), no da rojo |
| `_check_cycles` no suma | muerto (1) |
| no limpiar `on_path` | muerto (1 error, el diamante) |
| aceptar YAML multilínea / sin corchetes (split o ignorado) | muertos (1 cada uno) |
| sin dedupe / sin quitar comillas / sin filtrar vacíos / regex sin comentario | muertos (1 cada uno) |
| no saltar las tarjetas de id vacío | muerto (1) |
| **no marcar `done` al cerrar un nodo** | **vivo**: A↔B se informa dos veces (`A -> B -> A` y `B -> A -> B`) y en grafos con muchos diamantes el DFS se vuelve exponencial |
| sin `if start in done: continue` | vivo, pero equivalente (solo cambia el costo) |
| `by_id` incluye las tarjetas de id vacío | vivo, casi equivalente |

La tabla del handback coincide con lo que medí en los mutantes que tienen en común.

## Checkpoints
- C1: [ ] `verify.py --quick` revienta con traceback si en `sdd/cards/` hay un `.md` sin frontmatter (un `README.md`, una tarjeta a medio escribir). En la base daba FAIL.
- C2: [x] Los criterios 1 a 6 tienen evidencia. Zona: `checks.py`, `tests/` y el handback. `harness.md` no cambió en esta vuelta.
- C3: [x] Sigue el estilo de `check_cards`. El formato estricto coincide con `prompts/task-card.md` (`depende_de: []`).
- C4: [ ] Ningún test cubre que una tarjeta sin frontmatter siga dando FAIL y no traceback, y por eso la regresión pasó la suite. Lo demás se mató: los dos pedidos de la vuelta anterior están resueltos.
- C5: [x] El handback está commiteado con el hash real y trae el apéndice de vueltas. Un detalle: dice «16 tests» en `TestGrafoDeTarjetas` y son 17.

## Cambios requeridos
1. `harness/checks.py:99`: `deps, deps_error = [], ""` está dentro de `if sep:`, pero la línea 107 (`card.deps, card.deps_error = deps, deps_error`) corre siempre. Si el archivo no empieza con `---`, si el frontmatter no cierra o si el archivo está vacío, sale `UnboundLocalError` y `verify.py` se cae, cuando antes daba los FAIL de id y estado. Hay que inicializar `deps, deps_error` antes del `if text.startswith("---")`.
2. `harness/tests/test_checks.py`: falta un test con rojo forzado contra `1c19422` con un `sdd/cards/README.md` sin frontmatter (y otro con el frontmatter sin cerrar). Tiene que pedir que `run_checks()` no lance excepción y que aparezca el FAIL de id vacío, como en la base.

## Mejoras sugeridas (no bloquean)
- `harness/checks.py:255` (`done.add(node)`): ningún test pide que un ciclo se informe **una sola vez**, que es lo que dicen el docstring de `_check_cycles` y el handback. Alcanza con `assertEqual` de la cantidad de FAIL «ciclo» en `test_ciclo_entre_dos_falla_y_lo_muestra` (`harness/tests/test_checks.py:214`).
- Sin detección de ciclo, el DFS no termina: `test_ciclo_en_cadena_larga_se_encuentra` cuelga en vez de dar rojo. Un tope de pasos (por ejemplo `len(path) > len(by_id)` → FAIL), o correr ese test con timeout, haría que el mutante falle en vez de colgarse.
- Un ciclo largo produce un mensaje de miles de ids. Conviene recortarlo (`N0 -> N1 -> … -> N1999 -> N0 (2000 tarjetas)`).
- `depende_de: "[A]"` (YAML válido) y `depende_de: # nada` dan FAIL con «no está entre corchetes», un texto que confunde en los dos casos. Se puede aceptar la lista entera entre comillas y tratar el comentario solo como vacío, o al menos ajustar el mensaje.

## Mejoras al arnés detectadas
- Un test genérico «toda forma rara de archivo en `sdd/cards/` (sin frontmatter, sin cierre, vacío, binario) da FAIL y nunca excepción» habría atrapado esta regresión. Conviene sumarlo para cualquier cambio en `Card.parse`.

## Apéndice: vuelta anterior
- **Vuelta 1 — Review L-2 @ f7673be: CHANGES_REQUESTED.** Pedí (1) un test de una tarjeta `done` con una dependencia que no está `done` (el mutante que sacaba `"done"` sobrevivía) y (2) que un FAIL del grafo apague el `[OK] Tarjetas válidas` (los mutantes `return 0` y sin `errors += 1` sobrevivían). Mejoras sugeridas: DFS iterativo (`RecursionError` con unas 1000 tarjetas), no perder en silencio la lista YAML multilínea ni los valores sin corchetes, deduplicar, el mensaje con id vacío, y mover la clase antes de `__main__`. **Estado en 1c19422:** (1) y (2) resueltos y verificados con mutantes; todas las mejoras aplicadas y verificadas con sondas. La regresión nueva salió de cómo se reescribió `Card.parse` para la mejora del formato.
