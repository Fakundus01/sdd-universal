# Review harness @ 11ba31a
**Veredicto:** CHANGES_REQUESTED

Alcance: el scaffold `harness/` staged sin commitear en `feat/relay-harness-import` (`git diff --cached -- harness/`; el working tree es igual al índice: `git diff -- harness/` vacío). Se revisó contra `harness.md` §2, §3, §4, §6, §7 y §9, `prompts/task-card.md` y `agents/reviewer.md`. No hay tarjeta ni handback: los checkpoints se aplican a la spec. Todas las pruebas de bordes corrieron en proyectos temporales del scratchpad (`proj con espacios/`, `proj2/`), nunca dentro del repo.

## Verificación re-ejecutada

```text
$ python --version
Python 3.14.0
$ python -m unittest discover -s harness/tests
........................................................
----------------------------------------------------------------------
Ran 56 tests in 15.252s

OK
$ py -3.11 -m unittest discover -s harness/tests
Ran 56 tests in 15.540s

OK
$ python -c "import ast,glob; [ast.parse(open(f,encoding='utf-8').read(),feature_version=(3,10)) for f in glob.glob('harness/**/*.py',recursive=True)]; print('ast 3.10 ok')"
ast 3.10 ok
```

`python harness/verify.py --changed` en la raíz de este repo (no tiene `harness.config.json` porque es el paquete y no un proyecto):

```text
verify.py --changed @ 11ba31a (rama feat/relay-harness-import)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)

ROJO — 1 FAIL, 0 WARN
rc=1
```

Lo que anda bien (verificado en el proyecto temporal `proj con espacios/`, que tiene una ruta con espacios):
- §3: `--quick`, `--changed`, completo y `--e2e` corren lo que dice la tabla. La primera línea trae el hash y la rama (`verify.py --quick @ 99f9a1e (rama feat/stock)`). Un test en rojo da `rc=1` con la cola de la salida. Con `--e2e` en verde se agrega `- 2026-10-02 @ a53e08a — e2e verde` a `sdd/progress/e2e.md`.
- Proyecto sin git: sale `@ sin-commit (rama sin-git)`, VERDE y rc=0. Repo sin commits: `rama main`. HEAD detached: `rama detached`.
- Probé Git Bash, PowerShell 5.1 (`rc=0`, también desde otro cwd con la ruta absoluta) y cmd (`rc=0`). macOS y Linux no los pude probar en esta máquina.
- El pre-commit instalado con `core.hooksPath` bloquea un commit con FAIL (`rc=1`) y deja pasar uno en verde. Está en modo 100755 en el índice, con LF por `.gitattributes`.
- §9 hooks: session-start muestra `current.md`. stop devuelve 2 con la cola si `--quick` da rojo y 0 con `stop_hook_active`. post-edit devuelve 2 con la salida del lint. context-guard avisa una sola vez por tramo. Un comando desconocido, un payload raro o un timeout del lint salen con 1 y un mensaje en stderr, nunca en silencio.
- R32: `deploy` y `prod_readonly_query` solo aparecen en `config.py:11,28,29`. Configuré los dos para que crearan los archivos `DEPLOYED` y `PRODQ`, corrí todos los niveles y los hooks, y ninguno de los dos archivos apareció.
- Una tarjeta copiada literal de la plantilla `prompts/task-card.md` (frontmatter con `# comentarios`, criterios `1. <…>`) se parsea bien: `[WARN] sin criterios de aceptación — no puede salir de pending`. Lo mismo con CRLF.

## Checkpoints
- C1: [x] Los 56 tests están en verde en 3.14 y 3.11. La sintaxis es compatible con 3.10 (ast). `verify.py --quick` da VERDE en un proyecto mínimo.
- C2: [ ] No cumple del todo `harness.md` §7. Hay falsos positivos con tarjetas y reviews reales (cambios 3 a 7) y un falso negativo en §7.4 (cambio 8). Además `--changed` y el lint no ven archivos con tilde (cambio 2) y ven el `__pycache__` del propio arnés (cambio 1).
- C3: [x] Solo usa la stdlib (R28). Lo propio del stack queda en `harness.config.json`. El código es legible y está separado por responsabilidad.
- C4: [x] Re-ejecuté todo yo (no copié salidas). Cada check de §7 tiene su rojo forzado en `tests/`. Faltan tests de los bordes de abajo (ver mejoras).
- C5: [x] No hay prints de debug ni secretos. El handback no aplica (no es una tarjeta). Ojo: mis corridas dejaron `harness/__pycache__/` en el repo; los borré y el repo quedó como estaba.

