# Review C-9 @ d71641b
**Veredicto:** APPROVED

Reviewer independiente (tier ALTO). Base `e9b3589`, código `d71641b`, handback en `cb126dd`. Trabajé en el worktree `sdd-universal-C-9-rev`, con el venv de `sdd-universal-C-9` (Python 3.14.0, fastembed 0.8.1). No hubo llamadas a OpenAI, no registré el MCP, no bajé ni borré modelos (usé los dos que ya estaban en `~/.cache/cerebro/modelos`). Todos los `CEREBRO_DIR` fueron temporales en `%TEMP%` y quedaron borrados.

## Verificación re-ejecutada
```text
$ <venv C-9>/python.exe -m unittest discover -s cerebro/tests      (modelo real mpnet)  -> Ran 225 tests in 16.379s  OK
$ CEREBRO_SIN_MODELO=1 (venv)                                                          -> Ran 225 tests in 12.286s  OK (skipped=1)
$ python -m unittest discover -s cerebro/tests   (sistema 3.14.0, sin fastembed)       -> Ran 225 tests in 9.970s   OK (skipped=3)
$ python harness/verify.py --quick
[OK]    Tarjetas válidas (14)
[OK]    Rutas citadas existen (178 revisadas)
VERDE — 0 FAIL, 0 WARN
```
Las tres suites corrieron con `subprocess.run(..., timeout=180)`. `verify.py` creó `sdd/progress/v0.36-C-9-rev/current.md` de plantilla y lo borré.

## Modelo, verificado en el código instalado (no de memoria)
`TextEmbedding.list_supported_models()` de fastembed 0.8.1 (`fastembed/text/pooled_embedding.py:62-70`):
`sentence-transformers/paraphrase-multilingual-mpnet-base-v2`, fuente HF `xenova/paraphrase-multilingual-mpnet-base-v2`, `model_file` `onnx/model.onnx`, `dim` 768, `size_in_GB` 1.0, 384 tokens, apache-2.0, sin `additional_files`. Coincide con `cerebro/embedders.py:62-67` y con el README.

Huella de caché real: `~/.cache/cerebro/modelos/models--xenova--paraphrase-multilingual-mpnet-base-v2/snapshots/e5d1162…/onnx/model.onnx`. `HUELLA_CACHE` (`paraphrase-multilingual-mpnet-base-v2`) está en el nombre de la carpeta. El glob `snapshots/*/**/*.onnx` la encuentra: en la corrida real, `indexar` no imprimió el aviso de descarga en stderr. La carpeta de MiniLM (`models--qdrant--paraphrase-multilingual-MiniLM-L12-v2-onnx-Q`) no contiene la huella nueva, así que no se confunde con el modelo bajado. El bug del glob viejo (`*/*.onnx` no ve `onnx/model.onnx`) es real y está bien corregido.

Restos del modelo viejo (`grep -rniE "minilm|220 ?MB|0,22|\b384\b|qdrant"` en `cerebro/`, `.github/`, `harness/`, `playbooks/`):
- `cerebro/README.md:58` dice «384 tokens de entrada»: es un dato correcto de mpnet. `cerebro/README.md:60` es la prosa del DRIFT y nombra MiniLM a propósito.
- `cerebro/tests/test_local.py:262,279,283,288`: el fixture `VIEJO` y los docstrings, declarados en el handback.
- `playbooks/obsidian-cerebro.md:68` sigue diciendo «~220 MB». Está fuera de la zona de la tarjeta y el handback lo marca (H4).
- `embedders.py`, `instalar.ps1` y el workflow ya no nombran el modelo viejo.

