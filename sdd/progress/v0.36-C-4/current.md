# Sesión actual — rama `v0.36-C-4`

- **Feature / tarjeta:** C-4 — Servidor MCP: buscar y nota (loop obsidian-cerebro)
- **Rol:** implementer (MEDIO)
- **Última actualización:** 2026-10-06

## Plan
- Tests primero (rojo contra 6c1a023), después `cerebro/mcp_server.py` con `buscar` y `nota` como funciones planas.
- SDK `mcp` solo en `cerebro/.venv` (2.3.0, API `MCPServer`), importado recién en `main()`.
- Mutantes a mano, suite con venv y con el Python del sistema, sección `## MCP` del README.

## Bitácora
- Hecho: servidor, 15 tests, README `## MCP`. Handback en `handback_C-4.md`.

## Lo que se probó y no anduvo
- Humo con stdin por pipe cerrado de golpe: el servidor sale en el EOF antes de contestar `tools/call`; el test espera cada respuesta.

## Verificación
- unittest cerebro: 88 OK (venv) / 88 OK, 1 skipped (sistema). verify.py: único FAIL es `cerebro/requirements.txt` citado en C-2 (lo crea C-3).

## Tarjetas en vuelo
- C-4 (esta).

## Próximo paso
Review de C-4 y merge; después `claude mcp add` con OK del owner.