## Cambios requeridos

### Bugs reales (por severidad)

1. **[ALTA · seguridad] `harness/config.py:64` (y su uso en `verify.py:98` y `hooks/claude.py:139`): un nombre de archivo puede inyectar comandos en macOS y Linux.** `lint_file_cmd` envuelve la ruta en comillas dobles y la pasa con `shell=True`. En `/bin/sh`, dentro de comillas dobles igual se expanden `$(…)` y los backticks. El nombre sale de `git status` (--quick, el pre-commit, el hook stop) o del `file_path` del hook post-edit. Para demostrarlo, ejecuté con `sh -c` el mismo string que `subprocess.run(..., shell=True)` le pasa a `/bin/sh` en POSIX:
   ```text
   $ touch 'src/$(touch PWNED).py'; git status --porcelain
   ?? "src/$(touch PWNED).py"
   cmd: python -c "import sys; print('LINT', sys.argv[1:])" "src/$(touch PWNED).py"
   LINT ['src/.py']
   $ ls -la PWNED
   -rw-r--r-- 1 Facundo 197121 0 Oct  2 19:59 PWNED
   ```
   Lo que se espera: en POSIX, `shlex.quote(rel)`. En Windows (cmd) hay que rechazar o saltear con `[WARN]` los nombres con `%`, `!` o `^`. Otra opción es armar argv con `shlex.split(lint_file)` y reemplazar `{file}` como un elemento, sin shell. Falta el test con rojo forzado.

2. **[ALTA] `harness/repo.py:41-44`: los archivos con caracteres no ASCII desaparecen de los cambios.** `git status --porcelain=v1` sin `-z` escapa `ó` como `\303\263` (core.quotePath). El `strip('"')` deja la ruta escapada, `is_file()` da False y el archivo se descarta. Entonces `--changed` dice que no hay nada que testear y el lint lo saltea. En proyectos en español, los nombres con tilde son comunes:
   ```text
   $ echo "x=2" > "src/canción.py"; git status --porcelain
   ?? "src/canci\303\263n.py"
   $ python harness/verify.py --changed
   verify.py --changed @ f7c950f (rama main)

   ── Arnés ──
   [OK]    Memoria en disco: sdd/progress/main/current.md
   [OK]    Rutas citadas existen (0 revisadas)

   ── Tests de lo cambiado ──
   [OK]    sin cambios de código sin commitear: nada que testear

   VERDE — 0 FAIL, 0 WARN
   rc=0
   ```
   Lo que se espera: `git status --porcelain=v1 -z --untracked-files=all` y parsear por `\0` (en un rename vienen 2 rutas). Eso también resuelve los nombres con `"`, `\t` y ` -> `.

3. **[ALTA] El arnés se ve a sí mismo como "código cambiado".** Al importar sus módulos, Python escribe `harness/__pycache__/*.pyc`. En un proyecto recién instalado nadie lo ignora, así que `changed_files()` lo devuelve. Con `lint_ext` vacío (lo que dice el §2 de la spec) se le pasa `lint_file` a binarios `.pyc` (eslint fallaría y el pre-commit y el stop quedarían en rojo). Además `--changed` corre `test_quick` siempre, aunque no se haya tocado nada:
   ```text
   == 2a corrida, sin tocar nada
   ── Lint de lo cambiado ──
   [OK]    lint harness/__pycache__/checks.cpython-314.pyc — `python -c "import sys;print(sys.argv[1])" "harness/__pycache__/checks.cpython-314.pyc"` (0.1s): ...
   [OK]    lint harness/__pycache__/config.cpython-314.pyc — ...
   [OK]    lint harness/__pycache__/repo.cpython-314.pyc — ...
   [OK]    lint harness/__pycache__/report.cpython-314.pyc — ...

   ── Tests de lo cambiado ──
   [OK]    test_quick — `python -c "print(1)"` (0.0s): 1
   ```
   Lo que se espera: `sys.dont_write_bytecode = True` antes de los imports en `verify.py:20` y `hooks/claude.py:24`, más un `harness/.gitignore` con `__pycache__/`.

