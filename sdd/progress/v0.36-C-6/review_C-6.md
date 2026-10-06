# Review C-6 @ 9b71e38
**Veredicto:** APPROVED

## Vuelta 1 @ a32b3c1
Veredicto de la vuelta 1: CHANGES_REQUESTED (hallazgos 1 y 2 abajo; resueltos en la vuelta 2).

Reviewer independiente (tier ALTO). Revisé el diff real `c0e29bb..a32b3c1` (más `cbe7e80`, que solo agrega el handback) en el worktree `sdd-universal-C-6-rev`. Usé el intérprete del venv del implementer solo como ejecutable. No hice ninguna llamada real a OpenAI ni gasté nada; no busqué ni leí ninguna clave real. El `.env` temporal de prueba (con una clave falsa) lo borré, y el árbol quedó limpio.

## Verificación re-ejecutada

```text
$ <venv C-6>/python.exe -m unittest discover -s cerebro/tests        (openai 3.24.0)
Ran 196 tests in 11.503s
OK

$ python -m unittest discover -s cerebro/tests                        (sistema: Python 3.14.0, openai 2.28.0 en user-site)
Ran 196 tests in 6.398s
OK (skipped=3)

$ <venv C-6>/python.exe sinred.py   (la misma suite con socket.connect/connect_ex/getaddrinfo bloqueados)
Ran 196 tests in 11.423s
OK
intentos de red: []

$ python harness/verify.py --full
Tarjetas válidas (13) · Rutas citadas existen (151) · test: Ran 178 tests · OK (skipped=1)
VERDE — 0 FAIL, 1 WARN   (WARN: sin 'lint' en harness.config.json, preexistente)
```
(`verify.py` crea `sdd/progress/v0.36-C-6-rev/current.md` desde la plantilla; lo borré, no es parte de la review).

Python del sistema: con `openai` 2.28.0 (que usa `httpx`) los 41 tests del SDK corren y pasan. El test elige `httpx2` o `httpx` con `find_spec`. El código de producción no usa nada exclusivo de la 3.x: `OpenAI(api_key, base_url, max_retries, timeout, http_client)`, `embeddings.create`, `APIStatusError`/`APIConnectionError` existen en las dos. Los 3 skips son fastembed (2) y mcp (1), cada uno con su motivo.

### R28: dependencia
- `https://pypi.org/pypi/openai/json`: la última es `3.24.0`, subida el `2026-10-02T15:55`, sin yank. Pide `requires_python >=3.10`. `requires_dist` incluye `httpx2<3,>=2.12.0` y **no** `httpx`, más `anyio`, `jiter`, `pydantic`, `sniffio` y `typing-extensions`.
- `httpx2` en PyPI: 2.13.1, `github.com/pydantic/httpx2`.
- En el código instalado: `openai/_base_client.py:37` y `openai/_client.py:9` tienen `import httpx2`. `pip show` dice `Requires: anyio, httpx2, jiter, pydantic, sniffio, typing-extensions`. Lo que dice el handback es correcto.
- `cerebro/README.md:31` tiene la fila de decisión con qué hace, por qué no stdlib, la alternativa y la release con fecha. Coincide con PyPI.

## Criterio → evidencia (sondas propias, `scratchpad/c6rev/sondas.py`, 50/50 OK)

