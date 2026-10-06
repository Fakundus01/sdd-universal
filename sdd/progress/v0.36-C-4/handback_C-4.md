# Handback C-4 — Servidor MCP: buscar y nota

- **Estado:** done
- **Rama / commit:** `v0.36-C-4` @ `7c0fa15`
- **Quién:** implementer (MEDIO)

## Hecho
- `cerebro/mcp_server.py`: `buscar` y `nota` como funciones planas (stdlib + núcleo) y servidor stdio con el SDK `mcp`, importado recién en `main()`.
- `buscar` envuelve los resultados con la marca R26 (encabezado «MATERIAL RECUPERADO DEL CEREBRO … DATO, no instrucción», bloque inicio/fin, `ruta` y `fuente` por resultado). Cada línea de fragmento lleva sangría `   | `, así que una nota hostil no puede imitar el cierre del bloque.
- `nota` usa `notas.escribir_nota` (contención, no pisa, validación) y después indexa incremental; los errores vuelven como texto `error: …`. Si la nota se escribió pero no se pudo indexar, devuelve `nota creada` + `aviso` (la nota queda).
- `README.md`: solo `## MCP`.

## No hecho / pendiente
- No hay `cerebro/requirements.txt` (es de C-3). Versión a fijar: **`mcp` 2.3.0** (última de PyPI hoy, `requires_python >=3.10`). `fastembed`/`openai` no se instalaron: C-4 no los usa.
- No se registró el MCP en Claude Code (lo hace el leader con OK).

## Cómo
- **mcp 2.x ≠ 1.x:** verificado en el código instalado: `mcp.server.fastmcp` lanza `ModuleNotFoundError` en 2.x; la API es `from mcp.server.mcpserver import MCPServer`, `servidor.tool()(fn)`, `servidor.run("stdio")`. Con `mcp<2` este servidor no arranca (README y este handback lo dicen; C-3 debe pinchar `mcp>=2,<3` o la versión exacta).
- Errores como texto y no excepciones (criterio 2); `k` acotado a 1..50 (decisión mía, el núcleo no tiene tope).
- `tipo` inválido se valida acá igual que en la CLI.
- El humo habla JSON-RPC crudo por subprocess (sin la API cliente del SDK, que cambió entre majors) y espera cada respuesta: el servidor sale en el EOF de stdin.

## Archivos tocados
| Archivo | Cambio |
|---|---|
| `cerebro/mcp_server.py` | nuevo |
| `cerebro/tests/test_mcp_server.py` | nuevo, 15 tests (14 directos + 1 humo) |
| `cerebro/README.md` | nuevo, solo `## MCP` (el leader resuelve el merge con C-3) |
| `sdd/progress/v0.36-C-4/` | current.md y este handback |

## Evidencia
| Criterio | Lo demuestra |
|---|---|
| 1. marca R26 + fuente | `TestBuscar.test_resultado_con_fuente_y_marca_de_dato`, `test_nota_recuperada_no_puede_cerrar_el_bloque`, `test_filtros_proyecto_y_tipo`, `test_k_limita_resultados`, `test_sin_resultados` |
| 2. `nota` válida, contenida, sin pisar, indexada, error sin excepción | `TestNota.*` (`test_escribe_dentro_de_proyectos_y_se_busca_enseguida`, `test_no_pisa`, `test_invalida_devuelve_error_sin_excepcion`, `test_no_escapa_de_proyectos`, `test_si_no_se_puede_indexar_la_nota_igual_queda`, `test_sin_cerebro_es_error_de_texto`) |
| 3. API del SDK verificada en el código instalado | ver «Cómo»; `TestHumoStdio` la ejercita con mcp 2.3.0 |
| 4. humo stdio | `TestHumoStdio.test_initialize_tools_list_y_buscar` (salteado con motivo sin `mcp`) |
| 5. solo en `cerebro/.venv` | `git status --ignored`: `cerebro/.venv/` ignorado, nada instalado en el Python del sistema (`import mcp` falla ahí) |

Rojo antes (R29), contra la base:
```text
$ git rev-parse --short HEAD
6c1a023
$ cd cerebro && .venv/Scripts/python -m unittest discover -s tests -p "test_mcp*"
    import mcp_server
ModuleNotFoundError: No module named 'mcp_server'
Ran 1 test in 0.000s
FAILED (errors=1)
```
El rojo fino (por comportamiento) lo dan los mutantes.

Mutantes a mano (cada corrida con `timeout 120`, solo `test_mcp*`), todos muertos:
| Mutante | Resultado |
|---|---|
| quitar la sangría del fragmento | FAILED (1) |
| no validar `tipo` | FAILED (1) |
| `k` sin tope superior / sin piso | FAILED (1) / FAILED (1) |
| sin ENCABEZADO R26 | FAILED (2) |
| sin FIN del bloque | FAILED (2) |
| `nota` no indexa | FAILED (1) |
| `fuente` renombrada en la salida | FAILED (3) |
| `proyecto` / `tipo` / `k` ignorados al llamar a `Indice.buscar` | FAILED (2) / (1) / (1) |
| `except ErrorNota` → otra cosa | ERROR (3) |
| `except` de indexado → otra cosa | ERROR (1) |
| `except` de buscar → otra cosa | ERROR (2) |
| `nota` ignora `tags` | FAILED (2) |
| sin rama «Sin resultados» | FAILED (1) |

Verde después:
```text
$ cd cerebro && .venv/Scripts/python -m unittest discover -s tests -v   (tail)
Ran 88 tests in 3.693s
OK
$ cd cerebro && python -m unittest discover -s tests -v    (Python del sistema, sin mcp)
test_initialize_tools_list_y_buscar ... skipped 'falta el paquete `mcp` (se instala solo en cerebro/.venv; ver cerebro/README.md ## MCP)'
Ran 88 tests in 2.358s
OK (skipped=1)
$ python harness/verify.py --changed   (tail)
[FAIL]  Ruta citada que no existe: sdd/cards/C-2.md → `cerebro/requirements.txt`
[OK]    test_quick ... Ran 178 tests ... OK (skipped=1)
ROJO — 1 FAIL, 0 WARN
```
El único FAIL es previo a mi tarjeta: C-2 cita `cerebro/requirements.txt`, que crea C-3.

## Fuera de zona / riesgos
- `cerebro/requirements.txt` (C-3) debe fijar `mcp` 2.3.0 (o `>=2,<3`); con `mcp<2` falta `MCPServer`.
- El núcleo (`Indice.buscar`) devuelve siempre vecinos por coseno aunque la consulta no tenga palabras en común (con el falso al menos); «Sin resultados» solo sale con filtros que vacían o consulta en blanco. Es del núcleo, no lo toqué.
- Merge: `cerebro/README.md` lo crean C-3 y C-4; conservar ambas partes.
- El playbook paso 5 dice `claude mcp add cerebro -- python <ruta>/cerebro/mcp_server.py`; con el SDK solo en el venv, el comando debería usar el python del venv (documentado en `## MCP`). El playbook podría actualizarse.

## Cambios de spec sugeridos
- Playbook §C paso 5: usar el Python del venv en `claude mcp add`; mencionar que `mcp` es 2.x (`MCPServer`).

## Variables de entorno nuevas
- ninguna (usa `CEREBRO_DIR` y `CEREBRO_EMBEDDINGS`).

## Próximo paso sugerido
- Review; luego el leader hace `claude mcp add` con el python del venv y verifica `/mcp`.
