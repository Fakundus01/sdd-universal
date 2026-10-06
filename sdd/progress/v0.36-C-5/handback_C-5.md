# Handback C-5 — Sembrar el Cerebro con lo que ya aprendió el paquete

- **Estado:** done
- **Rama / commit:** `v0.36-C-5` @ `51767ab` (código y tests; el commit del handback va encima)
- **Quién:** implementer (MEDIO)

## Hecho
- `python cerebro/cerebro.py importar-sdd <repo>`: convierte la matriz S01–S42, H1–H26 y las lecciones de «Resumen al cortar» de los loops `cumplido` en notas (`proyecto: sdd-universal`).
- Idempotente: archivo `<fecha>-<id>.md` (id = `s01`, `h1`, `<loop>-l<n>`), no depende del título; fila cambiada → actualiza; nota editada a mano (o sin su marca) → aviso por stderr y no se pisa.
- Criterio 7: `listar` no entra en carpetas symlink/junction; test de `proyectos/` como enlace en `listar`; `indexar --todo` no pisa un `indice.sqlite.roto` previo (`.roto`, `.roto.2`, …).

## No hecho / pendiente
- Nada de la tarjeta. Ver «Fuera de zona» por el FAIL previo de `verify.py`.

## Cómo
- Celdas: se corta en `|` sin escapar y `\|` vuelve a `|`; backticks y links pasan tal cual al cuerpo.
- Marca `importado: <sha256[:16]>` en el frontmatter = hash del resto del archivo sin esa línea. Si el hash no coincide, o la marca falta, la nota cuenta como editada. `parsear` ignora claves extra, así que `revisar` pasa.
- Fecha estable: escenarios = fecha de «Versión» de `scenarios.md`; hallazgos = `AAAA-MM-01` del nombre del archivo; lecciones = «Cumplido el AAAA-MM-DD». El archivo existente se busca por id, no por fecha.
- Lecciones: cada bullet de nivel 0 de «Resumen al cortar» (título = el texto en negrita inicial); se saltean los que empiezan con «Pendiente» (son tareas, no lecciones). Loops no `cumplido` o con resumen `(vacío)` → 0 lecciones, sin fallar.
- `listar`: `os.walk` podando carpetas con punto y enlaces (symlink o reparse point de Windows); se mantiene el chequeo por archivo como defensa en profundidad.
- Exit code 1 si alguna nota generada no pasa el formato (se informa y se importa el resto).

## Archivos tocados
| Archivo | Cambio |
|---|---|
| cerebro/importar.py | nuevo: el importador |
| cerebro/cerebro.py | solo el subcomando `importar-sdd` (+ import) |
| cerebro/notas.py | solo `listar` y `_es_enlace` (+ `import os`) |
| cerebro/indice.py | solo el renombre a `.roto` numerado |
| cerebro/tests/test_importar.py | nuevo: 19 tests |
| cerebro/tests/test_notas.py | 4 tests de `listar` |
| cerebro/tests/test_indice.py | 1 test de `.roto` |
| sdd/progress/v0.36-C-5/current.md, handback_C-5.md | míos |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1 S01–S42 → `escenario` | `test_cada_fila_de_la_matriz_es_una_nota_escenario`; corrida real: 42 |
| 2 H1–H26 → `hallazgo` | `test_cada_fila_de_hallazgos_es_una_nota_hallazgo`; corrida real: 26 |
| 3 lecciones | `test_lecciones_del_resumen_al_cortar_de_un_loop_cumplido`, `test_lecciones_ignora_loops_no_cumplidos_y_resumen_vacio`; real: 3 (de `dev-de-10`; `obsidian-cerebro` está corriendo y vacío) |
| 4 idempotente / editada | `test_segunda_corrida_no_duplica_ni_cambia_nada`, `test_fila_que_cambio_actualiza_…`, `test_nota_editada_a_mano_no_se_pisa_y_se_avisa`, `test_nota_a_la_que_se_le_borro_la_marca_…`, `test_el_nombre_no_depende_del_titulo` |
| 5 pasan `revisar` | `test_importar_sdd_imprime_resumen_y_las_notas_pasan_revisar`; real abajo |
| 6 repo armado | `test_celdas_con_pipe_escapado_backticks_y_links` y el resto de `test_importar.py` |
| 7 deuda C-2 | `test_listar_no_entra_en_una_junction_que_vuelve_a_proyectos`, `test_listar_no_entra_en_un_enlace_a_una_carpeta_de_adentro`, `test_listar_con_proyectos_como_enlace_hacia_afuera_no_lee_nada` (mata N2/V2-1), `test_un_segundo_indice_roto_no_pisa_la_copia_del_primero` |

