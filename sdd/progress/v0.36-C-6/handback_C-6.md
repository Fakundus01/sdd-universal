# Handback C-6 — Embedder OpenAI y guardia de modelo

- **Estado:** done
- **Rama / commit:** `v0.36-C-6` @ `a32b3c1` (base `c0e29bb`)
- **Quién:** implementer (MEDIO, esfuerzo alto)
- Nota: `a32b3c1` es el último commit de código; el commit del handback va encima (un archivo no puede citar su propio hash).

## Hecho
- `embedders.OpenAIEmbedder` (`text-embedding-3-small`, 1536 dim): SDK `openai` real, import perezoso, lotes de 64, reintento propio acotado (3) con espera 1/2/4 s (respeta `Retry-After`, tope 20 s) ante 429, 5xx y corte de red; 401, cuota agotada (`insufficient_quota`) y otros 4xx fallan al instante con mensaje claro. `CEREBRO_EMBEDDINGS=openai` pasa por `embedders.obtener`.
- `config.clave_openai()` y `config.ruta_env()`: `OPENAI_API_KEY` del entorno y, si no está, del `.env` de la raíz del paquete. No toca `os.environ`. `.env.example` con el nombre y sin valor.
- Sin clave: error que nombra `OPENAI_API_KEY` y `.env` y sugiere `local`; el modo local y el falso siguen andando.
- La clave nunca sale: vive en un `_Secreto` (repr oculto); los mensajes de la API se tachan (valor exacto y patrón `sk-...`); los errores del SDK se traducen **fuera** del `except` (sin `__cause__` ni `__context__`).
- Guardia de modelo: el `Indice` ya guardaba modelo y dim; probado local->openai y openai->local (se niega antes de gastar un request) y `indexar --todo` para cambiar.
- `openai==3.24.0` en `cerebro/requirements.txt`, fila en «Decisiones de dependencias» y sección «Con OpenAI» en `cerebro/README.md`.
- **Cero llamadas reales a la API**: todos los tests usan `MockTransport` con claves falsas `sk-test-...`; no busqué ni leí ninguna clave real ni `.env`.

## No hecho / pendiente
- La primera llamada real a OpenAI es del leader con OK del owner (criterio 5).

## Cómo
- **El SDK 3.24.0 usa `httpx2`, no `httpx`** (verificado en el venv: `import httpx2`, `OpenAI(..., http_client: httpx2.Client)`). Los tests eligen el módulo con `find_spec("httpx2")` y corren igual con el `openai` 2.28.0 que ya trae el Python del sistema (user-site, preexistente, no lo instalé yo).
- `max_retries=0` en el SDK y reintento propio: dos capas de reintento multiplican los requests (el mutante 1 lo demuestra).
- `base_url` fija a `https://api.openai.com/v1`: el SDK lee `OPENAI_BASE_URL` del entorno y mandaría la clave a otro host.
- Texto vacío se manda como `" "` (la API rechaza `""`). Los vectores se ordenan por `index` de la respuesta. `encoding_format="float"` explícito.
- Versión verificada contra `https://pypi.org/pypi/openai/json` (3.24.0, 2026-10-02, python >=3.10) y la API (`OpenAI.__init__`, `embeddings.create`, excepciones) con `inspect` sobre el código instalado en el venv del worktree. Instalado solo ahí.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| cerebro/embedders.py | `OpenAIEmbedder`, `_Secreto`, `_sin_clave`, constantes; `obtener("openai")` |
| cerebro/config.py | `ruta_env`, `clave_openai`, parser mínimo de `.env` |
| cerebro/requirements.txt | `openai==3.24.0` |
| cerebro/README.md | fila de dependencia (R28), variables, sección «Con OpenAI» |
| cerebro/tests/test_openai.py | 41 tests nuevos (archivo nuevo) |
| .env.example | `OPENAI_API_KEY=` |
| sdd/progress/v0.36-C-6/current.md, handback_C-6.md | seguimiento y entrega |

Tests existentes: ninguno borrado, debilitado ni cambiado (155 antes, 196 ahora con el venv).

