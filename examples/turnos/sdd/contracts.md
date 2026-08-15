# contracts.md · Turnos

**Versión:** 0.3.0 · **Última actualización:** 2026-08-14

Este archivo **es** la documentación de la API. Si una ruta no está acá, no existe. Todo bajo `/api/v1`. Fechas ISO-8601 en UTC.

---

## GET `/servicios`

Sin parámetros. Público.

```json
[{ "id": 1, "nombre": "Corte", "duracionMin": 30, "precioArs": 12000 }]
```

---

## GET `/disponibilidad`

| Parámetro | Tipo | Obligatorio | Notas |
|---|---|---|---|
| `fecha` | `YYYY-MM-DD` | sí | Día local (Buenos Aires) |
| `servicioId` | int | sí | Define la duración del bloque |

```json
{ "fecha": "2026-08-20", "slots": ["2026-08-20T12:00:00Z", "2026-08-20T12:30:00Z"] }
```

- Día cerrado o sin lugar → `{"fecha": "...", "slots": []}` con **200**, no 404 (V2).
- `servicioId` inexistente → `404 SERVICIO_NO_ENCONTRADO`.
- Fecha pasada → `400 FECHA_INVALIDA`.

---

## POST `/turnos`

```json
{
  "servicioId": 1,
  "inicio": "2026-08-20T12:00:00Z",
  "clienteNombre": "Ana Pérez",
  "clienteTelefono": "1155667788"
}
```

Validación: `clienteNombre` 2–60 caracteres · `clienteTelefono` 8–15 dígitos, se normaliza sin espacios ni guiones · `inicio` debe ser un slot devuelto por `/disponibilidad`.

**201**
```json
{ "id": 42, "inicio": "2026-08-20T12:00:00Z", "fin": "2026-08-20T12:30:00Z",
  "peluquera": "Nadia", "servicio": "Corte" }
```

La peluquera **la asigna el servidor** (la primera libre), no la clienta: pedir que elija duplica la interfaz sin aportar a ningún outcome.

**409 HORARIO_OCUPADO** — el slot se tomó entre que se pidió la disponibilidad y se confirmó. Es un caso normal, no un error del sistema: el front recarga la disponibilidad y lo dice en criollo. Ver V1.

---

## Rutas de admin

Todas requieren la cookie de sesión. Sin ella: `401 NO_AUTORIZADO`.

| Ruta | Qué hace | Respuesta |
|---|---|---|
| `POST /auth/magic-link` | Manda el link al email. **Siempre 202**, exista o no el admin (no revelar qué emails son válidos) | `202` |
| `GET /auth/callback?token=` | Canjea el token por cookie. Token vencido, usado o inválido → `401 TOKEN_INVALIDO` | `302` a `/admin` |
| `GET /admin/agenda?fecha=` | Turnos del día, ordenados por hora, agrupados por peluquera | `200` |
| `PATCH /admin/turnos/:id` | `{"estado": "vino" \| "no_vino" \| "cancelado"}`. Cualquier otro valor → `400` | `200` |

---

## Formato de error (todas las rutas)

```json
{ "error": { "codigo": "HORARIO_OCUPADO", "mensaje": "Ese horario se acaba de ocupar." } }
```

`codigo` es estable y lo consume el front; `mensaje` es para humanos y puede cambiar sin romper nada.

---

## Compromiso de compatibilidad

Cambiar el tipo o el significado de un campo existente, o sacar una ruta, es **MAJOR** (R13) y necesita `/v2`. Agregar un campo opcional a una respuesta es MINOR y no rompe a nadie.