| Criterio | Evidencia propia | Estado |
|---|---|---|
| 1. Clave de entorno o `.env` de la raíz | `.env` temporal en la raíz de MI worktree con `sk-REVIEWER-falsa-…` y cwd en otro directorio: `clave_openai()` la devuelve y `os.environ` no se toca. El entorno gana sobre el `.env`. `.env.example` tiene `OPENAI_API_KEY=` vacío. `.gitignore:16-18` tiene `.env`, `.env.*` y `!.env.example`. Con `git grep -n OPENAI_API_KEY` solo aparece el nombre, sin valores | ok |
| 1. La clave nunca sale | Probé 401, 429, 429 `insufficient_quota`, 500, 503 HTML, `ReadTimeout`, `ConnectError`, 200 no-JSON, 200 sin `data`, 200 `data: null`, 200 con embedding string, 200 sin `index`, 400 con la clave en `code` y 418, todos con la clave falsa en el cuerpo o en el mensaje. Miré `str`, `repr`, `traceback.format_exception` y la cadena `__cause__`/`__context__`: la marca no aparece en ningún caso. También pasé cada caso por `cerebro.main(["indexar"])`, y la CLI real con el `.env` y la red bloqueada (`indexar` y `buscar --json`): la clave no aparece. Con `OPENAI_LOG=debug`, root y los loggers `openai`/`httpx2` a DEBUG: la clave no aparece en las 24 líneas de log ni en stderr (el SDK aplica `SensitiveHeadersFilter`) | ok |
| 2. Sin clave | Error que nombra `OPENAI_API_KEY`, `.env` y `local`. `obtener("local")` y `obtener("falso")` siguen andando | ok |
| 3. Lotes | 129 textos se mandan en lotes de 64/64/1, cada uno con `model=text-embedding-3-small` y `encoding_format=float` | ok |
| 3. Reintento acotado | Con 503, 429, timeout o error de conexión persistentes hay 4 intentos y esperas `[1,2,4]` con `esperar` inyectado, sin dormir. La suite entera tarda 11 s. Con 401, quota, 400 y 418 hay 1 intento. `Retry-After` negativo da 0, `nan` da 0 y una fecha HTTP vuelve al backoff. La CLI real sin red tardó 8,2 s (1+2+4 de backoff real) y salió con código 2 | ok, pero ver hallazgo 2 |
| 3. Solo el fragmento | En una nota con `tags: [secreto-fm]`, el request lleva `"T\n\n# T\n\ncuerpo unico"`, sin `proyecto:` ni el tag | ok |
| 3. Respuesta malformada | **No se traduce**: ver hallazgo 1 | ✗ |
| Guardia | Indexé con `falso` y después corrí `indexar`/`buscar` con openai sin `--todo`: código 2, el mensaje pide `--todo` y salen **0 requests**. `indexar --todo` reconstruye y deja `meta = [('modelo','text-embedding-3-small'),('dim','1536')]`. Al volver a `falso`: código 2 | ok |
| 4. SDK real sobre transporte simulado | `openai.OpenAI(http_client=httpx2.Client(transport=MockTransport(...)))` es el SDK real con transporte simulado, sin cliente falso a mano (H19, `playbooks/ia-en-el-producto.md:54`). Con la suite bajo red bloqueada no hubo ningún intento de red ni de DNS | ok |
| 5. Sin llamadas reales | Igual que el punto anterior. En mis sondas, los 8 intentos de la CLI real los cortó el bloqueo de `httpx2.HTTPTransport` y `socket` | ok |
| Zona / import perezoso | El diff toca solo `.env.example`, `cerebro/{README.md,config.py,embedders.py,requirements.txt}`, `cerebro/tests/test_openai.py` (nuevo) y `sdd/progress/v0.36-C-6/`. Ningún test viejo cambió. `import openai` está solo dentro de `_cliente_listo` (`embedders.py`), y el test `test_crear_el_embedder_no_importa_el_sdk` lo cubre | ok |

## Mutantes propios

Cambié uno por vez, corrí la suite completa con el venv mediante `subprocess.run([...], timeout=120)` y restauré el archivo en el `finally` (script `scratchpad/c6rev/mutantes.py`).

