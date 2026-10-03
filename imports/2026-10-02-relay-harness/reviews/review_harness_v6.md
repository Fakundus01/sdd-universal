# Review harness @ 11ba31a (vuelta 6)
**Veredicto:** CHANGES_REQUESTED

Alcance: `git diff --cached -- harness/ .github/`, con los 21 archivos como `A ` y ninguno como `AM`. Probé los archivos del índice extraídos con `git checkout-index` a `scratchpad/v6 con espacios/`, nunca dentro del repo. Borré el `__pycache__`.

**Seguridad: cerrada.** El invariante `./` neutraliza `-`, `@` y `+`, y mi javac con `@opts.java` ya no lee opciones. Un `javac.cmd` plantado en la raíz no se ejecuta. No encontré otro camino por el que un nombre de archivo termine interpretado como código.

**Lo que bloquea es una regresión funcional que introdujo `resolve_exe`.** Un linter con ruta relativa escrita con `/`, que es justo lo que el README recomienda para Windows, ya no se puede ejecutar (en la vuelta 4 andaba). Es un FAIL ruidoso, no silencioso, pero rompe el pre-commit y el hook stop en cada commit para cualquiera que use `tools/lint.cmd {file}` o `node_modules/.bin/eslint {file}`. El arreglo es chico.

## Verificación re-ejecutada

```text
$ python -m unittest discover -s harness/tests
Ran 98 tests in 33.804s

OK
$ py -3.11 -m unittest discover -s harness/tests
Ran 98 tests in 33.100s

OK
```

### javac con `@opts.java`, `+x.java`, `-rf.java` (vuelta 5) contra el índice: cerrado

```text
$ git status --porcelain
?? +x.java
?? -rf.java
?? @opts.java
?? opts.txt
$ python harness/verify.py --quick | sed -n '/Lint/,$p'
── Lint de lo cambiado ──
[OK]    lint +x.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.exe" -Xlint:all -d out ./+x.java` (0.4s)
[OK]    lint -rf.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.exe" -Xlint:all -d out ./-rf.java` (0.4s)
[OK]    lint @opts.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.exe" -Xlint:all -d out ./@opts.java` (0.4s)

VERDE — 0 FAIL, 0 WARN
--- PWNED_DIR:
ls: cannot access 'PWNED_DIR': No such file or directory
```

### `javac.cmd` plantado en la raíz: no se resuelve

```text
== javac.cmd plantado en la raíz
[OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.exe" -Xlint:all -d out ./src/D.java` (0.4s)
ls: cannot access 'PWNED_CMD': No such file or directory
```

### Regresión: linter con ruta relativa (lo que bloquea)

`tools/fl.cmd` existe en el proyecto (`@echo off` / `echo ARGS %*`). Las mismas configs en la vuelta 4 (`shutil.which`) y en la vuelta 6 (`resolve_exe`):

```text
== mismo caso en la vuelta 4 (shutil.which): v4 con espacios/
[OK]    lint src/D.java — `tools\fl.cmd src/D.java` (0.0s): ARGS src/D.java

== vuelta 6 — linter relativo, desde la raíz
[FAIL]  lint src/D.java: no se pudo ejecutar `tools/fl.cmd ./src/D.java` ([WinError 2] El sistema no puede encontrar el archivo especificado)
== vuelta 6 — linter relativo, desde otro cwd
[FAIL]  lint src/D.java: no se pudo ejecutar `tools/fl.cmd ./src/D.java` ([WinError 2] El sistema no puede encontrar el archivo especificado)
== vuelta 6 — hook post-edit desde otro cwd
[arnés] hook 'post-edit' falló internamente (FileNotFoundError: [WinError 2] El sistema no puede encontrar el archivo especificado).
rc=1
== lint_file: tools/fl {file}          (forma de node_modules/.bin/eslint: shim sin extensión + .cmd)
[FAIL]  lint src/D.java: no se pudo ejecutar `tools/fl ./src/D.java` ([WinError 2] El sistema no puede encontrar el archivo especificado)
== lint_file: ./tools/fl.cmd {file}
[FAIL]  lint src/D.java — `./tools/fl.cmd ./src/D.java` salió con 1 (0.0s):
== lint_file: "tools\fl.cmd" {file}    (la única forma que anda)
[OK]    lint src/D.java — `tools\fl.cmd ./src/D.java` (0.0s): ARGS ./src/D.java
```

## Checkpoints
- C1: [x] 98/98 en 3.14 y 3.11.
- C2: [ ] Un linter con ruta relativa con `/` no se puede ejecutar en Windows (regresión respecto de la vuelta 4, y contradice `README.md:27`).
- C3: [x] El invariante `./` y la búsqueda solo en el PATH son el diseño correcto.
- C4: [x] Re-ejecuté todo. Los tests nuevos cubren el invariante y el cwd plantado. Ninguno cubre un ejecutable con ruta relativa, y por eso la regresión pasó.
- C5: [x] Sin `AM` y sin `__pycache__`.

## Cambios requeridos

1. **[MEDIA · regresión] `harness/config.py:132-136` (`resolve_exe`, la rama `if "/" in name or "\\" in name`) + `config.py:111`.** Hoy pasan dos cosas:
   - (a) `Path(name).is_file()` se evalúa contra el cwd **del proceso**, no contra la raíz del proyecto, que es el `cwd` que después recibe `subprocess.run`.
   - (b) Devuelve la ruta tal cual, con `/` y relativa. CreateProcess no la encuentra (`WinError 2`), y cmd.exe interpreta `./tools/fl.cmd` como `.` más el switch `/tools`.

   Lo que se espera: si `name` trae separador, resolverlo contra `root` (pasárselo a `lint_cmd` o resolver en `verify`/hook), probar también `name + ext` para cada `PATHEXT` (el caso de `node_modules/.bin/eslint` → `eslint.cmd`) y devolver `str(Path(root, name + ext).resolve())`, que es absoluta y con `\`. Como el usuario la escribió en la config, no hay riesgo de que la planten. Agregar tests de `tools/fl.cmd {file}`, `./tools/fl.cmd {file}` y `tools/fl {file}`, con un `tools/fl.cmd` real, ejecutados desde la raíz y desde otro cwd.

## Sugerencias (no bloquean)
- `resolve_exe`: una entrada relativa en el PATH (`.` o `node_modules\.bin`) vuelve a buscar en el cwd. Es raro y depende de la configuración del usuario: alcanza con ignorar las entradas no absolutas.
- Deuda declarable, ya aceptada en vueltas anteriores: cuando vence el timeout en Windows, el proceso nieto no se mata. Los globs de eslint/prettier pueden ampliar lo que se lintea (ruido, no ejecución; ya está en el README). El workflow `.github/workflows/harness.yml` sigue sin correr, y macOS, Linux y Python 3.10 siguen sin probarse en esta máquina.

**Fuera del cambio requerido 1, lo que queda son sugerencias o deuda declarable.** Con ese arreglo y su test, de mi lado esto está para APPROVED.

## Mejoras al arnés detectadas
- Un test de humo end-to-end por forma de `lint_file` documentada en el README (`eslint {file}`, `npx eslint {files}`, `tools/x.cmd {file}`, `node_modules/.bin/eslint {file}`, `sh scripts/lint.sh {file}`), ejecutada de verdad en el SO de CI. La matriz de seguridad prueba lo que *no* tiene que pasar, y faltaba probar que lo documentado *sí* corre.
