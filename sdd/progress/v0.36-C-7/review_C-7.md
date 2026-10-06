# Review C-7 @ 7d95dbf
**Veredicto:** APPROVED

Reviewer independiente (tier ALTO). Base `3dd1edd`, código `9d338ad`, handback en `1023705`. Trabajé en el worktree `sdd-universal-C-7-rev`. Las dependencias salieron del venv de `sdd-universal-C-7` (Python 3.14.0), salvo en las corridas reales de `instalar.ps1`, que crearon su propio venv en este worktree (después lo borré). No hice ninguna llamada a OpenAI, no leí claves ni `.env`, no registré el MCP y no toqué el modelo.

## Verificación re-ejecutada
```text
$ <venv C-7>/python.exe -m unittest discover -s cerebro/tests          -> Ran 208 tests in 11.939s  OK
$ CEREBRO_SIN_MODELO=1 (venv)                                         -> Ran 208 tests in 10.155s  OK (skipped=1)
$ python -m unittest discover -s cerebro/tests   (sistema 3.14.0)     -> Ran 208 tests in 8.081s   OK (skipped=3)
$ Python 3.11 (sistema)                                               -> Ran 208 tests in 7.182s   OK (skipped=3)
$ entorno de la CI simulado: CEREBRO_SIN_MODELO=1 CEREBRO_EMBEDDINGS=falso PYTHONUTF8=1,
  CEREBRO_MODELOS=<carpeta vacía>, HTTP(S)_PROXY=http://127.0.0.1:9 (sin red)
                                                                      -> Ran 208 tests in 10.187s  OK (skipped=1); la carpeta de modelos quedó vacía
$ python harness/verify.py --quick
verify.py --quick @ 1023705 (rama v0.36-C-7-rev)
[OK]    Tarjetas válidas (13)
[OK]    Rutas citadas existen (163 revisadas)
VERDE — 0 FAIL, 0 WARN
```
(`verify.py` creó `sdd/progress/v0.36-C-7-rev/current.md` de plantilla: lo borré.)

Rojo de la base (R29), medido por mí: con `git show 3dd1edd:cerebro/notas.py` en lugar del actual, `test_notas` + `test_mcp_server` dan `Ran 52 tests`, `FAILED (failures=18)`. Fallan los 3 tests nuevos de `test_notas` (con los 12 subtests de NUL, `\u2028`, `\u2029` y `\x85` en proyecto, título y fuente) y el test adaptado de `test_mcp_server`. Coincide con el handback.

Python 3.10 no está instalado acá. Lo cubrí así: `ast.parse(..., feature_version=(3, 10))` pasa en todo `cerebro/**/*.py`, todo compila con 3.11 y no hay APIs de 3.11+ (`tomllib`, `except*`, `datetime.UTC`, `Self`, `TaskGroup`…).

## CI (`.github/workflows/cerebro.yml`)
- El YAML parsea con pyyaml (en un venv aparte, en el scratchpad). La matriz es `ubuntu-latest`/`windows-latest` × `3.10`/`3.14` con `fail-fast: false`. Usa `actions/checkout@v5` y `actions/setup-python@v6`, las mismas versiones que `harness.yml`. Los `paths:` son `cerebro/**` y el propio workflow, en push y en pull_request. Los tests no leen archivos del repo fuera de `cerebro/`: `test_importar` usa fixtures.
- La integración real se saltea con motivo: `CEREBRO_SIN_MODELO está fijada (la CI no baja el modelo de ~220 MB)`. Ningún paso baja el modelo: con la red cortada y `CEREBRO_MODELOS` vacío la suite pasa y la carpeta queda vacía. No hay caché de modelo.
- **Wheels en PyPI** (resolución `pip --dry-run --only-binary=:all:` y cierre de dependencias evaluando los marcadores de cada plataforma, contra el JSON de PyPI; script en el scratchpad):

| Plataforma | Paquetes | Sin wheel | onnxruntime | numpy |
|---|---|---|---|---|
| win_amd64 cp310 | 61 | ninguno | 1.23.2 | 2.2.6 |
| win_amd64 cp314 | 54 | ninguno | 1.30.0 | 2.5.3 |
| manylinux x86_64 cp310 | 57 | ninguno | 1.23.2 | 2.2.6 |
| manylinux x86_64 cp314 | 51 | ninguno | 1.30.0 | 2.5.3 |

  En las cuatro: `fastembed 0.8.1`, `mcp 2.3.0`, `openai 3.24.0`, `httpx2 2.13.1`, `tokenizers 0.23.2` (abi3), `pydantic-core 2.46.5`, `jiter 0.17.0`. **No hay bloqueante de wheels.** El riesgo que nombra el handback (3.14 sin wheel) no se da.

