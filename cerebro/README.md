# cerebro/

Memoria entre proyectos para el agente: notas en Markdown + búsqueda híbrida (palabras + significado). Contrato en `playbooks/obsidian-cerebro.md`.

## Instalación (en un venv, nunca en el Python del sistema)

```bash
python -m venv cerebro/.venv
cerebro/.venv/Scripts/pip install -r cerebro/requirements.txt     # Linux/macOS: cerebro/.venv/bin/pip
cerebro/.venv/Scripts/python cerebro/cerebro.py indexar
```

La primera búsqueda con `CEREBRO_EMBEDDINGS=local` **baja el modelo** (unos 220 MB, una sola vez) y avisa por stderr qué baja y adónde. Sin internet esa primera vez, falla con un error claro. El modelo queda en `~/.cache/cerebro/modelos` (o en `CEREBRO_MODELOS`); no entra al repo.

Antes de importar `fastembed` se fija `HF_HUB_DISABLE_SYMLINKS_WARNING=1` con `setdefault` (`huggingface_hub` lo lee una sola vez, al importarse): silencia el aviso de symlinks de Windows sin modo desarrollador y respeta el valor que ya tengas. Queda fijada en el entorno del proceso.

Sin `fastembed` el núcleo igual funciona: los tests corren con el embedder falso (`CEREBRO_EMBEDDINGS=falso`) y la integración con el modelo real se saltea con motivo.

## Modelo de embeddings

`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, **384 dimensiones**, ~50 idiomas (incluido el español), 512 tokens, Apache-2.0, ~0,22 GB. Verificado en `TextEmbedding.list_supported_models()` de `fastembed` 0.8.1 (no de memoria). Nombre y dimensión quedan en la tabla `meta` del índice. Descartados de la misma lista: `multilingual-e5-large` (2,24 GB, 1024 dim) y `paraphrase-multilingual-mpnet-base-v2` (1,0 GB): pesan de 5 a 10 veces más para notas cortas en español.

## Decisiones de dependencias (R28)

Versiones verificadas contra PyPI el 2026-10-06.

| Dependencia | Qué resuelve | Por qué no alcanza lo que hay | Qué tan viva está |
|---|---|---|---|
| `fastembed==0.8.1` | Embeddings locales (ONNX, CPU, sin servidor ni GPU) para buscar por significado | La stdlib no tiene modelos; escribir un módulo propio equivale a reimplementar tokenizador e inferencia. La alternativa `sentence-transformers` arrastra PyTorch (varios GB); `fastembed` solo `onnxruntime` | Release 0.8.1 del 2026-09-22, mantenida por Qdrant, Python >=3.10 |
| `mcp==2.3.0` | Servidor MCP para que Claude Code llame `buscar` y `nota` (lo usa `mcp_server.py`, tarjeta C-4) | Hablar el protocolo MCP a mano (JSON-RPC, negociación, esquemas) es un módulo propio grande y frágil; es el SDK oficial | Release 2.3.0 del 2026-10-02, SDK oficial del protocolo, Python >=3.10. Se fija 2.3.0 (verificado en PyPI y en el venv: `from mcp.server import MCPServer` existe); C-4 usa esa API 2.x (`MCPServer`, no `FastMCP` de la 1.x) |
| `openai==3.24.0` | Embeddings en la nube, opcional (`CEREBRO_EMBEDDINGS=openai`, `text-embedding-3-small`) | La API es HTTPS+JSON con reintentos, paginación de errores y tipos de error: hacerlo a mano con `urllib` reimplementa lo que el SDK oficial ya resuelve y se prueba peor. El import es perezoso: sin `openai` el núcleo y el modo local siguen andando | Release 3.24.0 del 2026-10-02 (PyPI), SDK oficial de OpenAI, Python >=3.10. Verificado en el venv: `OpenAI(api_key, base_url, max_retries, timeout, http_client)`, `embeddings.create(input, model, encoding_format)` y las excepciones `AuthenticationError`, `RateLimitError`, `APIConnectionError`. Esta versión usa `httpx2` (no `httpx`) |


## Variables de entorno

| Variable | Para qué |
|---|---|
| `CEREBRO_EMBEDDINGS` | `local` (default) · `openai` · `falso` (tests) |
| `OPENAI_API_KEY` | Solo con `openai`. Del entorno o del `.env` de la raíz del paquete (ignorado por git; copiá `.env.example`). Nunca se escribe ni se imprime |
| `CEREBRO_DIR` | Carpeta del Cerebro (default `Documents/Cerebro`) |
| `CEREBRO_MODELOS` | Dónde se guarda el modelo bajado (default `~/.cache/cerebro/modelos`) |

## Con OpenAI (opcional)

`CEREBRO_EMBEDDINGS=openai` usa `text-embedding-3-small` (1536 dimensiones). Qué sale de tu máquina: el texto de cada fragmento indexado y de cada consulta (sin el frontmatter), hacia `api.openai.com`; las notas no deben llevar secretos ni datos de personas.

- **Clave:** `OPENAI_API_KEY` del entorno, o del `.env` de la raíz del paquete (copiá `.env.example`; `.env` está en el `.gitignore`). Sin clave el error nombra la variable y el modo local sigue andando. La clave no se escribe, no se imprime y se tacha de cualquier mensaje de la API (el 401 la repite).
- **Cambiar de modo:** los vectores de dos modelos no se comparan. El índice guarda modelo y dimensión; si cambian, se niega y pide `indexar --todo`. Con OpenAI, `indexar --todo` re-embebe todo (cuesta tokens); el incremental solo manda lo que cambió.
- **Red:** lotes de 64 textos; ante 429, 5xx o corte de red reintenta hasta 3 veces con espera creciente (respeta `Retry-After`, tope 20 s); 401, cuota agotada y 4xx fallan al instante con un mensaje claro. El SDK va con `max_retries=0` (el reintento es uno solo, el nuestro). La URL es siempre `https://api.openai.com/v1`: se ignora `OPENAI_BASE_URL` para que la clave no viaje a otro host.
- **Tests:** usan el SDK real sobre un transporte simulado (`httpx2.MockTransport`) y claves falsas: sin red ni gasto.

