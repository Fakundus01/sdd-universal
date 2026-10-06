# Review C-3 @ 7c5d48c
**Veredicto:** CHANGES_REQUESTED (vuelta 3; las vueltas 1 @ 1d11328 y 2 @ 3ca371f también fueron CHANGES_REQUESTED, abajo)

## Vuelta 3 @ 7c5d48c

Diff revisado: `git diff 3ca371f..7c5d48c` (código) más `5e607a1` (handback). Archivos tocados: `cerebro/embedders.py`, `cerebro/README.md`, `cerebro/tests/test_local.py` y el handback. `review_C-3.md` no se tocó (`git diff 1ea8fec..5e607a1`). Zona OK.

### Verificación re-ejecutada
```text
$ cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -v
test_huggingface_hub_ve_la_variable_tras_importar_fastembed (test_local.TestSymlinksHF...) ... ok
test_mismo_sentido_con_otras_palabras_queda_mas_cerca_que_una_frase_ajena (test_local.TestLocalIntegracion...) ... ok
Ran 95 tests in 4.274s
OK
$ python -m unittest discover -s cerebro/tests -v   (sistema, sin fastembed)
... skipped 'fastembed no está instalado: `python -m venv cerebro/.venv` y ...'
... skipped 'fastembed no está instalado: la constante de huggingface_hub solo se mide con él'
Ran 95 tests in 1.840s
OK (skipped=2)
$ python harness/verify.py --changed
VERDE — 0 FAIL, 0 WARN
```

### H7: resuelto (medido con la carga y la descarga reales)
- Carga real con el cache existente, sin la variable en el entorno: `huggingface_hub.constants.HF_HUB_DISABLE_SYMLINKS_WARNING` vale `True`.
- Con `HF_HUB_DISABLE_SYMLINKS_WARNING=0` puesto por el usuario, la constante vale `False` y el entorno sigue en `0`. Se respeta el valor del usuario.
- Descarga real fresca (`CEREBRO_MODELOS` temporal, sin la variable): `indexar` da rc 0. stderr trae el aviso «cerebro: bajando …» y **0** `UserWarning` (en la vuelta 2 eran 2). Después, `buscar --json` deja stdout con JSON válido.
- `cerebro/README.md:15` describe ahora lo que pasa de verdad (`setdefault` antes del import; la variable queda fijada en el proceso).

### Tests que desaparecieron (96 → 95)
`git diff 3ca371f..7c5d48c -- cerebro/tests/test_local.py`:
- `test_el_entorno_del_proceso_no_queda_cambiado` → **reemplazado** con motivo. Probaba la restauración del entorno, que ya no existe. Lo cubren `test_la_variable_de_symlinks_se_fija_antes_del_import_y_respeta_la_del_usuario` y `TestSymlinksHF`.
- `test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed` (3ca371f:225) → **borrado** sin reemplazo ni motivo. El handback de la vuelta 3 no lo menciona, y era el test que mataba el mutante `cache_dir=None` de la vuelta 1.
- `test_cache_por_defecto_y_variable_de_entorno` (3ca371f:239) → **borrado** sin reemplazo ni motivo. Era el único test de `dir_modelos()`.

Ninguno de los dos se fusionó ni cambió de nombre. `grep dir_modelos|CEREBRO_MODELOS|cache_dir|gettempdir cerebro/tests/` solo encuentra un docstring.

