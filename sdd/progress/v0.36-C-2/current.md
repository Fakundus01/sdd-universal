# current.md · v0.36-C-2

- **Tarjeta:** `sdd/cards/C-2.md` — núcleo de `cerebro/` (notas, índice híbrido, buscar) · implementer (MEDIO)

## Plan
- Stubs que importan (`config`, `notas`, `indice`, `embedders`, `cerebro`) y tests de los 7 criterios; rojo medido contra la base.
- `notas.py`: parse/validación del frontmatter (§B), slug saneado, escritura contenida con `open(..., "x")`.
- `indice.py`: SQLite + FTS5 + vectores float32, incremental por hash, guardia de `meta(modelo, dim)`, búsqueda RRF (k=60) con filtros antes de puntuar.
- `cerebro.py`: CLI `init · indexar [--todo] · buscar [--json] · revisar · nota`, errores sin traceback.
- Verde en 3.14 y 3.11, mutantes con timeout, handback.
