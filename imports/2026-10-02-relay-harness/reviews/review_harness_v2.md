# Review harness @ 11ba31a (vuelta 2)
**Veredicto:** CHANGES_REQUESTED

Alcance: `git diff --cached -- harness/ .github/` en `feat/relay-harness-import`. HEAD sigue en 11ba31a: todo está staged y sin commitear. Volví a correr cada reproducción de la vuelta 1 contra los archivos **del índice**, extraídos con `git checkout-index` a proyectos temporales del scratchpad (`v2 con espacios/`, `mono repo/`, `singit/`), nunca dentro del repo.

Resultado: los 11 bugs están arreglados y lo verifiqué con las reproducciones originales. Quedan 2 cambios chicos. El primero (R1) es lo que queda del bug de inyección y es de seguridad. El segundo (R2) es un README que se va a commitear con una afirmación que todavía no es cierta.

## Verificación re-ejecutada

```text
$ python -m unittest discover -s harness/tests
Ran 82 tests in 24.635s

OK
$ py -3.11 -m unittest discover -s harness/tests
Ran 82 tests in 24.354s

OK
```

El workflow `.github/workflows/harness.yml` (3 sistemas × Python 3.10/3.12) todavía no corrió. En esta máquina no pude probar macOS, Linux ni Python 3.10 real.

### Las reproducciones de la vuelta 1, de nuevo

| # | Reproducción | Vuelta 1 | Vuelta 2 |
|---|---|---|---|
| 1 | `src/$(touch PWNED).py` en `--quick` (Windows/cmd) y `quote_path(..., windows=False)` + `sh -c` | creaba `PWNED` | `'src/$(touch PWNED).py'` llega literal. Probé también backticks, comilla simple, espacios y tilde: no aparece ningún `PWNED`. `src/100%PATH%.py` → `[WARN] lint salteado` |
| 2 | Cambio único `src/canción.py` con `--changed` | «nada que testear» | `[OK] lint src/canción.py` (el hijo recibe `'src/canci\xf3n.py'` y `isfile` da True) + `test_quick` |
| 3 | 2ª corrida sin cambios | lint de `__pycache__/*.pyc` + test_quick | `sin cambios de código sin commitear: nada que testear`. No se crea `__pycache__` (`git status` solo muestra `?? sdd/progress/`) |
| 4 | Tarjeta BOM+CRLF / config con BOM (PowerShell 5.1) | 2 FAIL / «no es JSON válido» | `Tarjetas válidas (2)` / `VERDE` |
| 5 | `id: "H-3"`, `estado: "in_progress"`, `titulo: "Arreglar #42" # c` | 2 FAIL | válida |
| 6 | `Stock` 40% vs `Stock mínimo por sucursal` 100% | FAIL falso | sin FAIL. El verdadero positivo sigue andando con el `status.md` de `examples/turnos`: `[FAIL] sdd/status.md marca «API de reserva» al 100%…` (y lo mismo con `feature: F3`) |
| 7 | `` `src/orders.py:12` `` y `` `src/orders.py#L3-L9` `` | FAIL falso | `Rutas citadas existen (2 revisadas)` |
| 8 | `APPROVED \| CHANGES_REQUESTED` / `**Veredicto**: APPROVED` | aprobaba / FAIL | FAIL / aprueba |
| 9 | Handback en el índice / modificado después del commit | sin aviso | `[WARN] Handback sin commitear` en los dos casos, y nada una vez commiteado |
| 10 | `context_threshold:"400k"`, `true`; `lint_ext:".py"`; `test:["pytest"]`; `test:"  "` | traceback | un `[FAIL]` claro en cada caso, rc=1 |
| 11 | Primera línea | `verify.py --full` (flag inexistente) | argv real (`verify.py --full --e2e @ fe6aefa (rama feat/stock)`), `--root` se oculta, `--full` es un alias válido |

