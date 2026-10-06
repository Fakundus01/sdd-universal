# Handback C-9 — Modelo local mpnet (DRIFT del objetivo 3)

- **Estado:** done
- **Rama / commit:** `v0.36-C-9` @ `d71641b` (código y tests; el commit del handback es el siguiente)
- **Quién:** implementer (MEDIO)

## Hecho
- `CEREBRO_EMBEDDINGS=local` usa `sentence-transformers/paraphrase-multilingual-mpnet-base-v2`, 768 dim. Verificado en `TextEmbedding.list_supported_models()` de fastembed 0.8.1: fuente HF `xenova/paraphrase-multilingual-mpnet-base-v2`, archivo `onnx/model.onnx`, 1.0 GB, dim 768, 384 tokens.
- Nombre, dim, peso del aviso (`PESO_LOCAL = "cerca de 1 GB"`) y huella de caché (`HUELLA_CACHE`, derivada del nombre) salen de una sola definición en `embedders.py`.
- Bug encontrado y corregido: `_en_cache` buscaba `snapshots/*/*.onnx`, pero el modelo nuevo guarda `snapshots/<hash>/onnx/model.onnx`; con el glob viejo el aviso de descarga saldría siempre aunque el modelo ya estuviera. Ahora `snapshots/*/**/*.onnx`.
- `mcp_server.nota`: si el fallo es `ErrorModelo`, el aviso termina en "corré `cerebro.py indexar --todo`" (criterio 6).
- README «Modelo de embeddings»: decisión, motivo (DRIFT), descartado. `instalar.ps1`, workflow y README: «~1 GB» en lugar de «~220 MB».

## No hecho / pendiente
- Nada.

## Cómo
- Tests existentes de C-3: ninguno borrado ni debilitado. Cambios declarados: los literales 384 / «220 MB» / MiniLM pasaron a `embedders.DIM_LOCAL` / `PESO_LOCAL` / `MODELO_LOCAL`; el helper `modelo_bajado` usa la estructura real de fastembed (`models--xenova--<huella>/snapshots/abc/onnx/model.onnx`) y el test «snapshots vacío o sin onnx» borra ese archivo (ata lo mismo). Un solo test fija los literales nuevos (`mpnet`, 768).
- Fixture a propósito: `TestIndiceDeOtroModelo.VIEJO` cita el nombre MiniLM, porque el índice viejo SE armó con él (criterio 2); es el único lugar de código/tests que lo nombra (más la prosa del README).
- No se tocó RRF, FTS ni fragmentos.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| cerebro/embedders.py | MODELO/DIM/PESO/HUELLA_CACHE nuevos; glob del caché |
| cerebro/mcp_server.py | import `ErrorModelo` y texto del aviso de `nota` |
| cerebro/tests/test_local.py | constantes, estructura real del caché, `TestPesoYNombreEnLosTextos`, `TestIndiceDeOtroModelo` |
| cerebro/tests/test_mcp_server.py | test del aviso con índice de otro modelo |
| cerebro/README.md, cerebro/instalar.ps1, .github/workflows/cerebro.yml | textos del modelo y peso |
| sdd/progress/v0.36-C-9/ | current.md y este handback |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1 | `test_nombre_y_dim_son_los_del_modelo_multilingue`, `test_textos_fijos_dicen_1_gb_y_no_220`, `test_huella_de_cache_sale_del_nombre_del_modelo` |
| 2 | `TestIndiceDeOtroModelo` (3 tests) + corrida real abajo |
| 3 | README, sección «Modelo de embeddings» |
| 4 | tests de C-3 en verde con el modelo nuevo (aviso antes de bajar, stderr, carga perezosa, caché, snapshot sin `.onnx`); mutantes M3, M4, M7 |
| 5 | corrida real abajo: S39 puesto 1, S42 puesto 3 |
| 6 | `test_con_un_indice_de_otro_modelo_el_aviso_pide_indexar_todo`, mutante M5 |

Rojo antes (R29), medido contra la base:
```text
$ git rev-parse --short HEAD   (base)
e9b3589
$ python -m unittest discover -s cerebro/tests   (venv, CEREBRO_SIN_MODELO=1, tests nuevos sobre el código base)
ERROR: test_huella_de_cache_sale_del_nombre_del_modelo
FAIL: test_buscar_pide_indexar_todo_sin_traceback
FAIL: test_indexar_sin_todo_tambien_lo_pide
FAIL: test_con_el_modelo_en_cache_no_avisa
FAIL: test_nombre_y_dim_son_los_del_modelo_multilingue
FAIL: test_textos_fijos_dicen_1_gb_y_no_220
FAIL: test_con_un_indice_de_otro_modelo_el_aviso_pide_indexar_todo
Ran 225 tests in 14.681s
FAILED (failures=6, errors=1, skipped=1)
```