| # | Mutante | Resultado | Corrida | Test que lo mató |
|---|---|---|---|---|
| R1 | `_sin_clave` no tacha nada | MUERTO | Ran 196 tests, FAILED (failures=7) | test_la_clave_no_aparece_en_ningun_error, test_la_cli_no_imprime_la_clave_en_un_error |
| R2 | `raise ErrorEmbedder` dentro del `except` (encadena `__context__`) | MUERTO | Ran 196 tests, FAILED (failures=3) | test_la_clave_no_aparece_en_ningun_error |
| R3 | `repr` del embedder con la clave | MUERTO | Ran 196 tests, FAILED (failures=1) | test_repr_y_str_del_embedder_no_llevan_la_clave |
| R4 | 500 no se reintenta (`estado > 500`) | **SOBREVIVE** | Ran 196 tests, OK | — |
| R5 | backoff desplazado (2/4/8) | MUERTO | Ran 196 tests, FAILED (failures=2) | test_429_y_despues_ok, test_5xx_se_reintenta_y_es_acotado |
| R6 | lotes solapados | MUERTO | Ran 196 tests, FAILED (failures=1) | test_por_lotes_y_en_orden |
| R7 | error de conexión no se reintenta | MUERTO | Ran 196 tests, FAILED (failures=1) | test_error_de_conexion_se_reintenta |
| R8 | guardia de modelo apagada (`indice.py`) | MUERTO | Ran 196 tests, FAILED (failures=7, errors=2) | test_local_a_openai_se_niega_a_mezclar, test_cambio_de_embedder_error_claro_sin_traceback |
| R9 | clave del entorno sin `.strip()` | MUERTO | Ran 196 tests, FAILED (failures=1) | test_sin_clave_es_none |
| R10 | 401 tratado como 403 | MUERTO | Ran 196 tests, FAILED (failures=2) | test_401_error_claro_y_sin_reintento, test_la_cli_no_imprime_la_clave_en_un_error |
| R11 | `Retry-After` ignorado | MUERTO | Ran 196 tests, FAILED (failures=1) | test_retry_after_se_respeta_con_tope |
| R12 | la guardia compara solo el modelo, no la dim | MUERTO | Ran 196 tests, FAILED (failures=3, errors=1) | test_cambiar_dimension_o_nombre_sin_todo_es_error |
| R13 | truncar a 300 antes de tachar | **SOBREVIVE** | Ran 196 tests, OK | — |
| R14 | chequeo de `index` reemplazado por `len(datos) != len(textos)` | **SOBREVIVE** | Ran 196 tests, OK | — |

## Checkpoints
- C1 (el arnés está sano): [x] `verify.py --full` VERDE y las rutas citadas existen.
- C2 (cumple la tarjeta): [ ] ← el criterio 3 pide error claro ante fallos de la API, pero una respuesta 200 malformada sale como traceback (hallazgo 1). El reintento ante 500 no está fijado por ningún test (hallazgo 2). La zona se respetó.
- C3 (diseño y convenciones): [ ] ← `cerebro/cerebro.py:3` promete «errores esperados en español por stderr con código 2, sin traceback», y el hallazgo 1 lo rompe.
- C4 (la verificación es real): [x] La re-ejecuté. Hay tests nuevos con el SDK real y `MockTransport`, sin red, y ningún test viejo tocado. Los huecos de cobertura están en los hallazgos 2–4.
- C5 (cierra limpio): [x] Handback commiteado, `current.md` presente, sin secretos (la clave de los tests es falsa) y `OPENAI_API_KEY` documentada.

## Cambios requeridos

1. **MEDIA, `cerebro/embedders.py:260-263`: una respuesta 200 malformada no se traduce a `ErrorEmbedder`.** `sorted(respuesta.data, ...)`, `d.index` y `float(x)` corren fuera del try/except. Con mis sondas:
   - 200 con texto plano (lo que devuelve un portal cautivo o un proxy): el SDK devuelve `str` y sale `AttributeError: 'str' object has no attribute 'data'`.
   - 200 sin `data`, o con `data: null`: `TypeError: 'NoneType' object is not iterable`.
   - Embedding no numérico: `ValueError: could not convert string to float`.

   `cerebro.main` (`cerebro/cerebro.py:164`) solo atrapa `ErrorEmbedder`, `ErrorIndice`, `ErrorNota` y `OSError`, así que el usuario ve un traceback de Python. Ese traceback no lleva la clave (lo verifiqué). Se espera que cualquier respuesta 200 que no tenga la forma `data[i].index/embedding` numérica termine en un `ErrorEmbedder` claro, en español y sin la excepción encadenada, más un test con el SDK real y `MockTransport` para cada uno de estos tres casos.
2. **MEDIA (test faltante), `cerebro/embedders.py:232` y `cerebro/tests/test_openai.py:281-295`:** el mutante R4 sobrevive. Ningún test comprueba que un **500** se reintente: `test_el_sdk_no_reintenta_por_su_cuenta` usa 500 con `reintentos=0`, y los demás tests de reintento usan 503 o 429. Si cambian `>= 500` por `> 500`, la suite sigue verde y un error 500 transitorio aborta el `indexar`, contra el criterio 3 («reintento ante 429/5xx»). Se espera un test con 500 seguido de 200 que exija 2 requests.

