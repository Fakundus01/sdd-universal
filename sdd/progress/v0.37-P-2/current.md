# Sesión actual — rama `v0.37-P-2`

- **Feature / tarjeta:** P-2 — Tokens, costo y duración por rol y vuelta en el handback (v0.37)
- **Rol:** implementer
- **Última actualización:** 2026-10-07

## Plan
- Tests rojos del check (WARN si una tarjeta `done` de la v0.37 en adelante no trae «Costo» con una fila).
- `check_costo_handbacks` en `harness/checks.py`; corte por versión de la rama (`vMAJOR.MINOR` >= 0.37).
- Sección «Costo» en `prompts/handback.md`, línea `Costo:` en HANDBACK (loop-prompt, master ES/EN §7, compactos).
- Instrucciones al leader (`agents/leader.md`) y formato de `metrics.md` (`teams.md` §8).

## Bitácora
- El subagente no conoce sus tokens: la tabla la completa el leader; el agente escribe rol/modelo/vuelta y `n/d`.
- Corte por prefijo de rama porque las tarjetas viejas no tienen fecha en el frontmatter; sin versión => no avisa.
- Compacto: +33 bytes, arranque 8985 de 10240.

## Lo que se probó y no anduvo
- Nada.

## Verificación
- `verify.py --quick`: VERDE, 1 WARN legítimo (P-1, v0.37, sin «Costo»; es de otra tarjeta, fuera de zona).

## Tarjetas en vuelo
- P-2 (esta).

## Próximo paso
Review de P-2; el leader completa «Costo» del handback de P-1 con los datos reales que vio.
