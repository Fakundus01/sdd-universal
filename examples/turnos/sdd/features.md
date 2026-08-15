# features.md · Turnos

**Versión:** 0.3.0 · Especificación funcional. El **estado** vive en `status.md`, no acá: duplicarlo garantiza que uno de los dos quede viejo.

---

## F1 · Esquema de base de datos

Tablas de `design.md` §2 más la constraint `sin_solape`. Migraciones numeradas que se corren en orden y nunca se editan una vez aplicadas: si algo está mal, se agrega una migración nueva.

**Terminada cuando:** `npm run migrate` sobre una base vacía deja el esquema completo y el test de V1 pasa.

---

## F2 · Consultar disponibilidad

Como clienta quiero ver qué horarios hay libres para un servicio y un día, para elegir uno.

- Se piden fecha y servicio; se devuelven solo los horarios con al menos una peluquera libre.
- Día cerrado → lista vacía, no un error (V2).
- No se ofrecen horarios donde el servicio no entra antes del cierre (V3).
- No se muestra **qué** peluquera está libre: la clienta no elige, y mostrarlo invita a pedirlo.

---

## F3 · Reservar un turno

Como clienta quiero confirmar un horario con mi nombre y teléfono, sin crear una cuenta.

- Nombre y teléfono, nada más (ver `security.md` §2).
- El servidor asigna la primera peluquera libre.
- Si el horario se ocupó mientras la clienta decidía: mensaje claro y recarga de la disponibilidad. **No** es una pantalla de error: es un caso normal.

---

## F4 · Front público de reserva

Tres pasos en una sola pantalla: servicio → día → hora. Sin wizard, sin barra de progreso.

- Mobile-first: el 100% del tráfico esperado es celular.
- Máximo 3 toques desde que entra hasta que confirma.
- Los próximos 14 días, no un calendario infinito: nadie reserva la peluquería con dos meses de anticipación.

---

## F5 · Panel de admin — agenda del día

Como dueña quiero ver la agenda de hoy en el celular entre clienta y clienta.

- Vista por defecto: **hoy**. Es el 95% de los usos; que arranque en otro lado es fricción diaria.
- Dos columnas (una por peluquera), ordenadas por hora.
- Nombre, teléfono tocable (`tel:`) y servicio de cada turno.
- Tiene que ser legible a 375px y con una sola mano (C1).

---

## F6 · Marcar vino / no vino

Un toque por turno, desde la agenda. Habilita O3.

- Reversible: si se marca mal, se puede corregir el mismo día.
- Sin confirmación modal: es un dato de bajo riesgo y una modal por turno es 35 modales por semana.

---

## F7 · Deploy

Front y API en Vercel, base en Neon, según el playbook `deploy-vercel`. Va **último** a propósito: publicar antes de que exista el panel de admin le deja a la dueña una web que recibe turnos que no puede ver.
