# Sesión actual — rama `v0.36-C-3`

- **Feature / tarjeta:** C-3 — Embedder local con fastembed
- **Rol:** implementer (MEDIO)
- **Última actualización:** 2026-10-06

## Plan
- venv `cerebro/.venv`, versiones de `fastembed`/`mcp` verificadas contra PyPI; modelo verificado en `list_supported_models()`.
- Tests primero (stub de `Local`), rojo medido contra 6c1a023.
- `embedders.Local` perezoso, aviso de descarga, error claro sin red / sin fastembed; `obtener("local")`.
- `requirements.txt`, `README.md` (decisiones R28), `.gitignore`; mutantes; handback.

## Bitácora
- Modelo: paraphrase-multilingual-MiniLM-L12-v2, 384 dim, 0,22 GB. Cache persistente `~/.cache/cerebro/modelos` (`CEREBRO_MODELOS`).

## Verificación
- 87 tests OK con venv (integración real corrida) y con el python del sistema (1 salteado). verify.py --changed VERDE.
