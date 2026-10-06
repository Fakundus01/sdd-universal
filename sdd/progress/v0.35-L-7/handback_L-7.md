# Handback L-7 — Clave `master` en harness.config.json

- **Estado:** done
- **Rama / commit:** `v0.35-L-7` @ vuelta 2: ver `git log` de la rama (el hash del commit de la vuelta va en el apéndice; vuelta 1 = `3e74080`) (base `55f953c`)
- **Quién:** implementer (MEDIO)

## Hecho
- `config.py`: `master` en `STR_KEYS`/`KNOWN_KEYS`, campo `HarnessConfig.master` (default `sdd/SDD-MASTER.md`, constante `DEFAULT_MASTER`), validación `_validate_master` (no string/vacío, absoluta, unidad de disco o `..` que salga de la raíz -> `ConfigError`), `sdd_mode(root, master)` y `e2e_record(root, master)` leen el master configurado.
- `checks.py`: `check_required` y el modo usan `config.master`; el FAIL nombra la ruta configurada.
- `hooks/claude.py`: el mensaje de SessionStart y el modo usan el master configurado.
- Vuelta 2: tests de M7/M9/M10; `_validate_master` responde primero (mensaje de ruta, no de comando); contención también por `resolve()` contra la raíz (`_validate_master_real`, solo si la clave `master` está presente, para no cambiar el default).
- `verify.py` (el leader aceptó que entre a la zona; necesario para pasar `master` a `e2e_record`; ver fuera de zona).
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
| harness/config.py | clave, validación léxica y por `resolve()`, parámetros de modo/e2e |
| harness/checks.py | check_required y modo con config.master |
| harness/hooks/claude.py | mensaje y modo con el master configurado |
| harness/verify.py | `e2e_record(root, config.master)` (una línea; el leader aceptó que entre a la zona) |
| harness/README.md | chequeo del master |
| harness/tests/test_checks.py | clase `TestMasterConfigurable` (12 tests) |
| harness/tests/test_hooks.py | 3 tests de SessionStart |
| harness/tests/test_verify.py | 1 test: e2e se registra en `sdd/e2e.md` con master LITE |

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

Rojo de la vuelta 2 (tests nuevos copiados sobre la base `55f953c`, suite de checks/hooks/verify):
```text
BASE 55f953c rc=1
FAIL: test_e2e_registrado_en_sdd_e2e_con_master_lite_no_avisa
FAIL: test_enlace_que_sale_del_repo_no_carga
FAIL: test_master_no_string_habla_de_una_ruta
FAIL: test_modo_lite_se_lee_del_master_configurado
FAIL: test_e2e_con_master_lite_configurado_se_registra_en_sdd_e2e
```

Verde después (vuelta 2):
```text
$ python -m unittest discover -s harness/tests
Ran 178 tests in 75.722s
OK (skipped=1)
$ python harness/tests/test_checks.py
Ran 62 tests in 29.210s
OK
```
`verify.py --changed` da ROJO solo por la falta de `harness.config.json` en la raíz del paquete (igual que en la base; es L-6).
El test de enlace usa `mklink /J` (Windows) o `os.symlink`; si el sistema no lo permite se saltea con motivo explícito. En esta máquina corrió (no se salteó).

Mutantes (suites checks + hooks + verify):
| Mutante | Resultado | Test que lo mata |
|---|---|---|
| M1 sacar `master` de `KNOWN_KEYS` | MUERTO | test_master_es_clave_conocida, test_master_en_raiz_da_ok |
| M2 ruta fija en `check_required` | MUERTO | test_master_en_raiz_da_ok, test_master_inexistente_nombra_la_ruta_configurada |
| M3 ruta fija en `MODE_SOURCES` | MUERTO | test_modo_se_lee_del_master_configurado |
| M4 sacar la contención léxica de `..` | MUERTO | test_punto_punto_que_sale_da_el_mensaje_lexico (solo ese: `resolve()` también atrapa `..`, por eso el test mira el mensaje) |
| M6 mensaje del hook fijo | MUERTO | test_nombra_el_master_configurado |
| M7 `hooks/claude.py`: `sdd_mode(root)` | MUERTO | test_modo_lite_se_lee_del_master_configurado |
| M8 `checks.py` `mode = sdd_mode(root)` | MUERTO | test_modo_se_lee_del_master_configurado |
| M9 `checks.py:401` `e2e_record(self.root)` | MUERTO | test_e2e_registrado_en_sdd_e2e_con_master_lite_no_avisa |
| M10 `verify.py:105` `e2e_record(self.root)` | MUERTO | test_e2e_con_master_lite_configurado_se_registra_en_sdd_e2e |
| M11 sacar la contención por `resolve()` | MUERTO | test_enlace_que_sale_del_repo_no_carga |
| M12 mensaje genérico de STR_KEYS para `master` no string | equivalente | `_validate_master` corre primero; quité la guarda redundante y agregué test_master_no_string_habla_de_una_ruta (rojo en la base) |

## Fuera de zona / riesgos
- `harness/verify.py` no está en la zona de la tarjeta; tuve que tocar una línea para pasar `master` a `e2e_record` (sin eso, el registro del e2e ignoraba el modo del master configurado). Cambio mínimo, leader: confirmá o revertí.
- El paquete aún no tiene `harness.config.json` (L-6).

## Cambios de spec sugeridos
- ninguno (`harness.md` §2 ya tiene la fila).

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- L-6: `harness.config.json` del paquete con `"master": "SDD-MASTER.md"`.

- Vuelta 2 (hash en `git log`, commit «L-7 vuelta 2»): review pidió tests de M7, M9, M10 (agregados, vistos en rojo contra la base y matando cada mutante) y la tabla al día; mejoras hechas: mensaje de `master` no string habla de una ruta; contención por `resolve()` con test de junction/symlink. `verify.py` dentro de zona por decisión del leader.
