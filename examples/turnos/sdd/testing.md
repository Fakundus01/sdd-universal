# testing.md · Turnos

**Versión:** 0.3.0 · Runner: `vitest` · Base de pruebas: Postgres en Docker, migraciones reales (no mocks — la `EXCLUDE` constraint es la lógica más importante del sistema y un mock la haría invisible).

## Cobertura mínima acordada

| Capa | Exigencia |
|---|---|
| `services/` | 100% de las ramas. Es donde vive toda la lógica |
| `routes/` | Un test por código de error documentado en `contracts.md` |
| `repos/` | Contra la base real, no mockeada |
| Front | Verificación en navegador (R07) hasta que F4/F5 cierren; después, E2E — ver deuda D3 en `status.md` |

Perseguir un % global de cobertura es una métrica floja: se llega al 90% testeando getters. La exigencia se define por capa.

## Tests de los criterios de verificación

| CV | Test | Archivo | Estado |
|---|---|---|---|
| V1 | 20 reservas concurrentes al mismo slot → 1 creada, 19 con `409` | `booking.concurrency.test.ts` | ✅ |
| V2 | Disponibilidad de un lunes → `200` con `slots: []` | `availability.test.ts` | ✅ |
| V3 | Servicio de 60 min a las 18:30 (cierre 19:00) no se ofrece | `availability.test.ts` | ✅ |
| V4 | Panel de admin operable a 375px sin scroll horizontal | manual, navegador | ⏳ F5 |
| V5 | Magic link de más de 15 min → `401 TOKEN_INVALIDO` | `auth.test.ts` | ✅ |

## Casos borde cubiertos

- Reserva exactamente en el horario de cierre → rechazada.
- Reserva pegada al fin de otra (15:30 justo después de 15:00–15:30) → **aceptada**. `tstzrange` es `[)` por defecto: el borde no se solapa. Está testeado explícitamente porque es el tipo de cosa que se rompe en un refactor sin que nadie lo note.
- Turno cancelado libera el horario (la constraint tiene `WHERE estado <> 'cancelado'`).
- Teléfono con espacios o guiones (`11 5566-7788`) → se normaliza, no se rechaza. Una clienta no debería pelear con un formato.
- Cambio de horario de verano: hay un test con una fecha de octubre. Argentina no cambia la hora hoy, pero el test documenta el comportamiento esperado si algún día vuelve.

## Cómo se corre

```bash
docker compose up -d db
npm run migrate:test
npm test
```

## Lo que a propósito NO se testea

- Que Fastify parsee JSON, que zod valide un string, que Postgres respete una constraint. Testear la librería de otro es ruido que se rompe en cada upgrade.
- El envío real de emails: `AuthService` recibe un `Mailer` inyectado y en tests se usa uno en memoria.
