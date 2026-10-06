# current.md · v0.35-loops-grafo

- **Feature / rol:** loop `dev-de-10` (R33) · leader (sesión principal)
- **Loop:** `sdd/loops/dev-de-10.md` — aprobado 2026-10-06, tope 8 vueltas

## Grafo
```mermaid
graph LR
  L-1[L-1 R33 en la web] --> L-4[L-4 smoke UI en CI · D2]
  L-2[L-2 verify: depende_de y ciclos]
  L-3[L-3 espejos EN a 0.35]
  L-6[L-6 harness.config.json]
  L-1 & L-2 & L-3 & L-4 & L-6 --> L-5[L-5 cierre]
```

## Bitácora (una línea por vuelta)
- v0 · 25f9ec1 · tarjetas escritas; línea de base: web/tests 47/49 (los 2 de R33), harness/tests OK, verify --quick FAIL (sin harness.config.json → L-6)
- v0 · 4e09c8d · dev/tests 17/17 (objetivo 3 en verde desde la base)

- v1 · L-1 done (review APPROVED @ 2ede9cc, merge); web/tests 49/49 en la rama del loop
- v2 · L-6 blocked: el implementer copió el master a `sdd/SDD-MASTER.md` (fuera de zona, segunda fuente de verdad) y cambió estados de tarjetas. No se mergea. Causa real: `harness/checks.py:135` y `config.py:34` tienen fija la ruta `sdd/SDD-MASTER.md`; el paquete lo tiene en la raíz. Hace falta una clave de config en el arnés → cambio de contrato (harness.md §2) → DRIFT al owner

## Próximo paso
Despachar L-1, L-2 y L-6 en paralelo (worktrees `../sdd-universal-L-<n>`); L-3 cuando se libere un lugar.
