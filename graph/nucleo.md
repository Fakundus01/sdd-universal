---
id: nucleo
rutas: [SDD-MASTER.md, SDD-MASTER-EN.md, SDD-COMPACT.md, SDD-COMPACT-EN.md, scenarios.md, orchestration.md, harness.md, loops.md, teams.md, models.md, tecnologias.md, blocks.md, custom.md, seguridad.md, historial-master.md, GUIDE.md, AGENTS.md, CLAUDE.md, CONTRIBUTING.md, README.md]
hash: 4a8e144e7d7a014532b256e17e4a72f254f5072f5610325226082ccef1f40b97
---

# núcleo

El SDD Universal en sí: 20 `.md` en la raíz que cualquier proyecto descarga y pega como prompt de
arranque. En un proyecto normal esto viviría en `<proyecto>/sdd/SDD-MASTER.md`; en este repo vive en
la raíz porque el repo **es** el paquete (ver `CLAUDE.md`) — no confundir con `sdd/`, que es la spec
propia de la web del catálogo (`web/`).

- `SDD-MASTER.md` / `-EN.md` — las reglas (R01…) y el protocolo de lectura; es el único archivo
  imprescindible. `SDD-COMPACT.md` es su resumen para pegar entero en un chat sin archivos. Desde la
  0.40, R04 también cubre diseño: sin hoja de requerimientos, el agente propone un default por rubro
  y tono antes de maquetar, y el sprint MVP (`teams.md` §4, 0.32) lo hereda — acotar alcance no acota
  diseño. `SDD-COMPACT.md` 0.37 se puso al día con eso y con `security-reviewer`/`pentester` (R31).
- `harness.md` / `orchestration.md` / `loops.md` — cómo se demuestra que algo está terminado (R29,
  R30), cómo se reparte el trabajo entre roles (R31) y el contrato de loop con corte (R33).
- `scenarios.md` — el historial de qué rompió y qué regla salió de ahí (S1, S2…).
- `teams.md`, `models.md`, `tecnologias.md`, `blocks.md`, `custom.md`, `seguridad.md` — catálogos que
  el agente consulta al arrancar (tipo de equipo, qué modelo por tier, stack, reglas configurables).
- `historial-master.md` — el changelog del núcleo mismo.
- `GUIDE.md`, `AGENTS.md`, `CLAUDE.md`, `CONTRIBUTING.md`, `README.md` — la puerta de entrada para
  humanos y para que cualquier agente encuentre el SDD solo.

**Deuda abierta:** S42 (orchestration.md §9, tier barato que improvisa) — aparte de este nodo.
