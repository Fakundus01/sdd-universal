# Review L-2 @ d0cfe53
**Veredicto:** APPROVED

Vuelta 3 (última). Diff revisado: `git diff a0213f6..d0cfe53` (vuelta 2 del implementer, sobre mi review de `1c19422`). Están resueltos los dos cambios requeridos y las cuatro mejoras. Repetí todas las sondas: ninguna da traceback. Todos los mutantes no equivalentes mueren.

## Verificación re-ejecutada
```text
$ python -m unittest discover -s harness/tests -v      # @ d0cfe53, tail
Ran 163 tests in 71.735s
OK (skipped=1)                                       # 20 de TestGrafoDeTarjetas en ok; el skip es el POSIX de siempre

$ cd harness/tests && python test_checks.py
Ran 51 tests in 28.389s
OK

$ python harness/verify.py --changed
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN                                # ajeno a L-2: el repo del paquete no trae config (la base 23b9298 tampoco)
```
El rojo de `verify.py` en este repo está documentado desde la vuelta 1 y es anterior a la tarjeta. La verificación que pide la tarjeta es la suite (criterio 5), y está en verde.

## Lo pedido en la vuelta anterior
| Pedido @ 1c19422 | Estado @ d0cfe53 | Cómo lo verifiqué |
|---|---|---|
| Req. 1: `UnboundLocalError` en `Card.parse` sin frontmatter | resuelto: `deps`/`deps_error` se inicializan antes del `if` (`harness/checks.py:94-95`) | sondas de `verify.py --quick` (abajo) y mutante «init dentro de `if sep`» muerto (ERROR en `test_formas_raras_...`) |
| Req. 2: test con rojo forzado de formas raras de archivo | `test_formas_raras_de_archivo_en_cards_dan_fail_nunca_excepcion` (sin frontmatter, sin cierre, vacío, binario) | el handback pega su ERROR contra `1c19422`; yo lo reproduje con el mutante |
| Mejora: un ciclo se informa una vez | `assertEqual(..., 1)` en `test_ciclo_entre_dos_...` | el mutante «no marcar `done`», que antes vivía, ahora muere (3 FAIL) |
| Mejora: el DFS no cuelga | tope de pasos `2·(V+E)+10` con un FAIL «el recorrido no termina» | el mutante sin detección de ciclo antes colgaba y ahora da rojo (4 FAIL); con el tope demasiado chico también muere |
| Mejora: recortar el ciclo largo | `test_ciclo_largo_se_informa_recortado` | sonda: ciclo de 2000 → `N0 -> … -> N1999 -> N0 -> (2000 tarjetas)` |
| Mejora: `"[A]"` y `# nada` | `test_lista_entre_comillas_y_comentario_solo_son_validos` | sondas sin FAIL; los dos mutantes mueren |

## Sondas
`verify.py --quick` de punta a punta en proyectos temporales, con `H-1.md` válida y un `sdd/cards/README.md` raro:
| README.md | Resultado |
|---|---|
| sin frontmatter / frontmatter sin cierre / vacío / binario / solo `---` | FAIL de id vacío y de estado inválido (igual que la base), sin traceback |
| BOM + frontmatter | se lee bien |
| frontmatter con CRLF y `in_progress` → `H-1` pendiente | FAIL «despacho fuera de orden» (las dependencias se leen con CRLF) |
| latin-1 | FAIL «no existe» con el carácter reemplazado, sin traceback |
| `depende_de:` vacío como última línea | válido |

Sondas del grafo (las mismas de las vueltas 1 y 2) con `support.Project`: inexistente, A→B→A, A→A, A→B→C→D→A, dos ciclos con una cola, diamante con un ciclo aparte, `in_progress`/`done`/`blocked` fuera de orden, `[A,B]`, `["A", 'B']`, `[]`, ausente, vacío, con espacios, con comentario, `[A,,B,]`, `[<ID>]`, `[A B]`, YAML multilínea con y sin sangría, valores sin corchetes, `{a: 1}`, `[[A]]`, `[` partido, `"[A]"`, `# nada`, duplicados, dos claves `depende_de`, id vacío, cadena de 1500 y de 2000 tarjetas, ciclo de 2000. Todas dan el resultado esperado y ninguna tira traceback.