### Mutantes (uno por vez sobre `cerebro/embedders.py`; venv; `subprocess.run(..., timeout=120)`; suite COMPLETA; script en `scratchpad/c3rev/`; revertidos)
| # | Mutante | Resultado | Salida |
|---|---|---|---|
| M1 | aviso a stdout | muerto | Ran 95, failures=1 |
| M2 | `import fastembed` ansioso | muerto | Ran 95, failures=2 |
| M3 | aviso después de cargar | muerto | Ran 95, failures=2 |
| M4 | sin `except ErrorEmbedder: raise` | muerto | Ran 95, failures=1 |
| M5 | huella sin `.lower()` | muerto | Ran 95, failures=1 |
| M6 | `OSError` → `True` | muerto | Ran 95, failures=4 |
| M7 | `any` → `all` en dim | muerto | Ran 95, failures=1 |
| M8 | sin chequeo de cantidad | muerto | Ran 95, failures=1 |
| M9 | `CEREBRO_MODELOS` ignorado (`dir_modelos` siempre devuelve el default) | **SOBREVIVE** | Ran 95, OK. En la vuelta 2 lo mataba `test_cache_por_defecto_y_variable_de_entorno` |
| M10 | `obtener("local")` → `Falso()` | muerto | Ran 95, failures=1 |
| M11 | `glob("*/*.onnx")` → `glob("*/*")` | muerto | Ran 95, failures=1 (`[otros archivos sin onnx]`) |
| M13 | sin `setdefault` | muerto | Ran 95, failures=2 |
| M14 | `setdefault` → asignación (pisa la del usuario) | muerto | Ran 95, failures=1 |
| M15 | `cache_dir=None` a fastembed | **SOBREVIVE** | Ran 95, OK. Con esto el modelo vuelve al temp del sistema y se baja de nuevo; lo mataba `test_el_cargador_real_...` |
| M16 | `model_name` fijo a `all-MiniLM-L6-v2` en `_cargar_fastembed` | muerto, **pero solo** por la integración | Ran 95, failures=1, 16 s. El unitario que lo mataba sin red se borró. En el sistema sin fastembed sobreviviría |
| M17 | cache por defecto en `tempfile.gettempdir()` | **SOBREVIVE** | Ran 95, OK (32 s: la integración bajó el modelo al temp) |
| M18 | `Local` ignora la cache inyectada | muerto | Ran 95, failures=9 |

Efectos de M16 y M17 que limpié: M16 bajó `models--qdrant--all-MiniLM-L6-v2-onnx` en `~/.cache/cerebro/modelos` y M17 creó `%TEMP%\cerebro\modelos`. Los dos se crearon en esta corrida (10:07), así que los borré; quedó solo el modelo multilingüe original. `git status` limpio.

### Checkpoints vuelta 3
- C1: [x] suite 95/95 en el venv y 95 (2 skips con motivo) en el sistema; `verify.py --changed` VERDE.
- C2: [x] los cinco criterios se cumplen; zona respetada.
- C3: [x] H7 resuelto en el código y en el README.
- C4: [ ] se perdió cobertura sin motivo. M9, M15 y M17 vuelven a sobrevivir, y M16 solo muere con red y modelo. El handback (tabla vuelta 3) corrió los mutantes contra `test_local.py` solo (Ran 22) y no corrió los que atacan lo borrado.
- C5: [x] handback commiteado. Pero no declara el borrado de los dos tests.

### Cambios requeridos (vuelta 3)
1. **MEDIA**: restaurar `test_el_cargador_real_le_pasa_modelo_y_cache_a_fastembed` (en `3ca371f:cerebro/tests/test_local.py:225`), adaptado a `_importar_fastembed`. Tiene que exigir `model_name=MODELO_LOCAL` y `cache_dir=str(cache)`, y que `embed([])` no cargue nada. Cubre `cerebro/embedders.py:93-94`. Debe matar M15 y M16 sin red.
2. **MEDIA**: restaurar `test_cache_por_defecto_y_variable_de_entorno` (en `3ca371f:cerebro/tests/test_local.py:239`). Cubre `cerebro/embedders.py:67-71`. Debe matar M9 y M17.
3. **BAJA**: en el handback, declarar los tests borrados o restaurados y correr los mutantes con la suite completa, no solo con `test_local.py`.

## Vuelta 2 @ 3ca371f

Diff revisado `git diff 1d11328..3ca371f` (código) + `bae57b7` (handback). Solo `cerebro/embedders.py`, `cerebro/README.md`, `cerebro/tests/test_local.py`, `sdd/progress/v0.36-C-3/handback_C-3.md`. Mi `review_C-3.md` no fue tocado. Zona OK.

