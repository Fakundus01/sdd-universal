# Handback C-3 — Embedder local con fastembed

- **Estado:** done
- **Rama / commit:** `v0.36-C-3` @ `3ca371f` (código vuelta 2; el handback va en el commit siguiente)
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
