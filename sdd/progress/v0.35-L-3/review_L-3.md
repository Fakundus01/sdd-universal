# Review L-3 @ 1975704
**Veredicto:** CHANGES_REQUESTED

Base `4e09c8d`, revisado `1975704` (cambios de los espejos en `83d0d01`). Diff real: `SDD-MASTER-EN.md` (+23/−14), `SDD-COMPACT-EN.md` (+2/−2) y el handback. Nada fuera de la zona de archivos.

## Verificación re-ejecutada
```text
$ python harness/verify.py --changed
verify.py --changed @ 1975704 (rama v0.35-L-3)
[FAIL]  falta harness.config.json en la raíz (plantilla: harness/harness.config.example.json)

ROJO — 1 FAIL, 0 WARN
$ python harness/verify.py --quick
(mismo FAIL, exit=1)
$ git ls-tree 4e09c8d --name-only | grep -c harness.config.json
0
```
El rojo es preexistente (la base tampoco tiene `harness.config.json`) y no lo causa esta tarjeta.

Script de comparación propio (en el scratchpad, fuera del repo; no es el del handback). Compara secciones, versión, IDs de regla en orden, default/tipo por regla, refs R/S/§ por regla, backticks por regla, filas y primera columna de §2, filas, versiones y fechas de §11, árbol de §5, casillas de §10, cantidad y líneas de cada bloque de código por sección, filas de tablas y refs Rxx por sección. En el compact compara IDs en orden, líneas, refs R y archivos citados línea por línea. Resultado (sin las líneas OK):
```text
FAIL col1 §2            <- solo traducción (20 = 20 filas, mismo orden): esperado
FAIL arbol §5           <- solo <nombre>/<usuario>/<rama> traducidos; mismas 42 entradas en el mismo orden: esperado
FAIL   §6 bloque 0 lineas   ES=15  EN=19   <- HALLAZGO 1
FAIL   §6 bloque 1 lineas   ES=11  EN=10   <- solo reflow del párrafo, mismo contenido
FAIL compact ids        <- R27 va antes que R26 en el canónico y no en el espejo (HALLAZGO 3)
FAIL compact linea 35/36 <- lo mismo
INFO Rxx backticks      <- solo placeholders traducidos (<user>, <path>, NOVICE, SDD-COMPACT-EN.md en R22)
OK   secciones, version 0.35/0.35, 33 reglas con mismo ID/orden/default/tipo, refs R/S/§ de las 33 reglas,
     filas §2 (20) y §11 (6) con mismas versiones y fechas, historial-master.md citado, 11 casillas en §10,
     bloques de código §5/§7 idénticos en líneas, compact v0.35 y 52 líneas.
```

Muestreo a mano del significado (EN contra el ES actual): R04, R05, R11, R12, R16, R17, R19, R20, R22, R27, R28, R29, R30, R31, R32, R33, y §0–§3, §4 intro, §5 (cierre), §7–§11. Las sumas de 0.31–0.34 están todas y bien traducidas: R12 (N4 + playbook, «reserva, no chequeo»), R17 (datos de terceros en `security.md`), R18 (plantilla `prompts/sdd-lite.md`), R28 (versión contra el registro), R29 (stub que importa; el error de import no es rojo). R33 es fiel. §7 suma la aclaración de R33, §11 tiene la tabla 0.35→0.32 completa y fiel. No encontré nada inventado en las reglas.

## Checkpoints
- C1: [ ] ← `verify.py --quick` en rojo por la falta de `harness.config.json`. Es preexistente y está fuera de la zona: no se le imputa a L-3, pero el reviewer no puede marcarla. Lo resuelve el leader (o se declara la excepción del paquete).
- C2: [ ] ← objetivo «espejo fiel» y criterio 2 («traducido del canónico actual, no del EN viejo»): queda texto del EN viejo en §6.1 (hallazgo 1). Zona de archivos respetada.
- C3: [x] (no aplica código; estilo de traducción del EN conservado)
- C4: [x] re-ejecuté `verify.py` y un script propio; el rojo del implementer se midió contra la base con hash (`4e09c8d`).
- C5: [x] handback completo y commiteado, sin archivos throwaway en el repo.

## Cambios requeridos
1. `SDD-MASTER-EN.md:277-279` (§6.1, bloque del START-PROMPT greenfield): sobra el párrafo «Note: I dictate my messages by voice, so if any word doesn't make sense (especially tool names), quote it back and ask me what I meant instead of assuming (R04).» El §6.1 del canónico (`SDD-MASTER.md:269-284`) ya no lo tiene, porque la idea vive en R04 (`SDD-MASTER.md:103`, que el espejo ya traduce en la línea 103). Es texto del EN viejo (estaba igual en `4e09c8d`). Hay que borrar ese párrafo y su línea en blanco para que el bloque quede con la misma estructura que el canónico.
2. `SDD-MASTER-EN.md:228` (árbol §5): el comentario dice «acceptance, state and depends_on», pero el campo real del frontmatter es `depende_de` (`SDD-MASTER.md:229`, y el propio `SDD-COMPACT-EN.md:48` lo deja como `depende_de=graph`). Un agente que lea solo el espejo podría escribir `depends_on` en la tarjeta y el grafo no lo encontraría. Hay que dejar `depende_de` sin traducir, con o sin glosa («depende_de (depends on)»).

## Menores (no bloquean, conviene resolverlos en la misma pasada)
3. `SDD-COMPACT-EN.md:35-36`: el canónico lista R27 antes que R26 (`SDD-COMPACT.md:35-36`) y el espejo las tiene en orden numérico. El contenido es igual. Es preexistente y cosmético; alinear el orden o anotarlo.
4. `SDD-MASTER-EN.md` R27: al espejo le falta la línea en blanco entre los dos párrafos que tiene el canónico (`SDD-MASTER.md`, entre «…con fecha.» y «Un checklist de 200 ítems…»). Es preexistente.
5. R33 dice «can be disabled» y el resto de las reglas desactivables dice «can be turned off» o «toggleable». La mezcla ya venía en el EN; unificar si se toca.

## Mejoras al arnés detectadas
- El script del implementer solo compara tokens de archivo y conteos, así que no ve texto sobrante dentro de los bloques de código. Para atrapar el hallazgo 1 alcanzaba con sumar «cantidad de líneas por bloque de código y por sección» (el mío lo marcó en §6). Valdría tenerlo como check permanente de espejos en `verify.py`.
- Un check que exija que los nombres de campo de frontmatter (`depende_de`, `rama`, `estado`) aparezcan literales en el espejo.
