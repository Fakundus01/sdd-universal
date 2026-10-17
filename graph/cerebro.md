---
id: cerebro
rutas: [cerebro/cerebro.py, cerebro/config.py, cerebro/demonio.py, cerebro/embedders.py, cerebro/importar.py, cerebro/importar_todo.py, cerebro/indice.py, cerebro/mcp_server.py, cerebro/notas.py, cerebro/README.md]
hash: 9ad284362714a79c6d9bbebd4751d655e901084fda6d6e4eafd73559687bc317
---

# cerebro

Memoria entre proyectos para el agente (S41, F27): notas en Markdown en un vault aparte
(`CEREBRO_DIR`), búsqueda híbrida (palabras + significado) y un MCP para que el agente la consulte
antes de planificar. Contrato completo en [`playbooks/obsidian-cerebro.md`](../playbooks/obsidian-cerebro.md).

- `cerebro.py` — CLI: `init`, `importar-sdd`, `importar-todo`, `indexar`, `buscar`, `nota`, y
  `al-dia` (importar-todo + indexar en un comando: la vuelta del Cerebro, idempotente y pensada
  para correrse seguido o programada).
- `indice.py` — índice SQLite (FTS5 + vectores), fusión por rango recíproco (RRF).
- `embedders.py` — `fastembed` local (default) u OpenAI, nunca mezclados en el mismo índice.
- `importar.py` — siembra el vault con los escenarios, hallazgos, ADRs (`sdd/decisions.md`) y
  lecciones de UN repo (`proyecto` enhebrado, no hardcodeado: lo necesita `importar_todo.py` para no
  etiquetar todo como si fuera `sdd-universal`). Los ADRs entran con el cuerpo tal cual —qué campos
  trae cada uno varía— y una etiqueta `vigente`/`reemplazada` con la que se puede filtrar; un ID
  repetido a propósito (la decisión vieja y la que la reemplaza) se desempata por orden para que
  volver a importar siga siendo idempotente.
- `importar_todo.py` — recorre una carpeta madre e importa cada repo SDD que encuentra; Gitleaks
  bloqueante antes de cada uno (sin el binario, no toca ninguna carpeta); salta `CEREBRO_DIR` mismo
  y cualquier carpeta con `CEREBRO-NO-ENTRA.md` en su raíz.
- `notas.py` — escritura de notas (`tipo: leccion | decision | escenario | hallazgo`).
- `mcp_server.py` — expone `buscar` y `nota` como herramientas MCP (`claude mcp add -s user cerebro …`;
  por stdio, cualquier cliente MCP sirve, `instalar.ps1`/`README.md` también imprimen el equivalente
  con `codex mcp add` para quien use Codex CLI en vez de Claude Code).

- `demonio.py` — cliente **opcional** de un demonio de búsqueda que tenga el modelo y el índice ya
  abiertos (ADR-019). `mcp_server.buscar` le pregunta a él si lo hay: medido, 1314 ms → 54 ms, porque
  `embedders.obtener()` arma un `Local()` nuevo por llamada y cada instancia rearma su sesión ONNX.
  Es opt-in (sin `cerebrod/url.txt` adentro del Cerebro ni `CEREBRO_DEMONIO` no se abre ningún
  socket) y nunca obligatorio: si no está, si sirve **otro** `CEREBRO_DIR` o si contesta cualquier
  cosa, se usa el índice local. El demonio en sí no vive en este repo; acá están el cliente y el
  contrato.

**Deuda abierta (F27):** nada pendiente acá — `cerebro/tests` ya entra en el `test` de
`harness.config.json` y corre en `verify.py` (264 tests al 2026-10-17).
