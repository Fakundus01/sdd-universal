# glossary.md · Turnos

**Versión:** 0.3.0 · Opcional (§5 del master), pero acá gana su lugar: la dueña y el desarrollador usaban la misma palabra para cosas distintas.

| Término | Qué significa **en este proyecto** |
|---|---|
| **Turno** | Una reserva concreta: peluquera + servicio + horario + clienta. En la peluquería también se le dice "turno" al hueco libre; acá un hueco libre es un **slot** |
| **Slot** | Un horario candidato de 30 min. Existe solo mientras se calcula la disponibilidad: no hay tabla de slots |
| **Servicio** | Lo que se hace (corte, color pelo largo…). Define la duración del turno — ver ADR-004 |
| **Peluquera** | Quien atiende. Son dos y trabajan en paralelo: por eso las 15:00 puede estar libre y ocupada al mismo tiempo |
| **Superposición** | Dos turnos de **la misma** peluquera con horarios que se pisan. El problema que originó el proyecto (O1). Dos turnos a las 15:00 con peluqueras distintas son perfectamente normales |
| **No vino** | La clienta no se presentó y no avisó. Distinto de **cancelado**, donde avisó antes. La diferencia importa: solo el primero es un problema a medir (O3) |
| **Magic link** | Link de un solo uso que manda el acceso al panel por email, sin contraseña — ADR-003 |
| **Ausencia** | Sinónimo de "no vino" en el habla de la peluquería. En código y en la base **siempre** `no_vino`, nunca `ausencia` |

> Regla que salió de acá: si la dueña y el código llaman distinto a lo mismo, gana el nombre de la dueña — salvo que ya esté escrito en la base, donde manda la consistencia.
