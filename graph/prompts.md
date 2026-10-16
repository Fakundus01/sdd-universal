---
id: prompts
rutas: [prompts/**]
hash: bd59099775510fe24d670de880394eb4e132c79fed82c47f17b124ce10e26887
---

# prompts

Las plantillas que el agente usa al trabajar, citadas desde `harness.md`, `orchestration.md` y
`agents/`. Siempre viajan en el ZIP del combinador (`web/paquete.js`, constante `PLANTILLAS`).

- `task-card.md` — plantilla de tarjeta (`sdd/cards/<ID>.md`): criterios de aceptación, zona de
  archivos, `depende_de`.
- `handback.md` — el bloque HANDBACK al cerrar un ciclo: qué se hizo, evidencia, próximo paso.
- `relevo.md` — para seguir en una sesión limpia sin perder el estado (`sdd/progress/<rama>/current.md`).
- `sdd-lite.md` — el modo LITE (R18): todo el SDD en un solo archivo, sin `cards/` ni `progress/`.
- `loop-prompt.md` — el loop de trabajo con contrato de corte (R33, `loops.md`).
- `start-prompt.md`, `maintenance-prompt.md`, `from-another-chat.md`, `lead-finder-brownfield.md` —
  arranque de un proyecto nuevo, auditoría R19, traer una idea de otro chat (ver `imports/`), y
  brownfield (analizar código existente sin tocarlo, R15).