## Mutantes (copia temporal de `harness/`, `python -m unittest test_checks.TestGrafoDeTarjetas`, timeout de 120 s por corrida)
| Mutante | Resultado |
|---|---|
| `deps` inicializado dentro de `if sep` (la regresión) | muerto (1 ERROR) |
| sin tratar el comentario solo / sin desenvolver las comillas | muertos (1 / 1) |
| sin detección de ciclo | muerto (4): ya no cuelga |
| tope demasiado chico / sin recorte del ciclo | muertos (4 / 1) |
| no marcar `done` / no limpiar `on_path` | muertos (3 / 1 ERROR) |
| sin `done` / `review` / `in_progress` en la tupla | muertos (1 / 1 / 2) |
| invertir `!= "done"` / `not in by_id` | muertos (4 / 10) |
| graph sin sumar a `errors` / ciclo sin `errors += 1` | muertos (3 / 1) |
| sin FAIL de formato / YAML multilínea aceptada / sin corchetes ignorado | muertos (2 / 1 / 1) |
| sin dedupe / no saltar el id vacío | muertos (1 / 1) |
| sin el tope (`if steps > limit` → `False`) | vivo, equivalente: el tope solo se alcanza si el DFS tiene un bug, y el mutante que mete ese bug muere por el tope |

## Checkpoints
- C1: [x] La suite está en verde y `verify.py --quick` ya no tira traceback con ningún archivo raro en `sdd/cards/`. El único FAIL de `--changed` es ajeno a L-2 y anterior a la tarjeta.
- C2: [x] Los criterios 1 a 6 tienen evidencia (tests nombrados en el handback, rojo medido con hash contra `23b9298`, `abcb57c` y `a0213f6`). Zona: `harness/checks.py`, `harness/tests/`, `harness.md` §7 y su historial (vuelta 0), y el handback y `current.md`.
- C3: [x] Sigue el estilo de `check_cards` (mensajes en español con ruta, conteo de `errors`). El formato de `depende_de` coincide con `prompts/task-card.md`.
- C4: [x] Re-ejecuté la suite y el archivo directo. Los tests nuevos cubren el camino feliz y los errores, y todos los mutantes no equivalentes mueren. No hay nada skipeado ni debilitado.
- C5: [x] El handback está completo, commiteado con el hash real y con el apéndice de vueltas. No hay archivos throwaway.

## Cambios requeridos
- Ninguno.

## Mejoras sugeridas (no bloquean, para una próxima tarjeta)
- `harness/checks.py:115-119`: `depende_de: "A", "B"` da FAIL, que es correcto, pero el mensaje muestra `'A", "B'` porque el desenvolver comillas se come la primera y la última. Conviene desenvolver solo si lo de adentro empieza con `[`.
- `harness/checks.py:272`: el recorte agrega el conteo como si fuera otro nodo (`… -> N0 -> (2000 tarjetas)`). Queda más claro `… -> N0 (2000 tarjetas)`.
- `prompts/task-card.md` y `harness.md` §7.4 podrían decir que `depende_de` va en una línea entre corchetes, porque el arnés ahora rechaza lo demás. Lo sugiere el handback; está fuera de la zona de esta tarjeta.

## Mejoras al arnés detectadas
- Lo que encontró los huecos en las tres vueltas fue matar mutantes en la review. En las tarjetas de checks conviene pedirle al implementer una tabla de mutantes muertos en el handback (en la vuelta 1 ya la trajo) y que el reviewer la reproduzca.
- Sumar al arnés un test genérico: «cualquier archivo en `sdd/cards/` da FAIL y nunca excepción». Esta tarjeta ya lo agregó en `test_formas_raras_...`.

## Apéndice: vueltas anteriores
- **Vuelta 1 — Review L-2 @ f7673be: CHANGES_REQUESTED.** Faltaba un test de `done` fuera de orden (el mutante sin `"done"` sobrevivía), y un FAIL del grafo no apagaba el `[OK] Tarjetas válidas` (los mutantes `return 0` y sin `errors += 1` sobrevivían). Las mejoras sugeridas fueron: DFS recursivo con `RecursionError` en unas 1000 tarjetas, YAML multilínea y valores sin corchetes que se perdían en silencio, duplicados, el mensaje con id vacío y la clase después de `__main__`. Se resolvió en `1c19422`.
- **Vuelta 2 — Review L-2 @ 1c19422: CHANGES_REQUESTED.** La reescritura de `Card.parse` metió un `UnboundLocalError` con cualquier `.md` sin frontmatter, sin cierre o vacío en `sdd/cards/`, y no había un test que lo cubriera. Las mejoras sugeridas fueron: un test de que el ciclo se informa una sola vez, que el DFS no cuelgue, recortar el ciclo largo, y aceptar `"[A]"` y `# nada`. Se resolvió en `d0cfe53` (esta vuelta).
