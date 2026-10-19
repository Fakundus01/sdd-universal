---
id: IA-4
titulo: "Lo que el pedido autoriza a gastar: server tool use, el 200 sin usage, la tabla de precios"
estado: pending
feature: F28 · Fusión con IA del combinador (v2 de blocks.md, ADR-016)
depende_de: [IA-1, IA-3]
rama: ia-fusion-IA-4
---

# Tarjeta IA-4 — Lo que el pedido autoriza a gastar: server tool use, el 200 sin usage, la tabla de precios

- **Spec:** leé `playbooks/ia-en-el-producto.md` §A, §B y §E, `sdd/costs.md`, `sdd/decisions.md` ADR-017 — nada más del SDD
- **Modelo / esfuerzo:** MEDIO, alto (`models.md` §4 y `orchestration.md` §8: es plata, nunca tier económico)
- **Rol:** implementer. Después, `reviewer` funcional y, como pide R27 (esta feature activó N4), `security-reviewer` y `pentester` antes del OK humano (`orchestration.md` §2/§3)
- **Worktree:** `../sdd-universal-IA-4` (`git worktree add ../sdd-universal-IA-4 -b ia-fusion-IA-4 main`); `node_modules/` se copia del repo principal, no se instala

## De dónde sale
Las tres reviews de `IA-3` cerraron la carrera del tope (M1b) y el acople entre la cota y el `max_tokens` del pedido (M5b), y dejaron anotado lo que queda. Lo de acá **no estaba en los criterios de IA-3**, por eso no la bloqueó: son formas de gastar que la reserva no ve. Detalle y mediciones en [`review_IA-3.md`](../progress/ia-fusion/review_IA-3.md), secciones «Pendientes no bloqueantes para el leader» de las vueltas 2 y 3.

## Objetivo
Que **todo** lo que un pedido autoriza a gastar esté atado a la reserva, y que un registro de gasto no pueda quedar en cero sin que un test lo vea.

## Criterios de aceptación
1. **Server tool use (lo más serio).** `tools: [{type: 'web_search_20250305', max_uses: N}]` en el cuerpo del pedido autoriza gasto **fuera de `max_tokens`** (se cobra por búsqueda): hoy `estimarCotaUSD` no lo cotiza y `costoRealUSD` no lee `server_tool_use`, así que ese gasto sale **gratis en el registro** y el tope del día no lo ve. El mutante que agrega `tools` al pedido sobrevive 61/61. Que la cota lo cotice, que el costo real lo lea, y que un test fije **las claves del cuerpo del pedido**: si mañana aparece una clave nueva que autoriza gasto (un presupuesto de *thinking*, streaming), el test tiene que caer y obligar a cotizarla.
2. **Un `200` válido sin `usage` conserva la reserva.** Hoy `costoRealUSD({}) === 0` y el ajuste posterior libera la cota entera, así que respuestas así son gratis y el tope del día nunca se llena. Es el mismo criterio de «lo ambiguo conserva» que ya aplica el `catch`: aplicarlo también acá, con su test.
3. **La tabla de precios tiene un assert literal.** Dividir por 10 el precio de salida en `api/_lib/costo.js` sobrevive 61/61, porque `costo.test.mjs` solo prueba monotonía y «> 0». Un assert con un número calculado a mano (del estilo `costoRealUSD({input_tokens: 10, output_tokens: 5})`) cierra la tabla entera. Al escribirlo, **verificar los precios contra la doc del proveedor** y anotar la fecha: la nota de `costo.js` dice que están sin confirmar (se cruza con R19).
4. **Dos líneas de endurecimiento en `api/tests/topeEndpoint.test.mjs` (G1).** Que el gasto no pase de `llamadas × cota` (hoy un mutante que pide `max_tokens + 4096` gasta 47% más de lo reservado y pasa, porque no cruza el tope), y que los `200` de G1 afirmen `fusion: "ia"` — sin eso, si el cuerpo del pedido deja de ser un string JSON el `fetch` falso tira, el handler lo toma como ambiguo, responde `200 simulada` y los cuatro asserts pasan igual, con M5b resucitado (medido, sonda P1 de la vuelta 3).
5. Ningún test llama a la API real, y la suite no gasta un centavo en CI (criterio 7 de `IA-3`, que sigue valiendo).

## Zona de archivos
- **Podés tocar:** `api/_lib/costo.js`, `api/fusionar.js` (solo el camino del `usage` ausente, criterio 2), `api/tests/` (`costo.test.mjs`, `topeEndpoint.test.mjs` y los fixtures).
- **No toques:** `api/_lib/reserva.js` ni el lock (están aprobados y con sus tests), `web/`, `supabase/`, `sdd/status.md` ni los reviews (son del leader).

## Contexto a leer (y nada más)
- `playbooks/ia-en-el-producto.md` §A (la reserva, no el chequeo), §B (se registra siempre, lo ambiguo se cobra) y §E (tests que no gastan)
- `sdd/decisions.md` ADR-017 — el freno es **por instancia**, no un techo global; el techo duro se configura en la consola del proveedor antes de producción
- `review_IA-3.md`, los «Pendientes no bloqueantes» de las vueltas 2 y 3, que traen las mediciones

## Verificación requerida
- `python harness/verify.py` en verde.
- **Rojo medido (R29), uno por criterio**, cada mutante aplicado a una copia y restaurado, con la cola pegada en el handback: el pedido con `tools` que hoy sobrevive; el `200` sin `usage`; el precio de salida dividido por 10; y el `max_tokens + 4096`. Un criterio sin su mutante muerto no está probado.
- `api/fusionar.js` solo cambia en el camino del criterio 2: mostrar el diff en el handback.

## Entrega
- Handback en `sdd/progress/ia-fusion-IA-4/handback_IA-4.md` (plantilla `prompts/handback.md`), con el hash real del commit, commiteado solo en la rama de la tarjeta.
- Memoria en disco de la rama en `sdd/progress/ia-fusion-IA-4/current.md` (R30; el pre-commit falla sin eso).
- Respuesta: solo `done -> <ruta>` o `blocked -> <ruta>`.
