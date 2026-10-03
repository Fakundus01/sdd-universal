# Review harness @ 11ba31a (vuelta 3)
**Veredicto:** CHANGES_REQUESTED

Alcance: `git diff --cached -- harness/ .github/` en `feat/relay-harness-import`. `git status --short` muestra los 20 archivos como `A ` y ninguno como `AM`. Probé los archivos del índice extraídos con `git checkout-index` a `scratchpad/v3 con espacios/` y `scratchpad/nogit3/`, nunca dentro del repo. Borré el `__pycache__` que dejó `unittest`.

R1 y R2 de la vuelta 2 están arreglados en los casos que pedí, y también las 5 sugerencias que tomaron. Pero el arreglo de R1 se puede saltear: si `{file}` queda dentro de un string entre comillas más grande, la regex no lo detecta y la inyección vuelve en macOS/Linux. Ver el cambio requerido.

## Verificación re-ejecutada

```text
$ python -m unittest discover -s harness/tests
Ran 90 tests in 30.461s

OK
$ py -3.11 -m unittest discover -s harness/tests
Ran 90 tests in 27.653s

OK
```

La reproducción original (Windows), con el índice actual:

```text
$ python harness/verify.py --changed
verify.py --changed @ 4a804a3 (rama main)

── Arnés ──
[OK]    Creado sdd/progress/main/current.md desde la plantilla
[OK]    Rutas citadas existen (0 revisadas)

── Lint de lo cambiado ──
[OK]    lint src/$(touch PWNED).py — `python -c "import sys,os; print(ascii(sys.argv[1]), os.path.isfile(sys.argv[1]))" "src/$(touch PWNED).py"` (0.0s): 'src/$(touch PWNED).py' True
[OK]    lint src/canción.py — `python -c "import sys,os; print(ascii(sys.argv[1]), os.path.isfile(sys.argv[1]))" "src/canción.py"` (0.0s): 'src/canci\xf3n.py' True

── Tests de lo cambiado ──
[OK]    test_quick — `python -c "print(7)"` (0.0s): 7

VERDE — 0 FAIL, 0 WARN
rc=0
ls: cannot access 'PWNED': No such file or directory
```

No se crea `harness/__pycache__` (0 entradas).

R1 en POSIX: armé el comando con `HarnessConfig.load` + `lint_cmd` forzando `quote_path(..., windows=False)` y lo ejecuté con `sh -c`:

```text
ConfigError: npx eslint "{file}" -> harness.config.json: 'lint_file': no pongas comillas alrededor de {fil
ConfigError: npx eslint '{files}' -> harness.config.json: 'lint_file': no pongas comillas alrededor de {fil
ACEPTADA: python -c "import sys; print(ascii(sys.argv[1:]))" "--x='src/$(touch PWNED).py'" -> ["--x='src/.py'"] | PWNED existe: True
ACEPTADA: sh -c "python -c 'import sys; print(sys.argv[1:])' 'src/$(touch PWNED).py'" -> ['src/.py'] | PWNED existe: True
```

Las sugerencias tomadas, verificadas:

```text
'**Veredicto:** ✅ APPROVED.' -> APPROVED
'**Veredicto:** APPROVED | CHANGES_REQUESTED' -> SIN_ELEGIR
'**Veredicto:** CHANGES_REQUESTED\n**Veredicto:** APPROVED\n- Veredicto final: ver arriba' -> APPROVED
decode(cp1252) -> canción · decode(utf-8) -> canción · shown_args(['--quick','--root=C:/x','--root','y','--e2e']) -> ['--quick', '--e2e']
== sin git --changed
[WARN]  sin git no se puede saber qué cambió: se corren los tests igual
[OK]    test_quick — `python -c "print(8)"` (0.0s): 8
```

El test de R32 está: `test_bordes.py:100-103` (`TestR32`). En el índice, `harness/README.md:3` dice «probado en Windows con 3.11 y 3.14; el workflow … corre…» y `:27` documenta lo de las comillas.

## Checkpoints
- C1: [x] 90/90 en 3.14 y 3.11, y `--changed` en verde en el proyecto temporal.
- C2: [ ] El bug de inyección sigue abierto con plantillas donde `{file}` queda dentro de un string entre comillas más grande (abajo).
- C3: [x] Sigue usando solo la stdlib. `quote_path(windows=None)` se resuelve al llamar, y eso hace que POSIX se pueda testear.
- C4: [x] Re-ejecuté todo. Hay tests nuevos (`TestConfigHostil`, `TestR32`) y nada está skipeado.
- C5: [x] Sin `AM`. El README está staged con la versión correcta.

## Cambios requeridos

1. **[MEDIA · seguridad] `harness/config.py:20,81`: `QUOTED_PLACEHOLDER_RE` solo detecta comillas *pegadas* al placeholder.** Si `{file}` queda dentro de un string entre comillas más grande, la config se acepta y `$(…)` se ejecuta en POSIX. Pasa con `--stdin-filename="{file}"`, `"--x={file}"` o con el patrón muy común para encadenar dos linters, `sh -c "eslint {file} && prettier --check {file}"`. Salida literal arriba (`PWNED existe: True` en los dos casos ACEPTADA). En Windows la misma plantilla arma `"--x="src/a b.py""` y los espacios se rompen. Lo que se espera: en `_validate`, recorrer `lint_file` llevando el estado de comillas (`"`/`'`, respetando `\"` adentro de las dobles) y lanzar `ConfigError` si algún `{file}` o `{files}` aparece mientras hay una comilla abierta. Agregar a `TestConfigHostil` los dos casos de arriba, con su rojo medido.

## Sugerencias (no bloquean)
- `checks.py:21,39`: `**Veredicto:** NOT APPROVED` cuenta como `APPROVED` (por `\b`). El formato de `agents/reviewer.md` no admite ese texto, así que es un caso artificial. Igual se arregla si el valor tiene que ser exactamente el token, ignorando emojis y puntuación de los bordes.
- Deuda declarada y aceptada: cuando vence el timeout en Windows, el proceso nieto no se mata.
- El workflow `.github/workflows/harness.yml` sigue sin correr. Cuando haya push, conviene pegar el resultado de la matriz como evidencia de la portabilidad a macOS/Linux/3.10, que en esta máquina no pude probar.

## Mejoras al arnés detectadas
- Los tests de seguridad de `lint_file` tendrían que generar las plantillas con todas las formas de comillas, no solo las que alguien pensó: el placeholder suelto, pegado a comillas, dentro de un argumento entre comillas y dentro de `sh -c "…"`. En cada caso, o la config se rechaza o el centinela no aparece. Esa propiedad habría atrapado este bypass sin depender de enumerar casos a mano.
