# Review L-1 @ 2ede9cc
**Veredicto:** APPROVED

Base: `23b9298` (punto de partida de `v0.35-L-1`, la que declara el handback). Diff juzgado: `git diff 23b9298..2ede9cc`.

## Verificación re-ejecutada
Rojo en la base, medido por mí en un worktree desacoplado en `23b9298`:
```text
$ node --test "web/tests/*.test.mjs"
✖ N3: los conteos del README y de la web coinciden con los archivos
✖ la web tiene las mismas reglas que el master
ℹ pass 47
ℹ fail 2
```
En `2ede9cc`:
```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 49
ℹ pass 49
ℹ fail 0
ℹ skipped 0
$ python harness/verify.py --changed
verify.py --changed @ 2ede9cc (rama v0.35-L-1)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN
```
El FAIL de `verify.py` es idéntico en la base `23b9298` (lo re-ejecuté allí): el paquete nunca tuvo `harness.config.json`. Es del repo, no de la tarjeta, y está fuera de su zona.

## Criterios de aceptación
1. [x] `fail 0` re-ejecutado (49/49); los dos rojos de la base se ven fallar en `23b9298`.
2. [x] `web/reglas.js:38`: R33 `LOOP-CON-CONTRATO`, `def: "ON"`, `tipo: "desactivable"`, `nota: ""`, igual al encabezado de `SDD-MASTER.md:201` (`— [ON] — desactivable`, sin paréntesis). El test «la web tiene las mismas reglas que el master» lo evalúa por `vm` sobre `reglas.js` (id, nombre, def, tipo, nota) y sobre el tablero. `reglas-ui.js:85-99` habilita el interruptor para `tipo === "desactivable"`, así que sale desactivable en el configurador. Tablero: tag `ON` + `sw desactivable`, coherente.
3. [x] `grep` de `32 reglas`, `R01–R32`, `38 situaciones` y `\b32\b` en `web/`, `README.md`, `sdd-universal-tablero.html`: sin restos (solo números no relacionados: opacidades, tamaño de fuente, offsets de zip, «lección de 0.32»). `og.png`: la regeneré con `python web/og.py` y el resultado es byte a byte idéntico al commiteado (`cmp` sin diferencias), distinto del de la base; la imagen dice «33 reglas».
4. [x] `?v=35` uniforme en `index.html`, `admin.html`, `guia.html`, `demo.html` y el tablero; ningún `?v=` distinto queda en esas páginas. Única página que carga los JS tocados (`reglas`, `catalogo`, `inicio`, `manuales`): `web/index.html`. Subir todas las referencias de golpe es la convención que fija `rutas.test.mjs` (un solo valor por página).

## Checkpoints
- C1: [x] Suite de la web en verde re-ejecutada; `verify.py` rojo idéntico en la base por falta de `harness.config.json` (preexistente, fuera de zona, declarado en el handback).
- C2: [x] Cada criterio con evidencia; solo se tocaron `web/**`, `README.md`, el tablero y `sdd/progress/v0.35-L-1/` (handback y `current.md`, permitidos). Nada de otras features.
- C3: [x] Formato de `reglas.js` y del tablero idéntico al de R31/R32; el cambio 38→40 situaciones lo exige N3 y coincide con `scenarios.md`.
- C4: [x] Verificación re-ejecutada por mí (no copiada). Sin test nuevo, pero los dos tests que estaban rojos cubren exactamente el cambio (sincronía de campos con la §4 + conteos), y su rojo se midió con hash. Ningún test debilitado: el único cambio en `web/tests/rutas.test.mjs` es el pin `34.1` → `35` (líneas 79 y 95-99), misma aserción y mismo rigor.
- C5: [x] Handback completo y commiteado; `current.md` presente; sin archivos throwaway ni secretos; sin variables de entorno nuevas.

## Cambios requeridos
- Ninguno.

## Observaciones (no bloquean)
- `sdd/testing.md` y `sdd/changelog.md` citan `?v=34.1`: fuera de la zona del implementer; le toca al leader al cerrar la versión.
- El tablero sigue titulado «Tablero v0.31» con chip `v0.31 · 2026-10-03` (preexistente, no lo pide la tarjeta).

## Mejoras al arnés detectadas
- `verify.py --changed` no puede correr en el propio paquete por falta de `harness.config.json`: conviene commitear uno en la raíz que delegue en `node --test "web/tests/*.test.mjs"`, así C1 deja de depender de una excepción.
- Un test que valide que `web/og.png` está al día (p. ej. regenerar a un temporal y comparar, o guardar el número de reglas en un metadato PNG) cerraría el único criterio que hoy no tiene check automático.
