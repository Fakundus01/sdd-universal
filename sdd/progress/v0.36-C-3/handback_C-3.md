# Handback C-3 — Embedder local con fastembed

- **Estado:** done
- **Rama / commit:** `v0.36-C-3` @ `7c5d48c` (código vuelta 3; el handback va en el commit siguiente)
- **Quién:** implementer (MEDIO)

## Hecho
- `embedders.Local`: fastembed perezoso (crearlo no importa nada; carga en el primer `embed`), modelo `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, 384 dim. `obtener("local")` lo devuelve.
- Primera corrida: avisa por stderr qué baja («unos 220 MB, una sola vez») y adónde; si el modelo ya está en cache no avisa. Sin red: `ErrorEmbedder` claro (menciona internet y el modelo); sin fastembed: `ErrorEmbedder` con `pip install -r cerebro/requirements.txt`.
- `cerebro/requirements.txt` (`fastembed==0.8.1`, `mcp==2.3.0`), `cerebro/README.md` con tabla R28, `.gitignore` con `cerebro/.venv/`.

## No hecho / pendiente
- `openai`: no instalado ni pinneado (es de C-6; la tarjeta no lo pide).
- `mcp` solo se instaló y pinneó; su uso es de C-4.

## Cómo
- Versiones: `pip index versions` + JSON de PyPI el 2026-10-06: fastembed 0.8.1 (2026-09-22), mcp 2.3.0 (2026-10-02). Instalados solo en `cerebro/.venv` (Python 3.14.0 del sistema; wheels disponibles).
- Modelo verificado con `TextEmbedding.list_supported_models()` de 0.8.1: `...paraphrase-multilingual-MiniLM-L12-v2`, dim 384, 0.22 GB, apache-2.0 (fuente HF `qdrant/...-onnx-Q`). Descartados e5-large (2,24 GB) y mpnet (1,0 GB). Pesa menos de 600 MB.
- Cache propia persistente (`~/.cache/cerebro/modelos`, `CEREBRO_MODELOS`): el default de fastembed es el temp del sistema y se volvería a bajar. Se detecta «ya bajado» por una carpeta `models--*paraphrase-multilingual-minilm-l12-v2*` con `snapshots/`.
- `HF_HUB_DISABLE_SYMLINKS_WARNING=1` por defecto (ruido en Windows sin modo desarrollador).
- Inyección `cargar/avisar/cache` en `Local` para testear sin red.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| cerebro/embedders.py | `Local`, `dir_modelos`, `obtener("local")` |
| cerebro/tests/test_local.py | 23 tests (22 unitarios + 1 integración con el modelo real) |
| cerebro/requirements.txt | nuevo |
| cerebro/README.md | nuevo (instalación, modelo, R28, variables) |
| .gitignore | `cerebro/.venv/` |
| sdd/progress/v0.36-C-3/ | current.md, este handback |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1. requirements + README R28 | `cerebro/requirements.txt`, tabla en `cerebro/README.md` |
| 2. modelo multilingüe verificado, nombre y dim en `meta` | `test_nombre_y_dim_son_los_del_modelo_multilingue`, `TestMetaConLocal` |
| 3. venv en el worktree, ignorado | `cerebro/.venv` (`git status` no lo lista); `.gitignore` |
| 4. integración con modelo real | `test_mismo_sentido_con_otras_palabras_queda_mas_cerca_que_una_frase_ajena` (corrió, no salteado); con el python del sistema se saltea con motivo |
| 5. aviso de descarga / error sin red | `test_primera_corrida_avisa_nombre_y_peso`, `test_con_el_modelo_en_cache_no_avisa`, `test_sin_red_error_claro` |

Rojo antes (R29), medido contra la base con `Local` stub (importa; `embed` y `dir_modelos` lanzan NotImplementedError, nombre/dim vacíos):
```text
$ git rev-parse --short HEAD
6c1a023
$ cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -p test_local.py   (extracto)
ERROR: test_mismo_sentido_... (TestLocalIntegracion)      ERROR: test_cache_con_otro_modelo_igual_avisa
ERROR: test_cache_por_defecto_y_variable_de_entorno       ERROR: test_con_el_modelo_en_cache_no_avisa
ERROR: test_embed_devuelve_listas_de_floats_...           ERROR: test_obtener_local_devuelve_local_sin_importar_fastembed
ERROR: test_primera_corrida_avisa_nombre_y_peso           ERROR: test_sin_fastembed_error_con_el_comando_...
ERROR: test_sin_red_error_claro                           ERROR: test_vector_de_otra_dimension_es_error
ERROR: test_el_indice_guarda_modelo_y_dim_del_local
FAIL: test_nombre_y_dim_son_los_del_modelo_multilingue
AssertionError: '' != 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'
Ran 13 tests in 0.057s
FAILED (failures=1, errors=11)
```
(El test 14, `test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed`, nació del mutante de cache que sobrevivió; su rojo está en la tabla: mutante `cache_dir=None` → FAIL.)

Verde después:
```text
$ cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -v   (cola)
Ran 87 tests in 4.370s
OK
$ python -m unittest discover -s cerebro/tests      (Python del sistema, sin fastembed)
Ran 87 tests in 2.028s
OK (skipped=1)     # la integración, con motivo explícito
$ python harness/verify.py --changed   -> VERDE — 0 FAIL, 0 WARN
```
La primera corrida real bajó el modelo (~32 s) y mostró el aviso «bajando el modelo de embeddings «sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2» (unos 220 MB, una sola vez) a C:\Users\Facundo\.cache\cerebro\modelos ...».

Mutantes (a mano, `timeout 120`, sobre `embedders.py`):
| Mutante | Resultado |
|---|---|
| DIM_LOCAL 384→768 | muerto |
| modelo L12→L6 | muerto |
| nunca avisa / siempre avisa | muertos |
| cache cuenta sin `snapshots/` | muerto |
| cache de otro modelo cuenta | muerto |
| recarga el modelo en cada embed | muerto |
| error de red sin envolver | muerto |
| mensaje sin «internet» | muerto |
| no valida la dimensión | muerto |
| lista vacía carga el modelo | muerto |
| no convierte a float | muerto |
| `obtener` sin rama local | muerto |
| sin fastembed lanza RuntimeError | muerto |
| cache por defecto en el temp del sistema | muerto |
| `cache_dir=None` en fastembed | **sobrevivió** al principio → agregado `test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed` → muerto |

## Fuera de zona / riesgos
- El test de integración usa el cache real del usuario (`~/.cache/cerebro/modelos`), no un temporal, para no bajar 220 MB por corrida; se puede redirigir con `CEREBRO_MODELOS`.
- `mcp` salta a la serie 2.x (2.3.0): C-4 debe escribir contra esa API, no la 1.x que conoce de memoria.
- `README.md` de `cerebro/` es nuevo: C-4/C-5 pueden tocarlo y generar conflicto de merge (resolver conservando ambas secciones).

## Cambios de spec sugeridos
- Playbook §C paso 1: `pip install` debe hacerse en `cerebro/.venv`; y agregar `CEREBRO_MODELOS` a las variables.

## Variables de entorno nuevas
- `CEREBRO_MODELOS` — carpeta del modelo bajado — se lee en `embedders.dir_modelos()` (opcional).

## Próximo paso sugerido
- C-4 (MCP) sobre `mcp==2.3.0`; C-6 (OpenAI) reutiliza la interfaz `Embedder`.

## Apéndice: vueltas
- Vuelta 2 (`3ca371f`, review CHANGES_REQUESTED @ 1d11328): agregados tests de orden del aviso (antes de la carga, y aunque la carga falle), canal (stderr, stdout vacío), pereza del import (subproceso con `-I`, `fastembed` no en `sys.modules`), «sin fastembed» distinto de «sin internet», cantidad de vectores y dimensión mezclada, conversión a float. Código: `_en_cache` exige un `*.onnx` dentro de `snapshots/*/` (snapshots vacío o descarga cortada vuelve a avisar); `HF_HUB_DISABLE_SYMLINKS_WARNING` se fija solo durante la carga y se restaura (README lo documenta).
- Suite: 96 tests OK con el venv (integración corrida) y 96 OK (1 salteado) con el Python del sistema; `verify.py --changed` VERDE.
- Rojo de los tests nuevos: los de M1–M4, M7, M8 pasan contra el código bueno por diseño (la review apuntó a mutantes), así que el rojo es el mutante (tabla). Los de `_en_cache` y entorno sí fallaron contra el código de la vuelta 1 (base 41f90db): `FAIL: test_el_entorno_del_proceso_no_queda_cambiado`, `FAIL: test_snapshots_vacio_o_sin_onnx_no_cuenta_como_bajado [sin onnx]` y `[snapshots vacio]` (Ran 22, failures=3).
- **Corrección de honestidad:** la tabla de mutantes de la vuelta 1 era inválida: el script llamaba a `timeout` y en Windows resolvió `timeout.exe` (falla siempre), así que todos figuraban «muertos» sin correr. Rehecha con `subprocess` y timeout de 120 s (intérprete del venv); resultados reales abajo. En esa corrida sobrevivieron dos (`cache de otro modelo cuenta`, `no convierte a float`) y se agregaron tests.

Mutantes vuelta 2 (sobre `embedders.py`, 120 s por corrida, test que lo mata):
| Mutante | Resultado | Test que lo mata |
|---|---|---|
| M1 aviso a stdout | muerto | test_el_aviso_va_a_stderr_y_stdout_queda_limpio |
| M2 import ansioso de fastembed | muerto | test_importar_el_nucleo_no_importa_fastembed |
| M3 aviso después de la carga | muerto | test_aviso_sale_antes_de_la_carga_del_modelo, test_aviso_sale_aunque_la_carga_falle |
| M4 sin `except ErrorEmbedder` | muerto | test_sin_fastembed_error_con_el_comando_de_instalacion |
| M7 `any`→`all` en dim | muerto | test_un_solo_vector_de_dimension_mezclada_es_error |
| M8 sin chequeo de cantidad | muerto | test_distinta_cantidad_de_vectores_es_error |
| snapshots vacío cuenta como bajado | muerto | test_snapshots_vacio_o_sin_onnx_no_cuenta_como_bajado |
| entorno queda cambiado | muerto | test_el_entorno_del_proceso_no_queda_cambiado |
| cache de otro modelo cuenta | sobrevivió → test ajustado → muerto | test_cache_con_otro_modelo_igual_avisa |
| no convierte a float | sobrevivió → test nuevo → muerto | test_convierte_cualquier_secuencia_numerica_a_lista_de_floats |
| dim 768, modelo L6, nunca/siempre avisa, recarga cada vez, error de red sin envolver, mensaje sin «internet», lista vacía carga, `obtener` sin local, RuntimeError sin fastembed, `cache_dir=None` | muertos | tests de la vuelta 1 y 2 |
- Vuelta 3 (`7c5d48c`, review vuelta 2 @ 3ca371f): H7 (MEDIA) la variable `HF_HUB_DISABLE_SYMLINKS_WARNING` no tenía efecto porque `huggingface_hub` la lee al importarse y se fijaba después del `from fastembed import`. Ahora `_importar_fastembed()` hace `os.environ.setdefault(...)` **antes** del import (respeta lo del usuario; queda en el entorno del proceso, justificado: `huggingface_hub` la necesita ahí). Se reemplazó el test del no-op (`test_el_entorno_del_proceso_no_queda_cambiado`) por `test_la_variable_de_symlinks_se_fija_antes_del_import_y_respeta_la_del_usuario` (módulo falso cuya `TextEmbedding` registra la variable al importarse) y `TestSymlinksHF.test_huggingface_hub_ve_la_variable_tras_importar_fastembed` (subproceso `-I`; exige `huggingface_hub.constants.HF_HUB_DISABLE_SYMLINKS_WARNING is True`; salteado con motivo sin fastembed). README corregido. BAJA (M11): el `subTest` agrega «otros archivos sin onnx» (`config.json`, `tokenizer.json`).
- Rojo: contra el `embedders.py` de 3ca371f (sin `_importar_fastembed`) los dos tests nuevos fallan (`ERROR ...se_fija_antes_del_import...`, `FAIL ...huggingface_hub_ve_la_variable...`, Ran 22, failures=1 errors=1). Ese rojo es débil (falta la función); el rojo fuerte son los mutantes de abajo.
- Suite: 95 tests OK con el venv; 95 OK (2 salteados con motivo) con el Python del sistema; `verify.py --changed` VERDE.

Mutantes vuelta 3 (`subprocess.run(..., timeout=120)` con el intérprete del venv, «Ran 22 tests» de `test_local.py` en cada corrida, scripts en `$TEMP/c3impl/`):
| Mutante | Resultado | Test que lo mata |
|---|---|---|
| H7a sin `setdefault` | muerto | ambos tests de symlinks |
| H7b `setdefault` después del import | muerto | ambos tests de symlinks |
| H7c pisa el valor del usuario (`__setitem__`) | muerto | test unitario de symlinks |
| M11 `glob("*/*.onnx")`→`glob("*/*")` | muerto | test_snapshots_vacio_o_sin_onnx_no_cuenta_como_bajado [otros archivos sin onnx] |
| M1 aviso a stdout | muerto | test_el_aviso_va_a_stderr_y_stdout_queda_limpio |
| M3 sin aviso previo | muerto | test_aviso_sale_antes_de_la_carga_del_modelo y _aunque_la_carga_falle |

## Vuelta 4 (implementer ALTO, review CHANGES_REQUESTED @ 7c5d48c)

**Declaración de lo borrado en la vuelta 3.** Además del reemplazo declarado (`test_el_entorno_del_proceso_no_queda_cambiado`), la vuelta 3 borró sin declararlo dos tests de `cerebro/tests/test_local.py` (en `3ca371f`, líneas 225 y 239):
- `test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed` (cubría `embedders.py:93-94`): mataba sin red `cache_dir=None` y el `model_name` equivocado.
- `test_cache_por_defecto_y_variable_de_entorno` (cubría `embedders.py:67-71`, único test de `dir_modelos()`).
Con el borrado, la suite pasó de 96 a 95 tests y M9, M15 y M17 sobrevivieron. M16 moría solo por la integración, con red y modelo. La tabla de la vuelta 3 tampoco lo detectó porque corría solo `test_local.py` (Ran 22) y no incluía esos mutantes.

**Restauración** (solo `cerebro/tests/test_local.py`; `embedders.py` sin cambios desde `7c5d48c`):
- `test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed`, adaptado a `_importar_fastembed`: `mock.patch.object(embedders, "_importar_fastembed", return_value=TextEmbedding)` con una clase falsa que registra los kwargs. No toca `sys.modules` ni el entorno, y no baja modelos. Exige que `embed([])` no cargue nada y que la carga pida exactamente `{"model_name": MODELO_LOCAL, "cache_dir": str(cache)}`.
- `test_cache_por_defecto_y_variable_de_entorno`: con `CEREBRO_MODELOS` devuelve esa ruta. Sin ella devuelve exactamente `Path.home()/.cache/cerebro/modelos` y no queda dentro de `tempfile.gettempdir()`. Es un poco más estricto que el original, que solo miraba las dos últimas partes.

**Rojo y verde** (los dos tests pasan contra el código bueno por diseño: el rojo es el mutante). Script `scratchpad/c3impl4/mut.py`: un mutante por vez sobre `cerebro/embedders.py`, la **suite completa** (`subprocess.run([py, "-m", "unittest", "discover", "-s", "cerebro/tests"], timeout=120)`) con el venv y con el Python del sistema. Las corridas usaron `HTTP(S)_PROXY=http://127.0.0.1:9` para que ningún mutante pudiera bajar un modelo. Al final se restauraron los bytes originales (`restaurado: True`).

| Corrida | venv | sistema (sin fastembed) |
|---|---|---|
| base (verde) | Ran 97 tests, OK | Ran 97 tests, OK (skipped=2) |
| M9 `CEREBRO_MODELOS` ignorado (`propio = ""`) | Ran 97, FAILED (failures=1): test_cache_por_defecto_y_variable_de_entorno | Ran 97, FAILED (failures=1, skipped=2): el mismo |
| M15 `cache_dir=None` | Ran 97, FAILED (failures=1): test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed | Ran 97, FAILED (failures=1, skipped=2): el mismo |
| M16 `model_name` fijo a `all-MiniLM-L6-v2` | Ran 97, FAILED (failures=1, errors=1): test_el_cargador_real_… + la integración (sin red) | Ran 97, FAILED (failures=1, skipped=2): test_el_cargador_real_… (muere **sin red ni fastembed**) |
| M17 caché por defecto en `tempfile.gettempdir()` | Ran 97, FAILED (failures=1, errors=1): test_cache_por_defecto_… + la integración (sin red) | Ran 97, FAILED (failures=1, skipped=2): test_cache_por_defecto_… |

Limpieza: el intento de carga de la integración bajo M17 creó `%TEMP%\cerebro\modelos`, vacío, a las 10:11:47. Antes de la corrida no existía, así que lo borré. `~/.cache/cerebro/modelos` sigue igual: solo el modelo multilingüe. M16 no bajó nada.

**Suite final** (código sin mutar):
```text
$ cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -v
test_mismo_sentido_con_otras_palabras_queda_mas_cerca_que_una_frase_ajena ... ok
test_cache_por_defecto_y_variable_de_entorno ... ok
test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed ... ok
Ran 97 tests in 4.291s
OK
$ python -m unittest discover -s cerebro/tests -v   (sistema, sin fastembed)
Ran 97 tests in 1.834s
OK (skipped=2)
$ python harness/verify.py --changed
VERDE — 0 FAIL, 0 WARN
```
95 → 97: vuelven los dos tests borrados.