## instalar.ps1: corridas reales (Windows PowerShell 5.1, `-ExecutionPolicy Bypass` solo en el proceso hijo)
- `-CerebroDir "%TEMP%\Cerebro prueba ñ" -Embeddings falso` con el venv nuevo: crea el venv, instala, `init` y `importar-sdd` (71 nuevas) e `indexar falso` (71 nuevas). EXIT 0 en 64 s. El venv tiene `fastembed 0.8.1`, `mcp 2.3.0`, `onnxruntime 1.30.0` y `openai 3.24.0`. `buscar 'R30 UnboundLocalError'` y `buscar agente --proyecto sdd-universal` responden con EXIT 0. La ruta con espacio y `ñ` anda.
- `-Embeddings local` sobre **esa misma** carpeta: corta (EXIT 1) con un mensaje claro: «el índice se armó con el modelo «falso» (dim 64)… Corré `cerebro.py indexar --todo`». Es correcto, pero el script no ofrece salida para ese caso (ver H5).
- `-Embeddings local` en `%TEMP%\Cerebro local ñ`: la primera corrida da 71 nuevas e indexa 71 nuevas. La segunda es idempotente: init dice «ya existía», importar da `0 nuevas, 0 actualizadas, 71 sin cambios` e indexar `0 nuevas, 71 sin cambios`. EXIT 0. `buscar 'el agente copio un archivo para pasar un check' -k 3` devuelve 3 resultados (los mismos que el handback).
- Errores:
  - `-Repo C:\Windows`: «no parece un repo SDD», EXIT 1, sin crear nada.
  - `-Embeddings xx`: ValidateSet, EXIT ≠ 0.
  - `-Python C:\no\existe\python.exe` sin venv: «no se reconoce como nombre…», EXIT 1, sin venv ni carpeta.
  - Python viejo, simulado con un `.bat` que sale con 1: EXIT 1, pero el mensaje no dice «hace falta Python ≥ 3.10» (H6).
  - Sin red y con el venv nuevo (proxy muerto): pip falla y el script corta con EXIT 1 en 12 s, con «No matching distribution found for fastembed==0.8.1». No dice «¿sin red?» (H6).
  - Sin red y con el venv existente: EXIT 0, porque pip no necesita red.
- No registra el MCP: `~/.claude.json` tiene 0 menciones de `"cerebro"` y de `mcp_server.py`, antes y después. No escribe variables de usuario (`CEREBRO_DIR` y `CEREBRO_EMBEDDINGS` de usuario siguen vacías). Fuera del `CEREBRO_DIR` explícito y del venv solo quedaron `cerebro/__pycache__` (ignorado por git) y el modelo en `~/.cache/cerebro/modelos`, que ya estaba.
- **Pero el default del script no es el `CEREBRO_DIR` del núcleo y, en esta máquina, cae dentro de OneDrive (H1).**

## Checkpoints / criterio → evidencia
- C1 Criterio 1 (CI): [x] Sintaxis, matriz, actions, `paths:`, el skip con motivo y la ausencia de descargas están verificados arriba. Las wheels existen para las 4 combinaciones. La CI no corrió en GitHub: queda para después del push.
- C2 Criterio 2 (README + script): [ ] `instalar.ps1:19` y `README.md:10` mandan el Cerebro, por defecto, a `[Environment]::GetFolderPath('MyDocuments')`. En la máquina del owner eso es `C:\Users\Facundo\OneDrive\Documents`, así que el Cerebro termina en `OneDrive\Documents\Cerebro`. Eso contradice el playbook §B.1 («`%USERPROFILE%\Documents\Cerebro` (fuera de OneDrive…)»), el propio README:23 («fuera de OneDrive») y `config.cerebro_dir()` (`C:\Users\Facundo\Documents\Cerebro`). El comentario de `instalar.ps1:8` («la misma que usa cerebro.py sin CEREBRO_DIR») es falso en esta máquina (H1). Además, `claude mcp add` sin `-s user` (H2).
- C3 Criterio 3 (script en un temporal, índice que responde): [x] Lo corrí de verdad 6 veces (salidas arriba).
- C4 Criterio 4 (deuda): [x]
  - Humo: X1 (el servidor escupe 5 MB a stderr antes de servir) pasa en el mismo tiempo, así que el drenaje funciona. X2 (servidor colgado) falla en unos 40 s: antes de C-7 tardaba más de 120 s (review C-4). X4 (cae al arrancar) falla en el acto.
  - NUL, `\u2028`, `\u2029` y `\x85` se rechazan en proyecto, título, fuente y tags, tanto en el núcleo como por la herramienta `nota` del MCP (probé los 15 casos más 2 en tags: 0 aceptados y 0 archivos escritos).
  - `proyecto` = slug: `nota("Mi Proyecto")` escribe `proyecto: mi-proyecto`, y `buscar(proyecto="mi-proyecto")` la encuentra. Las notas de `importar-sdd` ya usaban `sdd-universal` = carpeta (las 71 coinciden).
  - Quedan observaciones H3 y H4.