Rojo antes (R29), contra la base, con `importar.py` y el subcomando como stubs que importan (así cada test falla por su aserción; los 5 ERROR son `StopIteration` al buscar una nota que el stub no escribió):
```text
$ git rev-parse --short HEAD
6c1a023
$ python -m unittest discover -s cerebro/tests
FAIL: test_importar_sdd_imprime_resumen_y_las_notas_pasan_revisar ... (+13 FAIL de test_importar)
FAIL: test_un_segundo_indice_roto_no_pisa_la_copia_del_primero
FAIL: test_listar_no_entra_en_un_enlace_a_una_carpeta_de_adentro
FAIL: test_listar_no_entra_en_una_junction_que_vuelve_a_proyectos
Ran 97 tests in 3.222s
FAILED (failures=14, errors=5)
```

Verde después:
```text
$ python -m unittest discover -s cerebro/tests      (3.14 y py -3.11)
Ran 99 tests in 2.433s
OK
$ python harness/verify.py --changed
test_quick: Ran 178 tests · OK (skipped=1)
[FAIL]  Ruta citada que no existe: sdd/cards/C-2.md → `cerebro/requirements.txt`
ROJO — 1 FAIL, 0 WARN
```
(Ese FAIL es de la tarjeta C-2, fuera de mi zona; ver abajo.)

### Corrida real (CEREBRO_DIR temporal en %TEMP%, borrado al terminar; `CEREBRO_EMBEDDINGS=falso`)
```text
$ cerebro.py importar-sdd .
importadas: 42 escenario, 26 hallazgo, 3 leccion
71 nuevas, 0 actualizadas, 0 sin cambios, 0 editadas a mano (no se pisaron)
$ cerebro.py revisar
71 nota(s) revisadas, 0 error(es).
$ cerebro.py importar-sdd .          # segunda corrida
importadas: 42 escenario, 26 hallazgo, 3 leccion
0 nuevas, 0 actualizadas, 71 sin cambios, 0 editadas a mano (no se pisaron)
archivos .md en proyectos/: 71  (escenario 42, hallazgo 26, leccion 3)
```

### Búsqueda con embedder `falso` (solo informativo; el objetivo real se mide en C-8)
```text
$ indexar -> 71 nuevas
buscar "el loop no sabe cuándo frenar", top 3:
 1. S39  El humano pide «seguí el loop hasta dejarlo de 10» y se va
 2. S22  A mitad de la implementación, la spec aprobada resulta estar mal …
 3. H2   Catálogo de tecnologías   (ruido)
buscar "copió un archivo para que pase el check", top 3:
 1. S42  Tarjeta con un obstáculo de diseño despachada al tier más barato   (la esperada, en el 1º)
 2. S29  Los controles mismos mienten: un check que nunca vio un rojo …
 3. S32  El arnés le pasa a un proceso datos que no escribió el usuario …
```

