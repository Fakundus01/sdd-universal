# Sesión actual — rama `ia-fusion-IA-2`

> Mantenelo al día mientras trabajás. Si la sesión se corta o se limpia el contexto, la próxima arranca leyendo esto (plantilla completa: `prompts/relevo.md`).

- **Feature / tarjeta:** IA-2 — UI del combinador: botón de fusión con IA, degradación y aviso de modo simulado
- **Rol:** implementer
- **Última actualización:** en curso

## Plan
- Leer contracts.md §8 (pedido/respuesta de `/api/fusionar`), combinador.js, paquete.js (Zip.descargar), design.md §2.
- TDD: escribir `web/tests/combinador-ia.test.mjs` con los 3 casos (ia, simulada, falla de red) contra el combinador SIN la llamada nueva → rojo medido.
- Implementar en `combinador.js`: `opcionesFusion()`, `fusionarIA()` con catch que cae a `Paquete.proyecto` (v1), métrica `Sesion.contar`.
- Implementar en `index.html`: textarea `#cdesc` (descripción libre, opcional) y botón `#zipFusion` al lado de `#zipProyecto`/`#zipSolo`.
- Verde con `python harness/verify.py --changed` + handback.

## Bitácora
- `web/combinador.js`: nuevas `opcionesFusion()` y `fusionarIA()`; botón nuevo cableado al final del archivo.
- `web/index.html`: textarea `#cdesc` y botón `#zipFusion` dentro de `.zipbtns`.
- `web/tests/combinador-ia.test.mjs`: nuevo, con mock de `fetch` (sin red real) para los 3 casos.

## Lo que se probó y no anduvo
- (nada bloqueado — ver handback)

## Verificación
- ver `handback_IA-2.md`

## Tarjetas en vuelo
- IA-2

## Próximo paso
_Lo primero que hace la próxima sesión. Concreto: archivo, comando o decisión pendiente._
