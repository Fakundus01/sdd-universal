# Sesión actual — rama `cerebro-demonio`

> Mantenelo al día mientras trabajás. Si la sesión se corta o se limpia el contexto, la próxima arranca leyendo esto (plantilla completa: `prompts/relevo.md`).

- **Feature / tarjeta:** ninguna — mejora de performance del MCP del Cerebro, pedida por el owner
- **Rol:** sesión aparte (fuera de loop)
- **Última actualización:** 2026-10-17

## Plan
- Medir de dónde sale el tiempo de `buscar` antes de tocar nada.
- Cliente opcional de un demonio de búsqueda, sin dependencias nuevas (stdlib: R28 no aplica).
- Que el camino de hoy siga siendo el único garantizado: si el demonio no está, se usa igual.
- ADR + tests contra un demonio falso + changelog.

## Bitácora
- **Medición (Windows, 175 notas, 262 fragmentos):** primer `embed` en un proceso 3440 ms; segundo
  con el mismo embedder 6 ms; `embed` con un embedder **nuevo** 1223 ms; `Indice.buscar` con el
  índice abierto 35 ms. `embedders.obtener()` devuelve un `Local()` nuevo por llamada y cada
  instancia rearma su sesión ONNX: por eso cada `buscar` del MCP pagaba ~1,2 s.
- **`cerebro/demonio.py`** (nuevo): cliente opt-in. Se configura con los archivos que el demonio
  deja en `<CEREBRO_DIR>/cerebrod/` (`url.txt`, `token.txt`), o con `CEREBRO_DEMONIO` /
  `CEREBRO_DEMONIO_TOKEN`, que les ganan. Se eligió el archivo como forma principal porque cada
  sesión de Claude Code levanta su propio `mcp_server.py` y una variable por registro se
  desincroniza (ADR-019).
- **`config.py`**: `url_demonio(base)` y `token_demonio(base)`.
- **`mcp_server.buscar`**: le pregunta al demonio y cae al índice local ante cualquier duda. El
  formato R26 lo sigue poniendo `mcp_server`, así que lo que recibe el cliente no cambia según el
  camino por el que vino.
- **La comprobación de `base`** (que el demonio sirva el mismo `CEREBRO_DIR`) es el centro del
  diseño: es la única falla silenciosa posible acá.
- `graph/cerebro.md`: nodo actualizado (+`demonio.py`) y la deuda de F27 que figuraba ya no
  corresponde — `cerebro/tests` entra en el `test` de `harness.config.json` y corre en `verify.py`.

## Lo que se probó y no anduvo
- **Un demonio caído salía MÁS caro que no tener ninguno.** Un puerto muerto en Windows no rechaza
  la conexión: se come el timeout entero (2028 ms medidos). Y como `cliente()` armaba un objeto
  nuevo por llamada, la memoria de «no está» no servía para nada y cada búsqueda la volvía a pagar:
  2,0 s contra los 1,3 s de antes. Acotado con timeout corto en `/salud` (0,6 s), reuso del cliente
  entre llamadas y recordar el «no está» por 30 s → 631 ms una vez por proceso, 0 ms las demás.
- **Un test mal planteado:** `{"ok": false}` del demonio no es una caída, es el demonio vivo
  rechazando el pedido. El código estaba bien; se corrigió el test y se agregó el caso contrario.
- **Documenté algo falso y lo vi al probarlo:** «el demonio borra su `url.txt` al apagarse» vale
  sólo si se corta limpio; si lo matan (`Stop-ScheduledTask`, una caída) el archivo queda.
  Corregido en el ADR y en el README.

## Verificación
- `harness/verify.py` @ 22623f1 (antes de la rama): **VERDE**, 0 FAIL, 1 WARN preexistente (`sin
  'lint' en harness.config.json`); 282 rutas citadas existen; 264 tests OK.
- `cerebro/tests` 264 OK con el venv **y** con el Python pelado sin `fastembed` ni `mcp` (como la CI).
- A mano contra el demonio real (que vive afuera de este repo): mismo primer resultado y mismo
  bloque R26 por los dos caminos; 1314 ms → 54 ms.

## Tarjetas en vuelo
- ninguna

## Próximo paso
Decidir si esto se mergea a `main` como parte de 0.37, y completar esa sección del changelog, que
quedó abierta e **incompleta**: 0.37 ya tiene mergeado el grafo de contexto (F27), `IA-1`/`IA-2`
(F28) y `P-1`/`P-2` (F29), y nada de eso está escrito ahí. Aparte y opcional: que `cerebro.py
buscar` (el CLI) también use el demonio — hoy sólo lo usa el MCP.