### Mutantes (a mano, uno por vez, `timeout 120` por corrida, `git checkout` después)
| # | Mutante | Resultado |
|---|---|---|
| M1 | no des-escapa `\|` | muerto (`test_celdas_con_pipe_…`) |
| M2 | corta en cualquier `\|` | muerto (idem) |
| M3 | pisa notas editadas | muerto (`test_nota_editada_a_mano_…`) |
| M4 | marca ausente no cuenta como editada | muerto (`test_nota_a_la_que_se_le_borro_la_marca_…`) |
| M5 | siempre reescribe | muerto (`test_segunda_corrida_…`) |
| M6 | importa loops no cumplidos | muerto |
| M7 | no saltea «Pendiente» | muerto |
| M8 | sin contención de carpeta | muerto (`test_proyectos_como_enlace_hacia_afuera_no_escribe_afuera`) |
| M9 | no reconoce notas previas | muerto |
| M10 | nombre depende del título | muerto (`test_el_nombre_no_depende_del_titulo`) |
| M11 | sin chequeo de cantidad de celdas | muerto |
| M12 | fecha de escenarios = hoy | **sobrevivía** (la fecha del fixture coincidía con hoy); fixture cambiado a 2026-03-15 → muerto |
| M13 | `listar` sigue carpetas enlace | muerto |
| M14 | `listar` sin guardia de `proyectos/` enlace (N2 de C-2) | muerto (`test_listar_con_proyectos_como_enlace_…`) |
| M15 | `listar` sin chequeo por archivo | **sobrevivía** (el filtro de carpetas lo tapa); test con `_es_enlace` parcheado → muerto |
| M16 | `_es_enlace` ignora junctions | muerto |
| M17 | `.roto` pisa el anterior | muerto |
| M18 | CLI sale 0 con notas inválidas | **sobrevivía**; test de nota inválida → muerto |
| M19 | CLI no avisa editadas | muerto |
| M20 | fecha de hallazgos = hoy | muerto |

## Fuera de zona / riesgos
- `harness/verify.py --changed` da 1 FAIL **previo**, no mío: `sdd/cards/C-2.md` cita `cerebro/requirements.txt`, que no existe (lo arregla el leader en `sdd/`).
- No hay permiso para crear symlinks de archivo en esta máquina (WinError 1314): los tests de enlaces corren con junctions; el chequeo por archivo se cubre parcheando `_es_enlace`.
- `listar` ahora tampoco entra en un symlink/junction que apunte a una carpeta de adentro (antes se leía duplicado); avisa.
- El hash de la marca cubre todo el archivo: cualquier edición (incluso un espacio) lo vuelve «editada a mano».

## Cambios de spec sugeridos
- `sdd/loops/obsidian-cerebro.md` objetivo 3: la fuente de lecciones hoy es `dev-de-10` (3 notas); si el objetivo cuenta lecciones de loops propios, subirá cuando este loop corte y tenga resumen.

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- C-8: medir el objetivo 3 con embeddings locales sobre estas 71 notas (`importar-sdd .` en un `CEREBRO_DIR` real).

## Apéndice: vuelta 2 (review CHANGES_REQUESTED @ 51767ab) — código @ `8cf57af`
Estado: done. Incidente: el reviewer corrió mutantes en mi worktree y un `git checkout` pudo descartar cambios; verifiqué que `importar.py` tenía todo (suite 112 OK) y commiteé enseguida.

Cambios (secciones «Hecho/Evidencia» de arriba siguen valiendo; esto las completa):
- ALTA R1: `test_proyecto_sdd_universal_como_enlace_hacia_afuera_no_escribe_afuera`.
- MEDIA ids: id de hallazgo = `<sufijo del archivo>-hN` (p. ej. `2026-10-h1`); ids repetidos dentro de una fuente se detectan antes de escribir, `ErrorImportar` con el id y el archivo, rc 2, nada escrito (`TestIds`: dos archivos de hallazgos con `H1` → segunda corrida 0 actualizadas).
- BAJA R7: el test de `.roto` ahora hace tres roturas.
- Escenarios: solo la sección «## 1 · Matriz» (S99 de otra tabla ya no se importa).
- Título de hallazgo = «Qué pasó» entero en una línea.
- La fecha de una nota ya importada se conserva (nombre del archivo): un cambio de «Versión» no reescribe nada; el hash de cambio es por fila.
- Huérfanas: notas con marca `importado:` cuya fila ya no está → aviso por stderr y `N huérfanas (se dejan)` en el resumen; no se borran; las notas propias sin marca no cuentan.
- Se quitó la normalización CRLF redundante de `importar.py` (`read_text` ya normaliza) y se agregó un test de nota guardada con CRLF.