### Verificación re-ejecutada
```text
$ cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -v   (Python 3.14.0, fastembed 0.8.1)
test_mismo_sentido_con_otras_palabras_queda_mas_cerca_que_una_frase_ajena (test_local.TestLocalIntegracion...) ... ok
Ran 96 tests in 3.608s
OK
$ python -m unittest discover -s cerebro/tests -v   (Python del sistema, sin fastembed)
test_mismo_sentido_... ... skipped 'fastembed no está instalado: `python -m venv cerebro/.venv` y `cerebro/.venv/Scripts/pip install -r cerebro/requirements.txt`'
Ran 96 tests in 1.946s
OK (skipped=1)
$ python harness/verify.py --changed
VERDE — 0 FAIL, 0 WARN
```
Repetida la suite del venv al final, con el árbol ya limpio tras los mutantes (por el aviso de `taskkill /IM python.exe` de otro agente): `Ran 96 tests … OK`.

### Validez de las corridas de mutantes (vuelta 1 y 2)
Mis dos rondas usan `subprocess.run([<venv>/python.exe, "-m", "unittest", …], timeout=…)` de Python, no `timeout.exe`. Vuelta 1: los vivos devolvieron rc 0, y cada muerto mostró el nombre concreto del test que falló, así que la suite corrió de verdad. Vuelta 2: cada corrida muestra el `Ran 96 tests` (abajo). Ninguna corrida se cortó: todas terminaron con conteo y en 3–5 s, muy por debajo del timeout de 120 s.

### Mutantes (los 10 de la vuelta 1 + 3 nuevos; uno por vez sobre `cerebro/embedders.py`, venv, `timeout=120` de subprocess, revertidos)
| # | Mutante | Resultado | Salida |
|---|---|---|---|
| M1 | aviso a stdout | muerto | Ran 96, failures=1 (`test_el_aviso_va_a_stderr_y_stdout_queda_limpio`) |
| M2 | `import fastembed` ansioso | muerto | Ran 96, failures=1 (`test_importar_el_nucleo_no_importa_fastembed`) |
| M3 | aviso después de cargar | muerto | Ran 96, failures=2 (`test_aviso_sale_antes_de_la_carga_del_modelo`, `test_aviso_sale_aunque_la_carga_falle`) |
| M4 | sin `except ErrorEmbedder: raise` | muerto | Ran 96, failures=1 (`test_sin_fastembed_error_con_el_comando_de_instalacion`) |
| M5 | huella sin `.lower()` | muerto | Ran 96, failures=1 |
| M6 | `OSError` → `True` en `_en_cache` | muerto | Ran 96, failures=4 |
| M7 | `any` → `all` en dim | muerto | Ran 96, failures=1 (`test_un_solo_vector_de_dimension_mezclada_es_error`) |
| M8 | sin chequeo de cantidad | muerto | Ran 96, failures=1 (`test_distinta_cantidad_de_vectores_es_error`) |
| M9 | `CEREBRO_MODELOS` ignorado | muerto | Ran 96, failures=1 |
| M10 | `obtener("local")` → `Falso()` | muerto | Ran 96, failures=1 |
| M11 | `_en_cache`: `glob("*/*.onnx")` → `glob("*/*")` (cualquier archivo del snapshot cuenta) | **SOBREVIVE** | Ran 96, OK |
| M12 | el entorno no se restaura | muerto | Ran 96, failures=1 (`test_el_entorno_del_proceso_no_queda_cambiado`) |
| M13 | no fija `HF_HUB_DISABLE_SYMLINKS_WARNING` | muerto | Ran 96, failures=1 (el mismo test) |

12/13 muertos. `git checkout -- cerebro/embedders.py` al final (el script reescribía con LF); `git status` limpio.

### Sondas propias (CLI real, `CEREBRO_DIR` y `CEREBRO_MODELOS` temporales en el scratchpad)
- **Primera descarga real** (cache vacío, con red): `indexar` → 32 s, rc 0, stdout solo «2 nuevas, …». En stderr sale **primero** «cerebro: bajando el modelo … (unos 220 MB, una sola vez) a <dir> ...» y después las barras de HF. Luego `buscar --json`: stdout es JSON válido, stderr vacío (modelo ya bajado: sin aviso). Quedó `snapshots/<rev>/model_optimized.onnx`.
- En esa misma descarga, stderr muestra **dos veces** `UserWarning: huggingface_hub cache-system uses symlinks … This warning can be disabled by setting the HF_HUB_DISABLE_SYMLINKS_WARNING environment variable` (ver H7).
- Cache parcial sin red: `snapshots/abc/` vacío → avisa y da el error claro (antes no avisaba: H6 de la vuelta 1 resuelto). `snapshots/abc/config.json` sin `.onnx` → también avisa. Así que el código es correcto, pero ese caso no tiene test (M11).
- Regresiones: ninguna. `meta`, el cambio de embedder sin `--todo`, «falta fastembed» y «sin red» (vuelta 1) siguen igual; la suite completa pasa.