## Corrida real (criterio 5), reproducida
`CEREBRO_DIR` temporal, `CEREBRO_EMBEDDINGS=local`, código `@ cb126dd`:
```text
$ cerebro.py init  (exit=0)
$ cerebro.py importar-sdd <sdd-universal-C-9-rev>  (exit=0)
importadas: 42 escenario, 26 hallazgo, 3 leccion
71 nuevas, 0 actualizadas, 0 sin cambios, 0 editadas a mano (no se pisaron), 0 huérfanas (se dejan)
$ cerebro.py indexar  (exit=0, sin aviso de descarga en stderr)
71 nuevas, 0 actualizadas, 0 sin cambios, 0 borradas
$ cerebro.py buscar "el loop no sabe cuándo frenar" -k 3
1. El humano pide «seguí el loop hasta dejarlo de 10» y se va  [sdd-universal · escenario]  puntaje 0.032787   fuente: scenarios.md#S39
2. A mitad de la implementación, la spec aprobada resulta estar mal (…)                       puntaje 0.032002   fuente: scenarios.md#S22
3. Hackathon / prototipo descartable                                                            puntaje 0.030536   fuente: scenarios.md#S04
$ cerebro.py buscar "copió un archivo para que pase el check" -k 3
1. Lección para `scenarios.md` (propuesta, pide OK)                                             puntaje 0.031778   fuente: sdd/loops/dev-de-10.md#resumen-al-cortar
2. Los controles mismos mienten: …                                                              puntaje 0.031498   fuente: scenarios.md#S29
3. Tarjeta con un obstáculo de diseño despachada al tier más barato                             puntaje 0.031099   fuente: scenarios.md#S42
$ buscar "el loop no sabe cuándo frenar" -k 10 --json
  S39 .032787 | S22 .032002 | S04 .030536 | S42 .030159 | H22 .03009 | S26 | S25 | S29 | S40 | H21
$ buscar "copió un archivo para que pase el check" -k 10 --json
  dev-de-10#resumen-al-cortar .031778 | S29 .031498 | S42 .031099 | H25 .029851 | dev-de-10#resumen-al-cortar .029236 | S03 | S39 | H13 | S32 | S23
```
Los puntajes coinciden con el handback hasta el sexto decimal: S39 queda primera y S42 tercera. **El objetivo 3 se cumple.**

## Robustez: paráfrasis (observación, no bloqueante)
Las mismas notas (importadas de este worktree) se indexaron dos veces. Con mpnet usé el código `d71641b`. Con MiniLM usé el código `e9b3589`, sacado con `git archive` a un temporal. Columna = puesto de la nota buscada en `buscar -k 30 --json` («>30» = no aparece).

| Escenario | Consulta | mpnet | MiniLM |
|---|---|---|---|
| S39 | el loop no sabe cuándo frenar (objetivo) | **1** | **1** |
| S39 | el loop sigue sin criterio de corte | 1 | 1 |
| S39 | el agente no sabe cuándo parar de iterar | 4 | 1 |
| S39 | seguir iterando sin una condición de fin | 3 | 2 |
| S39 | no hay un criterio para terminar el ciclo de mejoras | 10 | 2 |
| S42 | copió un archivo para que pase el check (objetivo) | **3** | 10 |
| S42 | el agente tocó archivos para que el chequeo dé verde | >30 | >30 |
| S42 | copiaron un archivo para que el test pase | >30 | >30 |
| S42 | hizo trampa copiando archivos para pasar la verificación | >30 | >30 |
| S42 | duplicó un archivo para que la validación no falle | >30 | >30 |

Lectura:
- **S42 llega al top 3 solo con la frase exacta, y por poco.** Con 0.031099 queda tercera, a 0.0004 de S29 (segunda) y a 0.0012 de H25 (cuarta). Ninguna de las cuatro paráfrasis la trae en el top 30, ni con mpnet ni con MiniLM. En dos de ellas la primera nota es la lección hermana de `dev-de-10#resumen-al-cortar`, que cuenta el mismo caso: la memoria sí recupera el caso, pero no por la nota S42. El motivo probable es que el resumen de S42 habla de «tier barato» y «obstáculo de diseño», y la copia aparece solo en el cuerpo.
- **Con S39, mpnet es peor que MiniLM en paráfrasis:** queda en 1, 1, 4, 3 y 10, contra 1, 1, 1, 2 y 2 con MiniLM.
- En resumen, el cambio de modelo mejora la frase del objetivo para S42 (del puesto 10 al 3) y empeora la robustez de S39. No hay evidencia de que mpnet busque mejor en general, solo de que cumple las dos frases del objetivo. Es la decisión del owner (DRIFT R25) y la corrida se reproduce, así que no bloquea. La anoto para el leader y el owner (H1).

## Guardia de modelo (criterio 2 y criterio 6), real
Armé el índice con el código base (MiniLM) y después usé el código nuevo:
```text
$ cerebro.py buscar loop -k 2   exit=2
error: el índice se armó con el modelo «sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2» (dim 384) y el activo es «sentence-transformers/paraphrase-multilingual-mpnet-base-v2» (dim 768): los vectores de dos modelos no se comparan. Corré `cerebro.py indexar --todo`
traceback: False
$ cerebro.py indexar   exit=2   -> el mismo error, sin traceback
$ mcp_server.nota(...)
nota creada: proyectos/rev/2026-10-06-prueba-guardia.md
aviso: no pude indexarla (el índice se armó con el modelo «…MiniLM-L12-v2» (dim 384) y el activo es «…mpnet-base-v2» (dim 768): … Corré `cerebro.py indexar --todo`); corré `cerebro.py indexar --todo`
$ mcp_server.buscar("loop", k=2)  -> ErrorHerramienta con el mismo texto (pide indexar --todo)
$ cerebro.py indexar --todo   exit=0   -> 72 nuevas, 0 actualizadas, 0 sin cambios, 0 borradas
$ cerebro.py buscar loop -k 1   exit=0  -> 1. S39
```
La guardia (`indice.py:217-221`) ya existía. C-9 le agrega los tests (`TestIndiceDeOtroModelo`) y el texto de `mcp_server.py:84`. El aviso de `nota` repite el pedido de `--todo` (una vez dentro del mensaje del error y otra en la cola), lo cual es redundante pero no está mal.