- C5 Diff y zona: [x] Los 7 archivos están en la zona de la tarjeta. No hay tests borrados. El test cambiado (`test_separadores_unicode_en_titulo_y_fuente_no_cierran_el_bloque`) está declarado en el handback y no se debilitó: ahora además exige el rechazo, y sigue matando la neutralización de `_linea` (M12 abajo). La deuda H3 de la review C-4 quedó saldada.

## Mutantes (míos, uno por vez, suite completa con `subprocess.run(timeout=120)`, archivo restaurado en `finally`; `git status` limpio al final)
| # | Mutante | Resultado |
|---|---|---|
| M1 | `notas.py`: sin `\x00` en `_PROHIBIDOS_EN_LINEA` | muerto: Ran 208, failures=4 |
| M2 | sin `\u2029` | muerto: Ran 208, failures=5 |
| M3 | sin `\x0b\x0c\x1c\x1d\x1e` | muerto: Ran 208, failures=2 (solo por el test del MCP) |
| M4 | sin `\x1d\x1e` | **sobrevive**: Ran 208, OK (H7) |
| M5 | frontmatter con el `proyecto` crudo | muerto: Ran 208, failures=2 errors=3 |
| M6 | `carpeta_proyecto = proyecto.strip().lower().replace(" ", "-")` | muerto: Ran 208, failures=16 errors=6 |
| M7 | `.search` → `.match` | muerto: Ran 208, failures=18 |
| M8 | `conversar` sin `proc.poll() is None` | muerto: Ran 208, failures=1 (18.8 s) |
| M9 | `conversar` sin el hilo que drena stderr | muerto: Ran 208, failures=2 (29.4 s) |
| M10 | `test_local`: `SIN_MODELO = False` | muerto: failures=1 (`test_con_la_variable_se_saltea_con_motivo`) |
| M11 | `conversar`: `except OSError` → `except ValueError` al escribir | **sobrevive**: Ran 208, OK (H8) |
| M12 | `mcp_server._linea` = `str(texto)` | muerto: Ran 208, failures=6 |
| X1 | servidor que escribe 5 MB en stderr antes de `run` (debe pasar) | pasa: Ran 208, OK en 12.3 s |
| X2 | servidor colgado (`sleep(3600)` antes de `run`) | muerto: Ran 208, errors=1, suite en 51.4 s (unos 40 s del humo) |
| X3 | `buscar` lanza `RuntimeError("y"*3_000_000)` | muerto: Ran 208, failures=1 errors=11 en 12.0 s |
| X4 | servidor que escribe 5 MB de «Traceback» y sale con 1 | muerto: Ran 208, errors=1 en 10.6 s |

