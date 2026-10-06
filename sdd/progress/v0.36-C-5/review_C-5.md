# Review C-5 @ 51767ab

**Veredicto:** CHANGES_REQUESTED

Base `6c1a023`, diff revisado `git diff 6c1a023..51767ab` (8 archivos: `cerebro/importar.py` nuevo, `cerebro/cerebro.py`, `cerebro/notas.py`, `cerebro/indice.py`, 3 archivos de `cerebro/tests/`, `sdd/progress/v0.36-C-5/current.md`; el handback entra en `97cd458`).

## Verificación re-ejecutada
```text
$ python -m unittest discover -s cerebro/tests -v   (Python 3.14.0, tail)
test_sin_ascii_lleva_sufijo_determinista_y_no_choca (test_notas.TestSlug...) ... ok
----------------------------------------------------------------------
Ran 99 tests in 2.347s
OK
$ py -3.11 -m unittest discover -s cerebro/tests
Ran 99 tests in 2.240s
OK
$ python harness/verify.py --changed   (tail)
[OK]    Tarjetas válidas (13)
[FAIL]  Ruta citada que no existe: sdd/cards/C-2.md → `cerebro/requirements.txt`
ROJO — 1 FAIL, 0 WARN
```
El FAIL es previo y ajeno: aparece igual en `main` (`ee88d3f`); `cerebro/requirements.txt` es de C-3. No cuenta contra C-5.

## Corrida real (CLI, `CEREBRO_DIR` en el scratchpad, `CEREBRO_EMBEDDINGS=falso`)
```text
$ cerebro.py importar-sdd .
importadas: 42 escenario, 26 hallazgo, 3 leccion
71 nuevas, 0 actualizadas, 0 sin cambios, 0 editadas a mano (no se pisaron)      rc=0
$ cerebro.py revisar
71 nota(s) revisadas, 0 error(es).                                              rc=0
$ cerebro.py importar-sdd .        # 2.ª corrida
0 nuevas, 0 actualizadas, 71 sin cambios, 0 editadas a mano (no se pisaron)     rc=0
```
- Conteo propio: `scenarios.md` tiene 42 filas `| Sxx |` (sin ids repetidos; S24/S25 invertidas en el orden, da igual) y `examples/hallazgos-2026-10.md` 26 filas `| Hn |`. Coincide.
- Fidelidad: en vez de 5 notas al azar comparé **las 68** (42 + 26) con un separador de celdas propio (recorrido carácter a carácter, `\|` → `|`): título, las 4 columnas en el cuerpo, `tipo` y `fuente` (`sdd-universal/scenarios.md#Sxx`, `sdd-universal/examples/hallazgos-2026-10.md#Hn`) → **0 diferencias**. Las fuentes reales tienen 0 `\|`, 56 filas con backticks y 0 links: los backticks pasan intactos (miré a mano S23, S34, H11 con `\host\share`, H19). Los casos `\|` y links los cubre el fixture.
- Lecciones: las 3 notas `dev-de-10-l1..l3` son los 3 bullets de «Resumen al cortar» de `sdd/loops/dev-de-10.md`; se saltea bien «Pendiente fuera del loop» y la tabla de objetivos; fecha 2026-10-06 de «Cumplido el». `obsidian-cerebro` (estado `corriendo`) no aporta. Correcto.

## Sondas propias (copia del repo en el scratchpad)
- Nota S05 editada a mano + fila S05 cambiada → «aviso: S05 (…): editada a mano; no se pisa», la nota conserva la edición. Fila S06 cambiada, nota sin editar → «1 actualizadas», mismo archivo, título nuevo. OK.
- Nota S07 borrada → se vuelve a crear en la corrida siguiente, sin aviso. Fila S08 eliminada del origen → la nota queda huérfana, sin aviso, y deja de contarse. Ninguna explota; ver H4.
- Cambio de «Versión» de `scenarios.md` (2026-10-06 → 2026-10-20) → **40 actualizadas** (todas las escenario no editadas), el nombre del archivo sigue con 2026-10-06 y el frontmatter dice 2026-10-20 (H4).
- **Id duplicado** (fila S09 renombrada a S10, o un 2.º archivo `examples/hallazgos-2026-10-web.md` con H1) → `error: no pude leer o escribir en …: [Errno 17] File exists: …2026-10-06-s10.md`, rc 2, **importación a medias** (H2).
- **Dos archivos de hallazgos de distinto mes** (`hallazgos-2026-11.md` con H1) → 1.ª corrida crea `2026-10-01-h1.md` y `2026-11-01-h1.md`; desde la 2.ª, **«2 actualizadas» en cada corrida, para siempre**: ambas candidatas `h1` van al mismo archivo y se pisan una a la otra; la nota de octubre nunca se actualiza (H2).
- Criterio 7 por CLI real, con junctions: `proyectos/p/ciclo → proyectos` → «aviso: proyectos/p/ciclo: enlace a una carpeta; no se recorre», 1 nota indexada (3.14 y 3.11), `revisar` 1 nota. `proyectos → afuera` → `revisar`/`indexar` «es un enlace que sale de CEREBRO_DIR; no se lee», 0 notas; `importar-sdd` rc 2, `afuera/` intacto. Tres índices rotos seguidos con `indexar --todo` → `indice.sqlite.roto` («basura uno»), `.roto.2` («basura dos»), `.roto.3` («basura tres»), índice nuevo sano. OK.
- `proyectos/sdd-universal → afuera2` (junction): `importar-sdd` rc 2, `afuera2/` vacío. **Funciona, pero ningún test lo cubre (R1) y con R1 aplicado escribe 71 notas en `afuera2/`** (H1).

