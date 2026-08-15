# changelog.md · Turnos

Semver `MAJOR.MINOR.PATCH` (R13). No se borra nunca. Un ciclo cerrado = una entrada.

---

## [0.3.0] — 2026-08-14

### Agregado
- Front público: elegir servicio → día → hora → confirmar (`web/src/pages/Reservar.tsx`, 3 componentes de ≤120 líneas). Verificado en navegador a 375px y 1440px.
- Endpoint `GET /api/v1/servicios` (`api/routes/servicios.ts`).

### Modificado
- Los servicios de color se desdoblaron en tres variantes por largo de pelo (migración `004_servicios_color.sql`), según ADR-004. Impacto observable: la clienta ahora elige "Color pelo largo" en vez de "Color".

### Pendiente
- F4 queda al 80%: el `409 HORARIO_OCUPADO` se maneja pero todavía no se muestra en pantalla. Sin esto, la clienta ve que no pasa nada al confirmar. Primer ítem del ciclo 4.

---

## [0.2.0] — 2026-08-13

### Agregado
- `POST /api/v1/turnos` con asignación automática de peluquera (`api/services/BookingService.ts`).
- Test de concurrencia (V1): 20 reservas simultáneas al mismo slot → 1 creada, 19 con `409`. Es el test que justifica todo el diseño de la sección 3 de `design.md`.

### Modificado
- `spec.md` §5 y `decisions.md`: ADR-004 revisada tras un DRIFT (R25). La duración fija por servicio no representaba la realidad de la peluquería. Resuelto con la opción B, con OK del humano.

### Corregido
- Los slots del último horario del día se ofrecían aunque el servicio excediera el cierre (V3 fallaba). **Causa raíz:** `AvailabilityService` comparaba el *inicio* del slot contra la hora de cierre en vez del *fin* calculado. Corregido en `api/services/AvailabilityService.ts:47`.

---

## [0.1.0] — 2026-08-11

### Agregado
- Esquema inicial: `peluqueras`, `servicios`, `turnos`, `admins`, `magic_links` (migraciones `001`–`003`).
- `EXCLUDE` constraint `sin_solape` sobre `(peluquera_id, tstzrange(inicio, fin))` — la garantía de O1 vive en la base, no en la aplicación.
- `GET /api/v1/disponibilidad` con V2 y V3 verdes.
- MDs de `sdd/` aprobados y commiteados antes de la primera línea de código (R08).

### Notas
- Primer commit del proyecto: **solo los MD**, sin código, según el flujo de arranque del master (§6.1).
