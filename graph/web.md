---
id: web
rutas: [web/**]
hash: 1c4461cf3a1748b7ab5e70338c597884f14bb034636c479507d6e0799f87d12e
---

# web

El SDD Hub: la web del catálogo (`sdd-universal.vercel.app`), la aplicación de verdad detrás del
paquete — su propia spec vive en `sdd/` (ver `graph/sdd.md`), no en este nodo.

- `combinador.js` / `paquete.js` / `zip.js` — el combinador: arma el `PROMPT-DE-ARRANQUE.txt` y el
  `.zip` del proyecto (tipo, nivel, tecnologías, reglas, playbooks elegidos), reescribe los links
  internos de cada `.md` para que apunten a su ruta dentro del ZIP (`enlazar`/`reescribirLinks`), y
  entrega una carpeta lista para abrir con cualquier agente. Siempre trae `material-cliente/`
  (vacía, para lo que aporte el cliente); con el arnés, también trae `graph/_meta/sync_graph.py`.
- `catalogo.js` / `buscador.js` / `tecnologias-vista.js` — catálogo con filtros, búsqueda (Ctrl+K) y
  selección múltiple de tecnologías.
- `reglas.js` / `reglas-ui.js` — el configurador de las 32 reglas hacia `custom.md`.
- `sesion.js` / `cuenta.js` / `perfil.js` / `metricas.js` — cuentas, combinaciones guardadas y el
  panel de outcomes (O1, O2, O4) contra producción (Supabase).
- `rutas.js` / `shell.js` — rutas reales por vista (`/web/<vista>`, ADR-015), sin el `#/` viejo.
- `sw.js` / `manifest.webmanifest` — PWA instalable, service worker sin caché a propósito.
- `tests/` — los tests de todo lo anterior, incluida la integridad del ZIP (`paquete.test.mjs`).

**No confundir con `graph/harness.md`:** lo que `web/paquete.js` empaqueta de `harness/` es contenido
de otro nodo; este nodo cubre el código de la web en sí, no lo que ella empaqueta.