## Evidencia
| Criterio de aceptación | Lo demuestra |
|---|---|
| 1. Clave de entorno o `.env`; nunca escrita, impresa ni logueada; `.env.example` | `TestClave` (entorno, `.env`, formatos, BOM, precedencia, no toca el entorno); `test_la_clave_no_aparece_en_ningun_error` (5 casos con clave distintiva, incluso repetida por la API), `test_una_clave_sin_prefijo_sk_tambien_se_tacha`, `test_error_de_conexion_con_la_clave_en_el_mensaje`, `test_repr_y_str_del_embedder_no_llevan_la_clave`, `test_la_clave_no_se_imprime_ni_se_loguea`, `test_la_cli_no_imprime_la_clave_en_un_error`; `git grep` abajo |
| 2. Sin clave: error que nombra la variable; local sigue | `TestSinClave.*` |
| 3. Lotes, reintento acotado 429/5xx, 401 claro, solo el fragmento | `test_por_lotes_y_en_orden`, `test_429_y_despues_ok`, `test_5xx_se_reintenta_y_es_acotado`, `test_retry_after_se_respeta_con_tope`, `test_401_error_claro_y_sin_reintento`, `test_429_sin_cuota_no_se_reintenta`, `test_al_indexar_solo_se_manda_el_fragmento_sin_el_frontmatter` |
| 4. SDK real sobre transporte simulado | `Servidor` + `MockTransport` + `openai.OpenAI(http_client=...)` en `TestEmbedder` y `TestCliYGuardia` |
| 5. Sin llamadas reales | transporte simulado siempre; ninguna clave real; ningún test abre red |
| Guardia de modelo | `test_local_a_openai_se_niega_a_mezclar`, `test_openai_a_local_se_niega_a_mezclar`, `test_indexar_todo_con_openai_reconstruye_y_busca` |

Rojo antes (R29), medido contra la base:
```text
$ git rev-parse --short HEAD     # base del código: c0e29bb (tests rojos commiteados en f2ba88f)
$ cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -p test_openai.py
ImportError: cannot import name 'OpenAIEmbedder' from 'embedders' (...\cerebro\embedders.py)
Ran 1 tests in 0.000s
FAILED (errors=1)
```
El rojo es por import (la clase no existía). La capacidad de los tests de seguridad para fallar se mide con los mutantes de abajo.

Verde después:
```text
$ cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -v   (cola)
Ran 196 tests in 8.453s
OK

$ python -m unittest discover -s cerebro/tests    (Python del sistema, sin fastembed ni mcp)
Ran 196 tests in 4.976s
OK (skipped=3)     # fastembed (2) y mcp (1), con motivo; el openai 2.28.0 del sistema corre los tests del SDK

$ python harness/verify.py --changed
VERDE — 0 FAIL, 0 WARN
```

`git grep -n OPENAI_API_KEY` (no hay valores: solo el nombre; `.env.example` lo tiene vacío; los tests usan `sk-test-DISTINTIVA-...`, falsa):
```text
.env.example:2:OPENAI_API_KEY=
cerebro/config.py:53:    clave = os.environ.get("OPENAI_API_KEY", "").strip()
cerebro/embedders.py:193:            raise ErrorEmbedder("falta la clave de OpenAI: definí la variable de entorno OPENAI_API_KEY (o ponela "
cerebro/embedders.py:227:                return ("OpenAI rechazó la clave (401): revisá OPENAI_API_KEY (¿está vencida o mal copiada?). "
cerebro/tests/test_openai.py: solo el nombre y CLAVE falsa
cerebro/README.md, playbooks/obsidian-cerebro.md, sdd/cards/C-6.md: solo el nombre
```

### Mutantes
Uno por vez, suite completa por corrida con `subprocess.run([python, "-m", "unittest", "discover", "-s", "cerebro/tests"], timeout=120)`, archivo restaurado tras cada uno. Primera pasada (195 tests):

