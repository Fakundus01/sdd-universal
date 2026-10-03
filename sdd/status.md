# status.md · SDD Hub

**Versión:** 0.30.1 · **Última actualización:** 2026-10-03 · Estados: Specified 20% → Planned 40% → Tasked 60% → In Progress 80% → Complete 100%

## Features

| ID | Feature | Estado | % | Nota |
|---|---|---|---|---|
| F1 | Catálogo con filtros, búsqueda y paginación | Complete | 100% | Filtros en la URL, compartibles |
| F2 | Combinador de prompt de arranque | Complete | 100% | Lista además los archivos exactos a descargar |
| F3 | Catálogo de tecnologías con selección múltiple | Complete | 100% | 120 items (0.27), popup arrastrable |
| F4 | Configurador de reglas → `custom.md` | Complete | 100% | Las fijas con candado (ADR-006). 32 reglas desde 0.30.1 |
| F5 | Cuentas y combinaciones guardadas | In Progress | 80% | Código completo y en uso con el proyecto Supabase real (`sdd-universal`). Falta la prueba de aislamiento entre dos cuentas (RLS) |
| F6 | Guía navegable | Complete | 100% | Índice lateral con seguimiento de sección |
| F7 | Demo comparativo con/sin SDD | Complete | 100% | Los tres casos borde verificados en los dos widgets |
| F8 | Deploy en Vercel | Complete | 100% | Live, con headers y redirect verificados en producción |
| F9 | Configuración (temas, texto, sonido, secciones, admin) | Complete | 100% | Vista con pestañas; el tema con fuente única (ADR-011) |
| F10 | Barra lateral comprimible con arrastre | Complete | 100% | Comprimida, los accesos pasan a la barra superior |
| F11 | Compartir combinaciones por link | Complete | 100% | `#/combinador?c=…`, restaura todo y genera el prompt |
| F12 | Buscador global (Ctrl+K) | Complete | 100% | Cards + tecnologías + reglas + páginas |
| F13 | PWA instalable | Complete | 100% | SW sin caché a propósito (ver changelog 0.19) |
| F14 | Núcleo en inglés | Complete | 100% | Cierra la deuda D4 |
| F15 | Vista previa de los MD | Complete | 100% | Renderer propio, links internos navegan dentro del preview |
| F16 | Feedback de carga (loaders, descargando, recargando) | Complete | 100% | Un solo módulo; el zip con progreso real |
| F17 | Manuales: playbooks y skills desde la web | Complete | 100% | 0.25 y 0.28: skills del SDD + 11 sueltas, paginadas de a 6 |
| F18 | Descarga rápida por card | Complete | 100% | 0.25: popup con nuevo/existente, nivel, skills y (0.30.1) arnés |
| F19 | Sitio privado (portón de sesión) | Complete | 100% | 0.26 y 0.28. Depende de que el proyecto Supabase esté activo: ver Bloqueos |
| F20 | El ZIP trae la capa de ejecución (R29–R32) | In Progress | 80% | `harness.md`, `orchestration.md`, `agents/` (PRO) y `harness/` con pre-commit en modo 755. Probado armando el ZIP en Node y leyéndolo con `zipfile`, más un smoke de `verify.py` desde el ZIP descomprimido. Falta ver los checkboxes nuevos en el navegador (el portón lo impide mientras Supabase esté pausado) |

**Avance total: 19.6 / 20 features = 98%**

## Bloqueos

**El proyecto Supabase `sdd-universal` está pausado (`INACTIVE`, visto el 2026-10-03).** El free tier pausa los proyectos sin actividad. Como desde 0.26 el portón exige sesión, **nadie puede entrar a la web publicada** hasta que el owner lo reactive desde el dashboard (o con OK explícito, por R32). Después hay que decidir cómo evitar que vuelva a pasar: uso periódico, un ping programado, o pasar a plan pago.

**F5 todavía no tiene su prueba de punta a punta.** El blocker original («el owner tiene que crear el proyecto») ya no aplica: el proyecto existe y el login funciona sobre él. Lo que falta es la prueba que importa: dos cuentas distintas, confirmando que la segunda no ve los datos de la primera. Hasta entonces F5 queda en 80% (R16).

## Deuda técnica aceptada

Las cinco deudas abiertas pasaron su fecha de revisión. Se actualizó el dato, **no la decisión**: aceptarlas otra vez o atacarlas lo decide el owner.

| ID | Deuda | Aceptada | Revisar el | Qué la dispara | Hoy (2026-10-03) |
|---|---|---|---|---|---|
| D1 | `index.html` pasa las 300 líneas de JS que pide R05 | 2026-08-15 | ~~2026-09-15~~ vencida | Si entra una feature más al combinador, se parte en `catalogo.js` + `combinador.js` | **Disparada**: 1123 líneas de JS inline. Al combinador se le sumaron la descarga rápida (0.25) y el checkbox del arnés (0.30.1) |
| D2 | Sin tests automatizados: todo se verifica en navegador | 2026-08-15 | ~~2026-10-01~~ vencida | La primera regresión que llegue a producción. Ahí deja de ser barato | Sin regresiones registradas. El arnés (0.30.1) ya da la base: un `harness.config.json` del propio repo con un test del ZIP en Node sería el primer paso |
| D3 | Los outcomes O1–O4 de la spec no se están midiendo | 2026-08-15 | ~~2026-09-30~~ vencida | Sin analytics no hay dato. Decidir si se suma algo que respete la spec (sin píxeles de terceros) o si se bajan los outcomes a algo observable | Existe `Sesion.contar` + `supabase/metricas.sql` (conteos propios, sin terceros), pero no hay reporte contra O1–O4 |
| ~~D4~~ | ~~Traducción al inglés~~ — **cerrada el 2026-08-15**: núcleo (master + compact) en inglés como espejo del canónico. El resto del paquete queda en español a propósito | — | — | El espejo se actualiza con cada release del master | — |
| D5 | `web/og.png` se generó con un script que no quedó en el repo | 2026-08-15 | ~~2026-09-15~~ vencida | El día que haya que cambiar el texto de la imagen. Contradice ADR-004 en chiquito | **Disparada**: la imagen dice «26 reglas» (quedó vieja en 0.11) y son 32. Para corregirla primero hay que reescribir el script que la genera |
| D6 | Sin SMTP propio: el recupero de contraseña y la confirmación dependen del mailer del free tier, que manda pocos correos por hora y cae en spam | 2026-08-15 | ~~2026-09-30~~ vencida | **Procedimiento ya escrito** en `playbooks/resend-smtp.md`. Lo que falta es ejecutarlo, y para salir del modo prueba hace falta un dominio propio (~USD 15/año) — ese es el verdadero bloqueo, no el código | Sin cambios. Pesa menos desde 0.26: sin registro público, las cuentas las crea el admin con Auto Confirm |

## Próximo ciclo

1. Reactivar Supabase y decidir cómo evitar la próxima pausa.
2. Verificar F20 en el navegador.
3. Cerrar F5 con la prueba de dos cuentas: si RLS está mal, el resto no importa.
4. Que el owner decida sobre D1–D6, empezando por D1 y D5, que ya se dispararon.