## Criterios
1. S01–S42 → `escenario` (título, cuerpo, `fuente`): [x] corrida real 42 y comparación de las 42; `test_cada_fila_de_la_matriz_es_una_nota_escenario`. (Nota: el test exige importar también una fila `S99` de **otra** tabla, H5.)
2. H1–H26 → `hallazgo`: [x] 26, comparadas las 26. Título = «Hn · Dónde», ver H6.
3. Lecciones de loops `cumplido`: [x] 3 de `dev-de-10`; R6, R10, R11 muertos.
4. Idempotente / no pisa editadas: [x] con hueco — R2 muerto, sondas OK; pero el id no es único entre archivos que el propio importador recorre (`hallazgos-*.md`) y un id repetido rompe la idempotencia o aborta a medias (H2).
5. Pasan `revisar`: [x] 71/71, rc 0.
6. Tests con repo armado (`\|`, backticks, links): [x] `test_celdas_con_pipe_escapado_backticks_y_links` y H1/H2 del fixture.
7. Deuda C-2: [x] junction cíclica sin bucle, `proyectos/` enlace con test (`test_listar_con_proyectos_como_enlace_hacia_afuera_no_lee_nada`), `.roto` numerado; R8 y R9 muertos. R7 (tercer `.roto`) vive, cambio 3.

Zona: respetada. `cerebro.py` solo agrega `import importar`, el parser y `_cmd_importar_sdd`; `notas.py` solo `_es_enlace` + `listar` (+ `import os`); `indice.py` solo el renombre; ningún test viejo borrado ni debilitado (los 3 archivos de test solo suman líneas).

## Mutantes (míos, uno por vez, `timeout 120` por corrida, en 3.14 y 3.11, revertidos con `git checkout`; `git status` limpio al final)
| # | Mutante | Resultado |
|---|---|---|
| R1 | `importar.py:230` sin `or carpeta.resolve().parent != raiz_real` | **SOBREVIVE** (y escapa de verdad: 71 notas en `afuera2/`) |
| R2 | editada = solo «marca ausente» (`marca is None`) | muerto (3 tests) |
| R3 | `importar.py:252` sin normalizar CRLF | **sobrevive** |
| R4 | `importar.py:52` sin el caso de `\|` al final de la fila | **sobrevive** |
| R5 | `_sin_marca` quita toda línea `importado: …` (no solo la 1.ª) | **sobrevive** |
| R6 | bullets sin líneas de continuación | muerto (`test_lecciones_del_resumen_…`) |
| R7 | `indice.py:239` `while` → `if` (el 3.º roto pisa `.roto.2`) | **sobrevive** |
| R8 | `notas.py:180` sin podar `subdirs` | muerto (2 tests) |
| R9 | `_es_enlace` ignora junctions | muerto (2 tests) |
| R10 | no saltea «Pendiente» | muerto (3 tests) |
| R11 | importa loops no cumplidos | muerto |
| R12 | no cuenta `por_tipo` | muerto |
| R13 | `notas.py:174` entra en carpetas con punto dentro de `proyectos/` | **sobrevive** |

7/13 muertos. R1 es el que importa: la contención de escritura es la propiedad que el handback lista como cubierta («M8 sin contención de carpeta → muerto»), pero el test solo cubre `proyectos/` como enlace, no `proyectos/sdd-universal/`.

## Checkpoints
- C1 (arnés sano): [x] suite verde en 3.14 y 3.11; el FAIL de `verify.py` es previo, de `sdd/cards/C-2.md`, y está igual en `main`.
- C2 (cumple la tarjeta, zona respetada): [x] los 7 criterios con evidencia; zona respetada.
- C3 (diseño y convenciones): [ ] — `importar.py:96`/`206`: el id `h<n>` no es único entre los archivos `hallazgos-*.md` que se recorren; un id repetido aborta a medias con un mensaje que no dice la causa, o deja la importación en un vaivén permanente (H2).
- C4 (verificación real): [ ] — R1 vivo en lógica de seguridad (escritura fuera de `CEREBRO_DIR`), con fuga comprobada.
- C5 (cierra limpio): [x] handback y `current.md` commiteados; solo stdlib; sin secretos.