### Hallazgos vuelta 2
1. **MEDIA, H7** — `cerebro/embedders.py:80-94` + `cerebro/README.md:15` + `cerebro/tests/test_local.py:212`. **`HF_HUB_DISABLE_SYMLINKS_WARNING` no tiene efecto.** `huggingface_hub` lo lee una sola vez, al importarse (`huggingface_hub/constants.py:282`: `HF_HUB_DISABLE_SYMLINKS_WARNING = _is_true(os.environ.get(...))`). Ese import ocurre en `from fastembed import TextEmbedding` (línea 80), **antes** de que la línea 87 fije la variable. Lo medí así:
   - tras `_cargar_fastembed` real, `huggingface_hub.constants.HF_HUB_DISABLE_SYMLINKS_WARNING` vale `False`;
   - en la descarga real, el `UserWarning` sale dos veces;
   - fijando la variable antes del import, la constante vale `True`.

   Ya pasaba en la vuelta 1 (el `setdefault` también iba después del import). Pero ahora el README afirma algo que no ocurre («silencia un aviso de symlinks»), y `test_el_entorno_del_proceso_no_queda_cambiado` prueba un no-op: simula `TextEmbedding` y nunca mira lo que lee `huggingface_hub`. Lo esperado, una de dos:
   - fijar la variable **antes** de `from fastembed import …`, con un test que importe `huggingface_hub.constants` en un subproceso y exija `True`, o que exija que la descarga no emita ese `UserWarning`;
   - o quitar el manejo de la variable y la frase del README.
2. **BAJA** (no bloquea por sí sola) — `cerebro/tests/test_local.py:174-182`: el caso «descarga cortada» del handback no se prueba con un snapshot que tenga otros archivos (`config.json`, `tokenizer.json`) y le falte el `.onnx`. Por eso M11 vive. Agregar ese caso al `subTest`.

### Checkpoints vuelta 2
- C1: [x] suite 96/96 (venv, integración corrida) y 96 con 1 skip con motivo (sistema); `verify.py --changed` VERDE.
- C2: [x] los 5 criterios se cumplen; zona respetada.
- C3: [x] carga perezosa probada; aviso antes de la carga y por stderr; cache parcial bien detectada.
- C4: [ ] H7: un test verde y una afirmación del README sobre un comportamiento que, medido, no ocurre. M11 vive.
- C5: [x] handback vuelta 2 commiteado, con la corrección honesta de la tabla de la vuelta 1.

### Cambios requeridos (vuelta 2)
1. **MEDIA** — H7 (arriba).
2. **BAJA** — test de snapshot sin `.onnx` pero con otros archivos (mata M11).

### Incidente del reviewer (para el leader)
El scratchpad lo comparten varios agentes. Mi `mut.py` de la vuelta 1 fue sobrescrito por el script de mutantes de otro agente para **C-5**: R1–R13 sobre `C:\Users\Facundo\Estudio_Trabajo\sdd-universal-C-5`, cada uno seguido de `git checkout -- <archivo>`. Lo copié sin mirarlo y lo corrí una vez por error. Salieron R1, R2 y R3 (suite de C-5, «Ran 99») y la salida se cortó ahí, probablemente por el `taskkill` que avisó el leader.
- Efectos posibles en el worktree C-5: (a) el `git checkout -- cerebro/importar.py` / `notas.py` / `indice.py` de ese script pudo **borrar cambios sin commitear** de quien estuviera trabajando ahí; (b) si se cortó en mitad de R4, pudo quedar un mutante aplicado.
- Lo que vi: justo después, `git status` de C-5 mostraba ` M cerebro/importar.py`, ` M cerebro/tests/test_importar.py` y ` M cerebro/tests/test_indice.py`. Minutos más tarde `importar.py` ya no aparecía modificado (alguien lo restauró o volvió a correr).
- **Hay que revisar el estado de C-5** antes de seguir con esa tarjeta, y repetir los mutantes de C-5 que se hayan corrido a esa hora.
- Desde entonces uso una subcarpeta propia (`scratchpad/c3rev/`). No volví a tocar C-5.

