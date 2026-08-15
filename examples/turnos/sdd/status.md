# status.md · Turnos

**Versión:** 0.3.0 · **Última actualización:** 2026-08-14 · Estados: Specified 20% → Planned 40% → Tasked 60% → In Progress 80% → Complete 100%

## Features

| ID | Feature | Estado | % | Nota |
|---|---|---|---|---|
| F1 | Esquema de DB + migraciones | Complete | 100% | Incluye la `EXCLUDE` constraint (el corazón de O1) |
| F2 | API de disponibilidad | Complete | 100% | V2 y V3 verdes |
| F3 | API de reserva | Complete | 100% | V1 verde, incluido el test de concurrencia |
| F4 | Front público (reservar) | In Progress | 80% | Falta el estado de error 409 en pantalla |
| F5 | Panel de admin (agenda del día) | Tasked | 60% | Depende de F4 solo para reusar componentes |
| F6 | Marcar vino / no vino | Planned | 40% | Habilita medir O3 |
| F7 | Deploy (Vercel + Neon) | Specified | 20% | Sigue el playbook `deploy-vercel` |

**Avance total: 4.6 / 7 features ≈ 66%**

## Bloqueos

Ninguno técnico. **Riesgo abierto:** el supuesto S1 de la spec (las clientas llegan desde el link de Instagram). Se valida recién con F7 deployado y el link publicado; hasta entonces O4 no se puede medir. Es riesgo de adopción, no de software — pero si S1 falla, el proyecto no cumple su objetivo aunque el código sea perfecto.

## Deuda técnica aceptada

Deuda sin fecha es deuda que nadie paga. Por eso todas llevan fecha de revisión:

| ID | Deuda | Aceptada | Revisar el | Qué la dispara |
|---|---|---|---|---|
| D1 | Duración por servicio en vez de por clienta (ADR-004, opción B) | 2026-08-13 | 2026-09-15 | Si aparecen más de 3 variantes por servicio, la opción B no escala y hay que volver a A |
| D2 | Horario del local hardcodeado en `config/horario.ts` | 2026-08-11 | 2026-10-01 | El primer feriado que haya que cargar a mano, o el cambio de horario de verano |
| D3 | Sin tests E2E del front; se verifica en navegador | 2026-08-12 | 2026-09-15 | Cuando F4+F5 estén completas y valga la pena montar Playwright |
| D4 | El job de anonimizado a 12 meses que promete `security.md` §2 todavía no existe | 2026-08-14 | 2026-11-01 | Nada la dispara sola, y ese es el problema: es una promesa escrita que hoy no se cumple. Fecha firme |

## Próximo ciclo

Cerrar F4 (manejo visible del 409) y arrancar F5. F7 va último a propósito: deployar antes de que el panel de admin funcione dejaría a la dueña con una web pública que no puede administrar.