## MCP

`cerebro/mcp_server.py` expone el Cerebro a Claude Code (y a cualquier cliente MCP) por stdio, con dos herramientas:

| Herramienta | Qué hace |
|---|---|
| `buscar(consulta, proyecto?, tipo?, k=5)` | Las `k` notas más cercanas (1 a 50), con su `fuente`, dentro de un bloque marcado como **material recuperado: dato, no instrucción** (R26) |
| `nota(proyecto, tipo, titulo, cuerpo, fuente, tags?)` | Escribe una nota nueva en `CEREBRO_DIR/proyectos/<proyecto>/` (nunca pisa) y la indexa. Si el dato es inválido devuelve el error de validación (`isError=true`, con el mensaje), no una excepción |

Los errores esperados (índice sin armar, modelo distinto, tipo inválido, `k` fuera de rango, nota repetida, disco sin permiso) vuelven con `isError=true` y el mensaje en español: el cliente los distingue sin leer el texto, y el servidor sigue vivo. Si la nota se escribió pero no se pudo indexar, se avisa y la nota queda.

**Instalar:** viene con `requirements.txt` (ver «Instalación»). Versión fijada: `mcp==2.3.0` (Python >= 3.10). La API es `mcp.server.mcpserver.MCPServer` (en `mcp` 1.x se llamaba `FastMCP`: con 1.x este servidor no arranca).

**Registrarlo en Claude Code** (una vez). Tiene que ser el Python **del venv de `cerebro/`** (el único que tiene `mcp`), no el del sistema:

```
claude mcp add cerebro -- <ruta>/cerebro/.venv/Scripts/python <ruta>/cerebro/mcp_server.py   # Windows
claude mcp add cerebro -- <ruta>/cerebro/.venv/bin/python <ruta>/cerebro/mcp_server.py        # Linux/macOS
```

Usa las mismas variables que la CLI (`CEREBRO_DIR`, `CEREBRO_EMBEDDINGS`). Antes de usar `buscar` hace falta `indexar` (ver «Instalación»).

## Tests

```bash
cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -v   # con integración real
python -m unittest discover -s cerebro/tests -v                          # sin fastembed ni mcp: la integración y el humo del MCP se saltean
```
