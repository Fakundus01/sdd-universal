# Review harness @ 11ba31a (vuelta 7)
**Veredicto:** APPROVED

Alcance: `git diff --cached -- harness/ .github/`, con los 21 archivos como `A ` y ninguno como `AM`. Probé los archivos del índice extraídos con `git checkout-index` a `scratchpad/v7 con espacios/`, nunca dentro del repo. Borré el `__pycache__` (quedan 0 entradas).

La regresión de la vuelta 6 está corregida. Las formas de `lint_file` que documenta el README corren desde la raíz, desde otro cwd y en el hook. Los arreglos de seguridad anteriores se mantienen: el invariante `./`, la búsqueda solo en el PATH y la ejecución sin shell.

## Verificación re-ejecutada

```text
$ python -m unittest discover -s harness/tests
Ran 100 tests in 41.204s

OK (skipped=1)
$ py -3.11 -m unittest discover -s harness/tests
Ran 100 tests in 45.990s

OK (skipped=1)
```

El test que se saltea es el de las formas POSIX de `TestFormasDocumentadas`, porque esta máquina es Windows. Es esperable.

### Linter con ruta relativa: desde la raíz y desde `C:\`

```text
== tools/fl.cmd {file}
[OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-sdd-universal\b933f960-ac82-4dab-b47f-352312291a3f\scratchpad\v7 con espacios\tools\fl.cmd" ./src/D.java` (0.0s): ARGS ./src/D.java
  [otro cwd] [OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-sdd-universal\b933f960-ac82-4dab-b47f-352312291a3f\scratchpad\v7 con espacios\tools\fl.cmd" ./src/D.java` (0.0s): ARGS ./src/D.java
== ./tools/fl.cmd {file}
[OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-sdd-universal\b933f960-ac82-4dab-b47f-352312291a3f\scratchpad\v7 con espacios\tools\fl.cmd" ./src/D.java` (0.0s): ARGS ./src/D.java
  [otro cwd] [OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-sdd-universal\b933f960-ac82-4dab-b47f-352312291a3f\scratchpad\v7 con espacios\tools\fl.cmd" ./src/D.java` (0.0s): ARGS ./src/D.java
== tools/fl {file}
[OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-sdd-universal\b933f960-ac82-4dab-b47f-352312291a3f\scratchpad\v7 con espacios\tools\fl.cmd" ./src/D.java` (0.0s): ARGS ./src/D.java
  [otro cwd] [OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-sdd-universal\b933f960-ac82-4dab-b47f-352312291a3f\scratchpad\v7 con espacios\tools\fl.cmd" ./src/D.java` (0.0s): ARGS ./src/D.java
== "tools\fl.cmd" {file}
[OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-sdd-universal\b933f960-ac82-4dab-b47f-352312291a3f\scratchpad\v7 con espacios\tools\fl.cmd" ./src/D.java` (0.0s): ARGS ./src/D.java
  [otro cwd] [OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Temp\claude\C--Users-Facundo-Estudio-Trabajo-sdd-universal\b933f960-ac82-4dab-b47f-352312291a3f\scratchpad\v7 con espacios\tools\fl.cmd" ./src/D.java` (0.0s): ARGS ./src/D.java
```

En `tools/fl {file}`, el shim POSIX sin extensión, que existe al lado, no se elige. Se resuelve a `fl.cmd`, que es lo correcto en Windows.

### Hook post-edit desde otro cwd (`CLAUDE_PROJECT_DIR` con espacios)

```text
== hook post-edit desde otro cwd
rc=0
== hook post-edit lint rojo
[arnés] lint encontró problemas en src/D.java:
MAL ./src/D.java
Si los causó tu cambio, corregilos ahora. Si ya estaban y el archivo está fuera de tu tarjeta, no los arregles: anotalos en el handback.
rc=2
```

### La seguridad no tuvo regresiones

```text
== javac.cmd plantado + @opts.java
[OK]    lint @opts.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.exe" -d out ./@opts.java` (0.4s)
[OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.exe" -d out ./src/D.java` (0.5s)
ls: cannot access 'PWNED_CMD': No such file or directory
ls: cannot access 'PWNED_DIR': No such file or directory
== PATH con '.' relativo
[OK]    lint src/D.java — `"C:\Users\Facundo\AppData\Local\Programs\Eclipse Adoptium\jdk-25.0.2.10-hotspot\bin\javac.exe" -d out ./src/D.java` (0.5s)
ls: cannot access 'PWNED_CMD': No such file or directory
```

## Checkpoints
- C1: [x] 100 tests: 99 en verde y 1 skip esperable (POSIX en Windows), en 3.14 y 3.11. `verify.py --quick` en verde en el proyecto temporal.
- C2: [x] Cumple `harness.md` §3 (niveles, exit, primera línea con hash y rama), §7 (checks sin los falsos positivos ni negativos encontrados en las vueltas 1 a 6), §9 (hooks que nunca fallan en silencio) y R32 (`deploy` y `prod_readonly_query` nunca se ejecutan, con test). Portabilidad: verificada en Windows (Git Bash, PowerShell, cmd), con rutas con espacios, repo sin commits, HEAD detached, proyecto sin git y monorepo.
- C3: [x] Solo usa la stdlib (R28). Lo propio del stack queda en `harness.config.json`. `test_bordes.py` y `test_lint_seguro.py` respetan R05.
- C4: [x] Re-ejecuté todo yo en cada vuelta. Cada arreglo tiene su test, con el rojo medido según el coordinador, y yo verifiqué el cierre con mis reproducciones originales. Nada está skipeado salvo el test POSIX en Windows.
- C5: [x] Los 21 archivos están en `A `, sin `AM`, sin `__pycache__`, sin prints de debug ni secretos.

## Cambios requeridos
Ninguno.

## Deuda declarable (no bloquea; conviene anotarla en el handback o en `harness_fixes.md`)
1. **Timeout en Windows:** `subprocess.run` mata al hijo pero no al proceso nieto (por ejemplo, el `node` que lanza `npx.cmd`). Fue aceptada en las vueltas 2 a 6.
2. **CI sin correr:** `.github/workflows/harness.yml` (3 SO × Python 3.10/3.12) todavía no se ejecutó. macOS, Linux y Python 3.10 real **no están probados**: solo hay evidencia de Windows con 3.11 y 3.14, y la sintaxis 3.10 se verificó con `ast`. Hay que pegar el resultado de la matriz después del primer push. El README ya lo dice así.
3. **Globs del linter:** eslint y prettier tratan los argumentos como patrones, y en POSIX un archivo llamado `src/[ab].js` puede ampliar lo que se lintea. Es ruido, no ejecución, y ya está documentado en `README.md:27`.
4. **Pre-commit en monorepo:** `git-hooks/pre-commit` busca `$(git rev-parse --show-toplevel)/harness/verify.py`. Si `harness/` vive en una subcarpeta del repo, hay que ajustar la ruta del hook a mano. `verify.py` en sí ya funciona en un monorepo (verificado en la vuelta 2).

## Mejoras al arnés detectadas
- Lo que más tardó en converger (vueltas 1 a 6) fue «¿quién interpreta el string que viene de un nombre de archivo?». Vale la pena llevarlo a una regla del arnés o a un escenario (`scenarios.md`, R20): *«todo dato que venga del sistema de archivos y se pase a un proceso va como argumento sin shell, con `./`, y con el ejecutable resuelto solo desde el PATH o desde la raíz»*, con la matriz de `test_lint_seguro.py` como ejemplo del rojo forzado.
- `TestFormasDocumentadas` (las formas del README ejecutadas de verdad) es el patrón a repetir: cada comando que documenta el README tendría que tener un test que lo corra.
