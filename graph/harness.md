---
id: harness
rutas: [harness/**]
hash: 5b89b012071dbcc8938a59c168a47b0555d731e7ed267efec09760045d9678d6
---

# harness

El arnés ejecutable de `harness.md` (R29, R30): lo que convierte "está terminado" en algo que se
puede re-correr, no solo declarar. Sin dependencias — Python 3.10+ y git — para que cualquier
proyecto lo copie a su raíz sin instalar nada (`harness/README.md` §"Instalar en un proyecto").

- `verify.py` — los tres niveles (`--quick`, `--changed`, completo) y `--e2e`; la primera línea de
  salida dice el hash, así la salida entera sirve como evidencia.
- `checks.py` — integridad de `--quick`: tarjetas válidas (`sdd/cards/`), su grafo de `depende_de`
  sin ciclos, `status.md` coherente, rutas citadas que existen, handbacks commiteados.
- `config.py` / `repo.py` / `report.py` — lectura de `harness.config.json`, git y el reporte OK/WARN/FAIL.
- `git-hooks/pre-commit` — lo que hace cumplir el arnés con cualquier herramienta, no solo con el
  agente; desde esta versión también invoca `graph/_meta/sync_graph.py --check` si existe.
- `ci/verify.yml` — plantilla de CI; `tests/` prueba cada check con el caso que lo hace fallar.

**Deuda abierta (F27):** `cerebro/tests` todavía no entra en el `test` de `harness.config.json`
(sí entra `graph/_meta/tests`, agregado con este nodo).
