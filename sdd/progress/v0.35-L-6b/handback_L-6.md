# Handback L-6 — El paquete usa su propio arnés: harness.config.json

- **Estado:** done
- **Rama / commit:** `v0.35-L-6b` @ 1b29c5c (base verificada; el commit de entrega agrega este handback y e2e.md)
- **Quién:** implementer (MEDIO)

## Hecho
- `harness.config.json` en la raíz: `master` = `SDD-MASTER.md`, `test` = `web/tests` + `harness/tests`, `e2e` = `dev/tests`, `base_branch`/`prod_branch` = `main`, `deploy` = `git push origin main` (documental). Sin claves desconocidas, sin copia del master en `sdd/`, sin tocar tarjetas ni `harness/`.
- `verify.py --quick`: 0 FAIL, 0 WARN. `verify.py` completo: 0 FAIL; `test` verde (178 tests, skipped=1). `verify.py --e2e` verde (`dev/tests`), registrado en `sdd/progress/e2e.md`.

## No hecho / pendiente
- Nada. WARN restante del nivel completo: «sin 'lint' en harness.config.json» (el paquete no tiene linter; no es un FAIL ni lo pide la tarjeta).

## Cómo
- `test` encadena con `&&` las dos suites; el runner lo ejecuta bien.
- Las 7 citas rotas las corrigió el leader (merge en la rama); yo no toqué nada fuera de la zona.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| harness.config.json | nuevo |
| sdd/progress/e2e.md | registro de la corrida e2e verde (lo escribe verify.py) |
| sdd/progress/v0.35-L-6b/ | current.md (autogenerado) y este handback |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1, 2 | `harness.config.json` (sin claves desconocidas; `master` = `SDD-MASTER.md`; `sdd/` sin copia) |
| 3 | `verify.py --quick` → VERDE 0 FAIL 0 WARN |
| 4 | `verify.py` → `test` OK, 178 tests |

Rojo antes (R29), base 4c2e509:
```text
$ git rev-parse --short HEAD
4c2e509
$ python harness/verify.py --quick
verify.py --quick @ 4c2e509 (rama v0.35-L-6b)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)

ROJO — 1 FAIL, 0 WARN
```

Verde después (base con las citas corregidas, 1b29c5c):
```text
$ python harness/verify.py --quick   (antes del e2e)
verify.py --quick @ 1b29c5c (rama v0.35-L-6b)
[OK]    Rutas citadas existen (81 revisadas)
[WARN]  e2e declarado pero sin ninguna corrida verde registrada en sdd/progress/e2e.md (corré `verify.py --e2e`)
VERDE — 0 FAIL, 1 WARN

$ python harness/verify.py --e2e   (tail -15)
[OK]    Rutas citadas existen (81 revisadas)
[WARN]  sin 'lint' en harness.config.json
[OK]    test — `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests` (75.2s): Ran 178 tests in 74.451s · OK (skipped=1)
[OK]    e2e — `node --test "dev/tests/*.test.mjs"` (14.0s)
VERDE — 0 FAIL, 1 WARN

$ python harness/verify.py --quick   (después del e2e)
[OK]    Rutas citadas existen (81 revisadas)
VERDE — 0 FAIL, 0 WARN

$ python harness/verify.py   (tail -15)
[OK]    Rutas citadas existen (81 revisadas)
[WARN]  sin 'lint' en harness.config.json
[OK]    test — ... (75.2s): Ran 178 tests in 74.445s · OK (skipped=1)
VERDE — 0 FAIL, 1 WARN
```

## Fuera de zona / riesgos
- `sdd/progress/e2e.md` queda commiteado: sin él, `--quick` vuelve a dar el WARN del e2e en un clon limpio.

## Cambios de spec sugeridos
- Ninguno pendiente (el DRIFT de `check_cited_paths` lo resolvió el leader corrigiendo las citas).

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Review de L-6.

## Apéndice: vueltas
- Vuelta 1 (1fca037): `blocked`. Con la config creada quedaban 7 FAIL de `check_cited_paths` (citas a `sdd/SDD-MASTER.md`, `sdd/sdd-lite.md`, `prompts/nuevo.md`, `dev/.data/` en AGENTS.md, CLAUDE.md, sdd/testing.md y la tarjeta L-7), fuera de zona. El leader las corrigió.
- Vuelta 2: re-corrida de `--quick`, `--e2e`, `--quick`, completo; todo verde.