## Hallazgos
1. **H1 ALTA** (`cerebro/instalar.ps1:19`, `:8`, `cerebro/README.md:10`): el default `Join-Path ([Environment]::GetFolderPath('MyDocuments')) 'Cerebro'` sigue la redirección de Documentos a OneDrive. En esta máquina da `C:\Users\Facundo\OneDrive\Documents\Cerebro`. La regla del playbook §B.1 / §F («OneDrive marca conflictos en `indice.sqlite`… moverlo») y el README:23 lo prohíben. Además no coincide con `config.cerebro_dir()` (`%USERPROFILE%\Documents\Cerebro`): si después se corre `cerebro.py` sin `CEREBRO_DIR`, se usa otra carpeta. El comando que el README recomienda primero (`powershell -File cerebro/instalar.ps1`) crea el Cerebro justo donde no tiene que estar. **Se espera:** default `Join-Path $env:USERPROFILE 'Documents\Cerebro'` (el mismo cálculo que `config.py`) y que el script se niegue a seguir, o pida `-CerebroDir`, si la ruta final cae bajo `$env:OneDrive`, `$env:OneDriveConsumer` o `$env:OneDriveCommercial`. Corregir el comentario de `:8` y el README:10.
2. **H2 MEDIA** (`cerebro/README.md:45`, `:107-108`, `cerebro/instalar.ps1:74`): `claude mcp add` sin `-s user` registra con alcance `local` (`claude mcp add --help`: `(default: "local")`), o sea, solo en el directorio donde se corrió. Para una «memoria entre proyectos» el MCP faltaría en los demás proyectos. **Se espera:** `claude mcp add -s user cerebro …` en el README y en el comando que imprime el script, con una línea que lo explique. El playbook §C tiene el mismo hueco: queda para el leader, porque está fuera de zona.
3. **H3 MEDIA, para el leader** (fuera de zona: `cerebro/indice.py:303`, `cerebro/mcp_server.py:38`, `cerebro/cerebro.py:83`): ahora el filtro solo encuentra el slug. `nota(proyecto="Mi Proyecto")` seguido de `buscar(proyecto="Mi Proyecto")` da «nada» (antes de C-7 la encontraba); con `mi-proyecto`, sí. Por MCP, el LLM va a repetir el nombre que usó. **Propuesta:** normalizar el filtro con `notas.slug()` en `buscar` (CLI y MCP) y decir en el docstring de la herramienta que `proyecto` es el nombre de la carpeta.
4. **H4 BAJA, para el leader** (fuera de zona): una nota existente válida con `proyecto: SDD Universal` en `proyectos/sdd-universal/` sigue indexada con `SDD Universal`. Con `buscar --proyecto sdd-universal` aparecen las notas nuevas y no esa, y con `"SDD Universal"` al revés: lo probé. `revisar` da «0 errores». La tarjeta no lo resuelve ni lo declara. Hoy no rompe nada real, porque el Cerebro del owner no existe todavía y `importar-sdd` ya usaba el slug. La normalización de H3, más un aviso de `revisar` cuando `proyecto` ≠ carpeta, lo cierra.
5. **H5 BAJA** (`cerebro/instalar.ps1:66-68`): pasar de `falso` a `local` (u `openai`) en el mismo `CEREBRO_DIR` corta con «corré `cerebro.py indexar --todo`», y el script no tiene opción para hacerlo. Además, «la primera vez baja el modelo» se imprime en cada corrida. Sugerencia: un `-Reindexar` que pase `--todo`, o una línea en el README.
6. **H6 BAJA** (`cerebro/instalar.ps1:48`, `:53`): el Python viejo da `fallo: <py> -c import sys; sys.exit(0 if sys.version_info >= (3, 10) else 1) (codigo 1)`, sin decir «hace falta Python 3.10 o más». Con pip sin red, `--quiet` esconde el error de conexión y queda solo «No matching distribution found». Sugerencia: mensajes propios en esos dos puntos.
7. **H7 BAJA** (`cerebro/tests/test_notas.py`, test `test_campos_de_una_linea_rechazan_nul_y_separadores_unicode`): `\x1d` y `\x1e` están en el regex pero ningún test los cubre (M4 sobrevive). Agregalos a la tupla de separadores.
8. **H8 BAJA** (`cerebro/tests/test_mcp_server.py:214-218`): la rama `except OSError` de `conversar` depende del momento en que muere el servidor. M11 sobrevive en esta corrida, y el handback la vio fallar con `Errno 22`: el test no la cubre de forma determinista. Basta con hacer que el servidor que cae no lea stdin, o mandar el primer mensaje después de `proc.wait()`.
9. **H9 BAJA** (`cerebro/tests/test_mcp_server.py:301`): si el servidor no contesta `initialize`, el humo falla con `KeyError: 1` y **sin** el stderr del servidor (lo comprobé: el diagnóstico no aparece). Eso contradice el docstring de `conversar` («el stderr que dejó es el diagnóstico»). **Se espera:** `self.assertIn(1, respuestas, stderr)` antes de indexar (y lo mismo con los demás ids).
10. **H10 BAJA** (`cerebro/README.md:10-11`, `instalar.ps1:16`): `powershell -File …` falla con la política `Restricted`, que es la default de Windows cliente, o con un ZIP bajado de la web y la política `RemoteSigned`. Al owner le anda porque tiene `RemoteSigned` en CurrentUser. Sugerencia: `powershell -ExecutionPolicy Bypass -File cerebro\instalar.ps1`. Aparte: los comandos que imprime el script usan comillas simples y se rompen si la ruta tiene un `'`.
11. **Observación** (`cerebro/tests/test_local.py:282`): `CEREBRO_SIN_MODELO=0` también saltea, porque `bool("0")`. Coincide con el README («cualquier valor»), así que no es un defecto.