Lo nuevo también funciona:
- `--e2e` ya no se avisa a sí mismo.
- Con `test: python -c "input()"` la corrida termina en `EOFError` y rc=1, sin colgarse.
- Con HEAD detached: `rama detached`, y con `GITHUB_HEAD_REF=feat/stock` → `rama feat/stock`.
- En un monorepo (`mono repo/apps/web app/`) solo ve `src/canción.py` del subproyecto e ignora `otro.py` de la raíz.
- Sin commits: `@ sin-commit (rama trunk)`.
- Hooks: post-edit con `{files}` y lint en rojo da rc=2. Un nombre con `%` da rc=1 con mensaje. stop en rojo da rc=2. session-start da rc=0.
- El pre-commit bloquea con FAIL (rc=1) y deja pasar el verde.
- PowerShell (rc=0, también desde `C:\`) y cmd (rc=0) andan.
- `DEPLOYED` y `PRODQ` no aparecieron en ninguna corrida (R32).

## Checkpoints
- C1: [x] 82/82 en 3.14 y 3.11. `--quick` en verde en los proyectos temporales.
- C2: [ ] Falta cerrar del todo el bug de inyección: R1.
- C3: [x] Sigue usando solo la stdlib, y las responsabilidades siguen separadas (`quote_path`, `_status`, `_verdict`, `_cells`).
- C4: [x] Re-ejecuté todo. Según el coordinador, `test_bordes.py` se escribió antes del arreglo y vio su rojo (22 de 26); no lo pude re-medir porque no hay commit base del arnés viejo. Igual corrí a mano las reproducciones viejas contra el código nuevo (tabla de arriba).
- C5: [ ] `harness/README.md` está `AM`: la versión del índice dice algo que todavía es falso (R2). Mis corridas volvieron a dejar `harness/__pycache__/` en el repo (por correr `unittest` directo); lo borré.

## Cambios requeridos

1. **[MEDIA · seguridad] `harness/config.py:102-103` (+ `_validate`, `config.py:68`): si `lint_file` trae `{file}` entre comillas, la inyección vuelve en POSIX.** Escribir `npx eslint "{file}"` es un hábito muy común (además la versión anterior del arnés ponía esas comillas sola), y ni `harness.md` §2 ni el README dicen que no hay que hacerlo. `shlex.quote` envuelve en `'…'`, y dentro de `"…"` esas comillas simples son literales, así que `$(…)` se ejecuta. Lo simulé con POSIX (`quote_path.__defaults__ = (False,)`) y el comando armado por `lint_cmd` pasado a `sh -c`:
   ```text
   python -c "import sys; print(ascii(sys.argv[1:]))" "'src/$(touch PWNED3).py'" -> ["'src/.py'"]
   -rw-r--r-- 1 Facundo 197121 0 Oct  2 20:13 PWNED3
   ```
   Además, en Windows la misma config arma `""src/a b.py""` y las rutas con espacios se rompen. Lo que se espera: `_validate` lanza `ConfigError` si `lint_file` contiene `"{file}"`, `'{file}'`, `"{files}"` o `'{files}'` (ej. «no pongas comillas alrededor de {file}: el arnés ya las pone»), con su test en `test_bordes.py`. Una línea en `harness.md` §2 que lo diga.

2. **[BAJA · C5] `harness/README.md:3` está modificado en el working tree pero no staged (`AM`).** La versión del índice dice «la suite corre en CI en Linux, macOS y Windows con 3.10 y 3.12», y el workflow nunca corrió. Si se commitea el índice tal como está, entra una afirmación de portabilidad sin evidencia (R30). La versión del working tree («probado en Windows con 3.11 y 3.14; el workflow … corre…») es la correcta. Lo que se espera: `git add harness/README.md`.

## Sugerencias (no bloquean)
- `checks.py:20,31-38`: cualquier línea que empiece con «Veredicto» cuenta, aunque sea prosa. Una línea `- Veredicto final: ver arriba` después del `**Veredicto:** APPROVED` de una re-review deja la tarjeta en FAIL, y lo mismo pasa con `APPROVED.` o `✅ APPROVED`:
  ```text
  == **Veredicto:** APPROVED.
  [FAIL]  sdd/cards/H-2.md: done pero sdd/progress/feat-stock/review_H-2.md no está en APPROVED
  == re-review + mención de 'Veredicto' en prosa
  [FAIL]  sdd/cards/H-2.md: done pero sdd/progress/feat-stock/review_H-2.md no está en APPROVED
  ```
  Es un falso positivo (ruidoso, no peligroso). Se podría contar solo las líneas cuyo valor contenga exactamente un token `APPROVED` o `CHANGES_REQUESTED`, ignorando la puntuación.
- `verify.py:85-88`: sin git, `--changed` dice «nada que testear» aunque haya código nuevo, porque no puede saber qué cambió. Sería más seguro correr `test_quick` con un WARN «sin git: no se puede saber qué cambió».
- `verify.py:117` y `hooks/claude.py:145`: en Windows, las herramientas hijas imprimen en la codepage de la consola y el arnés decodifica UTF-8, así que la evidencia sale con `canci�n.py`. Choca con «salida tal cual» (§4). Se podría intentar UTF-8 y, si falla, `locale.getpreferredencoding()`.
- `verify.py:151`: `--root=<ruta>` (con `=`) no se oculta en la primera línea. Es cosmético.
- No hay test de R32 (que `deploy` y `prod_readonly_query` nunca se ejecutan), aunque lo sugerí en la vuelta 1. Lo verifiqué a mano, pero vale la pena un test.
- Deuda declarada y aceptada: cuando vence el timeout en Windows, el proceso nieto no se mata.

## Mejoras al arnés detectadas
- Un test de configuración «hostil» que recorra plantillas de `lint_file` habituales (`{file}`, `"{file}"`, `'{file}'`, `{files}`) × nombres hostiles × `windows=True/False` y verifique, ejecutando con `sh -c` en POSIX, que no se crea ningún archivo centinela. Habría atrapado R1.
- Un check en `--quick` del paquete (o en el pre-commit del repo) que avise si un archivo está `AM`, porque se commitea una versión distinta de la revisada. Habría atrapado R2.
