---
id: cerebro
rutas: [cerebro/cerebro.py, cerebro/config.py, cerebro/embedders.py, cerebro/importar.py, cerebro/importar_todo.py, cerebro/indice.py, cerebro/mcp_server.py, cerebro/notas.py, cerebro/README.md]
hash: d8076cd5d1fa98cfffa72d2de6d0ff25874766b8275a9f1fbebe05dd64f11544
---

# cerebro

Memoria entre proyectos para el agente (S41, F27): notas en Markdown en un vault aparte
(`CEREBRO_DIR`), búsqueda híbrida (palabras + significado) y un MCP para que el agente la consulte
antes de planificar. Contrato completo en [`playbooks/obsidian-cerebro.md`](../playbooks/obsidian-cerebro.md).

- `cerebro.py` — CLI: `init`, `importar-sdd`, `importar-todo`, `indexar`, `buscar`, `nota`.
- `indice.py` — índice SQLite (FTS5 + vectores), fusión por rango recíproco (RRF).
- `embedders.py` — `fastembed` local (default) u OpenAI, nunca mezclados en el mismo índice.
- `importar.py` — siembra el vault con los escenarios, hallazgos y lecciones de UN repo (`proyecto`
  enhebrado, no hardcodeado: lo necesita `importar_todo.py` para no etiquetar todo como si fuera
  `sdd-universal`).
- `importar_todo.py` — recorre una carpeta madre e importa cada repo SDD que encuentra; Gitleaks
  bloqueante antes de cada uno (sin el binario, no toca ninguna carpeta); salta `CEREBRO_DIR` mismo
  y cualquier carpeta con `CEREBRO-NO-ENTRA.md` en su raíz.
- `notas.py` — escritura de notas (`tipo: leccion | decision | escenario | hallazgo`).
- `mcp_server.py` — expone `buscar` y `nota` como herramientas MCP (`claude mcp add -s user cerebro …`;
  por stdio, cualquier cliente MCP sirve, `instalar.ps1`/`README.md` también imprimen el equivalente
  con `codex mcp add` para quien use Codex CLI en vez de Claude Code).

**Deuda abierta (F27):** `cerebro/tests` todavía no entra en `verify.py --full`.