## Cambios requeridos
1. `cerebro/instalar.ps1:19` (+ `:8`) y `cerebro/README.md:10`: el default tiene que ser `%USERPROFILE%\Documents\Cerebro`, igual que `config.cerebro_dir()`, y el script tiene que negarse a seguir si `CEREBRO_DIR` queda dentro de OneDrive. Hace falta un test o una corrida que lo muestre en esta máquina (H1).
2. `cerebro/README.md:45`, `:107-108` y `cerebro/instalar.ps1:74`: `claude mcp add -s user …` (H2).
3. Recomendado en la misma vuelta, porque es barato: H7 (`\x1d` y `\x1e` en el test) y H9 (que el humo muestre el stderr).

## Mejoras al arnés detectadas
- Un check que compare el default de `CEREBRO_DIR` de los scripts de instalación con `config.cerebro_dir()` y que falle si cae bajo `%OneDrive%`. La regla está en el playbook pero nada la ejecuta.
- En las tarjetas que publican un comando `claude mcp add`, pedir que declaren el alcance (`-s user|project|local`).

---

## Vuelta 2 @ 4108600
**Veredicto:** CHANGES_REQUESTED

Revisé el código `4108600` (HEAD de la tarjeta `bc687da`). La zona se amplió por el leader para tocar `cerebro.py` y `mcp_server.py`, y lo declara el handback. Mismas reglas que en la vuelta 1: no hice llamadas a OpenAI, no registré el MCP (`~/.claude.json` sigue con 0 menciones de `mcp_server.py`) y el modelo de `~/.cache/cerebro/modelos` está intacto. Al final borré el venv del worktree, los `__pycache__` y los temporales.

### Verificación re-ejecutada
```text
venv C-7 (3.14.0):                Ran 213 tests in 12.373s  OK
CEREBRO_SIN_MODELO=1 (venv):      Ran 213 tests in 10.503s  OK (skipped=1)
python del sistema (3.14.0):      Ran 213 tests in 8.345s   OK (skipped=3)
Python 3.11:                      OK (skipped=3)
python harness/verify.py --quick: [OK] Tarjetas válidas (13) · [OK] Rutas citadas existen (163 revisadas) · VERDE — 0 FAIL, 0 WARN
```
(`verify.py` volvió a crear `sdd/progress/v0.36-C-7-rev/current.md`: lo borré.)