| # | Mutante | Resultado | Corrida | Test que lo mató |
|---|---|---|---|---|
| 1 | sdk reintenta solo (sin max_retries=0) | MUERTO | Ran 195 tests, FAILED (failures=6) | test_429_sin_cuota_no_se_reintenta, test_429_y_despues_ok |
| 2 | 401 se reintenta | MUERTO | Ran 195 tests, FAILED (failures=1) | test_401_error_claro_y_sin_reintento |
| 3 | un reintento de mas | MUERTO | Ran 195 tests, FAILED (failures=3) | test_5xx_se_reintenta_y_es_acotado, test_el_sdk_no_reintenta_por_su_cuenta |
| 4 | sin ordenar por index | MUERTO | Ran 195 tests, FAILED (errors=1) | test_respeta_el_index_si_la_api_responde_desordenado |
| 5 | no tacha la clave exacta | SOBREVIVE | Ran 195 tests, OK |  |
| 6 | no tacha patron sk- | MUERTO | Ran 195 tests, FAILED (failures=1) | test_la_clave_no_aparece_en_ningun_error |
| 7 | conexion cita la excepcion | SOBREVIVE | Ran 195 tests, OK |  |
| 8 | sin lotes | MUERTO | Ran 195 tests, FAILED (failures=1) | test_por_lotes_y_en_orden |
| 9 | sin base_url fija | MUERTO | Ran 195 tests, FAILED (failures=1) | test_va_siempre_a_api_openai_aunque_el_entorno_diga_otra_cosa |
| 10 | repr del secreto muestra la clave | MUERTO | Ran 195 tests, FAILED (failures=1) | test_repr_y_str_del_embedder_no_llevan_la_clave |
| 11 | no valida la dim | MUERTO | Ran 195 tests, FAILED (failures=1) | test_dimension_inesperada_es_error |
| 12 | texto vacio se manda tal cual | MUERTO | Ran 195 tests, FAILED (failures=1) | test_texto_vacio_se_manda_como_un_espacio |
| 13 | cuota agotada se reintenta | MUERTO | Ran 195 tests, FAILED (failures=1) | test_429_sin_cuota_no_se_reintenta |
| 14 | Retry-After sin tope | MUERTO | Ran 195 tests, FAILED (failures=1) | test_retry_after_se_respeta_con_tope |
| 15 | sin clave no falla | MUERTO | Ran 195 tests, FAILED (failures=2) | test_la_cli_con_openai_sin_clave_sale_con_2_y_nombra_la_variable, test_sin_clave_error_claro_que_nombra_la_variable |
| 16 | sin chequeo de cantidad | MUERTO | Ran 195 tests, FAILED (failures=1) | test_cantidad_inesperada_es_error |
| 17 | backoff constante | MUERTO | Ran 195 tests, FAILED (failures=2) | test_429_y_despues_ok, test_5xx_se_reintenta_y_es_acotado |
| 18 | openai no pasa por obtener | MUERTO | Ran 195 tests, FAILED (failures=3) | test_obtener_openai_con_clave_del_entorno, test_la_cli_con_openai_sin_clave_sale_con_2_y_nombra_la_variable |
| 19 | config ignora el entorno | MUERTO | Ran 195 tests, FAILED (failures=2, errors=1) | test_obtener_openai_con_clave_del_entorno, test_el_entorno_gana_al_env |
| 20 | config ignora el .env | MUERTO | Ran 195 tests, FAILED (failures=7) | test_env_con_bom, test_formatos_del_env |
| 21 | config sin export | MUERTO | Ran 195 tests, FAILED (failures=1) | test_formatos_del_env |
| 22 | config sin BOM | MUERTO | Ran 195 tests, FAILED (failures=1) | test_env_con_bom |
| 23 | config sin comentario inline | MUERTO | Ran 195 tests, FAILED (failures=1) | test_formatos_del_env |
| 24 | config nombre por prefijo | MUERTO | Ran 195 tests, FAILED (failures=1) | test_sin_clave_es_none |
| 25 | config ruta .env en cwd | SOBREVIVE | Ran 195 tests, OK |  |

Cierre de los dos sobrevivientes (ahora 196 tests, suite completa):
- #5 tras sumar `test_una_clave_sin_prefijo_sk_tambien_se_tacha`: MUERTO, `Ran 196 tests`, `FAILED (failures=1)`.
- #25 tras hacer `test_el_env_es_el_de_la_raiz_del_paquete` independiente del cwd: MUERTO, `Ran 196 tests`, `FAILED (failures=1)`.
- #7 sobrevive y es equivalente: el SDK convierte el corte de conexión en `APIConnectionError("Connection error.")` sin el texto de la causa, así que citar `str(e)` no puede filtrar la clave; el caso real (la clave dentro del error de httpx) lo cubre `test_error_de_conexion_con_la_clave_en_el_mensaje`.

## Fuera de zona / riesgos
- El Python del sistema ya tiene `openai` 2.28.0 en el user-site (preexistente): los tests del SDK corren ahí también. No instalé nada en él.
- El `.env` se lee con un parser mínimo propio (sin `python-dotenv`: una dependencia menos). No soporta multilínea ni expansión de variables.
- No hay tope de gasto en el código: `indexar --todo` con OpenAI manda todo el texto indexado (documentado en el README). El leader decide si hace falta un tope antes de la primera corrida real.
- `cerebro/.venv/` quedó creado en el worktree (ignorado por git).

## Cambios de spec sugeridos
- `playbooks/obsidian-cerebro.md` §D: aclarar que `OPENAI_BASE_URL` se ignora a propósito (URL fija).

## Variables de entorno nuevas
- `OPENAI_API_KEY` — clave de OpenAI, solo con `CEREBRO_EMBEDDINGS=openai` — entorno o `.env` de la raíz del paquete (copiar `.env.example`).

## Próximo paso sugerido
- Primera llamada real por el leader con OK del owner: `CEREBRO_EMBEDDINGS=openai`, una nota corta, `indexar --todo` y `buscar`; mirar el gasto en el dashboard de OpenAI.
