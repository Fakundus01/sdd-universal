# Handback L-1 — Sumar R33 a la web y a los conteos de reglas

- **Estado:** done
- **Rama / commit:** `v0.35-L-1` @ ver `git log -1` de la rama (el hash propio no puede ir dentro del commit; base `23b9298`)
- **Quién:** implementer (sonnet)

## Hecho
- R33 LOOP-CON-CONTRATO en `web/reglas.js` (ON, desactivable, misma nota vacía que el master) y en el tablero (tag `sw`, como las otras desactivables).
- «32 reglas» → «33» (y R01–R32 → R01–R33) en README, tablero, `catalogo.js`, `index.html`, `inicio.js`, `manuales.js`.
- «38 situaciones» → «40» en `catalogo.js` (el master/scenarios ya tiene 40; era el segundo rojo de N3).
- `web/og.png` regenerada con `python web/og.py` («33 reglas»).
- `?v=34.1` → `?v=35` en index, admin, guia, demo y tablero (tocados `reglas.js`, `catalogo.js`, `inicio.js`, `manuales.js`).

## No hecho / pendiente
- `python harness/verify.py --changed` falla con «falta harness.config.json en la raíz»: pasa igual sobre la base (23b9298), es del entorno del repo, no de la tarjeta (el archivo está fuera de mi zona).

## Cómo
- No hizo falta test nuevo: los dos tests ya rojos (sincronía con el master y N3) cubren R33 (id, nombre, def, tipo, nota contra la §4) y los conteos. Rojo medido sobre la base.
- La convención `?v=` está fijada por `rutas.test.mjs` («cache-busting»); lo actualicé a `35` (está en `web/tests`, mi zona).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| web/reglas.js | +R33 |
| sdd-universal-tablero.html | +R33, conteos, ?v=35 |
| README.md | 33 reglas |
| web/catalogo.js, web/inicio.js, web/manuales.js, web/index.html | conteos 33 / 40 situaciones |
| web/index.html, admin.html, guia.html, demo.html | ?v=35 |
| web/og.png | regenerada |
| web/tests/rutas.test.mjs | pin de ?v= de 34.1 a 35 |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1 | `node --test "web/tests/*.test.mjs"` → pass 49, fail 0 |
| 2 | test «la web tiene las mismas reglas que el master» (evalúa `web/reglas.js` contra la §4) |
| 3 | `grep "32 reglas\|R01–R32"` en web, README, tablero: sin resultados; og.png regenerada («33 reglas») |
| 4 | test «cache-busting en ?v=35» |

Rojo antes (R29), medido contra la base:
```text
$ git rev-parse --short HEAD
23b9298
$ node --test "web/tests/*.test.mjs"
ℹ tests 49
ℹ pass 47
ℹ fail 2
✖ N3: los conteos del README y de la web coinciden con los archivos
✖ la web tiene las mismas reglas que el master   (falta R33 en reglas.js)
```

Verde después:
```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 49
ℹ pass 49
ℹ fail 0
$ python harness/verify.py --changed
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)
ROJO — 1 FAIL, 0 WARN     (igual sobre la base 23b9298: del entorno)
```

## Fuera de zona / riesgos
- Falta `harness.config.json` en la raíz del paquete (verify.py no corre).
- `sdd/testing.md` y `sdd/changelog.md` mencionan `?v=34.1`; el leader decide si actualizarlos.

## Cambios de spec sugeridos
- `sdd/testing.md`: el pin de `?v=` pasó a 35.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Tarjetas siguientes del grafo.