### Hallazgos de la vuelta 1 → estado
| Hallazgo | Estado | Evidencia mía |
|---|---|---|
| H1 ALTA | **resuelto** | Evalué el default del `param` con el parser de PowerShell: da `C:\Users\Facundo\Documents\Cerebro`, igual que `config.cerebro_dir()`. Probé el rechazo con 5 casos: `$env:OneDrive\CerebroRevC7` (el OneDrive real), la misma ruta en minúsculas, `$env:OneDrive` simulado en `%TEMP%\FakeOD rev`, un segmento `OneDrive - Empresa` y un segmento `x\OneDrive`. Los 5 terminan con EXIT 1 y «queda dentro de OneDrive… Elegi otra carpeta con -CerebroDir», sin crear la carpeta ni el venv. |
| H2 | **resuelto** | `-s user` está en README:45, en README:107-108 y en lo que imprime el script. Pasé el comando impreso a un eco de `sys.argv`: los argumentos quedan bien partidos, incluida una ruta con espacio, `ñ` y `'`. |
| H3 | **resuelto** | Después de `nota("Mi Proyecto")`, la buscan por CLI y por MCP «Mi Proyecto», `mi-proyecto`, «MI PROYECTO» y «mi proyecto!»: las 4 la encuentran. Tests de CLI y de MCP, más Q1 y Q2 muertos. |
| H4 | **resuelto a medias** → H11 | `revisar` avisa por stderr con EXIT 0, y su resumen dice «1 aviso(s) de proyecto». Pero el texto del aviso es falso y la nota quedó inalcanzable por filtro (ver H11). |
| H5 | **resuelto** | Corrida real abajo. Sin `-Reindexar`, EXIT 1 con la pista «volve a correr este script con -Reindexar». Con `-Reindexar`, EXIT 0 y 71 nuevas. |
| H6 | **resuelto** | Python inexistente: «hace falta Python 3.10 o mas (-Python '…' no lo cumple o no existe)». Sin red con el venv nuevo: «pip no pudo instalar requirements.txt (sin red? sin permiso?)». Las dos terminan con EXIT 1 y sin crear el `CEREBRO_DIR`. |
| H7 | **resuelto** | M4 ahora muere (failures=7). |
| H8 | **resuelto** | M11 ahora muere (errors=1, `test_un_servidor_que_cierra_stdin_sin_leer_no_rompe_el_helper`). |
| H9 | **resuelto** | Con `exigir_respuestas`, X2 y X4 pasan de `errors` (KeyError) a `failures` con el stderr del servidor. Q4 muerto. |
| H10 | **resuelto** | El README dice `-ExecutionPolicy Bypass`. `Q` escapa la `'`. Pegué la línea `$env:CEREBRO_DIR = '…ñ''o'` que imprime el script y el resultado es exactamente la ruta. |

### instalar.ps1 de verdad, con `CEREBRO_DIR` = `%TEMP%\Cerebro prueba ñ'o` (espacio, ñ y comilla simple)
```text
1. falso, venv nuevo:        EXIT 0 en 64 s; importar 71 nuevas; indexar 71 nuevas
2. local sin -Reindexar:     EXIT 1 en 4 s; «el índice se armó con el modelo «falso»…» y la pista de -Reindexar
3. local -Reindexar:         EXIT 0 en 7 s; indexar 71 nuevas
4. local otra vez:           EXIT 0 en 3 s; importar 0 nuevas, 71 sin cambios; indexar 0 nuevas, 71 sin cambios
buscar (la línea impresa, pegada tal cual, con -k 2): 2 resultados, EXIT 0
```

### Mutantes (suite completa, `subprocess.run(timeout=120)`, uno por vez y restaurados; `git status` limpio al final)
| # | Resultado |
|---|---|
| M1 | muerto: Ran 213, failures=4 |
| M2 | muerto: Ran 213, failures=5 |
| M3 | muerto: Ran 213, failures=18 |
| M4 (`\x1d\x1e`) | **muerto ahora**: Ran 213, failures=7 |
| M5 | muerto: Ran 213, failures=2 errors=5 |
| M6 | muerto: Ran 213, failures=16 errors=6 |
| M7 | muerto: Ran 213, failures=33 |
| M8 | muerto: Ran 213, failures=1 |
| M9 | muerto: Ran 213, failures=3 |
| M10 | muerto: failures=1 |
| M11 (`except ValueError`) | **muerto ahora**: Ran 213, errors=1 |
| M12 | muerto: Ran 213, failures=6 |
| Q1 CLI `_filtro_proyecto` devuelve el valor crudo | muerto: Ran 213, failures=2 |
| Q2 MCP `buscar` sin `slug` | muerto: Ran 213, failures=1 |
| Q3 `revisar`: `!=` → `==` | muerto: Ran 213, failures=1 |
| Q4 `exigir_respuestas` nunca falla | muerto: Ran 213, failures=1 |
| Q5 `_filtro_proyecto` sin `proyecto.strip()` (`"   "` → filtro `nota`) | **sobrevive**: Ran 213, OK (H12) |
| Q6 `revisar` sale con 1 si hay avisos | muerto: Ran 213, failures=1 |
| Q7 `carpeta = a.parent.name` | **sobrevive**: Ran 213, OK (H12) |
| X1 5 MB a stderr (tiene que pasar) | pasa: Ran 213, OK |
| X2 servidor colgado | muerto: Ran 213, failures=1, suite en 51.6 s |
| X3 `RuntimeError` en `buscar` | muerto: Ran 213, failures=1 errors=13 |
| X4 cae al arrancar con 5 MB de stderr | muerto: Ran 213, failures=1 en 10.9 s |

