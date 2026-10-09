---
id: IA-2
titulo: "UI del combinador: botón de fusión con IA, degradación y aviso de modo simulado"
estado: pending
feature: F28 · Fusión con IA del combinador (v2 de blocks.md, ADR-016)
depende_de: [IA-1]
rama: ia-fusion
---

# Tarjeta IA-2 — UI del combinador: botón de fusión con IA, degradación y aviso de modo simulado

- **Spec:** leé `sdd/contracts.md` §8, `sdd/spec.md` §3 y O5, `sdd/design.md` §2 (archivos de `web/`) y §10 — nada más del SDD
- **Modelo / esfuerzo:** MEDIO, alto (`models.md` §4)
- **Rol:** implementer
- **Worktree:** `../sdd-universal-IA-2` (`git worktree add ../sdd-universal-IA-2 ia-fusion`, mismo branch que IA-1 ya mergeado)

## Objetivo
El combinador ofrece "Fusión con IA" al lado del botón v1 existente; llama a `POST /api/fusionar` y arma el ZIP con lo que devuelve, sin romper nunca el camino v1 (sin key, sin red, o si el endpoint no existe en este deploy).

## Criterios de aceptación
1. Un botón nuevo en `combinador.js`, al lado del de siempre, dice explícito "con IA" (no reemplaza al v1: las dos opciones conviven).
2. Al click, llama a `/api/fusionar` con el estado actual (igual que `Prompt.armar` arma hoy) + la descripción libre (un textarea nuevo, opcional).
3. Con `fusion: "ia"` en la respuesta: arma el ZIP con esos archivos (reusa `Zip.descargar`, no reinventa el empaquetado).
4. Con `fusion: "simulada"`: arma el ZIP igual, y un aviso visible (no un error) dice que es la versión sin IA.
5. Si la llamada falla (red, 429, 500 inesperado): cae al botón v1 automáticamente, con un aviso — nunca una pantalla rota ni una promesa sin catch.
6. Métrica nueva: un evento `paquete` con `detalle` que diga si se usó fusión IA o v1 (mismo patrón que ya valida `metricas.sql` — coordinar con IA-1 si hace falta un valor de `detalle` nuevo, sin tocar el SQL si no hace falta).
7. `web/tests/` cubre el camino con mock de `fetch` (sin red real) para los 3 casos: `ia`, `simulada`, error de red.

## Zona de archivos
- **Podés tocar:** `web/combinador.js`, `web/index.html` (el botón/textarea nuevo), `web/tests/combinador*.test.mjs`.
- **No toques:** `api/` (es de IA-1 — si el contrato no alcanza, anotalo en el handback, no lo edites), `web/prompt.js` salvo que haga falta pasar la `descripcion` (mínimo necesario, anotado).

## Contexto a leer (y nada más)
- `sdd/contracts.md` §8 — pedido/respuesta exactos
- `web/combinador.js`, `web/paquete.js` — cómo arma el ZIP hoy la v1, para reusar `Zip.descargar`
- `sdd/design.md` §2 — convención de los archivos de `web/`

## Verificación requerida
- `python harness/verify.py --changed` en verde + `web/tests/combinador*.test.mjs`
- TDD (R29): el test de "cae a v1 si el endpoint falla" se ve fallar primero (sin el catch, se cuelga o rompe)

## Entrega
- Handback en `sdd/progress/ia-fusion/handback_IA-2.md` (plantilla `prompts/handback.md`), commiteado.
- Respuesta: solo `done -> <ruta>` o `blocked -> <ruta>`.