## Checkpoints
- C1: [x] `verify.py --quick` VERDE (0 FAIL, 0 WARN) y las rutas nuevas existen.
- C2: [x] Los seis criterios tienen evidencia (detalle abajo). El diff `e9b3589..d71641b` toca solo `embedders.py`, `mcp_server.py` (el import y el texto), `tests/test_local.py`, `tests/test_mcp_server.py`, `README.md`, `instalar.ps1` (dos textos) y el comentario del workflow. No hay cambios en `indice.py` (RRF, FTS, fragmentos) ni en otra feature. `cb126dd` toca solo `sdd/progress/v0.36-C-9/`.
- C3: [x] Una sola definición en `embedders.py:62-67` y R05/R06 respetados. La huella se deriva del nombre del modelo y no de la fuente HF. Hoy coinciden (ver H5).
- C4: [x] Re-ejecuté la verificación. Hay tests nuevos para el camino feliz (nombre/dim, huella, textos, aviso de `nota` con `--todo`) y para el error (`buscar` e `indexar` con un índice de otro modelo). Nada quedó skipeado de más (skipped 1/3 por motivo, como antes). Ningún test se borró. Cambios en tests existentes:
  - Los literales pasaron a constantes. Declarado.
  - `test_crearlo_no_carga_nada` pierde `assertEqual(e.dim, 384)`. Lo que ataba sigue cubierto: la línea anterior compara con `DIM_LOCAL` y `test_nombre_y_dim_…` fija 768.
  - `test_snapshots_vacio_o_sin_onnx_no_cuenta_como_bajado` deja la carpeta `onnx/` vacía en el caso «snapshots vacio» (ver H3).
- C5: [x] El handback está completo y commiteado, y `current.md` de la rama existe. No quedan throwaway ni secretos, y no hay variables de entorno nuevas.

## Criterio → evidencia
1. Una sola definición y nada viejo hardcodeado: **[x]**. `embedders.py:62-67`; grep sin restos en código, `instalar.ps1`, workflow ni README. M6/M7/M9 muertos. Solo queda el playbook (H4), fuera de zona y fuera de la lista del criterio.
2. Índice de MiniLM → error claro sin traceback: **[x]**. `TestIndiceDeOtroModelo` (3 tests) y la corrida real de arriba.
3. README «Modelo de embeddings» con decisión, motivo y descartado: **[x]**. `cerebro/README.md:58-62`.
4. Los tests de C-3 siguen atando lo mismo: **[x]**. Los de aviso, stderr, carga perezosa y caché están verdes con constantes, y el de snapshot sin `.onnx` también (M4 y M10 muertos). La estructura falsa ahora es la real de fastembed.
5. Corrida real con S39 y S42 en el top 3: **[x]**. Reproducida con el mismo puntaje (ver la sección de robustez).
6. Aviso de `nota` con un índice viejo pide `indexar --todo`: **[x]**. `test_con_un_indice_de_otro_modelo_el_aviso_pide_indexar_todo` y la corrida real. Pero la rama `else` no está atada (H2).

## Mutantes propios
Uno por vez, con la suite completa (`venv`, `CEREBRO_SIN_MODELO=1`, `subprocess.run(..., timeout=180)`). Después de cada uno restauré el archivo original byte a byte. Al final, `git status` quedó limpio.

