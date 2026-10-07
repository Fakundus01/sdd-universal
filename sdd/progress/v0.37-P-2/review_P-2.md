# Review P-2 @ ecc50950c2a62bf9843c9de03276557ae03352d6
**Veredicto:** CHANGES_REQUESTED

Reviewer independiente (tier ALTO). Base `b69f873`, código `e31125d`, handback `ed3639a`, fila de Costo del leader `324d1a4`, merge del plan `ecc5095`. Worktree `sdd-universal-P-2-rev` (rama `v0.37-P-2-rev`). Python 3.14.0, Node v24.11.1. Scripts en `scratchpad/p2-rev/`: `sondas.py` (27 casos contra `HarnessChecks` completo) y `mutantes.py` (24 mutantes, `subprocess.run(..., timeout=300)` y `git checkout -- harness/checks.py` después de cada uno). `verify.py` creó `sdd/progress/v0.37-P-2-rev/current.md` de plantilla. Lo borré y no lo commiteé.

**Resumen.** El mecanismo está bien hecho y probado: la plantilla, la línea `Costo:` en los cinco formatos, el paso del leader, la tabla de `metrics.md`, un WARN que nunca es FAIL y 14 de 14 mutantes muertos. Tiene tres problemas que cambian cómo un leader registra el costo en la práctica:
- El WARN **no se dispara nunca en un proyecto normal**: la rama por defecto de `task-card.md` es `main`, y `card/E-10` tampoco tiene versión.
- La fila que la plantilla le hace escribir al implementer (`| implementer | <modelo> | 1 | n/d | n/d | n/d |`) **ya cuenta como completa**, así que el check no detecta que el leader se olvidó.
- El formato le pide al agente su modelo, que no conoce con certeza (este mismo handback anotó «opus 5.5» y era sonnet). Además pide tokens «entrada/salida», que Claude Code no separa.

## 1. Zona
- `git diff b69f873..ed3639a --stat` (solo el implementer) toca 12 archivos, todos en la zona o en la zona ampliada: `SDD-COMPACT(-EN).md`, `SDD-MASTER(-EN).md` (+1 línea dentro del bloque HANDBACK de §7), `agents/leader.md`, `harness/checks.py`, `harness/tests/test_checks.py`, `prompts/handback.md`, `prompts/loop-prompt.md`, `teams.md`, y `current.md` y el handback en `sdd/progress/v0.37-P-2/`.
- Lo único que aparece de más en `b69f873..ecc5095` es `sdd/progress/v0.37-P-1/handback_P-1.md`. Viene de `19f343b`, un commit del leader con los datos de los avisos de fin de corrida, no del implementer.
- Los handbacks v0.35 y v0.36 no se tocaron. No hay datos inventados.
- Compactos: +33 bytes. `[OK] Arranque liviano: paquete 8985 bytes de 10240`: el tope de P-1 se respeta.

## 2. Criterios
| # | Veredicto | Nota |
|---|---|---|
| 1 | OK con pedidos 3 y 4 | `prompts/handback.md` tiene la sección «Costo» con rol, modelo, vuelta, tokens, USD y duración, y `n/d`. |
| 2 | OK con el pedido 4 | Tienen la línea `Costo:`/`Cost:` en el mismo lugar: `loop-prompt.md`, master §7 ES/EN (solo el bloque HANDBACK) y los dos compactos. |
| 3 | OK | `leader.md` paso 5 (anotar al recibir cada handback/review) y paso 7 (sumar a `metrics.md`). La tabla está en `teams.md` §8, el mismo § que el master ya cita para `metrics.md`. |
| 4 | **Parcial** (pedidos 1 y 2) | Es WARN y nunca FAIL (probado: 0 FAIL en los 27 casos de sondas). El corte por versión está documentado en `checks.py`. Pero solo funciona con ramas `vX.Y-…`, o sea, en este repo. |
| 5 | OK | `VERDE — 0 FAIL, 0 WARN` en `ecc5095`. |