4. **[MEDIA] `harness/checks.py:37` y todas las lecturas (también `config.py:42`): un BOM UTF-8 rompe tarjetas y config.** PowerShell 5.1 (`Set-Content -Encoding utf8`, `Out-File`) escribe BOM, y el README dice que el arnés está probado en PowerShell:
   ```text
   == tarjeta con BOM + CRLF
   [FAIL]  sdd/cards/H-3.md: el id del frontmatter (vacío) no coincide con el nombre del archivo
   [FAIL]  sdd/cards/H-3.md: estado inválido '' (válidos: blocked, done, in_progress, pending, review)
   == config con BOM (PowerShell 5.1 Set-Content -Encoding utf8)
   [FAIL]  harness.config.json no es JSON válido: Unexpected UTF-8 BOM (decode using utf-8-sig): line 1 column 1 (char 0)
   ```
   Lo que se espera: `encoding="utf-8-sig"` en todos los `read_text` de cards, reviews, handbacks, status y config.

5. **[MEDIA] `harness/checks.py:47`: un frontmatter con comillas, que es YAML válido, da FAIL falso.**
   ```text
   [FAIL]  sdd/cards/H-3.md: el id del frontmatter ("H-3") no coincide con el nombre del archivo
   [FAIL]  sdd/cards/H-3.md: estado inválido '"in_progress"' (válidos: blocked, done, in_progress, pending, review)
   ```
   Lo que se espera: sacar las comillas `"…"` o `'…'` que envuelven el valor. El `#` también corta valores legítimos, por ejemplo `titulo: Arreglar #42`: conviene cortar solo en ` #`, con el espacio antes.

6. **[MEDIA] `harness/checks.py:162`: la coherencia con `status.md` compara por substring.** Si existe la feature "Stock mínimo por sucursal" al 100%, cualquier tarjeta abierta de la feature "Stock", que está al 40%, da FAIL:
   ```text
   | Stock | 40% |
   | Stock mínimo por sucursal | 100% |
   [FAIL]  sdd/status.md marca «Stock» al 100% pero sdd/cards/H-3.md está in_progress
   ```
   Lo que se espera: comparar contra la celda o el nombre completo (split por `|` y `strip`, o con límites de palabra a ambos lados), no `feature in ln`.

7. **[MEDIA] `harness/checks.py:184`: una ruta citada con línea da FAIL falso.** `src/x.ts:120` es justo el formato que pide `agents/reviewer.md`, y también aparece en las tarjetas `done`:
   ```text
   [FAIL]  Ruta citada que no existe: sdd/cards/H-2.md → `src/orders.py:12`
   ```
   (`src/orders.py` existe.) Lo que se espera: sacar `:\d+(:\d+)?$` y `#L\d+` antes de `exists()`.

8. **[MEDIA] `harness/checks.py:142`: el veredicto se parsea mal en los dos sentidos.** La línea de la plantilla sin completar, `**Veredicto:** APPROVED | CHANGES_REQUESTED`, cuenta como APPROVED (falso negativo: una `done` pasa sin decisión real). En cambio `**Veredicto**: APPROVED` da FAIL (falso positivo):
   ```text
   == review con la linea de la plantilla sin elegir:
   [OK]    Tarjetas válidas (2)
   == review con **Veredicto**: APPROVED:
   [FAIL]  sdd/cards/H-2.md: done pero sdd/progress/feat-stock/review_H-2.md no está en APPROVED
   ```
   Lo que se espera: `^\**Veredicto:?\**:?\s*\**\s*(APPROVED|CHANGES_REQUESTED)\s*\**\s*$` por línea, exigir un único valor y usar el **último** veredicto si hay re-reviews.

9. **[BAJA] `harness/checks.py:198` + `repo.py:50`: §7.4 dice "commiteados", pero solo se detectan los handbacks *untracked*.** Un handback que está en el índice pero sin commitear, o modificado después del commit, no avisa:
   ```text
   == handback untracked:
   [WARN]  Handback sin commitear (commitealo antes de responder `done`): sdd/progress/feat-stock/handback_H-3.md
   == handback staged pero sin commitear:
   VERDE — 0 FAIL, 0 WARN
   ```
   Lo que se espera: `git status --porcelain -z -- <carpeta>` y avisar ante cualquier entrada `handback_*`.

