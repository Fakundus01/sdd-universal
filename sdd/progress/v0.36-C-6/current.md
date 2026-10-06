# current — rama v0.36-C-6

Tarjeta: C-6 (embedder OpenAI y guardia de modelo). Implementer MEDIO.

Plan:
- `openai==3.24.0` verificado en PyPI y en el venv (el SDK usa `httpx2`); fila en `cerebro/README.md`.
- `config.clave_openai()` (entorno, luego `.env` de la raíz del paquete) + `.env.example`.
- `embedders.OpenAIEmbedder`: import perezoso, SDK con `max_retries=0` y reintento propio acotado, lotes, errores sin la clave.
- Tests con el SDK real sobre `MockTransport`; guardia de modelo con `Indice` local <-> openai.
