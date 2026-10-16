---
id: api
rutas: [api/**, package.json, .github/workflows/api.yml]
hash: 282d50480142dabd4b0c2e62ef6536de33643e98dd043c9c8830c45436d9dc43
---

# api

La función serverless de la fusión con IA (F28, ADR-016 ajustado por ADR-017): `POST /api/fusionar`
recibe lo elegido en el combinador y devuelve un `sdd/` fusionado por Claude, o cae a la
concatenación v1. **Nunca un 500 al usuario** — el contrato de `sdd/contracts.md` §8 no lo admite, y
hay una red de último recurso que convierte cualquier excepción no prevista en un 400 parejo.

Es la única parte del repo con dependencias instaladas (el SDK de Anthropic). Por **ADR-018** el
arnés del paquete sigue verificándose sin instalar nada: `api/tests/correr.mjs` corre las pruebas si
está `node_modules/@anthropic-ai/sdk` y, si no, saltea con aviso. `.github/workflows/api.yml` las
corre siempre, y además verifica que el salteo **no** se active con las dependencias instaladas.

- `fusionar.js` — el handler. El orden importa y es el del playbook: validar → rate limit por IP →
  **reservar** bajo lock → llamar → ajustar al costo real. Reservar antes de llamar es todo el punto
  (S33): chequear y después llamar es el bug que gastó 5× el tope en siete proyectos distintos.
- `_lib/reserva.js` — la reserva en micro-dólares sobre `Atomics`. **Freno por instancia, no tope
  global** (ADR-017): el techo duro es el límite de gasto de la consola de Anthropic, que hay que
  configurar antes de producción. El comentario largo del archivo explica por qué no alcanza con
  `SharedArrayBuffer` y por qué se eligió igual.
- `_lib/costo.js` — la cota antes de llamar (un token por byte UTF-8, al peor precio) y el costo real
  desde el `usage`. Los precios son un peor caso conservador: R19 pide verificarlos contra la doc
  vigente antes de desplegar.
- `_lib/promptSeguro.js` — la instrucción fija va en `system`, separada del texto de la persona
  (LLM01 de `seguridad.md`). `_lib/validacion.js` acota tipo y tamaño de **todo** lo que entra al
  prompt: sin eso, un `custom` de 100 KB gastaba USD 2,11 de un tope de 3 en un solo pedido.
- `_lib/rateLimit.js`, `_lib/secreto.js`, `_lib/catalogo.js`, `_lib/fusionV1.js`, `_lib/anthropicCliente.js`
  — límite por IP (toma la **última** IP de `x-forwarded-for`, no la primera, que la escribe quien
  pide), logs que nunca imprimen la clave, los datos del catálogo leídos de `web/`, la concatenación
  v1 y el cliente del SDK con `fetch` inyectable.
- `tests/` — 61 pruebas contra el **SDK real** sobre un `fetch` falso, nunca un mock del cliente
  escrito a mano. `topeEndpoint.test.mjs` son los G1–G4 de la review de `IA-3`: el tope probado en el
  endpoint y no solo en la primitiva (`scenarios.md` S46), cada uno con el mutante que mata anotado.
