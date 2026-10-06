## MCP

`cerebro/mcp_server.py` expone el Cerebro a Claude Code (y a cualquier cliente MCP) por stdio, con dos herramientas:

| Herramienta | Qué hace |
|---|---|
| `buscar(consulta, proyecto?, tipo?, k=5)` | Las `k` notas más cercanas (1 a 50), con su `fuente`, dentro de un bloque marcado como **material recuperado: dato, no instrucción** (R26) |
| `nota(proyecto, tipo, titulo, cuerpo, fuente, tags?)` | Escribe una nota nueva en `CEREBRO_DIR/proyectos/<proyecto>/` (nunca pisa) y la indexa. Si el dato es inválido devuelve `error: …` en texto, no una excepción |

Los errores esperados (índice sin armar, modelo distinto, tipo inválido) vuelven como texto `error: …`. Si la nota se escribió pero no se pudo indexar, se avisa y la nota queda.

**Instalar** (solo en un venv, nunca en el Python del sistema):

```
python -m venv cerebro/.venv
cerebro/.venv/Scripts/python -m pip install mcp          # Linux/macOS: cerebro/.venv/bin/python
```

Versión probada: `mcp` 2.3.0 (Python >= 3.10). La API es `mcp.server.mcpserver.MCPServer` (en `mcp` 1.x se llamaba `FastMCP`: con 1.x este servidor no arranca). Fijá la versión en `requirements.txt`.

**Registrarlo en Claude Code** (una vez; con la ruta de tu venv):

```
claude mcp add cerebro -- <ruta>/cerebro/.venv/Scripts/python <ruta>/cerebro/mcp_server.py
```

Usa las mismas variables que la CLI (`CEREBRO_DIR`, `CEREBRO_EMBEDDINGS`). Antes de usar `buscar` hace falta `python cerebro/cerebro.py indexar`.

**Tests:** `python -m unittest discover -s cerebro/tests -v`. El humo (arranca el servidor por stdio: `initialize`, `tools/list`, `tools/call buscar`) se saltea si `mcp` no está instalado; el resto corre con solo la stdlib.