## Cambios requeridos
1. **ALTA** — `cerebro/importar.py:230`, la mitad `carpeta.resolve().parent != raiz_real` de la guardia no tiene test (R1 vive). Con el mutante, una junction `proyectos/sdd-universal → afuera` recibe las 71 notas fuera de `CEREBRO_DIR` (lo verifiqué). Es el mismo hueco que H1 de la review de C-2. Esperado: un test en `test_importar.py` con `proyectos/sdd-universal` como enlace hacia `self.afuera/...` que espere `ErrorImportar` y la carpeta de destino vacía. Tiene que matar R1.
2. **MEDIA** — `cerebro/importar.py:96` (`id_.lower()`), `:182-190` (`_existentes` guarda una sola ruta por id) y `:240-245`: el id no es único.
   (a) Dos filas con el mismo id (un `S10` repetido por error, o dos `hallazgos-AAAA-MM*.md` del mismo mes) → `FileExistsError` en el `open(..., "x")`, que la CLI muestra como «no pude leer o escribir en …», rc 2, con la mitad de las notas ya escritas.
   (b) `hallazgos-2026-10.md` y `hallazgos-2026-11.md` con su propio `H1` → desde la 2.ª corrida, «2 actualizadas» en cada corrida y la nota de octubre nunca se actualiza. Viola el criterio 4 («nombre determinista por id»: el id no identifica).
   Esperado: que el id identifique la fila. Puede llevar el archivo de origen en los hallazgos (p. ej. `2026-10-h1`), o se puede leer solo `hallazgos-2026-10.md`, como dice la tarjeta. Además, un id repetido dentro de una fuente se avisa y se saltea antes de escribir nada, sin abortar. Con test de los dos casos.
3. **BAJA, pedida porque es la deuda que esta tarjeta cierra** — `cerebro/indice.py:239`: el test `test_un_segundo_indice_roto_no_pisa_la_copia_del_primero` prueba dos roturas, así que `while` → `if` (R7) pasa y un 3.er índice roto pisaría `.roto.2`. Agregar la 3.ª rotura al test.

## Observaciones (BAJA, no bloquean por sí solas)
- H7 — R3, R4, R5 y R13 viven:
  - R3: una nota importada guardada con CRLF por otro editor, sin otro cambio, se reescribe en cada corrida si se quita la normalización de `importar.py:252`, y ningún test lo nota.
  - R4: una fila que termina en `\|` sin `|` de cierre.
  - R5: un cuerpo con una línea `importado: …`.
  - R13: `notas.py:174`. Antes de C-5 `rglob` + filtro tampoco tenía test para una carpeta con punto **dentro** de `proyectos/`, pero esta tarjeta reescribió esa lógica.

  Un test por caso los mataría.
- H4 — `importar.py:62`: la `fecha` de los escenarios es la de la «Versión» de `scenarios.md`. Cada versión nueva del paquete reescribe todas las notas escenario no editadas (40 «actualizadas» en la sonda) y da un aviso por cada editada. Además el nombre del archivo queda con la fecha vieja y el frontmatter con la nueva. Una nota borrada se recrea sin aviso, y una fila eliminada deja su nota huérfana sin aviso. Conviene al menos avisar las huérfanas.
- H5 — `importar.py:65` + `test_importar.py:27-29,104`: se importa cualquier fila `| Sxx |` de cualquier tabla del archivo, y el test **exige** importar `S99` de «## 2 · Otra tabla». El criterio 1 dice «de la matriz». Hoy no hay daño (el resto de tablas no empieza con `Sxx`), pero el test fija un comportamiento contrario a la tarjeta. Sugerencia: limitar a la sección «## 1 · Matriz».
- H6 — `importar.py:96`: el título del hallazgo es «Hn · <Dónde>» (p. ej. «H11 · `seguridad.md` N6 / `harness.md`»; H2, H10 y H15 se llaman «Catálogo de tecnologías»). Choca con el contrato §B, «título que la diga entera», y pesa en la búsqueda (objetivo 3, C-8). Sugerencia: armar el título con «Qué pasó» (recortado).

## Mejoras al arnés detectadas
- Que la plantilla del reviewer o del implementer pida, para cada guardia de contención con varias condiciones, **un mutante por condición**. M8 del handback quitaba toda la guardia y lo mataba el test de `proyectos/`; la 2.ª mitad nunca se probó por separado.
- Para importadores con «nombre determinista por id»: checklist de unicidad del id **entre todas las fuentes que se recorren** (glob), no solo dentro de un archivo.