Rojo antes, contra el código de 51767ab/d9c84cd con los tests nuevos y `huerfanas` como único stub (`git rev-parse --short HEAD` = d9c84cd; `python -m unittest discover -s cerebro/tests`): `Ran 112 tests`, `FAILED (failures=11, errors=2)` — fallan los de ids, matriz, título, versión, huérfanas y los conteos del CLI; los tests de R1, R7, R13, R4 y R3 pasaban contra el código bueno, así que su rojo se mide contra el mutante (tabla).
Verde después (`python -m unittest discover -s cerebro/tests`, 3.14 y `py -3.11`): `Ran 112 tests ... OK`.
`verify.py --changed`: el mismo único FAIL previo (`sdd/cards/C-2.md` cita `cerebro/requirements.txt`).

Mutantes (script Python con `subprocess.run(timeout=120)` y `sys.executable -m unittest discover -s cerebro/tests`, no `timeout.exe`; en cada corrida se imprime «Ran N tests»; `git checkout` del archivo después; `git status` limpio):
| # | Mutante | Resultado (todas «Ran 112 tests») |
|---|---|---|
| R1 | sin `carpeta.resolve().parent != raiz_real` | muerto: `test_proyecto_sdd_universal_como_enlace_hacia_afuera_no_escribe_afuera` |
| R3 | lee la nota sin normalizar CRLF | muerto: `test_nota_guardada_con_crlf_por_otro_editor_…` |
| R4 | sin el caso `\|` al final de la fila | muerto: `test_celdas_con_pipe_escapado_al_final_de_la_fila` |
| R5 | `_sin_marca` quita toda línea `importado:` | **equivalente**: el cuerpo no puede tener una línea que empiece con `importado: ` (las celdas no tienen saltos y las lecciones se aplanan con `" ".join`; las líneas del cuerpo empiezan con `**Etiqueta:**`). Sobrevive sin entrada alcanzable |
| R7 | `while` → `if` en `.roto` | muerto: `test_un_segundo_indice_roto_…` (3 roturas) |
| R13 | `listar` entra en carpetas con punto | muerto: `test_carpetas_con_punto_dentro_de_proyectos_no_se_listan` |
| V1 | id de hallazgo sin archivo de origen | muerto |
| V2 | sin detección de ids repetidos | muerto (2 tests) |
| V3 | todas las tablas, no solo la matriz | muerto |
| V4 | título de hallazgo «Hn · Dónde» | muerto |
| V5 | la fecha de la nota no se conserva | muerto (`test_cambiar_la_version_…`) |
| V6 / V7 / V8 | sin huérfanas / huérfana sin marca / CLI sin aviso | muertos |

Corrida real nueva (`CEREBRO_DIR` temporal, borrado):
```text
importadas: 42 escenario, 26 hallazgo, 3 leccion
71 nuevas, 0 actualizadas, 0 sin cambios, 0 editadas a mano (no se pisaron), 0 huérfanas (se dejan)
71 nota(s) revisadas, 0 error(es).
0 nuevas, 0 actualizadas, 71 sin cambios, 0 editadas a mano ...     # 2.ª corrida
buscar "el loop no sabe cuándo frenar" (falso): S39, S22, H22 (informativo)
buscar "copió un archivo para que pase el check" (falso): S42, S29, S32
```
