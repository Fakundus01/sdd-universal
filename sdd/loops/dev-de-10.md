---
loop: dev-de-10
estado: cumplido
rama: v0.35-loops-grafo
aprobado: 2026-10-06 · owner («Ok» en el chat)
---

# Loop dev-de-10

Primer loop con contrato del paquete (R33, `loops.md`). Tipo **calidad**: dejar el desarrollo local «de 10» antes de pensar en producción. Pedido del owner el 2026-10-06.

## Disparador
A pedido del owner (2026-10-06), una vez aprobado este archivo.

## Objetivo (medible)
1. `node --test "web/tests/*.test.mjs"` → `fail 0`. Hoy, 2026-10-06 sobre 83e798f + MD de 0.35: **47/49**; los 2 rojos son R33, que todavía no está en la web (sincronía de reglas y conteos), y son los esperados.
2. `python -m unittest discover -s harness/tests` → `OK`, con tests nuevos de que `verify.py` marca un `depende_de` que no existe y un ciclo (cada uno visto en rojo primero, R29).
3. `node --test "dev/tests/*.test.mjs"` → `fail 0` (entorno local con Postgres levantado).
4. **D2 cerrada:** el smoke de la interfaz por CDP vive en el repo, corre en `.github/workflows/web.yml` y está verde; `status.md` la tacha con fecha.
5. **Espejos en inglés al día:** `SDD-MASTER-EN.md` y `SDD-COMPACT-EN.md` dicen 0.35 y no les falta ninguna regla ni fila del §2 del canónico (hoy el master en inglés quedó en 0.30).
6. Cero drift: `python harness/verify.py --quick` en verde y ningún `DRIFT` abierto.

## Grafo de tarjetas
```mermaid
graph LR
  L-1[L-1 R33 en la web] --> L-4[L-4 smoke UI en CI · D2]
  L-2[L-2 verify: depende_de y ciclos]
  L-3[L-3 espejos EN a 0.35]
  L-7[L-7 clave master en el arnés] --> L-6[L-6 harness.config.json]
  L-1 --> L-5[L-5 cierre: review R30 + changelog]
  L-6 --> L-5
  L-2 --> L-5
  L-3 --> L-5
  L-4 --> L-5
```
L-1, L-2, L-3 y L-6 están listas de entrada (zonas distintas: `web/`, `harness/`, `*-EN.md`, `harness.config.json`); van de a 3 en paralelo, cada una en su rama `v0.35-L-<n>` y su worktree. L-6 apareció en la vuelta 0: este repo no tenía `harness.config.json`, así que el objetivo 6 no se podía medir. Tarjetas en `sdd/cards/`; L-5 la hace el leader. L-7 nació del DRIFT de L-6 (opción A del owner, 2026-10-06): el arnés tenía fija la ruta `sdd/SDD-MASTER.md`.

## Verificación
Los seis comandos o chequeos de arriba, @ el hash de la rama. Al final, un reviewer independiente los re-ejecuta (R30) y escribe `sdd/progress/v0.35-loops-grafo/review_dev-de-10.md`.

## Reglas de corte (la primera que salte)
- Los seis cumplidos y review `APPROVED` → `cumplido`.
- Tope: **8 vueltas** (vuelta = tarjeta cerrada o bloqueada).
- La misma firma de falla 2 veces seguidas → escalar al owner.
- Hace falta cambiar un objetivo, un requisito o una decisión → `DRIFT` (R25) y esperar.
- Hace falta push, merge a `main`, Supabase o Vercel → frenar y pedir OK (R01, R32).
- Hace falta una dependencia nueva (por ejemplo, para el smoke) → línea en `decisions.md` (R28) y OK.

## Memoria
- Bitácora: `sdd/progress/v0.35-loops-grafo/current.md`, una línea por vuelta.
- Al cortar: resumen abajo y HANDBACK al owner.

## Después de este loop
Fuera del alcance de este loop, en el orden que eligió el owner: v0.36 Obsidian (repo como vault y vault «Cerebro») con RAG local primero y OpenAI después, cada uno con su fase de MD; v0.37 un ejemplo de punta a punta; y recién ahí producción.

## Resumen al cortar
**Cumplido el 2026-10-06** en 8 de 8 vueltas; review del loop APPROVED @ 6b82aef (`sdd/progress/v0.35-loops-grafo/review_dev-de-10.md`).

| Objetivo | Al cortar |
|---|---|
| 1 · `web/tests` | 49/49 (base: 47/49) |
| 2 · `harness/tests` | OK, con los checks de `depende_de`, ciclos y `master` |
| 3 · `dev/tests` | 17/17, registrado en `sdd/progress/e2e.md` |
| 4 · D2 | cerrada: smoke en el repo y en CI (PASS, 22 pasos) |
| 5 · espejos EN | 0.35 |
| 6 · `verify.py --quick` | VERDE, 0 FAIL, 0 WARN; sin DRIFT abierto |

- **Un DRIFT, resuelto por el owner:** el arnés tenía fija la ruta del master; opción A → clave `master` (tarjeta L-7, que no estaba en el grafo original).
- **Lo que atajaron los reviewers**, que los tests no veían: texto viejo y `depends_on` en el espejo EN; mutantes vivos y un `UnboundLocalError` en el check del grafo; usos del master configurado sin test.
- **Lección para `scenarios.md` (propuesta, pide OK):** la primera vuelta de L-6, en tier ECONÓMICO, ante un obstáculo improvisó (copió el master, tocó tarjetas) en vez de dar `blocked`; la segunda, en MEDIO y con la prohibición explícita en la tarjeta, se frenó bien. Y las rutas de «un proyecto normal» citadas en los docs del paquete chocan con el chequeo de rutas citadas: se escriben como `<proyecto>/…`.
- **Pendiente fuera del loop:** ver la primera corrida del job `smoke` en GitHub después del push.