`instalar.ps1` no tiene tests automáticos (la tarjeta tampoco los pide): su chequeo de OneDrive lo probé a mano, con los 5 casos de la tabla de arriba.

### Hallazgos nuevos
1. **H11 MEDIA** (`cerebro/cerebro.py:124-126`, más `cerebro/indice.py:277`, que es la causa): ahora el filtro se normaliza con `slug()`, pero el índice sigue guardando el `proyecto` **crudo** del frontmatter. Entonces una nota escrita a mano (Obsidian, el camino que el playbook §B presenta como normal) con `proyecto: SDD Universal` en `proyectos/sdd-universal/` **no aparece con ningún `--proyecto`**. Lo probé: con `"SDD Universal"`, `False`; con `sdd-universal`, `False`; sin filtro, `True`. En la vuelta 1, `--proyecto "SDD Universal"` sí la encontraba, así que es una regresión de esta vuelta. Y el aviso nuevo de `revisar` dice lo contrario: «`buscar --proyecto` la encuentra como «SDD Universal», no como «sdd-universal»». Eso es falso: con el filtro normalizado, «SDD Universal» se convierte en `sdd-universal`.

   **Se espera** una de dos cosas:
   - **(a), la preferida:** guardar `notas.slug(nota.proyecto)` en `indice.py:277`. Así el filtro, la carpeta y el índice usan el mismo valor y las notas a mano vuelven a ser alcanzables. Hay que ampliar la zona a `indice.py`. Hay que avisar que un índice ya armado necesita `indexar --todo`, o subir la versión del esquema. El aviso de `revisar` queda como informativo, con texto verdadero.
   - **(b), la mínima, dentro de la zona actual:** corregir el texto del aviso. Por ejemplo: «`buscar --proyecto` no la encuentra (el filtro usa el nombre de la carpeta): corregí el frontmatter a `proyecto: <carpeta>`».

   En los dos casos hace falta un test que lo fije: una nota a mano con `proyecto` natural, y que `buscar --proyecto <carpeta>` la encuentre (a) o que el aviso no diga que la encuentra (b).
2. **H12 BAJA** (`cerebro/cerebro.py:79`, `:121`): Q5 y Q7 sobreviven. Ningún test cubre `--proyecto "   "`: hoy significa «sin filtro», y sin el `.strip()` filtraría por `nota`. Tampoco hay test de una nota en una subcarpeta (`proyectos/p/sub/x.md`), donde `parts[0]` y `parent.name` dan valores distintos. Con dos subtests alcanza.

### Cambios requeridos
1. H11: (a) o (b), con test.

Lo demás de la vuelta 1 quedó resuelto y verificado.

---

## Vuelta 3 @ 7d95dbf
**Veredicto:** APPROVED

Revisé el código `7d95dbf` (HEAD de la tarjeta `1571335`). El leader amplió la zona a `cerebro/indice.py`, con la opción (a) de H11, y el handback lo declara. Mismas reglas: no hice llamadas a OpenAI, no registré el MCP (`~/.claude.json` tiene 0 menciones de `mcp_server.py`) y el modelo de `~/.cache/cerebro/modelos` está intacto. Al final borré el venv del worktree, los `__pycache__`, los temporales y la copia del código viejo.

### Verificación re-ejecutada
```text
venv C-7 (3.14.0):                Ran 219 tests in 12.436s  OK
CEREBRO_SIN_MODELO=1 (venv):      Ran 219 tests in 10.462s  OK (skipped=1)
python del sistema (3.14.0):      Ran 219 tests in 8.704s   OK (skipped=3)
Python 3.11:                      Ran 219 tests in 7.485s   OK (skipped=3)
python harness/verify.py --quick: [OK] Tarjetas válidas (13) · [OK] Rutas citadas existen (163 revisadas) · VERDE — 0 FAIL, 0 WARN
```
(Borré el `current.md` de plantilla que creó `verify.py`.)

