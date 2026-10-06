# Handback C-11 — El ZIP de la web reescribe los links de los MD que empaqueta

- **Estado:** done
- **Rama / commit:** `v0.36-C-11` @ `959670f` (código y tests; el handback va en el commit siguiente). Base: `1559dae`
- **Quién:** implementer (MEDIO) | sesión C-11

## Hecho
- `Paquete.reescribirLinks(texto, origen, destino, mapa)` y `Paquete.enlazar(archivos)` en `web/paquete.js`. Cada archivo del ZIP declara su `origen` (ruta en el paquete); al final `enlazar` arma el mapa origen→ruta en el ZIP y reescribe cada link relativo a `.md` de cada MD empaquetado: destino incluido → ruta relativa dentro del ZIP (ancla conservada); destino excluido (o fuera del paquete) → solo el texto. Externos (`http`, `mailto`…), anclas puras, archivos no `.md`, bloques de código (con indentación) y code spans no se tocan. Genérico: no sabe qué links hay, funciona con cualquier set. Lo usan `proyecto` y `soloMd`.
- `web/md.js`: el texto de un link no admite `[`, así que el link anidado en `[ … ]` de `SDD-MASTER.md:77` se ve como en GitHub.
- `?v=36` → `?v=37` en `index/admin/guia/demo.html` (md.js y paquete.js se sirven desde index) y en `rutas.test.mjs` (que fija la versión).
- `paquete.test.mjs` (H4, sdd-lite) comparaba el MD byte a byte con el repo: ahora compara el texto sin los destinos de los links `.md` (el ZIP los reescribe a propósito).

## No hecho / pendiente
- `soloMd` (sdd-archivos.zip) queda con `harness/` y demás fuera, como antes: los links a lo que no viene pasan a texto.

## Cómo
- Se resuelve contra el origen del paquete y se reescribe contra el nombre en el ZIP, así un mismo MD sirve en los tres layouts. `custom.md` generado tiene `origen: "custom.md"`, y el link del master lo resuelve cuando existe.
- Alternativa descartada: reescribir por tabla fija de rutas (no sería genérica).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `web/paquete.js` | `reescribirLinks`, `enlazar`, `origen` por archivo, exportadas |
| `web/md.js` | texto de link sin `[` |
| `web/tests/paquete-links.test.mjs` | nuevo: los tres ZIP con MD reales, 0 rotos |
| `web/tests/paquete-reescritura.test.mjs` | nuevo: 8 unitarios (reescritura + visor) |
| `web/tests/paquete.test.mjs`, `web/tests/rutas.test.mjs` | H4 compara texto; `?v=37` |
| `web/{index,admin,guia,demo}.html` | `?v=37` |
| `sdd/progress/v0.36-C-11/` | current.md y este handback |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1. reescritura | `reescribirLinks`/`enlazar` + unitarios |
| 2. 0 rotos en los tres ZIP | `paquete-links.test.mjs` |
| 3. unitarios (incluido, excluido, ancla, externo, código, corchetes) | `paquete-reescritura.test.mjs` |
| 4. visor | test «visor: un link dentro de un [ … ]» |
| 5. suite, smoke, `?v=` | abajo |

Rojo antes (R29), medido contra la base (el test se commiteó solo en `8f960b2`, sobre `1559dae`, sin tocar código):
```text
$ git rev-parse --short HEAD   # 1559dae (+ test)
$ node --test web/tests/paquete-links.test.mjs
# proyecto completo (PRO): 72 rotos de 149
# proyecto mínimo (NOVATO): 53 rotos de 86
# sdd-archivos.zip (soloMd): 55 rotos de 130
ℹ tests 3 · pass 0 · fail 3
```
Los unitarios y el del visor fallaban todos antes (`reescribirLinks` no existía; el visor dejaba el `[`).

Conteos de links `.md` relativos rotos por ZIP (mi chequeo propio, fuera de código; el total baja porque los links a lo que no viene pasan a texto):

| ZIP | Antes (rotos / total) | Después |
|---|---|---|
| proyecto completo (PRO, todo) | 72 / 149 | 0 / 91 |
| proyecto mínimo (NOVATO) | 53 / 86 | 0 / 33 |
| sdd-archivos.zip | 55 / 130 | 0 / 75 |

Verde después:
```text
$ node --test "web/tests/*.test.mjs"
ℹ tests 60 · pass 60 · fail 0
$ node web/tests/smoke/smoke.mjs
PASS smoke: 22 pasos, 0 errores de consola
$ python harness/verify.py --quick   @ 959670f
[FAIL]  sdd/cards/C-11.md: in_progress pero depende de C-10, que está in_progress (despacho fuera de orden...)
[OK]    Rutas citadas existen (184 revisadas)
ROJO — 1 FAIL, 0 WARN
```
El único FAIL de `verify --quick` es el orden de despacho (C-11 depende de C-10, que sigue en curso): no es del código; se resuelve cuando C-10 pase a done. Nada más falla.

Mutantes (uno por vez, suite completa `web/tests` con `subprocess.run(timeout=180)`, tests/pass/fail por corrida; base 60/60/0):

| # | Mutante | Corrida | Resultado |
|---|---|---|---|
| M1 | excluido: deja el link en vez del texto | 60/52/8 | muerto |
| M2 | incluido: no reescribe | 60/55/5 | muerto |
| M3 | se pierde el ancla | 60/59/1 | muerto |
| M4 | externo se toca (sin chequeo de esquema) | 60/59/1 | muerto |
| M5 | chequeo de ancla pura (`#`) fuera | 60/60/0 | sobrevive: equivalente, un `#x` sin ruta no termina en `.md` y el filtro de extensión lo deja igual |
| M6 | bloque de código se reescribe | 60/59/1 | muerto |
| M7 | code span se reescribe | 60/59/1 | muerto |
| M8 | texto sin un nivel de corchetes anidado | 60/59/1 | muerto |
| M9 | relativa siempre desde la raíz del ZIP | 60/53/7 | muerto |
| M10 | `enlazar` con mapa vacío | 60/56/4 | muerto |
| M11 | visor: el texto admite `[` | 60/59/1 | muerto |
| M12 | se reescriben también no-`.md` | 60/59/1 | muerto |
| M13 | fence indentado no se reconoce | 60/59/1 | muerto |

## Fuera de zona / riesgos
- `sdd-universal-tablero.html` (raíz) todavía dice `?v=36` en algo suyo; no es de la web servida, no se tocó.
- Si C-10 agrega links a un `.md` que viaja, se reescriben solos; si agrega links a `.txt` o carpetas, no se tocan (no son `.md`).
- Windows: los archivos tienen CRLF en disco (autocrlf); edité preservando eso.

## Cambios de spec sugeridos
- Ninguno.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Review independiente con mutantes propios; después, que C-10 cierre y se re-corra `verify.py --quick`.
