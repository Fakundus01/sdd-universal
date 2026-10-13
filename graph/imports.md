---
id: imports
rutas: [imports/**]
hash: 4f6bf47846c9fe2bef3bd77c7d3b5716a4d1fbe0dd3c54f638a9e3deff9ee3bc
---

# imports

Briefs de ideas traídas de otro chat o proyecto, en el formato de `prompts/from-another-chat.md`:
las decisiones ya tomadas no se re-preguntan, el cuestionario socrático (R04) se usa solo para lo
que queda en "Pendientes" del brief.

- `2026-10-02-relay-harness/` — el origen de `harness.md` y `orchestration.md`: un arnés de ejecución
  verificable (scripts, hooks, checks, roles separados) probado en producción en otro proyecto
  (`chat-commerce-ai`, features H-1 a H-11), importado para que el SDD garantice no solo *qué* se
  construye sino que lo que el agente dice que hizo sea cierto. `BRIEF.md` es el pedido original,
  `START-PROMPT.md` el prompt de arranque de esa integración, `reviews/` sus reviews.

Es un archivo histórico más que algo que se mantenga activamente: una vez integrado el brief al
núcleo, la carpeta queda como registro de dónde salió la idea.
