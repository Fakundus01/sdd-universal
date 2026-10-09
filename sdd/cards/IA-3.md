---
id: IA-3
titulo: "Tests de carga adversarios del endpoint: tope de gasto, rate limit, errores que no cobran"
estado: pending
feature: F28 · Fusión con IA del combinador (v2 de blocks.md, ADR-016)
depende_de: [IA-1]
rama: ia-fusion
---

# Tarjeta IA-3 — Tests de carga adversarios del endpoint: tope de gasto, rate limit, errores que no cobran

- **Spec:** leé `playbooks/ia-en-el-producto.md` §E completo, `sdd/costs.md`, `sdd/contracts.md` §8 — nada más del SDD
- **Modelo / esfuerzo:** MEDIO, alto (`models.md` §4 — el ahorro nunca va en quien verifica)
- **Rol:** implementer (construye los tests, no es el reviewer de la tarjeta IA-1)
- **Worktree:** `../sdd-universal-IA-3` (`git worktree add ../sdd-universal-IA-3 ia-fusion`, mismo branch que IA-1 ya mergeado)

## Objetivo
Una batería de tests que intente romper el tope de gasto de `api/fusionar.js` de todas las formas que ya rompieron el tope en otros proyectos (S33/H18), sobre el SDK real con transporte simulado — nunca llamando a la API de verdad.

## Criterios de aceptación
1. **El SDK real de Anthropic sobre `httpx`/transporte simulado** (nunca un mock del cliente escrito a mano — H-paso 20 de `ia-en-el-producto.md`).
2. Test con **hilos reales** (no el mismo hilo simulando concurrencia) y un `Barrier`: N pedidos que arrancan juntos contra un tope bajo (ej. USD 1) nunca gastan más que el tope, medido con el gasto registrado al final.
3. Test de **fallback/reintento tardío**: un 529 o timeout del "modelo" simulado no debe dejar la reserva "colgada" ni cobrar de más.
4. Test de **rate limit por IP**: más pedidos que el límite desde la misma IP en la ventana → `429`; desde IPs distintas, no se ven afectadas entre sí.
5. Test de **costo por error**: un `APIStatusError` 4xx simulado cuesta `0` en el registro; un corte de red a mitad de respuesta conserva la reserva (no se pierde el registro del gasto).
6. Un test por cada "forma de romper el tope" de la lección S33: chequear-y-después-llamar (carrera), reserva fija que no acota con prompt largo, "ocupada" sin nada en vuelo.
7. Los tests nunca llaman a la API real; no gastan un centavo al correr en CI.

## Zona de archivos
- **Podés tocar:** `api/fusionar.test.js` (o la carpeta de tests que use el runtime elegido en IA-1 — confirmá contra lo que IA-1 dejó andando), fixtures de transporte simulado.
- **No toques:** `api/fusionar.js` en sí (si un test revela un bug real, lo anotás en el handback con la falla — no lo arreglás vos, vuelve al leader para re-despachar a IA-1 o re-abrirla).

## Contexto a leer (y nada más)
- `playbooks/ia-en-el-producto.md` §E — los 24 puntos de tests/evals que no gastan
- `sdd/decisions.md` ADR-016 y `sdd/costs.md` — qué tope y qué controles hay que probar

## Verificación requerida
- `python harness/verify.py --changed` en verde
- Cada test de esta tarjeta se vio fallar primero contra una versión de IA-1 sin el control correspondiente (rojo forzado medido, R29) — si IA-1 ya está `done`, se verifica revirtiendo el control a propósito en una copia local, corriendo el test, y volviendo a aplicar el control; la cola de ese rojo va en el handback.

## Entrega
- Handback en `sdd/progress/ia-fusion/handback_IA-3.md` (plantilla `prompts/handback.md`), commiteado.
- Respuesta: solo `done -> <ruta>` o `blocked -> <ruta>`.
