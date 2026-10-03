# Review harness @ 11ba31a (vuelta 4)
**Veredicto:** CHANGES_REQUESTED

Alcance: `git diff --cached -- harness/ .github/`, con los 20 archivos como `A ` y ninguno como `AM`. Probé los archivos del índice extraídos con `git checkout-index` a `scratchpad/v4 con espacios/`, nunca dentro del repo. Borré el `__pycache__` que dejó `unittest`.

Pasar a argv sin shell cierra de verdad la inyección de shell. Pero a la pregunta del coordinador («¿queda algún camino para que un nombre de archivo se interprete como código?») la respuesta es **sí: inyección de opciones**. Un archivo cuyo nombre empieza con `-` llega al linter como una opción, y con linters reales eso termina en ejecución de código o en la sobreescritura de un archivo commiteado.

## Verificación re-ejecutada

```text
$ python -m unittest discover -s harness/tests
Ran 93 tests in 31.685s

OK
$ py -3.11 -m unittest discover -s harness/tests
Ran 93 tests in 30.662s

OK
```

### Inyección de opciones (lo que bloquea)

`tools/fakelint.py` es un linter de juguete con la interfaz de eslint: `--config=<archivo>` carga la config (en eslint, `-c x.js` *ejecuta* x.js) y `--output-file=<ruta>` escribe el reporte ahí. La config es `"lint_file": "python tools/fakelint.py {file}"` con `lint_ext: [".py"]`, que pasa `_validate`. Después agregué archivos sin trackear con nombres hostiles:

```text
$ printf 'open("PWNED","w").write("x")\n' > evil.py; : > "--config=evil.py"
$ git status --porcelain
?? --config=evil.py
?? evil.py
$ python harness/verify.py --quick
verify.py --quick @ e9df729 (rama main)

── Arnés ──
[OK]    Creado sdd/progress/main/current.md desde la plantilla
[OK]    Rutas citadas existen (0 revisadas)

── Lint de lo cambiado ──
[OK]    lint --config=evil.py — `C:\Python314\python.EXE tools/fakelint.py --config=evil.py` (0.1s): lint de []
[OK]    lint evil.py — `C:\Python314\python.EXE tools/fakelint.py evil.py` (0.1s): lint de ['evil.py']

VERDE — 0 FAIL, 0 WARN
rc=0
--- PWNED:
PWNED
```

```text
$ mkdir -p -- "--output-file=src"; : > "./--output-file=src/app.py"
$ python harness/verify.py --quick | grep lint
[OK]    lint --output-file=src/app.py — `C:\Python314\python.EXE tools/fakelint.py --output-file=src/app.py` (0.1s): lint de []
--- src/app.py (commiteado, nadie lo tocó):
reporte de lint
 src/app.py | 2 +-
```

Con linters reales, el mismo nombre de archivo hace esto:
- eslint: `--config=evil.js` ejecuta JS, y `--output-file=src/x.js` pisa un archivo.
- pylint: `--load-plugins=evil.py` importa `evil`.
- `sh scripts/lint.sh {file}`, que recomienda el README: el script recibe `$1 = --config=…` y se lo pasa a su linter, así que tiene el mismo problema.

Lo dispara el pre-commit, el hook stop (con cualquier archivo sin trackear) y el post-edit.

### Lo demás está verificado y funciona
- `sh -c "…"`, `python -c "…{file}…"` y `x{file}y` dan ConfigError, y una comilla sin cerrar también (`TestPlantillaSinShell`, `test_bordes.py:84-124`). `"{file}"` es válido y shlex se come las comillas.
- `$(…)`, backticks, `;`, espacios y tildes llegan como un único argumento literal.
- Windows con `.cmd` (`tools/fl.cmd {file}`): `src/a&calc.py` y `src/x(1).py` → `[WARN] lint salteado`. `src/a b.py` → `tools\fl.cmd "src/a b.py"`. `src/ok,1;2=3.py` pasa sin comillas. Para batch, `,`, `;` y `=` son separadores de `%1`, pero no inyectan: los .cmd típicos reenvían con `%*`.
- `{file}` en `-opcion={file}`: si el nombre empieza con `-`, igual queda como el valor de la opción. No es un problema.

## Checkpoints
- C1: [x] 93/93 en 3.14 y 3.11.
- C2: [ ] Un nombre de archivo todavía se interpreta como opción del linter (abajo).
- C3: [x] El diseño sin shell es el correcto. `test`, `lint` y `e2e` siguen con shell, y está justificado: no llevan rutas ajenas.
- C4: [x] Re-ejecuté todo, y hay matriz de nombres hostiles y rojo forzado del check nuevo. A la matriz le falta el caso «nombre que empieza con `-`».
- C5: [x] Sin `AM` y sin `__pycache__`.

## Cambios requeridos

1. **[MEDIA · seguridad] `harness/config.py:114-119` (`lint_cmd`): una ruta que empieza con `-` entra como opción del linter.** Las rutas siempre son relativas a la raíz (salen de `git status` o del `relative_to` del hook), así que la solución universal es prefijar `./` a toda ruta que empiece con `-`. Debería aplicarse siempre, sin depender del SO ni del linter (todos aceptan `./x`). El `--` no sirve como solución general porque no todos los linters lo soportan. Hay que aplicarlo tanto en `{file}` como en `{files}`. Agregar a `test_matriz_plantillas_por_nombres_hostiles` los nombres `--config=evil.py` y `--output-file=src/app.py`, con asserts sobre el argv (`./--config=evil.py`) y sobre la ejecución sin centinela. Que el README (`:27`) diga que el script de `sh scripts/lint.sh {file}` recibe rutas que ya son seguras, y que no haga `eval` ni `sh -c` con ellas.

## Sugerencias (no bloquean)
- `config.py:22,83`: `"lint_file": "{file}"` (el placeholder como `argv[0]`) se acepta, y `lint_cmd(['src/a b.py'])` devuelve `['src/a b.py']`: ejecuta el archivo cambiado como programa. Es una config absurda, pero rechazarla es una línea: `argv[0]` no puede contener `{file`.
- `config.py:34`: en Windows, `shlex.split` en modo POSIX se come las `\` de una ruta sin comillas (`C:\tools\lint.exe` → `C:toolslint.exe`). El README ya avisa («con `/` o entre comillas»). Si se quiere blindar, podría ir un WARN cuando `argv[0]` no se resuelve con `shutil.which` ni existe.
- Deuda declarada y aceptada: cuando vence el timeout en Windows, el proceso nieto no se mata. El workflow `.github/workflows/harness.yml` sigue sin correr: pegar su resultado cuando haya push.

## Mejoras al arnés detectadas
- La matriz de nombres hostiles tendría que cubrir las tres familias, no solo la del shell: metacaracteres de shell (ya está), metacaracteres de cmd (ya está) y **nombres que empiezan con `-`** (falta). La pregunta para cada nueva forma de pasar datos a un proceso es «¿quién más interpreta este string?». Ahora el shell ya no lo interpreta, pero el parser de argumentos del linter sí.
