---
id: IA-1
titulo: "Endpoint /api/fusionar con reserva de gasto, rate limit y modo simulado"
estado: pending
feature: F28 · Fusión con IA del combinador (v2 de blocks.md, ADR-016)
depende_de: []
rama: ia-fusion
---

# Tarjeta IA-1 — Endpoint /api/fusionar con reserva de gasto, rate limit y modo simulado

- **Spec:** leé `sdd/contracts.md` §8, `sdd/design.md` §10, `sdd/costs.md` ("La fusión con IA"), `sdd/security.md` §3c, `sdd/decisions.md` ADR-016 — nada más del SDD
- **Modelo / esfuerzo:** MEDIO, alto (`models.md` §4 — pagos/costos con techo real van como mínimo en este tier aunque el cambio parezca chico)
- **Rol:** implementer
- **Worktree:** `../sdd-universal-IA-1` (`git worktree add ../sdd-universal-IA-1 -b ia-fusion`)

## Objetivo
Una función serverless (`api/fusionar.js`) que reciba lo que elige la persona en el combinador, llame a Claude para fusionar los bloques en un `sdd/` a medida, y nunca pueda gastar más del tope diario — aunque lleguen pedidos en paralelo.

## Criterios de aceptación
1. `POST /api/fusionar` con un pedido válido (tipo y stack que existen en el catálogo) devuelve `200` con `{archivos, fusion: "ia"}` cuando hay `ANTHROPIC_API_KEY` configurada.
2. **Sin `ANTHROPIC_API_KEY`:** `200` con `fusion: "simulada"` y el mismo resultado que daría la concatenación v1 (nunca un error al usuario).
3. **Reserva, no chequeo:** bajo lock, se anota `gastado + cota ≤ tope` antes de llamar al modelo (prompt en bytes × peor precio). 8 pedidos en paralelo contra un tope bajo (ej. USD 1) nunca gastan más del tope — ver playbook `ia-en-el-producto.md` §A, paso 1. Test con hilos reales, no simulados en el mismo hilo.
4. **Rate limit por IP:** una IP que pasa el límite por minuto recibe `429` con `{error, reintentar_en}`, el resto de las IPs no se ve afectado.
5. **Un solo intento por llamada** (`max_retries: 0` del SDK): un rechazo del modelo cuenta una sola vez contra la reserva.
6. **Costeo por error:** `APIStatusError` (4xx, 529) cuenta costo 0 y libera la reserva; un timeout o corte a mitad de respuesta conserva la reserva (no se libera, S33).
7. `tipo`/`stack` que no están en el catálogo → `400`. `descripcion` más larga que el máximo definido en esta tarjeta → `400` (evita inflar el costo del prompt a propósito).
8. La clave nunca viaja en la respuesta ni en ningún log (si un error de la API la repite, se tacha antes de loguear).

## Zona de archivos
- **Podés tocar:** `api/fusionar.js`, `api/_lib/` (helpers nuevos si hacen falta: reserva de gasto, rate limit), `package.json`/`package-lock.json` solo si hace falta el SDK de Anthropic como dependencia de la función (no de `web/`, que sigue sin build — C1/C2 de `spec.md` no aplican a `api/`).
- **No toques:** nada bajo `web/` (la UI es la tarjeta IA-2), `vercel.json` (zero-config, no hace falta tocarlo), `sdd/` (eso es del leader).

## Contexto a leer (y nada más)
- `sdd/contracts.md` §8 — el contrato exacto del endpoint
- `sdd/design.md` §10 — dónde vive el archivo y por qué
- `playbooks/ia-en-el-producto.md` §A, §B, §F — el patrón de reserva, qué se cobra, el modo simulado
- `tecnologias.md` — ficha de "Anthropic API" (lecciones: SDK real sobre transporte simulado en tests, tope de gasto como reserva)

## Verificación requerida
- `python harness/verify.py --changed` en verde + los tests nuevos de esta tarjeta (ver IA-3, pero el implementer agrega los suyos propios de unidad para esta función)
- TDD (R29): el test de la reserva bajo concurrencia se ve fallar primero contra una versión sin lock (rojo medido, no deducido)
- Si agregás un check o guard nuevo (ej. validación del rate limit): rojo forzado con la cola pegada

## Entrega
- Handback en `sdd/progress/ia-fusion/handback_IA-1.md` (plantilla `prompts/handback.md`), commiteado.
- Respuesta: solo `done -> <ruta>` o `blocked -> <ruta>`.
