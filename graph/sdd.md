---
id: sdd
rutas: [sdd/**]
hash: 58c4aac91101f73424ccb8a4975d02d27d5f79ccf7a8eb5996996d3bdde1c17e
---

# sdd

La especificación propia de la web del catálogo (`web/`), que es una aplicación de verdad y por eso
tiene su SDD completo — no confundir con el núcleo de la raíz (ver `graph/nucleo.md` y `CLAUDE.md`).

- `spec.md` — el problema (20 `.md` sin saber qué descargar, qué hacen, y la fricción de escribir el
  prompt a mano) y los outcomes medibles (O1…O4) contra los que se mide la web.
- `status.md` — el estado real de cada feature (F1…F27), bloqueos y el próximo ciclo acordado.
- `cards/` — las tarjetas del grafo de trabajo (`depende_de`, R33), con sus `progress/` (current,
  handback, review) por rama.
- `design.md`, `contracts.md`, `testing.md`, `security.md` — diseño, contratos de datos, plan de
  tests y controles de seguridad de la web.
- `loops/` — los loops ya corridos (`dev-de-10`, `obsidian-cerebro`…), uno por `sdd/loops/<nombre>.md`.

**Debt/estado:** ver `sdd/status.md` para el detalle feature por feature; no se duplica acá porque
cambia seguido y el hash de este nodo ya lo cubre (cualquier cambio en `sdd/**` lo desactualiza).