## Mejoras sugeridas (no bloquean)

3. **BAJA, `cerebro/embedders.py:261`:** el mutante R14 sobrevive. El chequeo de `index` (que no haya índices duplicados ni faltantes) no está fijado: con índices `[0,0]` se aceptarían vectores mal asignados. Alcanza con un test con un `index` duplicado. De paso, el mensaje actual de ese caso es confuso: «devolvió 1 vectores para 1 textos».
4. **BAJA, `cerebro/embedders.py:170-173`:** el mutante R13 sobrevive. Si el orden pasa a truncar y después tachar, una clave que caiga justo en el carácter 300 deja una parte visible (sin el prefijo `sk-` no la tapa el patrón). Hoy el orden es correcto, pero ningún test lo fija: falta un test con la clave en la posición ~295 de un mensaje largo.
5. **BAJA, `cerebro/README.md:43-50`:** `playbooks/obsidian-cerebro.md` §D.4 dice que la decisión de mandar texto a OpenAI «queda escrita con fecha en `cerebro/README.md`». La sección «Con OpenAI» explica qué sale de la máquina, pero no tiene fecha (la única fecha es la de la verificación de versiones, en la línea 25). Que lo complete el leader al activarlo, con el OK del owner.
6. **Nota:** `_Secreto` oculta la clave en el `repr` del embedder, pero `self._cliente.api_key` (el objeto del SDK) la sigue guardando en claro. No es una fuga por mensajes, que es lo que pide el criterio, pero que nadie vuelque `vars(e._cliente)` a un log.

## Mejoras al arnés detectadas
- Para el prompter: en las tarjetas que integran una API externa, sumar a la plantilla el borde «respuesta 2xx con cuerpo inesperado (HTML de proxy o portal cautivo, campo `null`)», y exigir que cada valor de una frontera del tipo `>= 500` o `== 401` tenga un test exacto en ese valor (los mutantes de borde R4 y R10 lo muestran).

## Vuelta 2 @ 9b71e38
**Veredicto:** APPROVED

Diff `9fcebc3..9b71e38`: `cerebro/embedders.py` (+11 −4), `cerebro/tests/test_openai.py` (+104 −0) y `cerebro/README.md` (+2). Todo dentro de la zona. Ningún test se borró ni se cambió: en los tests no hay ni una línea `-`.

### Verificación re-ejecutada
```text
$ <venv C-6>/python.exe -m unittest discover -s cerebro/tests
Ran 202 tests in 12.804s
OK
$ python -m unittest discover -s cerebro/tests        (sistema, openai 2.28.0)
Ran 202 tests in 8.328s
OK (skipped=3)
$ <venv C-6>/python.exe sinred.py                       (socket/DNS bloqueados)
Ran 202 tests in 12.720s
OK
intentos de red: []
$ python harness/verify.py --full
VERDE — 0 FAIL, 1 WARN   (sin 'lint', preexistente; el current.md de plantilla que crea, borrado)
```

### Hallazgos de la vuelta 1
1. **Resuelto. Respuesta 200 malformada (`embedders.py:260-270`).** El parseo ahora está dentro de un `try`. El `ErrorEmbedder` se lanza fuera del `except` y no cita la respuesta. Lo probé con la **CLI real en subproceso** (`cerebro/cerebro.py` como `__main__`, con `httpx2.HTTPTransport.handle_request` reemplazado por respuestas armadas, `socket.connect` bloqueado y la clave falsa `sk-REVIEWER-falsa-…` dentro del cuerpo de cada respuesta). Los 5 casos dieron `code=2`, salida que empieza con `error:` en español, sin `Traceback` y sin la clave:
   - texto plano: «OpenAI devolvió una respuesta que no sirve: no tiene la forma esperada (¿un proxy o un portal cautivo en el medio?)»
   - sin `data`, `data: null` y embedding string: el mismo mensaje.
   - `index` duplicado: «… trajo 2 vectores con índices que no cuadran para 1 textos».

   También la sonda en proceso `sondas.py`: 50/50 OK.
