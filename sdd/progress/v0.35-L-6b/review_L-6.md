# Review L-6 @ b0c8bbb
**Veredicto:** APPROVED

Revisado: `git diff 4c2e509..b0c8bbb` (config de L-6 + commit del leader `a3e60f4` que reescribe citas). `harness/` no aparece en el diff; ninguna copia del master en `sdd/` (`ls sdd/`: README, cards, changelog, contracts, costs, decisions, design, loops, progress, security, spec, status, testing).

## Verificación re-ejecutada
```text
$ python harness/verify.py --quick
verify.py --quick @ b0c8bbb (rama v0.35-L-6b)
[OK]    Memoria en disco: sdd/progress/v0.35-L-6b/current.md
[OK]    Tarjetas válidas (6)
[OK]    Rutas citadas existen (81 revisadas)
VERDE — 0 FAIL, 0 WARN

$ python harness/verify.py --e2e
[OK]    Rutas citadas existen (81 revisadas)
[WARN]  sin 'lint' en harness.config.json
[OK]    test — `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests` (76.3s): Ran 178 tests in 75.592s · OK (skipped=1)
[OK]    e2e — `node --test "dev/tests/*.test.mjs"` (13.6s): ℹ skipped 0 · ℹ todo 0 · ℹ duration_ms 13525.7721
VERDE — 0 FAIL, 1 WARN
(la línea que agregó a sdd/progress/e2e.md — `@ b0c8bbb — e2e verde` — se revirtió: el reviewer no edita docs)

$ python harness/verify.py
[OK]    Rutas citadas existen (81 revisadas)
[WARN]  sin 'lint' en harness.config.json
[OK]    test — `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests` (75.5s): Ran 178 tests in 74.802s · OK (skipped=1)
VERDE — 0 FAIL, 1 WARN
```

### Rojo forzado en cada suite (archivos temporales, borrados después; `git status` limpio)
```text
# web/tests/zz-roto-review.test.mjs con assert.strictEqual(1, 2)
$ python harness/verify.py   → ... ERR_ASSERTION actual: 1 expected: 2 ... ROJO — 1 FAIL, 1 WARN  (exit 1)

# harness/tests/test_zz_roto_review.py con assertEqual(1, 2)
$ python harness/verify.py
[FAIL]  test — `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests` salió con 1 (75.6s):
FAIL: test_roto (test_zz_roto_review.Roto.test_roto)
Ran 179 tests in 74.940s
FAILED (failures=1, skipped=1)
ROJO — 1 FAIL, 1 WARN  (exit 1)
```
Las dos suites corren de verdad y un rojo en cualquiera da ROJO (en la de Python también corrió antes la de Node, o sea el `&&` no corta en verde).

### Chequeo de rutas citadas no debilitado (cita rota temporal en `sdd/testing.md`, revertida)
```text
$ python harness/verify.py --quick
[FAIL]  Ruta citada que no existe: sdd/testing.md → `web/no-existe-review.js`
[FAIL]  Ruta citada que no existe: sdd/testing.md → `sdd/SDD-MASTER.md`
[FAIL]  Ruta citada que no existe: sdd/testing.md → `prompts/nuevo.md`
[FAIL]  Ruta citada que no existe: sdd/testing.md → `dev/.data/`
[FAIL]  Ruta citada que no existe: sdd/testing.md → `noexiste_review.py` (en una tabla: no hay ningún archivo con ese nombre)
ROJO — 5 FAIL, 0 WARN
```
Las citas originales siguen dando FAIL si alguien las vuelve a escribir sin prefijo: el leader no tocó `harness/checks.py` ni `cited_paths_docs`; solo marcó como genéricas (`<proyecto>/`, `<repo>/`, `prompts/<inexistente>.md`, «la carpeta `.data` de `dev/`») las rutas que no son de este repo, usando el `SKIP_CHARS` que ya existía.