Verde después (@ d71641b), suite completa con `subprocess.run(..., timeout=120)`:
```text
venv, CEREBRO_SIN_MODELO=1:  Ran 225 tests in 12.196s  OK (skipped=1)
venv, con modelo real mpnet: Ran 225 tests in 16.413s  OK
python del sistema:          Ran 225 tests in 10.308s  OK (skipped=3)
$ python harness/verify.py --quick
VERDE — 0 FAIL, 0 WARN
```

Mutantes (uno por vez, suite completa, venv + CEREBRO_SIN_MODELO=1; todos matados, archivo restaurado después):
| Mutante | Corrida | Lo mata |
|---|---|---|
| M1 DIM_LOCAL=384 | Ran 225 tests, FAILED (failures=1) | test_nombre_y_dim_son_los_del_modelo_multilingue |
| M2 PESO_LOCAL «unos 220 MB» | Ran 225 tests, FAILED (failures=1) | test_textos_fijos_dicen_1_gb_y_no_220 |
| M3 HUELLA_CACHE inexistente | Ran 225 tests, FAILED (failures=2) | test_con_el_modelo_en_cache_no_avisa, test_huella_de_cache_sale_del_nombre_del_modelo |
| M4 glob sin subcarpetas | Ran 225 tests, FAILED (failures=1) | test_con_el_modelo_en_cache_no_avisa |
| M5 `nota` siempre «indexar» | Ran 225 tests, FAILED (failures=1) | test_con_un_indice_de_otro_modelo_el_aviso_pide_indexar_todo |
| M6 nombre MiniLM | Ran 225 tests, FAILED (failures=2) | test_nombre_y_dim_..., test_huella_... |
| M7 caché sin exigir `.onnx` | Ran 225 tests, FAILED (failures=3) | test_snapshots_vacio_o_sin_onnx_no_cuenta_como_bajado |
| M8 README con «220 MB» | Ran 225 tests, FAILED (failures=1) | test_textos_fijos_dicen_1_gb_y_no_220 |

Corrida real (criterio 5), `CEREBRO_DIR` temporal en %TEMP%, `CEREBRO_EMBEDDINGS=local`: `init`; `importar-sdd` de este repo (42 escenario, 26 hallazgo, 3 leccion; 71 nuevas); `indexar` (71 nuevas).
```text
$ cerebro.py buscar "el loop no sabe cuándo frenar" -k 3
1. El humano pide «seguí el loop hasta dejarlo de 10» y se va  [sdd-universal · escenario]  puntaje 0.032787
   fuente: sdd-universal/scenarios.md#S39
2. A mitad de la implementación, la spec aprobada resulta estar mal (...)
   fuente: sdd-universal/scenarios.md#S22
3. Hackathon / prototipo descartable  puntaje 0.030536
   fuente: sdd-universal/scenarios.md#S04

$ cerebro.py buscar "copió un archivo para que pase el check" -k 3
1. Lección para `scenarios.md` (propuesta, pide OK)  puntaje 0.031778
   fuente: sdd-universal/sdd/loops/dev-de-10.md#resumen-al-cortar
2. Los controles mismos mienten: un check que nunca vio un rojo, ...
   fuente: sdd-universal/scenarios.md#S29
3. Tarjeta con un obstáculo de diseño despachada al tier más barato  puntaje 0.031099
   fuente: sdd-universal/scenarios.md#S42
```
S39 primera; S42 tercera (salida recortada a título, fuente y puntaje).

Criterio 2, real (índice armado con el código base, MiniLM; después el nuevo):
```text
$ cerebro.py buscar "loop" -k 2
error: el índice se armó con el modelo «sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2» (dim 384) y el activo es «sentence-transformers/paraphrase-multilingual-mpnet-base-v2» (dim 768): los vectores de dos modelos no se comparan. Corré `cerebro.py indexar --todo`
exit=2
$ cerebro.py indexar          -> mismo error, exit=2
$ cerebro.py indexar --todo   -> 71 nuevas, 0 actualizadas, 0 sin cambios, 0 borradas
```
Sin traceback. Los `CEREBRO_DIR` temporales se borraron.

## Fuera de zona / riesgos
- El modelo pesa ~1 GB (antes ~0,22): la primera indexación local tarda más; la CI sigue saltándolo con `CEREBRO_SIN_MODELO`. El caché de MiniLM en `~/.cache/cerebro/modelos` queda huérfano (no se borró, por pedido).
- Cualquier Cerebro real ya indexado con MiniLM necesita `cerebro.py indexar --todo` (la guardia lo pide).
- Textos fuera de zona (playbook, `sdd/`) que citen «220 MB» o MiniLM: no revisados ni tocados.

## Cambios de spec sugeridos
- Si `playbooks/obsidian-cerebro.md` menciona el modelo o su peso, actualizarlo (lo decide el leader).

## Variables de entorno nuevas
- ninguna

## Próximo paso sugerido
- Review de C-9 y merge al loop; luego el owner corre `indexar --todo` en su Cerebro real.