2. **Resuelto. Reintento ante 500:** `test_500_se_reintenta` mata a R4.
3. **Resuelto.** `test_index_duplicado_o_faltante_es_error` mata a R14.
4. **Resuelto.** `test_la_clave_se_tacha_antes_de_truncar_a_300` mata a R13.
5. **Resuelto.** `cerebro/README.md:47` tiene la decisión con fecha (2026-10-06, §D.4).
6. La nota sobre `api_key` en el cliente del SDK sigue igual. No bloquea.

### Mutantes (los 14 de la vuelta 1 más 2 sobre el código nuevo)
Uno por vez, suite completa con `subprocess.run(..., timeout=120)`, revertidos.

| # | Mutante | Resultado | Corrida | Test que lo mató |
|---|---|---|---|---|
| R1 | `_sin_clave` no tacha | MUERTO | Ran 202 tests, FAILED (failures=8) | test_la_clave_no_aparece_en_ningun_error |
| R2 | raise dentro del `except` | MUERTO | Ran 202 tests, FAILED (failures=3) | test_la_clave_no_aparece_en_ningun_error |
| R3 | `repr` con la clave | MUERTO | Ran 202 tests, FAILED (failures=1) | test_repr_y_str_del_embedder_no_llevan_la_clave |
| R4 | 500 no se reintenta | MUERTO | Ran 202 tests, FAILED (errors=1) | test_500_se_reintenta |
| R5 | backoff 2/4/8 | MUERTO | Ran 202 tests, FAILED (failures=3) | test_429_y_despues_ok, test_500_se_reintenta |
| R6 | lotes solapados | MUERTO | Ran 202 tests, FAILED (failures=1) | test_por_lotes_y_en_orden |
| R7 | conexión sin reintento | MUERTO | Ran 202 tests, FAILED (failures=1) | test_error_de_conexion_se_reintenta |
| R8 | guardia apagada | MUERTO | Ran 202 tests, FAILED (failures=7, errors=2) | test_local_a_openai_se_niega_a_mezclar |
| R9 | entorno sin `strip` | MUERTO | Ran 202 tests, FAILED (failures=1) | test_sin_clave_es_none |
| R10 | 401 como 403 | MUERTO | Ran 202 tests, FAILED (failures=2) | test_401_error_claro_y_sin_reintento |
| R11 | `Retry-After` ignorado | MUERTO | Ran 202 tests, FAILED (failures=1) | test_retry_after_se_respeta_con_tope |
| R12 | la guardia no compara la dim | MUERTO | Ran 202 tests, FAILED (failures=3, errors=1) | test_cambiar_dimension_o_nombre_sin_todo_es_error |
| R13 | truncar antes de tachar | MUERTO | Ran 202 tests, FAILED (failures=1) | test_la_clave_se_tacha_antes_de_truncar_a_300 |
| R14 | `index` reemplazado por `len` | MUERTO | Ran 202 tests, FAILED (failures=5) | test_index_duplicado_o_faltante_es_error |
| R15 | `except` del parseo estrechado a `KeyError` | MUERTO | Ran 202 tests, FAILED (failures=1, errors=7) | test_la_cli_real_en_subproceso_con_respuesta_malformada, test_respuesta_200_malformada_es_error_claro_sin_encadenar |
| R16 | raise del malformado dentro del `except` (encadena) | MUERTO | Ran 202 tests, FAILED (failures=6) | test_respuesta_200_malformada_es_error_claro_sin_encadenar |

### Checkpoints
- C1: [x] `verify.py --full` VERDE.
- C2: [x] Los criterios 1–5 tienen evidencia y se probaron con sondas propias. La zona se respetó.
- C3: [x] Errores en español, código 2 y sin traceback (`cerebro/cerebro.py:3`), también ante respuestas malformadas.
- C4: [x] La verificación la re-ejecuté yo, con el SDK real sobre `MockTransport`, sin red y sin tests debilitados. Murieron los 16 mutantes.
- C5: [x] Handback de la vuelta 2 commiteado, sin secretos y con la variable documentada.
