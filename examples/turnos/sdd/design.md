# design.md · Turnos

**Versión:** 0.3.0 · **Última actualización:** 2026-08-14

## 1 · Capas

```
web/          React + Vite · dos entradas: público (/) y admin (/admin)
api/          Fastify · rutas finas, toda la lógica en services/
  routes/     validación de entrada (zod) y nada más
  services/   AvailabilityService · BookingService · AuthService
  repos/      acceso a Postgres; único lugar con SQL
db/           migraciones .sql numeradas, se corren en orden
```

Regla que sostiene todo: **una ruta no habla con la base**. Ruta → service → repo. Cuando algo se rompe, se sabe en qué capa buscar sin leer el código.

## 2 · Modelo de datos

```
peluqueras   id · nombre · activa
servicios    id · nombre · duracion_min · precio_ars
turnos       id · peluquera_id · servicio_id · inicio (timestamptz) · fin (timestamptz)
             cliente_nombre · cliente_telefono · estado · creado_en
admins       id · email · ultimo_acceso
magic_links  token_hash · email · expira_en · usado_en
```

`estado` ∈ `reservado` | `vino` | `no_vino` | `cancelado`. Nunca se borra un turno: cancelar es un estado, no un `DELETE`. Sin esto, O3 (medir ausencias) es imposible.

`fin` se guarda calculado en vez de derivarse de `servicios.duracion_min` en cada consulta: si mañana cambia la duración de "color", los turnos ya reservados no tienen que mutar solos.

## 3 · La decisión central: cómo se evita la superposición

Es el corazón del proyecto (O1) y por eso **no vive en el código de aplicación**, donde una condición de carrera lo rompería:

```sql
ALTER TABLE turnos ADD CONSTRAINT sin_solape
  EXCLUDE USING gist (
    peluquera_id WITH =,
    tstzrange(inicio, fin) WITH &&
  ) WHERE (estado <> 'cancelado');
```

Es una `EXCLUDE` constraint de Postgres: la base rechaza el segundo INSERT solapado, pasen los dos por el chequeo previo o no. `BookingService` captura la violación y devuelve `409`.

**Por qué así:** el chequeo en la aplicación ("¿hay algo entre las 15 y las 16?" → insert) tiene una ventana entre el `SELECT` y el `INSERT`. Con dos clientas tocando "confirmar" en el mismo segundo, las dos pasan. La constraint no tiene ventana. El chequeo previo se mantiene igual, pero solo para dar un mensaje lindo — la garantía la da la base.

## 4 · Disponibilidad

`AvailabilityService.slotsDe(fecha, servicioId)`:

1. Si la fecha es lunes o feriado → `[]` (V2).
2. Genera slots cada 30 min entre apertura y cierre.
3. Descarta los que, sumando `duracion_min`, pasan el cierre (V3).
4. Resta los turnos existentes no cancelados de cada peluquera.
5. Devuelve solo horarios con al menos una peluquera libre.

Se calcula al vuelo, sin tabla de slots pre-generados: 20 slots × 2 peluqueras × 1 día es trivial para Postgres, y una tabla pre-generada habría que mantenerla sincronizada para siempre.

## 5 · Auth del admin

Sin contraseñas (C1: la dueña no quiere recordar una más). Flujo: email → token aleatorio de 32 bytes → se guarda **el hash** → link por email → al usarlo, cookie `httpOnly` de 30 días. El token vale 15 min y un solo uso (V5). Ver `security.md`.

## 6 · Zona horaria

Todo se guarda en `timestamptz` y se opera en UTC. La conversión a `America/Argentina/Buenos_Aires` pasa solo en la capa de presentación. Es la fuente de bugs más común en software de agenda y por eso está acá y no en un comentario perdido.

## 7 · Deuda de diseño consciente

- El horario del local está **hardcodeado** en `config/horario.ts`, no en la base. Si aparece un feriado o cambia el horario de verano, hay que tocar código y deployar. Aceptado por ahora (una sucursal, un horario estable); anotado en `status.md` como D2.
