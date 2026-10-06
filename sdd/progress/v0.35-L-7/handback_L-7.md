# Handback L-7 — Clave `master` en harness.config.json

- **Estado:** done
- **Rama / commit:** `v0.35-L-7` @ `a6e050c (el handback va en este mismo commit; hash = el del commit que lo contiene, ver git log)` (base `55f953c`)
- **Quién:** implementer (MEDIO)

## Hecho
- `config.py`: `master` en `STR_KEYS`/`KNOWN_KEYS`, campo `HarnessConfig.master` (default `sdd/SDD-MASTER.md`, constante `DEFAULT_MASTER`), validación `_validate_master` (no string/vacío, absoluta, unidad de disco o `..` que salga de la raíz -> `ConfigError`), `sdd_mode(root, master)` y `e2e_record(root, master)` leen el master configurado.
- `checks.py`: `check_required` y el modo usan `config.master`; el FAIL nombra la ruta configurada.
- `hooks/claude.py`: el mensaje de SessionStart y el modo usan el master configurado.
- `verify.py` (necesario para pasar `master` a `e2e_record`; ver fuera de zona).
- `harness/README.md`: la línea del chequeo nombra la clave `master`.

## No hecho / pendiente
- `harness.config.json` del paquete con `"master": "SDD-MASTER.md"` (fuera de zona; es de L-6).

## Cómo
- Parámetro `master` con default en `sdd_mode`/`e2e_record`: los llamadores sin config siguen igual.
- Contención con `posixpath.normpath` sobre la ruta con `\` pasado a `/`, más chequeo explícito de `/`, `\` y `X:`. `sdd/../SDD-MASTER.md` (que no sale) es válida.
- `master: null` se rechaza (el criterio 4 pide string).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| harness/config.py | clave, validación, parámetros de modo/e2e |
| harness/checks.py | check_required y modo con config.master |
| harness/hooks/claude.py | mensaje y modo con el master configurado |
| harness/verify.py | `e2e_record(root, config.master)` (una línea) |
| harness/README.md | chequeo del master |
| harness/tests/test_checks.py | clase `TestMasterConfigurable` (7 tests) |
| harness/tests/test_hooks.py | 2 tests de SessionStart |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1 | suite existente intacta y verde; `test_default_es_el_de_siempre` |
| 2 | `test_master_en_raiz_da_ok`, `test_modo_se_lee_del_master_configurado` |
| 3 | `test_master_inexistente_nombra_la_ruta_configurada` |
| 4 | `test_ruta_invalida_no_carga` (subTests: absoluta posix y windows, `..`, `sdd/../../`, vacío, int, null, lista), `test_ruta_con_punto_punto_que_no_sale_es_valida` |
| 5 | `test_master_es_clave_conocida`, `test_nombra_el_master_configurado`, `test_sin_master_configurado_nombra_el_de_siempre`; README editado |
| 6 | rojo y mutantes abajo |

Rojo antes (R29), medido contra la base (solo con los tests nuevos escritos):
```text
$ git rev-parse --short HEAD
55f953c
$ python harness/tests/test_checks.py   (líneas FAIL/ERROR/resumen)
ERROR: test_default_es_el_de_siempre (__main__.TestMasterConfigurable.test_default_es_el_de_siempre)
ERROR: test_ruta_con_punto_punto_que_no_sale_es_valida (__main__.TestMasterConfigurable.test_ruta_con_punto_punto_que_no_sale_es_valida)
FAIL: test_master_en_raiz_da_ok (__main__.TestMasterConfigurable.test_master_en_raiz_da_ok)
FAIL: test_master_es_clave_conocida (__main__.TestMasterConfigurable.test_master_es_clave_conocida)
FAIL: test_master_inexistente_nombra_la_ruta_configurada (__main__.TestMasterConfigurable.test_master_inexistente_nombra_la_ruta_configurada)
FAIL: test_modo_se_lee_del_master_configurado (__main__.TestMasterConfigurable.test_modo_se_lee_del_master_configurado)
FAIL: test_ruta_invalida_no_carga (...) (master='/etc/master.md')  [y C:\x\master.md, ../fuera/M.md, sdd/../../M.md, '', 5, None, ['a']]
Ran 58 tests in 28.911s
FAILED (failures=12, errors=2)
$ python -m unittest discover -s harness/tests -p test_hooks.py
FAIL: test_nombra_el_master_configurado (test_hooks.TestSessionStart.test_nombra_el_master_configurado)
Ran 17 tests in 4.030s
FAILED (failures=1)
```

Verde después:
```text
$ python -m unittest discover -s harness/tests
Ran 172 tests in 73.416s
OK (skipped=1)
$ python harness/tests/test_checks.py
Ran 58 tests in 28.151s
OK
$ python harness/verify.py --changed
verify.py --changed @ 55f953c (rama v0.35-L-7)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN
```
(`verify.py --changed` sobre este repo del paquete da ROJO por no tener `harness.config.json` en la raíz: es lo que L-6 resuelve, no un fallo de este cambio; las dos suites son la evidencia.)

Mutantes (cada uno con test_checks + test_hooks):
| Mutante | Resultado | Test que lo mata |
|---|---|---|
| sacar `master` de `KNOWN_KEYS` | MUERTO | test_master_es_clave_conocida, test_master_en_raiz_da_ok |
| ruta fija `sdd/SDD-MASTER.md` en `check_required` | MUERTO | test_master_en_raiz_da_ok, test_master_inexistente_nombra_la_ruta_configurada |
| ruta fija en `MODE_SOURCES` (ignorar `master`) | MUERTO | test_modo_se_lee_del_master_configurado |
| sacar la contención de `..` | MUERTO | test_ruta_invalida_no_carga (`../fuera/M.md`, `sdd/../../M.md`) |
| mensaje del hook fijo | MUERTO | test_nombra_el_master_configurado |

## Fuera de zona / riesgos
- `harness/verify.py` no está en la zona de la tarjeta; tuve que tocar una línea para pasar `master` a `e2e_record` (sin eso, el registro del e2e ignoraba el modo del master configurado). Cambio mínimo, leader: confirmá o revertí.
- El paquete aún no tiene `harness.config.json` (L-6).

## Cambios de spec sugeridos
- ninguno (`harness.md` §2 ya tiene la fila).

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- L-6: `harness.config.json` del paquete con `"master": "SDD-MASTER.md"`.