| Mutante | Corrida | Lo mata |
|---|---|---|
| R1 `nota`: `--todo` ante cualquier `ErrorIndice` | Ran 225 tests, OK (skipped=1) | **SOBREVIVE** (H2) |
| R2 `nota`: siempre `--todo` (sin condicional) | Ran 225 tests, OK (skipped=1) | **SOBREVIVE** (H2) |
| R3 `HUELLA_CACHE = "paraphrase-multilingual"` (también matchea MiniLM) | Ran 225 tests, FAILED (failures=1) | test_huella_de_cache_sale_del_nombre_del_modelo |
| R4 glob `*/**/*` (cualquier archivo cuenta) | Ran 225 tests, FAILED (failures=3) | test_snapshots_vacio_o_sin_onnx_no_cuenta_como_bajado (3 subtests) |
| R5 glob desde la carpeta del modelo (`d.glob("**/*.onnx")`, incluye `blobs/`) | Ran 225 tests, OK (skipped=1) | **SOBREVIVE**: casi equivalente, porque en `blobs/` los nombres son hashes sin `.onnx` |
| R6 `DIM_LOCAL = 769` | Ran 225 tests, FAILED (failures=1) | test_nombre_y_dim_son_los_del_modelo_multilingue |
| R7 `Local.nombre` = literal MiniLM | Ran 225 tests, FAILED (failures=5) | test_nombre_y_dim_…, test_el_indice_guarda_modelo_y_dim_del_local, test_obtener_local_…, test_el_cargador_real_…, test_el_aviso_va_a_stderr_… |
| R8 `instalar.ps1`: «(~11 GB)» | Ran 225 tests, OK (skipped=1) | **SOBREVIVE** (H6: el test busca la subcadena «1 GB») |
| R9 aviso de descarga sin `PESO_LOCAL` | Ran 225 tests, FAILED (failures=1) | test_primera_corrida_avisa_nombre_y_peso |
| R10 `_en_cache` siempre False | Ran 225 tests, FAILED (failures=1) | test_con_el_modelo_en_cache_no_avisa |

## Hallazgos
- **H1 (ALTA, observación para el owner, no bloquea):** el top 3 de S42 se sostiene solo con la frase exacta del objetivo y por un margen de 0.0004 a 0.0012 de puntaje RRF. Cuatro paráfrasis razonables la dejan fuera del top 30 con los dos modelos. Además, mpnet empeora a S39 en paráfrasis (puestos 4, 3 y 10 contra 1, 2 y 2 con MiniLM). El objetivo 3 está cumplido tal como está escrito, pero no prueba que la búsqueda haya mejorado. Lo que más probablemente ayude a S42 es contenido, no modelo: un resumen de S42 en `scenarios.md` que nombre la copia («copió el master para que el check pasara»), o fusionar la nota con la lección `dev-de-10#resumen-al-cortar`. Si el owner quiere un objetivo robusto, el próximo DRIFT debería medir un conjunto de paráfrasis y no una frase sola.
- **H2 (MEDIA, deuda):** `cerebro/mcp_server.py:84` agrega una rama, pero solo está atado el lado `ErrorModelo`. `cerebro/tests/test_mcp_server.py:175` (`test_si_no_se_puede_indexar_la_nota_igual_queda`) comprueba solo `"aviso" in r`. Por eso R1 y R2 sobreviven: si se quita el condicional y el aviso pide siempre `--todo`, nada falla. Arreglo: en ese test, `assertTrue(r.endswith("corré `cerebro.py indexar`"))` y `assertNotIn("--todo", r)`. No bloquea porque el criterio 6 pide solo el lado `--todo` y la rama `else` conserva el texto previo a C-9.
- **H3 (BAJA):** `cerebro/tests/test_local.py:185`. El caso «snapshots vacio» ya no deja el snapshot vacío, porque queda la carpeta `onnx/` vacía. Sigue atando «sin `.onnx` no cuenta» (R4 lo prueba), pero el nombre del subtest dice otra cosa.
- **H4 (BAJA, fuera de zona):** `playbooks/obsidian-cerebro.md:68` sigue con «~220 MB». Lo actualiza el leader, como sugiere el handback.
- **H5 (BAJA):** `cerebro/embedders.py:67`. `HUELLA_CACHE` se deriva del nombre del modelo (`sentence-transformers/…`), pero la carpeta la nombra la fuente HF (`xenova/…`). Hoy la fuente contiene el nombre. Si fastembed cambiara la fuente (por ejemplo a un `…-onnx-Q` con otro nombre), el aviso saldría siempre. No es un error, pero el comentario de la línea 67 no lo dice.
- **H6 (BAJA):** `cerebro/tests/test_local.py:271` usa `assertIn("1 GB", texto)`, así que «~11 GB» pasa (R8). Es aceptable para un texto, pero un regex `~1 GB|cerca de 1 GB` lo ataría mejor.

## Mejoras al arnés detectadas
- Para un objetivo de búsqueda semántica, exigir en la tarjeta un conjunto de paráfrasis (por ejemplo, 3 por nota con un umbral de top 5) y no una frase única: así un cambio de modelo no se elige por una sola consulta (H1).
- Cuando una tarjeta agrega un condicional a un texto de error, pedir en «Verificación requerida» el mutante «sin condicional» (H2).