## 3. Sondas sobre el check (`sondas.py`, `HarnessChecks` completo en un proyecto temporal)
```text
card/E-10 sin Costo                           -> -        <- proyecto normal: nunca avisa
main sin Costo (plantilla task-card)          -> -        <- idem, y es el default
v1.0-x / v0.100 / v0.37 / v0.37.1-H-1 sin Costo -> WARN
V0.37-H-1 (mayúscula) / release/v0.37-H-1     -> -        (exótico)
v0.36-H-1 sin Costo                           -> -        (corte, OK)
solo encabezado / encabezado+separador        -> WARN
sección vacía / tabla sin encabezado          -> WARN
fila primera celda vacía                      -> WARN
fila todo n/d                                 -> -        (cuenta: ver pedido 1)
fila rol real, resto n/d                      -> -
fila de plantilla literal (<modelo>, n/d…)    -> -        <- el leader no completó nada y calla
### Costo / ## Costo y tokens con fila        -> -
## Costos / ## Cost (EN) con fila             -> WARN     (falso aviso, inocuo)
comentario HTML entre separador y fila        -> -
tabla en bloque ``` (plantilla pegada)        -> -        (exótico)
handback inexistente / in_progress / blocked  -> -
```
Ninguno dio FAIL.

## 4. Verde
```text
$ python -m unittest discover -s harness/tests      -> Ran 237 tests in 113.677s  OK (skipped=1)
$ node --test "web/tests/*.test.mjs"               -> tests 79, pass 79, fail 0
$ python harness/verify.py --quick                 -> VERDE — 0 FAIL, 0 WARN   (@ ecc5095)
```
Rojo antes reproducido: con `harness/checks.py` de `b69f873` y los tests de HEAD, `TestCostoHandback` da `Ran 12 tests … FAILED (failures=6)`: los 5 del handback más el de versión mayor.

## 5. Mutantes (`-k TestCostoHandback`, timeout 300 s, ninguno colgó)
| Mutante | Resultado |
|---|---|
| M1–M14 del implementer (re-aplicados) | 14/14 muertos |
| R1 minor de un dígito en `BRANCH_VERSION_RE` | muerto (5) |
| R4 `rows > 1` | muerto |
| R5 solo `pending` se saltea | muerto |
| R9 mensaje sin «sección Costo» | muerto (6) |
| R10 corte en `(0, 38)` | muerto (4) |
| R2 sin `\b` en el título (`Costos` cuenta) | sobrevive: inocuo, saca un falso aviso |
| R3 una fila cuenta si *cualquier* celda es real | sobrevive: lo cubre el pedido 1 |
| R6 sin `Repo.slug` en la ruta | sobrevive: hoy ninguna rama con `/` tiene versión. Pasa a importar con el pedido 2 |
| R7 título solo `## Costo` exacto | sobrevive: inocuo (falso aviso con `###`) |
| R8 `header_seen` no se resetea | sobrevive: solo importa con dos secciones «Costo» (exótico) |

## Pedidos
1. **Que la fila sin completar avise.** En la plantilla de `prompts/handback.md`, poné en las celdas que completa el leader (modelo, tokens, USD, duración) placeholders `<…>` en vez de `n/d`. Por ejemplo: `| implementer | <modelo> | 1 | <tokens> | <USD> | <duración> |`. En `_tiene_costo`, una fila cuenta solo si **ninguna** celda es `<placeholder>` (hoy mira solo la primera). Así el `n/d` pasa a ser una decisión explícita del leader («la herramienta no lo da») y la fila sin tocar dispara el WARN. Agregá un test con la fila literal de la plantilla (debe avisar) y otro con una fila con `n/d` puesta por el leader (no avisa). Con eso muere R3.
2. **Que el check sirva en proyectos sin ramas versionadas** (`main`, que es el default de `task-card.md`, o `card/E-10`). Si la rama no tiene prefijo `vX.Y`:
   - si el handback **tiene** una sección «Costo» (lo escribió alguien que ya usa la plantilla v0.37), aplicá el chequeo de tabla vacía o sin completar;
   - si **no** la tiene, silencio, como ahora (un handback viejo no avisa y no hay que inventarle datos).

   El corte por versión queda solo para el caso «falta la sección» en ramas versionadas. Documentalo en el comentario de `COSTO_DESDE` y en la nota de `prompts/handback.md`. Tests: `main` y `card/E-10` (con `/`: así muere R6) con la sección y la fila sin completar → WARN; los mismos sin la sección → nada. No hace falta tocar `config.py`.
3. **El modelo lo confirma el leader.** El comentario de la plantilla dice «El agente completa rol, modelo y vuelta», pero el agente no conoce su modelo con certeza: el implementer de P-2 anotó «opus 5.5» y se lo había despachado con sonnet. En `prompts/handback.md` el agente completa rol y vuelta, y el modelo queda `<modelo>` o como lo cree, pero no vale como dato. En `agents/leader.md` paso 5: «el modelo es el que usaste al despachar (tier de la tarjeta); corregí el que anotó el agente».
4. **Tokens cuando la herramienta da solo el total.** Cambiá el encabezado `Tokens (entrada/salida)` por `Tokens` y agregá la regla: «entrada/salida si la herramienta los separa; si da un total, el total con `(total)`». El texto del leader en `324d1a4` («102 526 (total, sin desglose)») ya es ese formato. El cambio va en la plantilla de `handback.md`, en la tabla de `teams.md` §8 y en las líneas `Costo:`/`Cost:` de `loop-prompt.md` y del master §7 ES/EN (por ejemplo, `tokens (entrada/salida o total)`). Los compactos no hace falta tocarlos.

## Notas (no piden otra vuelta)
- En `handback_P-2.md` (commit del leader), el comentario `<!-- … -->` va entre el separador y la fila. En GFM un bloque HTML corta la tabla, así que la fila se ve como párrafo. El check la cuenta igual. Conviene que el comentario vaya antes de la tabla, como en `handback_P-1.md`.
- `## Costos`, `## Cost` (no hay plantilla EN de handback) y `###` vs `##` dan como mucho un falso WARN. Los bloques de código y las mayúsculas/`release/` en la rama son exóticos.
- La tabla de `metrics.md` vive en `teams.md` (capa enterprise), pero `leader.md` la aplica a todo proyecto. Alcanza porque está enlazada. Si un día hay plantilla de `metrics.md`, que se mude ahí.
- `tool_uses` no tiene columna. Está bien: la tarjeta no la pide.