## Vuelta 1 @ 1d11328

Base `6c1a023`, diff revisado `git diff 6c1a023..1d11328` (código en `168cba9`, handback `13f4c53`, README `1d11328`). 7 archivos: `.gitignore`, `cerebro/README.md`, `cerebro/embedders.py`, `cerebro/requirements.txt`, `cerebro/tests/test_local.py`, `sdd/progress/v0.36-C-3/{current,handback_C-3}.md`. Zona respetada.

## Verificación re-ejecutada
```text
$ cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -v   (Python 3.14.0, fastembed 0.8.1, tail)
test_mismo_sentido_con_otras_palabras_queda_mas_cerca_que_una_frase_ajena (test_local.TestLocalIntegracion...) ... ok
...
Ran 87 tests in 3.718s
OK
$ python -m unittest discover -s cerebro/tests -v   (Python 3.14.0 del sistema, sin fastembed)
test_mismo_sentido_... ... skipped 'fastembed no está instalado: `python -m venv cerebro/.venv` y `cerebro/.venv/Scripts/pip install -r cerebro/requirements.txt`'
Ran 87 tests in 1.866s
OK (skipped=1)
$ python harness/verify.py --changed   (tail)
[OK]    Rutas citadas existen (114 revisadas)
VERDE — 0 FAIL, 0 WARN
```

## R28 y modelo (verificado por mí)
- PyPI JSON hoy: `fastembed` última 0.8.1 (subida 2026-09-22, no yanked, `requires_python >=3.10.0`); `mcp` última 2.3.0 (2026-10-02, no yanked, `>=3.10`). Coinciden con `cerebro/requirements.txt` y con `pip list` del venv (más `mcp-types 2.3.0`, `onnxruntime 1.30.0`).
- `cerebro/README.md:22-23`: línea de decisión por dependencia con las tres columnas (qué resuelve / por qué no alcanza lo que hay / qué tan viva está). OK.
- `TextEmbedding.list_supported_models()` de 0.8.1 instalado: `sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, dim 384, 0.22 GB, «Multilingual (~50 languages)», fuente `qdrant/paraphrase-multilingual-MiniLM-L12-v2-onnx-Q`; definido en `fastembed/text/pooled_embedding.py:50`. El README omite en los descartes `minishlab/potion-multilingual-128M` (256 dim, 0,51 GB), irrelevante.
- `meta` tras `indexar` real: `[('modelo', 'sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2'), ('dim', '384')]`.

## Sondas propias (CLI real, `CEREBRO_DIR` en el scratchpad)
- `CEREBRO_EMBEDDINGS=local`, venv: `init` → 4 `nota` en español → `indexar` «4 nuevas» (2 s, modelo en cache) → `buscar` por sinónimos. Coseno directo del embedder: «costo excesivo de inteligencia artificial» → nota de «tope de gasto» 0,516 vs ≤0,142; «turnos dobles para el médico» → «reservas superpuestas» 0,662 vs ≤0,293; «pronóstico del tiempo» → «clima» 0,45 vs ≤0,14. Vectores `float`, 384, no normalizados (el índice usa coseno: OK). Integración del test: 0,352 vs −0,029/−0,07, margen holgado sobre el +0,15 exigido.
- `--json` con `local`: stdout parsea como JSON (el aviso va a stderr).
- Cambio a `falso` sin `--todo` en `buscar` e `indexar` → «el índice se armó con el modelo «sentence-transformers/…» (dim 384) y el activo es «falso» (dim 64)… Corré `cerebro.py indexar --todo`», rc 2, sin traceback.
- Python del sistema (sin fastembed): `import embedders, indice, notas, cerebro` OK; `revisar` con `falso` OK; `buscar` con `local` → «falta `fastembed`… `pip install -r cerebro/requirements.txt`…», rc 2. En el venv, importar todo el núcleo y `obtener("local")` deja `'fastembed' not in sys.modules` (perezoso de verdad).
- Sin red, cache vacío (`CEREBRO_MODELOS` temporal + `HTTP(S)_PROXY=http://127.0.0.1:9`): primero «cerebro: bajando el modelo de embeddings «…» (unos 220 MB, una sola vez) a <dir> ...», luego «error: no pude cargar el modelo «…»: [WinError 10061] … La primera vez hace falta conexión a internet para bajarlo; si ya lo tenías, revisá <dir> (borrala para bajarlo de nuevo)», rc 2, sin traceback. Carpeta queda vacía.
- Sin red, modelo en cache real: `buscar` funciona (2 s), sin aviso.
- Cache parcial (`models--qdrant--paraphrase-multilingual-MiniLM-L12-v2-onnx-Q/snapshots/` vacío): **no avisa** y, sin red, falla con el mensaje correcto; con red bajaría 220 MB en silencio (H6).
- `CEREBRO_MODELOS` apuntando a un archivo: avisa y luego error claro (WinError 183), sin traceback.
- `.venv` y modelo: `git ls-files` sin `.venv`, `.onnx` ni `models--*`; `cerebro/.venv` ya ignorado por `cerebro/.gitignore` (de C-2) y ahora también por el `.gitignore` raíz (redundante, inofensivo). El modelo vive en `~/.cache/cerebro/modelos` (241 MB), fuera del repo.