### H11 con un índice viejo de verdad
Primero extraje el código de `4108600` con `git archive` al scratchpad. Con ese código armé un índice `falso` en un temporal (`%TEMP%\c7rev3 ñ …`), que incluía la nota a mano `proyecto: SDD Universal` en `proyectos/sdd-universal/`. Su `meta` quedó `{'modelo': 'falso', 'dim': '64'}` y `notas.proyecto` = `SDD Universal`. Después corrí el código nuevo sobre ese índice:
```text
buscar membrillo                            -> exit 2, sin traceback: «el índice se armó con otra versión del esquema (anterior; la actual es 2) … Corré `cerebro.py indexar --todo`»
buscar membrillo --proyecto "SDD Universal" -> exit 2, el mismo mensaje
indexar                                     -> exit 2, el mismo mensaje
MCP buscar(proyecto="SDD Universal")        -> ErrorHerramienta con el mismo mensaje
MCP nota(...)                               -> «nota creada: proyectos/otro/…» + «aviso: no pude indexarla (…indexar --todo); corré `cerebro.py indexar`»
indexar --todo                              -> exit 0, «2 nuevas»; meta = {'modelo': 'falso', 'dim': '64', 'esquema': '2'}
buscar --proyecto "SDD Universal" / sdd-universal (CLI)  -> True / True
buscar(proyecto=...) (MCP)                               -> True / True
revisar -> exit 0; «se indexa como «sdd-universal» y el filtro `--proyecto` la alcanza igual (para unificarlo: `proyecto: sdd-universal`…)», que es verdad
```
Probé `instalar.ps1` sobre otro índice viejo, armado igual con el código de `4108600` en `%TEMP%\Cerebro v3rev ñ`:
- Sin `-Reindexar`: EXIT 1 con el mensaje del esquema y la pista de `-Reindexar`.
- Con `-Reindexar`: EXIT 0 y 71 nuevas.
- Corrida siguiente sin el switch: EXIT 0 e idempotente (0 nuevas, 71 sin cambios).

### H12
Ahora hay tests para `--proyecto "   "` (sin filtro) y para una nota en `proyectos/p/sub/x.md` (sin aviso). Q5 y Q7 **mueren**.

### Tests cambiados
`test_indice.py:406` y `test_local.py:263` siguen comparando `meta` con igualdad exacta; solo se agregó `"esquema": "2"`, así que no se debilitaron. El handback lo declara.

### Mutantes (suite completa, `subprocess.run(timeout=120)`, uno por vez y restaurados; `git status` limpio al final)
Re-apliqué los de las vueltas 1 y 2. Todos mueren, con `Ran 219` en cada corrida:

| Mutantes | Resultado |
|---|---|
| M1 a M12 | muertos (failures o errors entre 1 y 33) |
| Q1 a Q7 | muertos, incluidos **Q5 y Q7**, que en la vuelta 2 sobrevivían |
| X1 | pasa, como corresponde (5 MB a stderr) |
| X2 a X4 | muertos (X2 tarda 51.8 s) |

Nuevos, sobre la guardia de esquema y el slug en el índice:

| # | Mutante | Resultado |
|---|---|---|
| S1 | la guardia deja pasar un índice sin marca (`not in (None, VERSION)`) | muerto: Ran 219, failures=2 |
| S2 | `indexar` no escribe la marca `esquema` | muerto: Ran 219, failures=13 errors=45 |
| S3 | el índice guarda el `proyecto` crudo | muerto: Ran 219, failures=4 |
| S4 | `revisar` compara con `proyecto.lower()` en vez de con el slug | muerto: Ran 219, failures=1 |
| S5 | guardia de esquema desactivada (`if False`) | muerto: Ran 219, failures=2 |
| S6 | `RuntimeError` en vez de `ErrorModelo`, o sea traceback | muerto: Ran 219, errors=2 |
| S7 | `VERSION_ESQUEMA = "3"` sin migración | muerto: Ran 219, failures=4 |

### Observaciones (no bloquean)
- `cerebro/mcp_server.py:84`: con un índice de esquema viejo, `nota` termina con «corré `cerebro.py indexar`», sin `--todo`, después de citar el error, que sí dice `--todo`. Es cosmético.
- `instalar.ps1` sigue sin tests automáticos (la tarjeta no los pide). Su guardia de OneDrive y el `-Reindexar` los verifiqué a mano en las vueltas 2 y 3.
- Para el leader, fuera de zona: el playbook §C no menciona el venv, `-s user` ni `instalar.ps1`. Y la primera corrida real de `cerebro.yml` en Actions queda para después del push.

Los cuatro criterios de la tarjeta y los hallazgos H1 a H12 están cubiertos con evidencia re-ejecutada.
