# agents/ · Prompts de rol (R31)

Un archivo por rol de `orchestration.md` §2. El cuerpo es agnóstico; el frontmatter es el adaptador de Claude Code y las demás herramientas lo ignoran.

| Herramienta | Cómo se usan |
|---|---|
| Claude Code | Copiar todos menos `leader.md` a `.claude/agents/`. El `leader` es la sesión principal: su archivo se lee al arrancar (`Leé agents/leader.md`). |
| Codex, Cursor, Copilot, Gemini CLI | Una sesión por rol: primer mensaje = `Leé sdd/SDD-MASTER.md y agents/<rol>.md. Tu tarjeta: sdd/cards/<ID>.md`. |
| Solo-chat | Pegar `SDD-COMPACT.md` + el cuerpo del rol + la tarjeta. |

El `model:` del frontmatter es el default de Claude para el tier de `models.md` §4 (ALTO = `opus`, MEDIO = `sonnet`, ECONÓMICO = `haiku`); el leader puede pedir otro por tarjeta. Si los nombres de modelo cambian, R19 los actualiza acá.

Las rutas asumen el layout de un proyecto (`sdd/…`, `harness/…`). Ningún rol lee el paquete completo (R11): cada uno lee su archivo, su tarjeta y lo que la tarjeta cite.
