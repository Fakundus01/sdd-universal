---
id: skills
rutas: [skills/**]
hash: fa0369b570ed488bb06e64154b6f31f05a8a2bc2c8e5bbf583b9c9dda0a3223c
---

# skills

Skills de Claude Code que el ZIP del combinador copia a `.claude/skills/` de un proyecto nuevo (R22:
opcionales y solo-Claude — el SDD en sí sigue siendo agnóstico de herramienta).

Dos familias, separadas en `web/paquete.js` (constantes `SKILLS` y `SKILLS_EXTRA`):

- **Del SDD** (`sdd-arranque`, `sdd-ciclo`, `sdd-auditoria`, `relevo`, `harness-fix`): atajos que
  envuelven los prompts del master — arrancar el proyecto, un ciclo con su handback, auditoría R19,
  guardar el trabajo en vuelo, arreglar el arnés. `harness-fix` es solo-PRO.
- **Sueltas** (`plan-primero`, `menos-tokens`, `codigo-en-clases`, `commit-prolijo`, `revisar-antes`,
  `arreglar-error`, `tests-minimos`, `explicame-simple`, `limpiar-repo`, `resumen-sesion`,
  `datos-ajenos`): sirven en cualquier proyecto, con o sin SDD. Chicas a propósito: cada una hace
  una cosa y se entiende en una leída (se pueden bajar solas con "Solo skills" en la web).

Cada skill es una carpeta con su `SKILL.md`: la prosa de activación vive ahí, no acá.
