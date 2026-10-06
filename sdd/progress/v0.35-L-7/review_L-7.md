# Review L-7 @ 2840dd0
**Veredicto:** APPROVED

Vuelta 2. Diff revisado: `git diff e1d2aa1..2840dd0` (la vuelta 2 del implementer, sobre mi review de `3f29cc3`), más el total `55f953c..2840dd0`. Los cuatro cambios requeridos y las dos mejoras están resueltos. M7, M9, M10, la quita de `resolve()` y la quita de la validación léxica mueren. Repetí todas las sondas y ninguna da traceback ni lee fuera del repo, junction incluida.

## Verificación re-ejecutada
```text
$ python -m unittest discover -s harness/tests -v      # @ 2840dd0, tail
Ran 178 tests in 81.489s
OK (skipped=1)                                       # el skip es el POSIX de siempre; test_enlace_que_sale_del_repo_no_carga corre (ok), no se skipea

$ python harness/tests/test_checks.py -v
Ran 62 tests in 34.165s
OK

$ python harness/verify.py --changed
verify.py --changed @ 2840dd0 (rama v0.35-L-7)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN                                # ajeno a L-7: la base 55f953c tampoco tiene config (lo resuelve L-6)
```

## Lo pedido en la vuelta anterior
| # | Pedido | Estado |
|---|---|---|
| 1 | test del hook con master LITE configurado (M7) | `test_hooks.test_modo_lite_se_lee_del_master_configurado`: pide `sdd/sdd-lite.md` y que no aparezca `progress/main/current.md`. M7 muere |
| 2 | test de `verify.py --e2e` (M10) | `test_verify.test_e2e_con_master_lite_configurado_se_registra_en_sdd_e2e`: registra en `sdd/e2e.md` y no crea `sdd/progress/e2e.md`. M10 muere |
| 3 | test de `check_e2e_registered` (M9) | `test_checks.test_e2e_registrado_en_sdd_e2e_con_master_lite_no_avisa`. M9 muere |
| 4 | M7/M9/M10 en la tabla del handback | están, junto con M11 y M12 |
| mejora | mensaje para `master` no string | `_validate_master` corre antes del chequeo genérico de `STR_KEYS`: con `5`, `true`, `1.5`, `{}` o `["a"]` el mensaje es «'master' tiene que ser una ruta (texto)», sin «comando». Lo cubre `test_master_no_string_habla_de_una_ruta` |
| mejora | contención por `resolve()` | `_validate_master_real` (`config.py`) compara `(root / master).resolve()` con `root.resolve()`, y `ValueError`/`OSError` se convierten en `ConfigError`. Lo cubre `test_enlace_que_sale_del_repo_no_carga`, con un junction en Windows y un symlink en POSIX; si el sistema no deja crear el enlace, se skipea con motivo. Acá corrió (ok) |

`harness/verify.py` ya está en la zona de la tarjeta (`4b7519d` en el loop, por el leader). La excepción de la vuelta 1 queda cerrada.

