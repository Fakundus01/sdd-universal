# Handback L-8 — el smoke acusa de vacíos a los .gitkeep

- **Estado:** done
- **Rama / commit:** `v0.37-L-8` @ `c73735f` (código; el commit del handback le sigue en la misma rama)
- **Quién:** implementer (medio)

## Hecho
- `web/tests/smoke/smoke.mjs`: el paso de la descarga rápida separa marcadores (`.gitkeep`, deben estar vacíos) de archivos con contenido (no pueden estarlo). Las dos fallas listan los nombres de los archivos culpables.
- `harness/verify.py`: WARN en `--full` y `--changed` (no en `--quick`) mientras exista `web/tests/smoke/smoke.mjs`, con el comando para correrlo. Dos tests nuevos en `harness/tests/test_verify.py`.
- `sdd/testing.md`: documentado el WARN, que hay que correr el smoke al cerrar una tarjeta que toque `web/`, y la regla marcador/contenido.

## No hecho / pendiente
- Nada de la tarjeta. El smoke no se metió en `verify.py`, como pedía.

## Cómo
- Marcador = último segmento del nombre igual a `.gitkeep` (sin regex: el script del paso viaja como template string a Chrome y los escapes se comían la regex; el primer intento dio `SyntaxError` en el smoke y se cambió a `split("/").pop()`).
- El WARN se activa por existencia del archivo del smoke, así que proyectos generados sin él no ven ruido.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| web/tests/smoke/smoke.mjs | assert nuevo con nombres |
| harness/verify.py | `_smoke_aviso()` + constante `SMOKE` |
| harness/tests/test_verify.py | 2 tests (avisa en full/changed y no en quick; sin smoke no avisa) |
| sdd/testing.md | párrafo nuevo tras «Cierra D2» |
| graph/harness.md, graph/sdd.md, graph/web.md | solo la línea de hash, por `sync_graph.py --update --accept` (el pre-commit lo exigía; ver «Fuera de zona») |
| sdd/progress/v0.37-L-8/current.md | memoria de la rama |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1 y 2 | mutantes M1 y M2 abajo: cada uno da rojo con el nombre del archivo |
| 3 | los tres rojos/verde medidos abajo |
| 4 | `test_avisa_que_el_smoke_no_corre_aca_si_el_proyecto_lo_tiene` y `test_sin_smoke_no_hay_aviso`; párrafo en `sdd/testing.md` |
| 5 | sin dependencias nuevas |

Rojo antes (R29), base `ff86f90`:
```text
$ git rev-parse --short HEAD
ff86f90
$ node web/tests/smoke/smoke.mjs | tail -3
ok   descarga rápida: «Proyectos» trae cards con ZIP

FAIL smoke: descarga rápida: el popup baja la carpeta del proyecto: hay archivos vacíos (21 pasos ok antes)
```
Rojo del test del WARN antes de implementarlo (base `ff86f90`, solo el test nuevo):
```text
AssertionError: 'node web/tests/smoke/smoke.mjs' not found in 'verify.py --full @ 25141f3 (rama main)\n\n── Arnés ──
[OK] ... [WARN]  sin 'lint' en harness.config.json ... VERDE — 0 FAIL, 1 WARN\n'
FAILED (failures=1)
```

Mutante M1: `traer()` de `web/paquete.js` devuelve `""` para `harness.md` (simula el 404); restaurado con `git checkout -- web/paquete.js`:
```text
ok   descarga rápida: «Proyectos» trae cards con ZIP

FAIL smoke: descarga rápida: el popup baja la carpeta del proyecto: archivos vacíos que no son marcadores: web-app-full-stack/sdd/harness.md (21 pasos ok antes)
```
Mutante M2: los `.gitkeep` con contenido `"x"`; restaurado igual:
```text
ok   descarga rápida: «Proyectos» trae cards con ZIP

FAIL smoke: descarga rápida: el popup baja la carpeta del proyecto: marcadores .gitkeep con contenido: web-app-full-stack/material-cliente/imgs/.gitkeep, web-app-full-stack/material-cliente/logo/.gitkeep, web-app-full-stack/material-cliente/tipografias/.gitkeep, web-app-full-stack/material-cliente/disenos/.gitkeep, web-app-full-stack/material-cliente/documentos/.gitkeep, web-app-full-stack/material-cliente/flujo/.gitkeep, web-app-full-stack/material-cliente/arquitectura/.gitkeep (21 pasos ok antes)
```
Código real (verde):
```text
ok   descarga rápida: «Proyectos» trae cards con ZIP
ok   descarga rápida: el popup baja la carpeta del proyecto

PASS smoke: 22 pasos, 0 errores de consola
```
`python harness/verify.py` (completo):
```text
[WARN]  el smoke del navegador NO corre en verify.py: un verde acá no lo cubre. Corrélo aparte antes de cerrar: node web/tests/smoke/smoke.mjs
[WARN]  sin 'lint' en harness.config.json
[OK]    test — ... (149.5s): Ran 241 tests in 10.866s · OK (skipped=3)

VERDE — 0 FAIL, 2 WARN
```
`web/paquete.js` quedó sin diff (`git status` limpio de él tras cada mutante).

## Costo
| Rol | Modelo | Vuelta | Tokens | Costo USD | Duración |
|---|---|---|---|---|---|
| implementer | sonnet | 1 | 80 759 (total) | n/d | 6 min 7 s · 30 llamadas a herramientas |
| reviewer | sonnet | 1 | 66 793 (total) | n/d | 4 min 31 s · 11 llamadas a herramientas |

Tokens y duración: del aviso de fin de cada corrida, que da un total y no separa entrada/salida. **USD `n/d` por decisión del leader:** la herramienta no informa el costo y sin el corte entrada/salida no se estima (R22). Las dos filas las completó el leader al recibir el handback.

## Fuera de zona / riesgos
- `graph/{harness,sdd,web}.md`: el pre-commit bloquea si el grafo está desactualizado; corrí `sync_graph.py --update --accept` (solo cambia la línea de hash, sin tocar prosa). Si el leader quiere prosa nueva en esos nodos, es suya.
- El WARN aparece en todo `verify.py` completo de este repo (queda en 2 WARN en vez de 1): es lo pedido.

## Cambios de spec sugeridos
- Ninguno.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Reviewer (R30): re-ejecutar los dos mutantes y el smoke.