## Criterios
1. requirements fijados y verificados + README R28: [x] PyPI JSON y venv coinciden; tabla completa.
2. Modelo multilingüe de la lista de 0.8.1; nombre y dim en `meta`: [x] código instalado + sonda `meta` + `TestMetaConLocal`.
3. venv en el worktree, ignorado, nada en el sistema: [x] `python -c "import fastembed"` en el sistema → `ModuleNotFoundError`; `.venv` ignorado.
4. Integración con modelo real, salteada con motivo sin fastembed: [x] corrió `ok` en el venv; `skipped` con motivo en el sistema.
5. Primera corrida avisa qué baja y cuánto pesa; sin red, error claro: [x] por sonda, **pero el test no ata dos propiedades del aviso**: que salga **antes** de la descarga (M3 vive: avisar después de cargar pasa la suite, y entonces el usuario espera ~30 s en silencio y, sin red, nunca ve el aviso) y que vaya a **stderr** (M1 vive: a stdout pasa la suite, y rompería `buscar --json` y el canal JSON-RPC por stdio del MCP de C-4).

## Mutantes (míos, uno por vez sobre `cerebro/embedders.py`, venv, `timeout 180`, revertidos; `git status` limpio al final)
| # | Mutante | Resultado |
|---|---|---|
| M1 | `_avisar_stderr` imprime a stdout | **SOBREVIVE** |
| M2 | `import fastembed` ansioso a nivel de módulo (en try/except) | **SOBREVIVE** |
| M3 | el aviso se emite después de `_cargar` (cuando ya bajó) | **SOBREVIVE** |
| M4 | sin `except ErrorEmbedder: raise` (el «falta fastembed» se envuelve en «hace falta internet») | **SOBREVIVE** |
| M5 | huella de cache sin `.lower()` | muerto (`test_con_el_modelo_en_cache_no_avisa`) |
| M6 | `_en_cache`: `OSError` → `True` | muerto (`test_primera_corrida_avisa_nombre_y_peso`) |
| M7 | chequeo de dim `any` → `all` | **SOBREVIVE** |
| M8 | sin chequeo `len(vectores) != len(textos)` | **SOBREVIVE** |
| M9 | `CEREBRO_MODELOS` ignorado | muerto (`test_cache_por_defecto_y_variable_de_entorno`) |
| M10 | `obtener("local")` devuelve `Falso()` | muerto (`test_obtener_local_devuelve_local_sin_importar_fastembed`) |

