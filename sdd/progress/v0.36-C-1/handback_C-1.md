# Handback C-1 — La web cuenta 42 escenarios y conoce el playbook obsidian-cerebro

- **Estado:** done
- **Rama / commit:** `v0.36-C-1` @ `HASH_FINAL` (base `d61f084`)
- **Quién:** implementer (MEDIO)

## Hecho
- `web/catalogo.js`: «40 situaciones» -> «42»; card «Playbook: Obsidian y Cerebro»; entrada `obsidian-cerebro` en `PB_META`.
- `web/index.html`: checkbox `obsidian-cerebro` en el combinador (viaja en el ZIP vía `PB_META`).
- `web/manuales.js`: fila «Obsidian y Cerebro» en Manuales.
- `?v=35` -> `?v=36` en admin/demo/guia/index y en `sdd-universal-tablero.html`; `rutas.test.mjs` actualizado a 36.
- Test `combinador.test.mjs` («playbooks nuevos…») ahora incluye `obsidian-cerebro`.

## No hecho / pendiente
- Nada. README y tablero no tenían «40 situaciones/escenarios».

## Cómo
- Se siguió el patrón de `go-live` en cada lugar donde la web lista playbooks. No hay tests que cuenten playbooks.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| web/catalogo.js | 42, card y PB_META |
| web/index.html | checkbox + ?v=36 |
| web/manuales.js | fila Manuales |
| web/admin.html, web/demo.html, web/guia.html | ?v=36 |
| sdd-universal-tablero.html | ?v=36 |
| web/tests/combinador.test.mjs | test con obsidian-cerebro |
| web/tests/rutas.test.mjs | ?v=36 |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1 | `node --test "web/tests/*.test.mjs"` -> pass 49, fail 0 (N3 verde) |
| 2 | `grep -rnE "40 (situaciones\|escenarios)" web README.md sdd-universal-tablero.html` -> sin resultados |
| 3 | test «playbooks nuevos: ia-en-el-producto, go-live y obsidian-cerebro…» |
| 4 | smoke PASS (abajo) |
| 5 | ?v=36 |

Rojo antes (R29), base `d61f084`:
```text
$ git rev-parse --short HEAD
d61f084
$ node --test "web/tests/*.test.mjs"
✖ N3: los conteos del README y de la web coinciden con los archivos
    actual: 40, expected: 42
✖ playbooks nuevos: ia-en-el-producto y go-live en el catálogo, Manuales y el ZIP
  AssertionError: falta PB_META['obsidian-cerebro']
ℹ pass 47
ℹ fail 2
```

Verde después:
```text
$ node --test "web/tests/*.test.mjs"
ℹ pass 49
ℹ fail 0
$ node web/tests/smoke/smoke.mjs   (tail)
PASS smoke: 22 pasos, 0 errores de consola
$ python harness/verify.py --changed   (tail -3)
[OK]    test_quick — ... (104.8s): Ran 178 tests in 103.976s · OK (skipped=1)
VERDE — 0 FAIL, 0 WARN
```
(Tras el verify subí también el ?v= del tablero y reconfirmé pass 49 / fail 0.) Sin tabla de mutantes: no hay lógica nueva, solo datos.

## Fuera de zona / riesgos
- Ninguno.

## Cambios de spec sugeridos
- Ninguno.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Review de C-1.
