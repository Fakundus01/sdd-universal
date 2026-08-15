# decisions.md · Turnos

**Versión:** 0.3.0 · ADRs: decisión, fecha y motivo. **No se borran ni se editan**: si una decisión cambia, se agrega una nueva que reemplaza a la anterior. Sirven para no re-discutir lo mismo en el ciclo 7.

---

## ADR-001 · TypeScript full-stack — 2026-08-08 · Vigente

**Contexto:** hay que elegir stack para una app chica de agenda, mantenida por una sola persona.

**Decisión:** React + Vite en el front, Fastify en el back, TypeScript en los dos.

**Por qué:** un solo lenguaje significa que los tipos de `contracts.md` se comparten literalmente entre front y back — un cambio de contrato rompe la compilación en vez de romperse en producción. Se evaluó Python + FastAPI (más cómodo para quien lo mantiene) pero obligaba a duplicar los tipos a mano, que es exactamente el error que este proyecto no puede permitirse con una sola persona revisando.

**Costo aceptado:** el ecosistema JS envejece rápido; se compensa con la auditoría de R19.

---

## ADR-002 · Postgres en Neon — 2026-08-08 · Vigente

**Decisión:** Postgres gestionado en Neon, free tier.

**Por qué:** el requisito duro del proyecto (cero superposiciones, O1) se resuelve con una `EXCLUDE` constraint sobre `tstzrange`, que es **específico de Postgres**. Con SQLite o Mongo la garantía habría que escribirla en la aplicación, con la condición de carrera que eso trae. La elección de base salió del requisito, no al revés.

**Alternativas:** Supabase (más features de las que hacen falta, mismo Postgres debajo) · Postgres local (no sirve: la app tiene que estar online).

---

## ADR-003 · Sin contraseñas en el admin — 2026-08-09 · Vigente

**Decisión:** acceso por magic link al email, cookie de 30 días.

**Por qué:** una sola usuaria administradora (C1). Una contraseña acá es superficie de ataque, flujo de recupero, y una cosa más que olvidar — a cambio de cero seguridad adicional frente a un atacante que ya tiene el email.

---

## ADR-004 · Duración del turno definida por el servicio — 2026-08-11 · **Revisada el 2026-08-13**

**Decisión original (2026-08-11):** cada servicio tiene una `duracion_min` fija y el turno la hereda.

**Qué pasó — caso de R25 (SPEC-DRIFT):** implementando T2 apareció que el supuesto S1 de la spec no se sostenía. La dueña había dicho "color: 90 minutos", pero en la agenda de papel los colores iban de 60 a 150 min según el largo del pelo. Con duración fija, o se sobre-reservaba (cliente esperando) o se sub-reservaba (huecos muertos). La spec aprobada estaba mal.

El agente **frenó antes de codear** y emitió:

```
=== DRIFT · spec.md §5 ===
Dice: la duración del turno la define el servicio (fija por servicio).
Encontré: en la agenda de papel, "color" va de 60 a 150 min según el largo.
          Con duración fija se sobre-reserva o quedan huecos muertos.
Opciones: A) duracion_min como rango (min/max) y la dueña ajusta al confirmar
          B) servicios más granulares ("color pelo corto", "color pelo largo")
          C) dejar fijo y anotar deuda
Recomiendo: B — no toca el modelo de datos, lo entiende la clienta sin explicación,
            y se puede revertir renombrando filas. A obliga a rediseñar la
            disponibilidad y a que la dueña intervenga en cada turno.
```

**Resolución (OK del humano, 2026-08-13):** opción B. Se desdoblaron los servicios de color en tres variantes por largo. `spec.md` §5 y `contracts.md` no cambiaron de forma: solo hay más filas en `servicios`.

**Por qué queda escrito:** dentro de seis meses, "¿por qué hay tres servicios de color en vez de uno?" tiene respuesta acá y no se vuelve a discutir. Y sirve de ejemplo de lo que R25 evita: el agente podría haber "arreglado" la duración por su cuenta y nadie se habría enterado hasta ver la agenda rota.

---

## ADR-005 · Sin recordatorios por WhatsApp en v1 — 2026-08-13 · Vigente

**Decisión:** no se integra la API de WhatsApp Business todavía.

**Por qué:** requiere verificación del negocio y tiene costo por conversación (`costs.md`), y ninguno de los outcomes O1–O4 lo necesita. Si al medir O3 las ausencias resultan altas, ahí se justifica y se reabre. Decidirlo antes de tener el dato es adivinar.