4/10 muertos. Los vivos M1, M2, M3 son propiedades que el handback (`handback_C-3.md:8-9`) y el README (`cerebro/README.md:13`) afirman —«perezoso», «avisa por stderr», aviso de primera corrida— sin un test que las sostenga. Los 15 mutantes del handback no cubren orden ni canal del aviso ni la pereza del import.

## Checkpoints
- C1 (arnés sano): [x] `verify.py --changed` VERDE; suite 87/87 en venv y 87 (1 skip con motivo) en el sistema.
- C2 (cumple la tarjeta, zona respetada): [x] los 5 criterios se cumplen por sonda; zona OK (sin tocar `sdd/cards`, ni otros módulos).
- C3 (diseño y convenciones): [x] carga perezosa real, mensajes en español sin traceback, cache persistente fuera del repo, dependencias R28.
- C4 (verificación real): [ ] M1, M2, M3 sobreviven sobre el criterio 5 y la pereza que el handback declara; M4 debilita el test de «sin fastembed».
- C5 (cierra limpio): [x] handback y `current.md` commiteados; `.venv` y modelo fuera de git; `CEREBRO_MODELOS` documentada.

## Cambios requeridos
1. **MEDIA** — `cerebro/embedders.py:111-115` (orden aviso → carga), criterio 5. Agregar en `cerebro/tests/test_local.py` un test cuyo `cargar` registre si el aviso ya se emitió al momento de ser llamado (o que lance como sin red y exija que el aviso igual esté en `avisos`). Debe matar M3.
2. **MEDIA** — `cerebro/embedders.py:74-75` (`_avisar_stderr`), criterio 5 + `cerebro/README.md:13`. Test que construya `Local()` sin `avisar` inyectado (cargador falso, cache vacío), capture `sys.stdout`/`sys.stderr` (`contextlib.redirect_*`) y exija el aviso en stderr y stdout vacío. Importa para C-4: stdout es el canal del MCP por stdio. Debe matar M1.
3. **MEDIA** — pereza del import (`handback_C-3.md:8`, docstring `cerebro/embedders.py:89-91`). Test en subproceso (con el intérprete actual) que importe `embedders`/`cerebro` y cree `obtener("local")` y verifique `'fastembed' not in sys.modules`; saltearlo con motivo si no hay fastembed. Debe matar M2.
4. **BAJA** — `cerebro/tests/test_local.py:118-123`: además de `pip install`, exigir que el mensaje **no** hable de internet (o que empiece con «falta `fastembed`»). Debe matar M4.

## Observaciones menores (no bloquean por sí solas)
- H5 BAJA — `cerebro/embedders.py:129`: el chequeo de cantidad y de dim mixta no tiene test (M7, M8). Un `Modelo` falso que devuelva un vector menos, o uno solo de otra dim, alcanza.
- H6 BAJA — `cerebro/embedders.py:103-108`: `_en_cache` da por bajado el modelo si existe `snapshots/` aunque esté vacía o le falte el `.onnx` (descarga interrumpida con Ctrl+C). Con red, la siguiente corrida baja 220 MB sin aviso. Sugerencia: buscar `snapshots/*/model_optimized.onnx` (o cualquier `*.onnx`). `test_con_el_modelo_en_cache_no_avisa` (`test_local.py:95`) hoy fija justamente el caso vacío.
- BAJA — `cerebro/embedders.py:85`: `os.environ.setdefault("HF_HUB_DISABLE_SYMLINKS_WARNING", "1")` cambia el entorno de todo el proceso (y de los subprocesos). Aceptable, pero documentarlo en el README junto a las variables.
- Para el leader: el playbook §C.1 dice `pip install -r cerebro/requirements.txt` sin venv; el handback ya sugiere el cambio de spec (venv + `CEREBRO_MODELOS`).

## Mejoras al arnés detectadas
- Para el prompter: en tarjetas con «avisa/loguea X», pedir en los criterios **canal y momento** del aviso (stderr, antes de la operación lenta), no solo el texto; el implementer probó el contenido y dejó vivos orden y canal.
- Las propiedades declaradas en el handback («perezoso», «por stderr») deberían mapearse a un test cada una en la tabla de evidencia, igual que los criterios.
