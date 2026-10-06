# Review L-7 @ 3f29cc3
**Veredicto:** CHANGES_REQUESTED

Vuelta 1. Diff revisado: `git diff 55f953c..3f29cc3`. La validación de `master` es correcta: ninguna sonda da traceback y ninguna ruta lexicamente fuera del repo carga. Los cinco mutantes de la tarjeta mueren. El problema está en otro lado: el cambio usa el master configurado en **cuatro** lugares para decidir el modo LITE/FULL, y solo uno tiene test. Tres mutantes que revierten código nuevo de este diff sobreviven, entre ellos la línea de `verify.py`, que es justamente la que el handback justifica como imprescindible.

## Verificación re-ejecutada
```text
$ python -m unittest discover -s harness/tests -v      # @ 3f29cc3, tail
Ran 172 tests in 73.713s
OK (skipped=1)                                       # el skip es el POSIX de siempre

$ python harness/tests/test_checks.py
Ran 58 tests in 28.842s
OK

$ python harness/verify.py --changed
verify.py --changed @ 3f29cc3 (rama v0.35-L-7)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN                                # ajeno a L-7: la base 55f953c tampoco tiene config (es L-6, fuera de zona)
```

## Sondas (directorio temporal, `HarnessConfig.load` + `sdd_mode`, y de punta a punta con `verify.py --quick --root` y `claude.main("session-start")`)
| `master` | Resultado |
|---|---|
| `C:\x`, `C:x`, `/etc/x`, `\\server\share\x`, `//server/share/x`, ruta absoluta real a un archivo fuera | rechazada al cargar (ConfigError → `[FAIL]` limpio) |
| `..\..\x`, `sdd/../../x`, `sdd\..\..\x`, `..`, `x/../..` | rechazada |
| `./SDD-MASTER.md`, `.\SDD-MASTER.md`, `sdd\..\SDD-MASTER.md`, `sdd/./../SDD-MASTER.md`, `SDD-MASTER.md/` | carga, lee el master de la raíz, modo LITE correcto |
| `""`, `"   "`, `null`, `5`, `true`, `1.5`, `{}`, `["a"]` | rechazada |
| `"a\x00b"`, `"."`, `"sdd"`, `"x/.."`, `"~/x"` | carga; `is_file()` da False → `[FAIL] Falta …`; sin traceback |
| `link/SDD-MASTER.md` con `link` = junction (`mklink /J`) a un directorio fuera del repo | **carga y lee el archivo de afuera** (modo LITE tomado de fuera). Ver Mejoras: no bloquea |
| sin la clave, master en `sdd/` | VERDE, el hook nombra `sdd/SDD-MASTER.md` (como antes) |
| sin la clave, master solo en la raíz | `[FAIL] Falta sdd/SDD-MASTER.md` y modo FULL (no lee la raíz): igual que antes |
| `"SDD-MASTER.md"` con LITE en la raíz | VERDE; el hook dice `Leé SDD-MASTER.md` y usa `sdd/sdd-lite.md` como memoria |
| `"nucleo/M.md"` inexistente | `[FAIL] Falta nucleo/M.md` (nombra la ruta configurada) |
| inválida (abs, `..`, null, número) en el hook | el hook cae al default `sdd/SDD-MASTER.md`, exit 0, sin traceback ni lectura fuera |

## Mutantes (copia temporal del paquete entero con `git archive HEAD`, suite completa, timeout de 400 s por corrida; el control sin mutar da OK)
| Mutante | Resultado | Lo mata |
|---|---|---|
| M1 sacar `master` de `STR_KEYS`/`KNOWN_KEYS` | MUERTO | test_master_es_clave_conocida, test_master_en_raiz_da_ok, … |
| M2 ruta fija en `check_required` | MUERTO | test_master_en_raiz_da_ok, test_master_inexistente_nombra_la_ruta_configurada |
| M3 `sdd_mode` ignora `master` (ruta fija de `MODE_SOURCES`) | MUERTO | test_modo_se_lee_del_master_configurado |
| M4 sin la contención de `..` | MUERTO | test_ruta_invalida_no_carga (`../fuera/M.md`, `sdd/../../M.md`) |
| M5 sin el chequeo de absolutas | MUERTO | test_ruta_invalida_no_carga (`/etc/master.md`, `C:\x\master.md`) |
| M6 mensaje del hook fijo | MUERTO | test_nombra_el_master_configurado |
| M8 `HarnessChecks.mode = sdd_mode(root)` | MUERTO | test_modo_se_lee_del_master_configurado |
| **M7** `hooks/claude.py:55` → `sdd_mode(root)` (el hook ignora el master para LITE) | **VIVO** | — |
| **M9** `checks.py:401` → `e2e_record(self.root)` | **VIVO** | — |
| **M10** `verify.py:105` → `e2e_record(self.root)` (revertir la línea fuera de zona) | **VIVO** | — |

