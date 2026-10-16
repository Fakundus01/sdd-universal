# current.md · IA-1

- **Tarjeta:** IA-1 — Endpoint `/api/fusionar` con reserva de gasto, rate limit y modo simulado
- **Base:** `e604690`
- **Contexto leído (y nada más):** `sdd/contracts.md` §8, `sdd/design.md` §10, `playbooks/ia-en-el-producto.md` §A/§B/§F, `tecnologias.md` (ficha "Anthropic API"). También, por necesidad de implementación (no son SDD): `web/catalogo.js` (TYPES/STACKS, solo lectura, para validar catálogo) y `web/paquete.js` (formato `{nombre, contenido}`).

## Plan
1. `package.json` + `@anthropic-ai/sdk` (única dependencia nueva; `.gitignore` +`node_modules/`).
2. `api/_lib/`: `catalogo.js` (lee `web/catalogo.js` como texto, igual que `combinador.test.mjs`), `reserva.js` (SharedArrayBuffer + Atomics: lock real entre hilos, no solo entre promesas), `costo.js` (cota = bytes del prompt × peor precio), `rateLimit.js` (por IP, ventana fija), `secreto.js` (tachar la clave antes de loguear), `fusionV1.js` (concatenación plana), `anthropicCliente.js` (SDK real, `maxRetries:0`, `fetch` inyectable para tests).
3. TDD: `api/tests/reserva.test.mjs` con **worker_threads reales** (no promesas en el mismo hilo) — ver la carrera en rojo contra una variante sin lock antes de escribir el lock.
4. `api/fusionar.js`: valida catálogo/descripción → rate limit → modo simulado si falta key/modelo → reserva bajo lock → llama al SDK con transporte falso en tests → costea por `usage` real → libera en error de la API, conserva en error ambiguo → nunca 500.
5. `python harness/verify.py --changed` + evidencia roja/verde en el handback.

## Nota de zona
`harness.config.json` (`test`) no está en mi zona y su glob no corre `api/tests/`: lo anoto en "Fuera de zona" del handback, no lo toco.