## Sondas (directorio temporal; `HarnessConfig.load` + `sdd_mode`, y de punta a punta con `verify.py --quick --root` y `claude.main("session-start")`)
| `master` | Resultado |
|---|---|
| `C:\x`, `C:x`, `/etc/x`, `\\server\share\x`, `//server/share/x`, absoluta real hacia afuera | rechazada al cargar (`[FAIL]` limpio, exit 1) |
| `..\..\x`, `sdd/../../x`, `sdd\..\..\x`, `..`, `x/../..` | rechazada con el mensaje léxico |
| `link/SDD-MASTER.md`, con `link` = junction (`mklink /J`) hacia afuera | **rechazada**: «resuelve fuera del repo (¿un enlace a otra carpeta?)» |
| raíz del repo alcanzada por un junction; master dentro de un junction que apunta dentro del repo | cargan (sin falsos positivos) |
| `./SDD-MASTER.md`, `.\SDD-MASTER.md`, `sdd\..\SDD-MASTER.md`, `sdd/./../SDD-MASTER.md`, `SDD-MASTER.md/` | cargan; modo LITE leído del master de la raíz |
| `""`, `"   "`, `null`, `5`, `true`, `1.5`, `{}`, `["a"]` | rechazadas con «tiene que ser una ruta (texto)» |
| `"a\x00b"`, `"."`, `"sdd"`, `"x/.."`, `"~/x"` | cargan; `is_file()` False → `[FAIL] Falta …`; sin traceback |
| sin la clave, master en `sdd/` | VERDE; el hook nombra `sdd/SDD-MASTER.md` |
| sin la clave, master solo en la raíz | `[FAIL] Falta sdd/SDD-MASTER.md` y modo FULL: igual que antes |
| `"SDD-MASTER.md"` con LITE en la raíz | VERDE; el hook dice `Leé SDD-MASTER.md` y usa `sdd/sdd-lite.md` |
| `"nucleo/M.md"` inexistente | `[FAIL] Falta nucleo/M.md` |
| config inválida en el hook | cae al default, exit 0, sin traceback |

## Mutantes (copia del paquete entero con `git archive HEAD`, suite completa, timeout de 400 s por corrida; el control sin mutar da OK, 178 tests)
| Mutante | Resultado | Lo mata |
|---|---|---|
| M7 `hooks/claude.py`: `sdd_mode(root)` | MUERTO | test_modo_lite_se_lee_del_master_configurado |
| M9 `checks.py`: `e2e_record(self.root)` | MUERTO | test_e2e_registrado_en_sdd_e2e_con_master_lite_no_avisa |
| M10 `verify.py`: `e2e_record(self.root)` | MUERTO | test_e2e_con_master_lite_configurado_se_registra_en_sdd_e2e |
| M11 sacar la llamada a `_validate_master_real` (`resolve()`) | MUERTO | test_enlace_que_sale_del_repo_no_carga |
| M12 sacar la llamada a `_validate_master` en `_validate` | MUERTO | test_master_no_string_habla_de_una_ruta, test_punto_punto_que_sale_da_el_mensaje_lexico, test_ruta_invalida_no_carga (`''`, `None`) |

M1–M6 y M8 mueren desde la vuelta 1 y el código que cubren no cambió.

## Checkpoints
- C1: [x] `verify.py --quick` da ROJO solo por la falta de `harness.config.json`, que ya pasaba en la base y es de L-6. No hay rutas nuevas que falten.
- C2: [x] los seis criterios tienen evidencia y el rojo está medido contra la base. Todo lo tocado está en la zona, ahora con `verify.py` incluido.
- C3: [x] sigue el patrón de `ConfigError` al cargar, como las otras claves, sin duplicar lógica.
- C4: [x] re-ejecuté la suite, `test_checks.py` y `verify.py`. Cada llamador nuevo tiene su test (camino feliz y error), no hay skips nuevos (el del enlace corrió) y no se debilitó nada.
- C5: [x] el handback está actualizado y commiteado, `current.md` está al día y no hay archivos throwaway ni prints.

## Cambios requeridos
Ninguno.

## Mejoras sugeridas (no bloquean)
- `test_enlace_que_sale_del_repo_no_carga`: en POSIX el symlink no se borra en el cleanup del test y queda a cargo del borrado del proyecto temporal. Es inocuo (`rmtree` no sigue symlinks), pero el `addCleanup` solo cubre el junction de Windows.

## Mejoras al arnés detectadas
- Cuando una tarjeta agrega un parámetro con default (`master=DEFAULT_MASTER`), cada llamador que lo pasa es un mutante candidato («volver al default»). La plantilla de la tarjeta podría pedir un mutante por llamador, no solo por función: fue lo que dejó vivos a M7, M9 y M10 en la vuelta 1.
