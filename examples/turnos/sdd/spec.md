# spec.md · Turnos

**Versión:** 0.3.0 · **Última actualización:** 2026-08-14 · **Estado:** vigente

## 1 · Problema

Peluquería Nadia (Villa Crespo, 2 peluqueras, ~35 turnos por semana) toma turnos por WhatsApp. Consecuencias medidas durante 2 semanas de observación:

- 6 superposiciones de turno en 2 semanas (dos personas citadas a la misma hora).
- ~40 min/día de la dueña contestando mensajes en horario de atención, con tijera en la mano.
- Sin registro: cuando alguien no viene, no queda rastro de quién fue.

## 2 · Outcomes (medibles)

| # | Outcome | Cómo se mide | Meta |
|---|---|---|---|
| O1 | Cero superposiciones | Turnos con horario solapado en la misma peluquera, en DB | 0 en 4 semanas |
| O2 | Menos tiempo administrativo | Mensajes de WhatsApp sobre turnos por día | < 10/día (hoy ~35) |
| O3 | Ausencias visibles | % de turnos marcados como "no vino" sobre el total | Dato existe (hoy no existe) |
| O4 | La clienta reserva sola | Turnos creados desde la web / total | > 60% a los 2 meses |

## 3 · Qué NO entra (límites de alcance)

Explícito, para no re-discutirlo cada ciclo:

- **Pagos y señas online.** Se cobra en el local, como siempre.
- **App móvil nativa.** La web responsive alcanza; el 100% del tráfico esperado es celular.
- **Multi-sucursal.** Hay una sola sucursal y no hay planes de una segunda.
- **Cuenta de usuaria / login de clientas.** Se reserva con nombre + teléfono. Pedir registro corta la conversión y no aporta a ningún outcome.
- **Recordatorios por WhatsApp.** La API oficial tiene costo y verificación de negocio. Queda para después de validar O1–O4 (ver `costs.md`).
- **Gestión de stock, caja o sueldos.** No es un ERP.

## 4 · Constraints y supuestos

- **C1** · La dueña usa un iPhone y no tiene computadora. El panel de administración **tiene que funcionar bien en celular**; no es un "nice to have".
- **C2** · Presupuesto de infraestructura: **USD 0/mes**. Si algo pasa a ser pago, se avisa antes (R14).
- **C3** · Horario del local: martes a sábado, 9:00–19:00. Turnos cada 30 min. Dos peluqueras trabajan en paralelo.
- **S1** · *Supuesto:* las clientas van a reservar desde el link del perfil de Instagram. Si no pasa, O4 no se cumple aunque el software funcione perfecto — es riesgo de adopción, no técnico.
- **S2** · *Supuesto:* un servicio = una duración fija. Se valida en la primera semana de uso (ver `status.md`, deuda D1).

## 5 · Decisiones ya tomadas

No se vuelven a discutir sin un ADR nuevo en `decisions.md`:

- Stack **TypeScript full-stack** (React + Vite / Fastify) — ADR-001
- **Postgres en Neon** free tier — ADR-002
- Sin login de clientas; el panel de admin entra con **magic link** por email — ADR-003
- La **duración del turno la define el servicio**, no la clienta — ADR-004 (revisada, ver ahí)

## 6 · Sub-tareas (paralelizables)

| ID | Sub-tarea | Depende de |
|---|---|---|
| T1 | Esquema de DB + migraciones | — |
| T2 | API de disponibilidad y reserva | T1 |
| T3 | Front público: elegir servicio → día → hora → confirmar | T2 (contrato, no implementación) |
| T4 | Panel de admin: agenda del día, marcar "vino"/"no vino" | T2 |
| T5 | Deploy (Vercel + Neon) | T1 |

T3 y T4 pueden ir en paralelo apenas `contracts.md` esté aprobado: el contrato es lo que las desacopla.

## 7 · Criterios de verificación

Testeables, sin ambigüedad. Cada uno tiene su test en `testing.md`:

- **V1** · Dos reservas simultáneas para la misma peluquera y horario: la segunda recibe `409` y **no** se crea la fila.
- **V2** · Pedir disponibilidad de un lunes (local cerrado) devuelve lista vacía, no error.
- **V3** · Un turno de 60 min a las 18:30 no se ofrece: excede el horario de cierre.
- **V4** · El panel de admin abre y es operable en un iPhone SE (375px) sin scroll horizontal.
- **V5** · Un magic link vencido (>15 min) no da acceso.
