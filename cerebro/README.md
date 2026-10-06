# cerebro/

Memoria entre proyectos para el agente: notas en Markdown + búsqueda híbrida (palabras + significado). Contrato en `playbooks/obsidian-cerebro.md`.

## Instalación (en un venv, nunca en el Python del sistema)

```bash
python -m venv cerebro/.venv
cerebro/.venv/Scripts/pip install -r cerebro/requirements.txt     # Linux/macOS: cerebro/.venv/bin/pip
cerebro/.venv/Scripts/python cerebro/cerebro.py indexar
```

La primera búsqueda con `CEREBRO_EMBEDDINGS=local` **baja el modelo** (unos 220 MB, una sola vez) y avisa por stderr qué baja y adónde. Sin internet esa primera vez, falla con un error claro. El modelo queda en `~/.cache/cerebro/modelos` (o en `CEREBRO_MODELOS`); no entra al repo.

Sin `fastembed` el núcleo igual funciona: los tests corren con el embedder falso (`CEREBRO_EMBEDDINGS=falso`) y la integración con el modelo real se saltea con motivo.

## Modelo de embeddings

`sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2`, **384 dimensiones**, ~50 idiomas (incluido el español), 512 tokens, Apache-2.0, ~0,22 GB. Verificado en `TextEmbedding.list_supported_models()` de `fastembed` 0.8.1 (no de memoria). Nombre y dimensión quedan en la tabla `meta` del índice. Descartados de la misma lista: `multilingual-e5-large` (2,24 GB, 1024 dim) y `paraphrase-multilingual-mpnet-base-v2` (1,0 GB): pesan de 5 a 10 veces más para notas cortas en español.

## Decisiones de dependencias (R28)

Versiones verificadas contra PyPI el 2026-10-06.

| Dependencia | Qué resuelve | Por qué no alcanza lo que hay | Qué tan viva está |
|---|---|---|---|
| `fastembed==0.8.1` | Embeddings locales (ONNX, CPU, sin servidor ni GPU) para buscar por significado | La stdlib no tiene modelos; escribir un módulo propio equivale a reimplementar tokenizador e inferencia. La alternativa `sentence-transformers` arrastra PyTorch (varios GB); `fastembed` solo `onnxruntime` | Release 0.8.1 del 2026-09-22, mantenida por Qdrant, Python >=3.10 |
| `mcp==2.3.0` | Servidor MCP para que Claude Code llame `buscar` y `nota` (lo usa `mcp_server.py`, tarjeta C-4) | Hablar el protocolo MCP a mano (JSON-RPC, negociación, esquemas) es un módulo propio grande y frágil; es el SDK oficial | Release 2.3.0 del 2026-10-02, SDK oficial del protocolo, Python >=3.10 |

`openai` (embeddings en la nube, opcional) se decide en su tarjeta (C-6), no acá.

## Variables de entorno

| Variable | Para qué |
|---|---|
| `CEREBRO_EMBEDDINGS` | `local` (default) · `openai` · `falso` (tests) |
| `CEREBRO_DIR` | Carpeta del Cerebro (default `Documents/Cerebro`) |
| `CEREBRO_MODELOS` | Dónde se guarda el modelo bajado (default `~/.cache/cerebro/modelos`) |

## Tests

```bash
cerebro/.venv/Scripts/python -m unittest discover -s cerebro/tests -v   # con integración real
python -m unittest discover -s cerebro/tests -v                          # sin fastembed: la integración se saltea
```