## Fuera de zona: `harness/verify.py`
Era imprescindible: sin esa línea, `verify.py --e2e` anota el verde en `sdd/progress/e2e.md` mientras `check_e2e_registered` (con el modo del master configurado) lo busca en `sdd/e2e.md`, y un proyecto LITE con el master en la raíz quedaría con un WARN permanente. Es una línea y el handback la declara («Fuera de zona / riesgos»). La acepto. Por la letra de la tarjeta («si algo exige salir de la zona: `blocked`») correspondía pararse; queda para que el leader lo confirme. Pero una excepción a la zona que se justifica por un comportamiento tiene que traer el test de ese comportamiento, y no lo trae (M10 vivo).

## Checkpoints
- C1: [x] `verify.py --quick` da ROJO solo por la falta de `harness.config.json`, que ya pasaba en la base y está fuera de zona (L-6). No hay rutas nuevas que falten.
- C2: [x] cada criterio tiene evidencia y el rojo está medido contra `55f953c`. La excepción de `verify.py` está declarada y justificada (ver arriba).
- C3: [x] sigue el patrón de validación de las otras claves (`ConfigError` al cargar) y no duplica lógica.
- C4: [ ] ← los tests nuevos no cubren todo el cambio: M7, M9 y M10 sobreviven. El criterio 2 («el modo se lee de ese archivo») se implementó en cuatro llamadores y solo `HarnessChecks.mode` tiene test.
- C5: [x] el handback está completo y commiteado, `current.md` está al día y no hay archivos throwaway.

## Cambios requeridos
1. `harness/hooks/claude.py:55`: falta un test (R29: verlo rojo con M7) en `test_hooks.py`. Con `"master": "SDD-MASTER.md"` y un master LITE en la raíz, `session-start` tiene que usar `sdd/sdd-lite.md` como memoria, por ejemplo con `assertIn("sdd/sdd-lite.md", out)`, y no `sdd/progress/<rama>/current.md`.
2. `harness/verify.py:105`: falta un test en `test_verify.py` que mate a M10. Con master LITE en la raíz configurado y `e2e` verde, `verify.py --quick --e2e` tiene que registrar en `sdd/e2e.md`, no en `sdd/progress/e2e.md`.
3. `harness/checks.py:401`: falta un test en `test_checks.py` (`TestE2E` o `TestMasterConfigurable`) que mate a M9. Con master LITE en la raíz configurado, `e2e` declarado y una corrida anotada en `sdd/e2e.md`, no hay WARN de «sin ninguna corrida verde».
4. En el handback, sumar M7, M9 y M10 a la tabla de mutantes, con el hash del rojo.

## Mejoras sugeridas (no bloquean)
- `config.py` `_validate`: para `master` no string (int, bool, lista), el mensaje dice «'master' tiene que ser un texto (un comando)». Lo de «un comando» confunde para una ruta. Se puede dejar que `_validate_master` responda primero o ajustar el texto por clave.
- Junction/symlink: la contención es léxica, y alcanza para lo que dicen la fila de `harness.md` §2 y el criterio 4 (absoluta, `..`, no string). Si `sdd/` o cualquier directorio del repo es un enlace hacia afuera, el arnés ya leía de afuera antes de L-7 con el default, así que no es una regresión. Si se quiere cerrar, se puede comparar `(root / master).resolve()` con `root.resolve()` en `check_required` y en `sdd_mode`.

## Mejoras al arnés detectadas
- Cuando una tarjeta agrega un parámetro con default (`master=DEFAULT_MASTER`), cada llamador que lo pasa es un mutante candidato («volver al default»). La plantilla de la tarjeta podría pedir un mutante por llamador, no solo por función.
