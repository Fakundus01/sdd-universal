# Handback L-6 — El paquete usa su propio arnés: harness.config.json

- **Estado:** blocked
- **Rama / commit:** `v0.35-L-6b` @ 4c2e509 (base; el commit de entrega lleva este handback y `harness.config.json`)
- **Quién:** implementer (MEDIO)

## Hecho
- `harness.config.json` en la raíz: `master` = `SDD-MASTER.md`, `test` = `web/tests` + `harness/tests`, `e2e` = `dev/tests`, `base_branch`/`prod_branch` = `main`, `deploy` = `git push origin main` (documental). Sin claves desconocidas, sin copia del master en `sdd/`, sin tocar tarjetas ni `harness/`.
- Criterio 4 (nivel completo, solo la parte `test`): verde, 178 tests, OK (skipped=1), 75.8 s.

## No hecho / pendiente
- Criterio 3 (`--quick` sin FAIL) NO se cumple: quedan 7 FAIL, todos del chequeo de rutas citadas (`check_cited_paths`), no de la falta de config.
- Criterio 4 completo (`verify.py` sin ROJO) tampoco: mismos 7 FAIL.

## Por qué blocked
El chequeo de rutas citadas revisa `cited_paths_docs` (default: AGENTS.md, CLAUDE.md, sdd/testing.md, sdd/spec.md, sdd/sdd-lite.md) **más todas las tarjetas `done`**. Fallos:
- AGENTS.md y CLAUDE.md citan `sdd/SDD-MASTER.md` (CLAUDE.md lo cita como contraejemplo, «en un proyecto normal»).
- sdd/testing.md cita `sdd/sdd-lite.md`, `prompts/nuevo.md` (ejemplo) y `dev/.data/`.
- sdd/cards/L-7.md (done) cita `sdd/SDD-MASTER.md` dos veces.
Probé `cited_paths_docs: []` (descartado, no commiteado): quedan 2 FAIL, los de la tarjeta L-7. Las tarjetas `done` no se pueden excluir por config, y arreglarlas es tocar tarjetas (prohibido). Los demás arreglos exigen editar AGENTS.md / CLAUDE.md / testing.md (fuera de zona). Vaciar `cited_paths_docs` además debilitaría el chequeo sin resolver el problema. No improvisé.

## Cómo
- `test` encadena con `&&` las dos suites; el runner lo ejecutó bien.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| harness.config.json | nuevo |
| sdd/progress/v0.35-L-6b/ | current.md (autogenerado por verify) y este handback |

## Evidencia
Rojo antes (R29), base 4c2e509:
```text
$ git rev-parse --short HEAD
4c2e509
$ python harness/verify.py --quick
verify.py --quick @ 4c2e509 (rama v0.35-L-6b)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)

ROJO — 1 FAIL, 0 WARN
```

Después de crear la config:
```text
$ python harness/verify.py --quick
── Arnés ──
[OK]    Tarjetas válidas (6)
[FAIL]  Ruta citada que no existe: AGENTS.md → `sdd/SDD-MASTER.md`
[FAIL]  Ruta citada que no existe: CLAUDE.md → `sdd/SDD-MASTER.md`
[FAIL]  Ruta citada que no existe: sdd/testing.md → `sdd/sdd-lite.md`
[FAIL]  Ruta citada que no existe: sdd/testing.md → `prompts/nuevo.md`
[FAIL]  Ruta citada que no existe: sdd/testing.md → `dev/.data/`
[FAIL]  Ruta citada que no existe: sdd/cards/L-7.md → `sdd/SDD-MASTER.md`
[FAIL]  Ruta citada que no existe: sdd/cards/L-7.md → `sdd/SDD-MASTER.md`
[WARN]  e2e declarado pero sin ninguna corrida verde registrada en sdd/progress/e2e.md (corré `verify.py --e2e`): un E2E que nunca corrió no prueba nada

ROJO — 7 FAIL, 1 WARN

$ python harness/verify.py   (recortado con tail -30)
[FAIL] ... los mismos 7 ...
[WARN]  e2e declarado pero sin ninguna corrida verde registrada ...
── Lint ──
[WARN]  sin 'lint' en harness.config.json
── Tests ──
[OK]    test — `node --test "web/tests/*.test.mjs" && python -m unittest discover -s harness/tests` (75.8s): Ran 178 tests in 75.105s · OK (skipped=1)

ROJO — 7 FAIL, 2 WARN
```

WARN: e2e sin corrida registrada (necesita Postgres; fuera de esta tarjeta); sin `lint` (el paquete no tiene linter).

## Fuera de zona / riesgos
- Para dejar el verde hay que, o bien (a) corregir citas en AGENTS.md, CLAUDE.md, sdd/testing.md y sdd/cards/L-7.md (p. ej. `SDD-MASTER.md` sin `sdd/`, quitar `prompts/nuevo.md`/`dev/.data/` de backticks), o bien (b) darle al arnés una forma de ignorar citas (ej. clave de exclusión o `done` excluibles) — decisión del leader/owner.

## Cambios de spec sugeridos
- L-7 debería haber cubierto también `check_cited_paths` (resolver citas con la clave `master`, o permitir excluir tarjetas). Posible DRIFT.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Tarjeta del leader que ajuste las citas (opción a) o el chequeo (opción b); luego re-correr `verify.py --quick` y `verify.py`.