### Procesos colgados
Antes y después de las corridas, los únicos `postgres.exe`/`node.exe` de la sesión son tres preexistentes del 2026-10-05 (cluster `Temp/revs-dev-IYTLgR/pg` :54361, `node dev/dev.mjs` y su cluster `sdd-universal/dev/.data/pg` :54329), ninguno de este worktree. `verify.py --e2e` no dejó procesos.

## Criterios
1. [x] `harness.config.json`: `test` = `web/tests` + `harness/tests`, `e2e` = `dev/tests`, `base_branch`/`prod_branch` = `main`, `deploy` = `git push origin main` (documental), sin claves desconocidas (`--quick` no avisa ninguna; todas en `KNOWN_KEYS`).
2. [x] `"master": "SDD-MASTER.md"`; sin copia en `sdd/`.
3. [x] `--quick` 0 FAIL, 0 WARN (con `sdd/progress/e2e.md` commiteado). El WARN de lint del nivel completo está en el handback con su porqué.
4. [x] Completo verde, `test` corre las dos suites (rojo forzado en cada una).
5. [x] Sin tocar `harness/`; el bloqueo de la vuelta 1 se dio como `blocked` y lo resolvió el leader fuera de la zona.
- `sdd/progress/e2e.md` registra `2026-10-06 @ 1b29c5c — e2e verde`: hash real (commit existente; `1b29c5c..b0c8bbb` solo agrega handback y e2e.md, sin código), y la corrida se reprodujo verde en b0c8bbb.
- R29: rojo con hash de base (4c2e509, `[FAIL] falta harness.config.json`) pegado en el handback.

## Commit del leader a3e60f4 (citas)
- `AGENTS.md`/`CLAUDE.md` (idénticos, siguen idénticos): «en un proyecto normal la ruta sería `<proyecto>/sdd/SDD-MASTER.md`» — mismo significado.
- `sdd/cards/L-7.md`: default `<repo>/sdd/SDD-MASTER.md` — mismo significado (ruta relativa a la raíz del repo que usa el arnés).
- `sdd/testing.md`: `prompts/<inexistente>.md` y «la carpeta `.data` de `dev/`» conservan el sentido.

## Checkpoints
- C1: [x] `--quick` en 0, rutas citadas OK (81).
- C2: [x] cada criterio con evidencia; el implementer solo tocó `harness.config.json` (+ e2e.md que escribe verify.py, handback y current.md).
- C3: [x] config según `harness.md` §2 y la plantilla; sin cambios de diseño.
- C4: [x] re-ejecuté los tres niveles; el cambio es config y lo cubren los rojos forzados en ambas suites; nada skipeado nuevo (el `skipped=1` es preexistente de harness/tests).
- C5: [x] handback completo y commiteado, `current.md` presente, sin throwaway ni secretos, sin variables de entorno nuevas.

## Cambios requeridos
Ninguno.

## Observaciones (no bloquean)
1. `sdd/testing.md:22` — «`.gitattributes` junta `sdd/changelog.md` y `<proyecto>/sdd/sdd-lite.md`»: las dos rutas son del proyecto que recibe el `.gitattributes` (este repo no tiene `.gitattributes`), pero solo una lleva prefijo; `sdd/changelog.md` pasa el chequeo porque coincide con el changelog de la web. Para el lector se lee como si fueran de dos repos distintos. Sugerido: `<proyecto>/sdd/changelog.md` también.
2. Mezcla de prefijos `<proyecto>/` (AGENTS, CLAUDE, testing) y `<repo>/` (L-7). Elegir uno.

## Mejoras al arnés detectadas
- `harness/tests` deja carpetas en `%TEMP%` después de cada corrida (`v_*`, `repo_*`, `outside_*`, `alias_*`, `real_*`, `tmp*` con hora de mis corridas): algún test con `mkdtemp` sin limpieza. No es de L-6; para el prompter.
- El resumen de `test` en `verify.py` muestra solo la última línea útil (la de unittest): con un `&&` de dos suites, el OK no deja ver cuántos tests de Node corrieron. Un resumen por suite haría más visible que las dos corren.
