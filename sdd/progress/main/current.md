# Sesión actual — rama `main`

> Mantenelo al día mientras trabajás. Si la sesión se corta o se limpia el contexto, la próxima arranca leyendo esto (plantilla completa: `prompts/relevo.md`).

- **Feature / tarjeta:** F28 (fusión con IA) e infraestructura del arnés. Última sesión: **2026-10-16**
- **Rol:** leader (con pasadas de reviewer sobre `IA-2`, y de implementer en los tests de `IA-3`)
- **Última actualización:** 2026-10-16, al cerrar la sesión
- **R01:** estaba `OFF` por decisión del owner **solo para esa sesión**. Vuelve a `ON`: la sesión que siga pide OK antes de commitear, salvo que el owner lo apague de nuevo.

## Dónde quedó todo

`main` verde (`python harness/ciclo.py --full`), árbol limpio, **69 commits sin pushear**.

Las tres ramas que estaban aprobadas y sin mergear ya están en `main`:

| Rama | Qué traía | ADR / nota |
|---|---|---|
| `ia-fusion` | `IA-1`: endpoint `POST /api/fusionar` | **ADR-018** |
| `ia-fusion-IA-2` | `IA-2`: botón de fusión en el combinador | review hecha acá; bloqueante B1 arreglado |
| `v0.37-plan` | `P-1` (arranque liviano) y `P-2` (costo por rol) | el F28 que entraba pasó a **F29** |

## Lo que se construyó para no repetir trabajo a mano

- **`harness/ciclo.py`** — la vuelta completa en un comando: corre los fixers declarados en la clave `sync` de `harness.config.json`, verifica, arma la evidencia (comando + salida literal + hash) y commitea. **No commitea en rojo** y no despliega nunca. Todos los commits de esta sesión desde `85acbb1` los hizo él.
- **`cerebro.py al-dia <carpeta>`** — `importar-todo` + `indexar` en una vuelta, idempotente, pensado para correrse seguido o programado.
- **`web/sync_conteos.mjs`** — los conteos de la web salen de la fuente (`scenarios.md`, `TECH`) en vez de estar escritos a mano, que ya había fallado cuatro veces.

## Pendientes, por quién los puede hacer

**Necesitan al owner:**
1. **El push.** 69 commits locales. El clasificador de permisos lo frena como deploy de producción (`main` es `prod_branch` y Vercel puede estar enganchado). O lo corre el owner —`python harness/ciclo.py --quick --push --a-prod`— o agrega una regla de permiso para `git push`.
2. **`stash@{0}`**: un reformateo de tabla de `sdd/security.md` hecho por un formateador (padding de celdas, cero cambio de contenido) que no era de esta sesión. `git stash pop` para recuperarlo, `git stash drop` para descartarlo.
3. **Worktrees**: quedan 8, todos limpios. Borrables sin perder nada: `../sdd-universal-IA-3-check` (solo tenía la plantilla vacía que crea `verify.py`), `../sdd-universal-P-1-rev` y `../sdd-universal-P-2-rev` (apuntan al mismo commit que su par, y los cuatro están contenidos en `v0.37-plan`). El clasificador frena `git worktree remove`.
4. **O3** (tres personas ajenas, dos minutos cada una) y **D6** (dominio para el SMTP, ~USD 15/año).
5. **Al reactivar Supabase**: correr `schema.sql` y `metricas.sql` allá. La lista de lo que falta en la nube creció con los tres prefijos `ia:`/`ia-simulada:`/`ia-fallback:` del CHECK de `detalle` — sin eso, cada descarga con fusión IA pierde su métrica sin avisar.

**Puede hacerlos un agente, pero no el que escribió el código:**
6. **`IA-3` está en `review`**, no en `done`. Los cuatro tests G1–G4 están escritos y los cuatro mutantes mueren, pero los escribió esta sesión y R30 no admite que los cierre quien los escribió. La vuelta 2 necesita contexto limpio: re-ejecutar `node api/tests/correr.mjs` (requiere `npm ci`, ADR-018), repetir al menos un mutante por su cuenta, y mirar que los asserts no estén probando una copia del código en vez del código real — que es la regresión que apareció en la vuelta 2 de `IA-1`.

**Cola normal de trabajo:**
7. Pendientes de las reviews de `P-1` y `P-2`, ahora en `main` (detalle en `status.md` → Próximo ciclo, punto 0c): tests para los mutantes R7, V6 y V3-f; nota de migración en el changelog para los `custom.md` bajados antes; `skill/sdd-universal.skill` obsoleto (v0.3); el ZIP no trae `loops.md`.
8. `maxlength="4000"` en el textarea `#cdesc` (M1 de la review de `IA-2`): hoy un texto más largo cae al fallback v1 con un aviso genérico en vez de decir que se pasó.
9. Búsqueda del Cerebro por síntoma (S42): 0/5 con el modelo local, 1/5 con OpenAI.
10. El grafo de contexto no detecta **código sin nodo**: `sync_graph.py` chequea la frescura de las rutas declaradas, no si quedó algo afuera. Se vio cuando el merge de `api/` dejó esa carpeta sin nodo y nadie avisó.

## Próximo paso

Si el owner da el OK: `python harness/ciclo.py --quick --push --a-prod` y mirar los cuatro workflows (`api`, `web`, `harness`, `cerebro`). Si no: la vuelta 2 de la review de `IA-3`, en sesión nueva.
