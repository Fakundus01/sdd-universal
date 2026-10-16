---
id: agents
rutas: [agents/**]
hash: b657649314fdc0094eeea7806bc2da90e078a41ad100796c180f2821b5f7cd66
---

# agents

Los prompts de rol de R31 (`orchestration.md` §2): un archivo por rol, cuerpo agnóstico de
herramienta, frontmatter como adaptador de Claude Code.

- `leader.md` — la sesión principal; se lee al arrancar (`Leé agents/leader.md`).
- `implementer.md` / `infra-implementer.md` — ejecutan una tarjeta; el segundo es para trabajo de
  plataforma/infra en vez de una feature.
- `reviewer.md` — re-ejecuta la evidencia de R30, nadie se aprueba a sí mismo.
- `security-reviewer.md` / `pentester.md` (S44) — corren después del `reviewer`, siempre que R27
  activó algún nivel más allá de N0: el primero aplica `seguridad.md` contra la tarjeta (controles
  con su test), el segundo la ataca con los casos de un atacante real. Sin orquestación, el mismo
  `reviewer` hace las tres pasadas.
- `analytic.md`, `looper.md`, `prompter.md` — roles de apoyo: análisis, loops (R33), arreglar el
  arnés cuando un agente falló por el entorno.

En Claude Code se copian todos menos `leader.md` a `.claude/agents/`. El `model:` del frontmatter es
el default por tier de `models.md` §4 (ALTO=`opus`, MEDIO=`sonnet`, ECONÓMICO=`haiku`); si los
nombres de modelo cambian, R19 los actualiza acá. Ningún rol lee el paquete completo (R11): cada uno
lee su archivo, su tarjeta, y lo que la tarjeta cite.