10. **[BAJA] `harness/config.py:49-52`: la config no valida tipos.** Con `"context_threshold": "400k"` sale un traceback crudo en vez de `[FAIL]`:
    ```text
        cfg.context_threshold = int(cfg.context_threshold)
    ValueError: invalid literal for int() with base 10: '400k'
    ```
    Con `"lint_ext": ".py"` (un string en vez de una lista) se itera carácter por carácter, y con `"test": [...]` se pasa una lista a `shell=True`. Lo que se espera: validar `str`, `list[str]` e `int` y lanzar `ConfigError`.

11. **[BAJA] `harness/verify.py:40`: la primera línea dice `verify.py --full`, que no es un flag válido.** §4 pide "comando exacto". Quien la pegue o la re-ejecute recibe un error de argparse. Lo que se espera: imprimir los argv reales, o aceptar `--full` como alias.

### Sugerencias (no bloquean)
- `checks.py:75` vs `verify.py:56`: el WARN "e2e declarado pero sin ninguna corrida verde" sale en la misma corrida `--e2e` que lo registra (`VERDE — 0 FAIL, 1 WARN`). Conviene re-chequear después del e2e o saltear el aviso si `--e2e`.
- CI en un PR hace checkout en HEAD detached, así que `sdd/progress/detached/` y los handbacks de la rama nunca se revisan en CI. Usar `GITHUB_HEAD_REF` o `--branch` como fallback en `repo.py:23`.
- Monorepo: si `harness/` no está en el toplevel de git, `porcelain` da rutas relativas al toplevel y no a `root`, y `is_file()` las descarta en silencio. Usar `git -C root status --porcelain -- .` con `--relative` (o `ls-files`), o documentar que la raíz debe ser el toplevel.
- `git-hooks/pre-commit:4`: en Windows, `python3` puede ser el alias de la Microsoft Store que solo imprime "Python was not found" y sale con 9009. No lo pude reproducir porque acá `python3` es real. Sugerencia: elegir el intérprete con `"$PY" -c ''` y no solo con `command -v`.
- `hooks/settings.example.json:21-24`: el deny no cubre el `deploy` del ejemplo (`git push origin dev:main`), ni en general `git push *:main`. Agregar `Bash(git push origin dev:main:*)` y un comentario que remita a `deploy` en la config (R32).
- `verify.py:98`: sin `stdin=subprocess.DEVNULL` ni timeout, un comando que pide input cuelga el pre-commit. El stop hook (110 s) corre `lint_file` archivo por archivo: con eslint (unos 2 s por archivo) y 50 o más archivos cambiados vence siempre. Conviene pasar los archivos en lote, con `{files}`, o limitar cuántos se lintean en `--quick`.
- `checks.py:56`: se descarta todo criterio que empiece con `<`, así que "`<200 ms` por request" se pierde. Mejor descartar solo `<…>` completos, con regex `^<[^>]+>$`.
- La spec y el código se separaron: `lint_ext` y `cited_paths_docs` existen en `config.py:11` y en el ejemplo, pero no en la tabla de `harness.md` §2. Además, §7.2 dice "las tarjetas" y el código solo revisa las `done` (la decisión es razonable, pero tiene que figurar en la spec).
- Cuando vence el timeout en Windows, `subprocess.run(shell=True)` mata `cmd.exe` pero no el proceso nieto (el lint sigue corriendo).

## Mejoras al arnés detectadas
- Agregar a `harness/tests/` un test por cada bug de arriba, con su rojo forzado: un nombre con tilde y uno con `$(…)` en `changed_files`/`lint_file_cmd`, una tarjeta con BOM, un frontmatter con comillas, `status.md` con features que son prefijo una de otra, una ruta `x.py:12`, la línea de veredicto de la plantilla sin elegir, un handback staged sin commitear, el `__pycache__` del arnés y un test de que `deploy`/`prod_readonly_query` nunca se ejecutan (que asegure el R32).
- Un test "plantilla literal": que parsee el bloque de `prompts/task-card.md` y la línea de veredicto de `agents/reviewer.md` directamente desde los archivos del paquete. Así, si alguien cambia la plantilla, el arnés se entera (drift plantilla ↔ parser).
- Correr la suite en CI con una matriz `ubuntu-latest`/`macos-latest`/`windows-latest` × Python 3.10/3.12, porque la portabilidad que promete el README hoy está probada solo en Windows, con 3.11 y 3.14.
