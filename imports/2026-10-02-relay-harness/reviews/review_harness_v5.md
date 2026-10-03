# Review harness @ 11ba31a (vuelta 5)
**Veredicto:** CHANGES_REQUESTED

Alcance: `git diff --cached -- harness/ .github/`, con los 21 archivos como `A ` y ninguno como `AM`. Probé los archivos del índice extraídos con `git checkout-index` a `scratchpad/v5 con espacios/`, nunca dentro del repo. Borré el `__pycache__`.

La inyección de opciones con `-` está cerrada, y mis reproducciones de la vuelta 4 ya no funcionan. Pero a la pregunta de quién más interpreta el string hay otra respuesta: **los response files `@archivo`**. javac, gcc, clang, clang-tidy y las herramientas LLVM, MSVC `cl` y dotnet leen opciones desde `@<ruta>`. Un archivo llamado `@opts.java` pasa a ser «leé las opciones de opts.java». Lo demuestro con un javac real.

## Verificación re-ejecutada

```text
$ python -m unittest discover -s harness/tests
Ran 96 tests in 33.114s

OK
$ py -3.11 -m unittest discover -s harness/tests
Ran 96 tests in 34.587s

OK
```

### Reproducciones de la vuelta 4, contra el índice: cerradas

```text
$ python harness/verify.py --quick
verify.py --quick @ 59de11d (rama main)

── Arnés ──
[OK]    Creado sdd/progress/main/current.md desde la plantilla
[OK]    Rutas citadas existen (0 revisadas)

── Lint de lo cambiado ──
[OK]    lint --config=evil.py — `C:\Python314\python.EXE tools/fakelint.py ./--config=evil.py` (0.1s): lint de ['./--config=evil.py']
[OK]    lint --output-file=src/app.py — `C:\Python314\python.EXE tools/fakelint.py ./--output-file=src/app.py` (0.1s): lint de ['./--output-file=src/app.py']
[OK]    lint -rf.py — `C:\Python314\python.EXE tools/fakelint.py ./-rf.py` (0.1s): lint de ['./-rf.py']
[OK]    lint evil.py — `C:\Python314\python.EXE tools/fakelint.py evil.py` (0.1s): lint de ['evil.py']

VERDE — 0 FAIL, 0 WARN
rc=0
ls: cannot access 'PWNED': No such file or directory
importante = 1
```

`src/app.py` quedó intacto y `git diff --stat` está vacío.

### Response file `@…` con un javac real (lo que bloquea)

Config: `"lint_file": "javac -Xlint:all -d out {file}"`, `"lint_ext": [".java"]`. Pasa `_validate`. Archivos sin trackear dejados por un tercero:

```text
$ printf -- '-d PWNED_DIR src/A.java\n' > opts.java; : > "@opts.java"
$ git status --porcelain
?? @opts.java
?? opts.java
$ python harness/verify.py --quick | sed -n '/Lint/,$p'
── Lint de lo cambiado ──
[OK]    lint @opts.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.EXE" -Xlint:all -d out @opts.java` (0.8s)
[FAIL]  lint opts.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.EXE" -Xlint:all -d out opts.java` salió con 1 (0.4s):
opts.java:1: error: class, interface, annotation type, enum, record, method or field expected
-d PWNED_DIR src/A.java
^
1 error

ROJO — 1 FAIL, 0 WARN
$ ls -R PWNED_DIR
PWNED_DIR:
A.class
```

javac tomó `@opts.java` como lista de opciones: escribió en un directorio elegido por el atacante y la línea `[OK]` reporta un lint que nunca se hizo. Esto escala:
- Con `-processorpath x.jar -processor Evil` en el archivo de opciones, javac **ejecuta** un annotation processor.
- En gcc/clang, `@x.c` → `-fplugin=…` carga código.

Aclaro que en esta demostración el `[FAIL]` sale por el otro archivo (`opts.java`). El atacante puede evitarlo dándole al archivo de opciones una extensión que no esté en `lint_ext`.

## Checkpoints
- C1: [x] 96/96 en 3.14 y 3.11.
- C2: [ ] Un nombre de archivo todavía lo interpreta el linter, ahora como response file (`@…`).
- C3: [x] El diseño sin shell y con `./` es el correcto, y `test_lint_seguro.py` separa bien lo que se pasaba de R05.
- C4: [x] Re-ejecuté todo. Hay rojo medido según el coordinador, y yo verifiqué el cierre de los casos `-`.
- C5: [x] Sin `AM` y sin `__pycache__`.

## Cambios requeridos

1. **[MEDIA · seguridad] `harness/config.py` (`lint_cmd`, la línea `as_arg = [f"./{r}" if r.startswith("-") else r for r in safe]`): también hay que neutralizar `@` (response files) y, de paso, `+` (algunas herramientas lo usan como prefijo de opción).** Lo que se espera es una de dos:
   - (a) prefijar `./` a toda ruta que empiece con un carácter que no sea alfanumérico, `_` o `.`;
   - (b) más simple y sin lista que mantener: prefijar `./` **siempre**. Las rutas son relativas a la raíz, y todos los linters aceptan `./x`.

   Recomiendo (b): cierra la familia entera («el primer carácter del argumento lo interpreta el parser»), y no hay que adivinar qué prefijo inventa el próximo linter. Hay que actualizar el comentario, el README (`:27`) y la matriz de `test_lint_seguro.py` con `@opts.java` y `+x.py`.

## Sugerencias (no bloquean)
- `config.py` (`shutil.which(argv[0])`, en Windows): `which` busca primero en el directorio actual, y lo mismo hace cmd.exe. Un `npx.cmd` o `eslint.cmd` sin trackear en la raíz del proyecto se ejecutaría en lugar del real. Ya pasaba igual con `shell=True` en las vueltas anteriores, así que no es una regresión. Para blindarlo: `shutil.which(argv[0], path=os.environ.get("PATH"))` con `NoDefaultCurrentDirectoryInExePath=1` en el entorno, o rechazar un resultado que caiga en `root` cuando `argv[0]` no tenía `/`.
- Muchos linters (eslint, prettier) tratan los argumentos como **globs**. Un archivo llamado `src/[ab].js` o `**.js` en POSIX amplía lo que se lintea. No es ejecución de código: es ruido. Se puede documentar.
- Deuda declarada y aceptada: cuando vence el timeout en Windows, el proceso nieto no se mata. El workflow `.github/workflows/harness.yml` sigue sin correr.

## Mejoras al arnés detectadas
- Formular la regla como invariante y no como lista: *«todo argumento que venga de un nombre de archivo empieza con `./`»*. Así la matriz de tests verifica una propiedad (`all(a.startswith("./") for a in argv_de_rutas)`) en lugar de enumerar prefijos peligrosos, que es lo que hizo falta tres vueltas seguidas (`$(…)` → comillas → `-` → `@`).
